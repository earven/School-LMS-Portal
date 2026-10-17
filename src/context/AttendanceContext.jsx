import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import {
  enqueueOfflineAttendance,
  flushOfflineQueue,
  subscribeOfflineQueue,
  getPendingQueueCount
} from '../utils/offlineQueue';

const AttendanceContext = createContext(null);

export const AttendanceProvider = ({ children }) => {
  const [pendingSyncCount, setPendingSyncCount] = useState(getPendingQueueCount());
  const [isSyncing, setIsSyncing] = useState(false);

  // Subscribe to offline queue changes
  useEffect(() => {
    const unsub = subscribeOfflineQueue((count) => {
      setPendingSyncCount(count);
    });
    return () => unsub();
  }, []);

  // Fetch attendance for a specific section and month (YYYY-MM)
  const fetchAttendance = async (sectionId, yearMonth) => {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('sectionId', '==', sectionId),
        where('yearMonth', '==', yearMonth)
      );
      const snapshot = await getDocs(q);
      return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (e) {
      console.error("Failed to fetch attendance:", e);
      return { success: false, error: e.message, data: [] };
    }
  };

  // Fetch attendance for the whole school for a specific month (for Admin SF4)
  const fetchSchoolAttendance = async (yearMonth) => {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('yearMonth', '==', yearMonth)
      );
      const snapshot = await getDocs(q);
      return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (e) {
      console.error("Failed to fetch school attendance:", e);
      return { success: false, error: e.message, data: [] };
    }
  };
  
  // Save or update daily attendance for a section
  const saveDailyAttendance = async (sectionId, dateStr, yearMonth, attendanceDataArray) => {
    // If offline, store locally in offline queue
    if (!navigator.onLine) {
      enqueueOfflineAttendance({
        sectionId,
        yearMonth,
        records: attendanceDataArray.map(d => ({ ...d, date: dateStr })),
        type: 'student'
      });
      return { success: true, offline: true };
    }

    try {
      const batch = writeBatch(db);
      
      const q = query(
        collection(db, 'attendance'),
        where('sectionId', '==', sectionId),
        where('date', '==', dateStr)
      );
      const snapshot = await getDocs(q);
      const existingRecords = {};
      snapshot.forEach(doc => {
        existingRecords[doc.data().studentId] = doc.id;
      });
      
      attendanceDataArray.forEach(data => {
        if (existingRecords[data.studentId]) {
          const docRef = doc(db, 'attendance', existingRecords[data.studentId]);
          batch.update(docRef, {
            status: data.status,
            remarks: data.remarks || '',
            updatedAt: serverTimestamp()
          });
        } else {
          const docRef = doc(collection(db, 'attendance'));
          batch.set(docRef, {
            sectionId,
            studentId: data.studentId,
            date: dateStr,
            yearMonth,
            status: data.status,
            remarks: data.remarks || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      });
      
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.warn("Network error saving attendance, queuing offline:", error);
      enqueueOfflineAttendance({
        sectionId,
        yearMonth,
        records: attendanceDataArray.map(d => ({ ...d, date: dateStr })),
        type: 'student'
      });
      return { success: true, offline: true, error: error.message };
    }
  };

  // Save or update multiple attendance records across different dates (for SF2 Grid)
  const saveBatchAttendance = useCallback(async (sectionId, yearMonth, attendanceDataArray) => {
    if (!navigator.onLine) {
      enqueueOfflineAttendance({
        sectionId,
        yearMonth,
        records: attendanceDataArray,
        type: 'student'
      });
      return { success: true, offline: true };
    }

    try {
      const batch = writeBatch(db);
      
      const q = query(
        collection(db, 'attendance'),
        where('sectionId', '==', sectionId),
        where('yearMonth', '==', yearMonth)
      );
      const snapshot = await getDocs(q);
      const existingRecords = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        existingRecords[`${data.studentId}_${data.date}`] = doc.id;
      });
      
      attendanceDataArray.forEach(data => {
        const key = `${data.studentId}_${data.date}`;
        if (existingRecords[key]) {
          const docRef = doc(db, 'attendance', existingRecords[key]);
          batch.update(docRef, {
            status: data.status,
            remarks: data.remarks || '',
            updatedAt: serverTimestamp()
          });
        } else {
          const docRef = doc(collection(db, 'attendance'));
          batch.set(docRef, {
            sectionId,
            studentId: data.studentId,
            date: data.date,
            yearMonth,
            status: data.status,
            remarks: data.remarks || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      });
      
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.warn("Network write failed, enqueuing offline:", error);
      enqueueOfflineAttendance({
        sectionId,
        yearMonth,
        records: attendanceDataArray,
        type: 'student'
      });
      return { success: true, offline: true, error: error.message };
    }
  }, []);

  // Fetch teacher/personnel attendance for a specific month (YYYY-MM)
  const fetchTeacherAttendance = async (yearMonth) => {
    try {
      const q = query(
        collection(db, 'teacher_attendance'),
        where('yearMonth', '==', yearMonth)
      );
      const snapshot = await getDocs(q);
      return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (e) {
      console.error("Failed to fetch teacher attendance:", e);
      return { success: false, error: e.message, data: [] };
    }
  };

  // Save or update teacher attendance in batch
  const saveTeacherAttendanceBatch = useCallback(async (yearMonth, attendanceDataArray) => {
    if (!navigator.onLine) {
      enqueueOfflineAttendance({
        yearMonth,
        records: attendanceDataArray,
        type: 'teacher'
      });
      return { success: true, offline: true };
    }

    try {
      const batch = writeBatch(db);
      
      const q = query(
        collection(db, 'teacher_attendance'),
        where('yearMonth', '==', yearMonth)
      );
      const snapshot = await getDocs(q);
      const existingRecords = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        existingRecords[`${data.teacherId}_${data.date}`] = doc.id;
      });
      
      attendanceDataArray.forEach(data => {
        const key = `${data.teacherId}_${data.date}`;
        if (existingRecords[key]) {
          const docRef = doc(db, 'teacher_attendance', existingRecords[key]);
          batch.update(docRef, {
            status: data.status,
            remarks: data.remarks || '',
            updatedAt: serverTimestamp()
          });
        } else {
          const docRef = doc(collection(db, 'teacher_attendance'));
          batch.set(docRef, {
            teacherId: data.teacherId,
            date: data.date,
            yearMonth,
            status: data.status,
            remarks: data.remarks || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      });
      
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.warn("Network error saving teacher attendance, queuing offline:", error);
      enqueueOfflineAttendance({
        yearMonth,
        records: attendanceDataArray,
        type: 'teacher'
      });
      return { success: true, offline: true, error: error.message };
    }
  }, []);

  // Background Sync trigger
  const syncOfflineQueue = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const result = await flushOfflineQueue({
        saveBatchAttendance,
        saveTeacherAttendanceBatch
      });
      if (result.syncedCount > 0) {
        console.log(`[OfflineQueue] Successfully synced ${result.syncedCount} queued attendance payloads.`);
      }
    } catch (err) {
      console.error('[OfflineQueue] Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, saveBatchAttendance, saveTeacherAttendanceBatch]);

  // Listen for online events to automatically flush
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineQueue();
    };

    window.addEventListener('online', handleOnline);
    // Also check on mount if online and queue > 0
    if (navigator.onLine && getPendingQueueCount() > 0) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncOfflineQueue]);

  const contextValue = useMemo(() => ({
    fetchAttendance, 
    fetchSchoolAttendance, 
    saveDailyAttendance, 
    saveBatchAttendance, 
    fetchTeacherAttendance, 
    saveTeacherAttendanceBatch,
    syncOfflineQueue,
    pendingSyncCount,
    isSyncing
  }), [syncOfflineQueue, pendingSyncCount, isSyncing]);

  return (
    <AttendanceContext.Provider value={contextValue}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => useContext(AttendanceContext);
