// src/pages/TeacherTools/LearningResourcesPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import './LearningResourcesPage.css';

const DEPED_SUBJECTS = [
  'Araling Panlipunan (AP)',
  'Edukasyon sa Pagpapakatao (EsP)',
  'English',
  'Filipino',
  'Mathematics',
  'MAPEH (Music, Arts, PE, Health)',
  'Science',
  'TLE / TVL',
  'SHS Core Subject',
  'SHS Applied Subject',
  'SHS Specialized Subject',
  'General / Others'
];

const GRADE_LEVELS = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'All JHS',
  'All SHS',
  'General / Schoolwide'
];

const RESOURCE_TYPES = [
  'Lesson Plan',
  'Activity Sheet',
  'Quiz / Assessment',
  'Presentation Slide',
  'Video Lecture',
  'Other Material'
];

const SUBJECT_COLORS = {
  'Araling Panlipunan (AP)': '#b45309', // Amber
  'Edukasyon sa Pagpapakatao (EsP)': '#65a30d', // Lime
  'English': '#1d4ed8', // Blue
  'Filipino': '#b91c1c', // Red
  'Mathematics': '#0f766e', // Teal
  'MAPEH (Music, Arts, PE, Health)': '#a21caf', // Magenta
  'Science': '#0369a1', // Sky
  'TLE / TVL': '#6d28d9', // Purple
  'SHS Core Subject': '#be185d', // Pink
  'SHS Applied Subject': '#4338ca', // Indigo
  'SHS Specialized Subject': '#db2777', // Deep pink
  'General / Others': '#4b5563' // Gray
};

const getFolderIcon = (category, type) => {
  if (type === 'subject') {
    switch (category) {
      case 'English': return '📖';
      case 'Science': return '🔬';
      case 'Mathematics': return '📐';
      case 'Filipino': return '🇵🇭';
      case 'Araling Panlipunan (AP)': return '🌍';
      case 'Edukasyon sa Pagpapakatao (EsP)': return '🤝';
      case 'MAPEH (Music, Arts, PE, Health)': return '🎨';
      case 'TLE / TVL': return '⚙️';
      case 'SHS Core Subject': return '🎒';
      case 'SHS Applied Subject': return '💼';
      case 'SHS Specialized Subject': return '🧪';
      default: return '📚';
    }
  }
  if (type === 'resourceType') {
    switch (category) {
      case 'Lesson Plan': return '📝';
      case 'Activity Sheet': return '📄';
      case 'Quiz / Assessment': return '❓';
      case 'Presentation Slide': return '📊';
      case 'Video Lecture': return '🎥';
      default: return '🔗';
    }
  }
  if (type === 'gradeLevel') {
    return '🏫';
  }
  return '📁';
};

