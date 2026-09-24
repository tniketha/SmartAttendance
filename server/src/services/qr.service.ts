import { generateSecureNonce, signPayload, verifySignature } from '../utils/crypto.utils';
import { ENV } from '../config/env';

export interface QRPayload {
  sessionId: string;
  nonce: string;
  timestamp: number;
  expiresAt: string;
  signature: string;
}

export class QRService {
  /**
   * Generates a signed, short-lived QR token payload for an active attendance session.
   */
  public static generateSessionQR(sessionId: string): { qrPayload: QRPayload; qrString: string; expiresAt: Date } {
    const timestamp = Date.now();
    const nonce = generateSecureNonce(12);
    const ttlMs = ENV.QR_REFRESH_INTERVAL_SECONDS * 1000;
    const expiresAt = new Date(timestamp + ttlMs);

    // Payload string to sign
    const signData = `${sessionId}:${nonce}:${timestamp}`;
    const signature = signPayload(signData);

    const qrPayload: QRPayload = {
      sessionId,
      nonce,
      timestamp,
      expiresAt: expiresAt.toISOString(),
      signature,
    };

    const qrString = JSON.stringify(qrPayload);

    return {
      qrPayload,
      qrString,
      expiresAt,
    };
  }

  /**
   * Validates the student's scanned QR string.
   * Checks structure, signature, and expiration window.
   */
  public static validateQRToken(
    qrString: string
  ): { isValid: boolean; sessionId?: string; error?: string } {
    try {
      let payload: QRPayload;
      if (typeof qrString === 'object') {
        payload = qrString as QRPayload;
      } else {
        payload = JSON.parse(qrString);
      }

      const { sessionId, nonce, timestamp, signature } = payload;

      if (typeof sessionId !== 'string' || !/^[a-f0-9]{24}$/i.test(sessionId) || typeof nonce !== 'string' || !/^[a-f0-9]{24}$/.test(nonce) || typeof timestamp !== 'number' || !Number.isSafeInteger(timestamp) || typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) {
        return { isValid: false, error: 'Malformed QR code payload' };
      }

      // Check HMAC signature integrity
      const signData = `${sessionId}:${nonce}:${timestamp}`;
      const isSignatureValid = verifySignature(signData, signature);

      if (!isSignatureValid) {
        return { isValid: false, error: 'Invalid QR signature or tampered code' };
      }

      // Check token expiration (allow 10 seconds grace window for network latency)
      const now = Date.now();
      const tokenTtlMs = (ENV.QR_REFRESH_INTERVAL_SECONDS) * 1000;
      if (now - timestamp >= tokenTtlMs) {
        return { isValid: false, error: 'QR code has expired. Please scan the current code.' };
      }

      // Check for future timestamp tampering (> 5s in future)
      if (timestamp - now > 5000) {
        return { isValid: false, error: 'Invalid QR timestamp' };
      }

      return { isValid: true, sessionId };
    } catch (err) {
      return { isValid: false, error: 'Unrecognized QR code format' };
    }
  }
}
