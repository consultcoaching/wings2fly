/* Niveau-token controleren, volledig offline. Het token is een JWT met EdDSA
 * (Ed25519), getekend door de server; de publieke sleutel zit in config.js.
 * Resultaat: { niveau, tot, email, pid } of null. Nooit een exception. */
import { verifyAsync } from '@noble/ed25519';
import { TOKEN_PUBLIC_KEY } from './config';
import { isTierKey } from './tiers';

function b64urlToBytes(s) {
  const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function hexToBytes(hex) {
  const clean = String(hex || '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) return null;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const utf8 = (s) => new TextEncoder().encode(s);
const decodeJSON = (b64url) => JSON.parse(new TextDecoder().decode(b64urlToBytes(b64url)));

export function tokenIngeschakeld() {
  return Boolean(hexToBytes(TOKEN_PUBLIC_KEY));
}

/** Verifieert handtekening en vervaldatum. Geen sleutel in config = altijd null. */
export async function verifieerToken(token, nu = Date.now()) {
  try {
    const pub = hexToBytes(TOKEN_PUBLIC_KEY);
    if (!pub || typeof token !== 'string') return null;
    const delen = token.split('.');
    if (delen.length !== 3) return null;
    const [h, p, s] = delen;
    const header = decodeJSON(h);
    if (header.alg !== 'EdDSA') return null;
    const ok = await verifyAsync(b64urlToBytes(s), utf8(`${h}.${p}`), pub);
    if (!ok) return null;
    const payload = decodeJSON(p);
    if (!payload.exp || payload.exp * 1000 <= nu) return null;
    if (!isTierKey(payload.niveau)) return null;
    return { niveau: payload.niveau, tot: payload.tot, email: payload.sub, pid: payload.pid };
  } catch {
    return null;
  }
}
