import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
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
  const token = execSync(
    '.venv312\\Scripts\\python.exe -c "import firebase_client, firebase_admin; from firebase_admin import auth; firebase_client.init_firebase(); print(auth.create_custom_token(\'VHjXxlfaduVca5JiFW7VehEdOEw1\').decode(\'utf-8\'))"',
    { cwd: 'd:\\Detoura\\detoura-ml' }
  ).toString().trim();

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInWithCustomToken(auth, token);
  const uid = 'VHjXxlfaduVca5JiFW7VehEdOEw1';

  console.log(`Testing write to users/${uid}...`);
  try {
    await setDoc(doc(db, 'users', uid), {
      testPing: 'ok',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('[SUCCESS] Direct write to users/{uid} succeeded!');
    const snap = await getDoc(doc(db, 'users', uid));
    console.log('[SUCCESS] Read back users/{uid}:', snap.data());
  } catch (err) {
    console.error('[FAIL] Direct write to users/{uid}:', err.message);
  }
}

test();
