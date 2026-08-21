export interface AppConfig {
  env: string;
  port: number;
  databaseUrl: string;
  logLevel: string;
  apiAuthToken: string;
  corsOrigins: string;
  metricsEnabled: boolean;
}

export default (): AppConfig => {
  const env = process.env.APP_ENV || 'development';
  const databaseUrl = process.env.DATABASE_URL;
  const razorpayMode = process.env.RAZORPAY_MODE || 'test';
  
  if (!databaseUrl && env === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }

  // Demo Environment Safety Guard
  if (env === 'demo' && razorpayMode === 'live') {
    throw new Error('SAFETY VIOLATION: Cannot run RAZORPAY_MODE=live in demo environment.');
  }

  return {
    env,
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: databaseUrl || '',
    logLevel: process.env.LOG_LEVEL || 'info',
    apiAuthToken: process.env.API_AUTH_TOKEN || '',
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
  };
};
