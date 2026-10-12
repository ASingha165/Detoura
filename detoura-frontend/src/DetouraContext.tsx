import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { RecommendResponse, Model3Recommendation } from './api';
import { useAuth } from './AuthContext';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { syncTripToBackend, deleteTripFromBackend, fetchTripsFromBackend } from './api';
import type { Language } from './i18n/translations';
import {
  translate,
  localizeCategory as localizeCategoryHelper,
  localizeRegion as localizeRegionHelper,
  localizeDestinationName as localizeDestinationNameHelper,
  formatPricePerDay as formatPricePerDayHelper,
  formatDuration as formatDurationHelper,
  formatAddress as formatAddressHelper,
  formatDestinationDescription as formatDestinationDescriptionHelper
} from './i18n/translations';

export interface DetouraContextType {
  recommendations: RecommendResponse[];
  setRecommendations: (recs: RecommendResponse[]) => void;
  activeIntelligence: Model3Recommendation | null;
  setActiveIntelligence: (intel: Model3Recommendation | null) => void;
  savedTrips: RecommendResponse[];
  addTrip: (trip: RecommendResponse) => Promise<void>;
  removeTrip: (destinationId: string) => Promise<void>;
  isLoadingTrips: boolean;
  refreshTrips: () => Promise<void>;
  // Language localization state & helpers
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, fallback?: string) => string;
  localizeCategory: (cat?: string) => string;
  localizeRegion: (reg?: string) => string;
  localizeDestinationName: (name?: string) => string;
  formatPricePerDay: (amount?: number | string) => string;
  formatDuration: (days?: number | string) => string;
  formatAddress: (name?: string, district?: string, address?: string) => string;
  formatDestinationDescription: (rec: { name?: string; district?: string; description?: string }) => string;
  // Season / Month state
  seasonMode: 'current' | 'custom';
  setSeasonMode: (mode: 'current' | 'custom') => void;
  customMonth: number;
  setCustomMonth: (month: number) => void;
  activeMonth: number;
  // Trip Duration
  tripDays: number;
  setTripDays: (days: number) => void;
  // Place Types state
  selectedPlaceTypes: string[];
  setSelectedPlaceTypes: (types: string[]) => void;
  // Budget constraint state
  selectedBudgetMax: number;
  setSelectedBudgetMax: (budget: number) => void;
  selectedBudgetTier: string;
  setSelectedBudgetTier: (tier: string) => void;
  // Geolocation live location state
  userLocation: { latitude: number; longitude: number } | null;
  locationStatus: 'prompt' | 'loading' | 'granted' | 'denied' | 'unavailable';
  locationError: string | null;
  requestUserLocation: () => Promise<void>;
}

const DetouraContext = createContext<DetouraContextType | undefined>(undefined);

/**
 * Safely sanitizes an object for Firestore by converting undefined to null or omitting,
 * ensuring no unsupported values cause Firestore serialization rejections.
 */
function sanitizeForFirestore(val: any): any {
  if (val === undefined) return null;
  if (val === null) return null;
  if (Array.isArray(val)) {
    return val.map(sanitizeForFirestore);
  }
  if (typeof val === 'object' && !(val instanceof Date) && typeof (val as any)?.toMillis !== 'function') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        res[k] = sanitizeForFirestore(v);
      }
    }
    return res;
  }
  return val;
}

