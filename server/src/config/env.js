/**
 * Central env validation and config.
 * Validates required vars at startup; logs clearly if something is missing.
 */

const required = ['DATABASE_URL'];
const optional = ['NODE_ENV', 'CLIENT_URL', 'DATABASE_URL_DIRECT'];

function validate() {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    const msg = `Config error: missing required env: ${missing.join(', ')}`;
    console.error(msg);
    throw new Error(msg);
  }
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL,
    databaseUrlDirect: process.env.DATABASE_URL_DIRECT,
    clientUrl: process.env.CLIENT_URL,
  };
}

let config;
try {
  config = validate();
} catch (e) {
  throw e;
}

export { validate };
export default config;
