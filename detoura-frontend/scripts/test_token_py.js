import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
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
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const customToken = execSync(
    '.venv312\\Scripts\\python.exe -c "import firebase_client, firebase_admin; from firebase_admin import auth; firebase_client.init_firebase(); print(auth.create_custom_token(\'test_user_A_101\').decode(\'utf-8\'))"',
    { cwd: 'd:\\Detoura\\detoura-ml' }
  ).toString().trim();

  const cred = await signInWithCustomToken(auth, customToken);
  const idToken = await cred.user.getIdToken();
  console.log('ID token length:', idToken.length);

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/users/test_user_A_101/travel-dna`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ nature: 90, relaxation: 80, culture: 70, adventure: 60 })
    });
    console.log('Fetch status:', res.status);
    const text = await res.text();
    console.log('Fetch body:', text);
  } catch (e) {
    console.log('Fetch error:', e);
  }
}

test();
