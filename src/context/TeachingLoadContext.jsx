import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

const TeachingLoadContext = createContext(null);

export const TeachingLoadProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { settings, sessionAcademicYear } = useSettings();
  const [loads, setLoads] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const academicYear = sessionAcademicYear || settings?.academicYear || '';

  useEffect(() => {
    if (authLoading || !user || !user.role || user.role === 'pending' || !academicYear) {
      setLoads([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const q = query(
      collection(db, 'teaching_loads'),
      where('academicYear', '==', academicYear)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLoads(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to fetch teaching loads:', err);
        setError('Failed to load teaching load records.');
        setLoading(false);
      }
    );

    const qBreaks = query(
      collection(db, 'teaching_breaks'),
      where('academicYear', '==', academicYear)
    );

    const unsubscribeBreaks = onSnapshot(
      qBreaks,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBreaks(data);
      },
      (err) => {
        console.error('Failed to fetch teaching breaks:', err);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeBreaks();
    };
  }, [user, authLoading, academicYear]);

  const visibleLoads = useMemo(() => {
    if (!user) return [];
    if (['admin', 'system_admin'].includes(user?.role)) return loads;
    return loads.filter((l) => l.teacherId === user.uid);
  }, [loads, user]);

  const addLoad = async (loadData) => {
    try {
      await addDoc(collection(db, 'teaching_loads'), {
        ...loadData,
        academicYear,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (e) {
      console.error('Error adding teaching load:', e);
      return { success: false, error: e.message };
    }
  };

  // Copy loads from a previous academic year to the current year.
  // If the user is admin, copies loads for all teachers; otherwise only for the current user.
  const copyLoads = async (sourceYear) => {
    if (!sourceYear) {
      return { success: false, error: 'Source year not specified' };
    }
    try {
      // Query source loads
      const sourceQuery = query(
        collection(db, 'teaching_loads'),
        where('academicYear', '==', sourceYear)
      );
      const snapshot = await getDocs(sourceQuery);
      const sourceLoads = snapshot.docs.map((doc) => doc.data());

      // Determine admin status
      const isAdminUser = ['admin', 'system_admin'].includes(user?.role);
      // Filter based on role
      const loadsToCopy = isAdminUser
        ? sourceLoads
        : sourceLoads.filter((l) => l.teacherId === user?.uid);

      // Add each load for the current year
      const promises = loadsToCopy.map((load) =>
        addDoc(collection(db, 'teaching_loads'), {
          ...load,
          academicYear,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
      await Promise.all(promises);
      return { success: true };
    } catch (e) {
      console.error('Error copying teaching loads:', e);
      return { success: false, error: e.message };
    }
  };

  const batchAddLoads = async (loadsArray) => {
    try {
      const batch = writeBatch(db);
      loadsArray.forEach(load => {
        const docRef = doc(collection(db, 'teaching_loads'));
        batch.set(docRef, {
          ...load,
          academicYear,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      return { success: true };
    } catch (e) {
      console.error('Error batch adding loads:', e);
      return { success: false, error: e.message };
    }
  };

  const updateLoad = async (loadId, loadData) => {
    try {
      await updateDoc(doc(db, 'teaching_loads', loadId), {
        ...loadData,
        academicYear,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (e) {
      console.error('Error updating teaching load:', e);
      return { success: false, error: e.message };
    }
  };

  const deleteLoad = async (loadId) => {
    try {
      await deleteDoc(doc(db, 'teaching_loads', loadId));
      return { success: true };
    } catch (e) {
      console.error('Error deleting teaching load:', e);
      return { success: false, error: e.message };
    }
  };

  const addBreak = async (breakData) => {
    try {
      await addDoc(collection(db, 'teaching_breaks'), {
        ...breakData,
        academicYear,
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (e) {
      console.error('Error adding break:', e);
      return { success: false, error: e.message };
    }
  };

  const deleteBreak = async (breakId) => {
    try {
      await deleteDoc(doc(db, 'teaching_breaks', breakId));
      return { success: true };
    } catch (e) {
      console.error('Error deleting break:', e);
      return { success: false, error: e.message };
    }
  };

  return (
    <TeachingLoadContext.Provider
      value={{
        loads: visibleLoads,
        allLoads: loads,
        breaks,
        loading,
        error,
        academicYear,
        addLoad,
        batchAddLoads,
        updateLoad,
        deleteLoad,
        copyLoads,
        addBreak,
        deleteBreak,
      }}
    >
      {children}
    </TeachingLoadContext.Provider>
  );
};

export const useTeachingLoad = () => {
  const context = useContext(TeachingLoadContext);
  if (!context) {
    throw new Error('useTeachingLoad must be used within a TeachingLoadProvider');
  }
  return context;
};
