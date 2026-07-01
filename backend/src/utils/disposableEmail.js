// Disposable / temporary email detection.
// Keep this server-side. Client-side checks are only UX; the backend is the gate.

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  '20minutemail.com',
  '33mail.com',
  'anonaddy.com',
  'anonymbox.com',
  'armyspy.com',
  'burnermail.io',
  'byom.de',
  'chacuo.net',
  'cuvox.de',
  'dayrep.com',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'filzmail.com',
  'getairmail.com',
  'getnada.com',
  'gishpuppy.com',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.info',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'hidemyass.com',
  'incognitomail.org',
  'jetable.org',
  'mail-temporaire.fr',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailinator.net',
  'mailinator.org',
  'mailnesia.com',
  'mintemail.com',
  'mohmal.com',
  'mytrashmail.com',
  'nada.email',
  'pokemail.net',
  'sharklasers.com',
  'spam4.me',
  'spamgourmet.com',
  'spambog.com',
  'spamdecoy.net',
  'spamfree24.org',
  'spamhole.com',
  'spamobox.com',
  'temp-mail.io',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'throwawaymail.com',
  'trash-mail.com',
  'trashmail.com',
  'trashmail.de',
  'trashmail.net',
  'wegwerfmail.de',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
]);

const DISPOSABLE_DOMAIN_FRAGMENTS = [
  '10minutemail',
  'guerrillamail',
  'mailinator',
  'tempmail',
  'temp-mail',
  'throwawaymail',
  'trashmail',
  'yopmail',
];

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const getEmailDomain = (email = '') => {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return '';
  return normalized.slice(atIndex + 1).replace(/\.$/, '');
};

const isDisposableDomain = (domain = '') => {
  const normalized = String(domain).trim().toLowerCase().replace(/^www\./, '');
  if (!normalized) return false;

  if (DISPOSABLE_EMAIL_DOMAINS.has(normalized)) return true;

  // Block subdomains of known disposable domains too, e.g. inbox.mailinator.com.
  for (const disposableDomain of DISPOSABLE_EMAIL_DOMAINS) {
    if (normalized.endsWith(`.${disposableDomain}`)) return true;
  }

  // Catch common rotating variants like mailinator123.tld or temp-mail-example.tld.
  return DISPOSABLE_DOMAIN_FRAGMENTS.some((fragment) => normalized.includes(fragment));
};

const isDisposableEmail = (email = '') => isDisposableDomain(getEmailDomain(email));

const assertPermanentEmail = (email = '') => {
  if (isDisposableEmail(email)) {
    const err = new Error('Please use a permanent email address so we can send order updates and contact you about shipping.');
    err.statusCode = 400;
    err.code = 'DISPOSABLE_EMAIL_BLOCKED';
    throw err;
  }
};

module.exports = {
  DISPOSABLE_EMAIL_DOMAINS,
  getEmailDomain,
  isDisposableDomain,
  isDisposableEmail,
  assertPermanentEmail,
};
