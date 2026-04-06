# CactusCodex — Agent Briefing

## Identité du projet

CactusCodex est le back-office admin centralisé de la marque **Cactus Codex**, développé 

et maintenu par Teddy. Ce n'est pas une app utilisateur finale — c'est le **cockpit de 

pilotage** de toutes les applications Cactus Codex, présentes et futures.

Son rôle : superviser, contrôler et monitorer chaque app depuis un seul endroit sécurisé.

## Stack technique

- **Framework** : Next.js 14 (App Router)

- **Langage** : TypeScript strict — toujours typer explicitement, jamais de `any`

- **Style** : Tailwind CSS — pas de CSS inline, pas de fichiers .css séparés

- **Backend** : Supabase (PostgreSQL + Auth + Realtime)

- **Déploiement** : Vercel

- **URL prod** : https://www.cactus-codex.com (le `www` est obligatoire — CORS si oublié)

- **Supabase** : https://ijoyjcajzbmsexpyjctb.supabase.co

## Identité visuelle — ne jamais dévier

- **Couleur principale** : deep forest green `#1a4a2e`

- **Accent** : bright green `#4ade80`

- **Typographies** : Barlow Condensed (titres) + DM Mono (données, code, métriques)

- **Logo** : SVG chat + cactus — ne jamais remplacer par une icône générique

- **Thème** : dark par défaut, interface dense et professionnelle

- Toute nouvelle section ou composant doit respecter cette charte sans exception

## Authentification

- Double facteur obligatoire : mot de passe + OTP 6 chiffres via **Resend**

- Ne jamais simplifier ou contourner ce flow, même pour du debug

- Les sessions sont gérées par Supabase Auth

## Vision produit — Centre de commandement multi-apps

CactusCodex est conçu pour piloter N applications présentes et futures.

C'est un **vrai centre de commandement** — pas un back-office basique.

Ambition : futuriste, dynamique, dense en données, sécurisé, professionnel.

### Ce que CactusCodex doit permettre :

- **Monitoring temps réel** : utilisateurs connectés, actions en cours, erreurs live

- **Maintenance granulaire** : mettre en maintenance une app entière ou module par module

- **Suivi des chantiers** : état d'avancement des développements par app

- **Roadmap** : fonctionnalités planifiées par app avec priorités

- **Remontées utilisateurs** : feedbacks et bugs remontés depuis les apps clientes

- **Analytics** : métriques d'usage, courbes, pics d'activité

- **Logs** : journal horodaté de toutes les actions admin

- **Alertes** : système d'alerte en temps réel sur anomalies

## Architecture des apps pilotées

Chaque app est enregistrée avec :

- Un `app_key` unique (ex: `cotrain`)

- Une liste de modules avec leur statut (actif / maintenance)

- Des métriques remontées depuis l'app

Tables Supabase principales :

- `apps` — liste des applications enregistrées

- `app_modules` — modules de chaque app avec statut

- `cotrain_modules` — état des modules CoTrain

- `cotrain_metrics` — métriques remontées par CoTrain

- `cotrain_alerts` — alertes actives CoTrain

## Liaison avec les apps pilotées

- CactusCodex expose des endpoints **publics** : `/api/public/*`

  → Pollés toutes les 30 secondes par les apps clientes

  → Le middleware Next.js doit laisser passer ces routes sans redirect

- Variables d'environnement critiques :

  - `CACTUS_CODEX_INGEST_KEY` (Codex) = `CODEX_INGEST_KEY` (app cliente)

  - `COTRAIN_WEBHOOK_SECRET` (Codex) = `CODEX_WEBHOOK_SECRET` (app cliente)

## Sections du dashboard

- 🔧 **Gestion apps & modules** : statuts, maintenance granulaire

- 📊 **Analytics** : métriques temps réel par app

- 🚧 **Suivi chantiers** : avancement dev par app

- 📋 **Roadmap** : fonctionnalités planifiées

- 💬 **Remontées utilisateurs** : feedbacks triés par sévérité

- 🪵 **Logs** : journal horodaté

- 👤 **Gestion utilisateurs** : comptes admins

## Règles de développement

1. CactusCodex doit rester fonctionnel même si une app cliente est en panne

2. Ne jamais exposer de données sensibles dans `/api/public/*`

3. Toute nouvelle app suit le même pattern que CoTrain

4. Modifications schéma Supabase → toujours proposer le SQL, ne pas exécuter seul

5. Avant tout refactor large → Plan mode obligatoire

6. Chaque section respecte la charte visuelle sans exception

## Scalabilité

- Pas de logique hardcodée par app dans le core

- `apps` et `app_modules` sont le contrat générique

- Un nouveau site doit pouvoir se brancher avec un minimum de config

## Ce qu'on ne fait PAS

- Pas de simplification de l'auth double facteur

- Pas de CSS qui dévie de la charte `#1a4a2e` / `#4ade80`

- Pas de logique métier dans les composants React

- Pas de refactor non demandé hors de la tâche en cours

- Ne jamais bloquer `/api/public/*` dans le middleware
Cactus Codex
Connexion au centre de contrôle Cactus Codex.
 