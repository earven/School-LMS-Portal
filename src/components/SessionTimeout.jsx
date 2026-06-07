import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SessionTimeout = ({ timeoutMinutes = 15, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const timeoutId = useRef(null);
  
  // 15 minutes in milliseconds
  const TIMEOUT_MS = timeoutMinutes * 60 * 1000;

  const resetTimer = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    
    // Only set timer if user is logged in
    if (user) {
      timeoutId.current = setTimeout(async () => {
        try {
          await logout();
          alert("Your session has expired due to inactivity. Please log in again.");
          navigate('/login');
        } catch (error) {
          console.error("Auto-logout failed:", error);
        }
      }, TIMEOUT_MS);
    }
  };

  useEffect(() => {
    // Events that denote user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimer();
    };

    if (user) {
      // Set initial timer
      resetTimer();
      // Add event listeners
      events.forEach(event => document.addEventListener(event, handleActivity));
    }

    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [user]);

  return <>{children}</>;
};

export default SessionTimeout;
