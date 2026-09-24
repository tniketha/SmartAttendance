import crypto from 'crypto';
import { ENV } from '../config/env';

/**
 * Generates an HMAC-SHA256 signature for a given payload string.
 */
export const signPayload = (payload: string): string => {
  return crypto.createHmac('sha256', ENV.QR_TOKEN_SECRET).update(payload).digest('hex');
};

/**
 * Validates whether an HMAC-SHA256 signature matches the payload string using timingSafeEqual.
 */
export const verifySignature = (payload: string, signature: string): boolean => {
  try {
    const expectedSignature = signPayload(payload);
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
};

/**
 * Generates a secure random hexadecimal string.
 */
export const generateSecureNonce = (bytes = 16): string => {
  return crypto.randomBytes(bytes).toString('hex');
};
