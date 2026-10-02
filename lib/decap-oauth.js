'use strict';

const { randomBytes, timingSafeEqual } = require('node:crypto');

const STATE_COOKIE = 'decap_oauth_state';
const STATE_TTL_SECONDS = 600;

function getEnv(...names) {
  for (const name of names) {
    const value = process.env[name];

    if (value) {
      return value.trim();
    }
  }

  return '';
}

function getConfig() {
  const clientId = getEnv(
    'GITHUB_CLIENT_ID',
    'OAUTH_CLIENT_ID',
    'CLIENT_ID',
    'client_id'
  );
  const clientSecret = getEnv(
    'GITHUB_CLIENT_SECRET',
    'OAUTH_CLIENT_SECRET',
    'SECRET_ID',
    'secret_id'
  );
  const redirectUrl = getEnv(
    'GITHUB_REDIRECT_URL',
    'REDIRECT_URL',
    'redirect_url'
  );
  const rawScope = getEnv('GITHUB_SCOPES', 'SCOPES', 'scopes', 'SCOPE', 'scope');
  const cmsOrigin = getEnv('CMS_ORIGIN') || 'https://ryro20.github.io';
  const missingVariables = [];

  if (!clientId) {
    missingVariables.push('GITHUB_CLIENT_ID');
  }

  if (!clientSecret) {
    missingVariables.push('GITHUB_CLIENT_SECRET');
  }

  if (!redirectUrl) {
    missingVariables.push('GITHUB_REDIRECT_URL');
  }

  if (missingVariables.length) {
    throw new Error(
      `Faltan variables de entorno: ${missingVariables.join(', ')}.`
    );
  }

  let redirect;
  let cms;

  try {
    redirect = new URL(redirectUrl);
  } catch (error) {
    throw new Error('GITHUB_REDIRECT_URL debe ser una URL completa válida.');
  }

  try {
    cms = new URL(cmsOrigin);
  } catch (error) {
    throw new Error('CMS_ORIGIN debe ser un origen HTTPS válido.');
  }

  if (
    redirect.protocol !== 'https:' ||
    redirect.pathname !== '/api/callback' ||
    redirect.search ||
    redirect.hash ||
    cms.protocol !== 'https:' ||
    cms.origin !== cmsOrigin.replace(/\/$/, '')
  ) {
    throw new Error(
      'GITHUB_REDIRECT_URL debe terminar en /api/callback y CMS_ORIGIN debe ser solo el origen HTTPS del panel.'
    );
  }

  const scope = (rawScope || 'public_repo,user')
    .split(/[,\s]+/)
    .filter(Boolean)
    .join(' ');

  return {
    clientId,
    clientSecret,
    redirectUrl: redirect.href,
    scope,
    cmsOrigin: cms.origin
  };
}

function createState() {
  return randomBytes(32).toString('hex');
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');

    if (separator < 0) {
      continue;
    }

    const key = part.slice(0, separator).trim();

    if (key === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch (error) {
        return '';
      }
    }
  }

  return '';
}

function statesMatch(left, right) {
  if (!left || !right) {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function setStateCookie(res, value, maxAge = STATE_TTL_SECONDS) {
  res.setHeader(
    'Set-Cookie',
    `${STATE_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/api/callback; Max-Age=${maxAge}`
  );
}

function clearStateCookie(res) {
  setStateCookie(res, '', 0);
}

function setPrivateHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

module.exports = {
  STATE_COOKIE,
  clearStateCookie,
  createState,
  getConfig,
  getCookie,
  setPrivateHeaders,
  setStateCookie,
  statesMatch
};
