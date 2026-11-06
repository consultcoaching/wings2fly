/* De enige netwerkaanroepen van de app, allemaal buiten het crisispad en
 * alleen op uitdrukkelijke actie van de gebruiker (betalen, toegang ophalen). */
import { API_BASE } from './config';

async function call(pad, opties = {}) {
  const res = await fetch(`${API_BASE}${pad}`, {
    ...opties,
    headers: { 'Content-Type': 'application/json', ...(opties.headers || {}) },
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

/** Start een betaling. Geeft { checkoutUrl, paymentId } of gooit een Error met
 * een boodschap die aan de gebruiker getoond mag worden. */
export async function startBetaling(email) {
  const { status, json } = await call('/betaling', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (status === 200 && json && json.checkoutUrl && json.paymentId) return json;
  if (status === 429) throw new Error('Te veel pogingen. Probeer over tien minuten opnieuw.');
  if (status === 400) throw new Error('Controleer je e-mailadres.');
  throw new Error('Betaling starten lukt nu niet. Probeer later opnieuw.');
}

/** Haalt het token op na betaling.
 * Resultaat: { status: 'ok', token, niveau, tot } | { status: 'wacht' } |
 * { status: 'fout', bericht }. */
export async function haalToken(paymentId, email) {
  const qs = new URLSearchParams({ payment: paymentId, email });
  const { status, json } = await call(`/token?${qs}`);
  if (status === 200 && json && json.token) return { status: 'ok', ...json };
  if (status === 202) return { status: 'wacht' };
  if (status === 404) return { status: 'fout', bericht: 'Geen betaling gevonden voor dit e-mailadres en betaal-ID.' };
  if (status === 410) return { status: 'fout', bericht: 'Dit niveau is verlopen.' };
  return { status: 'fout', bericht: 'Ophalen lukt nu niet. Probeer later opnieuw.' };
}
