import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPendingOfflineQueue,
  getPendingQueueCount,
  enqueueOfflineAttendance,
  removeQueueItems,
  clearOfflineQueue,
  flushOfflineQueue
} from './offlineQueue';

describe('offlineQueue Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should start with an empty queue', () => {
    expect(getPendingOfflineQueue()).toEqual([]);
    expect(getPendingQueueCount()).toBe(0);
  });

  it('should enqueue attendance records and update count', () => {
    const item = {
      sectionId: 'sec-1',
      yearMonth: '2026-08',
      records: [{ studentId: '101', status: 'P' }],
      type: 'student'
    };

    const count = enqueueOfflineAttendance(item);
    expect(count).toBe(1);
    expect(getPendingQueueCount()).toBe(1);

    const queue = getPendingOfflineQueue();
    expect(queue[0].sectionId).toBe('sec-1');
    expect(queue[0].records).toHaveLength(1);
    expect(queue[0].id).toBeDefined();
  });

  it('should remove specific synced items from queue', () => {
    enqueueOfflineAttendance({ sectionId: 'sec-1', yearMonth: '2026-08', records: [] });
    enqueueOfflineAttendance({ sectionId: 'sec-2', yearMonth: '2026-08', records: [] });
    expect(getPendingQueueCount()).toBe(2);

    const queue = getPendingOfflineQueue();
    const firstId = queue[0].id;
    removeQueueItems([firstId]);

    expect(getPendingQueueCount()).toBe(1);
    expect(getPendingOfflineQueue()[0].sectionId).toBe('sec-2');
  });

  it('should clear the entire queue', () => {
    enqueueOfflineAttendance({ sectionId: 'sec-1', yearMonth: '2026-08', records: [] });
    enqueueOfflineAttendance({ sectionId: 'sec-2', yearMonth: '2026-08', records: [] });
    clearOfflineQueue();
    expect(getPendingQueueCount()).toBe(0);
  });

  it('should flush pending queue with mock handlers', async () => {
    enqueueOfflineAttendance({ sectionId: 'sec-1', yearMonth: '2026-08', records: [{ studentId: '1' }] });
    enqueueOfflineAttendance({ type: 'teacher', yearMonth: '2026-08', records: [{ teacherId: 't1' }] });

    const mockSaveBatchAttendance = vi.fn().mockResolvedValue({ success: true });
    const mockSaveTeacherBatch = vi.fn().mockResolvedValue({ success: true });

    const result = await flushOfflineQueue({
      saveBatchAttendance: mockSaveBatchAttendance,
      saveTeacherAttendanceBatch: mockSaveTeacherBatch
    });

    expect(result.syncedCount).toBe(2);
    expect(result.errorCount).toBe(0);
    expect(getPendingQueueCount()).toBe(0);
    expect(mockSaveBatchAttendance).toHaveBeenCalledTimes(1);
    expect(mockSaveTeacherBatch).toHaveBeenCalledTimes(1);
  });
});
