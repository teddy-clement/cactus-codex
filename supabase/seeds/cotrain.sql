-- ════════════════════════════════════════════════════════════════
-- Seed optionnel CoTrain. Ne pas inclure dans les déploiements fresh.
-- À exécuter uniquement pour pré-peupler Codex avec l'app CoTrain
-- et ses 11 modules historiques.
-- ════════════════════════════════════════════════════════════════

-- App CoTrain
INSERT INTO apps (name, url, env, status, uptime, app_key, control_note)
VALUES ('CoTrain', 'https://cotrain-vbeta.vercel.app', 'production', 'online', 99.8, 'cotrain', 'Pilotage centralisé depuis Cactus Codex')
ON CONFLICT (app_key) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, control_note = EXCLUDED.control_note;

-- 11 modules CoTrain
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

-- Roadmap historique CoTrain V2
INSERT INTO roadmap_items (title, description, status, progress, tag, version, priority) VALUES
('Codex ↔ CoTrain — maintenance globale', 'Basculer toute l''application depuis Codex', 'done', 100, 'infra', 'v4', 'high'),
('Codex ↔ CoTrain — maintenance par module', 'GEOPS, COSITE, COMAN, messagerie, affichage', 'active', 75, 'infra', 'v4', 'high'),
('Signals structurels', 'Connexions, alertes, erreurs UI, heartbeat', 'active', 65, 'infra', 'v4', 'high'),
('Messages publics login / home', 'Annonces MAJ, coupure, reprise', 'done', 100, 'ux', 'v4', 'high')
ON CONFLICT DO NOTHING;
