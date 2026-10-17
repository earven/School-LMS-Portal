import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const SettingsContext = createContext(null);

const FONT_SIZE_MAP = {
  'standard': '100%',
  'medium': '93.75%',
  'compact': '87.5%',
  'extra-compact': '81.25%'
};

const defaultSettings = {
  // School Identity
  schoolName: 'Your School Name',
  schoolId: '',
  region: '',
  division: '',
  schoolLogo: '', // Base64 string for now
  motto: 'Empowering Education, Shaping Futures',
  description: 'Empowering students through digital transformation and streamlined school operations.',
  
  // Contact Information
  phone: '0000-000-0000',
  email: 'info@yourschool.edu',
  address: 'School Campus Address',
  facebookUrl: 'https://facebook.com',
  
  // System Preferences
  academicYear: '2025-2026',
  academicYearStatus: 'open',
  enabledModules: {
    studentManagement: true,
    personnelManagement: true,
    sections: true,
    calendar: true,
    teacherTools: true
  },
  teacherToolVisibilities: {
    'submission-tracker': true,
    'teacher-attendance': true,
    'teaching-load': true,
    'e-filers': true,
    'attendance-tracker': true,
    'academic-records': true,
    'inventory-tracker': true,
    'enrolment-lister': true,
    'learning-resources': true
  },
  enableFileUpload: true,
  
  // Appearance Settings
  primaryColor: '#2563eb',
  theme: 'light',
  fontSize: 'compact',
  logoPosition: 'left',
  // DepEd Signatories & Authorities
  principalName: 'DR. MARIA C. SANTOS',
  principalTitle: 'Principal IV',
  assistantPrincipal: 'JUAN D. DELA CRUZ, EdD',
  assistantPrincipalTitle: 'Assistant Principal II',
  registrarName: 'ELENA R. BAUTISTA',
  registrarTitle: 'School Registrar I',
  divisionSuperintendent: 'DR. CRISTINA G. VILLANUEVA, CESO V',
  divisionSuperintendentTitle: 'Schools Division Superintendent',
  districtSupervisor: 'DR. ROBERTO M. REYES',

  // DepEd Grading Policies (DO 15, s. 2026 & DO 009, s. 2026)
  // Academic year is divided into 3 Terms; FG = average of Term 1, Term 2, Term 3.
  activeTerm: 'T1',
  gradingEncodingOpen: {
    t1: true,
    t2: false,
    t3: false
  },
  passingGrade: 75,
  totalSchoolDays: 201, // DO 009, s. 2026: 201 class days for SY 2026-2027 (max 220)
  gradingWeights: {
    // Core subjects (KS2–KS4): WW 20%, PT 50%, EX 30%
    languagesAndHumss: { written: 20, performance: 50, examinations: 30 },
    mathAndScience:    { written: 20, performance: 50, examinations: 30 },
    // Technical/Applied (EPP/TLE, MAPEH): WW 20%, PT 60%, EX 20%
    mapehAndTle:       { written: 20, performance: 60, examinations: 20 },
    // SHS Academic: WW 20%, PT 50%, EX 30%
    shsAcademic:       { written: 20, performance: 50, examinations: 30 },
    // SHS TVL / Sports / Arts: WW 20%, PT 60%, EX 20%
    shsTvl:            { written: 20, performance: 60, examinations: 20 }
  },

  // Security Settings
  registrationCode: 'SETUP-1234'
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('schoolSettings');
    if (!savedSettings) return defaultSettings;
    
    try {
      const parsed = JSON.parse(savedSettings);
      return {
        ...defaultSettings,
        ...parsed,
        enabledModules: {
          ...defaultSettings.enabledModules,
          ...(parsed.enabledModules || {})
        },
        teacherToolVisibilities: {
          ...defaultSettings.teacherToolVisibilities,
          ...(parsed.teacherToolVisibilities || {})
        }
      };
    } catch (e) {
      console.error('Error parsing schoolSettings', e);
      return defaultSettings;
    }
  });

  const [sessionAcademicYear, setSessionAcademicYearState] = useState(() => {
    return localStorage.getItem('sessionAcademicYear') || '';
  });

  // Sync with Firestore
  useEffect(() => {
    let currentSettings = { ...defaultSettings };

    const unsubGen = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        currentSettings = {
          ...currentSettings,
          ...data,
          enabledModules: {
            ...defaultSettings.enabledModules,
            ...(data.enabledModules || {})
          },
          teacherToolVisibilities: {
            ...defaultSettings.teacherToolVisibilities,
            ...(data.teacherToolVisibilities || {})
          }
        };
        setSettings({ ...currentSettings });
        localStorage.setItem('schoolSettings', JSON.stringify(currentSettings));
        
        // Initialize sessionAcademicYear if it's empty
        if (!localStorage.getItem('sessionAcademicYear') && currentSettings.academicYear) {
          setSessionAcademicYearState(currentSettings.academicYear);
          localStorage.setItem('sessionAcademicYear', currentSettings.academicYear);
        }

        document.documentElement.style.setProperty('--primary-blue', currentSettings.primaryColor);
        document.body.className = currentSettings.theme;
        document.documentElement.style.fontSize = FONT_SIZE_MAP[currentSettings.fontSize || 'compact'] || '87.5%';
      }
    });

    const unsubHero = onSnapshot(doc(db, 'settings', 'heroImages'), (docSnap) => {
      if (docSnap.exists()) {
        currentSettings.heroImages = docSnap.data().images || [];
        setSettings({ ...currentSettings });
        localStorage.setItem('schoolSettings', JSON.stringify(currentSettings));
      }
    });

    const unsubGal = onSnapshot(doc(db, 'settings', 'featuredGallery'), (docSnap) => {
      if (docSnap.exists()) {
        currentSettings.featuredGallery = docSnap.data().images || [];
        setSettings({ ...currentSettings });
        localStorage.setItem('schoolSettings', JSON.stringify(currentSettings));
      }
    });

    return () => {
      unsubGen();
      unsubHero();
      unsubGal();
    };
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      const updated = { ...settings, ...newSettings };
      
      // Optimistic UI update
      setSettings(updated);
      localStorage.setItem('schoolSettings', JSON.stringify(updated));
      
      if (updated.primaryColor) {
        document.documentElement.style.setProperty('--primary-blue', updated.primaryColor);
      }
      if (updated.theme) {
        document.body.className = updated.theme;
      }
      if (updated.fontSize) {
        document.documentElement.style.fontSize = FONT_SIZE_MAP[updated.fontSize] || '87.5%';
      }

      // Save to Firestore by splitting arrays
      const { heroImages, featuredGallery, ...generalSettings } = updated;
      
      await setDoc(doc(db, 'settings', 'general'), generalSettings);
      await setDoc(doc(db, 'settings', 'heroImages'), { images: heroImages || [] });
      await setDoc(doc(db, 'settings', 'featuredGallery'), { images: featuredGallery || [] });
      
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      if (error.name === 'QuotaExceededError') {
        alert("Storage limit exceeded. The image sizes might still be too large. Please use smaller images.");
      } else {
        alert("Failed to save settings: " + error.message);
      }
      return false;
    }
  };

  useEffect(() => {
    // Apply initial settings (from localStorage immediately to prevent flicker)
    document.documentElement.style.setProperty('--primary-blue', settings.primaryColor);
    document.body.className = settings.theme;
    document.documentElement.style.fontSize = FONT_SIZE_MAP[settings.fontSize || 'compact'] || '87.5%';
  }, []);

  const setSessionAcademicYear = (year) => {
    setSessionAcademicYearState(year);
    localStorage.setItem('sessionAcademicYear', year);
  };

  const currentViewYear = sessionAcademicYear || settings.academicYear;
  const isReadOnly = (currentViewYear !== settings.academicYear) || (settings.academicYearStatus === 'locked');

  const contextValue = useMemo(() => ({
    settings, 
    updateSettings, 
    sessionAcademicYear: currentViewYear, 
    setSessionAcademicYear,
    isReadOnly 
  }), [settings, currentViewYear, isReadOnly]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
