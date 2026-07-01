const https = require('https');
const crypto = require('crypto');

function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

function buildGoogleAuthUrl(clientId, redirectUri, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse response')); }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy(new Error('Google API request timed out'));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function exchangeCodeForTokens(code, clientId, clientSecret, redirectUri) {
  const body = new URLSearchParams({
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: redirectUri, grant_type: 'authorization_code',
  }).toString();
  return httpsRequest({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);
}

async function getGoogleUserInfo(accessToken) {
  return httpsRequest({
    hostname: 'www.googleapis.com', path: '/oauth2/v2/userinfo', method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

module.exports = { generateState, buildGoogleAuthUrl, exchangeCodeForTokens, getGoogleUserInfo };
