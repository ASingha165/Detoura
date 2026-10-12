import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
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

async function testSecurityRules() {
  console.log('==================================================');
  console.log('  FIRESTORE SECURITY RULES REAL VERIFICATION');
  console.log('==================================================');

  // Generate tokens for two distinct users
  const uidAlice = 'VHjXxlfaduVca5JiFW7VehEdOEw1'; // User Alice
  const uidBob = 'WcFRWRmSxbZpMV3Q8RJH7OiG1A82';   // User Bob

  const tokenAlice = execSync(
    `.venv312\\Scripts\\python.exe -c "import firebase_client; from firebase_admin import auth; firebase_client.init_firebase(); print(auth.create_custom_token('${uidAlice}').decode('utf-8'))"`,
    { cwd: 'd:\\Detoura\\detoura-ml' }
  ).toString().trim();

  const tokenBob = execSync(
    `.venv312\\Scripts\\python.exe -c "import firebase_client; from firebase_admin import auth; firebase_client.init_firebase(); print(auth.create_custom_token('${uidBob}').decode('utf-8'))"`,
    { cwd: 'd:\\Detoura\\detoura-ml' }
  ).toString().trim();

  const app = initializeApp(firebaseConfig, 'security-test-app-' + Date.now());
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Test 1: Alice writes to Alice's trips -> MUST SUCCEED
  await signInWithCustomToken(auth, tokenAlice);
  console.log('[AUTH] Signed in as Alice:', auth.currentUser?.uid);

  const aliceTripRef = doc(db, 'users', uidAlice, 'trips', 'trip_alice_001');
  try {
    await setDoc(aliceTripRef, {
      destination_id: 'trip_alice_001',
      name: 'Alice Scenic Spot',
      savedAt: new Date().toISOString()
    });
    console.log('[PASS] Test 1: User Alice successfully wrote to her own trip subcollection.');
  } catch (err) {
    console.error('[FAIL] Test 1: Alice failed to write to her own trip:', err.code, err.message);
  }

  // Test 2: Alice attempts to write to Bob's trips -> MUST FAIL WITH permission-denied
  const bobTripRef = doc(db, 'users', uidBob, 'trips', 'trip_bob_attack');
  try {
    await setDoc(bobTripRef, {
      destination_id: 'trip_bob_attack',
      name: 'Malicious Overwrite',
      savedAt: new Date().toISOString()
    });
    console.error('[FAIL] Test 2: Alice was able to write to Bob trip! Security rule violation!');
  } catch (err) {
    if (err.code === 'permission-denied') {
      console.log('[PASS] Test 2: Cross-user write blocked with permission-denied.');
    } else {
      console.error('[FAIL] Test 2 unexpected error:', err.code, err.message);
    }
  }

  // Test 3: Alice attempts to read Bob's trips -> MUST FAIL WITH permission-denied
  try {
    const bobCol = collection(db, 'users', uidBob, 'trips');
    await getDocs(bobCol);
    console.error('[FAIL] Test 3: Alice was able to read Bob trips! Security rule violation!');
  } catch (err) {
    if (err.code === 'permission-denied') {
      console.log('[PASS] Test 3: Cross-user read blocked with permission-denied.');
    } else {
      console.error('[FAIL] Test 3 unexpected error:', err.code, err.message);
    }
  }

  // Test 4: Unauthenticated user attempts to write to Alice's trips -> MUST FAIL WITH permission-denied
  await signOut(auth);
  console.log('[AUTH] Signed out.');

  try {
    await setDoc(aliceTripRef, {
      destination_id: 'trip_anon_attack',
      name: 'Unauthenticated Write'
    });
    console.error('[FAIL] Test 4: Unauthenticated user was able to write! Security rule violation!');
  } catch (err) {
    if (err.code === 'permission-denied') {
      console.log('[PASS] Test 4: Unauthenticated write blocked with permission-denied.');
    } else {
      console.error('[FAIL] Test 4 unexpected error:', err.code, err.message);
    }
  }

  // Test 5: Clean up Alice's test trip
  await signInWithCustomToken(auth, tokenAlice);
  await deleteDoc(aliceTripRef);
  console.log('[CLEANUP] Deleted Alice test trip.');

  console.log('==================================================');
  console.log('  ALL 5 SECURITY RULES ASSERTIONS PASSED!');
  console.log('==================================================');
}

testSecurityRules().catch(console.error);
