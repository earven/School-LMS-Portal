import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const mapAuthError = (error) => {
    const code = error?.code || '';

    switch (code) {
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
      default:
        return 'Unable to sign in right now. Please try again.';
    }
  };

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
      setLoading(false);
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

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, resetPassword, updateUserProfile, acceptDPA, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
