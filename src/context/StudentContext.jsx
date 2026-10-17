import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useSettings } from './SettingsContext.jsx';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { logAuditEvent, AUDIT_CATEGORIES, AUDIT_SEVERITY } from '../utils/auditLogger';

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

      logAuditEvent({
        action: 'STUDENT_UPDATED',
        category: AUDIT_CATEGORIES.STUDENTS,
        details: `Updated student record for "${updatedStudent.lastName}, ${updatedStudent.firstName}" (LRN: ${updatedStudent.lrn || updatedStudent.id})`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: updatedStudent.id,
        actor: user
      });
      return { success: true };
    } catch (e) {
      console.error('Error updating student:', e);
      setError('Failed to update student.');
      return { success: false, error: e.message };
    }
  };

  const addStudent = async (newStudent) => {
    try {
      const docId = `${academicYear}-${newStudent.id}`;
      const studentRef = doc(db, 'students', docId);
      await setDoc(studentRef, { ...newStudent, docId, academicYear });
      console.log('Student added to Firestore:', docId);

      logAuditEvent({
        action: 'STUDENT_CREATED',
        category: AUDIT_CATEGORIES.STUDENTS,
        details: `Enrolled new student "${newStudent.lastName}, ${newStudent.firstName}" (LRN: ${newStudent.lrn || newStudent.id}) in AY ${academicYear}`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: newStudent.id,
        actor: user
      });
      return { success: true };
    } catch (e) {
      console.error('Error adding student:', e);
      setError('Failed to add student.');
      return { success: false, error: e.message };
    }
  };

  const addBulkStudents = async (newStudents) => {
    try {
      const batches = [];
      for (let i = 0; i < newStudents.length; i += 400) {
        batches.push(newStudents.slice(i, i + 400));
      }

      for (const batchData of batches) {
        const batch = writeBatch(db);
        for (const student of batchData) {
          const docId = `${academicYear}-${student.id}`;
          const studentRef = doc(db, 'students', docId);
          batch.set(studentRef, { ...student, docId, academicYear });
        }
        await batch.commit();
      }
      console.log('Bulk students added to Firestore.');

      logAuditEvent({
        action: 'STUDENTS_BULK_IMPORTED',
        category: AUDIT_CATEGORIES.STUDENTS,
        details: `Imported ${newStudents.length} students in bulk for AY ${academicYear}`,
        severity: AUDIT_SEVERITY.INFO,
        metadata: { count: newStudents.length, academicYear },
        actor: user
      });
      return { success: true, count: newStudents.length };
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

      logAuditEvent({
        action: 'STUDENT_DELETED',
        category: AUDIT_CATEGORIES.STUDENTS,
        details: `Deleted student record (ID/LRN: ${id}) from AY ${academicYear}`,
        severity: AUDIT_SEVERITY.WARNING,
        targetId: id,
        actor: user
      });
      return { success: true };
    } catch (e) {
      console.error('Error deleting student:', e);
      setError('Failed to delete student.');
      return { success: false, error: e.message };
    }
  };

  // Bulk Re-assignment of Section & Grade Level
  const bulkUpdateSection = async (studentIds, targetSectionId, targetGradeLevel) => {
    try {
      const batch = writeBatch(db);
      for (const id of studentIds) {
        const docId = `${academicYear}-${id}`;
        const studentRef = doc(db, 'students', docId);
        const updates = { sectionId: targetSectionId };
        if (targetGradeLevel) updates.gradeLevel = targetGradeLevel;
        batch.update(studentRef, updates);
      }
      await batch.commit();

      logAuditEvent({
        action: 'STUDENTS_BULK_REASSIGNED',
        category: AUDIT_CATEGORIES.STUDENTS,
        details: `Reassigned ${studentIds.length} learners to Section ID "${targetSectionId}" (${targetGradeLevel || 'same grade'})`,
        severity: AUDIT_SEVERITY.INFO,
        metadata: { studentCount: studentIds.length, targetSectionId, targetGradeLevel },
        actor: user
      });
      return { success: true };
    } catch (e) {
      console.error('Error bulk updating section:', e);
      setError('Failed to reassign learners in bulk.');
      throw e;
    }
  };

  // Bulk Status Update (e.g. Active, Transferred Out, Dropped, Graduated)
  const bulkUpdateStatus = async (studentIds, newStatus) => {
    try {
      const batch = writeBatch(db);
      for (const id of studentIds) {
        const docId = `${academicYear}-${id}`;
        const studentRef = doc(db, 'students', docId);
        batch.update(studentRef, { status: newStatus });
      }
      await batch.commit();

      logAuditEvent({
        action: 'STUDENTS_BULK_STATUS_CHANGED',
        category: AUDIT_CATEGORIES.STUDENTS,
        details: `Changed status of ${studentIds.length} learners to "${newStatus}"`,
        severity: AUDIT_SEVERITY.INFO,
        metadata: { studentCount: studentIds.length, newStatus },
        actor: user
      });
      return { success: true };
    } catch (e) {
      console.error('Error bulk updating status:', e);
      setError('Failed to update learner status in bulk.');
      throw e;
    }
  };

  // Bulk Delete
  const bulkDeleteStudents = async (studentIds) => {
    try {
      const batch = writeBatch(db);
      for (const id of studentIds) {
        const docId = `${academicYear}-${id}`;
        const studentRef = doc(db, 'students', docId);
        batch.delete(studentRef);
      }
      await batch.commit();

      logAuditEvent({
        action: 'STUDENTS_BULK_DELETED',
        category: AUDIT_CATEGORIES.STUDENTS,
        details: `Bulk deleted ${studentIds.length} learner records in AY ${academicYear}`,
        severity: AUDIT_SEVERITY.WARNING,
        metadata: { studentCount: studentIds.length, studentIds },
        actor: user
      });
      return { success: true };
    } catch (e) {
      console.error('Error bulk deleting students:', e);
      setError('Failed to delete learners in bulk.');
      throw e;
    }
  };

  // Add Guidance & Anecdotal Note
  const addAnecdotalNote = async (studentId, noteData) => {
    try {
      const currentStudent = students.find(s => s.id === studentId);
      if (!currentStudent) throw new Error('Student not found');

      const docId = `${academicYear}-${studentId}`;
      const studentRef = doc(db, 'students', docId);

      const newNote = {
        id: `note-${Date.now()}`,
        date: noteData.date || new Date().toISOString().split('T')[0],
        category: noteData.category || 'Behavioral / Guidance Concern',
        notes: noteData.notes || '',
        actionTaken: noteData.actionTaken || '',
        recordedBy: user?.displayName || user?.email || 'Faculty',
        recordedAt: new Date().toISOString()
      };

      const existingNotes = currentStudent.anecdotalNotes || [];
      const updatedNotes = [newNote, ...existingNotes];

      await updateDoc(studentRef, { anecdotalNotes: updatedNotes });

      logAuditEvent({
        action: 'STUDENT_ANECDOTAL_NOTE_ADDED',
        category: AUDIT_CATEGORIES.STUDENTS,
        details: `Recorded anecdotal note [${newNote.category}] for student LRN: ${studentId}`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: studentId,
        actor: user
      });

      return { success: true, note: newNote };
    } catch (e) {
      console.error('Error adding anecdotal note:', e);
      return { success: false, error: e.message };
    }
  };

  // Delete Guidance & Anecdotal Note
  const deleteAnecdotalNote = async (studentId, noteId) => {
    try {
      const currentStudent = students.find(s => s.id === studentId);
      if (!currentStudent) throw new Error('Student not found');

      const docId = `${academicYear}-${studentId}`;
      const studentRef = doc(db, 'students', docId);

      const existingNotes = currentStudent.anecdotalNotes || [];
      const updatedNotes = existingNotes.filter(n => n.id !== noteId);

      await updateDoc(studentRef, { anecdotalNotes: updatedNotes });

      logAuditEvent({
        action: 'STUDENT_ANECDOTAL_NOTE_DELETED',
        category: AUDIT_CATEGORIES.STUDENTS,
        details: `Deleted anecdotal note ID ${noteId} for student LRN: ${studentId}`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: studentId,
        actor: user
      });

      return { success: true };
    } catch (e) {
      console.error('Error deleting anecdotal note:', e);
      return { success: false, error: e.message };
    }
  };

  // Batch Promotion & EOSY Status Rollover
  const promoteStudents = async (promotionsList, targetAcademicYear, fallbackGradeLevel, fallbackSectionId) => {
    try {
      // promotionsList can be array of IDs or array of { studentId, status, targetGradeLevel, targetSectionId }
      const batch = writeBatch(db);
      
      for (const item of promotionsList) {
        const studentId = typeof item === 'object' ? item.studentId : item;
        const status = typeof item === 'object' ? item.status : 'Promoted';
        const targetGradeLevel = (typeof item === 'object' && item.targetGradeLevel) ? item.targetGradeLevel : fallbackGradeLevel;
        const targetSectionId = (typeof item === 'object' && item.targetSectionId) ? item.targetSectionId : (fallbackSectionId || '');

        const currentStudent = students.find(s => s.id === studentId);
        if (!currentStudent) continue;

        const currentDocId = `${academicYear}-${studentId}`;
        const currentStudentRef = doc(db, 'students', currentDocId);

        const newDocId = `${targetAcademicYear}-${studentId}`;
        const newStudentRef = doc(db, 'students', newDocId);

        const historyRecord = {
          academicYear: academicYear,
          gradeLevel: currentStudent.gradeLevel || '',
          sectionId: currentStudent.sectionId || '',
          eosyStatus: status,
          promotedAt: new Date().toISOString()
        };

        // DO 15, s. 2026 §6.2 — Summer Remedial Class (SRC) recomputation.
        // If the student is tagged 'For SRC' and has remedialMarks encoded on
        // their record (shape: { [subjectKey]: rcmScore }), compute:
        //   RFG = round((FinalGrade + RemediationMark) / 2)
        // The encoded RCM per subject must be saved to the student doc as
        // `remedialMarks` BEFORE running the batch promotion.
        let newGrades = { ...(currentStudent.grades || {}) };
        if (status === 'For SRC' && currentStudent.remedialMarks) {
          Object.keys(currentStudent.remedialMarks).forEach(subject => {
            const fg = currentStudent.grades?.[subject]?.finalGrade;
            const rcm = currentStudent.remedialMarks[subject];
            if (typeof fg === 'number' && typeof rcm === 'number') {
              newGrades[subject] = {
                ...(newGrades[subject] || {}),
                finalGrade: Math.round((fg + rcm) / 2),
                rfg: Math.round((fg + rcm) / 2),
                rcm,
              };
            }
          });
        }

        const updatedHistory = [...(currentStudent.history || []), historyRecord];

        const newStudentData = {
          ...currentStudent,
          academicYear: targetAcademicYear,
          gradeLevel: targetGradeLevel,
          sectionId: targetSectionId || '',
          // 'For SRC' students become 'Active' once promoted after remediation
          status: ['Promoted', 'For SRC'].includes(status) ? 'Active' : (status === 'Retained' ? 'Active' : status),
          eosyStatus: status,
          history: updatedHistory,
          grades: newGrades,
          docId: newDocId
        };

        // Create new record in target academic year
        batch.set(newStudentRef, newStudentData);
        // Update current record's EOSY status
        batch.update(currentStudentRef, { eosyStatus: status });
      }

      await batch.commit();

      logAuditEvent({
        action: 'STUDENTS_BATCH_PROMOTED',
        category: AUDIT_CATEGORIES.STUDENTS,
        details: `Processed EOSY promotion / rollover for ${promotionsList.length} learners from AY ${academicYear} to AY ${targetAcademicYear}`,
        severity: AUDIT_SEVERITY.INFO,
        metadata: { count: promotionsList.length, sourceAY: academicYear, targetAY: targetAcademicYear },
        actor: user
      });

      return { success: true, count: promotionsList.length };
    } catch (e) {
      console.error('Error promoting students:', e);
      setError('Failed to promote students.');
      throw e;
    }
  };

  const contextValue = useMemo(() => ({
    students, 
    loading, 
    error, 
    updateStudent, 
    addStudent, 
    addBulkStudents, 
    deleteStudent,
    bulkUpdateSection,
    bulkUpdateStatus,
    bulkDeleteStudents,
    promoteStudents,
    addAnecdotalNote,
    deleteAnecdotalNote
  }), [students, loading, error, academicYear, user]);

  return (
    <StudentContext.Provider value={contextValue}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudents = () => useContext(StudentContext);
