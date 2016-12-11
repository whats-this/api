// Required modules
const crypto = require('crypto');

/**
 * Generate random key.
 * @return {string} 6 character key.
 */
exports.generateRandomKey = () => {
  const seed = String(Math.floor(Math.random() * 10) + Date.now());
  return crypto.createHash('md5').update(seed).digest('hex').substr(2, 6);
}
