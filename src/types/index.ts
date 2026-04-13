export interface CCUser {
  id: string
  email: string
  name: string
  password_hash: string
  role: 'SUPERADMIN' | 'ADMIN' | 'VIEWER'
  organisation: string | null
  last_login?: string | null
  created_at: string
}

export interface App {
  id: string
  name: string
  url: string
  env: 'production' | 'staging' | 'preview' | 'cloud'
  status: 'online' | 'maintenance' | 'offline'
  uptime: number | null
  maintenance_since: string | null
  maintenance_message: string | null
  maintenance_by: string | null
  app_key?: string | null
  control_note?: string | null
  public_login_message?: string | null
  public_home_message?: string | null
  login_notice_enabled?: boolean | null
  home_notice_enabled?: boolean | null
  reboot_required?: boolean | null
  last_restart_at?: string | null
  webhook_url?: string | null
  webhook_secret?: string | null
  ingest_key?: string | null
  created_at: string
}

export interface AppModule {
  id: string
  app_id: string
  module_key: string
  name: string
  path_prefix: string
  status: 'online' | 'maintenance' | 'offline'
  maintenance_message: string | null
  public_message: string | null
  reboot_required: boolean | null
  updated_at: string
}

export interface AppSignal {
  id: string
  app_id: string
  source: string
  signal_type: string
  severity: 'info' | 'warn' | 'error'
  title: string
  body: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface MaintenanceSchedule {
  id: string
  app_id: string
  app_name: string
  scheduled_at: string
  estimated_duration: string
  message: string
  created_by: string
  created_at: string
}

export interface RoadmapItem {
  id: string
  title: string
  description: string
  status: 'done' | 'active' | 'todo'
  progress: number
  tag: string
  version: string | null
  priority: 'high' | 'medium' | 'low'
  created_at: string
}

export interface ActivityLog {
  id: string
  timestamp: string
  level: 'ok' | 'info' | 'warn' | 'error'
  message: string
  user: string
}

export interface UserFeedback {
  id: string
  app_key: string
  user_email: string | null
  user_role: string | null
  message: string
  severity: 'info' | 'warn' | 'critical'
  status: 'nouveau' | 'en_cours' | 'résolu' | 'ignoré'
  admin_note: string | null
  created_at: string
  updated_at: string
}

export interface Chantier {
  id: string
  app_key: string
  titre: string
  description: string | null
  status: 'a_faire' | 'en_cours' | 'bloque' | 'termine'
  priority: 'high' | 'medium' | 'low'
  date_debut: string | null
  date_fin_prevue: string | null
  created_at: string
  updated_at: string
}

export interface Session {
  user: CCUser
  expires: string
}
