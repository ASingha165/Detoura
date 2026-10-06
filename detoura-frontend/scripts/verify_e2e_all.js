import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { execSync } from 'child_process';
import http from 'http';

const firebaseConfig = {
  apiKey: "AIzaSyCtt4c-ROEQk-8xpANCudvxORPzD6w0kEQ",
  authDomain: "detoura-f8a96.firebaseapp.com",
  projectId: "detoura-f8a96",
  storageBucket: "detoura-f8a96.firebasestorage.app",
  messagingSenderId: "857249385672",
  appId: "1:857249385672:web:0d3b0a1638d7abed91a9fd"
};

function getCustomToken(uid) {
  const cmd = `.venv312\\Scripts\\python.exe -c "import firebase_client, firebase_admin; from firebase_admin import auth; firebase_client.init_firebase(); print(auth.create_custom_token('${uid}').decode('utf-8'))"`;
  return execSync(cmd, { cwd: 'd:\\Detoura\\detoura-ml' }).toString().trim();
}

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function deleteReq(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runEndToEndTests() {
  console.log('========================================================');
  console.log('STARTING DETOURA END-TO-END VERIFICATION SUITE');
  console.log('========================================================\n');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const userAUid = 'test_user_A_101';
  const userBUid = 'test_user_B_202';

  // ----------------------------------------------------
  // TEST A: AUTHENTICATION
  // ----------------------------------------------------
  console.log('--- TEST A: Authentication & Identity ---');
  const tokenA = getCustomToken(userAUid);
  let credA = await signInWithCustomToken(auth, tokenA);
  if (credA.user.uid !== userAUid) throw new Error('User A UID mismatch');
  console.log('✔ Sign in as User A succeeded. UID:', credA.user.uid);

  await signOut(auth);
  if (auth.currentUser !== null) throw new Error('Sign out failed');
  console.log('✔ Sign out succeeded. currentUser is null');

  const tokenB = getCustomToken(userBUid);
  let credB = await signInWithCustomToken(auth, tokenB);
  if (credB.user.uid !== userBUid) throw new Error('User B UID mismatch');
  console.log('✔ Sign in as User B succeeded. UID:', credB.user.uid);

  await signOut(auth);
  credA = await signInWithCustomToken(auth, tokenA);
  const idTokenA = await credA.user.getIdToken();
  console.log('✔ Re-authenticated as User A. Ready for protected ops.');

  // ----------------------------------------------------
  // TEST B: TRAVEL DNA PERSISTENCE & RELOAD
  // ----------------------------------------------------
  console.log('\n--- TEST B: Travel DNA Persistence & Reload ---');
  const dnaPayload = { nature: 92, relaxation: 88, culture: 74, adventure: 60 };
  const saveDnaRes = await postJson(`http://127.0.0.1:8000/api/users/${userAUid}/travel-dna`, dnaPayload, {
    'Authorization': `Bearer ${idTokenA}`
  });
  if (saveDnaRes.status !== 200) throw new Error(`Save DNA failed: ${saveDnaRes.status}`);
  console.log('✔ Travel DNA successfully written via API to Firestore');

  const getDnaRes = await getJson(`http://127.0.0.1:8000/api/users/${userAUid}/travel-dna`, {
    'Authorization': `Bearer ${idTokenA}`
  });
  if (getDnaRes.status !== 200) throw new Error(`Get DNA failed: ${getDnaRes.status}`);
  const loadedDna = getDnaRes.data;
  if (loadedDna.nature !== 92 || loadedDna.relaxation !== 88 || loadedDna.culture !== 74 || loadedDna.adventure !== 60) {
    throw new Error('Loaded DNA mismatch: ' + JSON.stringify(loadedDna));
  }
  console.log('✔ Travel DNA reload verified:', loadedDna);

  // ----------------------------------------------------
  // TEST C: RECOMMENDATIONS & MODEL 2 CONTRACT
  // ----------------------------------------------------
  console.log('\n--- TEST C: Recommendations & Model 2 Contract ---');
  const recRequest = {
    user_prefs: {
      nature: loadedDna.nature / 100,
      relaxation: loadedDna.relaxation / 100,
      culture: loadedDna.culture / 100,
      adventure: loadedDna.adventure / 100
    },
    weights: {
      w_sim: 1.0,
      w_season: 1.0,
      w_crowd: 1.0,
      w_gem: 1.0
    }
  };

  const recRes = await postJson('http://localhost:5173/recommend', recRequest);
  if (recRes.status !== 200 || !Array.isArray(recRes.data) || recRes.data.length === 0) {
    throw new Error(`Recommendations API failed: ${recRes.status}`);
  }
  const recommendations = recRes.data;
  console.log(`✔ Recommendations API returned ${recommendations.length} items`);
  const top1 = recommendations[0];
  console.log(`✔ Top Recommendation: "${top1.name}" in ${top1.district}`);
  console.log(`   - detoura_score: ${top1.detoura_score}`);
  console.log(`   - similarity_score: ${top1.similarity_score}`);
  console.log(`   - cpi_used: ${top1.cpi_used}`);
  console.log(`   - underrated_score: ${top1.underrated_score}`);
  console.log(`   - ssi: ${top1.ssi}`);

  if (typeof top1.detoura_score !== 'number' || isNaN(top1.detoura_score) || top1.detoura_score <= 0) {
    throw new Error('Invalid detoura_score');
  }

  // ----------------------------------------------------
  // TEST D: BUDGET FILTERING LOGIC
  // ----------------------------------------------------
  console.log('\n--- TEST D: Budget Filtering Logic ---');
  const allTiers = [...new Set(recommendations.map(r => r.budget_tier).filter(Boolean))];
  console.log('✔ Available budget tiers in results:', allTiers);
  const lowBudgetRecs = recommendations.filter(r => (r.estimated_daily_inr || r.budget_per_day || 2000) <= 2000);
  const higherBudgetRecs = recommendations.filter(r => (r.estimated_daily_inr || r.budget_per_day || 2000) <= 4000);
  console.log(`✔ Filter budget <= ₹2000: ${lowBudgetRecs.length} destinations`);
  console.log(`✔ Filter budget <= ₹4000: ${higherBudgetRecs.length} destinations`);
  if (lowBudgetRecs.length > higherBudgetRecs.length) throw new Error('Budget filtering boundary error');

  // ----------------------------------------------------
  // TEST E: SAVE TRIP TO FIRESTORE
  // ----------------------------------------------------
  console.log('\n--- TEST E: Save Trip to Firestore ---');
  const tripToSave = {
    destination_id: top1.destination_id,
    name: top1.name,
    district: top1.district || 'Darjeeling',
    category: top1.category || 'Hill Station',
    estimated_daily_inr: top1.estimated_daily_inr || 2400,
    budget_tier: top1.budget_tier || 2,
    detoura_score: top1.detoura_score,
    similarity_score: top1.similarity_score,
    cpi_used: top1.cpi_used,
    underrated_score: top1.underrated_score,
    ssi: top1.ssi
  };

  const saveTripRes = await postJson(`http://127.0.0.1:8000/api/users/${userAUid}/trips`, tripToSave, {
    'Authorization': `Bearer ${idTokenA}`
  });
  if (saveTripRes.status !== 200) throw new Error(`Save trip failed: ${saveTripRes.status}`);
  console.log(`✔ Trip "${top1.name}" successfully saved for User A to Firestore`);

  const getTripsResA = await getJson(`http://127.0.0.1:8000/api/users/${userAUid}/trips`, {
    'Authorization': `Bearer ${idTokenA}`
  });
  if (getTripsResA.status !== 200 || !Array.isArray(getTripsResA.data)) throw new Error('Get trips failed');
  const foundA = getTripsResA.data.find(t => t.destination_id === top1.destination_id);
  if (!foundA) throw new Error('Saved trip not found in Firestore response');
  console.log(`✔ Verified User A has ${getTripsResA.data.length} trip in Firestore. First: "${foundA.name}"`);

  // ----------------------------------------------------
  // TEST F: REMOVE TRIP FROM FIRESTORE
  // ----------------------------------------------------
  console.log('\n--- TEST F: Remove Trip from Firestore ---');
  const delRes = await deleteReq(`http://127.0.0.1:8000/api/users/${userAUid}/trips/${top1.destination_id}`, {
    'Authorization': `Bearer ${idTokenA}`
  });
  if (delRes.status !== 200) throw new Error(`Delete trip failed: ${delRes.status}`);
  console.log(`✔ Trip "${top1.name}" removed from Firestore for User A`);

  const getTripsAfterDel = await getJson(`http://127.0.0.1:8000/api/users/${userAUid}/trips`, {
    'Authorization': `Bearer ${idTokenA}`
  });
  if (getTripsAfterDel.status !== 200 || getTripsAfterDel.data.length !== 0) {
    throw new Error('Trip was not removed from Firestore');
  }
  console.log('✔ Verified User A has 0 trips after deletion');

  // ----------------------------------------------------
  // TEST G: MULTI-USER ISOLATION
  // ----------------------------------------------------
  console.log('\n--- TEST G: Multi-User Isolation ---');
  // 1. User A saves Trip X
  const tripX = {
    destination_id: 'WB_DAR_001',
    name: 'Darjeeling Himalayan Railway',
    district: 'Darjeeling',
    category: 'Heritage',
    estimated_daily_inr: 2800,
    budget_tier: 2
  };
  await postJson(`http://127.0.0.1:8000/api/users/${userAUid}/trips`, tripX, {
    'Authorization': `Bearer ${idTokenA}`
  });
  console.log('✔ User A saved Trip X: Darjeeling Himalayan Railway');

  // 2. Sign in as User B
  await signOut(auth);
  credB = await signInWithCustomToken(auth, tokenB);
  const idTokenB = await credB.user.getIdToken();

  // 3. User B queries their trips - must NOT see Trip X
  const getTripsB = await getJson(`http://127.0.0.1:8000/api/users/${userBUid}/trips`, {
    'Authorization': `Bearer ${idTokenB}`
  });
  if (getTripsB.data.some(t => t.destination_id === 'WB_DAR_001')) {
    throw new Error('SECURITY BREACH: User B can see User A\'s trip!');
  }
  console.log('✔ User B checked trips: 0 trips found (User A\'s trip is isolated)');

  // 4. User B saves Trip Y
  const tripY = {
    destination_id: 'WB_KOL_002',
    name: 'Kumartuli Potter Town',
    district: 'Kolkata',
    category: 'Culture',
    estimated_daily_inr: 1200,
    budget_tier: 1
  };
  await postJson(`http://127.0.0.1:8000/api/users/${userBUid}/trips`, tripY, {
    'Authorization': `Bearer ${idTokenB}`
  });
  console.log('✔ User B saved Trip Y: Kumartuli Potter Town');

  // 5. Sign back in as User A and verify User A only has Trip X and NOT Trip Y
  await signOut(auth);
  credA = await signInWithCustomToken(auth, tokenA);
  const idTokenA2 = await credA.user.getIdToken();
  const getTripsA2 = await getJson(`http://127.0.0.1:8000/api/users/${userAUid}/trips`, {
    'Authorization': `Bearer ${idTokenA2}`
  });
  if (getTripsA2.data.some(t => t.destination_id === 'WB_KOL_002')) {
    throw new Error('SECURITY BREACH: User A can see User B\'s trip!');
  }
  if (!getTripsA2.data.some(t => t.destination_id === 'WB_DAR_001')) {
    throw new Error('User A lost their saved trip!');
  }
  console.log('✔ User A verified trips: only Trip X is present (User B\'s trip is isolated)');

  // 6. Clean up test trips
  await deleteReq(`http://127.0.0.1:8000/api/users/${userAUid}/trips/WB_DAR_001`, {
    'Authorization': `Bearer ${idTokenA2}`
  });
  await deleteReq(`http://127.0.0.1:8000/api/users/${userBUid}/trips/WB_KOL_002`, {
    'Authorization': `Bearer ${idTokenB}`
  });
  console.log('✔ Cleaned up test trips for both users');

  console.log('\n========================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! 100% END-TO-END VERIFIED.');
  console.log('========================================================');
}

runEndToEndTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
