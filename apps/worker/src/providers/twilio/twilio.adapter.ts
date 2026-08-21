import { ExecutionProvider, InterventionExecutionRequest, ProviderExecutionResult, ExternalActionErrorCode } from '@rr/contracts';
import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class TwilioAdapter implements ExecutionProvider {
  private readonly logger = new Logger(TwilioAdapter.name);
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || null;

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    } else {
      this.logger.warn('Twilio credentials not fully provided. Adapter will fail securely.');
    }
  }

  async execute(request: InterventionExecutionRequest): Promise<ProviderExecutionResult> {
    if (!this.client || !this.fromNumber) {
      return {
        success: false,
        failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
        rawResponseSnippet: 'Twilio missing Account SID, Auth Token, or From Number',
      };
    }

    const { parameters, actionType } = request;
    const toPhone = parameters.customerPhone as string;

    if (!toPhone) {
      return {
        success: false,
        failureCode: ExternalActionErrorCode.PROVIDER_REJECTED,
        rawResponseSnippet: 'Missing customerPhone parameter',
      };
    }

    try {
      if (actionType === 'SEND_SMS_REMINDER') {
        const message = await this.client.messages.create({
          body: `Payment reminder for Case ${request.caseId}`,
          from: this.fromNumber,
          to: toPhone,
        });

        return {
          success: true,
          externalReference: message.sid,
          rawResponseSnippet: JSON.stringify({ sid: message.sid, status: message.status }),
        };
      } else if (actionType === 'SEND_VOICE_REMINDER') {
        const call = await this.client.calls.create({
          twiml: `<Response><Say>This is a payment reminder for Case ${request.caseId}.</Say></Response>`,
          from: this.fromNumber,
          to: toPhone,
        });

        return {
          success: true,
          externalReference: call.sid,
          rawResponseSnippet: JSON.stringify({ sid: call.sid, status: call.status }),
        };
      } else {
        return {
          success: false,
          failureCode: ExternalActionErrorCode.CONFIGURATION_ERROR,
          rawResponseSnippet: `Unsupported actionType ${actionType}`,
        };
      }
    } catch (error: any) {
      this.logger.error(`Twilio Error: ${error.message}`, error.stack);
      return {
        success: false,
        failureCode: ExternalActionErrorCode.PROVIDER_REJECTED,
        rawResponseSnippet: error.message,
      };
    }
  }
}
