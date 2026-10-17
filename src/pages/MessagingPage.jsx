import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMessaging } from '../context/MessagingContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './MessagingPage.css';

/* ── Available Quick Reactions ── */
const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '👏', '💡', '🔥'];

/* ── Utility helpers ── */
const formatTime = (ts) => {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (ts) => {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

const getConvoDisplayName = (convo, currentUid) => {
  if (!convo) return '';
  if (convo.type === 'group') return convo.name || 'Group Chat';
  const otherUid = convo.members?.find((m) => m !== currentUid);
  return (convo.memberNames && convo.memberNames[otherUid]) || 'Direct Message';
};

/* Safely turns URLs in text into clickable <a> elements */
const renderLinkifiedText = (text = '') => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="msg-link"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

/* ──────────────────────────────────────────
   NEW CONVERSATION MODAL
   ────────────────────────────────────────── */
const NewConversationModal = ({ onClose }) => {
  const { allUsers, loadAllUsers, createDirectConversation, createGroupConversation } = useMessaging();

  const [tab, setTab] = useState('direct'); // 'direct' | 'group'
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedUids, setSelectedUids] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAllUsers();
  }, [loadAllUsers]);

  const filteredUsers = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const toggleUser = (uid) => {
    if (tab === 'direct') {
      setSelectedUids([uid]);
    } else {
      setSelectedUids((prev) =>
        prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
      );
    }
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      if (tab === 'direct') {
        if (!selectedUids[0]) return;
        const target = allUsers.find((u) => u.uid === selectedUids[0]);
        await createDirectConversation(
          selectedUids[0],
          target?.fullName || target?.email || 'Unknown'
        );
      } else {
        if (!groupName.trim() || selectedUids.length === 0) return;
        await createGroupConversation(groupName, selectedUids);
      }
      onClose();
    } catch (e) {
      console.error('Failed to create conversation', e);
    } finally {
      setCreating(false);
    }
  };

  const canCreate =
    tab === 'direct' ? selectedUids.length === 1 : groupName.trim() && selectedUids.length >= 1;

  return (
    <div className="msg-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="msg-modal">
        <div className="msg-modal-header">
          <h3>New Conversation</h3>
          <button className="msg-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="msg-modal-body">
          {/* Type selector */}
          <div className="msg-type-tabs">
            <button
              className={`msg-type-tab ${tab === 'direct' ? 'active' : ''}`}
              onClick={() => { setTab('direct'); setSelectedUids([]); }}
            >
              💬 Direct Message
            </button>
            <button
              className={`msg-type-tab ${tab === 'group' ? 'active' : ''}`}
              onClick={() => { setTab('group'); setSelectedUids([]); }}
            >
              👥 Group Chat
            </button>
          </div>

          {/* Group name field */}
          {tab === 'group' && (
            <div className="msg-field">
              <label>Group Name</label>
              <input
                type="text"
                placeholder="e.g. Grade 7 Advisers"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={60}
              />
            </div>
          )}

          {/* User search */}
          <div className="msg-field">
            <label>{tab === 'direct' ? 'Select a person' : 'Add members'}</label>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Selected chips (group only) */}
          {tab === 'group' && selectedUids.length > 0 && (
            <div className="msg-selected-chips">
              {selectedUids.map((uid) => {
                const u = allUsers.find((x) => x.uid === uid);
                return (
                  <span key={uid} className="msg-chip">
                    {u?.fullName || u?.email || uid}
                    <button className="msg-chip-remove" onClick={() => toggleUser(uid)}>×</button>
                  </span>
                );
              })}
            </div>
          )}

          {/* User list */}
          <div className="msg-user-list">
            {filteredUsers.length === 0 ? (
              <div className="msg-no-users">No faculty found</div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.uid}
                  className={`msg-user-item ${selectedUids.includes(u.uid) ? 'selected' : ''}`}
                  onClick={() => toggleUser(u.uid)}
                >
                  <div className="msg-user-avatar">{getInitials(u.fullName || u.email)}</div>
                  <div className="msg-user-info">
                    <div className="msg-user-name">{u.fullName || u.email}</div>
                    <div className="msg-user-role">{(u.role || '').replace('_', ' ')}</div>
                  </div>
                  <div className="msg-user-check">
                    {selectedUids.includes(u.uid) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="msg-modal-actions">
            <button className="msg-modal-cancel" onClick={onClose}>Cancel</button>
            <button
              className="msg-modal-create"
              disabled={!canCreate || creating}
              onClick={handleCreate}
            >
              {creating ? 'Creating…' : tab === 'direct' ? 'Open Chat' : 'Create Group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────
   ADD MEMBERS TO GROUP MODAL
   ────────────────────────────────────────── */
const AddMembersModal = ({ conversation, onClose }) => {
  const { allUsers, loadAllUsers, addMembersToGroup } = useMessaging();
  const [search, setSearch] = useState('');
  const [selectedUids, setSelectedUids] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllUsers();
  }, [loadAllUsers]);

  const existingMembers = conversation?.members || [];
  const availableUsers = allUsers.filter((u) => !existingMembers.includes(u.uid));

  const filteredUsers = availableUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const toggleUser = (uid) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const handleAdd = async () => {
    if (selectedUids.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await addMembersToGroup(conversation.id, selectedUids);
      onClose();
    } catch (e) {
      console.error('Failed to add members', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="msg-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="msg-modal">
        <div className="msg-modal-header">
          <h3>Add Members to Group</h3>
          <button className="msg-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="msg-modal-body">
          <div className="msg-field">
            <label>Select faculty members to add</label>
            <input
              type="text"
              placeholder="Search faculty…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {selectedUids.length > 0 && (
            <div className="msg-selected-chips">
              {selectedUids.map((uid) => {
                const u = allUsers.find((x) => x.uid === uid);
                return (
                  <span key={uid} className="msg-chip">
                    {u?.fullName || u?.email || uid}
                    <button className="msg-chip-remove" onClick={() => toggleUser(uid)}>×</button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="msg-user-list">
            {filteredUsers.length === 0 ? (
              <div className="msg-no-users">No other faculty available to add</div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.uid}
                  className={`msg-user-item ${selectedUids.includes(u.uid) ? 'selected' : ''}`}
                  onClick={() => toggleUser(u.uid)}
                >
                  <div className="msg-user-avatar">{getInitials(u.fullName || u.email)}</div>
                  <div className="msg-user-info">
                    <div className="msg-user-name">{u.fullName || u.email}</div>
                    <div className="msg-user-role">{(u.role || '').replace('_', ' ')}</div>
                  </div>
                  <div className="msg-user-check">
                    {selectedUids.includes(u.uid) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="msg-modal-actions">
            <button className="msg-modal-cancel" onClick={onClose}>Cancel</button>
            <button
              className="msg-modal-create"
              disabled={selectedUids.length === 0 || submitting}
              onClick={handleAdd}
            >
              {submitting ? 'Adding…' : `Add (${selectedUids.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────
   CONVERSATIONS PANEL (left sidebar)
   ────────────────────────────────────────── */
const ConversationsPanel = ({ onNewConvo }) => {
  const { user } = useAuth();
  const { conversations, activeConversation, selectConversation, loadingConversations } = useMessaging();
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    const name = getConvoDisplayName(c, user?.uid).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className={`conv-panel ${activeConversation ? 'has-active' : ''}`}>
      <div className="conv-panel-header">
        <h2>Messages</h2>
        <button className="new-convo-btn" onClick={onNewConvo} title="Start new conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New
        </button>
      </div>

      <div className="conv-search-wrap">
        <span className="conv-search-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          className="conv-search"
          type="text"
          placeholder="Search conversations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="conv-list">
        {loadingConversations ? (
          <div className="conv-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Loading conversations…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="conv-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>{search ? 'No conversations match your search.' : 'No conversations yet. Start one!'}</span>
          </div>
        ) : (
          filtered.map((convo) => {
            const isGroup = convo.type === 'group';
            const displayName = getConvoDisplayName(convo, user?.uid);
            const isActive = activeConversation?.id === convo.id;
            const isUnread = Array.isArray(convo.unreadBy) && convo.unreadBy.includes(user?.uid);

            return (
              <div
                key={convo.id}
                className={`conv-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                onClick={() => selectConversation(convo)}
              >
                <div className={`conv-avatar ${isGroup ? 'group-avatar' : ''}`}>
                  {getInitials(displayName)}
                  {isUnread && <span className="conv-unread-dot" />}
                </div>
                <div className="conv-item-body">
                  <div className="conv-item-row">
                    <span className="conv-item-name">{displayName}</span>
                    <span className="conv-item-time">
                      {convo.lastMessageAt ? formatTime(convo.lastMessageAt) : ''}
                    </span>
                  </div>
                  <div className="conv-item-preview">
                    {convo.lastMessage || (isGroup ? 'Group conversation' : 'Direct message')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────
   CHAT DETAILS DRAWER
   ────────────────────────────────────────── */
const ChatDetailsDrawer = ({ conversation, onClose, onAddMembers, onScrollToMessage }) => {
  const { user } = useAuth();
  const { allUsers, messages, renameGroup, leaveGroup, togglePinMessage } = useMessaging();
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(conversation?.name || '');
  const [leaving, setLeaving] = useState(false);

  const isGroup = conversation?.type === 'group';
  const members = conversation?.members || [];
  const memberNames = conversation?.memberNames || {};
  const pinnedMessages = messages.filter((m) => m.isPinned && !m.deleted);

  const handleSaveName = async () => {
    if (!groupName.trim() || groupName === conversation.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await renameGroup(conversation.id, groupName);
      setIsEditingName(false);
    } catch (e) {
      console.error('Failed to rename group', e);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group conversation?')) return;
    setLeaving(true);
    try {
      await leaveGroup(conversation.id);
      onClose();
    } catch (e) {
      console.error('Failed to leave group', e);
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="chat-details-drawer">
      <div className="drawer-header">
        <h3>Conversation Details</h3>
        <button className="drawer-close" onClick={onClose} title="Close details">✕</button>
      </div>

      <div className="drawer-body">
        {/* Info Card */}
        <div className="drawer-info-card">
          <div className={`drawer-avatar ${isGroup ? 'group' : ''}`}>
            {getInitials(getConvoDisplayName(conversation, user?.uid))}
          </div>
          {isGroup ? (
            isEditingName ? (
              <div className="drawer-edit-name-row">
                <input
                  type="text"
                  className="drawer-edit-input"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                />
                <button className="drawer-save-btn" onClick={handleSaveName}>Save</button>
                <button className="drawer-cancel-btn" onClick={() => setIsEditingName(false)}>✕</button>
              </div>
            ) : (
              <div className="drawer-name-row">
                <h4 className="drawer-name">{conversation.name || 'Group Chat'}</h4>
                <button className="drawer-edit-btn" onClick={() => setIsEditingName(true)} title="Rename Group">
                  ✏️
                </button>
              </div>
            )
          ) : (
            <h4 className="drawer-name">{getConvoDisplayName(conversation, user?.uid)}</h4>
          )}
          <span className="drawer-meta-tag">
            {isGroup ? `Group Chat • ${members.length} members` : 'Direct Message'}
          </span>
        </div>

        {/* Pinned Messages Section */}
        {pinnedMessages.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-title">
              <span>📌 Pinned Messages ({pinnedMessages.length})</span>
            </div>
            <div className="drawer-pinned-list">
              {pinnedMessages.map((m) => (
                <div
                  key={m.id}
                  className="drawer-pinned-item"
                  onClick={() => onScrollToMessage(m.id)}
                >
                  <div className="drawer-pinned-header">
                    <span className="drawer-pinned-author">{m.senderName}</span>
                    <button
                      className="drawer-unpin-btn"
                      title="Unpin message"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinMessage(conversation.id, m.id, true);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <p className="drawer-pinned-text">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members Section (Group Only) */}
        {isGroup && (
          <div className="drawer-section">
            <div className="drawer-section-header">
              <span className="drawer-section-title">Members ({members.length})</span>
              <button className="drawer-add-btn" onClick={onAddMembers}>+ Add Member</button>
            </div>
            <div className="drawer-member-list">
              {members.map((uid) => {
                const isMe = uid === user?.uid;
                const isCreator = uid === conversation.createdBy;
                const userObj = allUsers.find((u) => u.uid === uid);
                const name = isMe
                  ? `${user.fullName || user.displayName || user.email} (You)`
                  : memberNames[uid] || userObj?.fullName || userObj?.email || uid;
                const role = userObj?.role || (isCreator ? 'Creator' : 'Member');

                return (
                  <div key={uid} className="drawer-member-item">
                    <div className="drawer-member-avatar">{getInitials(name)}</div>
                    <div className="drawer-member-info">
                      <div className="drawer-member-name">{name}</div>
                      <div className="drawer-member-role">
                        {isCreator && <span className="drawer-badge-creator">Admin</span>}
                        <span>{role.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Danger zone (Group Only) */}
        {isGroup && (
          <div className="drawer-danger-zone">
            <button
              className="drawer-leave-btn"
              onClick={handleLeaveGroup}
              disabled={leaving}
            >
              {leaving ? 'Leaving…' : 'Leave Group'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────
   CHAT PANEL (main conversation area)
   ────────────────────────────────────────── */
const ChatPanel = ({ onOpenDetails, onAddMembers, isDetailsOpen }) => {
  const { user } = useAuth();
  const {
    activeConversation,
    selectConversation,
    messages,
    loadingMessages,
    sendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
    togglePinMessage,
  } = useMessaging();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);

  // In-chat search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast feedback state
  const [toast, setToast] = useState('');

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const messageRefs = useRef({});

  // Show a quick transient toast
  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  // Auto-scroll to bottom on new message if not editing/searching
  useEffect(() => {
    if (bottomRef.current && !searchQuery) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, searchQuery]);

  // Scroll to a specific message (e.g. pinned or reply jump)
  const scrollToMessage = (msgId) => {
    const el = messageRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('msg-highlight-pulse');
      setTimeout(() => el.classList.remove('msg-highlight-pulse'), 1500);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || sending || !activeConversation) return;

    if (editingMsg) {
      // Editing existing message
      const msgId = editingMsg.id;
      const updatedText = text;
      setEditingMsg(null);
      setText('');
      try {
        await editMessage(activeConversation.id, msgId, updatedText);
        triggerToast('Message updated');
      } catch (e) {
        console.error('Failed to edit message', e);
        triggerToast('Failed to edit message');
      }
      return;
    }

    // Sending new message
    const msg = text;
    const currentReply = replyTo;
    setText('');
    setReplyTo(null);
    setSending(true);
    try {
      await sendMessage(activeConversation.id, msg, currentReply);
    } catch {
      setText(msg); // restore on error
      setReplyTo(currentReply);
      triggerToast('Failed to send message');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      if (replyTo) setReplyTo(null);
      if (editingMsg) {
        setEditingMsg(null);
        setText('');
      }
    }
  };

  const handleStartEdit = (msg) => {
    setEditingMsg(msg);
    setText(msg.text);
    setReplyTo(null);
    textareaRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingMsg(null);
    setText('');
  };

  const handleCopyText = (content) => {
    navigator.clipboard.writeText(content);
    triggerToast('Copied to clipboard');
  };

  const handleInsertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  if (!activeConversation) {
    return (
      <div className="chat-panel empty">
        <div className="chat-empty-state">
          <div className="chat-empty-icon">💬</div>
          <h3>Select a conversation</h3>
          <p>Choose a discussion from the left panel or start a new message to collaborate with colleagues.</p>
        </div>
      </div>
    );
  }

  const displayName = getConvoDisplayName(activeConversation, user?.uid);
  const isGroup = activeConversation.type === 'group';
  const memberCount = activeConversation.members?.length || 0;
  const pinnedMessages = messages.filter((m) => m.isPinned && !m.deleted);

  // Filter messages for in-chat search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => (m.text || '').toLowerCase().includes(q));
  }, [messages, searchQuery]);

  // Group messages by date
  const groupedMessages = [];
  let lastDate = '';
  const displayList = searchQuery ? filteredMessages : messages;

  displayList.forEach((msg) => {
    const dateStr = msg.createdAt ? formatDate(msg.createdAt) : '';
    if (dateStr !== lastDate && !searchQuery) {
      groupedMessages.push({ type: 'divider', date: dateStr });
      lastDate = dateStr;
    }
    groupedMessages.push({ type: 'message', msg });
  });

  let prevSenderId = null;

  return (
    <div className="chat-panel">
      {/* Toast Notification */}
      {toast && <div className="chat-toast">{toast}</div>}

      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button
            className="mobile-back-btn"
            onClick={() => selectConversation(null)}
            title="Back to conversations"
          >
            ←
          </button>
          <div className={`chat-header-avatar ${isGroup ? 'group' : ''}`}>
            {getInitials(displayName)}
          </div>
          <div className="chat-header-info">
            <div className="chat-header-name">{displayName}</div>
            <div className="chat-header-sub">
              {isGroup ? `${memberCount} members` : 'Direct message'}
            </div>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            className={`chat-action-icon-btn ${showSearch ? 'active' : ''}`}
            onClick={() => {
              setShowSearch((prev) => !prev);
              if (showSearch) setSearchQuery('');
            }}
            title="Search in conversation"
          >
            🔍
          </button>
          <button
            className={`chat-action-icon-btn ${isDetailsOpen ? 'active' : ''}`}
            onClick={onOpenDetails}
            title="Conversation Details"
          >
            ℹ️
          </button>
        </div>
      </div>

      {/* In-Chat Search Bar (collapsible) */}
      {showSearch && (
        <div className="chat-search-bar">
          <span className="search-bar-icon">🔍</span>
          <input
            type="text"
            className="chat-search-input"
            placeholder="Search messages in this chat…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <span className="search-results-badge">
              {filteredMessages.length} match{filteredMessages.length === 1 ? '' : 'es'}
            </span>
          )}
          <button
            className="search-close-btn"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Pinned Messages Header Banner */}
      {pinnedMessages.length > 0 && !showSearch && (
        <div
          className="pinned-banner"
          onClick={() => scrollToMessage(pinnedMessages[0].id)}
          title="Click to jump to pinned message"
        >
          <span className="pinned-icon">📌</span>
          <div className="pinned-content">
            <span className="pinned-author">{pinnedMessages[0].senderName}:</span>
            <span className="pinned-text">{pinnedMessages[0].text}</span>
          </div>
          {pinnedMessages.length > 1 && (
            <span className="pinned-count-tag">+{pinnedMessages.length - 1} more</span>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="chat-messages">
        {loadingMessages ? (
          <div className="msg-loading">
            <div className="msg-spinner" />
            Loading messages…
          </div>
        ) : displayList.length === 0 ? (
          <div className="msg-empty-chat">
            {searchQuery ? (
              <span>No messages match "{searchQuery}"</span>
            ) : (
              <>
                <span className="empty-wave">👋</span>
                <span>No messages yet. Say hello!</span>
              </>
            )}
          </div>
        ) : (
          groupedMessages.map((item, idx) => {
            if (item.type === 'divider') {
              return (
                <div key={`divider-${idx}`} className="msg-date-divider">
                  <span>{item.date}</span>
                </div>
              );
            }

            const { msg } = item;
            const isSent = msg.senderId === user?.uid;
            const showAvatar = !isSent && msg.senderId !== prevSenderId;
            prevSenderId = msg.senderId;
            const showSenderName = isGroup && !isSent && showAvatar;
            const isDeleted = msg.deleted;
            const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

            return (
              <div
                key={msg.id}
                ref={(el) => (messageRefs.current[msg.id] = el)}
                className={`msg-row ${isSent ? 'sent' : ''} ${msg.isPinned ? 'is-pinned-msg' : ''}`}
                onMouseLeave={() => activeReactionMsgId === msg.id && setActiveReactionMsgId(null)}
              >
                <div className={`msg-avatar ${showAvatar ? '' : 'hidden'}`}>
                  {showAvatar && getInitials(msg.senderName)}
                </div>

                <div className="msg-bubble-wrap">
                  {showSenderName && (
                    <span className="msg-sender-name">{msg.senderName}</span>
                  )}

                  {/* Quoted Message Preview inside bubble */}
                  {msg.replyTo && (
                    <div
                      className="msg-quoted-preview"
                      onClick={() => scrollToMessage(msg.replyTo.id)}
                    >
                      <span className="quoted-sender">{msg.replyTo.senderName}</span>
                      <span className="quoted-snippet">{msg.replyTo.text}</span>
                    </div>
                  )}

                  {/* Bubble Content with Hover Toolbar */}
                  <div className="msg-bubble-container">
                    <div
                      className={`msg-bubble ${isSent ? 'sent' : 'received'} ${
                        isDeleted ? 'deleted-msg' : ''
                      }`}
                    >
                      {isDeleted ? (
                        <span className="msg-deleted-text">🚫 This message was deleted</span>
                      ) : (
                        renderLinkifiedText(msg.text)
                      )}
                      {msg.edited && !isDeleted && (
                        <span className="msg-edited-badge">(edited)</span>
                      )}
                    </div>

                    {/* Floating Actions Toolbar (Only for active non-deleted messages) */}
                    {!isDeleted && (
                      <div className="msg-actions-toolbar">
                        <button
                          className="msg-action-btn"
                          title="React"
                          onClick={() =>
                            setActiveReactionMsgId(
                              activeReactionMsgId === msg.id ? null : msg.id
                            )
                          }
                        >
                          😀
                        </button>
                        <button
                          className="msg-action-btn"
                          title="Reply"
                          onClick={() => {
                            setReplyTo(msg);
                            setEditingMsg(null);
                            textareaRef.current?.focus();
                          }}
                        >
                          ↩️
                        </button>
                        <button
                          className="msg-action-btn"
                          title={msg.isPinned ? 'Unpin' : 'Pin'}
                          onClick={() =>
                            togglePinMessage(activeConversation.id, msg.id, msg.isPinned)
                          }
                        >
                          📌
                        </button>
                        <button
                          className="msg-action-btn"
                          title="Copy"
                          onClick={() => handleCopyText(msg.text)}
                        >
                          📋
                        </button>
                        {isSent && (
                          <button
                            className="msg-action-btn"
                            title="Edit"
                            onClick={() => handleStartEdit(msg)}
                          >
                            ✏️
                          </button>
                        )}
                        {(isSent || user?.role === 'admin' || user?.role === 'system_admin') && (
                          <button
                            className="msg-action-btn danger"
                            title="Delete"
                            onClick={() => {
                              if (window.confirm('Delete this message for everyone?')) {
                                deleteMessage(activeConversation.id, msg.id);
                              }
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}

                    {/* Emoji Reaction Popover Box */}
                    {activeReactionMsgId === msg.id && (
                      <div className="msg-reaction-popover">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            className="reaction-emoji-btn"
                            onClick={() => {
                              toggleReaction(activeConversation.id, msg.id, emoji);
                              setActiveReactionMsgId(null);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reaction Badges Row */}
                  {hasReactions && !isDeleted && (
                    <div className="msg-reactions-row">
                      {Object.entries(msg.reactions).map(([emoji, uids]) => {
                        if (!Array.isArray(uids) || uids.length === 0) return null;
                        const hasReacted = uids.includes(user?.uid);
                        return (
                          <button
                            key={emoji}
                            className={`msg-reaction-pill ${hasReacted ? 'reacted' : ''}`}
                            onClick={() => toggleReaction(activeConversation.id, msg.id, emoji)}
                            title={`${uids.length} reaction${uids.length === 1 ? '' : 's'}`}
                          >
                            <span className="reaction-emoji">{emoji}</span>
                            <span className="reaction-count">{uids.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="msg-footer">
                    <span className="msg-time">{formatTime(msg.createdAt)}</span>
                    {msg.isPinned && <span className="msg-pinned-tag">📌 Pinned</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply Banner Above Input */}
      {replyTo && (
        <div className="reply-preview-bar">
          <div className="reply-preview-content">
            <span className="reply-preview-title">Replying to {replyTo.senderName}</span>
            <span className="reply-preview-text">{replyTo.text}</span>
          </div>
          <button className="reply-preview-close" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* Editing Banner Above Input */}
      {editingMsg && (
        <div className="edit-preview-bar">
          <div className="edit-preview-content">
            <span className="edit-preview-title">✏️ Editing message</span>
            <span className="edit-preview-text">{editingMsg.text}</span>
          </div>
          <button className="edit-preview-close" onClick={handleCancelEdit}>✕</button>
        </div>
      )}

      {/* Input Bar */}
      <div className="chat-input-bar">
        {/* Quick Emoji Button */}
        <div className="chat-input-prefix">
          <button
            type="button"
            className="emoji-picker-toggle-btn"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Insert emoji"
          >
            😀
          </button>
          {showEmojiPicker && (
            <div className="input-emoji-picker">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="input-emoji-item"
                  onClick={() => handleInsertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="chat-input-wrap">
          <textarea
            ref={textareaRef}
            className="chat-input"
            rows={1}
            placeholder={
              editingMsg
                ? 'Edit your message… (Enter to save, Esc to cancel)'
                : 'Type a message… (Enter to send, Shift+Enter for new line)'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
        </div>

        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          title={editingMsg ? 'Save edit' : 'Send message'}
        >
          {editingMsg ? (
            '✓'
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────── */
const MessagingPage = () => {
  const { activeConversation } = useMessaging();
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <div className={`messaging-page ${isDetailsOpen ? 'details-open' : ''}`}>
        <ConversationsPanel onNewConvo={() => setShowNewModal(true)} />
        <ChatPanel
          onOpenDetails={() => setIsDetailsOpen((prev) => !prev)}
          onAddMembers={() => setShowAddMembersModal(true)}
          isDetailsOpen={isDetailsOpen}
        />
        {isDetailsOpen && activeConversation && (
          <ChatDetailsDrawer
            conversation={activeConversation}
            onClose={() => setIsDetailsOpen(false)}
            onAddMembers={() => setShowAddMembersModal(true)}
            onScrollToMessage={(msgId) => {
              const el = document.getElementById(msgId);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          />
        )}
      </div>

      {showNewModal && <NewConversationModal onClose={() => setShowNewModal(false)} />}
      {showAddMembersModal && activeConversation && (
        <AddMembersModal
          conversation={activeConversation}
          onClose={() => setShowAddMembersModal(false)}
        />
      )}
    </>
  );
};

export default MessagingPage;
