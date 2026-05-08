import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const defaultSettings = {
    // School Identity
    schoolName: 'Vinapor National High School',
    schoolLogo: '', // Base64 string for now
    motto: 'Aim High, Reach High',
    description: 'Empowering students through digital transformation and streamlined school operations.',
    
    // Contact Information
    phone: '0912-345-6789',
    email: 'vinapor.nhs@example.edu',
    address: 'Vinapor, Carmen, Agusan del Norte',
    facebookUrl: 'https://facebook.com/vinapornhs',
    
    // System Preferences
    academicYear: '2025-2026',
    enabledModules: {
      studentManagement: true,
      personnelManagement: true,
      teacherTools: true
    },
    enableFileUpload: true,
    
    // Appearance Settings
    primaryColor: '#2563eb',
    theme: 'light',
    logoPosition: 'left'
  };

  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('schoolSettings');
    if (!savedSettings) return defaultSettings;
    
    try {
      const parsed = JSON.parse(savedSettings);
      // Deep merge basic level
      return {
        ...defaultSettings,
        ...parsed,
        enabledModules: {
          ...defaultSettings.enabledModules,
          ...(parsed.enabledModules || {})
        }
      };
    } catch (e) {
      console.error('Error parsing schoolSettings', e);
      return defaultSettings;
    }
  });

  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('schoolSettings', JSON.stringify(updated));
    
    // Apply appearance settings immediately
    if (newSettings.primaryColor) {
      document.documentElement.style.setProperty('--primary-blue', newSettings.primaryColor);
    }
    if (newSettings.theme) {
      document.body.className = newSettings.theme;
    }
  };

  useEffect(() => {
    // Apply initial settings
    document.documentElement.style.setProperty('--primary-blue', settings.primaryColor);
    document.body.className = settings.theme;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
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
