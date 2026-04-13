-- ════════════════════════════════════════════════════════════════
-- Migration 003 — Rate limiting distribue
-- Table partagee entre instances Vercel serverless
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Acces exclusif service_role (jamais expose en anon)
-- Note : PostgreSQL ne supporte pas CREATE POLICY IF NOT EXISTS.
-- Pattern idempotent : DROP IF EXISTS puis CREATE.
DROP POLICY IF EXISTS "service_role full access on rate_limits" ON rate_limits;
CREATE POLICY "service_role full access on rate_limits"
  ON rate_limits FOR ALL
  TO service_role USING (true) WITH CHECK (true);
