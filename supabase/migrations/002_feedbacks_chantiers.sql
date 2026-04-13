-- ════════════════════════════════════════════════════════════════
-- Migration 002 — Tables user_feedbacks + chantiers
-- À exécuter dans Supabase SQL Editor avant utilisation
-- ════════════════════════════════════════════════════════════════

-- ── Remontées utilisateurs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_key TEXT NOT NULL,
  user_email TEXT,
  user_role TEXT,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'critical')),
  status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en_cours', 'résolu', 'ignoré')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_feedbacks ENABLE ROW LEVEL SECURITY;

-- Insertion publique (apps clientes via ingest key)
-- Note : PostgreSQL ne supporte pas CREATE POLICY IF NOT EXISTS.
-- Pattern idempotent : DROP IF EXISTS puis CREATE.
DROP POLICY IF EXISTS "public insert user_feedbacks" ON user_feedbacks;
CREATE POLICY "public insert user_feedbacks"
  ON user_feedbacks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Lecture + écriture complète via service_role
DROP POLICY IF EXISTS "service_role full access on user_feedbacks" ON user_feedbacks;
CREATE POLICY "service_role full access on user_feedbacks"
  ON user_feedbacks FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON user_feedbacks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_app ON user_feedbacks(app_key, created_at DESC);

-- ── Suivi des chantiers ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chantiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_key TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'a_faire' CHECK (status IN ('a_faire', 'en_cours', 'bloque', 'termine')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  date_debut DATE,
  date_fin_prevue DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access on chantiers" ON chantiers;
CREATE POLICY "service_role full access on chantiers"
  ON chantiers FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chantiers_status ON chantiers(status, priority);
CREATE INDEX IF NOT EXISTS idx_chantiers_app ON chantiers(app_key, created_at DESC);
