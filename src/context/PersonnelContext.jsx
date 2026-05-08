import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDocs, onSnapshot, query, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext'; // Import useAuth to get current user's UID

const PersonnelContext = createContext(null);

export const PersonnelProvider = ({ children }) => {
  const { user } = useAuth(); // Get current authenticated user
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch personnel if a user is authenticated
    if (!user) {
      setPersonnel([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const personnelData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPersonnel(personnelData);
        setLoading(false);
      }, 
      (err) => {
        console.error("Failed to fetch personnel:", err);
        setError("Failed to load personnel.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]); // Re-run effect when user changes

  const updatePersonnel = async (updatedPerson) => {
    try {
      const personnelRef = doc(db, 'users', updatedPerson.id);
      await updateDoc(personnelRef, updatedPerson);
      console.log('Personnel updated in Firestore:', updatedPerson.id);
    } catch (e) {
      console.error('Error updating personnel:', e);
      setError('Failed to update personnel.');
    }
  };

  const addPersonnel = async (newPerson) => {
    try {
      // For adding new personnel, we assume an ID (UID) is provided, likely from Firebase Auth creation
      const personnelRef = doc(db, 'users', newPerson.id);
      await setDoc(personnelRef, newPerson);
      console.log('Personnel added to Firestore:', newPerson.id);
    } catch (e) {
      console.error('Error adding personnel:', e);
      setError('Failed to add personnel.');
    }
  };

  const deletePersonnel = async (id) => {
    try {
      const personnelRef = doc(db, 'users', id);
      await deleteDoc(personnelRef);
      console.log('Personnel deleted from Firestore:', id);
    } catch (e) {
      console.error('Error deleting personnel:', e);
      setError('Failed to delete personnel.');
    }
  };

  if (loading) {
    return <div>Loading personnel...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <PersonnelContext.Provider value={{ personnel, loading, error, updatePersonnel, addPersonnel, deletePersonnel }}>
      {children}
    </PersonnelContext.Provider>
  );
};

export const usePersonnel = () => {
  const context = useContext(PersonnelContext);
  if (!context) throw new Error('usePersonnel must be used within a PersonnelProvider');
  return context;
};
