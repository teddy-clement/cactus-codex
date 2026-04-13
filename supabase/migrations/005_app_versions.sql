-- ════════════════════════════════════════════════════════════════
-- Migration 005 — Deploiements Vercel, ameliorations roadmap, logos apps
-- Idempotente : peut etre rejouee sans erreur
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. app_deployments — synchronisation Vercel
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_key TEXT NOT NULL,
  deployment_id TEXT NOT NULL UNIQUE,
  version TEXT,                              -- tag git ou SHA court
  message TEXT,                              -- commit message
  status TEXT NOT NULL DEFAULT 'READY',
  deployed_at TIMESTAMPTZ NOT NULL,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployments_app
  ON app_deployments(app_key, deployed_at DESC);

ALTER TABLE app_deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_deployments" ON app_deployments;
CREATE POLICY "service_role_deployments"
  ON app_deployments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 2. app_improvements — roadmap kanban par app
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_improvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_key TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual','terrain','cactus-os')),
  statut TEXT DEFAULT 'idee'
    CHECK (statut IN ('idee','planifie','en_cours','livre')),
  priorite INTEGER DEFAULT 3
    CHECK (priorite BETWEEN 1 AND 5),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_improvements_app
  ON app_improvements(app_key, statut, priorite DESC);

ALTER TABLE app_improvements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_improvements" ON app_improvements;
CREATE POLICY "service_role_improvements"
  ON app_improvements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 3. apps.logo_url — chemin du logo dans Supabase Storage
-- ────────────────────────────────────────────────────────────
ALTER TABLE apps
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ────────────────────────────────────────────────────────────
-- 4. INSTRUCTIONS MANUELLES — Bucket Supabase Storage
-- ────────────────────────────────────────────────────────────
-- À exécuter une fois dans Supabase Studio > Storage :
--
--   1. Créer un bucket nommé "app-logos"
--   2. Cocher "Public bucket" (lecture publique)
--   3. (Optionnel) Définir les types MIME autorisés :
--      image/png, image/jpeg, image/webp
--   4. (Optionnel) Limite de taille : 2 MB
--
-- Alternative SQL (à exécuter manuellement) :
--   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--   VALUES ('app-logos', 'app-logos', true, 2097152,
--           ARRAY['image/png','image/jpeg','image/webp'])
--   ON CONFLICT (id) DO NOTHING;
