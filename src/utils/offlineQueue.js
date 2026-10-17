/**
 * offlineQueue.js
 * Manages local queuing of attendance and classroom records when offline,
 * and handles background synchronization when network connectivity resumes.
 */

const STORAGE_KEY = 'school_lms_offline_attendance_queue';

/**
 * Gets all pending offline queue items from local storage.
 * @returns {Array<Object>}
 */
export const getPendingOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[OfflineQueue] Failed to read offline queue:', err);
    return [];
  }
};

/**
 * Returns the total number of pending offline operations.
 * @returns {number}
 */
export const getPendingQueueCount = () => {
  const queue = getPendingOfflineQueue();
  return queue.length;
};

/**
 * Enqueues an attendance operation for later sync.
 * @param {Object} item - { sectionId, yearMonth, records, type: 'student'|'teacher', timestamp }
 * @returns {number} New queue length
 */
export const enqueueOfflineAttendance = (item) => {
  try {
    const queue = getPendingOfflineQueue();
    const payload = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...item
    };
    queue.push(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    notifyQueueChange();
    return queue.length;
  } catch (err) {
    console.error('[OfflineQueue] Failed to enqueue offline item:', err);
    return 0;
  }
};

/**
 * Removes synced items from the offline queue.
 * @param {Array<string>} syncedIds 
 */
export const removeQueueItems = (syncedIds) => {
  try {
    const queue = getPendingOfflineQueue();
    const remaining = queue.filter(item => !syncedIds.includes(item.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    notifyQueueChange();
  } catch (err) {
    console.error('[OfflineQueue] Failed to remove items:', err);
  }
};

/**
 * Clears the entire offline queue.
 */
export const clearOfflineQueue = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyQueueChange();
  } catch (err) {
    console.error('[OfflineQueue] Failed to clear offline queue:', err);
  }
};

// Simple event listener for queue changes
const listeners = new Set();

export const subscribeOfflineQueue = (callback) => {
  listeners.add(callback);
  // initial call
  callback(getPendingQueueCount());
  return () => {
    listeners.delete(callback);
  };
};

const notifyQueueChange = () => {
  const count = getPendingQueueCount();
  listeners.forEach(cb => {
    try {
      cb(count);
    } catch {
      // ignore
    }
  });
};

/**
 * Flushes all pending attendance items to Firestore.
 * @param {Object} handlers - { saveBatchAttendance, saveTeacherAttendanceBatch }
 * @returns {Promise<{ syncedCount: number, errorCount: number }>}
 */
export const flushOfflineQueue = async ({ saveBatchAttendance, saveTeacherAttendanceBatch }) => {
  const queue = getPendingOfflineQueue();
  if (queue.length === 0) return { syncedCount: 0, errorCount: 0 };

  const syncedIds = [];
  let errorCount = 0;

  for (const item of queue) {
    try {
      if (item.type === 'teacher' && saveTeacherAttendanceBatch) {
        const res = await saveTeacherAttendanceBatch(item.yearMonth, item.records);
        if (res?.success) {
          syncedIds.push(item.id);
        } else {
          errorCount++;
        }
      } else if (saveBatchAttendance) {
        const res = await saveBatchAttendance(item.sectionId, item.yearMonth, item.records);
        if (res?.success) {
          syncedIds.push(item.id);
        } else {
          errorCount++;
        }
      }
    } catch (err) {
      console.error('[OfflineQueue] Error syncing item:', item.id, err);
      errorCount++;
    }
  }

  if (syncedIds.length > 0) {
    removeQueueItems(syncedIds);
  }

  return {
    syncedCount: syncedIds.length,
    errorCount
  };
};
