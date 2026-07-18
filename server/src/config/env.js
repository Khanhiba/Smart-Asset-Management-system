import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const required = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];
const isMongoUrl = (value) => /^mongodb(\+srv)?:\/\//i.test(value || '');
const normaliseOrigin = (value) => {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`CLIENT_URL contains an unsupported protocol: ${value}`);
  if (url.pathname !== '/' || url.search || url.hash) throw new Error(`CLIENT_URL must contain an origin only: ${value}`);
  return url.origin;
};
const splitOrigins = (value = '') => value.split(',').map((item) => item.trim()).filter(Boolean).map(normaliseOrigin);

export const runtime = {
  environment: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  jwtIssuer: process.env.JWT_ISSUER || 'nexus-assets-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'nexus-assets-web',
  clientOrigins: splitOrigins(process.env.CLIENT_URL),
};

export function validateEnvironment() {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing required environment variable(s): ${missing.join(', ')}.`);
  if (!Number.isInteger(runtime.port) || runtime.port < 1 || runtime.port > 65535) throw new Error('PORT must be a valid TCP port number.');
  if (!isMongoUrl(runtime.mongoUri)) throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://.');
  if (runtime.jwtSecret.length < 32 || /replace-with|change-me|example|secret$/i.test(runtime.jwtSecret)) throw new Error('JWT_SECRET must be a unique, non-placeholder value with at least 32 characters.');
  if (runtime.clientOrigins.length === 0) throw new Error('CLIENT_URL must contain at least one valid frontend origin.');
  if (runtime.environment === 'production' && runtime.clientOrigins.some((origin) => origin.startsWith('http://'))) throw new Error('CLIENT_URL must use HTTPS in production.');
  return runtime;
}

export const allowedOrigins = () => runtime.clientOrigins;
