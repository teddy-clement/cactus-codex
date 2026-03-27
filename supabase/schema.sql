-- ═══════════════════════════════════════════════════════
-- CACTUS CODEX — Schéma Supabase PostgreSQL
-- Exécuter dans l'éditeur SQL de ton projet Supabase
-- ═══════════════════════════════════════════════════════

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABLE : cc_users ────────────────────────────────
CREATE TABLE IF NOT EXISTS cc_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('SUPERADMIN', 'ADMIN', 'VIEWER')),
  organisation  TEXT,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : otp_codes ───────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  email      TEXT PRIMARY KEY,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : apps ────────────────────────────────────
CREATE TABLE IF NOT EXISTS apps (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 TEXT NOT NULL,
  url                  TEXT NOT NULL,
  env                  TEXT NOT NULL DEFAULT 'production' CHECK (env IN ('production', 'staging', 'preview', 'cloud')),
  status               TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'maintenance', 'offline')),
  uptime               NUMERIC(5,2) DEFAULT 99.9,
  maintenance_since    TIMESTAMPTZ,
  maintenance_message  TEXT,
  maintenance_by       TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : maintenance_schedules ───────────────────
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id             UUID REFERENCES apps(id) ON DELETE CASCADE,
  app_name           TEXT NOT NULL,
  scheduled_at       TIMESTAMPTZ NOT NULL,
  estimated_duration TEXT NOT NULL,
  message            TEXT,
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : roadmap_items ───────────────────────────
CREATE TABLE IF NOT EXISTS roadmap_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('done', 'active', 'todo')),
  progress    INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  tag         TEXT NOT NULL DEFAULT 'cotrain' CHECK (tag IN ('cotrain', 'infra', 'ux')),
  version     TEXT,
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE : activity_logs ───────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  level     TEXT NOT NULL CHECK (level IN ('ok', 'info', 'warn', 'error')),
  message   TEXT NOT NULL,
  "user"    TEXT NOT NULL DEFAULT 'Système'
);

-- ══════════════════════════════════════════════════════
-- DONNÉES INITIALES
-- ══════════════════════════════════════════════════════

-- Apps (à adapter selon ton projet)
INSERT INTO apps (name, url, env, status, uptime) VALUES
  ('CoTrain production', 'cotrain-vbeta.vercel.app',    'production', 'online',      99.8),
  ('CoTrain staging',    'cotrain-staging.vercel.app',  'staging',    'maintenance', NULL),
  ('Cactus Codex',       'cactus-codex.com',            'production', 'online',      100.0),
  ('Supabase DB',        'supabase.io — PostgreSQL',    'cloud',      'online',      99.9)
ON CONFLICT DO NOTHING;

-- Roadmap CoTrain V2
INSERT INTO roadmap_items (title, description, status, progress, tag, version, priority) VALUES
  ('BLOC 1 — Stabilisation critique', 'Auth, RDRF, Réforme Flux 1 & 2, PDF',          'done',   100, 'cotrain', 'v2.1.0', 'high'),
  ('BLOC 2 — Fiabilité métier',       'TST import, coupon display, dark mode',          'done',    90, 'cotrain', 'v2.2.0', 'high'),
  ('BLOC 3 — Expérience utilisateur', 'UX mobile, AFFICHAGE TV, micro-animations',     'active',  55, 'ux',      'v2.3.0', 'high'),
  ('BLOC 4 — Système d''événements',  'Realtime Supabase, alertes push, notifications','todo',    10, 'infra',   'v2.4.0', 'medium'),
  ('BLOC 5 — Industrialisation',      'CI/CD Vercel, monitoring, documentation',        'todo',     0, 'infra',   'v2.5.0', 'medium'),
  ('Fix COPT — Record<UserRole,string>', 'Entrées manquantes dans tous les Record<UserRole>', 'active', 0, 'cotrain', 'v2.3.2', 'high'),
  ('RDRF print — page break rendering', 'Rendu impression RDRF cassé sur multi-pages', 'active',  0, 'cotrain', NULL,      'high'),
  ('Cactus Codex — Auth réelle + déploiement', 'Backend Next.js + Supabase + Vercel', 'active',  0, 'infra',   NULL,      'high'),
  ('Widgets analytiques — home CoTrain', 'Ajouter les widgets de stats sur la page d''accueil', 'todo', 0, 'ux', NULL, 'medium'),
  ('AFFICHAGE TV — animations oiseaux v2', 'Refonte des silhouettes oiseaux sur la page AFFICHAGE', 'todo', 0, 'ux', NULL, 'low')
ON CONFLICT DO NOTHING;

-- Logs initiaux
INSERT INTO activity_logs (timestamp, level, message, "user") VALUES
  (NOW() - INTERVAL '30 minutes', 'ok',   'Connexion réussie — 2FA validé',              'Teddy C.'),
  (NOW() - INTERVAL '2 hours',    'ok',   'RDRF #4821 généré — Voie 7',                  'CoTrain'),
  (NOW() - INTERVAL '3 hours',    'info', 'TST importé — 14 trains traités',             'CoTrain'),
  (NOW() - INTERVAL '5 hours',    'ok',   'Déploiement CoTrain v2.3.1 — Vercel CI/CD',   'Système'),
  (NOW() - INTERVAL '1 day',      'warn', 'Tentative login échouée — 3 essais consécutifs', 'Inconnu'),
  (NOW() - INTERVAL '1 day',      'ok',   'Backup Supabase — 3.2 GB exporté',            'Système')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════
-- SÉCURITÉ RLS (Row Level Security)
-- ══════════════════════════════════════════════════════

-- Activer RLS sur toutes les tables
ALTER TABLE cc_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps                ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs       ENABLE ROW LEVEL SECURITY;

-- Le service role bypass RLS automatiquement.
-- On n'ouvre PAS l'accès public — toutes les requêtes
-- passent par le service role via l'API Next.js.
-- Aucune policy "anon" n'est nécessaire ici.

-- ══════════════════════════════════════════════════════
-- INDEX pour les performances
-- ══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_otp_email      ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires    ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_logs_ts        ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level     ON activity_logs(level);
CREATE INDEX IF NOT EXISTS idx_users_email    ON cc_users(email);
CREATE INDEX IF NOT EXISTS idx_apps_status    ON apps(status);

-- ══════════════════════════════════════════════════════
-- NETTOYAGE OTP EXPIRÉ (à configurer en cron Supabase)
-- Dashboard > Database > Extensions > pg_cron
-- ══════════════════════════════════════════════════════
-- SELECT cron.schedule('cleanup-otp', '*/15 * * * *',
--   $$DELETE FROM otp_codes WHERE expires_at < NOW() OR used = true$$
-- );
