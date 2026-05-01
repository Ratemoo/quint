// ============================================
// OBSIDIAN — Auth Helpers
// Simple HMAC-signed tokens (no external JWT lib needed)
// ============================================

const crypto = require('crypto');

const SECRET = process.env.TOKEN_SECRET || 'change-this-secret-in-production';

// Create a signed token: base64(payload).signature
function createToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

// Verify and decode token — returns payload or throws
function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    throw new Error('Invalid token format');
  }
  const [data, sig] = token.split('.');
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64url');

  // Constant-time comparison — prevents timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));

  // Check expiry
  if (payload.exp && Date.now() > payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

module.exports = { createToken, verifyToken };