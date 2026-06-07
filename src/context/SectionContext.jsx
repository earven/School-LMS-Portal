// src/context/SectionContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useSettings } from './SettingsContext.jsx';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, deleteDoc, where, getDoc } from 'firebase/firestore';

const SectionContext = createContext(null);

export const SectionProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const academicYear = settings?.academicYear || '';

  useEffect(() => {
    if (authLoading || !academicYear) return;
    if (!user || !user.role || user.role === 'pending') {
      setSections([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const q = query(collection(db, 'sections'), where('academicYear', '==', academicYear));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const sectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSections(sectionsData);
        setError(null);
        setLoading(false);
      }, 
      (err) => {
        console.error("Failed to fetch sections:", err);
        setError("Failed to load sections.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, academicYear]);

  const addSectionToTeacher = async (teacherId, sectionId) => {
    if (!teacherId) return;
    try {
      const teacherRef = doc(db, 'users', teacherId);
      const teacherSnap = await getDoc(teacherRef);
      if (teacherSnap.exists()) {
        const data = teacherSnap.data();
        const assigned = data.assignedSections || [];
        if (!assigned.includes(sectionId)) {
          await updateDoc(teacherRef, {
            assignedSections: [...assigned, sectionId]
          });
        }
      }
    } catch (err) {
      console.error('Error adding section to teacher:', err);
    }
  };

  const removeSectionFromTeacher = async (teacherId, sectionId) => {
    if (!teacherId) return;
    try {
      const teacherRef = doc(db, 'users', teacherId);
      const teacherSnap = await getDoc(teacherRef);
      if (teacherSnap.exists()) {
        const data = teacherSnap.data();
        const assigned = data.assignedSections || [];
        if (assigned.includes(sectionId)) {
          await updateDoc(teacherRef, {
            assignedSections: assigned.filter(id => id !== sectionId)
          });
        }
      }
    } catch (err) {
      console.error('Error removing section from teacher:', err);
    }
  };

  const addSection = async (newSection) => {
    try {
      // Use setDoc with a custom ID (e.g., combining academicYear, gradeLevel and name)
      const sectionId = `${academicYear}-${newSection.gradeLevel}-${newSection.name}`;
      const sectionRef = doc(db, 'sections', sectionId);
      await setDoc(sectionRef, { ...newSection, id: sectionId, academicYear });
      console.log('Section added to Firestore:', sectionId);

      // Synchronize with teacher record
      if (newSection.adviserId) {
        await addSectionToTeacher(newSection.adviserId, sectionId);
      }
    } catch (e) {
      console.error('Error adding section:', e);
      setError('Failed to add section.');
    }
  };

  const updateSection = async (updatedSection) => {
    try {
      const oldSection = sections.find(s => s.id === updatedSection.id);
      const oldAdviserId = oldSection?.adviserId || '';
      const newAdviserId = updatedSection.adviserId || '';

      const sectionRef = doc(db, 'sections', updatedSection.id);
      await updateDoc(sectionRef, updatedSection);
      console.log('Section updated in Firestore:', updatedSection.id);

      // Synchronize with teacher records
      if (oldAdviserId !== newAdviserId) {
        if (oldAdviserId) {
          await removeSectionFromTeacher(oldAdviserId, updatedSection.id);
        }
        if (newAdviserId) {
          await addSectionToTeacher(newAdviserId, updatedSection.id);
        }
      }
    } catch (e) {
      console.error('Error updating section:', e);
      setError('Failed to update section.');
    }
  };

  const deleteSection = async (id) => {
    try {
      const oldSection = sections.find(s => s.id === id);
      const sectionRef = doc(db, 'sections', id);
      await deleteDoc(sectionRef);
      console.log('Section deleted from Firestore:', id);

      // Synchronize with teacher records
      if (oldSection?.adviserId) {
        await removeSectionFromTeacher(oldSection.adviserId, id);
      }
    } catch (e) {
      console.error('Error deleting section:', e);
      setError('Failed to delete section.');
    }
  };

  return (
    <SectionContext.Provider value={{ sections, loading, error, addSection, updateSection, deleteSection }}>
      {children}
    </SectionContext.Provider>
  );
};

export const useSections = () => {
  const context = useContext(SectionContext);
  if (!context) throw new Error('useSections must be used within a SectionProvider');
  return context;
};
