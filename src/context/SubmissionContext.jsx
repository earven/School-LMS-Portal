import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext.jsx';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  onSnapshot, 
  query, 
  addDoc,
  updateDoc, 
  deleteDoc, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

const SubmissionContext = createContext(null);

export const SubmissionProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Tasks (Submissions created by Admin)
  useEffect(() => {
    if (authLoading || !user || !user.role || user.role === 'pending') {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching submissions tasks:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // Fetch Responses (Actual submissions from teachers)
  useEffect(() => {
    if (authLoading || !user || !user.role || user.role === 'pending') {
      setResponses([]);
      return;
    }

    let q;
    if (['admin', 'system_admin'].includes(user?.role)) {
      // Admin sees all responses
      q = query(collection(db, 'submission_responses'), orderBy('submittedAt', 'desc'));
    } else {
      // Teachers only see their own responses
      q = query(collection(db, 'submission_responses'), where('userId', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const responsesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResponses(responsesData);
    }, (error) => {
      console.error("Error fetching submission responses:", error);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // Admin: Create a new Task
  const createTask = async (taskData) => {
    try {
      const docRef = await addDoc(collection(db, 'submissions'), {
        ...taskData,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      console.log('Task created with ID:', docRef.id);

      // Trigger notifications to target teachers
      try {
        let recipientIds = [];
        
        if (Array.isArray(taskData.recipients)) {
          // If already an array of UIDs, use it directly (improves speed and reliability)
          recipientIds = taskData.recipients;
        } else if (taskData.recipients === 'all') {
          const usersSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['teacher', 'admin', 'system_admin'])));
          recipientIds = usersSnap.docs.map(d => d.id).filter(Boolean);
        } else if (taskData.recipients === 'advisers' || taskData.recipients === 'non-advisers') {
          const usersSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['teacher', 'admin', 'system_admin'])));
          const allTeachers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const sectionsSnap = await getDocs(collection(db, 'sections'));
          const adviserIds = new Set(sectionsSnap.docs.map(s => s.data().adviserId).filter(Boolean));
          if (taskData.recipients === 'advisers') {
            recipientIds = allTeachers.filter(t => adviserIds.has(t.id)).map(t => t.id);
          } else {
            recipientIds = allTeachers.filter(t => !adviserIds.has(t.id)).map(t => t.id);
          }
        } else if (typeof taskData.recipients === 'string' && taskData.recipients.startsWith('subject:')) {
          const targetSub = taskData.recipients.replace('subject:', '');
          const usersSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['teacher', 'admin', 'system_admin'])));
          const allTeachers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          recipientIds = allTeachers.filter(t => (t.subjects || []).includes(targetSub)).map(t => t.id);
        } else if (typeof taskData.recipients === 'string') {
          // Individual UID
          recipientIds = [taskData.recipients];
        }

        if (recipientIds.length > 0) {
          const batch = writeBatch(db);
          recipientIds.forEach(uid => {
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
              recipientId: uid,
              senderId: user.uid,
              senderName: user.fullName || 'Admin',
              title: 'New Submission Request',
              message: `A new task "${taskData.title}" has been assigned. Due: ${taskData.deadline}`,
              type: 'task',
              read: false,
              link: '/teacher-tools/submissions',
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
          console.log(`Successfully triggered ${recipientIds.length} notifications.`);
        }
      } catch (notifErr) {
        console.error('Error triggering task notifications:', notifErr);
      }

      return docRef.id;
    } catch (e) {
      console.error('Error creating task:', e);
      throw e;
    }
  };

  // Admin: Update an existing Task
  const updateTask = async (taskId, updatedData) => {
    try {
      await updateDoc(doc(db, 'submissions', taskId), updatedData);
      console.log('Task updated:', taskId);
    } catch (e) {
      console.error('Error updating task:', e);
      throw e;
    }
  };

  // Teacher: Submit a Response
  const submitResponse = async (taskId, responseData) => {
    try {
      const existing = responses.find(r => r.submissionId === taskId && r.userId === user.uid);
      
      if (existing) {
        await updateDoc(doc(db, 'submission_responses', existing.id), {
          ...responseData,
          submittedAt: serverTimestamp(),
          status: 'Submitted'
        });
      } else {
        await addDoc(collection(db, 'submission_responses'), {
          ...responseData,
          submissionId: taskId,
          userId: user.uid,
          userName: user.fullName || user.displayName || user.email,
          submittedAt: serverTimestamp(),
          status: 'Submitted'
        });
      }

      // Trigger notification to Admins
      try {
        const adminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
        const taskSnap = await getDoc(doc(db, 'submissions', taskId));
        const taskTitle = taskSnap.exists() ? taskSnap.data().title : 'Task';

        if (adminsSnap.docs.length > 0) {
          const batch = writeBatch(db);
          adminsSnap.docs.forEach(adminDoc => {
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
              recipientId: adminDoc.id,
              senderId: user.uid,
              senderName: user.fullName || 'Teacher',
              title: 'New Response Submitted',
              message: `${user.fullName || 'A teacher'} submitted a response for "${taskTitle}".`,
              type: 'submission',
              read: false,
              link: '/teacher-tools/submissions',
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
        }
      } catch (notifErr) {
        console.error('Error triggering admin notifications:', notifErr);
      }

    } catch (e) {
      console.error('Error submitting response:', e);
      throw e;
    }
  };

  // Admin: Review/grade a response
  const reviewResponse = async (responseId, reviewData) => {
    try {
      await updateDoc(doc(db, 'submission_responses', responseId), {
        status: reviewData.status, // e.g. 'Approved', 'Needs Revision'
        feedback: reviewData.feedback || '',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid
      });

      // Send notification back to the teacher
      try {
        const respSnap = await getDoc(doc(db, 'submission_responses', responseId));
        if (respSnap.exists()) {
          const respData = respSnap.data();
          const taskSnap = await getDoc(doc(db, 'submissions', respData.submissionId));
          const taskTitle = taskSnap.exists() ? taskSnap.data().title : 'Task';

          await addDoc(collection(db, 'notifications'), {
            recipientId: respData.userId,
            senderId: user.uid,
            senderName: user.fullName || 'Admin',
            title: reviewData.status === 'Approved' ? 'Submission Approved' : 'Action Required: Re-submission Needed',
            message: reviewData.status === 'Approved' 
              ? `Your submission for "${taskTitle}" has been approved.`
              : `Your submission for "${taskTitle}" needs revision. Feedback: ${reviewData.feedback}`,
            type: 'submission_review',
            read: false,
            link: '/teacher-tools/submissions',
            createdAt: serverTimestamp()
          });
        }
      } catch (notifErr) {
        console.error('Error triggering review notification:', notifErr);
      }
    } catch (e) {
      console.error('Error reviewing response:', e);
      throw e;
    }
  };

  // Admin: Send reminder notification to pending teachers
  const sendTaskReminder = async (taskId, recipientIds) => {
    if (!recipientIds || recipientIds.length === 0) return 0;
    try {
      const taskSnap = await getDoc(doc(db, 'submissions', taskId));
      const taskTitle = taskSnap.exists() ? taskSnap.data().title : 'Submission Task';
      const deadline = taskSnap.exists() ? taskSnap.data().deadline : '';

      const batch = writeBatch(db);
      recipientIds.forEach(uid => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          recipientId: uid,
          senderId: user.uid,
          senderName: user.fullName || 'Admin',
          title: `Reminder: ${taskTitle}`,
          message: `Please submit your report for "${taskTitle}". ${deadline ? `Deadline: ${deadline}` : ''}`,
          type: 'task_reminder',
          read: false,
          link: '/teacher-tools/submissions',
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      return recipientIds.length;
    } catch (e) {
      console.error('Error sending task reminders:', e);
      throw e;
    }
  };

  // Admin: Batch review responses
  const batchReviewResponses = async (responseIds, reviewData) => {
    if (!responseIds || responseIds.length === 0) return;
    try {
      const batch = writeBatch(db);
      responseIds.forEach(id => {
        const ref = doc(db, 'submission_responses', id);
        batch.update(ref, {
          status: reviewData.status || 'Approved',
          feedback: reviewData.feedback || '',
          reviewedAt: serverTimestamp(),
          reviewedBy: user.uid
        });
      });
      await batch.commit();
    } catch (e) {
      console.error('Error batch reviewing responses:', e);
      throw e;
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'submissions', taskId));
    } catch (e) {
      console.error('Error deleting task:', e);
      throw e;
    }
  };

  const toggleArchiveTask = async (taskId, isArchived = true) => {
    try {
      await updateDoc(doc(db, 'submissions', taskId), {
        isArchived: isArchived,
        archivedAt: isArchived ? serverTimestamp() : null
      });
      console.log(`Task ${taskId} archived status set to:`, isArchived);
    } catch (e) {
      console.error('Error toggling archive status for task:', e);
      throw e;
    }
  };

  const contextValue = useMemo(() => ({
    tasks, 
    responses, 
    loading, 
    createTask, 
    updateTask,
    submitResponse, 
    deleteTask,
    toggleArchiveTask,
    reviewResponse,
    batchReviewResponses,
    sendTaskReminder
  }), [tasks, responses, loading, user]);

  return (
    <SubmissionContext.Provider value={contextValue}>
      {children}
    </SubmissionContext.Provider>
  );
};

export const useSubmissions = () => {
  const context = useContext(SubmissionContext);
  if (!context) throw new Error('useSubmissions must be used within a SubmissionProvider');
  return context;
};
