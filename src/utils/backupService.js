import { db, auth } from '../firebase';
import { collection, getDocs, doc, writeBatch, query, where } from 'firebase/firestore';
import { logAuditEvent, AUDIT_CATEGORIES, AUDIT_SEVERITY } from './auditLogger';

export const SUPPORTED_BACKUP_COLLECTIONS = [
  'settings',
  'sections',
  'students',
  'users',
  'attendance',
  'teaching_loads',
  'teaching_breaks',
  'inventory',
  'master_inventory',
  'enrolment_students',
  'learning_resources',
  'memos',
  'submissions',
  'submission_responses',
  'events'
];

/**
 * Exports all relevant Firestore collections to a comprehensive JSON snapshot file.
 * 
 * @param {Object} options
 * @param {string} [options.academicYear] - Specific academic year to filter (or null for all)
 * @param {Object} [options.schoolInfo] - Basic school metadata ({ name, id })
 * @param {Object} [options.actor] - User who triggered the export
 * @returns {Promise<{ success: boolean, filename: string, recordCounts: Object }>}
 */
export const exportSchoolSnapshot = async ({ academicYear = null, schoolInfo = {}, actor = null } = {}) => {
  try {
    const backupData = {};
    const recordCounts = {};

    for (const colName of SUPPORTED_BACKUP_COLLECTIONS) {
      try {
        const colRef = collection(db, colName);
        let snapshot;

        // If academicYear is specified and applicable to the collection
        if (academicYear && ['students', 'attendance', 'teaching_loads', 'teaching_breaks'].includes(colName)) {
          const q = query(colRef, where('academicYear', '==', academicYear));
          snapshot = await getDocs(q);
        } else {
          snapshot = await getDocs(colRef);
        }

        const items = [];
        snapshot.forEach(docSnap => {
          items.push({
            _docId: docSnap.id,
            ...docSnap.data()
          });
        });

        backupData[colName] = items;
        recordCounts[colName] = items.length;
      } catch (err) {
        console.warn(`[BackupService] Warning: Could not fetch collection "${colName}":`, err.message);
        backupData[colName] = [];
        recordCounts[colName] = 0;
      }
    }

    const exportMeta = {
      schemaVersion: '1.0',
      system: 'School LMS Portal',
      exportDate: new Date().toISOString(),
      academicYear: academicYear || 'all',
      school: {
        name: schoolInfo.name || schoolInfo.schoolName || 'School',
        id: schoolInfo.id || schoolInfo.schoolId || 'N/A'
      },
      exportedBy: {
        uid: actor?.uid || auth.currentUser?.uid || 'unknown',
        name: actor?.displayName || auth.currentUser?.displayName || 'Administrator',
        email: actor?.email || auth.currentUser?.email || 'N/A',
        role: actor?.role || 'admin'
      },
      recordCounts,
      data: backupData
    };

    // Serialize JSON
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportMeta, null, 2))}`;
    
    // Create sanitized filename
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sanitizedSchool = (schoolInfo.name || 'School').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `LMS_Backup_${sanitizedSchool}_${dateStr}.json`;

    // Trigger browser download
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    // Log the backup action
    await logAuditEvent({
      action: 'BACKUP_EXPORTED',
      category: AUDIT_CATEGORIES.BACKUP_RESTORE,
      details: `Full school backup exported (${Object.values(recordCounts).reduce((a, b) => a + b, 0)} total records).`,
      severity: AUDIT_SEVERITY.INFO,
      metadata: { recordCounts, academicYear: academicYear || 'all', filename },
      actor
    });

    return {
      success: true,
      filename,
      recordCounts
    };
  } catch (error) {
    console.error('[BackupService] Export failed:', error);
    throw new Error(`Backup export failed: ${error.message}`);
  }
};

/**
 * Validates a parsed or stringified backup payload.
 * 
 * @param {Object|string} fileContent - Parsed JSON object or raw JSON string
 * @returns {{ valid: boolean, error?: string, metadata?: Object, recordCounts?: Object, data?: Object }}
 */
export const validateBackupFile = (fileContent) => {
  try {
    const parsed = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Invalid file content: Expected a valid JSON object.' };
    }

    if (!parsed.schemaVersion) {
      return { valid: false, error: 'Missing "schemaVersion" field. This does not appear to be a valid LMS Portal backup.' };
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      return { valid: false, error: 'Missing "data" collection payload in backup file.' };
    }

    const availableCollections = Object.keys(parsed.data).filter(col => Array.isArray(parsed.data[col]));
    if (availableCollections.length === 0) {
      return { valid: false, error: 'Backup file contains no recognizable data collections.' };
    }

    const recordCounts = {};
    let totalRecords = 0;
    availableCollections.forEach(col => {
      recordCounts[col] = parsed.data[col].length;
      totalRecords += parsed.data[col].length;
    });

    return {
      valid: true,
      metadata: {
        schemaVersion: parsed.schemaVersion,
        exportDate: parsed.exportDate,
        exportedBy: parsed.exportedBy,
        school: parsed.school,
        academicYear: parsed.academicYear,
        totalRecords
      },
      recordCounts,
      data: parsed.data
    };
  } catch (err) {
    return { valid: false, error: `JSON Parse error: ${err.message}` };
  }
};

/**
 * Restores collections from a validated backup payload into Firestore.
 * 
 * @param {Object} backupData - The `data` property containing collections
 * @param {Object} options
 * @param {Array<string>} [options.selectedCollections] - Subset of collections to restore
 * @param {string} [options.academicYear] - Academic year context
 * @param {Function} [onProgress] - Callback: ({ current, total, percentage, collectionName }) => void
 * @param {Object} [options.actor] - User who triggered the restore
 * @returns {Promise<{ success: boolean, restoredCounts: Object }>}
 */
export const restoreSchoolSnapshot = async (
  backupData,
  { selectedCollections = null, academicYear = null, actor = null } = {},
  onProgress = null
) => {
  try {
    const collectionsToRestore = selectedCollections && selectedCollections.length > 0
      ? selectedCollections
      : Object.keys(backupData);

    let totalDocsToRestore = 0;
    collectionsToRestore.forEach(colName => {
      if (Array.isArray(backupData[colName])) {
        totalDocsToRestore += backupData[colName].length;
      }
    });

    if (totalDocsToRestore === 0) {
      return { success: true, restoredCounts: {} };
    }

    let processedDocs = 0;
    const restoredCounts = {};

    for (const colName of collectionsToRestore) {
      const items = backupData[colName];
      if (!Array.isArray(items) || items.length === 0) {
        restoredCounts[colName] = 0;
        continue;
      }

      // Chunk writes into batches of 400 (Firestore limit is 500)
      const BATCH_SIZE = 400;
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const chunk = items.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        for (const item of chunk) {
          const docId = item._docId || item.id || item.docId || doc(collection(db, colName)).id;
          
          // Remove internal _docId before saving
          const dataToSave = { ...item };
          delete dataToSave._docId;

          const docRef = doc(db, colName, String(docId));
          batch.set(docRef, dataToSave, { merge: true });
        }

        await batch.commit();

        processedDocs += chunk.length;
        if (onProgress) {
          onProgress({
            current: processedDocs,
            total: totalDocsToRestore,
            percentage: Math.round((processedDocs / totalDocsToRestore) * 100),
            collectionName: colName
          });
        }
      }

      restoredCounts[colName] = items.length;
    }

    // Record high-priority audit event
    await logAuditEvent({
      action: 'DATA_RESTORED',
      category: AUDIT_CATEGORIES.BACKUP_RESTORE,
      details: `Restored ${processedDocs} documents across ${collectionsToRestore.length} collections.`,
      severity: AUDIT_SEVERITY.CRITICAL,
      metadata: { restoredCounts, totalDocs: processedDocs },
      actor
    });

    return {
      success: true,
      restoredCounts
    };
  } catch (error) {
    console.error('[BackupService] Restore failed:', error);
    throw new Error(`Data restoration failed: ${error.message}`);
  }
};

/**
 * Scans the database for relational anomalies (orphaned students, invalid advisers, duplicate LRNs).
 * 
 * @param {Object} [options]
 * @param {Array<Object>} [options.students] - Current in-memory students
 * @param {Array<Object>} [options.sections] - Current in-memory sections
 * @param {Array<Object>} [options.personnel] - Current in-memory personnel/users
 * @returns {{ healthy: boolean, issues: Array<Object>, summary: Object }}
 */
export const scanDataIntegrity = async ({ students = null, sections = null, personnel = null } = {}) => {
  try {
    let studentList = students;
    let sectionList = sections;
    let userList = personnel;

    // If not provided in memory, query Firestore
    if (!studentList) {
      const snap = await getDocs(collection(db, 'students'));
      studentList = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    }

    if (!sectionList) {
      const snap = await getDocs(collection(db, 'sections'));
      sectionList = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    }

    if (!userList) {
      const snap = await getDocs(collection(db, 'users'));
      userList = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    }

    const sectionMap = new Map(sectionList.map(s => [s.id || s.docId, s]));
    const userMap = new Map(userList.map(u => [u.uid || u.docId || u.id, u]));

    const issues = [];

    // 1. Check for orphaned students (assigned to non-existent section)
    studentList.forEach(student => {
      if (student.sectionId && !sectionMap.has(student.sectionId)) {
        issues.push({
          id: `orphan-student-${student.id || student.docId}`,
          type: 'ORPHANED_STUDENT',
          severity: 'warning',
          title: `Student linked to non-existent Section`,
          description: `Student "${student.lastName}, ${student.firstName}" (LRN: ${student.lrn || student.id}) references Section ID "${student.sectionId}" which does not exist in the database.`,
          entityType: 'student',
          entityId: student.id || student.docId,
          fixAction: 'CLEAR_SECTION'
        });
      }
    });

    // 2. Check for sections with invalid or missing adviser links
    sectionList.forEach(sec => {
      if (sec.adviserId && !userMap.has(sec.adviserId)) {
        issues.push({
          id: `invalid-adviser-${sec.id || sec.docId}`,
          type: 'INVALID_ADVISER',
          severity: 'warning',
          title: `Section references non-existent Adviser`,
          description: `Section "${sec.name || sec.sectionName}" (Grade ${sec.gradeLevel}) references Adviser ID "${sec.adviserId}" who is not in the personnel directory.`,
          entityType: 'section',
          entityId: sec.id || sec.docId,
          fixAction: 'CLEAR_ADVISER'
        });
      }
    });

    // 3. Check for duplicate LRNs within the same academic year
    const lrnMap = new Map();
    studentList.forEach(student => {
      const lrn = student.lrn || student.id;
      const ay = student.academicYear || 'default';
      const key = `${ay}-${lrn}`;

      if (lrn && lrnMap.has(key)) {
        issues.push({
          id: `duplicate-lrn-${student.id || student.docId}`,
          type: 'DUPLICATE_LRN',
          severity: 'critical',
          title: `Duplicate LRN detected`,
          description: `LRN "${lrn}" is assigned to multiple student records in academic year ${ay}: "${student.lastName}, ${student.firstName}" and "${lrnMap.get(key).lastName}, ${lrnMap.get(key).firstName}".`,
          entityType: 'student',
          entityId: student.id || student.docId,
          fixAction: 'MANUAL_REVIEW'
        });
      } else if (lrn) {
        lrnMap.set(key, student);
      }
    });

    const summary = {
      totalStudentsScanned: studentList.length,
      totalSectionsScanned: sectionList.length,
      totalPersonnelScanned: userList.length,
      totalIssuesFound: issues.length,
      criticalCount: issues.filter(i => i.severity === 'critical').length,
      warningCount: issues.filter(i => i.severity === 'warning').length
    };

    return {
      healthy: issues.length === 0,
      issues,
      summary
    };
  } catch (err) {
    console.error('[BackupService] Integrity scan error:', err);
    throw new Error(`Data integrity scan failed: ${err.message}`);
  }
};
