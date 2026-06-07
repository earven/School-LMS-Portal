import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

// Read config from src/firebase.js to get options
const firebaseContent = fs.readFileSync('src/firebase.js', 'utf8');
const configMatch = firebaseContent.match(/const firebaseConfig = ({[\s\S]+?});/);
if (!configMatch) {
  console.error("Could not find firebaseConfig in firebase.js");
  process.exit(1);
}

// Convert string representation of object to actual object
const configObj = eval('(' + configMatch[1] + ')');

const app = initializeApp(configObj);
const db = getFirestore(app);

const querySnapshot = await getDocs(collection(db, 'users'));
querySnapshot.forEach((doc) => {
  console.log(`${doc.id} =>`, doc.data());
});
