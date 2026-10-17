// src/context/SectionContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useSettings } from './SettingsContext.jsx';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, deleteDoc, where, getDoc } from 'firebase/firestore';
import { logAuditEvent, AUDIT_CATEGORIES, AUDIT_SEVERITY } from '../utils/auditLogger';

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
      const sectionId = `${academicYear}-${newSection.gradeLevel}-${newSection.name}`;
      const sectionRef = doc(db, 'sections', sectionId);
      await setDoc(sectionRef, { ...newSection, id: sectionId, academicYear });
      console.log('Section added to Firestore:', sectionId);

      if (newSection.adviserId) {
        await addSectionToTeacher(newSection.adviserId, sectionId);
      }

      logAuditEvent({
        action: 'SECTION_CREATED',
        category: AUDIT_CATEGORIES.SECTIONS,
        details: `Created Section "${newSection.name}" (Grade ${newSection.gradeLevel}) for AY ${academicYear}`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: sectionId,
        actor: user
      });
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

      if (oldAdviserId !== newAdviserId) {
        if (oldAdviserId) {
          await removeSectionFromTeacher(oldAdviserId, updatedSection.id);
        }
        if (newAdviserId) {
          await addSectionToTeacher(newAdviserId, updatedSection.id);
        }
      }

      logAuditEvent({
        action: 'SECTION_UPDATED',
        category: AUDIT_CATEGORIES.SECTIONS,
        details: `Updated Section "${updatedSection.name}" (Grade ${updatedSection.gradeLevel})`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: updatedSection.id,
        actor: user
      });
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

      if (oldSection?.adviserId) {
        await removeSectionFromTeacher(oldSection.adviserId, id);
      }

      logAuditEvent({
        action: 'SECTION_DELETED',
        category: AUDIT_CATEGORIES.SECTIONS,
        details: `Deleted Section "${oldSection?.name || id}" from AY ${academicYear}`,
        severity: AUDIT_SEVERITY.WARNING,
        targetId: id,
        actor: user
      });
    } catch (e) {
      console.error('Error deleting section:', e);
      setError('Failed to delete section.');
    }
  };

  const contextValue = useMemo(() => ({
    sections,
    loading,
    error,
    addSection,
    updateSection,
    deleteSection
  }), [sections, loading, error, academicYear, user]);

  return (
    <SectionContext.Provider value={contextValue}>
      {children}
    </SectionContext.Provider>
  );
};

export const useSections = () => {
  const context = useContext(SectionContext);
  if (!context) throw new Error('useSections must be used within a SectionProvider');
  return context;
};
