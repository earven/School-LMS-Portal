import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { adminAuth, db } from '../firebase';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth } from './AuthContext';
import { preparePersonnelForSave, normalizePersonnelRecord } from '../utils/personnelName';
import { logAuditEvent, AUDIT_CATEGORIES, AUDIT_SEVERITY } from '../utils/auditLogger';

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
  }, [user]);

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

      logAuditEvent({
        action: 'PERSONNEL_CONFIG_UPDATED',
        category: AUDIT_CATEGORIES.PERSONNEL,
        details: `Updated custom personnel profile fields configuration.`,
        severity: AUDIT_SEVERITY.INFO,
        actor: user
      });

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

      const added = newSections.filter(sId => !oldSections.includes(sId));
      const removed = oldSections.filter(sId => !newSections.includes(sId));

      for (const sId of added) {
        const secRef = doc(db, 'sections', sId);
        await updateDoc(secRef, { adviserId: updatedPerson.id });
      }

      for (const sId of removed) {
        const secRef = doc(db, 'sections', sId);
        await updateDoc(secRef, { adviserId: '' });
      }

      logAuditEvent({
        action: 'PERSONNEL_UPDATED',
        category: AUDIT_CATEGORIES.PERSONNEL,
        details: `Updated profile for faculty "${payload.lastName}, ${payload.firstName}" (ID: ${updatedPerson.id})`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: updatedPerson.id,
        actor: user
      });

      return { success: true };
    } catch (e) {
      console.error('Error updating personnel:', e);
      setError('Failed to update personnel.');
      return { success: false, error: e.message };
    }
  };

  const addPersonnel = async (newPerson) => {
    try {
      const { email, password, role = 'teacher', ...rest } = newPerson;
      const userCredential = await createUserWithEmailAndPassword(adminAuth, email, password);
      const newUserId = userCredential.user.uid;
      await signOut(adminAuth);

      const payload = preparePersonnelForSave({
        ...rest,
        email,
        role,
        id: newUserId,
        createdAt: new Date().toISOString()
      });

      const userDocRef = doc(db, 'users', newUserId);
      await setDoc(userDocRef, payload);

      if (newPerson.assignedSections && newPerson.assignedSections.length > 0) {
        for (const sId of newPerson.assignedSections) {
          const secRef = doc(db, 'sections', sId);
          await updateDoc(secRef, { adviserId: newUserId });
        }
      }

      logAuditEvent({
        action: 'PERSONNEL_CREATED',
        category: AUDIT_CATEGORIES.PERSONNEL,
        details: `Created new staff account "${payload.lastName}, ${payload.firstName}" (${payload.email}) with role [${role}]`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: newUserId,
        actor: user
      });

      return { success: true, id: newUserId };
    } catch (e) {
      console.error('Error adding personnel:', e);
      setError(e.message || 'Failed to create personnel account.');
      return { success: false, error: e.message };
    }
  };

  const deletePersonnel = async (id) => {
    try {
      const personToDelete = personnel.find(p => p.id === id);
      const userDocRef = doc(db, 'users', id);
      await deleteDoc(userDocRef);

      const qSec = query(collection(db, 'sections'));
      const secSnap = await getDocs(qSec);
      for (const sDoc of secSnap.docs) {
        if (sDoc.data().adviserId === id) {
          await updateDoc(doc(db, 'sections', sDoc.id), { adviserId: '' });
        }
      }

      logAuditEvent({
        action: 'PERSONNEL_DELETED',
        category: AUDIT_CATEGORIES.PERSONNEL,
        details: `Deleted personnel account for "${personToDelete?.lastName || ''}, ${personToDelete?.firstName || ''}" (ID: ${id})`,
        severity: AUDIT_SEVERITY.WARNING,
        targetId: id,
        actor: user
      });

      return { success: true };
    } catch (e) {
      console.error('Error deleting personnel:', e);
      setError('Failed to delete personnel.');
      return { success: false, error: e.message };
    }
  };

  // Add Training / INSET Record
  const addTrainingRecord = async (personnelId, trainingData) => {
    try {
      const person = personnel.find(p => p.id === personnelId);
      if (!person) throw new Error('Personnel not found');

      const userDocRef = doc(db, 'users', personnelId);
      const newTraining = {
        id: `tr-${Date.now()}`,
        title: trainingData.title || '',
        level: trainingData.level || 'School',
        hours: parseFloat(trainingData.hours) || 0,
        startDate: trainingData.startDate || '',
        endDate: trainingData.endDate || '',
        conductedBy: trainingData.conductedBy || 'DepEd',
        recordedAt: new Date().toISOString()
      };

      const existingTrainings = person.trainings || [];
      const updatedTrainings = [newTraining, ...existingTrainings];

      await updateDoc(userDocRef, { trainings: updatedTrainings });

      logAuditEvent({
        action: 'PERSONNEL_TRAINING_ADDED',
        category: AUDIT_CATEGORIES.PERSONNEL,
        details: `Logged training record "${newTraining.title}" (${newTraining.hours} hrs) for faculty ID: ${personnelId}`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: personnelId,
        actor: user
      });

      return { success: true, training: newTraining };
    } catch (e) {
      console.error('Error adding training record:', e);
      return { success: false, error: e.message };
    }
  };

  // Delete Training / INSET Record
  const deleteTrainingRecord = async (personnelId, trainingId) => {
    try {
      const person = personnel.find(p => p.id === personnelId);
      if (!person) throw new Error('Personnel not found');

      const userDocRef = doc(db, 'users', personnelId);
      const existingTrainings = person.trainings || [];
      const updatedTrainings = existingTrainings.filter(t => t.id !== trainingId);

      await updateDoc(userDocRef, { trainings: updatedTrainings });

      logAuditEvent({
        action: 'PERSONNEL_TRAINING_DELETED',
        category: AUDIT_CATEGORIES.PERSONNEL,
        details: `Removed training record ${trainingId} for faculty ID: ${personnelId}`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: personnelId,
        actor: user
      });

      return { success: true };
    } catch (e) {
      console.error('Error deleting training record:', e);
      return { success: false, error: e.message };
    }
  };

  // Batch Update Position
  const batchUpdatePosition = async (personnelIds, newPosition) => {
    try {
      const batch = writeBatch(db);
      for (const id of personnelIds) {
        const userRef = doc(db, 'users', id);
        batch.update(userRef, { position: newPosition });
      }
      await batch.commit();

      logAuditEvent({
        action: 'PERSONNEL_BULK_POSITION_UPDATED',
        category: AUDIT_CATEGORIES.PERSONNEL,
        details: `Updated position for ${personnelIds.length} staff to "${newPosition}"`,
        severity: AUDIT_SEVERITY.INFO,
        metadata: { count: personnelIds.length, newPosition },
        actor: user
      });

      return { success: true };
    } catch (e) {
      console.error('Error batch updating position:', e);
      return { success: false, error: e.message };
    }
  };

  const migratePersonnelCasing = async () => {
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const p of personnel) {
      try {
        const prepared = preparePersonnelForSave(p);
        const needsUpdate =
          prepared.lastName !== (p.lastName || '') ||
          prepared.firstName !== (p.firstName || '') ||
          prepared.middleName !== (p.middleName || '') ||
          prepared.nameExtension !== (p.nameExtension || '') ||
          prepared.position !== (p.position || '') ||
          prepared.employeeNumber !== (p.employeeNumber || '');

        if (!needsUpdate) {
          skipped++;
          continue;
        }

        const userDocRef = doc(db, 'users', p.id);
        await updateDoc(userDocRef, {
          lastName: prepared.lastName,
          firstName: prepared.firstName,
          middleName: prepared.middleName,
          nameExtension: prepared.nameExtension,
          position: prepared.position,
          employeeNumber: prepared.employeeNumber,
        });

        updated++;
      } catch (err) {
        errors.push(`${p.id} (${p.email || 'no email'}): ${err.message}`);
      }
    }

    logAuditEvent({
      action: 'PERSONNEL_CASING_MIGRATION',
      category: AUDIT_CATEGORIES.PERSONNEL,
      details: `Migrated casing for ${updated} records (${skipped} skipped).`,
      severity: AUDIT_SEVERITY.INFO,
      actor: user
    });

    return { updated, skipped, errors };
  };

  const contextValue = useMemo(() => ({
    personnel, 
    loading, 
    error, 
    customFieldsConfig, 
    saveCustomFieldsConfig,
    updatePersonnel, 
    addPersonnel, 
    deletePersonnel,
    addTrainingRecord,
    deleteTrainingRecord,
    batchUpdatePosition,
    migratePersonnelCasing
  }), [personnel, loading, error, customFieldsConfig, user]);

  return (
    <PersonnelContext.Provider value={contextValue}>
      {children}
    </PersonnelContext.Provider>
  );
};

export const usePersonnel = () => useContext(PersonnelContext);
