'use strict';

const {
  createState,
  getConfig,
  setPrivateHeaders,
  setStateCookie
} = require('../lib/decap-oauth');

module.exports = function handler(req, res) {
  setPrivateHeaders(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Método no permitido.');
  }

  let config;

  try {
    config = getConfig();
  } catch (error) {
    console.error('Configuración OAuth incompleta o no válida.');
    return res.status(500).send('El inicio de sesión no está configurado.');
  }

  const state = createState();
  const authorizationUrl = new URL(
    'https://github.com/login/oauth/authorize'
  );

  authorizationUrl.searchParams.set('client_id', config.clientId);
  authorizationUrl.searchParams.set('redirect_uri', config.redirectUrl);
  authorizationUrl.searchParams.set('scope', config.scope);
  authorizationUrl.searchParams.set('state', state);

  setStateCookie(res, state);
  return res.redirect(302, authorizationUrl.href);
};
