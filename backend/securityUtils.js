const crypto = require('crypto');

// Blacklist of common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'yopmail.com', '10minutemail.com', 'tempmail.com',
  'guerrillamail.com', 'sharklasers.com', 'dispostable.com', 'getairmail.com',
  'boun.cr', 'maildrop.cc', 'mailbox.org', 'fakeinbox.com', 'throwawaymail.com',
  'temp-mail.org', 'mailinator2.com', 'trashmail.com', 'discard.email'
]);

// Blacklist of common weak/leaked passwords
const WEAK_PASSWORDS = new Set([
  'password', 'password123', '12345678', '123456789', 'admin123', 'admin',
  'qwerty', 'letmein', 'welcome', 'campusconnect', 'campus123', 'student123',
  'alumni123', 'sru12345', 'srueduin', 'pass1234'
]);

/**
 * Validates a password against enterprise strength requirements.
 * - Minimum 8-12 characters (or longer)
 * - Uppercase letter
 * - Lowercase letter
 * - Number
 * - Special character
 * - Not in common weak list
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8 || password.length > 20) {
    return { valid: false, error: 'Password must be between 8 and 20 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character.' };
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common or easily guessable.' };
  }
  return { valid: true };
}

/**
 * Checks if an email belongs to a disposable or temporary email domain.
 */
function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return true;
  const parts = email.split('@');
  if (parts.length !== 2) return true;
  const domain = parts[1].toLowerCase().trim();
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Generates a stateless signed math CAPTCHA challenge.
 */
function generateCaptcha() {
  const num1 = crypto.randomInt(1, 10);
  const num2 = crypto.randomInt(1, 10);
  const answer = num1 + num2;
  const captchaId = crypto.randomBytes(16).toString('hex');
  
  // Sign the answer statelessly with a timestamp to prevent replay attacks
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins validity
  const secret = process.env.JWT_SECRET || 'captcha-fallback-secret';
  const signaturePayload = `${captchaId}:${answer}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
  
  return {
    captchaId,
    equation: `What is ${num1} + ${num2}?`,
    expiresAt,
    signature
  };
}

/**
 * Verifies a stateless signed math CAPTCHA answer.
 */
function verifyCaptcha(captchaId, answer, expiresAt, signature) {
  if (!captchaId || answer === undefined || !expiresAt || !signature) {
    return false;
  }
  
  // Check expiration
  if (Date.now() > Number(expiresAt)) {
    return false;
  }
  
  const secret = process.env.JWT_SECRET || 'captcha-fallback-secret';
  const signaturePayload = `${captchaId}:${answer.toString().trim()}:${expiresAt}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

module.exports = {
  validatePasswordStrength,
  isDisposableEmail,
  generateCaptcha,
  verifyCaptcha
};