export function DetouraProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [recommendations, setRecommendationsState] = useState<RecommendResponse[]>(() => {
    try {
      const stored = sessionStorage.getItem('detoura_last_recommendations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeIntelligence, setActiveIntelligenceState] = useState<Model3Recommendation | null>(() => {
    try {
      const stored = sessionStorage.getItem('detoura_last_active_intelligence');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setRecommendations = (recs: RecommendResponse[]) => {
    setRecommendationsState(recs);
    try {
      if (Array.isArray(recs) && recs.length > 0) {
        sessionStorage.setItem('detoura_last_recommendations', JSON.stringify(recs));
      } else {
        sessionStorage.removeItem('detoura_last_recommendations');
      }
    } catch {}
  };

  const setActiveIntelligence = (intel: Model3Recommendation | null) => {
    setActiveIntelligenceState(intel);
    try {
      if (intel) {
        sessionStorage.setItem('detoura_last_active_intelligence', JSON.stringify(intel));
      } else {
        sessionStorage.removeItem('detoura_last_active_intelligence');
      }
    } catch {}
  };
  const [savedTrips, setSavedTrips] = useState<RecommendResponse[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState<boolean>(false);
  const [tripDays, setTripDays] = useState<number>(3);

  // Multilingual localization state (en / hi / bn)
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('detoura_language');
    return (saved === 'hi' || saved === 'bn') ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('detoura_language', lang);
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (keyPath: string, fallback?: string) => {
    return translate(language, keyPath, fallback);
  };

  // Season / Month state
  // Current Season dynamically calculates the month from runtime system date
  const getCurrentMonth = (): number => new Date().getMonth() + 1; // 1-12
  const [seasonMode, setSeasonMode] = useState<'current' | 'custom'>('current');
  const [customMonth, setCustomMonth] = useState<number>(() => {
    const saved = localStorage.getItem('detoura_custom_month');
    return saved ? parseInt(saved, 10) : getCurrentMonth();
  });

  // Active month: if 'current', dynamically compute current month; if 'custom', use customMonth
  const activeMonth = seasonMode === 'current' ? getCurrentMonth() : customMonth;

  // Landscape and Place Types multi-select
  const [selectedPlaceTypes, setSelectedPlaceTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('detoura_place_types');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Budget max constraint & Tier preset
  const [selectedBudgetMax, setSelectedBudgetMax] = useState<number>(4400);
  const [selectedBudgetTier, setSelectedBudgetTier] = useState<string>(() => {
    return localStorage.getItem('detoura_budget_tier') || 'all';
  });

  // Geolocation live location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'loading' | 'granted' | 'denied' | 'unavailable'>('prompt');
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestUserLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unavailable');
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('loading');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('granted');
        setLocationError(null);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setLocationError('Location permission was denied. You can enable it in your browser settings.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationStatus('unavailable');
          setLocationError('Current location is unavailable.');
        } else {
          setLocationStatus('unavailable');
          setLocationError('Unable to retrieve location within time limit.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Persist custom month, place types, and budget tier to localStorage for user convenience
  useEffect(() => {
    localStorage.setItem('detoura_custom_month', customMonth.toString());
  }, [customMonth]);

  useEffect(() => {
    localStorage.setItem('detoura_place_types', JSON.stringify(selectedPlaceTypes));
  }, [selectedPlaceTypes]);

  useEffect(() => {
    localStorage.setItem('detoura_budget_tier', selectedBudgetTier);
  }, [selectedBudgetTier]);

  // Authoritative load of trips from Cloud Firestore for the authenticated user
  const loadUserTripsFromFirestore = async (userId: string) => {
    setIsLoadingTrips(true);
    const storageKey = `detoura_saved_trips_${userId}`;
    let loadedFromFirestore: RecommendResponse[] | null = null;

    try {
      // 1. Try reading directly from Firestore subcollection users/{userId}/trips
      const tripsColRef = collection(db, 'users', userId, 'trips');
      let tripDocs: any[] = [];
      try {
        const q = query(tripsColRef, orderBy('savedAt', 'desc'));
        const snap = await getDocs(q);
        tripDocs = snap.docs;
      } catch (queryErr) {
        // Fallback to unordered query
        const snap = await getDocs(tripsColRef);
        tripDocs = snap.docs;
      }

      if (tripDocs && tripDocs.length > 0) {
        loadedFromFirestore = tripDocs.map((docSnap) => {
          const d = docSnap.data();
          return {
            destination_id: d.destination_id || docSnap.id,
            name: d.name || 'Unknown Destination',
            district: d.district || '',
            category: d.category || '',
            estimated_daily_inr: d.estimated_daily_inr ?? 2000,
            budget_tier: d.budget_tier ?? 2,
            detoura_score: d.detoura_score ?? 0,
            similarity_score: d.similarity_score ?? 0,
            cpi_used: d.cpi_used ?? 0,
            underrated_score: d.underrated_score ?? 0,
            ssi: d.ssi ?? 0,
            latitude: d.latitude ?? undefined,
            longitude: d.longitude ?? undefined,
            image_url: d.image_url ?? undefined,
            match_score: d.match_score ?? undefined,
            distance_km: d.distance_km ?? undefined,
            recommended_duration_days: d.recommended_duration_days ?? 2,
            budget_per_day: d.budget_per_day ?? d.estimated_daily_inr ?? 2000,
            travel_style: d.travel_style ?? d.category ?? 'Offbeat Detour',
            description: d.description || `Offbeat spot in ${d.district || 'West Bengal'}`,
            highlights: Array.isArray(d.highlights) ? d.highlights : [d.district || 'Scenic Spot']
          };
        });
      } else if (tripDocs && tripDocs.length === 0) {
        // Direct query confirmed 0 documents in subcollection
        loadedFromFirestore = [];
      }
    } catch (clientErr: any) {
      console.warn('[Firestore] Client SDK direct query notice, checking backend Firestore client:', clientErr?.message || clientErr);
    }

    // 2. If direct client query failed or permission denied, query backend Firestore endpoint
    if (loadedFromFirestore === null) {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const backendTrips = await fetchTripsFromBackend(userId, idToken);
        if (Array.isArray(backendTrips)) {
          loadedFromFirestore = backendTrips;
        }
      } catch (bErr) {
        console.warn('Backend trips query failed:', bErr);
      }
    }

    // 3. Fallback: check legacy single doc array if subcollection returned nothing
    if (loadedFromFirestore === null || loadedFromFirestore.length === 0) {
      try {
        const userDocRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (Array.isArray(userData.savedTrips) && userData.savedTrips.length > 0) {
            loadedFromFirestore = userData.savedTrips;
          }
        }
      } catch {
        // Ignore legacy doc error
      }
    }

    // 4. Update state with Firestore authoritative truth
    if (Array.isArray(loadedFromFirestore)) {
      setSavedTrips(loadedFromFirestore);
      localStorage.setItem(storageKey, JSON.stringify(loadedFromFirestore));
    } else {
      // If network was completely offline, use cached trips temporarily but warn
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          setSavedTrips(JSON.parse(cached));
        } catch {
          setSavedTrips([]);
        }
      } else {
        setSavedTrips([]);
      }
    }
    setIsLoadingTrips(false);
  };

  // Load trips specific to the authenticated Firebase UID on login / user change
  useEffect(() => {
    if (!user) {
      setSavedTrips([]);
      return;
    }

    // Temporary non-authoritative UI caching display while Firestore loads
    const storageKey = `detoura_saved_trips_${user.uid}`;
    const local = localStorage.getItem(storageKey);
    if (local) {
      try {
        setSavedTrips(JSON.parse(local));
      } catch {
        setSavedTrips([]);
      }
    }

    // Strictly validate against Firestore
    loadUserTripsFromFirestore(user.uid);
  }, [user]);

  const refreshTrips = async () => {
    if (user) {
      await loadUserTripsFromFirestore(user.uid);
    }
  };

  // Persist trip to Firestore subcollection users/{userId}/trips/{destination_id}
  const addTrip = async (trip: RecommendResponse) => {
    if (savedTrips.some((t) => t.destination_id === trip.destination_id)) return;

    // 1. Wait for Firebase authentication initialization if in progress
    if (authLoading) {
      try {
        if (typeof (auth as any).authStateReady === 'function') {
          await (auth as any).authStateReady();
        }
      } catch {
        // Fallback
      }
    }

    // 2. Strictly verify authenticated Firebase user
    const currentFirebaseUser = auth.currentUser;
    const activeUid = currentFirebaseUser?.uid || user?.uid;

    if (!currentFirebaseUser || !activeUid) {
      throw new Error("Please sign in to save trips to your DETOURA passport.");
    }

    if (currentFirebaseUser.uid !== activeUid) {
      throw new Error("Authentication mismatch. Please sign in again.");
    }

    const tripId = String(trip.destination_id || '').trim();
    if (!tripId) {
      throw new Error("Invalid destination ID. Cannot save trip.");
    }

    // 3. Serialize and sanitize payload to prevent unsupported Firestore types
    const rawTripData: Record<string, any> = {
      destination_id: tripId,
      name: trip.name || 'Unknown Destination',
      district: trip.district || '',
      category: trip.category || '',
      estimated_daily_inr: trip.estimated_daily_inr ?? trip.budget_per_day ?? 2000,
      budget_tier: trip.budget_tier ?? 2,
      savedAt: serverTimestamp(),
      image_url: trip.image_url || null,
      match_score: typeof trip.match_score === 'number' ? trip.match_score : null,
      distance_km: typeof trip.distance_km === 'number' ? trip.distance_km : null,
      recommended_duration_days: trip.recommended_duration_days || 2,
      budget_per_day: trip.budget_per_day || trip.estimated_daily_inr || 2000,
      travel_style: trip.travel_style || trip.category || 'Regional Discovery',
      description: trip.description || '',
      highlights: Array.isArray(trip.highlights) ? trip.highlights : [],
      detoura_score: typeof trip.detoura_score === 'number' ? trip.detoura_score : 0,
      similarity_score: typeof trip.similarity_score === 'number' ? trip.similarity_score : 0,
      cpi_used: typeof trip.cpi_used === 'number' ? trip.cpi_used : 0,
      underrated_score: typeof trip.underrated_score === 'number' ? trip.underrated_score : 0,
      ssi: typeof trip.ssi === 'number' ? trip.ssi : 0,
      latitude: typeof trip.latitude === 'number' ? trip.latitude : null,
      longitude: typeof trip.longitude === 'number' ? trip.longitude : null
    };

    const tripData = sanitizeForFirestore(rawTripData);
    let writeConfirmed = false;
    let directClientError: any = null;

    // 4. Attempt direct Firestore write to users/{activeUid}/trips/{tripId}
    const tripDocRef = doc(db, 'users', activeUid, 'trips', tripId);
    try {
      await setDoc(tripDocRef, tripData, { merge: true });
      writeConfirmed = true;
    } catch (err: any) {
      directClientError = err;
      const isSecurityRejection = err?.code === 'permission-denied';
      console.error('[Detoura Firestore Diagnostic]', {
        operation: 'addTrip',
        isAuthenticated: !!currentFirebaseUser,
        uid: activeUid,
        path: `users/${activeUid}/trips/${tripId}`,
        errorCode: err?.code || 'unknown',
        errorMessage: err?.message || String(err),
        isSecurityRuleRejection: isSecurityRejection,
        timestamp: new Date().toISOString()
      });
    }

    // 5. Fallback to authenticated backend Firestore write if client had transient network error (not permission rejection)
    if (!writeConfirmed && directClientError?.code !== 'permission-denied' && directClientError?.code !== 'invalid-argument') {
      try {
        const idToken = await currentFirebaseUser.getIdToken();
        const ok = await syncTripToBackend(activeUid, trip, idToken);
        if (ok) writeConfirmed = true;
      } catch (backendErr) {
        console.warn('[Detoura Firestore] Backend syncTrip fallback notice:', backendErr);
      }
    }

    // 6. Only update UI after confirmed Firestore write
    if (writeConfirmed) {
      const updated = [trip, ...savedTrips];
      setSavedTrips(updated);
      const storageKey = `detoura_saved_trips_${activeUid}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } else {
      // Differentiate individual Firebase error codes
      const code = directClientError?.code;
      if (code === 'permission-denied') {
        throw new Error("Permission denied by Cloud Firestore. You can only save trips to your own authenticated account.");
      } else if (code === 'unauthenticated') {
        throw new Error("Your session has expired. Please sign in again to save trips.");
      } else if (code === 'unavailable') {
        throw new Error("Cloud Firestore is temporarily unavailable. Please check your internet connection.");
      } else if (code === 'invalid-argument') {
        throw new Error("Invalid trip data format. Could not save to Cloud Firestore.");
      } else if (code === 'failed-precondition') {
        throw new Error("Operation failed due to a Firestore precondition error.");
      } else {
        throw new Error(directClientError?.message || "Could not save trip to Cloud Firestore. Please try again.");
      }
    }
  };

  // Remove trip from Firestore subcollection users/{userId}/trips/{destination_id}
  const removeTrip = async (destinationId: string) => {
    if (authLoading) {
      try {
        if (typeof (auth as any).authStateReady === 'function') {
          await (auth as any).authStateReady();
        }
      } catch {
        // Fallback
      }
    }

    const currentFirebaseUser = auth.currentUser;
    const activeUid = currentFirebaseUser?.uid || user?.uid;

    if (!currentFirebaseUser || !activeUid) {
      const updated = savedTrips.filter((t) => t.destination_id !== destinationId);
      setSavedTrips(updated);
      return;
    }

    let deleteConfirmed = false;
    let directClientError: any = null;
    const tripDocRef = doc(db, 'users', activeUid, 'trips', destinationId);

    try {
      await deleteDoc(tripDocRef);
      deleteConfirmed = true;
    } catch (err: any) {
      directClientError = err;
      console.error('[Detoura Firestore Diagnostic]', {
        operation: 'removeTrip',
        isAuthenticated: !!currentFirebaseUser,
        uid: activeUid,
        path: `users/${activeUid}/trips/${destinationId}`,
        errorCode: err?.code || 'unknown',
        errorMessage: err?.message || String(err),
        timestamp: new Date().toISOString()
      });
    }

    if (!deleteConfirmed && directClientError?.code !== 'permission-denied') {
      try {
        const idToken = await currentFirebaseUser.getIdToken();
        const ok = await deleteTripFromBackend(activeUid, destinationId, idToken);
        if (ok) deleteConfirmed = true;
      } catch (backendErr) {
        console.warn('[Detoura Firestore] Backend deleteTrip notice:', backendErr);
      }
    }

    // Only update UI after confirmed Firestore delete
    if (deleteConfirmed) {
      const updated = savedTrips.filter((t) => t.destination_id !== destinationId);
      setSavedTrips(updated);
      const storageKey = `detoura_saved_trips_${activeUid}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } else {
      const code = directClientError?.code;
      if (code === 'permission-denied') {
        throw new Error("Permission denied. You can only remove trips from your own account.");
      } else if (code === 'unauthenticated') {
        throw new Error("Your session has expired. Please sign in again.");
      } else {
        throw new Error(directClientError?.message || "Could not delete trip from Cloud Firestore.");
      }
    }
  };

  return (
    <DetouraContext.Provider
      value={{
        recommendations,
        setRecommendations,
        activeIntelligence,
        setActiveIntelligence,
        savedTrips,
        addTrip,
        removeTrip,
        isLoadingTrips,
        refreshTrips,
        seasonMode,
        setSeasonMode,
        customMonth,
        setCustomMonth,
        activeMonth,
        tripDays,
        setTripDays,
        selectedPlaceTypes,
        setSelectedPlaceTypes,
        selectedBudgetMax,
        setSelectedBudgetMax,
        selectedBudgetTier,
        setSelectedBudgetTier,
        userLocation,
        locationStatus,
        locationError,
        requestUserLocation,
        language,
        setLanguage,
        t,
        localizeCategory: (cat?: string) => localizeCategoryHelper(cat, language),
        localizeRegion: (reg?: string) => localizeRegionHelper(reg, language),
        localizeDestinationName: (name?: string) => localizeDestinationNameHelper(name, language),
        formatPricePerDay: (amount?: number | string) => formatPricePerDayHelper(amount, language),
        formatDuration: (days?: number | string) => formatDurationHelper(days, language),
        formatAddress: (name?: string, district?: string, address?: string) => formatAddressHelper(name, district, address, language),
        formatDestinationDescription: (rec: { name?: string; district?: string; description?: string }) => formatDestinationDescriptionHelper(rec, language),
      }}
    >
      {children}
    </DetouraContext.Provider>
  );
}

export function useDetoura() {
  const context = useContext(DetouraContext);
  if (context === undefined) {
    throw new Error('useDetoura must be used within a DetouraProvider');
  }
  return context;
}

export function useTranslation() {
  const {
    language,
    setLanguage,
    t,
    localizeCategory,
    localizeRegion,
    localizeDestinationName,
    formatPricePerDay,
    formatDuration,
    formatAddress,
    formatDestinationDescription
  } = useDetoura();

  return {
    language,
    setLanguage,
    t,
    localizeCategory,
    localizeRegion,
    localizeDestinationName,
    formatPricePerDay,
    formatDuration,
    formatAddress,
    formatDestinationDescription
  };
}
