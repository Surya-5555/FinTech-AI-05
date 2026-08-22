import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RazorpayTestModeRecoveryAdapter } from './razorpay-test-mode-recovery.adapter';
import { InterventionExecutionRequest, ExternalActionErrorCode, ExecutionActionType } from '@rr/contracts';
import Razorpay from 'razorpay';
import { InterventionId, RevenueCaseId, MerchantId, IdempotencyKey } from '@rr/contracts/src/identifiers';

vi.mock('razorpay');

describe('RazorpayTestModeRecoveryAdapter', () => {
  let adapter: RazorpayTestModeRecoveryAdapter;
  const mockCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (Razorpay as unknown as any).mockImplementation(() => {
      return {
        paymentLink: {
          create: mockCreate,
        },
      };
    });
  });

  describe('disabled mode', () => {
    beforeEach(() => {
      process.env.ENABLE_RAZORPAY_TEST_MODE = 'false';
    });

    it('should not throw on instantiation when disabled', () => {
      expect(() => new RazorpayTestModeRecoveryAdapter()).not.toThrow();
    });

    it('should fail execution securely when disabled', async () => {
      adapter = new RazorpayTestModeRecoveryAdapter();
      const request: InterventionExecutionRequest = {
        interventionId: 'int_123' as InterventionId,
        caseId: 'case_123' as RevenueCaseId,
        merchantId: 'merch_123' as MerchantId,
        actionType: ExecutionActionType.CREATE_PAYMENT_LINK,
        amountMinor: 5000n,
        currency: 'INR',
        idempotencyKey: 'idemp_456' as IdempotencyKey,
        parameters: {},
      };

      const result = await adapter.execute(request);
      expect(result.success).toBe(false);
      expect(result.failureCode).toBe(ExternalActionErrorCode.CONFIGURATION_ERROR);
      expect(result.rawResponseSnippet).toContain('disabled');
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('enabled mode without credentials', () => {
    beforeEach(() => {
      process.env.ENABLE_RAZORPAY_TEST_MODE = 'true';
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
    });

    it('should throw an error on instantiation to prevent unsecured live attempts', () => {
      expect(() => new RazorpayTestModeRecoveryAdapter()).toThrow(/missing or invalid/);
    });
  });

  describe('enabled mode with valid test credentials', () => {
    beforeEach(() => {
      process.env.ENABLE_RAZORPAY_TEST_MODE = 'true';
      process.env.RAZORPAY_KEY_ID = 'rzp_test_valid_key';
      process.env.RAZORPAY_KEY_SECRET = 'valid_secret';
      adapter = new RazorpayTestModeRecoveryAdapter();
    });

    const baseRequest: InterventionExecutionRequest = {
      interventionId: 'int_123' as InterventionId,
      caseId: 'case_123' as RevenueCaseId,
      merchantId: 'merch_123' as MerchantId,
      actionType: ExecutionActionType.CREATE_PAYMENT_LINK,
      amountMinor: 5000n,
      currency: 'INR',
      idempotencyKey: 'idemp_456' as IdempotencyKey,
      parameters: {
        customerName: 'Alice',
        customerEmail: 'alice@example.com',
      },
    };

    it('should reject unsupported actions securely', async () => {
      const result = await adapter.execute({ ...baseRequest, actionType: ExecutionActionType.INITIATE_PAYMENT_RETRY });
      expect(result.success).toBe(false);
      expect(result.failureCode).toBe(ExternalActionErrorCode.CONFIGURATION_ERROR);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should construct request and strictly map idempotencyKey to reference_id', async () => {
      mockCreate.mockResolvedValueOnce({
        id: 'plink_123',
        status: 'created',
        short_url: 'https://rzp.io/i/test',
        reference_id: 'idemp_456'
      });

      const result = await adapter.execute(baseRequest);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        amount: 5000,
        currency: 'INR',
        reference_id: 'idemp_456', // Strict Idempotency mapping
        customer: expect.objectContaining({ name: 'Alice', email: 'alice@example.com' }),
      }));

      expect(result.success).toBe(true);
      expect(result.externalReference).toBe('plink_123');
    });

    it('should correctly map rate limit errors', async () => {
      const error = new Error('Too many requests') as any;
      error.statusCode = 429;
      mockCreate.mockRejectedValueOnce(error);
      const result = await adapter.execute(baseRequest);
      expect(result.success).toBe(false);
      expect(result.failureCode).toBe(ExternalActionErrorCode.RATE_LIMITED);
    });

    it('should correctly map server errors', async () => {
      const error = new Error('Gateway Timeout') as any;
      error.statusCode = 503;
      mockCreate.mockRejectedValueOnce(error);
      const result = await adapter.execute(baseRequest);
      expect(result.success).toBe(false);
      expect(result.failureCode).toBe(ExternalActionErrorCode.PROVIDER_UNAVAILABLE);
    });

    it('should correctly map idempotency collision errors safely', async () => {
      const error = new Error('Bad Request') as any;
      error.statusCode = 400;
      error.error = { description: 'reference_id already exists' };
      mockCreate.mockRejectedValueOnce(error);
      const result = await adapter.execute(baseRequest);
      expect(result.success).toBe(false);
      // Treat idempotency collisions safely as rejected so they aren't blindly retried
      expect(result.failureCode).toBe(ExternalActionErrorCode.PROVIDER_REJECTED);
    });
  });
});
