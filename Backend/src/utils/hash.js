import crypto from 'crypto';

export function encryptPassword(password) {
  if (!password) {
    throw new Error('Password is required for encryption.');
  }
  
  return crypto.createHmac('sha256', process.env.API_SECRET_KEY)
    .update(password)
    .digest('hex');
};
