// leefnu/server/piper-stub.js
// Stub. Niet actief. Spraak gaat nu via het toestel.
// Later: eigen Piper-proces op 127.0.0.1 met nl-BE stem.

async function spreek(tekst) {
  throw new Error("Piper niet actief. Spraak via toestel.");
}

module.exports = { spreek };
