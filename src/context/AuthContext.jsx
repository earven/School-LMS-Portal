import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user document from Firestore to get roles
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUser({ ...firebaseUser, ...userDoc.data() });
        } else {
          // If no user doc, default to a basic user object
          setUser(firebaseUser);
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
      // User state will be updated by onAuthStateChanged listener
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error("Firebase Login Error:", error);
      return { success: false, error: error.message };
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

  if (loading) {
    return <div>Loading authentication...</div>; // Simple loading indicator
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
