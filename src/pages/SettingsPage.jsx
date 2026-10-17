import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useStudents } from '../context/StudentContext';
import { useSections } from '../context/SectionContext';
import { usePersonnel } from '../context/PersonnelContext';
import { uploadMediaWithFallback } from '../utils/mediaStorage';
import { 
  exportSchoolSnapshot, 
  validateBackupFile, 
  restoreSchoolSnapshot, 
  scanDataIntegrity 
} from '../utils/backupService';
import { 
  subscribeAuditLogs, 
  exportAuditLogsToCSV, 
  AUDIT_CATEGORIES, 
  AUDIT_SEVERITY,
  logAuditEvent
} from '../utils/auditLogger';
import './SettingsPage.css';

import SettingsIdentityTab from './SettingsTabs/SettingsIdentityTab';
import SettingsGradingTab from './SettingsTabs/SettingsGradingTab';
import SettingsContactTab from './SettingsTabs/SettingsContactTab';
import SettingsSystemTab from './SettingsTabs/SettingsSystemTab';
import SettingsAppearanceTab from './SettingsTabs/SettingsAppearanceTab';
import SettingsDataManagementTab from './SettingsTabs/SettingsDataManagementTab';
import SettingsAuditLogsTab from './SettingsTabs/SettingsAuditLogsTab';
import SettingsResetModal from './SettingsTabs/SettingsResetModal';
import SettingsRestoreModal from './SettingsTabs/SettingsRestoreModal';

const DEFAULT_SETTINGS = {
  schoolName: 'Your School Name',
  schoolId: '',
  region: '',
  division: '',
  schoolLogo: '',
  motto: 'Empowering Education, Shaping Futures',
  description: 'Empowering students through digital transformation and streamlined school operations.',
  phone: '0000-000-0000',
  email: 'info@yourschool.edu',
  address: 'School Campus Address',
  facebookUrl: 'https://facebook.com',
  academicYear: '2025-2026',
  enabledModules: {
    studentManagement: true,
    personnelManagement: true,
    sections: true,
    calendar: true,
    teacherTools: true
  },
  enableFileUpload: true,
  primaryColor: '#2563eb',
  theme: 'light',
  fontSize: 'compact',
  logoPosition: 'left',
  heroBackground: '',
  heroImages: [],
  featuredGallery: [],
  registrationCode: 'SETUP-1234',

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

  // DepEd Grading Policies (DO 8, s. 2015 & DO 31, s. 2020)
  activeTerm: 'T1',
  gradingEncodingOpen: {
    t1: true,
    t2: false,
    t3: false
  },
  passingGrade: 75,
  totalSchoolDays: 201,
  gradingWeights: {
    languagesAndHumss: { written: 20, performance: 50, examinations: 30 },
    mathAndScience: { written: 20, performance: 50, examinations: 30 },
    mapehAndTle: { written: 20, performance: 60, examinations: 20 },
    shsAcademic: { written: 20, performance: 50, examinations: 30 },
    shsTvl: { written: 20, performance: 60, examinations: 20 }
  }
};

const COLOR_PRESETS = [
  { name: 'Classic Navy', hex: '#1e3a8a' },
  { name: 'Emerald Green', hex: '#065f46' },
  { name: 'Crimson Maroon', hex: '#991b1b' },
  { name: 'Royal Teal', hex: '#0f766e' },
  { name: 'Indigo Violet', hex: '#4338ca' },
  { name: 'Slate Charcoal', hex: '#334155' }
];

