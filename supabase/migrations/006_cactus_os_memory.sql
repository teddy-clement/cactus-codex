-- ════════════════════════════════════════════════════════════════
-- Migration 006 — Memoire persistante CactusOS
-- Idempotente : peut etre rejouee sans erreur
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. cactus_os_messages — historique brut des conversations
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cactus_os_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_messages_date
  ON cactus_os_messages(created_at DESC);

ALTER TABLE cactus_os_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_os_messages" ON cactus_os_messages;
CREATE POLICY "service_role_os_messages"
  ON cactus_os_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 2. cactus_os_memory — resumes de conversation (cron 24h)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cactus_os_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  summary TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_memory_date
  ON cactus_os_memory(created_at DESC);

ALTER TABLE cactus_os_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_os_memory" ON cactus_os_memory;
CREATE POLICY "service_role_os_memory"
  ON cactus_os_memory FOR ALL TO service_role USING (true) WITH CHECK (true);
