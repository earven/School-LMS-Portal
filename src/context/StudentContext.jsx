import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useSettings } from './SettingsContext.jsx';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, deleteDoc, where, writeBatch } from 'firebase/firestore';

const StudentContext = createContext(null);

export const StudentProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { settings, sessionAcademicYear } = useSettings();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const academicYear = sessionAcademicYear || settings?.academicYear || '';

  useEffect(() => {
    if (authLoading || !academicYear) return;
    if (!user || !user.role || user.role === 'pending') {
      setStudents([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const q = query(collection(db, 'students'), where('academicYear', '==', academicYear));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const studentsData = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
        setStudents(studentsData);
        setError(null);
        setLoading(false);
      }, 
      (err) => {
        console.error("Failed to fetch students:", err);
        setError("Failed to load students.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, academicYear]);

  const updateStudent = async (updatedStudent) => {
    try {
      const docId = `${academicYear}-${updatedStudent.id}`;
      const studentRef = doc(db, 'students', docId);
      await updateDoc(studentRef, updatedStudent);
      console.log('Student updated in Firestore:', docId);
    } catch (e) {
      console.error('Error updating student:', e);
      setError('Failed to update student.');
    }
  };

  const addStudent = async (newStudent) => {
    try {
      const docId = `${academicYear}-${newStudent.id}`;
      const studentRef = doc(db, 'students', docId);
      await setDoc(studentRef, { ...newStudent, docId, academicYear });
      console.log('Student added to Firestore:', docId);
    } catch (e) {
      console.error('Error adding student:', e);
      setError('Failed to add student.');
    }
  };

  const addBulkStudents = async (newStudents) => {
    try {
      const batches = [];
      for (let i = 0; i < newStudents.length; i += 500) {
        batches.push(newStudents.slice(i, i + 500));
      }

      for (const batchData of batches) {
        for (const student of batchData) {
          const docId = `${academicYear}-${student.id}`;
          const studentRef = doc(db, 'students', docId);
          await setDoc(studentRef, { ...student, docId, academicYear });
        }
      }
      console.log('Bulk students added to Firestore.');
    } catch (e) {
      console.error('Error adding bulk students:', e);
      setError('Failed to add bulk students.');
      throw e;
    }
  };

  const deleteStudent = async (id) => {
    try {
      const docId = `${academicYear}-${id}`;
      const studentRef = doc(db, 'students', docId);
      await deleteDoc(studentRef);
      console.log('Student deleted from Firestore:', docId);
    } catch (e) {
      console.error('Error deleting student:', e);
      setError('Failed to delete student.');
    }
  };

  const promoteStudents = async (studentIds, targetAcademicYear, targetGradeLevel, targetSectionId) => {
    try {
      const batch = writeBatch(db);
      
      for (const id of studentIds) {
        const currentStudent = students.find(s => s.id === id);
        if (!currentStudent) continue;

        const currentDocId = `${academicYear}-${id}`;
        const currentStudentRef = doc(db, 'students', currentDocId);

        const newDocId = `${targetAcademicYear}-${id}`;
        const newStudentRef = doc(db, 'students', newDocId);

        const historyRecord = {
          academicYear: academicYear,
          gradeLevel: currentStudent.gradeLevel || '',
          sectionId: currentStudent.sectionId || ''
        };

        const updatedHistory = [...(currentStudent.history || []), historyRecord];

        const newStudentData = {
          ...currentStudent,
          academicYear: targetAcademicYear,
          gradeLevel: targetGradeLevel,
          sectionId: targetSectionId || '',
          history: updatedHistory,
          docId: newDocId
        };

        batch.delete(currentStudentRef);
        batch.set(newStudentRef, newStudentData);
      }

      await batch.commit();
      console.log(`Promoted ${studentIds.length} students to ${targetAcademicYear}`);
    } catch (e) {
      console.error('Error promoting students:', e);
      setError('Failed to promote students.');
      throw e;
    }
  };

  return (
    <StudentContext.Provider value={{ students, loading, error, updateStudent, addStudent, addBulkStudents, deleteStudent, promoteStudents }}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudents = () => {
  const context = useContext(StudentContext);
  if (!context) throw new Error('useStudents must be used within a StudentProvider');
  return context;
};
