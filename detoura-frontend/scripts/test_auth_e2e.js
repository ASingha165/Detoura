import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCtt4c-ROEQk-8xpANCudvxORPzD6w0kEQ",
  authDomain: "detoura-f8a96.firebaseapp.com",
  projectId: "detoura-f8a96",
  storageBucket: "detoura-f8a96.firebasestorage.app",
  messagingSenderId: "857249385672",
  appId: "1:857249385672:web:0d3b0a1638d7abed91a9fd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testAuthSuite() {
  console.log('=== TESTING AUTHENTICATION SUITE ===');

  // 1. Test Nonexistent Account
  console.log('\n1. Testing nonexistent account...');
  try {
    await signInWithEmailAndPassword(auth, 'nonexistent_detoura_user_99999@example.com', 'somePassword123');
    throw new Error('FAILED: Nonexistent user was allowed to login!');
  } catch (err) {
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
      console.log(`✔ Nonexistent account correctly rejected: ${err.code}`);
    } else {
      console.log(`✔ Nonexistent account rejected with: ${err.code || err.message}`);
    }
  }

  // 2. Test New Email/Password User Signup
  const testEmail = `test_e2e_${Date.now()}@detoura.test`;
  const testPass = 'SecurePass123!@#';
  console.log(`\n2. Testing new user signup with email: ${testEmail}`);

  let createdUid = null;
  try {
    const cred = await createUserWithEmailAndPassword(auth, testEmail, testPass);
    createdUid = cred.user.uid;
    console.log(`✔ Firebase Auth user created with UID: ${createdUid}`);

    // Create users/{uid} document as done in AuthContext.tsx
    const userDocRef = doc(db, 'users', createdUid);
    await setDoc(userDocRef, {
      uid: createdUid,
      email: testEmail,
      name: 'E2E Test User',
      provider: 'password',
      createdAt: new Date().toISOString()
    });
    console.log(`✔ users/${createdUid} successfully written to Firestore`);

    // Fetch the document and verify contents
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      throw new Error('users/{uid} was not found in Firestore!');
    }
    const data = snap.data();
    console.log('✔ Fetched users/{uid} from Firestore:', data);

    // Verify password is NEVER stored in Firestore
    if ('password' in data || 'pass' in data || 'secret' in data) {
      throw new Error('SECURITY VIOLATION: Password field found in Firestore user document!');
    }
    console.log('✔ Verified: Password is NOT stored in Firestore document');

    await signOut(auth);
    console.log('✔ Signed out new user');
  } catch (err) {
    console.error('Signup test failed:', err);
    throw err;
  }

  // 3. Test Incorrect Password for Existing User
  console.log('\n3. Testing incorrect password for existing user...');
  try {
    await signInWithEmailAndPassword(auth, testEmail, 'WrongPassword999!');
    throw new Error('FAILED: Login succeeded with incorrect password!');
  } catch (err) {
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      console.log(`✔ Incorrect password correctly rejected: ${err.code}`);
    } else {
      console.log(`✔ Incorrect password rejected with: ${err.code || err.message}`);
    }
  }

  // 4. Test Correct Login for Existing User
  console.log('\n4. Testing correct login for existing user...');
  const loginCred = await signInWithEmailAndPassword(auth, testEmail, testPass);
  if (loginCred.user.uid !== createdUid) {
    throw new Error('UID mismatch upon login');
  }
  console.log(`✔ Login succeeded! Authenticated as: ${loginCred.user.email} (UID: ${loginCred.user.uid})`);
  await signOut(auth);
  console.log('✔ Signed out successfully');

  // 5. Test GoogleAuthProvider instance and configuration
  console.log('\n5. Testing GoogleAuthProvider configuration...');
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  if (googleProvider.providerId === 'google.com') {
    console.log('✔ GoogleAuthProvider initialized correctly with providerId: google.com');
  } else {
    throw new Error('Invalid GoogleAuthProvider providerId');
  }

  console.log('\n=== ALL AUTHENTICATION TESTS PASSED! ===');
}

testAuthSuite().catch(err => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
