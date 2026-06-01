// backend/utils/authUtils.js
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'polonez_delivery_super_secret_key_2026';

// PBKDF2 parameters for secure password hashing
const ITERATIONS = 10000;
const KEY_LEN = 64;
const DIGEST = 'sha512';
const STATIC_SALT = 'polonez_salt_2026'; // High entropy static salt for portable hashing

/**
 * Hashes a plaintext password securely using PBKDF2-SHA512.
 * @param {string} password - The plaintext password
 * @returns {string} The hex-encoded hashed password
 */
export function hashPassword(password) {
  if (!password) return '';
  const hash = crypto.pbkdf2Sync(password, STATIC_SALT, ITERATIONS, KEY_LEN, DIGEST);
  return hash.toString('hex');
}

/**
 * Generates a signed, base64url-encoded lightweight session token.
 * Format: payloadBase64url.signatureBase64url
 * @param {object} payload - The token data (e.g. { id, role, email })
 * @param {number} expiresInMs - Token lifetime in milliseconds (default: 7 days)
 * @returns {string} The signed token
 */
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

/**
 * Verifies a token's HMAC signature and checks if it has expired.
 * @param {string} token - The signed token string
 * @returns {object|null} The decoded payload if valid, otherwise null
 */
export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  
  const [dataB64, signature] = parts;
  
  // Verify HMAC signature
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(dataB64);
  const expectedSignature = hmac.digest('base64url');
  
  // Constant-time comparison is not strictly required for a micro-app, but let's use it for real security
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
    
    // Check expiration
    if (Date.now() > data.expiration) {
      return null; // Expired
    }
    
    return data;
  } catch {
    return null;
  }
}
