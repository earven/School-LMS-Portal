import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { uploadMediaWithFallback } from '../utils/mediaStorage';
import { parseLegacyFullName } from '../utils/personnelName';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, updateUserProfile } = useAuth();
  const { settings } = useSettings();
  
  const [formData, setFormData] = useState({
    fullName: '',
    profilePicture: '',
    employeeNumber: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.username || '',
        profilePicture: user.profilePicture || '',
        employeeNumber: user.employeeNumber || ''
      });
    }
  }, [user]);

  // Handle Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'fullName') {
      finalValue = value.toUpperCase();
    }
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: 'Image size exceeds 5MB limit. Please select a smaller file.' });
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSaveMessage({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }

    try {
      const { url } = await uploadMediaWithFallback({
        file,
        storagePath: `avatars/${user?.uid || 'user'}/avatar_${Date.now()}.webp`,
        maxWidthOrHeight: 250,
        maxSizeMB: 0.1
      });
      setFormData(prev => ({
        ...prev,
        profilePicture: url
      }));
      setSaveMessage({ type: 'success', text: 'New photo selected. Click Save Profile to apply.' });
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Image processing failed:', err);
      setSaveMessage({ type: 'error', text: 'Failed to process image.' });
    }
  };

  const handleRemoveProfilePicture = () => {
    setFormData(prev => ({
      ...prev,
      profilePicture: ''
    }));
    setSaveMessage({ type: 'success', text: 'Profile picture removed. Click Save Profile to apply.' });
    setTimeout(() => setSaveMessage({ type: '', text: '' }), 4000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage({ type: '', text: '' });
    
    // Parse the fullName into structured components to keep synced with Personnel Management
    const parsedName = parseLegacyFullName(formData.fullName);
    const updates = {
      ...formData,
      ...parsedName
    };
    
    const result = await updateUserProfile(updates);
    
    if (result.success) {
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    } else {
      setSaveMessage({ type: 'error', text: result.error || 'Failed to update profile.' });
    }
    setIsSaving(false);
  };

  const handleCopyUID = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  // Helper to render role badge
  const renderRoleBadge = (role) => {
    const r = role || '';
    let badgeClass = 'badge-pending';
    let icon = (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    );

    if (r === 'system_admin') {
      badgeClass = 'badge-system-admin';
      icon = (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      );
    } else if (r === 'admin') {
      badgeClass = 'badge-admin';
      icon = (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
          <line x1="12" y1="22" x2="12" y2="15.5"/>
          <polyline points="22 8.5 12 15.5 2 8.5"/>
          <polyline points="2 15.5 12 8.5 22 15.5"/>
          <line x1="12" y1="2" x2="12" y2="8.5"/>
        </svg>
      );
    } else if (r === 'teacher') {
      badgeClass = 'badge-teacher';
      icon = (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      );
    }

    return (
      <span className={`profile-badge ${badgeClass}`}>
        {icon}
        {r.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="profile-page-v2 fade-in">
      <div className="profile-header-new">
        <div className="header-info">
          <h1>My Profile</h1>
          <p>View your statistics, manage account information, and update settings</p>
        </div>
      </div>

      {saveMessage.text && (
        <div className={`toast-notification-v2 ${saveMessage.type}`}>
          {saveMessage.type === 'success' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="toast-icon">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="toast-icon">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          )}
          <span>{saveMessage.text}</span>
        </div>
      )}

      <div className="profile-grid">
        {/* Left Column: Profile Card */}
        <div className="profile-sidebar-card">
          <div className="card-cover-gradient"></div>
          
          <div className="card-content-center">
            {/* Avatar Section */}
            <div className="avatar-wrapper-hover">
              <div className="profile-avatar-v2">
                {formData.profilePicture ? (
                  <img src={formData.profilePicture} alt="Profile" className="avatar-img-v2" />
                ) : (
                  <div className="avatar-placeholder-v2">
                    {(formData.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              {settings.enableFileUpload && (
                <label className="avatar-edit-overlay">
                  <input type="file" accept="image/*" onChange={handleProfilePictureUpload} hidden />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="camera-icon">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span>Change Photo</span>
                </label>
              )}
            </div>

            {/* User Basic Info */}
            <h2 className="profile-name-title">{formData.fullName || 'User Name'}</h2>
            <div className="profile-role-badge-container">
              {renderRoleBadge(user?.role)}
            </div>

            {settings.enableFileUpload && formData.profilePicture && (
              <button 
                type="button" 
                onClick={handleRemoveProfilePicture} 
                className="remove-avatar-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Remove Profile Picture
              </button>
            )}

            {!settings.enableFileUpload && (
              <p className="upload-disabled-msg">
                ⚠️ Uploads disabled by administrator
              </p>
            )}

            {/* Quick Stats list */}
            <div className="sidebar-stats-list">
              <div className="stat-row">
                <span className="stat-label">Account Status</span>
                <span className="stat-val status-active">
                  <span className="pulse-dot"></span>
                  Active
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Privacy Consent</span>
                <span className={`stat-val ${user?.hasAcceptedDPA ? 'dpa-accepted' : 'dpa-pending'}`}>
                  {user?.hasAcceptedDPA ? 'Accepted ✓' : 'Pending ⚠'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Member Since</span>
                <span className="stat-val font-medium text-xs">
                  {formatDate(user?.createdAt || user?.metadata?.creationTime)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Account Details Forms */}
        <div className="profile-details-column">
          <div className="form-card-v2">
            <div className="card-header-v2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <h3>Personal Information</h3>
            </div>
            
            <div className="card-body-v2">
              <div className="form-group-v2">
                <label htmlFor="fullName">Full Name</label>
                <div className="input-with-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              {user?.role && user.role !== 'pending' && (
                <div className="form-group-v2">
                  <label htmlFor="employeeNumber">Employee Number</label>
                  <div className="input-with-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <line x1="7" y1="8" x2="17" y2="8" />
                      <line x1="7" y1="12" x2="17" y2="12" />
                      <line x1="7" y1="16" x2="13" y2="16" />
                    </svg>
                    <input
                      id="employeeNumber"
                      type="text"
                      name="employeeNumber"
                      value={formData.employeeNumber}
                      onChange={handleInputChange}
                      placeholder="Enter your Employee Number"
                    />
                  </div>
                </div>
              )}

              <div className="form-group-v2">
                <label>Email Address</label>
                <div className="input-with-icon disabled-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="disabled-input-v2"
                  />
                  <div className="lock-icon-indicator" title="Contact administrator to change email">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                </div>
                <p className="help-text-v2">Registered portal email address (read-only).</p>
              </div>

              <div className="form-group-v2">
                <label>Portal Role</label>
                <div className="input-with-icon disabled-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="input-icon">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  <input
                    type="text"
                    value={(user?.role || '').replace('_', ' ')}
                    disabled
                    className="disabled-input-v2 capitalize"
                  />
                  <div className="lock-icon-indicator">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-card-v2">
            <div className="card-header-v2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="card-icon">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <h3>Security & Credentials</h3>
            </div>

            <div className="card-body-v2">
              <div className="form-group-v2">
                <label>User Identifier (UID)</label>
                <div className="uid-copy-container">
                  <code className="uid-code-block">{user?.uid || 'Not Available'}</code>
                  <button 
                    type="button" 
                    onClick={handleCopyUID} 
                    className={`uid-copy-btn ${copied ? 'copied' : ''}`}
                    title="Copy UID to clipboard"
                  >
                    {copied ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="help-text-v2">Your unique system identifier inside the database.</p>
              </div>
            </div>
          </div>

          <div className="form-actions-v2">
            <button
              type="button"
              className="save-btn-v2"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="btn-spinner"></span>
                  Saving Changes...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="save-icon">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
