// leefnu/server/mollie-betaling.js
// Maakt een eenmalige betaling van €49,00 voor Reset.
// Sleutel alleen uit de omgeving. Nooit loggen.

const MOLLIE_API = "https://api.mollie.com/v2/payments";

async function maakBetaling({ email }) {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) throw new Error("MOLLIE_API_KEY ontbreekt");
  if (key.startsWith("test_") && process.env.NODE_ENV === "production") {
    throw new Error("test-sleutel in productie");
  }
  if (!email || !email.includes("@")) throw new Error("ongeldig e-mailadres");

  const body = {
    amount: { currency: "EUR", value: "49.00" },
    description: "Leef Nu · Reset · 1 jaar",
    redirectUrl: "https://leefnu.app/?betaald=1",
    webhookUrl: "https://leefnu.app/api/mollie/webhook",
    metadata: { email, product: "reset_jaar", bedrag: "49.00" }
  };

  const res = await fetch(MOLLIE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const tekst = await res.text();
    throw new Error(`Mollie ${res.status}: ${tekst.slice(0, 200)}`);
  }
  const data = await res.json();
  return { checkoutUrl: data._links.checkout.href, paymentId: data.id };
}

module.exports = { maakBetaling };
