import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from './AuthContext.jsx';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  writeBatch,
  getDocs,
  getDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Fetch notifications where recipientId matches user's UID
    const q = query(
      collection(db, 'notifications'), 
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      setLoading(false);
    }, (error) => {
      console.error("Failed to load notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  };

  const acknowledgeNotification = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      const docSnap = await getDoc(notifRef);
      
      if (docSnap.exists()) {
        await updateDoc(notifRef, { acknowledged: true, read: true });
      } else {
        await updateDoc(notifRef, { acknowledged: true, read: true });
      }
    } catch (e) {
      console.error("Error acknowledging notification:", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      if (unreadNotifs.length === 0) return;

      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        const notifRef = doc(db, 'notifications', n.id);
        batch.update(notifRef, { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.error("Error marking all notifications as read:", e);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notifRef);
    } catch (e) {
      console.error("Error deleting notification:", e);
    }
  };

  const deleteAnnouncementGroup = async (groupId) => {
    if (!groupId) return;
    try {
      const q = query(collection(db, 'notifications'), where('groupId', '==', groupId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (e) {
      console.error("Error deleting announcement group:", e);
    }
  };

  const sendNotification = async ({ title, message, recipientId, type = 'info', link = '' }) => {
    try {
      let recipientUids = [];

      if (recipientId === 'all_teachers') {
        const pQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
        const snap = await getDocs(pQuery);
        recipientUids = snap.docs.map(d => d.id).filter(Boolean);
      } else if (recipientId === 'all_admins') {
        const pQuery = query(collection(db, 'users'), where('role', 'in', ['admin', 'system_admin']));
        const snap = await getDocs(pQuery);
        recipientUids = snap.docs.map(d => d.id).filter(Boolean);
      } else if (recipientId === 'all') {
        const snap = await getDocs(collection(db, 'users'));
        recipientUids = snap.docs.map(d => d.id).filter(Boolean);
      } else {
        recipientUids = [recipientId];
      }

      // Always ensure the sender gets a copy for their own history/feed
      if (user?.uid && !recipientUids.includes(user.uid)) {
        recipientUids.push(user.uid);
      }

      if (recipientUids.length === 0) return;

      const batch = writeBatch(db);
      const groupId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      recipientUids.forEach(uid => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          groupId,
          title,
          message,
          recipientId: uid,
          senderId: user?.uid || 'system',
          senderName: user?.fullName || 'System',
          type,
          link,
          read: uid === user?.uid, // Pre-read for sender
          acknowledged: uid === user?.uid, // Pre-acknowledged for sender
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.error("Error sending notification:", e);
      throw e;
    }
  };
  const getAnnouncementStats = async (groupId, senderId) => {
    if (!groupId) return { total: 0, acknowledged: 0, acknowledgedBy: [] };
    try {
      const q = query(collection(db, 'notifications'), where('groupId', '==', groupId));
      const snap = await getDocs(q);
      let total = 0;
      let acknowledged = 0;
      let acknowledgedBy = [];
      
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.recipientId !== senderId) {
          total++;
          if (data.acknowledged) {
            acknowledged++;
            acknowledgedBy.push(data.recipientId);
          }
        }
      });
      return { total, acknowledged, acknowledgedBy };
    } catch (e) {
      console.error("Error fetching stats:", e);
      return { total: 0, acknowledged: 0, acknowledgedBy: [] };
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      markAsRead, 
      markAllAsRead,
      deleteNotification,
      deleteAnnouncementGroup,
      sendNotification,
      getAnnouncementStats,
      selectedNotification,
      setSelectedNotification,
      acknowledgeNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
