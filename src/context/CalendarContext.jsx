import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const CalendarContext = createContext(null);

export const CalendarProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.role || user.role === 'pending') {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Query 1: Public Events (where isPrivate is false or undefined)
    const publicQ = query(
      collection(db, 'events'),
      where('isPrivate', '!=', true)
    );

    // Query 2: User's Private Events
    const privateQ = query(
      collection(db, 'events'),
      where('isPrivate', '==', true),
      where('createdBy', '==', user.uid)
    );

    let publicEvents = [];
    let privateEvents = [];

    const mergeAndSetEvents = () => {
      const allEvents = [...publicEvents, ...privateEvents];
      // Sort by date ascending in-memory
      allEvents.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setEvents(allEvents);
      setLoading(false);
    };

    const unsubscribePublic = onSnapshot(publicQ, (snapshot) => {
      publicEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      mergeAndSetEvents();
    }, (error) => {
      console.error("Error fetching public calendar events:", error);
      setLoading(false);
    });

    const unsubscribePrivate = onSnapshot(privateQ, (snapshot) => {
      privateEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      mergeAndSetEvents();
    }, (error) => {
      console.error("Error fetching private calendar events:", error);
      setLoading(false);
    });

    return () => {
      unsubscribePublic();
      unsubscribePrivate();
    };
  }, [user, authLoading]);

  const addEvent = async (eventData) => {
    try {
      await addDoc(collection(db, 'events'), {
        ...eventData,
        createdBy: eventData.createdBy || user?.uid || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (e) {
      console.error("Error adding event:", e);
      return { success: false, error: e.message };
    }
  };

  const updateEvent = async (id, eventData) => {
    try {
      const eventRef = doc(db, 'events', id);
      await updateDoc(eventRef, {
        ...eventData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (e) {
      console.error("Error updating event:", e);
      return { success: false, error: e.message };
    }
  };

  const deleteEvent = async (id) => {
    try {
      await deleteDoc(doc(db, 'events', id));
      return { success: true };
    } catch (e) {
      console.error("Error deleting event:", e);
      return { success: false, error: e.message };
    }
  };

  return (
    <CalendarContext.Provider value={{ events, loading, addEvent, updateEvent, deleteEvent }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);
