import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  // Your Firebase configuration
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test Firestore connection
export const testConnection = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'your-collection-name')); // 適切なコレクション名を使用してください
    
    const result = querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    
    // Handle the result in a proper way, such as returning or dispatching it
    return result;
    
  } catch (error) {
    // Handle the error properly, such as logging it to a monitoring service
    throw new Error('Firestore connection error: ' + error.message);
  }
};
