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

INSERT INTO apps (name, url, env, status, uptime, app_key, control_note)
VALUES ('CoTrain', 'https://cotrain-vbeta.vercel.app', 'production', 'online', 99.8, 'cotrain', 'Pilotage centralisé depuis Cactus Codex')
ON CONFLICT (app_key) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, control_note = EXCLUDED.control_note;

WITH app AS (SELECT id FROM apps WHERE app_key = 'cotrain')
INSERT INTO app_modules (app_id, module_key, name, path_prefix, status)
SELECT app.id, x.module_key, x.name, x.path_prefix, 'online'
FROM app CROSS JOIN (
  VALUES
    ('login', 'Connexion', '/login'),
    ('home', 'Accueil', '/home'),
    ('geops', 'GEOPS', '/geops'),
    ('cosite', 'COSITE', '/cosite'),
    ('coman', 'COMAN', '/coman'),
    ('encadrant', 'Encadrant', '/encadrant'),
    ('copt', 'COPT', '/copt'),
    ('messagerie', 'Messagerie', '/messagerie'),
    ('affichage', 'Affichage', '/affichage'),
    ('admin', 'Administration', '/admin'),
    ('superadmin', 'Superadmin', '/superadmin')
) AS x(module_key, name, path_prefix)
ON CONFLICT (app_id, module_key) DO NOTHING;

INSERT INTO roadmap_items (title, description, status, progress, tag, version, priority) VALUES
('Codex ↔ CoTrain — maintenance globale', 'Basculer toute l’application depuis Codex', 'done', 100, 'infra', 'v4', 'high'),
('Codex ↔ CoTrain — maintenance par module', 'GEOPS, COSITE, COMAN, messagerie, affichage', 'active', 75, 'infra', 'v4', 'high'),
('Signals structurels', 'Connexions, alertes, erreurs UI, heartbeat', 'active', 65, 'infra', 'v4', 'high'),
('Messages publics login / home', 'Annonces MAJ, coupure, reprise', 'done', 100, 'ux', 'v4', 'high')
ON CONFLICT DO NOTHING;

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