const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const { students } = useStudents();
  const { sections } = useSections();
  const { personnel } = usePersonnel();

  const [activeTab, setActiveTab] = useState('identity');
  const [localSettings, setLocalSettings] = useState(settings);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('Changes saved successfully!');
  
  // New Enhancement States
  const [isSaving, setIsSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Drag and Drop States
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingHero, setIsDraggingHero] = useState(false);
  const [isDraggingDashboard, setIsDraggingDashboard] = useState(false);
  const [isDraggingGallery, setIsDraggingGallery] = useState(false);

  // Data Management states
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [backupPreview, setBackupPreview] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreConfirmationText, setRestoreConfirmationText] = useState('');
  const [selectedRestoreCollections, setSelectedRestoreCollections] = useState([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Data Integrity Scanner states
  const [integrityResults, setIntegrityResults] = useState(null);
  const [isScanningIntegrity, setIsScanningIntegrity] = useState(false);

  // Audit Logs states
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('ALL');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState('ALL');
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);

  // Subscribe to live audit logs
  useEffect(() => {
    if (activeTab !== 'audit-logs') return;
    const unsubscribe = subscribeAuditLogs((logs) => {
      setAuditLogs(logs);
    }, { limitCount: 150, category: auditCategoryFilter !== 'ALL' ? auditCategoryFilter : null });
    return () => unsubscribe();
  }, [activeTab, auditCategoryFilter]);

  const triggerNotification = (msg) => {
    setNotificationMsg(msg);
    setShowNotification(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setShowNotification(false), 3500);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;

    // Clear validation error on change
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setLocalSettings(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent] || {}),
          [child]: inputValue
        }
      }));
    } else {
      setLocalSettings(prev => ({
        ...prev,
        [name]: inputValue
      }));
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { url } = await uploadMediaWithFallback({
          file,
          storagePath: `settings/logo_${Date.now()}.webp`,
          maxWidthOrHeight: 300,
          maxSizeMB: 0.1
        });
        setLocalSettings(prev => ({ ...prev, schoolLogo: url }));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const removeSchoolLogo = () => {
    setLocalSettings(prev => ({ ...prev, schoolLogo: '' }));
  };

  const handleHeroImagesUpload = async (e) => {
    try {
      const files = Array.from(e.target.files);
      const results = await Promise.all(
        files.map((file, i) =>
          uploadMediaWithFallback({
            file,
            storagePath: `settings/hero_${Date.now()}_${i}.webp`,
            maxWidthOrHeight: 1280,
            maxSizeMB: 0.2
          }).then(res => res.url)
        )
      );
      setLocalSettings(prev => ({
        ...prev,
        heroImages: [...(prev.heroImages || []), ...results]
      }));
    } catch {
      alert("One or more images failed to load. Please make sure they are valid image files.");
    }
  };

  const removeHeroImage = (index) => {
    setLocalSettings(prev => {
      const newImages = [...(prev.heroImages || [])];
      newImages.splice(index, 1);
      return { ...prev, heroImages: newImages };
    });
  };

  const handleHeroBackgroundUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { url } = await uploadMediaWithFallback({
          file,
          storagePath: `settings/hero_bg_${Date.now()}.webp`,
          maxWidthOrHeight: 1280,
          maxSizeMB: 0.2
        });
        setLocalSettings(prev => ({ ...prev, heroBackground: url }));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const removeHeroBackground = () => {
    setLocalSettings(prev => ({ ...prev, heroBackground: '' }));
  };

  const handleFeaturedGalleryUpload = async (e) => {
    try {
      const files = Array.from(e.target.files);
      const results = await Promise.all(
        files.map((file, i) =>
          uploadMediaWithFallback({
            file,
            storagePath: `settings/gallery_${Date.now()}_${i}.webp`,
            maxWidthOrHeight: 600,
            maxSizeMB: 0.15
          }).then(res => res.url)
        )
      );
      setLocalSettings(prev => ({
        ...prev,
        featuredGallery: [...(prev.featuredGallery || []), ...results]
      }));
    } catch {
      alert("One or more gallery images failed to load.");
    }
  };

  const removeFeaturedGalleryImage = (index) => {
    setLocalSettings(prev => {
      const newImages = [...(prev.featuredGallery || [])];
      newImages.splice(index, 1);
      return { ...prev, featuredGallery: newImages };
    });
  };

  // Drag and Drop Helper Handlers
  const handleDragOver = (e, dragSetter) => {
    e.preventDefault();
    dragSetter(true);
  };

  const handleDragLeave = (e, dragSetter) => {
    e.preventDefault();
    dragSetter(false);
  };

  const handleLogoDrop = async (e) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const { url } = await uploadMediaWithFallback({
          file,
          storagePath: `settings/logo_${Date.now()}.webp`,
          maxWidthOrHeight: 300,
          maxSizeMB: 0.1
        });
        setLocalSettings(prev => ({ ...prev, schoolLogo: url }));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleHeroImagesDrop = async (e) => {
    e.preventDefault();
    setIsDraggingHero(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      try {
        const results = await Promise.all(
          files.map((file, i) =>
            uploadMediaWithFallback({
              file,
              storagePath: `settings/hero_${Date.now()}_${i}.webp`,
              maxWidthOrHeight: 1280,
              maxSizeMB: 0.2
            }).then(res => res.url)
          )
        );
        setLocalSettings(prev => ({
          ...prev,
          heroImages: [...(prev.heroImages || []), ...results]
        }));
      } catch {
        alert("One or more images failed to load.");
      }
    }
  };

  const handleHeroBackgroundDrop = async (e) => {
    e.preventDefault();
    setIsDraggingDashboard(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const { url } = await uploadMediaWithFallback({
          file,
          storagePath: `settings/hero_bg_${Date.now()}.webp`,
          maxWidthOrHeight: 1280,
          maxSizeMB: 0.2
        });
        setLocalSettings(prev => ({ ...prev, heroBackground: url }));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleFeaturedGalleryDrop = async (e) => {
    e.preventDefault();
    setIsDraggingGallery(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      try {
        const results = await Promise.all(
          files.map((file, i) =>
            uploadMediaWithFallback({
              file,
              storagePath: `settings/gallery_${Date.now()}_${i}.webp`,
              maxWidthOrHeight: 600,
              maxSizeMB: 0.15
            }).then(res => res.url)
          )
        );
        setLocalSettings(prev => ({
          ...prev,
          featuredGallery: [...(prev.featuredGallery || []), ...results]
        }));
      } catch {
        alert("One or more images failed to load.");
      }
    }
  };

  const handleSave = async () => {
    const newErrors = {};

    // Validate Email format
    if (localSettings.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(localSettings.email)) {
        newErrors.email = 'Please enter a valid email address (e.g. school@edu.com)';
      }
    }

    // Validate Phone format
    if (localSettings.phone) {
      const phoneRegex = /^[\d\s\-+()]{7,20}$/;
      if (!phoneRegex.test(localSettings.phone)) {
        newErrors.phone = 'Please enter a valid phone number (7-20 characters)';
      }
    }

    // Validate Facebook URL format
    if (localSettings.facebookUrl) {
      try {
        const url = new URL(localSettings.facebookUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          newErrors.facebookUrl = 'URL must start with http:// or https://';
        }
      } catch {
        newErrors.facebookUrl = 'Please enter a valid Facebook page URL';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setActiveTab('contact'); // Validation errors currently reside on Contact tab
      return;
    }

    setIsSaving(true);
    // Simulate database write delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const success = updateSettings(localSettings);
    setIsSaving(false);
    if (success) {
      triggerNotification('Changes saved successfully!');
      logAuditEvent({
        action: 'SETTINGS_UPDATED',
        category: AUDIT_CATEGORIES.SETTINGS,
        details: `Updated school system settings and module configurations.`,
        severity: AUDIT_SEVERITY.INFO,
        actor: user
      });
    }
  };

  const handleConfirmReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    updateSettings(DEFAULT_SETTINGS);
    setShowResetModal(false);
    triggerNotification('Settings restored to default configurations.');
    logAuditEvent({
      action: 'SETTINGS_RESET_DEFAULTS',
      category: AUDIT_CATEGORIES.SETTINGS,
      details: `Reset system settings to factory default configurations.`,
      severity: AUDIT_SEVERITY.WARNING,
      actor: user
    });
  };

  // ── Data Management Handlers ──────────────────────────────────────────
  const handleExportBackup = async () => {
    setIsExportingBackup(true);
    try {
      const result = await exportSchoolSnapshot({
        academicYear: localSettings.academicYear,
        schoolInfo: localSettings,
        actor: user
      });
      triggerNotification(`Backup successfully generated (${result.filename})`);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleBackupFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const validation = validateBackupFile(content);
      if (!validation.valid) {
        alert(validation.error);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setBackupPreview(validation);
      setSelectedRestoreCollections(Object.keys(validation.data || {}));
      setRestoreConfirmationText('');
      setShowRestoreModal(true);
    };
    reader.onerror = () => {
      alert('Could not read backup file.');
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (restoreConfirmationText.trim().toUpperCase() !== 'RESTORE DATA') {
      alert('Please type "RESTORE DATA" to confirm restoration.');
      return;
    }

    if (!backupPreview || !backupPreview.data) return;

    setIsRestoring(true);
    setRestoreProgress({ current: 0, total: backupPreview.metadata.totalRecords, percentage: 0, collectionName: 'Initializing' });

    try {
      await restoreSchoolSnapshot(
        backupPreview.data,
        {
          selectedCollections: selectedRestoreCollections,
          academicYear: localSettings.academicYear,
          actor: user
        },
        (progress) => {
          setRestoreProgress(progress);
        }
      );

      setShowRestoreModal(false);
      setBackupPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      triggerNotification('School data successfully restored from backup snapshot!');
    } catch (err) {
      alert(`Restoration failed: ${err.message}`);
    } finally {
      setIsRestoring(false);
      setRestoreProgress(null);
    }
  };

  const handleRunIntegrityScan = async () => {
    setIsScanningIntegrity(true);
    try {
      const results = await scanDataIntegrity({ students, sections, personnel });
      setIntegrityResults(results);
    } catch (err) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setIsScanningIntegrity(false);
    }
  };

  // ── Audit Logs Filter ────────────────────────────────────────────────
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditCategoryFilter !== 'ALL' && log.category !== auditCategoryFilter) return false;
      if (auditSeverityFilter !== 'ALL' && log.severity !== auditSeverityFilter) return false;
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const actor = (log.actorName || log.actorEmail || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        const target = (log.targetId || '').toLowerCase();
        return actor.includes(q) || action.includes(q) || details.includes(q) || target.includes(q);
      }
      return true;
    });
  }, [auditLogs, auditCategoryFilter, auditSeverityFilter, auditSearch]);

  const handleExportAuditCSV = () => {
    if (filteredAuditLogs.length === 0) {
      alert('No audit logs to export.');
      return;
    }
    exportAuditLogsToCSV(filteredAuditLogs);
  };

  return (
    <div className="settings-container">
      <header className="settings-header">
        <h1>System Settings</h1>
        <p className="settings-subtitle">Configure your portal's school branding, modules, data backups, and audit compliance.</p>
      </header>

      {showNotification && (
        <div className="notification success">
          <span className="notification-icon">✓</span>
          <span className="notification-message">{notificationMsg}</span>
        </div>
      )}

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <button
            className={`sidebar-tab ${activeTab === 'identity' ? 'active' : ''}`}
            onClick={() => setActiveTab('identity')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
            </svg>
            <span>School Identity</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>Contact Info</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>System Prefs</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'grading-policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('grading-policies')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              <path d="M8 7h8M8 11h8"/>
            </svg>
            <span>Grading & Policies</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span>Appearance</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'data-management' ? 'active' : ''}`}
            onClick={() => setActiveTab('data-management')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            <span>Data & Backup</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'audit-logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit-logs')}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Audit Logs</span>
          </button>
        </aside>

        <main className="settings-main">
          <div className="tab-content">
            {activeTab === 'identity' && (
              <SettingsIdentityTab
                localSettings={localSettings}
                handleInputChange={handleInputChange}
                isDraggingLogo={isDraggingLogo}
                setIsDraggingLogo={setIsDraggingLogo}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleLogoDrop={handleLogoDrop}
                removeSchoolLogo={removeSchoolLogo}
                handleLogoUpload={handleLogoUpload}
              />
            )}

            {/* GRADING & POLICIES TAB */}
            {activeTab === 'grading-policies' && (
              <SettingsGradingTab
                localSettings={localSettings}
                handleInputChange={handleInputChange}
                setLocalSettings={setLocalSettings}
              />
            )}

            {activeTab === 'contact' && (
              <SettingsContactTab
                localSettings={localSettings}
                handleInputChange={handleInputChange}
                errors={errors}
              />
            )}

            {activeTab === 'system' && (
              <SettingsSystemTab
                localSettings={localSettings}
                handleInputChange={handleInputChange}
              />
            )}

            {activeTab === 'appearance' && (
              <SettingsAppearanceTab
                localSettings={localSettings}
                handleInputChange={handleInputChange}
                colorPresets={COLOR_PRESETS}
                setLocalSettings={setLocalSettings}
                isDraggingHero={isDraggingHero}
                setIsDraggingHero={setIsDraggingHero}
                handleHeroImagesDrop={handleHeroImagesDrop}
                handleHeroImagesUpload={handleHeroImagesUpload}
                removeHeroImage={removeHeroImage}
                isDraggingDashboard={isDraggingDashboard}
                setIsDraggingDashboard={setIsDraggingDashboard}
                handleHeroBackgroundDrop={handleHeroBackgroundDrop}
                handleHeroBackgroundUpload={handleHeroBackgroundUpload}
                removeHeroBackground={removeHeroBackground}
                isDraggingGallery={isDraggingGallery}
                setIsDraggingGallery={setIsDraggingGallery}
                handleFeaturedGalleryDrop={handleFeaturedGalleryDrop}
                handleFeaturedGalleryUpload={handleFeaturedGalleryUpload}
                removeFeaturedGalleryImage={removeFeaturedGalleryImage}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
              />
            )}

            {/* ── DATA MANAGEMENT TAB ──────────────────────────────────── */}
            {activeTab === 'data-management' && (
              <SettingsDataManagementTab
                handleExportBackup={handleExportBackup}
                isExportingBackup={isExportingBackup}
                fileInputRef={fileInputRef}
                handleBackupFileSelect={handleBackupFileSelect}
                handleRunIntegrityScan={handleRunIntegrityScan}
                isScanningIntegrity={isScanningIntegrity}
                integrityResults={integrityResults}
              />
            )}

            {/* ── AUDIT LOGS TAB ───────────────────────────────────────── */}
            {activeTab === 'audit-logs' && (
              <SettingsAuditLogsTab
                handleExportAuditCSV={handleExportAuditCSV}
                filteredAuditLogs={filteredAuditLogs}
                auditSearch={auditSearch}
                setAuditSearch={setAuditSearch}
                auditCategoryFilter={auditCategoryFilter}
                setAuditCategoryFilter={setAuditCategoryFilter}
                auditSeverityFilter={auditSeverityFilter}
                setAuditSeverityFilter={setAuditSeverityFilter}
                auditCategories={AUDIT_CATEGORIES}
                auditSeverity={AUDIT_SEVERITY}
                selectedLogDetail={selectedLogDetail}
                setSelectedLogDetail={setSelectedLogDetail}
              />
            )}
          </div>

          <div className="settings-footer">
            <button
              type="button"
              className="reset-button-secondary"
              onClick={() => setShowResetModal(true)}
            >
              Reset to Defaults
            </button>
            <button 
              className="save-button" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="spinner"></span>
                  Saving Changes...
                </>
              ) : (
                <>
                  <svg className="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save System Settings
                </>
              )}
            </button>
          </div>
        </main>
      </div>

      {/* Confirmation Reset Modal */}
      <SettingsResetModal
        showResetModal={showResetModal}
        setShowResetModal={setShowResetModal}
        handleConfirmReset={handleConfirmReset}
      />

      {/* Restore Snapshot Modal */}
      <SettingsRestoreModal
        showRestoreModal={showRestoreModal}
        backupPreview={backupPreview}
        selectedRestoreCollections={selectedRestoreCollections}
        setSelectedRestoreCollections={setSelectedRestoreCollections}
        isRestoring={isRestoring}
        restoreProgress={restoreProgress}
        restoreConfirmationText={restoreConfirmationText}
        setRestoreConfirmationText={setRestoreConfirmationText}
        setShowRestoreModal={setShowRestoreModal}
        setBackupPreview={setBackupPreview}
        fileInputRef={fileInputRef}
        handleExecuteRestore={handleExecuteRestore}
      />

    </div>
  );
};

export default SettingsPage;
