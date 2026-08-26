import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayWebhookGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-razorpay-signature'];

    if (!signature) {
      throw new UnauthorizedException('Missing x-razorpay-signature header');
    }

    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || 'test-secret';
    if (!secret) {
      // Fail securely if no secret is configured
      throw new UnauthorizedException('Webhook verification misconfigured');
    }

    // Access the raw body buffer created by NestJS rawBody: true
    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new UnauthorizedException('Raw body not available for signature validation');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature as string, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      throw new UnauthorizedException('Invalid webhook signature length');
    }

    // Prevent timing attacks
    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
