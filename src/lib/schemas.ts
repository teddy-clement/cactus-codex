import { z } from 'zod'

// ── Broadcast : envoi d'un message vers une app cliente ──
// Note : expires_in_hours (number) est utilise par l'API actuelle
// (pas expires_at) — expires_at est calcule cote serveur.
export const BroadcastSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(100, 'Titre trop long (max 100)'),
  message: z.string().min(1, 'Message requis').max(500, 'Message trop long (max 500)'),
  niveau: z.enum(['faible', 'moyen', 'important']),
  expires_in_hours: z.number().int().min(1).max(72).optional().default(4),
  app_key: z.string().min(1).optional().default('cotrain'),
})

export type BroadcastInput = z.infer<typeof BroadcastSchema>

// ── Creation d'une nouvelle application ──
export const AppCreateSchema = z.object({
  name: z.string().min(2, 'Nom trop court').max(50, 'Nom trop long'),
  app_key: z.string().regex(/^[a-z0-9_-]+$/, 'app_key : lettres minuscules, chiffres, tirets, underscores'),
  url: z.string().url('URL invalide'),
  env: z.enum(['production', 'staging', 'preview', 'cloud']).optional().default('production'),
  webhook_url: z.string().url('webhook_url invalide').nullable().optional(),
  webhook_secret: z.string().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
})

export type AppCreateInput = z.infer<typeof AppCreateSchema>

// ── Signal ingest (POST public depuis une app cliente) ──
// Note : severity aligne sur le CHECK constraint de la table app_signals
// (info | warn | error). Le spec "warning" du cahier des charges ne correspond
// pas au schema DB — on garde 'warn'.
export const SignalIngestSchema = z.object({
  app_key: z.string().min(1, 'app_key requis'),
  source: z.string().optional(),
  signal_type: z.string().optional().default('event'),
  severity: z.enum(['info', 'warn', 'error']).optional().default('info'),
  title: z.string().min(1).max(200).optional().default('Signal'),
  body: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export type SignalIngestInput = z.infer<typeof SignalIngestSchema>

// ── Improvement (roadmap kanban par app) ──
export const ImprovementCreateSchema = z.object({
  app_key: z.string().min(1, 'app_key requis'),
  titre: z.string().min(1, 'Titre requis').max(120, 'Titre trop long'),
  description: z.string().max(2000).nullable().optional(),
  source: z.enum(['manual', 'terrain', 'cactus-os']).optional().default('manual'),
  statut: z.enum(['idee', 'planifie', 'en_cours', 'livre']).optional().default('idee'),
  priorite: z.number().int().min(1).max(5).optional().default(3),
})

export const ImprovementPatchSchema = z.object({
  id: z.string().min(1),
  titre: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  statut: z.enum(['idee', 'planifie', 'en_cours', 'livre']).optional(),
  priorite: z.number().int().min(1).max(5).optional(),
})

export type ImprovementCreateInput = z.infer<typeof ImprovementCreateSchema>
export type ImprovementPatchInput = z.infer<typeof ImprovementPatchSchema>

// ── CactusOS chat ──
export const CactusOSMessageSchema = z.object({
  message: z.string().min(1, 'Message vide').max(2000, 'Message trop long'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
})

export type CactusOSMessageInput = z.infer<typeof CactusOSMessageSchema>
