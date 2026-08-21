import { RazorpayAdapter } from './razorpay.adapter.js';
import { ExternalActionErrorCode, InterventionExecutionRequest } from '@rr/contracts';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('razorpay', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        paymentLink: {
          create: mockCreate
        }
      };
    })
  };
});

describe('RazorpayAdapter', () => {
  let adapter: RazorpayAdapter;

  beforeEach(() => {
    process.env.RAZORPAY_MODE = 'test';
    adapter = new RazorpayAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a payment link successfully', async () => {
    mockCreate.mockResolvedValue({ id: 'plink_123', short_url: 'https://rzp.io/l/123' });

    const request: InterventionExecutionRequest = {
      interventionId: 'int_1' as any,
      caseId: 'case_1' as any,
      merchantId: 'merch_1' as any,
      actionType: 'CREATE_PAYMENT_LINK' as any,
      amountMinor: 1000n,
      currency: 'INR',
      parameters: {
        customerEmail: 'test@example.com'
      },
      idempotencyKey: 'idem_1' as any,
    };

    const result = await adapter.execute(request);
    expect(result.success).toBe(true);
    expect(result.externalReference).toBe('plink_123');
    expect(result.rawResponseSnippet).toContain('https://rzp.io/l/123');
  });

  it('should handle api errors appropriately', async () => {
    mockCreate.mockRejectedValue({ statusCode: 401, message: 'Invalid keys' });

    const request: InterventionExecutionRequest = {
      interventionId: 'int_1' as any,
      caseId: 'case_1' as any,
      merchantId: 'merch_1' as any,
      actionType: 'CREATE_PAYMENT_LINK' as any,
      amountMinor: 1000n,
      currency: 'INR',
      parameters: {},
      idempotencyKey: 'idem_1' as any,
    };

    const result = await adapter.execute(request);
    expect(result.success).toBe(false);
    expect(result.failureCode).toBe(ExternalActionErrorCode.INVALID_CREDENTIALS);
  });

  it('should abort if not in test mode', async () => {
    process.env.RAZORPAY_MODE = 'live';
    const liveAdapter = new RazorpayAdapter();
    
    const request: InterventionExecutionRequest = {
      interventionId: 'int_1' as any,
      caseId: 'case_1' as any,
      merchantId: 'merch_1' as any,
      actionType: 'CREATE_PAYMENT_LINK' as any,
      amountMinor: 1000n,
      currency: 'INR',
      parameters: {},
      idempotencyKey: 'idem_1' as any,
    };

    const result = await liveAdapter.execute(request);
    expect(result.success).toBe(false);
    expect(result.failureCode).toBe(ExternalActionErrorCode.CONFIGURATION_ERROR);
    expect(result.rawResponseSnippet).toContain('test');
  });
});
