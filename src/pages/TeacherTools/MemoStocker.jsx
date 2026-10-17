// src/pages/TeacherTools/MemoStocker.jsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { db } from '../../firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import './MemoStocker.css';

const MEMO_CATEGORIES = [
  { id: 'all', label: 'All', icon: '📋', color: '#4b5563' },
  { id: 'school', label: 'School Memo', icon: '🏫', color: '#2563eb' },
  { id: 'deped', label: 'DepEd Memo', icon: '🇵🇭', color: '#dc2626' },
  { id: 'department', label: 'Department Memo', icon: '📁', color: '#7c3aed' },
  { id: 'division', label: 'Division Memo', icon: '🏛️', color: '#0891b2' },
  { id: 'advisory', label: 'Advisory', icon: '📢', color: '#d97706' },
  { id: 'other', label: 'Other', icon: '📌', color: '#059669' },
];

const getCategoryMeta = (id) =>
  MEMO_CATEGORIES.find((c) => c.id === id) || MEMO_CATEGORIES[MEMO_CATEGORIES.length - 1];

// Detects if a URL is a temporary Facebook CDN link
const isFacebookCdnLink = (url) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname.includes('fbsbx.com') || u.hostname.includes('fbcdn.net') || u.hostname.includes('facebook.com/download');
  } catch { return false; }
};

// Parses Facebook CDN link expiry from the 'oe' query param (hex Unix timestamp)
const getFacebookLinkExpiry = (url) => {
  try {
    const params = new URLSearchParams(new URL(url).search);
    const oe = params.get('oe');
    if (!oe) return null;
    const expireTs = parseInt(oe, 16) * 1000;
    return new Date(expireTs);
  } catch { return null; }
};

