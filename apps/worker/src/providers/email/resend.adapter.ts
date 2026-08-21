import { ExecutionProvider, InterventionExecutionRequest, ProviderExecutionResult, ExternalActionErrorCode } from '@rr/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendAdapter implements ExecutionProvider {
  private readonly logger = new Logger(ResendAdapter.name);
  private resend: Resend | null = null;
  private fromEmail: string | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('Resend API key not provided. Adapter will fail securely.');
    }
  }

  async execute(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    if (!this.resend || !this.fromEmail) {
      return {
        success: false,
        failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
        rawResponseSnippet: 'Resend missing API Key or From Email',
      };
    }

    const { parameters } = request;
    const toEmail = parameters.customerEmail as string;

    if (!toEmail) {
      return {
        success: false,
        failureCode: ExternalActionErrorCode.PROVIDER_REJECTED,
        rawResponseSnippet: 'Missing customerEmail parameter',
      };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: toEmail,
        subject: `Payment Reminder - Case ${request.caseId}`,
        html: `<p>This is a payment reminder for Case ${request.caseId}.</p>`,
      });

      if (response.error) {
        return {
          success: false,
          failureCode: ExternalActionErrorCode.PROVIDER_REJECTED,
          rawResponseSnippet: response.error.message,
        };
      }

      return {
        success: true,
        externalReference: response.data?.id,
        rawResponseSnippet: JSON.stringify(response.data),
      };
    } catch (error: any) {
      this.logger.error(`Resend Error: ${error.message}`, error.stack);
      return {
        success: false,
        failureCode: ExternalActionErrorCode.UNKNOWN_ERROR,
        rawResponseSnippet: error.message,
      };
    }
  }
}
