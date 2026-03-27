# 🌵 CACTUS CODEX — Control Center

Panneau de gestion sécurisé pour les projets Cactus Codex.  
Gestion des apps, maintenance, analytiques, roadmap, utilisateurs et journaux.

---

## Stack technique

| Couche | Techno |
|--------|--------|
| Framework | Next.js 14 (App Router) |
| UI | React 18 + CSS Modules (JSX styled) |
| Auth | JWT (jose) + OTP 6 chiffres |
| BDD | Supabase (PostgreSQL) |
| Email | Resend |
| Déploiement | Vercel |
| Domaine | cactus-codex.com |

---

## Installation

### 1. Cloner / dézipper le projet

```bash
cd cactus-codex
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Renseigner dans `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

AUTH_SECRET=$(openssl rand -base64 32)

RESEND_API_KEY=re_xxxx
EMAIL_FROM=t.clement@cactus-codex.com

NEXT_PUBLIC_APP_URL=https://cactus-codex.com
```

### 3. Créer la base de données Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor**
3. Copier-coller le contenu de `supabase/schema.sql`
4. Exécuter

### 4. Créer le premier utilisateur SUPERADMIN

```bash
npx ts-node supabase/seed-admin.ts
```

> ⚠ Changer le mot de passe dans `supabase/seed-admin.ts` avant d'exécuter.

### 5. Lancer en développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Déploiement Vercel

### 1. Pousser sur GitHub

```bash
git init
git add .
git commit -m "feat: initial cactus-codex setup"
git remote add origin https://github.com/ton-user/cactus-codex.git
git push -u origin main
```

### 2. Importer sur Vercel

1. [vercel.com/new](https://vercel.com/new) → Importer le repo
2. Framework preset : **Next.js**
3. Ajouter toutes les variables d'environnement

### 3. Configurer le domaine

1. Vercel → Settings → Domains
2. Ajouter `cactus-codex.com`
3. Chez ton registrar DNS :
   - `A` → `76.76.21.21`
   - `CNAME www` → `cactus-codex.com`

---

## Configurer Resend (email OTP)

1. Créer un compte sur [resend.com](https://resend.com)
2. Ajouter et vérifier le domaine `cactus-codex.com`
3. Créer une clé API → copier dans `RESEND_API_KEY`
4. L'email `t.clement@cactus-codex.com` sera l'expéditeur

---

## Structure du projet

```
cactus-codex/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts      ← POST login (vérif password + envoi OTP)
│   │   │   │   ├── otp/route.ts        ← POST vérification OTP + création session
│   │   │   │   ├── logout/route.ts     ← POST déconnexion
│   │   │   │   └── resend-otp/route.ts ← POST renvoi code
│   │   │   ├── apps/route.ts           ← GET liste apps / PATCH statut maintenance
│   │   │   ├── users/route.ts          ← GET/POST utilisateurs
│   │   │   ├── logs/route.ts           ← GET journaux
│   │   │   └── roadmap/route.ts        ← GET/PATCH items roadmap
│   │   ├── login/page.tsx              ← Écran connexion
│   │   ├── otp/page.tsx                ← Écran code OTP
│   │   ├── dashboard/
│   │   │   ├── layout.tsx              ← Layout avec sidebar + topbar
│   │   │   ├── page.tsx                ← Tableau de bord
│   │   │   ├── apps/page.tsx           ← Gestion des applications
│   │   │   ├── maintenance/page.tsx    ← Mode maintenance
│   │   │   ├── analytics/page.tsx      ← Analytiques & métriques
│   │   │   ├── roadmap/page.tsx        ← Roadmap & backlog
│   │   │   ├── users/page.tsx          ← Utilisateurs (SUPERADMIN)
│   │   │   └── logs/page.tsx           ← Journal d'activité
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   └── ui/
│   │       ├── CactusLogo.tsx          ← SVG logo chat+cactus+CC
│   │       └── Toast.tsx
│   ├── lib/
│   │   ├── auth.ts                     ← JWT sessions + OTP utils
│   │   ├── email.ts                    ← Envoi email Resend
│   │   ├── logger.ts                   ← Journal d'activité
│   │   └── supabase/
│   │       ├── client.ts               ← Client browser
│   │       └── server.ts               ← Client serveur + service role
│   ├── middleware.ts                   ← Protection routes
│   └── types/index.ts                  ← Types TypeScript
├── supabase/
│   ├── schema.sql                      ← Schéma PostgreSQL complet
│   └── seed-admin.ts                   ← Script création SUPERADMIN
├── .env.example
├── .gitignore
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Sécurité

| Mécanisme | Détail |
|-----------|--------|
| Double facteur | Mot de passe + OTP 6 chiffres par email |
| OTP | Valable 10 min, usage unique, stocké en base |
| Sessions | JWT signé HS256, httpOnly cookie, 8h |
| Rate limiting | 5 tentatives / 15 min par IP |
| Protection routes | Middleware Next.js sur toutes les routes |
| Mots de passe | bcrypt, coût 12 |
| RLS Supabase | Row Level Security activé, accès via service role uniquement |
| HTTPS | Forcé par Vercel en production |

---

## Rôles utilisateurs

| Rôle | Dashboard | Apps | Maintenance | Analytiques | Roadmap | Utilisateurs | Journaux |
|------|-----------|------|-------------|-------------|---------|--------------|---------|
| SUPERADMIN | ✅ | ✅ RW | ✅ RW | ✅ | ✅ RW | ✅ RW | ✅ |
| ADMIN | ✅ | ✅ RW | ✅ RW | ✅ | ✅ R | ❌ | ✅ |
| VIEWER | ✅ | ✅ R | ✅ R | ✅ | ✅ R | ❌ | ✅ R |

---

## Commandes utiles

```bash
npm run dev      # Développement local
npm run build    # Build production
npm run start    # Serveur production
npm run lint     # Lint TypeScript
```

---

## Ajouter un nouvel utilisateur

Via l'API (SUPERADMIN uniquement) :

```bash
curl -X POST https://cactus-codex.com/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nouveau@sncf.fr",
    "name": "Prénom Nom",
    "role": "VIEWER",
    "organisation": "TNC PAZ",
    "password": "MotDePasseSecurise123!"
  }'
```

---

Fait avec 🌵 par Cactus Codex
