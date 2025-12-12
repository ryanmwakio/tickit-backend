import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or JWT_ACCESS_SECRET environment variable is required');
  }

  return {
    secret,
    accessTokenTtl: parseInt(process.env.JWT_ACCESS_TTL || '3600', 10), // 1 hour
    refreshTokenTtl: parseInt(process.env.JWT_REFRESH_TTL || '2592000', 10), // 30 days
    issuer: process.env.JWT_ISSUER || 'TixHub',
  };
});

