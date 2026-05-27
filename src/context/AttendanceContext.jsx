import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

const AttendanceContext = createContext(null);

export const AttendanceProvider = ({ children }) => {
  const { user } = useAuth();
  
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
    // attendanceDataArray: [{studentId, status, remarks}]
    try {
      const batch = writeBatch(db);
      
      // Get existing records for this date and section to update them instead of duplicating
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
            yearMonth, // For easy monthly queries
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
      console.error("Error saving attendance:", error);
      return { success: false, error: error.message };
    }
  };

  // Save or update multiple attendance records across different dates (for SF2 Grid)
  const saveBatchAttendance = async (sectionId, yearMonth, attendanceDataArray) => {
    // attendanceDataArray: [{studentId, date, status, remarks}]
    try {
      const batch = writeBatch(db);
      
      // Get all existing records for this month and section
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
      console.error("Error batch saving attendance:", error);
      return { success: false, error: error.message };
    }
  };

  return (
    <AttendanceContext.Provider value={{ fetchAttendance, fetchSchoolAttendance, saveDailyAttendance, saveBatchAttendance }}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => useContext(AttendanceContext);
