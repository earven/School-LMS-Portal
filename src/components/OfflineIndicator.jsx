import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import './OfflineIndicator.css';

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showSyncedNotice, setShowSyncedNotice] = useState(false);
  const attendanceContext = useAttendance();
  const pendingSyncCount = attendanceContext?.pendingSyncCount || 0;
  const isSyncing = attendanceContext?.isSyncing || false;
  const syncOfflineQueue = attendanceContext?.syncOfflineQueue;

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowSyncedNotice(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show briefly "All changes synced" when count reaches 0 after having been > 0 while online
  useEffect(() => {
    if (!isOffline && pendingSyncCount === 0 && !isSyncing) {
      // transient toast can be triggered if needed
    }
  }, [isOffline, pendingSyncCount, isSyncing]);

  if (!isOffline && pendingSyncCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className={`offline-indicator ${isOffline ? 'is-offline' : 'is-syncing-banner'}`}>
      <span className="offline-icon">
        {isOffline ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
        ) : (
          <svg className="spin-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
        )}
      </span>
      <span className="offline-text">
        {isOffline ? (
          <>
            You are currently offline. Changes are saved locally and will automatically sync when you reconnect.
            {pendingSyncCount > 0 && <strong className="offline-badge"> ({pendingSyncCount} pending {pendingSyncCount === 1 ? 'batch' : 'batches'})</strong>}
          </>
        ) : isSyncing ? (
          <>Syncing {pendingSyncCount} offline record {pendingSyncCount === 1 ? 'batch' : 'batches'} to cloud database...</>
        ) : (
          <>
            You have {pendingSyncCount} offline {pendingSyncCount === 1 ? 'change' : 'changes'} pending synchronization.
            {syncOfflineQueue && (
              <button 
                type="button"
                className="btn-sync-now"
                onClick={() => syncOfflineQueue()}
              >
                Sync Now
              </button>
            )}
          </>
        )}
      </span>
    </div>
  );
};

export default OfflineIndicator;
