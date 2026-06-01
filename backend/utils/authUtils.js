import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'polonez_delivery_super_secret_key_2026';

const ITERATIONS = 10000;
const KEY_LEN = 64;
const DIGEST = 'sha512';
const STATIC_SALT = process.env.STATIC_SALT || '';

export function hashPassword(password) {
  if (!password) return '';
  const hash = crypto.pbkdf2Sync(password, STATIC_SALT, ITERATIONS, KEY_LEN, DIGEST);
  return hash.toString('hex');
}

export function generateToken(payload, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const expiration = Date.now() + expiresInMs;
  const data = { ...payload, expiration };
  const dataStr = JSON.stringify(data);
  const dataB64 = Buffer.from(dataStr).toString('base64url');

  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(dataB64);
  const signature = hmac.digest('base64url');

  return `${dataB64}.${signature}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataB64, signature] = parts;

  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(dataB64);
  const expectedSignature = hmac.digest('base64url');

  try {
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(signature, 'base64url'),
      Buffer.from(expectedSignature, 'base64url')
    );
    if (!isMatch) return null;
  } catch {
    return null;
  }

  try {
    const dataStr = Buffer.from(dataB64, 'base64url').toString('utf8');
    const data = JSON.parse(dataStr);

    if (Date.now() > data.expiration) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
