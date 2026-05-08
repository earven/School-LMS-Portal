// src/utils/migrateLocalStorageToFirestore.js
import { db } from '../firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();

const migrateData = async () => {
  console.log("Starting data migration from localStorage to Firestore...");

  // Migrate Students
  const studentsData = JSON.parse(localStorage.getItem('studentsData'));
  if (studentsData && studentsData.length > 0) {
    console.log("Migrating students...");
    for (const student of studentsData) {
      try {
        await setDoc(doc(db, "students", student.id), {
          ...student,
          sectionId: student.section, // Map old 'section' to new 'sectionId'
          section: null, // Clear old 'section' field
        });
        console.log(`Migrated student: ${student.fullName}`);
      } catch (e) {
        console.error("Error migrating student:", student.fullName, e);
      }
    }
    console.log("Students migration complete.");
  } else {
    console.log("No students data found in localStorage to migrate.");
  }

  // Migrate Personnel (Users)
  const personnelData = JSON.parse(localStorage.getItem('personnelData'));
  if (personnelData && personnelData.length > 0) {
    console.log("Migrating personnel (users)...");
    for (const person of personnelData) {
      try {
        // For demonstration, we'll create Firebase Auth users with dummy passwords
        // In a real app, you'd handle user creation more securely, or link existing Auth users
        const email = `${person.username}@schoolemail.com`; // Dummy email
        const password = 'password123'; // Dummy password

        let firebaseAuthUid = person.id; // Default to old ID, update if Auth user created

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          firebaseAuthUid = userCredential.user.uid;
          console.log(`Created Firebase Auth user for ${person.fullName}: ${email}`);
        } catch (authError) {
          if (authError.code === 'auth/email-already-in-use') {
            console.warn(`Firebase Auth user for ${email} already exists. Skipping Auth creation for this user.`);
            // You might want to try to find the existing UID here if it's not the person.id
          } else {
            console.error(`Error creating Firebase Auth user for ${person.fullName} (${email}):`, authError);
            continue; // Skip Firestore doc if Auth creation failed (unless already exists)
          }
        }
        
        // Use setDoc with the Auth UID as the document ID for the 'users' collection
        await setDoc(doc(db, "users", firebaseAuthUid), {
          fullName: person.fullName,
          email: email,
          position: person.position,
          role: person.role,
          // If 'assignedSections' exists in original data, migrate it, otherwise empty array
          assignedSections: person.assignedSections || [], 
        });
        console.log(`Migrated personnel document for: ${person.fullName} (UID: ${firebaseAuthUid})`);
      } catch (e) {
        console.error("Error migrating personnel:", person.fullName, e);
      }
    }
    console.log("Personnel migration complete.");
  } else {
    console.log("No personnel data found in localStorage to migrate.");
  }

  console.log("Data migration process finished.");
  alert("Data migration from localStorage to Firestore complete! Check console for details.");
};

export default migrateData;