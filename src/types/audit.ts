/**
 * Audit Logger Contracts
 */

export type AuditCategory = 
  | 'AUTH' 
  | 'STUDENTS' 
  | 'PERSONNEL' 
  | 'SECTIONS' 
  | 'ATTENDANCE' 
  | 'SETTINGS' 
  | 'BACKUP_RESTORE' 
  | 'TEACHING_LOAD' 
  | 'SYSTEM'
  | string;

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditActor {
  uid?: string;
  id?: string;
  email?: string;
  displayName?: string;
  fullName?: string;
  role?: string;
}

export interface AuditLogEntry {
  id?: string;
  action: string;
  category: AuditCategory;
  details: string;
  severity: AuditSeverity;
  targetId?: string | null;
  metadata?: Record<string, any>;
  actorId: string;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  timestamp?: any;
}

export interface LogAuditParams {
  action: string;
  category?: AuditCategory;
  details?: string;
  severity?: AuditSeverity;
  targetId?: string | null;
  metadata?: Record<string, any>;
  actor?: AuditActor | null;
}
