import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const BUCKET = 'app-logos'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Requête multipart invalide.' }, { status: 400 })
  }

  const appKey = formData.get('app_key')
  const file = formData.get('file')

  if (typeof appKey !== 'string' || !appKey.trim()) {
    return NextResponse.json({ error: 'app_key requis.' }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier requis.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Type de fichier invalide. Attendu : PNG, JPEG ou WebP.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 2 Mo).' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Vérifier que l'app existe
  const { data: app } = await supabase.from('apps').select('id, name').eq('app_key', appKey).maybeSingle()
  if (!app) return NextResponse.json({ error: 'Application introuvable.' }, { status: 404 })

  // Construire le nom de fichier — toujours le même par app_key (overwrite)
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const validExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'png'
  const filename = `${appKey}-${Date.now()}.${validExt}`

  // Upload vers Storage
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, arrayBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,
    })
  if (uploadError) {
    return NextResponse.json({ error: `Upload échoué : ${uploadError.message}` }, { status: 500 })
  }

  // Récupérer l'URL publique
  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  const url = publicUrl?.publicUrl
  if (!url) return NextResponse.json({ error: 'URL publique introuvable.' }, { status: 500 })

  // Update apps.logo_url
  const { error: updateError } = await supabase.from('apps').update({ logo_url: url }).eq('app_key', appKey)
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await log('info', `Logo mis à jour pour "${app.name}" (${appKey})`, session.user.name)
  return NextResponse.json({ ok: true, logo_url: url })
}
