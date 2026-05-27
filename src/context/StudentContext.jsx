import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { db } from '../firebase';
import { collection, doc, getDocs, onSnapshot, query, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const StudentContext = createContext(null);

export const StudentProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'students'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(studentsData);
        setLoading(false);
      }, 
      (err) => {
        console.error("Failed to fetch students:", err);
        setError("Failed to load students.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  const updateStudent = async (updatedStudent) => {
    try {
      const studentRef = doc(db, 'students', updatedStudent.id);
      await updateDoc(studentRef, updatedStudent);
      console.log('Student updated in Firestore:', updatedStudent.id);
    } catch (e) {
      console.error('Error updating student:', e);
      setError('Failed to update student.');
    }
  };

  const addStudent = async (newStudent) => {
    try {
      // Use setDoc with a custom ID if available, otherwise addDoc
      const studentRef = doc(db, 'students', newStudent.id);
      await setDoc(studentRef, newStudent);
      console.log('Student added to Firestore:', newStudent.id);
    } catch (e) {
      console.error('Error adding student:', e);
      setError('Failed to add student.');
    }
  };

  const addBulkStudents = async (newStudents) => {
    try {
      // Use a batch for better performance and atomicity
      // Firestore batch limit is 500 operations
      const batches = [];
      for (let i = 0; i < newStudents.length; i += 500) {
        batches.push(newStudents.slice(i, i + 500));
      }

      for (const batchData of batches) {
        for (const student of batchData) {
          const studentRef = doc(db, 'students', student.id);
          await setDoc(studentRef, student);
        }
      }
      console.log('Bulk students added to Firestore.');
    } catch (e) {
      console.error('Error adding bulk students:', e);
      setError('Failed to add bulk students.');
      throw e; // Rethrow to let the UI handle it
    }
  };

  const deleteStudent = async (id) => {
    try {
      const studentRef = doc(db, 'students', id);
      await deleteDoc(studentRef);
      console.log('Student deleted from Firestore:', id);
    } catch (e) {
      console.error('Error deleting student:', e);
      setError('Failed to delete student.');
    }
  };

  return (
    <StudentContext.Provider value={{ students, loading, error, updateStudent, addStudent, addBulkStudents, deleteStudent }}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudents = () => {
  const context = useContext(StudentContext);
  if (!context) throw new Error('useStudents must be used within a StudentProvider');
  return context;
};
