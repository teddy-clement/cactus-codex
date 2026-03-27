export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'VIEWER'

export interface CCUser {
  id: string
  email: string
  name: string
  role: UserRole
  organisation: string
  last_login: string | null
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
  tag: 'cotrain' | 'infra' | 'ux'
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

export interface Session {
  user: CCUser
  expires: string
}
