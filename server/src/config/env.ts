import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
dotenv.config();
const production = process.env.NODE_ENV === 'production';
function secret(name: string) {
  const value = process.env[name];
  if (value && value.length >= 32 && !/smart_attendance|change.in.prod|replace.me/i.test(value)) return value;
  if (production) throw new Error(`${name} must be a random secret of at least 32 characters`);
  console.warn(`${name}: using ephemeral development key; tokens expire on restart.`);
  return randomBytes(48).toString('hex');
}
const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,http://localhost:19006').split(',').map(s => s.trim()).filter(Boolean);
if (production && (!process.env.ALLOWED_ORIGINS || origins.some(s => !s.startsWith('https://') || s.includes('*')))) throw new Error('Production requires explicit HTTPS ALLOWED_ORIGINS');
export const ENV = {
  PORT: Number(process.env.PORT || 5000), NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '', JWT_SECRET: secret('JWT_SECRET'),
  JWT_REFRESH_SECRET: secret('JWT_REFRESH_SECRET'), QR_TOKEN_SECRET: secret('QR_TOKEN_SECRET'),
  ALLOWED_ORIGINS: origins, QR_REFRESH_INTERVAL_SECONDS: Number(process.env.QR_REFRESH_INTERVAL_SECONDS || 20),
  JWT_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d',
};
if (new Set([ENV.JWT_SECRET, ENV.JWT_REFRESH_SECRET, ENV.QR_TOKEN_SECRET]).size !== 3) throw new Error('Signing keys must be distinct');
if (!Number.isInteger(ENV.QR_REFRESH_INTERVAL_SECONDS) || ENV.QR_REFRESH_INTERVAL_SECONDS < 10 || ENV.QR_REFRESH_INTERVAL_SECONDS > 60) throw new Error('QR interval must be 10-60 seconds');
