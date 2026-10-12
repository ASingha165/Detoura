import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { execSync } from 'child_process';

const firebaseConfig = {
  apiKey: "AIzaSyCtt4c-ROEQk-8xpANCudvxORPzD6w0kEQ",
  authDomain: "detoura-f8a96.firebaseapp.com",
  projectId: "detoura-f8a96",
  storageBucket: "detoura-f8a96.firebasestorage.app",
  messagingSenderId: "857249385672",
  appId: "1:857249385672:web:0d3b0a1638d7abed91a9fd"
};

async function verifySavedTripsLifecycle() {
  console.log('================================================================');
  console.log('  DETOURA PHASE 6: REAL FIRESTORE SAVED TRIPS LIFECYCLE TEST');
  console.log('================================================================');

  const uidAlice = 'VHjXxlfaduVca5JiFW7VehEdOEw1';
  const uidBob = 'WcFRWRmSxbZpMV3Q8RJH7OiG1A82';

  // 1. Generate auth tokens
  console.log('[1/9] Generating Firebase tokens for Alice and Bob...');
  const tokenAlice = execSync(
    `.venv312\\Scripts\\python.exe -c "import firebase_client; from firebase_admin import auth; firebase_client.init_firebase(); print(auth.create_custom_token('${uidAlice}').decode('utf-8'))"`,
    { cwd: 'd:\\Detoura\\detoura-ml' }
  ).toString().trim();

  const tokenBob = execSync(
    `.venv312\\Scripts\\python.exe -c "import firebase_client; from firebase_admin import auth; firebase_client.init_firebase(); print(auth.create_custom_token('${uidBob}').decode('utf-8'))"`,
    { cwd: 'd:\\Detoura\\detoura-ml' }
  ).toString().trim();

  const app = initializeApp(firebaseConfig, 'e2e-saved-trips-' + Date.now());
  const auth = getAuth(app);
  const db = getFirestore(app);

  // 2. Sign in as Alice
  console.log('[2/9] Signing in as Alice (UID: ' + uidAlice + ')...');
  await signInWithCustomToken(auth, tokenAlice);
  if (!auth.currentUser || auth.currentUser.uid !== uidAlice) {
    throw new Error('Authentication failed for Alice');
  }
  console.log('   -> Successfully authenticated as Alice.');

  // 3. Save a destination to Alice's trips
  const destId = 'WB_DAR_001';
  const tripRef = doc(db, 'users', uidAlice, 'trips', destId);
  const tripPayload = {
    destination_id: destId,
    name: 'Darjeeling Himalayan Railway',
    district: 'Darjeeling',
    category: 'Heritage',
    estimated_daily_inr: 2800,
    budget_tier: 2,
    savedAt: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1000',
    match_score: 0.94,
    distance_km: 615,
    recommended_duration_days: 3,
    budget_per_day: 2800,
    travel_style: 'Heritage Exploration',
    description: 'Iconic toy train journey through mist-laden tea gardens in the Himalayas.',
    highlights: ['UNESCO Heritage Toy Train', 'Batasia Loop', 'Tiger Hill Sunrise'],
    detoura_score: 2.34,
    similarity_score: 0.89,
    cpi_used: 0.12,
    underrated_score: 0.45,
    ssi: 0.88,
    latitude: 27.0360,
    longitude: 88.2627
  };

  console.log('[3/9] Saving destination ' + destId + ' to users/' + uidAlice + '/trips/' + destId + '...');
  const t0 = Date.now();
  await setDoc(tripRef, tripPayload, { merge: true });
  const saveLatency = Date.now() - t0;
  console.log(`   -> [SUCCESS] Saved trip confirmed by Firestore in ${saveLatency}ms.`);

  // 4. Verify saved trip appears in Profile / Saved Trips query
  console.log('[4/9] Querying saved trips subcollection users/' + uidAlice + '/trips...');
  const tripsCol = collection(db, 'users', uidAlice, 'trips');
  const snap = await getDocs(tripsCol);
  const found = snap.docs.find(d => d.id === destId);
  if (!found) {
    throw new Error(`Saved trip ${destId} not found in Firestore subcollection!`);
  }
  const retrievedData = found.data();
  console.log(`   -> [SUCCESS] Found ${snap.size} saved trips. Retrieved trip name: "${retrievedData.name}", district: "${retrievedData.district}".`);

  // 5. Simulate page refresh: direct doc read back
  console.log('[5/9] Simulating page refresh (direct doc read)...');
  const docSnap = await getDoc(tripRef);
  if (!docSnap.exists() || docSnap.data().name !== tripPayload.name) {
    throw new Error('Trip failed persistence verification on simulated refresh!');
  }
  console.log('   -> [SUCCESS] Trip persists across page refresh.');

  // 6. Sign out and sign back in: verify trips preserved
  console.log('[6/9] Simulating sign-out and re-authentication...');
  await signOut(auth);
  console.log('   -> Signed out Alice.');
  await signInWithCustomToken(auth, tokenAlice);
  console.log('   -> Signed back in as Alice.');
  const snapAfterRelogin = await getDocs(tripsCol);
  const foundAfterRelogin = snapAfterRelogin.docs.find(d => d.id === destId);
  if (!foundAfterRelogin) {
    throw new Error('Trip not preserved after re-authentication!');
  }
  console.log('   -> [SUCCESS] Trip preserved after re-authentication.');

  // 7. Verify cross-user isolation: User Bob cannot access Alice's trips
  console.log('[7/9] Verifying user isolation: signing in as Bob (UID: ' + uidBob + ')...');
  await signOut(auth);
  await signInWithCustomToken(auth, tokenBob);
  console.log('   -> Authenticated as Bob.');

  let bobReadBlocked = false;
  try {
    await getDocs(collection(db, 'users', uidAlice, 'trips'));
  } catch (err) {
    if (err.code === 'permission-denied') bobReadBlocked = true;
  }
  if (!bobReadBlocked) {
    throw new Error('SECURITY VIOLATION: Bob was able to read Alice trips!');
  }
  console.log('   -> [SUCCESS] Bob reading Alice trips correctly blocked with permission-denied.');

  let bobWriteBlocked = false;
  try {
    await setDoc(doc(db, 'users', uidAlice, 'trips', 'bob_malicious_trip'), {
      name: 'Bob Overwrite Attack'
    });
  } catch (err) {
    if (err.code === 'permission-denied') bobWriteBlocked = true;
  }
  if (!bobWriteBlocked) {
    throw new Error('SECURITY VIOLATION: Bob was able to write to Alice trips!');
  }
  console.log('   -> [SUCCESS] Bob writing to Alice trips correctly blocked with permission-denied.');

  // 8. Verify unauthenticated user cannot save trips
  console.log('[8/9] Verifying unauthenticated user cannot write to trips...');
  await signOut(auth);
  let anonWriteBlocked = false;
  try {
    await setDoc(tripRef, { name: 'Anon Overwrite' });
  } catch (err) {
    if (err.code === 'permission-denied') anonWriteBlocked = true;
  }
  if (!anonWriteBlocked) {
    throw new Error('SECURITY VIOLATION: Unauthenticated user wrote to trip!');
  }
  console.log('   -> [SUCCESS] Unauthenticated write correctly blocked with permission-denied.');

  // 9. Clean up: Alice deletes saved trip
  console.log('[9/9] Cleaning up: signing in as Alice and removing test trip...');
  await signInWithCustomToken(auth, tokenAlice);
  await deleteDoc(tripRef);
  const snapAfterDelete = await getDocs(tripsCol);
  const remaining = snapAfterDelete.docs.find(d => d.id === destId);
  if (remaining) {
    throw new Error('Trip was not deleted successfully!');
  }
  console.log('   -> [SUCCESS] Test trip cleanly deleted from Cloud Firestore.');

  console.log('================================================================');
  console.log('  ALL 9 SAVED TRIPS LIFECYCLE CHECKS PASSED WITH 100% SUCCESS!  ');
  console.log('================================================================');
}

verifySavedTripsLifecycle().catch(err => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});
