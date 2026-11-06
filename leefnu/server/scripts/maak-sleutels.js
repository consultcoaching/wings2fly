#!/usr/bin/env node
// Genereert een Ed25519-sleutelpaar voor de niveau-tokens.
//
//   node scripts/maak-sleutels.js
//
// Privésleutel → LEEFNU_TOKEN_PRIVATE_KEY in /etc/leefnu/api.env op de server.
// Publieke sleutel → TOKEN_PUBLIC_KEY in leefnu/src/lib/config.js (mag in de repo).
// De privésleutel nooit committen, nooit in chat plakken.

const crypto = require("node:crypto");
const { publiekeSleutelHex } = require("../token");

const { privateKey } = crypto.generateKeyPairSync("ed25519");
const der = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");

process.stdout.write(
  [
    "# Server (geheim, één regel, in /etc/leefnu/api.env):",
    `LEEFNU_TOKEN_PRIVATE_KEY=${der}`,
    "",
    "# App (publiek, in leefnu/src/lib/config.js):",
    `export const TOKEN_PUBLIC_KEY = '${publiekeSleutelHex(privateKey)}';`,
    ""
  ].join("\n")
);
