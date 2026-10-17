import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { useAuth } from './AuthContext.jsx';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  getDocs,
  serverTimestamp,
  arrayRemove,
} from 'firebase/firestore';

const MessagingContext = createContext(null);

export const MessagingProvider = ({ children }) => {
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  const messagesUnsubRef = useRef(null);

  // ── Load all conversations where current user is a member ──
  useEffect(() => {
    if (!user?.uid) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    setLoadingConversations(true);
    const q = query(
      collection(db, 'conversations'),
      where('members', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const convos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setConversations(convos);
        setLoadingConversations(false);
      },
      (err) => {
        console.error('MessagingContext: conversations snapshot error', err);
        setLoadingConversations(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // ── Load messages for the active conversation ──
  useEffect(() => {
    if (messagesUnsubRef.current) {
      messagesUnsubRef.current();
      messagesUnsubRef.current = null;
    }

    if (!activeConversation?.id) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const q = query(
      collection(db, 'conversations', activeConversation.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
        setLoadingMessages(false);
      },
      (err) => {
        console.error('MessagingContext: messages snapshot error', err);
        setLoadingMessages(false);
      }
    );

    messagesUnsubRef.current = unsub;
    return () => {
      if (messagesUnsubRef.current) messagesUnsubRef.current();
    };
  }, [activeConversation?.id]);

  // ── Mark conversation as read when selected ──
  const markConversationRead = useCallback(
    async (conversationId) => {
      if (!user?.uid || !conversationId) return;
      try {
        const convRef = doc(db, 'conversations', conversationId);
        await updateDoc(convRef, {
          unreadBy: arrayRemove(user.uid),
        });
      } catch (e) {
        console.error('markConversationRead error', e);
      }
    },
    [user]
  );

  // Select a conversation and immediately mark it read
  const selectConversation = useCallback(
    (convo) => {
      setActiveConversation(convo);
      if (convo?.id) markConversationRead(convo.id);
    },
    [markConversationRead]
  );

  // ── Send a message (with optional replyTo) ──
  const sendMessage = useCallback(
    async (conversationId, text, replyTo = null) => {
      if (!user?.uid || !conversationId || !text.trim()) return;
      try {
        const msgRef = collection(db, 'conversations', conversationId, 'messages');
        const msgPayload = {
          senderId: user.uid,
          senderName: user.fullName || user.displayName || user.email || 'Unknown',
          text: text.trim(),
          createdAt: serverTimestamp(),
          readBy: [user.uid],
          reactions: {},
          isPinned: false,
          edited: false,
          deleted: false,
        };

        if (replyTo && replyTo.id) {
          msgPayload.replyTo = {
            id: replyTo.id,
            senderName: replyTo.senderName || 'Unknown',
            text: (replyTo.text || '').slice(0, 150),
          };
        }

        await addDoc(msgRef, msgPayload);

        // Update conversation metadata — mark everyone except sender as unread
        const convo = conversations.find((c) => c.id === conversationId);
        const otherMembers = convo ? convo.members.filter((m) => m !== user.uid) : [];

        const convRef = doc(db, 'conversations', conversationId);
        await updateDoc(convRef, {
          lastMessage: text.trim().slice(0, 100),
          lastMessageAt: serverTimestamp(),
          lastMessageBy: user.uid,
          unreadBy: otherMembers,
        });
      } catch (e) {
        console.error('sendMessage error', e);
        throw e;
      }
    },
    [user, conversations]
  );

  // ── Toggle Reaction on Message ──
  const toggleReaction = useCallback(
    async (conversationId, messageId, emoji) => {
      if (!user?.uid || !conversationId || !messageId || !emoji) return;
      try {
        const targetMsg = messages.find((m) => m.id === messageId);
        const currentReactions = targetMsg?.reactions || {};
        const currentUids = Array.isArray(currentReactions[emoji]) ? currentReactions[emoji] : [];
        
        let updatedReactions = { ...currentReactions };
        if (currentUids.includes(user.uid)) {
          const filtered = currentUids.filter((id) => id !== user.uid);
          if (filtered.length > 0) {
            updatedReactions[emoji] = filtered;
          } else {
            delete updatedReactions[emoji];
          }
        } else {
          updatedReactions[emoji] = [...currentUids, user.uid];
        }

        const msgDocRef = doc(db, 'conversations', conversationId, 'messages', messageId);
        await updateDoc(msgDocRef, {
          reactions: updatedReactions,
        });
      } catch (e) {
        console.error('toggleReaction error', e);
        throw e;
      }
    },
    [user, messages]
  );

  // ── Edit Message ──
  const editMessage = useCallback(
    async (conversationId, messageId, newText) => {
      if (!user?.uid || !conversationId || !messageId || !newText.trim()) return;
      try {
        const msgDocRef = doc(db, 'conversations', conversationId, 'messages', messageId);
        await updateDoc(msgDocRef, {
          text: newText.trim(),
          edited: true,
          editedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error('editMessage error', e);
        throw e;
      }
    },
    [user]
  );

  // ── Delete Message (Soft delete) ──
  const deleteMessage = useCallback(
    async (conversationId, messageId) => {
      if (!user?.uid || !conversationId || !messageId) return;
      try {
        const msgDocRef = doc(db, 'conversations', conversationId, 'messages', messageId);
        await updateDoc(msgDocRef, {
          deleted: true,
          text: 'This message was deleted',
          deletedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error('deleteMessage error', e);
        throw e;
      }
    },
    [user]
  );

  // ── Toggle Pin Message ──
  const togglePinMessage = useCallback(
    async (conversationId, messageId, currentPinnedState) => {
      if (!user?.uid || !conversationId || !messageId) return;
      try {
        const msgDocRef = doc(db, 'conversations', conversationId, 'messages', messageId);
        await updateDoc(msgDocRef, {
          isPinned: !currentPinnedState,
          pinnedAt: !currentPinnedState ? serverTimestamp() : null,
          pinnedBy: !currentPinnedState ? (user.fullName || user.displayName || user.email || 'Someone') : null,
        });
      } catch (e) {
        console.error('togglePinMessage error', e);
        throw e;
      }
    },
    [user]
  );

  // ── Add Members to Group ──
  const addMembersToGroup = useCallback(
    async (conversationId, newMemberUids) => {
      if (!user?.uid || !conversationId || !newMemberUids?.length) return;
      try {
        const convo = conversations.find((c) => c.id === conversationId);
        if (!convo) return;

        const updatedMembers = [...new Set([...(convo.members || []), ...newMemberUids])];
        const updatedMemberNames = { ...(convo.memberNames || {}) };

        for (const uid of newMemberUids) {
          const found = allUsers.find((u) => u.uid === uid);
          if (found) {
            updatedMemberNames[uid] = found.fullName || found.displayName || found.email || 'Unknown';
          }
        }

        const convRef = doc(db, 'conversations', conversationId);
        await updateDoc(convRef, {
          members: updatedMembers,
          memberNames: updatedMemberNames,
        });
      } catch (e) {
        console.error('addMembersToGroup error', e);
        throw e;
      }
    },
    [user, conversations, allUsers]
  );

  // ── Leave Group ──
  const leaveGroup = useCallback(
    async (conversationId) => {
      if (!user?.uid || !conversationId) return;
      try {
        const convRef = doc(db, 'conversations', conversationId);
        await updateDoc(convRef, {
          members: arrayRemove(user.uid),
        });
        setActiveConversation(null);
      } catch (e) {
        console.error('leaveGroup error', e);
        throw e;
      }
    },
    [user]
  );

  // ── Rename Group ──
  const renameGroup = useCallback(
    async (conversationId, newName) => {
      if (!user?.uid || !conversationId || !newName.trim()) return;
      try {
        const convRef = doc(db, 'conversations', conversationId);
        await updateDoc(convRef, {
          name: newName.trim(),
        });
      } catch (e) {
        console.error('renameGroup error', e);
        throw e;
      }
    },
    [user]
  );

  // ── Create or open a Direct Message conversation ──
  const createDirectConversation = useCallback(
    async (targetUid, targetName) => {
      if (!user?.uid || !targetUid) return null;
      // Check if DM already exists
      const existing = conversations.find(
        (c) => c.type === 'direct' && c.members.includes(targetUid) && c.members.includes(user.uid)
      );
      if (existing) {
        selectConversation(existing);
        return existing;
      }

      try {
        const myName = user.fullName || user.displayName || user.email || 'Unknown';
        const convData = {
          type: 'direct',
          name: '',
          members: [user.uid, targetUid],
          memberNames: {
            [user.uid]: myName,
            [targetUid]: targetName,
          },
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          lastMessageBy: user.uid,
          unreadBy: [],
        };
        const ref = await addDoc(collection(db, 'conversations'), convData);
        const newConvo = { id: ref.id, ...convData };
        selectConversation(newConvo);
        return newConvo;
      } catch (e) {
        console.error('createDirectConversation error', e);
        throw e;
      }
    },
    [user, conversations, selectConversation]
  );

  // ── Create a Group Conversation ──
  const createGroupConversation = useCallback(
    async (name, memberUids) => {
      if (!user?.uid || !name.trim() || !memberUids.length) return null;
      try {
        // Fetch names for member UIDs
        const myName = user.fullName || user.displayName || user.email || 'Unknown';
        const allMemberUids = [...new Set([user.uid, ...memberUids])];

        // Build memberNames map
        const memberNames = { [user.uid]: myName };
        const usersToFetch = allMemberUids.filter((uid) => uid !== user.uid);
        for (const uid of usersToFetch) {
          const found = allUsers.find((u) => u.uid === uid);
          if (found) {
            memberNames[uid] = found.fullName || found.displayName || found.email || 'Unknown';
          }
        }

        const convData = {
          type: 'group',
          name: name.trim(),
          members: allMemberUids,
          memberNames,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          lastMessageBy: user.uid,
          unreadBy: [],
        };
        const ref = await addDoc(collection(db, 'conversations'), convData);
        const newConvo = { id: ref.id, ...convData };
        selectConversation(newConvo);
        return newConvo;
      } catch (e) {
        console.error('createGroupConversation error', e);
        throw e;
      }
    },
    [user, allUsers, selectConversation]
  );

  // ── Load all users (for the user-picker in new conversation modal) ──
  const loadAllUsers = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('role', 'in', ['teacher', 'admin', 'system_admin']))
      );
      const users = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => u.uid !== user.uid);
      setAllUsers(users);
    } catch (e) {
      console.error('loadAllUsers error', e);
    }
  }, [user]);

  // Total unread count (conversations where current user is in unreadBy)
  const totalUnreadCount = conversations.filter(
    (c) => Array.isArray(c.unreadBy) && c.unreadBy.includes(user?.uid)
  ).length;

  const contextValue = useMemo(() => ({
    conversations,
    activeConversation,
    selectConversation,
    messages,
    loadingConversations,
    loadingMessages,
    sendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
    togglePinMessage,
    addMembersToGroup,
    leaveGroup,
    renameGroup,
    createDirectConversation,
    createGroupConversation,
    markConversationRead,
    totalUnreadCount,
    allUsers,
    loadAllUsers,
  }), [
    conversations,
    activeConversation,
    selectConversation,
    messages,
    loadingConversations,
    loadingMessages,
    sendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
    togglePinMessage,
    addMembersToGroup,
    leaveGroup,
    renameGroup,
    createDirectConversation,
    createGroupConversation,
    markConversationRead,
    totalUnreadCount,
    allUsers,
    loadAllUsers,
  ]);

  return (
    <MessagingContext.Provider value={contextValue}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = () => {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used within a MessagingProvider');
  return ctx;
};
