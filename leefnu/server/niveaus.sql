-- leefnu/server/niveaus.sql
-- SQLite-schema voor niveaus en webhook-log.
-- Pad op de server: /var/lib/leefnu/niveaus.sqlite

CREATE TABLE IF NOT EXISTS niveaus (
  email      TEXT PRIMARY KEY,
  niveau     TEXT NOT NULL,
  tot        TEXT NOT NULL,
  payment_id TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_log (
  payment_id  TEXT PRIMARY KEY,
  status      TEXT NOT NULL,
  received_at TEXT NOT NULL
);
