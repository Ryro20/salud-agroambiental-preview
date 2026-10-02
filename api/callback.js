'use strict';

const { randomBytes } = require('node:crypto');
const {
  clearStateCookie,
  getConfig,
  getCookie,
  setPrivateHeaders,
  statesMatch,
  STATE_COOKIE
} = require('../lib/decap-oauth');

function sendPopupResult(res, origin, status, value) {
  const nonce = randomBytes(18).toString('base64');
  const message = `authorization:github:${status}:${JSON.stringify(value)}`;
  const messageJson = JSON.stringify(message).replace(/</g, '\\u003c');
  const originJson = JSON.stringify(origin);

  res.setHeader(
    'Content-Security-Policy',
    `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  return res.status(status === 'success' ? 200 : 400).send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Acceso al panel</title></head>
<body>
  <p id="status">Comunicando el resultado al panel...</p>
  <script nonce="${nonce}">
    (function () {
      var targetOrigin = ${originJson};
      var message = ${messageJson};

      if (!window.opener) {
        document.getElementById('status').textContent =
          'No se encontró la ventana del panel. Cierra esta ventana e inténtalo de nuevo.';
        return;
      }

      function finish(event) {
        if (event.origin !== targetOrigin || event.source !== window.opener) {
          return;
        }

        window.removeEventListener('message', finish);
        window.opener.postMessage(message, targetOrigin);
        window.close();
      }

      window.addEventListener('message', finish);
      window.opener.postMessage('authorizing:github', targetOrigin);
    })();
  </script>
</body>
</html>`);
}

module.exports = async function handler(req, res) {
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

  const query = new URL(req.url, config.redirectUrl).searchParams;
  const returnedState = query.get('state') || '';
  const savedState = getCookie(req, STATE_COOKIE);

  clearStateCookie(res);

  if (!statesMatch(returnedState, savedState)) {
    return res.status(400).send('La solicitud de acceso ha caducado o no es válida.');
  }

  const providerError = query.get('error');

  if (providerError) {
    return sendPopupResult(res, config.cmsOrigin, 'error', {
      message: 'GitHub no autorizó el acceso.'
    });
  }

  const code = query.get('code');

  if (!code) {
    return res.status(400).send('GitHub no devolvió un código de autorización.');
  }

  let tokenResponse;

  try {
    tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUrl
      })
    });
  } catch (error) {
    console.error('No se pudo contactar con GitHub para completar OAuth.');
    return res.status(502).send('No se pudo completar el acceso con GitHub.');
  }

  if (!tokenResponse.ok) {
    console.error('GitHub rechazó el intercambio del código OAuth.');
    return res.status(502).send('GitHub no pudo completar el acceso.');
  }

  let tokenData;

  try {
    tokenData = await tokenResponse.json();
  } catch (error) {
    console.error('GitHub devolvió una respuesta OAuth no válida.');
    return res.status(502).send('GitHub devolvió una respuesta no válida.');
  }

  if (!tokenData.access_token) {
    console.error('La respuesta OAuth de GitHub no contiene un token.');
    return res.status(502).send('GitHub no devolvió un token de acceso.');
  }

  return sendPopupResult(res, config.cmsOrigin, 'success', {
    token: tokenData.access_token
  });
};
