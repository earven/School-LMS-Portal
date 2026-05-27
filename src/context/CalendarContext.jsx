import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';

const CalendarContext = createContext(null);

export const CalendarProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(loadedEvents);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching calendar events:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addEvent = async (eventData) => {
    try {
      await addDoc(collection(db, 'events'), {
        ...eventData,
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