const LearningResourcesPage = () => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  // Core State
  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterGrade, setFilterGrade] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResourceForViewer, setSelectedResourceForViewer] = useState(null);
  const [groupBy, setGroupBy] = useState('subject');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Reset selected folder when grouping, search or filter parameters change
  useEffect(() => {
    setSelectedCategory(null);
  }, [groupBy, searchQuery, filterSubject, filterGrade, filterType]);

  // Categories helper based on filters
  const getCategories = () => {
    if (groupBy === 'subject') {
      if (filterSubject !== 'All') {
        return [filterSubject];
      }
      return DEPED_SUBJECTS;
    }
    if (groupBy === 'gradeLevel') {
      if (filterGrade !== 'All') {
        return [filterGrade];
      }
      return GRADE_LEVELS;
    }
    if (groupBy === 'resourceType') {
      if (filterType !== 'All') {
        return [filterType];
      }
      return RESOURCE_TYPES;
    }
    return [];
  };

  const getCategoryResources = (category) => {
    if (groupBy === 'subject') {
      return filteredResources.filter(res => res.subject === category);
    }
    if (groupBy === 'gradeLevel') {
      return filteredResources.filter(res => res.gradeLevel === category);
    }
    if (groupBy === 'resourceType') {
      return filteredResources.filter(res => res.resourceType === category);
    }
    return [];
  };

  const getCategoryHeaderStyle = (category) => {
    if (groupBy === 'subject') {
      const color = SUBJECT_COLORS[category] || '#4b5563';
      return { borderLeft: `4px solid ${color}` };
    }
    return { borderLeft: `4px solid var(--primary-blue)` };
  };

  const renderResourceCard = (res) => {
    const badge = getSourceBadge(res.source);
    return (
      <article key={res.id} className="resource-card fade-in">
        <header className="card-top">
          <div className="type-badge" title={res.resourceType}>
            <span className="type-icon">{getTypeIcon(res.resourceType)}</span>
            <span className="type-text">{res.resourceType}</span>
          </div>
          {isAdmin && (
            <button 
              className="delete-card-btn" 
              onClick={() => handleDeleteResource(res)}
              title="Remove from Library"
            >
              🗑️
            </button>
          )}
        </header>

        <h3 className="resource-title">{res.title}</h3>
        <p className="resource-desc">{res.description || 'No description provided.'}</p>

        {/* Metadata Badges */}
        <div className="card-metadata-badges">
          <span className="meta-badge subject-badge" style={{ backgroundColor: `${SUBJECT_COLORS[res.subject] || '#4b5563'}15`, color: SUBJECT_COLORS[res.subject] || '#4b5563', borderColor: `${SUBJECT_COLORS[res.subject] || '#4b5563'}30` }}>
            {res.subject}
          </span>
          <span className="meta-badge grade-badge">
            {res.gradeLevel}
          </span>
          <span className="meta-badge source-badge" style={{ backgroundColor: `${badge.color}15`, color: badge.color, borderColor: `${badge.color}30` }} title={`Hosting Platform: ${badge.label}`}>
            <span style={{ marginRight: '4px' }}>{badge.icon}</span>{badge.label}
          </span>
        </div>

        {/* Tags */}
        {res.tags && res.tags.length > 0 && (
          <div className="resource-tags-list">
            {res.tags.map((t, idx) => (
              <span key={idx} className="tag-pill">#{t}</span>
            ))}
          </div>
        )}

        {/* Footer details */}
        <footer className="card-footer">
          <div className="creator-details">
            <span className="shared-by-label">Shared by</span>
            <span className="creator-name">{res.createdByName}</span>
          </div>
          <button 
            onClick={() => setSelectedResourceForViewer(res)}
            className="view-resource-btn"
          >
            View Resource ➔
          </button>
        </footer>
      </article>
    );
  };

  const categories = getCategories();

  // Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [shareFormData, setShareFormData] = useState({
    title: '',
    description: '',
    webUrl: '',
    resourceType: RESOURCE_TYPES[0],
    subject: DEPED_SUBJECTS[0],
    gradeLevel: GRADE_LEVELS[0],
    tags: ''
  });

  // Sync resources list from Firestore
  useEffect(() => {
    const colRef = collection(db, 'learning_resources');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setResources(list);
      setIsLoading(false);
    }, (error) => {
      console.error('Failed to load resources:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper: Detect link platform
  const detectSource = (url) => {
    if (!url) return 'generic';
    const lowercaseUrl = url.toLowerCase();
    if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) return 'youtube';
    if (lowercaseUrl.includes('canva.com')) return 'canva';
    if (lowercaseUrl.includes('drive.google.com')) return 'googledrive';
    if (lowercaseUrl.includes('onedrive.live.com') || lowercaseUrl.includes('sharepoint.com') || lowercaseUrl.includes('onedrive.com')) return 'onedrive';
    if (lowercaseUrl.endsWith('.pdf')) return 'pdf';
    return 'generic';
  };

  // Helper: Get iframe embed URL
  const getEmbedUrl = (url, source) => {
    if (!url) return '';
    try {
      if (source === 'youtube') {
        let videoId = '';
        if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0];
        } else if (url.includes('v=')) {
          videoId = url.split('v=')[1]?.split('&')[0]?.split('#')[0];
        } else if (url.includes('embed/')) {
          videoId = url.split('embed/')[1]?.split(/[?#]/)[0];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }
      if (source === 'googledrive') {
        if (url.includes('/drive/folders/')) {
          const folderId = url.split('/drive/folders/')[1]?.split(/[?#]/)[0];
          return folderId ? `https://drive.google.com/embeddedfolderview?id=${folderId}#list` : url;
        }
        if (url.includes('/file/d/')) {
          const fileId = url.split('/file/d/')[1]?.split('/')[0];
          return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
        }
        return url;
      }
      if (source === 'canva') {
        if (url.includes('/design/')) {
          const parts = url.split('/design/');
          const designId = parts[1]?.split('/')[0];
          return designId ? `https://www.canva.com/design/${designId}/view?embed` : url;
        }
        return url;
      }
      if (source === 'pdf') {
        return url;
      }
    } catch (e) {
      console.error('Failed to translate embed URL:', e);
    }
    return url;
  };

  // Helper: Get badge icons/tags
  const getSourceBadge = (source) => {
    switch (source) {
      case 'youtube':
        return { label: 'YouTube', color: '#ff0000', icon: '🎥' };
      case 'canva':
        return { label: 'Canva', color: '#00c4cc', icon: '🎨' };
      case 'googledrive':
        return { label: 'Google Drive', color: '#34a853', icon: '🤖' };
      case 'onedrive':
        return { label: 'OneDrive', color: '#0078d4', icon: '☁️' };
      case 'pdf':
        return { label: 'PDF Document', color: '#e01e22', icon: '📄' };
      default:
        return { label: 'External Resource', color: '#4b5563', icon: '🔗' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Lesson Plan': return '📝';
      case 'Activity Sheet': return '📄';
      case 'Quiz / Assessment': return '❓';
      case 'Presentation Slide': return '📊';
      case 'Video Lecture': return '🎥';
      default: return '🔗';
    }
  };

  // Handlers
  const handleOpenShareModal = () => {
    setShareFormData({
      title: '',
      description: '',
      webUrl: '',
      resourceType: RESOURCE_TYPES[0],
      subject: DEPED_SUBJECTS[0],
      gradeLevel: GRADE_LEVELS[0],
      tags: ''
    });
    setShowShareModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShareFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveShare = async (e) => {
    e.preventDefault();
    if (!shareFormData.title.trim()) {
      alert('Please enter a descriptive resource title.');
      return;
    }
    if (!shareFormData.webUrl.trim()) {
      alert('Please enter a valid resource URL link.');
      return;
    }

    try {
      setSavingShare(true);
      const detectedSource = detectSource(shareFormData.webUrl);

      const resourceData = {
        title: shareFormData.title.trim(),
        description: shareFormData.description.trim(),
        webUrl: shareFormData.webUrl.trim(),
        resourceType: shareFormData.resourceType,
        subject: shareFormData.subject,
        gradeLevel: shareFormData.gradeLevel,
        tags: shareFormData.tags.split(',').map(t => t.trim()).filter(t => t),
        source: detectedSource,
        createdBy: user.uid,
        createdByName: user.fullName || user.username || 'DepEd Teacher',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'learning_resources'), resourceData);
      setShowShareModal(false);
    } catch (err) {
      alert('Failed to share learning resource: ' + err.message);
    } finally {
      setSavingShare(false);
    }
  };

  const handleDeleteResource = async (resource) => {
    if (!isAdmin) {
      alert('You do not have permission to delete this learning resource.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove "${resource.title}" from the shared library?`)) {
      try {
        await deleteDoc(doc(db, 'learning_resources', resource.id));
      } catch (err) {
        alert('Failed to delete resource: ' + err.message);
      }
    }
  };

  // Filter resource items
  const filteredResources = resources.filter(res => {
    const matchesSearch = 
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.tags && res.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      res.createdByName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesSubject = filterSubject === 'All' || res.subject === filterSubject;
    const matchesGrade = filterGrade === 'All' || res.gradeLevel === filterGrade;
    const matchesType = filterType === 'All' || res.resourceType === filterType;
    
    return matchesSearch && matchesSubject && matchesGrade && matchesType;
  });

  return (
    <div className="learning-resources-container">
      <header className="resources-header">
        <div className="header-info">
          <h1>Learning Resources Hub</h1>
          <p>Explore official learning resource folders, curriculum guides, and shared teaching assets curated by the school administration.</p>
        </div>
        {isAdmin && (
          <button className="share-trigger-btn" onClick={handleOpenShareModal}>
            <span className="btn-icon">➕</span> Share a Folder / Resource
          </button>
        )}
      </header>

      {/* Filter and Search Bar */}
      <section className="search-filters-bar">
        <div className="filter-bar-top-row">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search by title, teacher name, keywords or tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="group-by-box">
            <label className="toggle-label">Group By</label>
            <div className="group-by-toggle-group">
              <button 
                type="button"
                className={`toggle-box-btn ${groupBy === 'subject' ? 'active' : ''}`}
                onClick={() => setGroupBy('subject')}
              >
                Subject
              </button>
              <button 
                type="button"
                className={`toggle-box-btn ${groupBy === 'gradeLevel' ? 'active' : ''}`}
                onClick={() => setGroupBy('gradeLevel')}
              >
                Grade Level
              </button>
              <button 
                type="button"
                className={`toggle-box-btn ${groupBy === 'resourceType' ? 'active' : ''}`}
                onClick={() => setGroupBy('resourceType')}
              >
                Type
              </button>
              <button 
                type="button"
                className={`toggle-box-btn ${groupBy === 'none' ? 'active' : ''}`}
                onClick={() => setGroupBy('none')}
              >
                Flat List
              </button>
            </div>
          </div>
        </div>
        
        <div className="filter-bar-bottom-row">
          <div className="filter-group">
            <label>Subject Filter</label>
            <div className="select-wrapper">
              <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                <option value="All">All Subjects</option>
                {DEPED_SUBJECTS.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group">
            <label>Grade Level Filter</label>
            <div className="select-wrapper">
              <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                <option value="All">All Grade Levels</option>
                {GRADE_LEVELS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group">
            <label>Resource Type Filter</label>
            <div className="select-wrapper">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="All">All Resource Types</option>
                {RESOURCE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>


      {/* Main Catalog View */}
      {isLoading ? (
        <div className="resources-loading">
          <div className="spinner"></div>
          <p>Loading curated learning resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="resources-empty-state">
          <div className="empty-icon">📚</div>
          <h3>No Learning Resources Found</h3>
          <p>We couldn't find any resources matching your search queries or filters. Try adjusting your search filters.</p>
          {isAdmin && (
            <button className="share-trigger-btn" style={{ margin: '1.5rem auto 0 auto' }} onClick={handleOpenShareModal}>
              ➕ Share a Resource Now
            </button>
          )}
        </div>
      ) : groupBy === 'none' ? (
        <div className="resources-grid">
          {filteredResources.map(res => renderResourceCard(res))}
        </div>
      ) : selectedCategory === null ? (
        <div className="folders-grid fade-in">
          {categories.map(category => {
            const categoryResources = getCategoryResources(category);
            const count = categoryResources.length;
            const folderColor = groupBy === 'subject' ? (SUBJECT_COLORS[category] || '#2563eb') : '#2563eb';
            const folderIcon = getFolderIcon(category, groupBy);

            return (
              <button 
                key={category} 
                className="folder-box-card"
                onClick={() => setSelectedCategory(category)}
                style={{ '--folder-theme-color': folderColor }}
              >
                <div className="folder-back-deco"></div>
                <div className="folder-tab"></div>
                <div className="folder-body-deco">
                  <div className="folder-icon-wrapper" style={{ backgroundColor: `${folderColor}12`, color: folderColor }}>
                    <span className="folder-emoji">{folderIcon}</span>
                  </div>
                  <div className="folder-details">
                    <h3 className="folder-name-title" title={category}>{category}</h3>
                    <span className="folder-item-count">
                      {count} {count === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>
                <div className="folder-hover-accent" style={{ backgroundColor: folderColor }}></div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="selected-folder-container fade-in">
          <div className="folder-navigation-bar">
            <button className="back-to-folders-btn" onClick={() => setSelectedCategory(null)}>
              ← Back to Folders
            </button>
            <div className="folder-breadcrumb">
              <span className="breadcrumb-root" onClick={() => setSelectedCategory(null)}>
                📁 Learning Resources Hub
              </span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-active">{selectedCategory}</span>
            </div>
          </div>

          <div className="folder-meta-summary">
            <span 
              className="folder-indicator-dot" 
              style={{ backgroundColor: groupBy === 'subject' ? (SUBJECT_COLORS[selectedCategory] || '#2563eb') : '#2563eb' }}
            ></span>
            <h2>{selectedCategory} Resources</h2>
            <span className="folder-resource-count">
              {getCategoryResources(selectedCategory).length} {getCategoryResources(selectedCategory).length === 1 ? 'resource' : 'resources'} in folder
            </span>
          </div>

          {getCategoryResources(selectedCategory).length === 0 ? (
            <div className="category-empty-placeholder">
              <span className="placeholder-icon">📂</span>
              <p>No resources found in this folder matching your filters.</p>
            </div>
          ) : (
            <div className="resources-grid">
              {getCategoryResources(selectedCategory).map(res => renderResourceCard(res))}
            </div>
          )}
        </div>
      )}

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Share a Learning Resource</h2>
              <button className="close-modal-btn" onClick={() => setShowShareModal(false)}>&times;</button>
            </header>
            
            <form onSubmit={handleSaveShare} className="modal-form">
              <div className="form-group">
                <label htmlFor="title">Resource Title <span className="required-star">*</span></label>
                <input 
                  type="text" 
                  id="title" 
                  name="title" 
                  value={shareFormData.title} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Lesson Plan: Introduction to Fractions"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="webUrl">Resource Link URL <span className="required-star">*</span></label>
                <input 
                  type="url" 
                  id="webUrl" 
                  name="webUrl" 
                  value={shareFormData.webUrl} 
                  onChange={handleInputChange} 
                  placeholder="Paste Google Drive, OneDrive, Canva, or YouTube link..."
                  required
                />
                <span className="input-tip-text">The system automatically detects OneDrive, Google Drive, Canva, YouTube, and PDF links!</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="resourceType">Resource Type</label>
                  <div className="select-wrapper">
                    <select id="resourceType" name="resourceType" value={shareFormData.resourceType} onChange={handleInputChange}>
                      {RESOURCE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="gradeLevel">Curriculum Grade Level</label>
                  <div className="select-wrapper">
                    <select id="gradeLevel" name="gradeLevel" value={shareFormData.gradeLevel} onChange={handleInputChange}>
                      {GRADE_LEVELS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Curriculum Core Subject</label>
                <div className="select-wrapper">
                  <select id="subject" name="subject" value={shareFormData.subject} onChange={handleInputChange}>
                    {DEPED_SUBJECTS.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tags (Comma-separated)</label>
                <input 
                  type="text" 
                  id="tags" 
                  name="tags" 
                  value={shareFormData.tags} 
                  onChange={handleInputChange} 
                  placeholder="e.g. fractions, math 7, visual-aid"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Brief Description / Usage Instructions</label>
                <textarea 
                  id="description" 
                  name="description" 
                  rows="3" 
                  value={shareFormData.description} 
                  onChange={handleInputChange} 
                  placeholder="Provide details about how teachers can use this resource in class..."
                />
              </div>

              <footer className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowShareModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={savingShare}>
                  {savingShare ? 'Saving to Catalog...' : 'Add to Shared Library'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Resource Viewer Modal Overlay */}
      {selectedResourceForViewer && (
        <div className="viewer-overlay" onClick={() => setSelectedResourceForViewer(null)}>
          <div className="viewer-modal" onClick={(e) => e.stopPropagation()}>
            <header className="viewer-header">
              <div className="viewer-meta">
                <span className="viewer-subject-badge" style={{ backgroundColor: `${SUBJECT_COLORS[selectedResourceForViewer.subject] || '#4b5563'}15`, color: SUBJECT_COLORS[selectedResourceForViewer.subject] || '#4b5563', borderColor: `${SUBJECT_COLORS[selectedResourceForViewer.subject] || '#4b5563'}30` }}>
                  {selectedResourceForViewer.subject}
                </span>
                <span className="viewer-type-badge">
                  <span style={{ marginRight: '4px' }}>{getTypeIcon(selectedResourceForViewer.resourceType)}</span>
                  {selectedResourceForViewer.resourceType}
                </span>
              </div>
              <h2 className="viewer-title">{selectedResourceForViewer.title}</h2>
              <div className="viewer-actions">
                <a 
                  href={selectedResourceForViewer.webUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="viewer-external-btn"
                  title="Open in New Tab"
                >
                  ↗️ Open in Tab
                </a>
                <button className="viewer-close-btn" onClick={() => setSelectedResourceForViewer(null)} title="Close Preview">
                  &times;
                </button>
              </div>
            </header>

            <div className="viewer-body">
              {['onedrive', 'generic'].includes(selectedResourceForViewer.source) ? (
                <div className="viewer-fallback">
                  <div className="fallback-icon">
                    {selectedResourceForViewer.source === 'onedrive' ? '☁️' : '🔗'}
                  </div>
                  <h3>Preview Restricted by Host</h3>
                  <p>
                    This resource is hosted on a platform that prevents in-portal embeds.
                    Please open it in a new browser window to view and download.
                  </p>
                  <a 
                    href={selectedResourceForViewer.webUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="fallback-action-btn"
                  >
                    Open in New Tab ➔
                  </a>
                </div>
              ) : (
                <div className="viewer-iframe-wrapper">
                  <iframe 
                    src={getEmbedUrl(selectedResourceForViewer.webUrl, selectedResourceForViewer.source)} 
                    title={selectedResourceForViewer.title}
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                  ></iframe>
                </div>
              )}
            </div>
            
            {selectedResourceForViewer.description && (
              <footer className="viewer-footer">
                <p className="viewer-description">
                  <strong>Notes:</strong> {selectedResourceForViewer.description}
                </p>
              </footer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningResourcesPage;
