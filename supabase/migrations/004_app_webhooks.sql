-- ════════════════════════════════════════════════════════════════
-- Migration 004 — Webhooks et ingest key par app (multi-apps)
-- Idempotente : peut etre rejouee sans erreur
-- ════════════════════════════════════════════════════════════════

-- Ajout des colonnes webhook + ingest_key sur la table apps
ALTER TABLE apps
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS ingest_key TEXT;

-- Migration des valeurs CoTrain existantes depuis les env vars
-- IMPORTANT : remplacer PLACEHOLDER_REMPLACE_PAR_SECRET_REEL par la vraie valeur
UPDATE apps SET
  webhook_url = 'https://cotrain-vbeta.vercel.app/api/codex/broadcast',
  webhook_secret = 'PLACEHOLDER_REMPLACE_PAR_SECRET_REEL'
WHERE app_key = 'cotrain'
  AND (webhook_url IS NULL OR webhook_secret IS NULL);
