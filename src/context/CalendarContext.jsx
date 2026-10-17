import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { logAuditEvent, AUDIT_CATEGORIES, AUDIT_SEVERITY } from '../utils/auditLogger';
import { getPhilippineHolidaysForYear } from '../utils/philippineHolidays';

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
    
    // Query 1: Public Events (where isPrivate is false)
    const publicQ = query(
      collection(db, 'events'),
      where('isPrivate', '==', false)
    );

    // Query 2: User's Private Events
    const privateQ = query(
      collection(db, 'events'),
      where('isPrivate', '==', true),
      where('createdBy', '==', user.uid)
    );

    let publicEvents = [];
    let privateEvents = [];
    
    // Generate offline-first base statutory holidays for current years
    const currentYear = new Date().getFullYear();
    const baseHolidays = [
      ...getPhilippineHolidaysForYear(currentYear - 1),
      ...getPhilippineHolidaysForYear(currentYear),
      ...getPhilippineHolidaysForYear(currentYear + 1),
      ...getPhilippineHolidaysForYear(currentYear + 2)
    ];

    let externalHolidays = [...baseHolidays];

    const fetchHolidays = async () => {
      try {
        const [res1, res2] = await Promise.all([
          fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/PH`),
          fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear + 1}/PH`)
        ]);
        
        let h1 = [], h2 = [];
        if (res1.ok) h1 = await res1.json();
        if (res2.ok) h2 = await res2.json();

        const fetched = [...h1, ...h2];
        if (fetched.length > 0) {
          const apiHolidays = fetched.map(item => ({
            id: `ph-holiday-${item.date}-${item.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
            title: `🇵🇭 ${item.name}`,
            localName: item.localName,
            date: item.date,
            startDate: item.date,
            endDate: item.date,
            type: 'holiday',
            description: `Philippine National Holiday (${item.localName})`,
            isPrivate: false,
            isExternal: true
          }));

          // Merge without duplicate dates
          const holidayMap = new Map();
          for (const h of baseHolidays) holidayMap.set(h.date, h);
          for (const h of apiHolidays) {
            if (!holidayMap.has(h.date)) {
              holidayMap.set(h.date, h);
            }
          }
          externalHolidays = Array.from(holidayMap.values());
          mergeAndSetEvents();
        }
      } catch (error) {
        console.warn("Using offline base Philippine holidays:", error);
      }
    };

    const mergeAndSetEvents = () => {
      const allEvents = [...publicEvents, ...privateEvents, ...externalHolidays];
      // Normalize dates: if event only has date, set startDate & endDate
      const normalized = allEvents.map(e => ({
        ...e,
        startDate: e.startDate || e.date,
        endDate: e.endDate || e.startDate || e.date,
        date: e.date || e.startDate
      }));
      // Sort by startDate ascending in-memory
      normalized.sort((a, b) => (a.startDate || a.date || '').localeCompare(b.startDate || b.date || ''));
      setEvents(normalized);
      setLoading(false);
    };

    fetchHolidays();

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
      const startDate = eventData.startDate || eventData.date;
      const endDate = eventData.endDate || startDate;
      
      const payload = {
        isPrivate: false,
        ...eventData,
        startDate,
        endDate,
        date: startDate,
        createdBy: eventData.createdBy || user?.uid || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'events'), payload);
      
      logAuditEvent({
        action: 'CALENDAR_EVENT_CREATED',
        category: AUDIT_CATEGORIES.SETTINGS,
        details: `Created calendar event "${payload.title}" (${startDate}${endDate !== startDate ? ` to ${endDate}` : ''})`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: docRef.id,
        actor: user
      });

      return { success: true, id: docRef.id };
    } catch (e) {
      console.error("Error adding event:", e);
      return { success: false, error: e.message };
    }
  };

  const updateEvent = async (id, eventData) => {
    try {
      const startDate = eventData.startDate || eventData.date;
      const endDate = eventData.endDate || startDate;

      const eventRef = doc(db, 'events', id);
      await updateDoc(eventRef, {
        ...eventData,
        startDate,
        endDate,
        date: startDate,
        updatedAt: serverTimestamp()
      });

      logAuditEvent({
        action: 'CALENDAR_EVENT_UPDATED',
        category: AUDIT_CATEGORIES.SETTINGS,
        details: `Updated calendar event "${eventData.title}" (${startDate})`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: id,
        actor: user
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

      logAuditEvent({
        action: 'CALENDAR_EVENT_DELETED',
        category: AUDIT_CATEGORIES.SETTINGS,
        details: `Deleted calendar event record (ID: ${id})`,
        severity: AUDIT_SEVERITY.INFO,
        targetId: id,
        actor: user
      });

      return { success: true };
    } catch (e) {
      console.error("Error deleting event:", e);
      return { success: false, error: e.message };
    }
  };

  const contextValue = useMemo(() => ({
    events, 
    loading, 
    addEvent, 
    updateEvent, 
    deleteEvent
  }), [events, loading, user]);

  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => useContext(CalendarContext);
