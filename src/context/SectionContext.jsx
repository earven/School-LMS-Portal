// src/context/SectionContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const SectionContext = createContext(null);

export const SectionProvider = ({ children }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'sections'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const sectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSections(sectionsData);
        setLoading(false);
      }, 
      (err) => {
        console.error("Failed to fetch sections:", err);
        setError("Failed to load sections.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addSection = async (newSection) => {
    try {
      // Use setDoc with a custom ID (e.g., combining gradeLevel and name)
      const sectionId = `${newSection.gradeLevel}-${newSection.name}`;
      const sectionRef = doc(db, 'sections', sectionId);
      await setDoc(sectionRef, { ...newSection, id: sectionId });
      console.log('Section added to Firestore:', sectionId);
    } catch (e) {
      console.error('Error adding section:', e);
      setError('Failed to add section.');
    }
  };

  const updateSection = async (updatedSection) => {
    try {
      const sectionRef = doc(db, 'sections', updatedSection.id);
      await updateDoc(sectionRef, updatedSection);
      console.log('Section updated in Firestore:', updatedSection.id);
    } catch (e) {
      console.error('Error updating section:', e);
      setError('Failed to update section.');
    }
  };

  const deleteSection = async (id) => {
    try {
      const sectionRef = doc(db, 'sections', id);
      await deleteDoc(sectionRef);
      console.log('Section deleted from Firestore:', id);
    } catch (e) {
      console.error('Error deleting section:', e);
      setError('Failed to delete section.');
    }
  };

  if (loading) {
    return <div>Loading sections...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

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
