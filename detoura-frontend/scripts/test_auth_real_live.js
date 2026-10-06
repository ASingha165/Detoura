import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';

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

async function runTests() {
  console.log('--- Testing Firebase Client Auth SDK directly ---');
  
  // 1. Nonexistent email test
  console.log('\n[1] Testing login with nonexistent email...');
  try {
    await signInWithEmailAndPassword(auth, 'nonexistent_test_detoura_9999@example.com', 'InvalidPass123!');
    console.error('FAILED: Nonexistent login should not have succeeded');
    process.exit(1);
  } catch (err) {
    console.log('✔ Correctly received expected error code:', err.code, '-', err.message);
  }

  // 2. Signup test
  const testEmail = `auth_test_user_${Date.now()}@detoura.test`;
  const testPass = 'DetouraAuthTestPass2026!';
  console.log(`\n[2] Testing signup with new account: ${testEmail}...`);
  const signupCred = await createUserWithEmailAndPassword(auth, testEmail, testPass);
  console.log('✔ Signup succeeded! UID:', signupCred.user.uid, 'Email:', signupCred.user.email);

  // 3. Signout
  await signOut(auth);
  console.log('✔ Sign out succeeded');

  // 4. Login with newly created user
  console.log(`\n[3] Testing login with newly created account...`);
  const loginCred = await signInWithEmailAndPassword(auth, testEmail, testPass);
  console.log('✔ Login succeeded! Authenticated UID:', loginCred.user.uid);
  const idToken = await loginCred.user.getIdToken();
  console.log('✔ ID Token acquired, length:', idToken.length);

  await signOut(auth);
  console.log('\nALL CLIENT SDK DIRECT AUTH TESTS PASSED!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
