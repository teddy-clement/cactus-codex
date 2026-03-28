/**
 * Script de création du premier utilisateur SUPERADMIN
 * Usage : npx ts-node supabase/seed-admin.ts
 *
 * ⚠ Exécuter UNE SEULE FOIS après avoir configuré .env.local ou .env
 */

import path from 'node:path'
import { existsSync } from 'node:fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const envCandidates = ['.env.local', '.env']
for (const file of envCandidates) {
  const fullPath = path.resolve(process.cwd(), file)
  if (existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false })
  }
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.PROJECT_URL ||
  ''

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  ''

if (!supabaseUrl) {
  console.error('❌ Variable manquante : NEXT_PUBLIC_SUPABASE_URL')
  console.error('Ajoute-la dans .env.local ou .env puis relance le script.')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error('❌ Variable manquante : SUPABASE_SERVICE_ROLE_KEY')
  console.error('Ajoute-la dans .env.local ou .env puis relance le script.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function seedAdmin() {
  const email = 't.clement@cactus-codex.com'
  const password = 'CactusCodex2026!'
  const name = 'Teddy C.'

  console.log('🌵 Création du SUPERADMIN Cactus Codex...')
  console.log(`🔗 Supabase : ${supabaseUrl}`)

  const password_hash = await bcrypt.hash(password, 12)

  const { data, error } = await supabase
    .from('cc_users')
    .upsert(
      {
        email,
        name,
        password_hash,
        role: 'SUPERADMIN',
        organisation: 'Cactus Codex',
      },
      { onConflict: 'email' }
    )
    .select('id, email, name, role')
    .single()

  if (error) {
    console.error('❌ Erreur Supabase :', error.message)
    process.exit(1)
  }

  console.log('✅ Utilisateur créé / mis à jour :')
  console.log('   Email :', data.email)
  console.log('   Rôle  :', data.role)
  console.log('   ID    :', data.id)
  console.log('')
  console.log('⚠ Pense à changer le mot de passe par défaut après ton premier accès.')
}

seedAdmin().catch((error) => {
  console.error('❌ Erreur inattendue :', error)
  process.exit(1)
})
