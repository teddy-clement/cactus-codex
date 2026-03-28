/**
 * Script de création du premier utilisateur SUPERADMIN
 * Usage : npx ts-node supabase/seed-admin.ts
 *
 * ⚠ Exécuter UNE SEULE FOIS après avoir configuré .env
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedAdmin() {
  const email    = 't.clement@cactus-codex.com'
  const password = 'tc8vyxA*'   // ← À changer en prod !
  const name     = 'Teddy CLEMENT.'

  console.log('🌵 Création du SUPERADMIN Cactus Codex...')

  const password_hash = await bcrypt.hash(password, 12)

  const { data, error } = await supabase
    .from('cc_users')
    .upsert({
      email,
      name,
      password_hash,
      role:         'SUPERADMIN',
      organisation: 'Cactus Codex',
    }, { onConflict: 'email' })
    .select('id, email, name, role')
    .single()

  if (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }

  console.log('✅ Utilisateur créé :')
  console.log('   Email :', data.email)
  console.log('   Rôle  :', data.role)
  console.log('   ID    :', data.id)
  console.log('')
  console.log('⚠  Changez le mot de passe dans .env avant la mise en prod !')
}

seedAdmin()
