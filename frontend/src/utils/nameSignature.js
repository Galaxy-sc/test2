import { APP_CONFIG, NAME_VERIFY_PUBLIC_KEY_JWK } from '../config';

export const normalizeCertName = (name) =>
  String(name || '').trim().replace(/\s+/g, ' ');

const fromBase64Url = (str) => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

let cachedPublicKeyPromise = null;

const getPublicKey = () => {
  if (!NAME_VERIFY_PUBLIC_KEY_JWK || !NAME_VERIFY_PUBLIC_KEY_JWK.kty) {
    return Promise.resolve(null);
  }
  if (!cachedPublicKeyPromise) {
    cachedPublicKeyPromise = window.crypto.subtle.importKey(
      'jwk',
      NAME_VERIFY_PUBLIC_KEY_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
  }
  return cachedPublicKeyPromise;
};

export async function verifyNameSignature(userId, rawName, sig) {
  const normalized = normalizeCertName(rawName);
  if (!userId || !normalized || !sig) return false;

  try {
    const publicKey = await getPublicKey();
    if (!publicKey) return false;

    const sigBytes = fromBase64Url(sig);
    const data = new TextEncoder().encode(`v1:${userId}:${normalized}`);

    return await window.crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      sigBytes,
      data
    );
  } catch {
    return false;
  }
}

export function buildCertificateQuery(certId, verifiedName, sig) {
  const params = new URLSearchParams({ id: String(certId) });
  if (verifiedName && sig) {
    params.set('name', verifiedName);
    params.set('sig', sig);
  }
  return `?${params.toString()}`;
}

export function buildCertificateShareUrl(certId, verifiedName, sig) {
  return `${APP_CONFIG.domain}/${buildCertificateQuery(certId, verifiedName, sig)}`;
}

export async function enrichCertificateWithVerifiedName(certData, urlName, urlSig) {
  const normalizedUrlName = normalizeCertName(urlName);
  const isVerified =
    Boolean(normalizedUrlName && urlSig) &&
    (await verifyNameSignature(certData.id, normalizedUrlName, urlSig));

  const verifiedName = isVerified ? normalizedUrlName : null;
  const verifiedSig = isVerified ? urlSig : null;

  return {
    ...certData,
    display_name: verifiedName || certData.real_name || certData.user,
    verified_name: verifiedName,
    name_sig: verifiedSig,
    share_url: buildCertificateShareUrl(certData.id, verifiedName, verifiedSig),
  };
}