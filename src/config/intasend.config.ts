import { registerAs } from '@nestjs/config';

export default registerAs('intasend', () => {
  const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
  const secretKey = process.env.INTASEND_SECRET_KEY;
  const testMode = process.env.INTASEND_TEST_MODE !== 'false'; // Default to test mode

  if (!publishableKey || !secretKey) {
    console.warn('IntaSend keys not configured. Payment processing will be limited.');
  }

  return {
    publishableKey,
    secretKey,
    testMode,
    apiBaseUrl: testMode
      ? 'https://sandbox.intasend.com/api'
      : 'https://payment.intasend.com/api',
  };
});

