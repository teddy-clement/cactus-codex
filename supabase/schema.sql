-- CACTUS CODEX — Schéma Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS cc_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('SUPERADMIN', 'ADMIN', 'VIEWER')),
  organisation TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  env TEXT NOT NULL DEFAULT 'production' CHECK (env IN ('production', 'staging', 'preview', 'cloud')),
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'maintenance', 'offline')),
  uptime NUMERIC(5,2) DEFAULT 99.9,
  maintenance_since TIMESTAMPTZ,
  maintenance_message TEXT,
  maintenance_by TEXT,
  app_key TEXT UNIQUE,
  control_note TEXT,
  public_login_message TEXT,
  public_home_message TEXT,
  login_notice_enabled BOOLEAN DEFAULT FALSE,
  home_notice_enabled BOOLEAN DEFAULT FALSE,
  reboot_required BOOLEAN DEFAULT FALSE,
  last_restart_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  name TEXT NOT NULL,
  path_prefix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'maintenance', 'offline')),
  maintenance_message TEXT,
  public_message TEXT,
  reboot_required BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, module_key)
);

CREATE TABLE IF NOT EXISTS app_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'cotrain',
  signal_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'error')),
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  estimated_duration TEXT NOT NULL,
  message TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roadmap_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('done', 'active', 'todo')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  tag TEXT NOT NULL DEFAULT 'cotrain' CHECK (tag IN ('cotrain', 'infra', 'ux')),
  version TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('ok', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  "user" TEXT NOT NULL DEFAULT 'Système'
);

-- NOTE : les donnees metier (app CoTrain, modules, roadmap) sont extraites
-- dans supabase/seeds/cotrain.sql pour garder le schema pur structure.
-- Ce fichier ne doit contenir que de la definition de structure.

ALTER TABLE cc_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_users_email ON cc_users(email);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_modules_app ON app_modules(app_id, status);
CREATE INDEX IF NOT EXISTS idx_signals_app_ts ON app_signals(app_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_ts ON activity_logs(timestamp DESC);

-- ════════════════════════════════════════════════════════════════
-- RLS POLICIES — à exécuter après avoir activé RLS sur chaque table
-- ════════════════════════════════════════════════════════════════

-- service_role bypass (toutes les tables)
-- Le service_role de Supabase bypasse le RLS nativement, mais on
-- explicite les policies pour éviter tout blocage côté anon.

-- cc_users : uniquement via service_role (jamais exposé en anon)
CREATE POLICY "service_role full access on cc_users"
  ON cc_users FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- otp_codes : uniquement via service_role
CREATE POLICY "service_role full access on otp_codes"
  ON otp_codes FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- apps : lecture publique (pour /api/public/apps), écriture service_role uniquement
CREATE POLICY "public read apps"
  ON apps FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "service_role write apps"
  ON apps FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- app_modules : lecture publique, écriture service_role
CREATE POLICY "public read app_modules"
  ON app_modules FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "service_role write app_modules"
  ON app_modules FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- app_signals : insertion publique (pour ingest depuis CoTrain), lecture service_role
CREATE POLICY "public insert app_signals"
  ON app_signals FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "service_role full access on app_signals"
  ON app_signals FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- maintenance_schedules : lecture/écriture service_role uniquement
CREATE POLICY "service_role full access on maintenance_schedules"
  ON maintenance_schedules FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- roadmap_items : lecture publique pour dashboard, écriture service_role
CREATE POLICY "public read roadmap_items"
  ON roadmap_items FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "service_role write roadmap_items"
  ON roadmap_items FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- activity_logs : lecture + écriture service_role uniquement
CREATE POLICY "service_role full access on activity_logs"
  ON activity_logs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════
-- TABLE codex_broadcasts — historique des broadcasts envoyés vers CoTrain
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS codex_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  niveau TEXT NOT NULL DEFAULT 'moyen' CHECK (niveau IN ('faible', 'moyen', 'important')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'Système',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  error TEXT
);

ALTER TABLE codex_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access on codex_broadcasts"
  ON codex_broadcasts FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_codex_broadcasts_ts ON codex_broadcasts(created_at DESC);
