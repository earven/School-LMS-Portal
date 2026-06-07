import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
  const [items, setItems] = useState([]); // Teacher Assignments
  const [masterItems, setMasterItems] = useState([]); // Master Catalog
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !user.role || user.role === 'pending') {
      setItems([]);
      setMasterItems([]);
      setLoading(false);
      return;
    }

    let q;
    if (user.role === 'admin' || user.role === 'system_admin') {
      q = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'inventory'), 
        where('assignedTo', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }
    
    // 1. Fetch Master Inventory
    const masterQuery = query(collection(db, 'master_inventory'), orderBy('createdAt', 'desc'));
    const unsubscribeMaster = onSnapshot(masterQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMasterItems(data);
    }, (error) => {
      console.error("Error fetching master inventory: ", error);
      alert("Error reading Master Inventory: " + error.message);
    });

    // 2. Fetch Assignments
    const unsubscribeAssignments = onSnapshot(q, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(inventoryData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching inventory assignments: ", error);
      setLoading(false);
    });

    return () => {
      unsubscribeMaster();
      unsubscribeAssignments();
    };
  }, [user]);

  const addItem = async (itemData) => {
    try {
      await addDoc(collection(db, 'inventory'), {
        ...itemData,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding inventory item: ", error);
      throw error;
    }
  };

  const updateItem = async (id, itemData) => {
    try {
      const itemRef = doc(db, 'inventory', id);
      await updateDoc(itemRef, itemData);
    } catch (error) {
      console.error("Error updating inventory item: ", error);
      throw error;
    }
  };

  const deleteItem = async (id) => {
    try {
      const itemRef = doc(db, 'inventory', id);
      await deleteDoc(itemRef);
    } catch (error) {
      console.error("Error deleting inventory assignment: ", error);
      throw error;
    }
  };

  // Master Inventory CRUD
  const addMasterItem = async (itemData) => {
    try {
      await addDoc(collection(db, 'master_inventory'), {
        ...itemData,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding master inventory item: ", error);
      throw error;
    }
  };

  const updateMasterItem = async (id, itemData) => {
    try {
      const itemRef = doc(db, 'master_inventory', id);
      await updateDoc(itemRef, itemData);
    } catch (error) {
      console.error("Error updating master inventory item: ", error);
      throw error;
    }
  };

  const deleteMasterItem = async (id) => {
    try {
      const itemRef = doc(db, 'master_inventory', id);
      await deleteDoc(itemRef);
    } catch (error) {
      console.error("Error deleting master inventory item: ", error);
      throw error;
    }
  };

  const value = {
    items,
    masterItems,
    loading,
    addItem,
    updateItem,
    deleteItem,
    addMasterItem,
    updateMasterItem,
    deleteMasterItem
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
