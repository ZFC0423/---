import crypto from 'crypto';

export function hashPassword(password, iterations = 100000) {
  const salt = crypto.randomBytes(16).toString('hex');
  const saltBuffer = Buffer.from(salt, 'hex');
  const derivedKey = crypto.pbkdf2Sync(password, saltBuffer, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${derivedKey}`;
}

export function verifyPassword(password, storedPassword) {
  if (!storedPassword || typeof storedPassword !== 'string') {
    return false;
  }

  const parts = storedPassword.split('$');

  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const savedHash = parts[3];
  const saltBuffer = Buffer.from(salt, 'hex');
  const currentHash = crypto.pbkdf2Sync(password, saltBuffer, iterations, 32, 'sha256').toString('hex');

  return crypto.timingSafeEqual(Buffer.from(savedHash, 'hex'), Buffer.from(currentHash, 'hex'));
}
