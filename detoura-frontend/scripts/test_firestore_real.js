import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { execSync } from 'child_process';

const firebaseConfig = {
  apiKey: "AIzaSyCtt4c-ROEQk-8xpANCudvxORPzD6w0kEQ",
  authDomain: "detoura-f8a96.firebaseapp.com",
  projectId: "detoura-f8a96",
  storageBucket: "detoura-f8a96.firebasestorage.app",
  messagingSenderId: "857249385672",
  appId: "1:857249385672:web:0d3b0a1638d7abed91a9fd"
};

async function test() {
  console.log('--- Testing Firestore Direct Client SDK ---');
  
  // 1. Get fresh custom token for user VHjXxlfaduVca5JiFW7VehEdOEw1
  const cmd = `.venv312\\Scripts\\python.exe -c "import firebase_client; from firebase_admin import auth; firebase_client.init_firebase(); print(auth.create_custom_token('VHjXxlfaduVca5JiFW7VehEdOEw1').decode('utf-8'))"`;
  const token = execSync(cmd, { cwd: 'd:\\Detoura\\detoura-ml' }).toString().trim();
  console.log('Custom token generated successfully.');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const cred = await signInWithCustomToken(auth, token);
  console.log('Logged in as user:', cred.user.uid, cred.user.email);

  const uid = cred.user.uid;
  const testTripRef = doc(db, 'users', uid, 'trips', 'test_trip_darjeeling');

  console.log(`Writing trip to users/${uid}/trips/test_trip_darjeeling ...`);
  try {
    await setDoc(testTripRef, {
      destination_id: 'WB_DAR_001',
      name: 'Darjeeling Himalayan Railway',
      district: 'Darjeeling',
      category: 'Heritage',
      estimated_daily_inr: 2800,
      budget_tier: 2,
      savedAt: new Date().toISOString()
    });
    console.log('[SUCCESS] Trip document successfully written to Cloud Firestore!');

    // Read it back
    const snap = await getDoc(testTripRef);
    if (snap.exists()) {
      console.log('[SUCCESS] Verified reading back trip document:', snap.id, snap.data());
    }

    // List all trips
    const tripsCol = collection(db, 'users', uid, 'trips');
    const allSnaps = await getDocs(tripsCol);
    console.log(`[SUCCESS] Found ${allSnaps.size} trips in users/${uid}/trips:`);
    allSnaps.forEach(d => console.log(' - Trip:', d.id, d.data().name));

    // Delete test trip
    await deleteDoc(testTripRef);
    console.log('[SUCCESS] Successfully cleaned up test trip document.');
  } catch (err) {
    console.error('[ERROR] Firestore operation failed:', err);
  }
}

test();
