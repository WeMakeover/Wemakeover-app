/**
 * Mobile auth helpers — non-breaking extension for KMP app.
 * Web clients continue using HttpOnly cookies; mobile clients receive tokens in JSON body.
 */

export const isMobileClient = (req) =>
  req.headers['x-client'] === 'mobile';

export const attachMobileTokens = (req, body, accessToken, refreshToken) => {
  if (!isMobileClient(req)) return body;
  return {
    ...body,
    accessToken,
    refreshToken,
  };
};

export const extractBearerToken = (req) => {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
};
