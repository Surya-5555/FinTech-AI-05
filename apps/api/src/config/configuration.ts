export interface AppConfig {
  env: string;
  port: number;
  databaseUrl: string;
  logLevel: string;
  apiAuthToken: string;
  corsOrigins: string;
  metricsEnabled: boolean;
  razorpayMode: 'test' | 'live';
  razorpayIntegrationEnabled: boolean;
  llmEnabled: boolean;
  twilioEnabled: boolean;
}

export default (): AppConfig => {
  const env = process.env.APP_ENV || 'development';
  const databaseUrl = process.env.DATABASE_URL;
  const razorpayMode = (process.env.RAZORPAY_MODE === 'live' ? 'live' : 'test') as 'test' | 'live';
  
  const razorpayIntegrationEnabled = process.env.RAZORPAY_INTEGRATION_ENABLED === 'true';
  const llmEnabled = process.env.LLM_ENABLED === 'true';
  const twilioEnabled = process.env.TWILIO_ENABLED === 'true';

  if (!databaseUrl && env === 'production') {
    throw new Error('CONFIGURATION_ERROR: DATABASE_URL is required in production');
  }

  const apiAuthToken = process.env.API_AUTH_TOKEN || '';
  if (!apiAuthToken) {
    throw new Error('CONFIGURATION_ERROR: API_AUTH_TOKEN is required');
  }

  // Strict Environment Safety Guards
  const safeEnvironments = ['demo', 'test', 'ci', 'development'];
  if (safeEnvironments.includes(env)) {
    if (razorpayMode === 'live') {
      throw new Error(`CONFIGURATION_ERROR: Cannot run RAZORPAY_MODE=live in ${env} environment.`);
    }
    
    // In demo/test/ci, if integration is enabled, ensure we don't accidentally load real keys
    if (razorpayIntegrationEnabled && !process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) {
      throw new Error(`CONFIGURATION_ERROR: RAZORPAY_INTEGRATION_ENABLED is true but RAZORPAY_KEY_ID is missing or not a test key.`);
    }

    if (twilioEnabled) {
      throw new Error(`CONFIGURATION_ERROR: Cannot enable real Twilio execution in ${env} environment.`);
    }
  }

  return {
    env,
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: databaseUrl || '',
    logLevel: process.env.LOG_LEVEL || 'info',
    apiAuthToken: process.env.API_AUTH_TOKEN || '',
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    razorpayMode,
    razorpayIntegrationEnabled,
    llmEnabled,
    twilioEnabled,
  };
};
