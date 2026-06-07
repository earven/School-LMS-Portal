import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import imageCompression from 'browser-image-compression';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, updateUserProfile } = useAuth();
  const { settings } = useSettings();
  
  const [formData, setFormData] = useState({
    fullName: '',
    profilePicture: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.username || '',
        profilePicture: user.profilePicture || ''
      });
    }
  }, [user]);

  // Handle Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resizeImage = async (file, maxWidth = 300, maxHeight = 300) => {
    try {
      const options = {
        maxSizeMB: 0.1, // compress to ~100KB
        maxWidthOrHeight: Math.max(maxWidth, maxHeight),
        useWebWorker: true,
        fileType: 'image/webp'
      };
      
      const compressedFile = await imageCompression(file, options);
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = (error) => reject(error);
      });
    } catch (error) {
      console.error("Image compression error:", error);
      throw new Error("Failed to process image. It might not be a valid image file.");
    }
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
      const base64Image = await resizeImage(file, 250, 250);
      setFormData(prev => ({
        ...prev,
        profilePicture: base64Image
      }));
    } catch (err) {
      console.error('Image processing failed:', err);
      setSaveMessage({ type: 'error', text: 'Failed to process image.' });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage({ type: '', text: '' });
    
    const result = await updateUserProfile(formData);
    
    if (result.success) {
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    } else {
      setSaveMessage({ type: 'error', text: result.error || 'Failed to update profile.' });
    }
    setIsSaving(false);
  };

  return (
    <div className="profile-page fade-in">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account settings and profile picture</p>
      </div>

      <div className="profile-container">
        {saveMessage.text && (
          <div className={`toast-notification ${saveMessage.type}`}>
            {saveMessage.text}
          </div>
        )}

        <div className="settings-card">
          <div className="settings-section">
            <h2>Personal Information</h2>
            
            <div className="profile-picture-section">
              <div className="profile-avatar-large">
                {formData.profilePicture ? (
                  <img src={formData.profilePicture} alt="Profile" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">
                    {(formData.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
               {settings.enableFileUpload ? (
                <div className="profile-upload-controls">
                  <label className="upload-btn">
                    Upload New Picture
                    <input type="file" accept="image/*" onChange={handleProfilePictureUpload} hidden />
                  </label>
                  <p className="help-text">Recommended size: 250x250px. Max size: 2MB.</p>
                </div>
              ) : (
                <div className="profile-upload-controls">
                  <p className="help-text" style={{ color: '#ef4444', fontWeight: '500' }}>
                    ⚠️ Image uploading is currently disabled by the system administrator.
                  </p>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="disabled-input"
              />
              <p className="help-text">Email address cannot be changed from the portal.</p>
            </div>

            <div className="form-group">
              <label>Role</label>
              <input
                type="text"
                value={(user?.role || '').replace('_', ' ')}
                disabled
                className="disabled-input role-input"
              />
            </div>
            
          </div>
          
          <div className="settings-actions">
            <button
              className="save-btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
