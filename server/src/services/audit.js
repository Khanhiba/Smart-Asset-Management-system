import { AuditLog } from '../models/AuditLog.js';

export function recordAudit({ action, entityType, entityId, actor, actorName, details = {} }) {
  return AuditLog.create({ action, entityType, entityId, actor, actorName, details });
}