// Converts any Google Drive / Docs link to an embeddable preview URL
const toPreviewUrl = (url) => {
  if (!url) return null;
  if (isFacebookCdnLink(url)) return null; // Cannot embed — blocked by Facebook
  try {
    const u = new URL(url);

    // Google Drive file: /file/d/<ID>/view  →  /file/d/<ID>/preview
    const driveFileMatch = url.match(/\/file\/d\/([^/]+)/);
    if (driveFileMatch) {
      return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
    }

    // Google Docs / Sheets / Slides: /d/<ID>/edit → /d/<ID>/preview
    const docsMatch = url.match(/\/d\/([^/]+)\//);
    if (docsMatch && (u.hostname.includes('docs.google.com') || u.hostname.includes('sheets.google.com') || u.hostname.includes('slides.google.com'))) {
      const base = url.split('/d/')[0] + '/d/' + docsMatch[1];
      return `${base}/preview`;
    }

    // Google Docs export/embed
    if (url.includes('drive.google.com/open?id=')) {
      const id = u.searchParams.get('id');
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }

    return null; // Non-embeddable link; show external open button only
  } catch {
    return null;
  }
};

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Component ──────────────────────────────────────────────────
const MemoStocker = () => {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const location = useLocation();
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add memo modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemo, setNewMemo] = useState({
    title: '',
    description: '',
    category: 'school',
    driveLink: '',
  });
  const [saving, setSaving] = useState(false);

  // Viewer modal
  const [viewingMemo, setViewingMemo] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Auto-fill from PWA Share Target (URL params) ─────────────
  useEffect(() => {
    if (!isAdmin) return;
    const params = new URLSearchParams(location.search);
    const sharedUrl = params.get('url') || params.get('text') || '';
    const sharedTitle = params.get('title') || '';

    // Extract the first URL from text if it's mixed content (Messenger often sends "title url")
    const urlMatch = sharedUrl.match(/https?:\/\/[^\s]+/);
    const extractedLink = urlMatch ? urlMatch[0] : sharedUrl;

    if (extractedLink || sharedTitle) {
      setNewMemo((prev) => ({
        ...prev,
        driveLink: extractedLink || prev.driveLink,
        title: sharedTitle || prev.title,
      }));
      setShowAddModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, isAdmin]);

  // ─── Firestore listener ────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'memos'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setMemos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error fetching memos:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Filtered memos ────────────────────────────────────────
  const filteredMemos = memos.filter((m) => {
    const matchesCat = activeCategory === 'all' || m.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // ─── Add Memo ──────────────────────────────────────────────
  const handleAddMemo = async (e) => {
    e.preventDefault();
    if (!newMemo.title.trim() || !newMemo.driveLink.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'memos'), {
        ...newMemo,
        title: newMemo.title.trim(),
        description: newMemo.description.trim(),
        driveLink: newMemo.driveLink.trim(),
        createdBy: user.uid,
        createdByName: user.fullName || user.email,
        createdAt: serverTimestamp(),
      });

      // Send notification to all teachers + admins (excluding the current user)
      const catMeta = getCategoryMeta(newMemo.category);
      await sendNotification({
        title: `📌 New Memo: ${newMemo.title.trim()}`,
        message: `A new ${catMeta.label} has been posted by ${user.fullName || 'Admin'}. Click to view it.`,
        recipientId: 'all',
        type: 'memo',
        link: '/teacher-tools/memo-stocker',
      });

      setShowAddModal(false);
      setNewMemo({ title: '', description: '', category: 'school', driveLink: '' });
      showToast('Memo added successfully and staff notified!', 'success');
    } catch (err) {
      console.error('Error adding memo:', err);
      showToast('Failed to add memo: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Memo ───────────────────────────────────────────
  const handleDelete = async (e, memoId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this memo permanently?')) return;
    try {
      await deleteDoc(doc(db, 'memos', memoId));
      showToast('Memo deleted.', 'success');
    } catch (err) {
      showToast('Failed to delete memo.', 'error');
    }
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="memo-stocker-container">
      {/* ── Header ── */}
      <div className="memo-header">
        <div className="memo-header-left">
          <h1>📌 Memo Stocker</h1>
          <p>Centralized repository for all official school and DepEd memos.</p>
        </div>
        {isAdmin && (
          <button className="add-memo-btn" onClick={() => setShowAddModal(true)}>
            + Add Memo
          </button>
        )}
      </div>

      {/* ── Filters Bar ── */}
      <div className="memo-filters-bar">
        <div className="memo-search-wrapper">
          <span className="memo-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search memos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="memo-category-filters">
          {MEMO_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`memo-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
              style={activeCategory === cat.id ? { background: cat.color } : {}}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="memo-empty-state">
          <div className="empty-icon">⏳</div>
          <h3>Loading memos...</h3>
        </div>
      ) : (
        <div className="memo-grid">
          {filteredMemos.length === 0 ? (
            <div className="memo-empty-state">
              <div className="empty-icon">📭</div>
              <h3>No memos found</h3>
              <p>
                {isAdmin
                  ? 'Click "+ Add Memo" to upload the first one.'
                  : 'Check back later for new memos.'}
              </p>
            </div>
          ) : (
            filteredMemos.map((memo) => {
              const catMeta = getCategoryMeta(memo.category);
              return (
                <div
                  key={memo.id}
                  className="memo-card"
                  onClick={() => setViewingMemo(memo)}
                >
                  <div
                    className="memo-card-accent"
                    style={{ background: catMeta.color }}
                  />
                  <div className="memo-card-body">
                    <span
                      className="memo-card-category-badge"
                      style={{
                        background: catMeta.color + '20',
                        color: catMeta.color,
                      }}
                    >
                      {catMeta.icon} {catMeta.label}
                    </span>
                    <h3 className="memo-card-title">{memo.title}</h3>
                    {memo.description && (
                      <p className="memo-card-description">{memo.description}</p>
                    )}
                    {isFacebookCdnLink(memo.driveLink) && (() => {
                      const expiry = getFacebookLinkExpiry(memo.driveLink);
                      const isExpired = expiry && expiry < new Date();
                      return (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          fontSize: '0.72rem', fontWeight: 600, color: isExpired ? '#dc2626' : '#d97706',
                          background: isExpired ? '#fef2f2' : '#fffbeb',
                          padding: '0.2rem 0.55rem', borderRadius: '20px', marginTop: '0.4rem'
                        }}>
                          {isExpired ? '❌ Link Expired' : `⏳ Expires ${expiry ? expiry.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : 'soon'}`}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="memo-card-footer">
                    <span className="memo-card-date">
                      📅 {formatDate(memo.createdAt)}
                    </span>
                    <div className="memo-card-actions">
                      <button
                        className="memo-open-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingMemo(memo);
                        }}
                      >
                        🔍 View
                      </button>
                      {isAdmin && (
                        <button
                          className="memo-delete-btn"
                          onClick={(e) => handleDelete(e, memo.id)}
                          title="Delete memo"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Viewer Modal ── */}
      {viewingMemo && (() => {
        const previewUrl = toPreviewUrl(viewingMemo.driveLink);
        const catMeta = getCategoryMeta(viewingMemo.category);
        const isFbLink = isFacebookCdnLink(viewingMemo.driveLink);
        const fbExpiry = isFbLink ? getFacebookLinkExpiry(viewingMemo.driveLink) : null;
        const isExpired = fbExpiry && fbExpiry < new Date();
        return (
          <div className="memo-viewer-overlay" onClick={() => setViewingMemo(null)}>
            <div className="memo-viewer-content" onClick={(e) => e.stopPropagation()}>
              <div className="memo-viewer-header">
                <div>
                  <span
                    className="memo-card-category-badge"
                    style={{ background: catMeta.color + '20', color: catMeta.color }}
                  >
                    {catMeta.icon} {catMeta.label}
                  </span>
                  <h2>{viewingMemo.title}</h2>
                  {viewingMemo.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>
                      {viewingMemo.description}
                    </p>
                  )}
                </div>
                <button className="close-x" onClick={() => setViewingMemo(null)}>✕</button>
              </div>

              {/* Facebook CDN warning banner */}
              {isFbLink && (
                <div style={{
                  background: isExpired ? '#fef2f2' : '#fffbeb',
                  borderTop: `1px solid ${isExpired ? '#fecaca' : '#fde68a'}`,
                  borderBottom: `1px solid ${isExpired ? '#fecaca' : '#fde68a'}`,
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.83rem',
                  color: isExpired ? '#dc2626' : '#92400e',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}>
                  <span>{isExpired ? '❌' : '⚠️'}</span>
                  <div>
                    {isExpired
                      ? <><strong>This link has expired.</strong> Facebook CDN links are temporary. Please ask the sender to re-upload to Google Drive.</>
                      : <><strong>Temporary Facebook link</strong> — expires {fbExpiry ? fbExpiry.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'soon'}. Consider replacing it with a permanent Google Drive link.</>}
                  </div>
                </div>
              )}

              <div className="memo-viewer-iframe-container">
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title={viewingMemo.title}
                    allow="autoplay"
                  />
                ) : (
                  <div className="memo-viewer-no-preview">
                    <div className="no-preview-icon">{isFbLink ? (isExpired ? '❌' : '📎') : '🔗'}</div>
                    {isFbLink
                      ? isExpired
                        ? <><p><strong>This link has expired.</strong></p><p>Ask the sender to re-share the file via Google Drive for a permanent link.</p></>
                        : <><p>Facebook CDN links cannot be previewed inside the app.</p><p>Use the button below to download / view the PDF directly while the link is still active.</p></>
                      : <><p>This link cannot be previewed directly.</p><p>Click the button below to open it externally.</p></>}
                  </div>
                )}
              </div>

              <div className="memo-viewer-footer">
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                  Uploaded {formatDate(viewingMemo.createdAt)} by {viewingMemo.createdByName || 'Admin'}
                </span>
                {!isExpired && (
                  <a
                    href={viewingMemo.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="memo-viewer-open-external"
                  >
                    🔗 Open Document
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Add Memo Modal ── */}
      {showAddModal && (
        <div className="memo-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="memo-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="memo-modal-header">
              <h2>Add New Memo</h2>
              <button className="close-x" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddMemo}>
              <div className="memo-modal-body">
                <div className="memo-form-group">
                  <label>Memo Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. DM-2025-034 – School Calendar Reminder"
                    required
                    value={newMemo.title}
                    onChange={(e) => setNewMemo({ ...newMemo, title: e.target.value })}
                  />
                </div>
                <div className="memo-form-group">
                  <label>Category *</label>
                  <select
                    value={newMemo.category}
                    onChange={(e) => setNewMemo({ ...newMemo, category: e.target.value })}
                    required
                  >
                    {MEMO_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="memo-form-group">
                  <label>Description (optional)</label>
                  <textarea
                    placeholder="Brief summary of the memo contents..."
                    value={newMemo.description}
                    onChange={(e) => setNewMemo({ ...newMemo, description: e.target.value })}
                  />
                </div>
                <div className="memo-form-group">
                  <label>Memo Link *</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/...  or  https://cdn.fbsbx.com/..."
                    required
                    value={newMemo.driveLink}
                    onChange={(e) => setNewMemo({ ...newMemo, driveLink: e.target.value })}
                  />
                  {newMemo.driveLink && isFacebookCdnLink(newMemo.driveLink) && (() => {
                    const expiry = getFacebookLinkExpiry(newMemo.driveLink);
                    return (
                      <span className="memo-form-hint" style={{ color: '#d97706' }}>
                        ⚠️ This is a temporary Facebook CDN link{expiry ? ` — expires ${expiry.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}. For a permanent link, download the PDF and re-upload it to Google Drive.
                      </span>
                    );
                  })()}
                  {newMemo.driveLink && !isFacebookCdnLink(newMemo.driveLink) && (
                    <span className="memo-form-hint">
                      ✓ Google Drive / Docs links will be previewed directly in the app.
                    </span>
                  )}
                </div>
              </div>
              <div className="memo-modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={saving}>
                  {saving ? 'Saving...' : '📌 Post Memo & Notify Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`memo-toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
};

export default MemoStocker;
