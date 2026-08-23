import { ExecutionProvider, InterventionExecutionRequest, ProviderExecutionResult, ExternalActionErrorCode, ExecutionActionType } from '@rr/contracts';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from 'opossum';
import { randomUUID } from 'crypto';

@Injectable()
export class RazorpayAdapter implements ExecutionProvider {
  private readonly logger = new Logger(RazorpayAdapter.name);
  private readonly client: AxiosInstance;
  private readonly breaker: CircuitBreaker<any, any>;
  private readonly isTestMode: boolean;

  constructor() {
    this.isTestMode = process.env.RAZORPAY_MODE === 'test';
    
    if (!this.isTestMode) {
      this.logger.error('CRITICAL SAFETY VIOLATION: Razorpay adapter initialized without test mode enabled.');
    }

    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    
    const authHeader = `Basic ${Buffer.from(`${key_id}:${key_secret}`).toString('base64')}`;

    this.client = axios.create({
      baseURL: 'https://api.razorpay.com/v1',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10s default timeout
    });

    // 1. Exponential Backoff using axios-retry
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on 429 Rate Limit or 5xx Server Errors
        return !!(axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429 || (error.response?.status && error.response.status >= 500));
      },
      onRetry: (retryCount, error, requestConfig) => {
        this.logger.warn(`Razorpay API retry ${retryCount} due to ${error.message}`);
      }
    });

    // 2. Circuit Breaker using opossum
    const breakerOptions = {
      timeout: 15000, // If function takes longer than 15s, trigger a failure
      errorThresholdPercentage: 50, // When 50% of requests fail, trip the breaker
      resetTimeout: 30000, // Wait 30s before trying again
    };

    this.breaker = new CircuitBreaker(this.executeHttpRequest.bind(this), breakerOptions);
    
    this.breaker.fallback(() => {
      return Promise.reject(new Error('Circuit Breaker is OPEN. Failing fast.'));
    });

    this.breaker.on('open', () => this.logger.error('Razorpay Circuit Breaker is OPEN'));
    this.breaker.on('halfOpen', () => this.logger.warn('Razorpay Circuit Breaker is HALF-OPEN'));
    this.breaker.on('close', () => this.logger.log('Razorpay Circuit Breaker is CLOSED'));
  }

  private async executeHttpRequest(config: any): Promise<any> {
    return this.client.request(config);
  }

  async execute(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    if (!this.isTestMode) {
      return {
        success: false,
        failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
        rawResponseSnippet: 'Razorpay mode is not test. Aborting execution for safety.',
      };
    }

    try {
      if (request.actionType === ExecutionActionType.CREATE_PAYMENT_LINK) {
        return await this.createPaymentLink(request);
      } else {
        return {
          success: false,
          failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
          rawResponseSnippet: `Unsupported Razorpay action: ${request.actionType}`,
        };
      }
    } catch (error: any) {
      const isBreakerError = error.message?.includes('Circuit Breaker is OPEN');
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      
      this.logger.error(`Razorpay API error: ${error.message}`);
      
      return {
        success: false,
        failureCode: isBreakerError ? ExternalActionErrorCode.PROVIDER_UNAVAILABLE : (isTimeout ? ExternalActionErrorCode.PROVIDER_UNAVAILABLE : this.mapRazorpayError(error)),
        rawResponseSnippet: error.message || 'Unknown error',
      };
    }
  }

  private async createPaymentLink(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    const referenceId = `plink_${request.interventionId}_${randomUUID().substring(0, 8)}`;
    
    const payload = {
      amount: Number(request.amountMinor),
      currency: request.currency,
      accept_partial: false,
      description: `Payment Recovery for Case ${request.caseId}`,
      customer: {
        name: request.parameters.customerName as string || 'Customer',
        email: request.parameters.customerEmail as string || 'test@example.com',
        contact: request.parameters.customerPhone as string || '+919999999999'
      },
      notify: {
        sms: true,
        email: true
      },
      reminder_enable: true,
      notes: {
        caseId: request.caseId,
        interventionId: request.interventionId,
      },
      reference_id: referenceId
    };

    const response = await this.breaker.fire({
      method: 'post',
      url: '/payment_links',
      data: payload,
    });

    return {
      success: true,
      externalReference: response.data.id,
      rawResponseSnippet: `Payment link created: ${response.data.short_url}`,
    };
  }

  private mapRazorpayError(error: any): ExternalActionErrorCode {
    const status = error.response?.status;
    if (status === 401 || status === 403) return ExternalActionErrorCode.INVALID_CREDENTIALS;
    if (status === 429) return ExternalActionErrorCode.RATE_LIMITED;
    if (status >= 500) return ExternalActionErrorCode.PROVIDER_UNAVAILABLE;
    return ExternalActionErrorCode.PROVIDER_REJECTED;
  }
}
