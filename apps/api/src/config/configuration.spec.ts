import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import configuration from './configuration';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should default to development and test modes', () => {
    delete process.env.APP_ENV;
    delete process.env.RAZORPAY_MODE;
    const config = configuration();
    expect(config.env).toBe('development');
    expect(config.razorpayMode).toBe('test');
  });

  it('should throw CONFIGURATION_ERROR if RAZORPAY_MODE=live in demo environment', () => {
    process.env.APP_ENV = 'demo';
    process.env.RAZORPAY_MODE = 'live';
    expect(() => configuration()).toThrow(/Cannot run RAZORPAY_MODE=live in demo/);
  });

  it('should throw CONFIGURATION_ERROR if TWILIO_ENABLED=true in demo environment', () => {
    process.env.APP_ENV = 'demo';
    process.env.TWILIO_ENABLED = 'true';
    expect(() => configuration()).toThrow(/Cannot enable real Twilio execution in demo/);
  });

  it('should throw CONFIGURATION_ERROR if RAZORPAY_INTEGRATION_ENABLED=true without test key in demo', () => {
    process.env.APP_ENV = 'demo';
    process.env.RAZORPAY_INTEGRATION_ENABLED = 'true';
    process.env.RAZORPAY_KEY_ID = 'invalid_key';
    expect(() => configuration()).toThrow(/RAZORPAY_KEY_ID is missing or not a test key/);
  });

  it('should allow test modes safely', () => {
    process.env.APP_ENV = 'demo';
    process.env.RAZORPAY_MODE = 'test';
    process.env.TWILIO_ENABLED = 'false';
    const config = configuration();
    expect(config.razorpayMode).toBe('test');
    expect(config.twilioEnabled).toBe(false);
  });
});
