import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, where, getDocs } from 'firebase/firestore';

/**
 * Log Categories
 */
export const AUDIT_CATEGORIES = {
  AUTH: 'AUTH',
  STUDENTS: 'STUDENTS',
  PERSONNEL: 'PERSONNEL',
  SECTIONS: 'SECTIONS',
  ATTENDANCE: 'ATTENDANCE',
  SETTINGS: 'SETTINGS',
  BACKUP_RESTORE: 'BACKUP_RESTORE',
  TEACHING_LOAD: 'TEACHING_LOAD',
  SYSTEM: 'SYSTEM'
};

/**
 * Log Severity Levels
 */
export const AUDIT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

/**
 * Logs an administrative or system event to Firestore.
 * 
 * @param {Object} params
 * @param {string} params.action - Specific action code (e.g. 'STUDENT_CREATED', 'ROLE_CHANGED')
 * @param {string} params.category - Category from AUDIT_CATEGORIES
 * @param {string} params.details - Human-readable description of the event
 * @param {'info'|'warning'|'critical'} [params.severity='info'] - Severity level
 * @param {string} [params.targetId] - ID of affected entity (e.g. studentId, sectionId)
 * @param {Object} [params.metadata] - Key-value metadata or state diffs
 * @param {Object} [params.actor] - Optional explicit actor object ({ uid, email, displayName, role })
 */
export const logAuditEvent = async ({
  action,
  category = AUDIT_CATEGORIES.SYSTEM,
  details = '',
  severity = AUDIT_SEVERITY.INFO,
  targetId = null,
  metadata = {},
  actor = null
}) => {
  try {
    const currentUser = auth.currentUser;
    const actorId = actor?.uid || currentUser?.uid || 'system';
    const actorEmail = actor?.email || currentUser?.email || 'system@internal';
    const actorName = actor?.displayName || currentUser?.displayName || actorEmail.split('@')[0];
    const actorRole = actor?.role || 'authorized_user';

    const logEntry = {
      action: String(action),
      category: String(category),
      details: String(details),
      severity: String(severity),
      targetId: targetId ? String(targetId) : null,
      metadata: metadata || {},
      actorId,
      actorEmail,
      actorName,
      actorRole,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'NodeJS/Agent',
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'audit_logs'), logEntry);
    return { success: true, id: docRef.id };
  } catch (error) {
    // Non-blocking fallback: never break the main app workflow if logging encounters an issue
    console.warn('[AuditLogger] Could not record audit log event:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribes to real-time audit logs with optional filtering.
 * 
 * @param {Function} callback - Callback returning array of log objects
 * @param {Object} [options] - Filter options
 * @param {number} [options.limitCount=100] - Max logs to fetch
 * @param {string} [options.category] - Optional category filter
 * @returns {Function} Unsubscribe function
 */
export const subscribeAuditLogs = (callback, options = {}) => {
  const { limitCount = 100, category = null } = options;

  try {
    const logsRef = collection(db, 'audit_logs');
    let q;

    if (category && category !== 'ALL') {
      q = query(
        logsRef,
        where('category', '==', category),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        logsRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }

    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate 
          ? doc.data().timestamp.toDate() 
          : new Date(doc.data().clientTimestamp || Date.now())
      }));
      callback(logs);
    }, (error) => {
      console.error('[AuditLogger] Error listening to audit logs:', error);
      callback([]);
    });
  } catch (err) {
    console.error('[AuditLogger] Setup subscription error:', err);
    callback([]);
    return () => {};
  }
};

/**
 * Exports an array of audit logs to CSV string and initiates download.
 * 
 * @param {Array<Object>} logs
 * @param {string} [filename]
 */
export const exportAuditLogsToCSV = (logs, filename = null) => {
  if (!logs || logs.length === 0) return false;

  const headers = ['Timestamp', 'Severity', 'Category', 'Action', 'Details', 'Actor Name', 'Actor Email', 'Actor Role', 'Target ID'];
  
  const csvRows = [
    headers.join(','),
    ...logs.map(log => {
      const ts = log.timestamp instanceof Date 
        ? log.timestamp.toISOString() 
        : (log.clientTimestamp || '');
      const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

      return [
        escape(ts),
        escape(log.severity),
        escape(log.category),
        escape(log.action),
        escape(log.details),
        escape(log.actorName),
        escape(log.actorEmail),
        escape(log.actorRole),
        escape(log.targetId)
      ].join(',');
    })
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `School_LMS_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};
