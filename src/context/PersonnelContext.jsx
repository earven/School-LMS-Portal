import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminAuth, db } from '../firebase';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth } from './AuthContext';
import { preparePersonnelForSave } from '../utils/personnelName';

const PersonnelContext = createContext(null);

export const PersonnelProvider = ({ children }) => {
  const { user } = useAuth(); // Get current authenticated user
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customFieldsConfig, setCustomFieldsConfig] = useState([
    { id: 'contactNumber', label: 'Contact Number', type: 'text', required: false },
    { id: 'birthDate', label: 'Birth Date', type: 'date', required: false },
    { id: 'dateHired', label: 'Date Hired', type: 'date', required: false },
    { id: 'highestDegree', label: 'Highest Degree', type: 'select', options: ["Bachelor's Degree", "Master's Degree", "Doctorate"], required: false }
  ]);

  useEffect(() => {
    // Only fetch personnel if a user is authenticated and authorized
    if (!user || !user.role || user.role === 'pending') {
      setPersonnel([]);
      setError(null);
      setLoading(false);
      return;
    }

    setError(null);
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const personnelData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPersonnel(personnelData);
        setError(null);
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

  // Fetch custom fields schema from Firestore settings/teacherFields
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'settings', 'teacherFields');
    const unsubscribe = onSnapshot(docRef,
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().fields) {
          setCustomFieldsConfig(docSnap.data().fields);
        }
      },
      (err) => {
        console.error("Failed to fetch custom teacher fields config:", err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const saveCustomFieldsConfig = async (newFields) => {
    try {
      const docRef = doc(db, 'settings', 'teacherFields');
      await setDoc(docRef, { fields: newFields });
      console.log('Saved custom fields config to Firestore');
      return { success: true };
    } catch (e) {
      console.error('Error saving custom fields config:', e);
      setError('Failed to save custom fields config.');
      return { success: false, error: e.message };
    }
  };

  const updatePersonnel = async (updatedPerson) => {
    try {
      const payload = preparePersonnelForSave(updatedPerson);
      const personnelRef = doc(db, 'users', updatedPerson.id);
      await updateDoc(personnelRef, payload);
      console.log('Personnel updated in Firestore:', updatedPerson.id);

      // Synchronize sections
      const oldPerson = personnel.find(p => p.id === updatedPerson.id);
      const oldSections = oldPerson?.assignedSections || [];
      const newSections = updatedPerson.assignedSections || [];

      const added = newSections.filter(s => !oldSections.includes(s));
      const removed = oldSections.filter(s => !newSections.includes(s));

      const displayName = `${updatedPerson.lastName}, ${updatedPerson.firstName}${updatedPerson.nameExtension ? ' ' + updatedPerson.nameExtension : ''}`;

      // Handle added sections
      for (const sectionId of added) {
        const sectionRef = doc(db, 'sections', sectionId);
        await updateDoc(sectionRef, {
          adviserId: updatedPerson.id,
          adviserName: displayName
        });

        // If another teacher previously advised this section, remove it from their assignedSections
        const previousAdviser = personnel.find(p => p.id !== updatedPerson.id && (p.assignedSections || []).includes(sectionId));
        if (previousAdviser) {
          const updatedPrevSections = (previousAdviser.assignedSections || []).filter(s => s !== sectionId);
          await updateDoc(doc(db, 'users', previousAdviser.id), {
            assignedSections: updatedPrevSections
          });
        }
      }

      // Handle removed sections
      for (const sectionId of removed) {
        const sectionRef = doc(db, 'sections', sectionId);
        await updateDoc(sectionRef, {
          adviserId: '',
          adviserName: ''
        });
      }
    } catch (e) {
      console.error('Error updating personnel:', e);
      setError('Failed to update personnel.');
    }
  };

  const addPersonnel = async (newPersonData, password) => {
    try {
      // 1. Create the user in Firebase Auth using the secondary instance
      const userCredential = await createUserWithEmailAndPassword(adminAuth, newPersonData.email, password);
      const newUser = userCredential.user;
      
      // 2. Prepare the Firestore document with the new UID
      const prepared = preparePersonnelForSave(newPersonData);
      const personnelDoc = {
        ...prepared,
        id: newUser.uid,
        createdAt: new Date().toISOString()
      };
      // Remove password from Firestore data
      delete personnelDoc.password;

      // 3. Add the personnel data to Firestore
      const personnelRef = doc(db, 'users', newUser.uid);
      await setDoc(personnelRef, personnelDoc);
      
      // 4. Sign out from the secondary instance to keep it clean
      await signOut(adminAuth);
      
      console.log('Personnel added to Auth and Firestore:', newUser.uid);
      return { success: true };
    } catch (e) {
      console.error('Error adding personnel:', e);
      setError(e.message);
      return { success: false, error: e.message };
    }
  };

  const deletePersonnel = async (id) => {
    try {
      // Find all sections advised by this teacher and clear them
      const advisedSections = personnel.find(p => p.id === id)?.assignedSections || [];
      for (const sectionId of advisedSections) {
        await updateDoc(doc(db, 'sections', sectionId), {
          adviserId: '',
          adviserName: ''
        });
      }

      // NOTE: This only deletes the Firestore document.
      // The Firebase Auth account will persist. In production,
      // use a Cloud Function with admin SDK to also delete the Auth account:
      //   admin.auth().deleteUser(id)
      const personnelRef = doc(db, 'users', id);
      await deleteDoc(personnelRef);
      console.log('Personnel deleted from Firestore:', id);
    } catch (e) {
      console.error('Error deleting personnel:', e);
      setError('Failed to delete personnel.');
    }
  };

  return (
    <PersonnelContext.Provider value={{ 
      personnel, 
      loading, 
      error, 
      customFieldsConfig, 
      saveCustomFieldsConfig, 
      updatePersonnel, 
      addPersonnel, 
      deletePersonnel 
    }}>
      {children}
    </PersonnelContext.Provider>
  );
};

export const usePersonnel = () => {
  const context = useContext(PersonnelContext);
  if (!context) throw new Error('usePersonnel must be used within a PersonnelProvider');
  return context;
};
