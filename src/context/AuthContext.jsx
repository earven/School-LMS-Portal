import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const mapAuthError = (error) => {
    const code = error?.code || '';

    switch (code) {
      // ── Email / password errors ───────────────────────────────────────────
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';

      // ── Google Sign-In specific errors ───────────────────────────────────
      case 'auth/popup-blocked':
        return 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled. Please try again.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email address using a different sign-in method. Try signing in with your email and password instead.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for Google Sign-In. Please contact your administrator.';

      default:
        return 'Unable to sign in right now. Please try again.';
    }
  };

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Wrap everything in try/finally so setLoading(false) ALWAYS runs.
      // Without this, if getDoc() or setDoc() throws (e.g. network drop or
      // a Firestore permission error), the exception would skip setLoading(false)
      // and leave the user stuck on an infinite spinner with no way to recover.
      try {
        if (firebaseUser) {
          // Fetch user document from Firestore to get roles
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setUser({ ...firebaseUser, ...userDoc.data(), uid: firebaseUser.uid });
          } else {
            // If no user doc, create one with pending role so they are forced to enter the registration code
            const newUserDoc = {
              email: firebaseUser.email,
              firstName: firebaseUser.displayName?.split(' ')[0] || '',
              lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
              role: 'pending', // Requires registration code to become 'teacher'
              photoURL: firebaseUser.photoURL || '',
              hasAcceptedDPA: false,
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(userDocRef, newUserDoc);
              setUser({ ...firebaseUser, ...newUserDoc, uid: firebaseUser.uid });
            } catch (err) {
              console.error("Error creating user doc:", err);
              setUser(firebaseUser);
            }
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        // If anything above threw unexpectedly (e.g. getDoc permission error),
        // log it and clear the user so the app doesn't stay in a broken state.
        console.error("onAuthStateChanged error:", err);
        setUser(null);
      } finally {
        // This ALWAYS runs — no more infinite spinner.
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      // We do NOT set loading to false here. 
      // We wait for the onAuthStateChanged listener in the useEffect above to 
      // finish fetching the Firestore document and setting the user role.
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error("Firebase Login Error:", error);
      return { success: false, error: mapAuthError(error) };
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Wait for onAuthStateChanged to sync Firestore roles
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error("Google Login Error:", error);
      return { success: false, error: mapAuthError(error) };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Firebase Password Reset Error:', error);
      return { success: false, error: mapAuthError(error) };
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      // User state will be updated by onAuthStateChanged listener
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error("Firebase Logout Error:", error);
      return { success: false, error: error.message };
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user || !user.uid) return { success: false, error: 'No user signed in' };
    
    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      
      await updateDoc(userDocRef, updates);
      
      setUser(prev => ({ ...prev, ...updates }));
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error("Update Profile Error:", error);
      return { success: false, error: error.message };
    }
  };

  const acceptDPA = async () => {
    if (!user || !user.uid) return { success: false, error: 'No user signed in' };
    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { hasAcceptedDPA: true });
      setUser(prev => ({ ...prev, hasAcceptedDPA: true }));
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error("Accept DPA Error:", error);
      return { success: false, error: error.message };
    }
  };

  const contextValue = useMemo(() => ({
    user,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    acceptDPA,
    loading
  }), [user, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
