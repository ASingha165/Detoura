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
import { translate } from './i18n/translations';

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
  // Language localization state
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string, fallback?: string) => string;
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

export function DetouraProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendResponse[]>([]);
  const [activeIntelligence, setActiveIntelligence] = useState<Model3Recommendation | null>(null);
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

    if (!user) {
      throw new Error("Please sign in to save trips to your DETOURA passport.");
    }

    const tripId = trip.destination_id;
    const tripData = {
      destination_id: trip.destination_id,
      name: trip.name,
      district: trip.district || '',
      category: trip.category || '',
      estimated_daily_inr: trip.estimated_daily_inr ?? trip.budget_per_day ?? 2000,
      budget_tier: trip.budget_tier ?? 2,
      savedAt: serverTimestamp(),
      image_url: trip.image_url || null,
      match_score: trip.match_score || null,
      distance_km: trip.distance_km || null,
      recommended_duration_days: trip.recommended_duration_days || 2,
      budget_per_day: trip.budget_per_day || trip.estimated_daily_inr || 2000,
      travel_style: trip.travel_style || trip.category || 'Regional Discovery',
      description: trip.description || '',
      highlights: trip.highlights || [],
      detoura_score: trip.detoura_score || 0,
      similarity_score: trip.similarity_score || 0,
      cpi_used: trip.cpi_used || 0,
      underrated_score: trip.underrated_score || 0,
      ssi: trip.ssi || 0,
      latitude: trip.latitude || null,
      longitude: trip.longitude || null
    };

    let writeConfirmed = false;

    // 1. Attempt direct Firestore write to users/{userId}/trips/{tripId}
    try {
      const tripDocRef = doc(db, 'users', user.uid, 'trips', tripId);
      await setDoc(tripDocRef, tripData, { merge: true });
      writeConfirmed = true;
    } catch (err: any) {
      console.warn('[Firestore] Direct client trip write notice, attempting backend Firestore API:', err?.message || err);
    }

    // 2. Fallback to authenticated backend Firestore write
    if (!writeConfirmed) {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const ok = await syncTripToBackend(user.uid, trip, idToken);
        if (ok) writeConfirmed = true;
      } catch (backendErr) {
        console.error('Backend syncTrip fallback failed:', backendErr);
      }
    }

    // Only update UI after confirmed Firestore write
    if (writeConfirmed) {
      const updated = [trip, ...savedTrips];
      setSavedTrips(updated);
      const storageKey = `detoura_saved_trips_${user.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } else {
      throw new Error("Could not save trip to Cloud Firestore. Please check your connection.");
    }
  };

  // Remove trip from Firestore subcollection users/{userId}/trips/{destination_id}
  const removeTrip = async (destinationId: string) => {
    if (!user) {
      const updated = savedTrips.filter((t) => t.destination_id !== destinationId);
      setSavedTrips(updated);
      return;
    }

    let deleteConfirmed = false;

    // 1. Attempt direct Firestore deletion from users/{userId}/trips/{destinationId}
    try {
      const tripDocRef = doc(db, 'users', user.uid, 'trips', destinationId);
      await deleteDoc(tripDocRef);
      deleteConfirmed = true;
    } catch (err: any) {
      console.warn('[Firestore] Direct client trip delete notice, attempting backend Firestore API:', err?.message || err);
    }

    // 2. Fallback to authenticated backend Firestore delete
    if (!deleteConfirmed) {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const ok = await deleteTripFromBackend(user.uid, destinationId, idToken);
        if (ok) deleteConfirmed = true;
      } catch (backendErr) {
        console.error('Backend deleteTrip fallback failed:', backendErr);
      }
    }

    // Only update UI after confirmed Firestore delete
    if (deleteConfirmed) {
      const updated = savedTrips.filter((t) => t.destination_id !== destinationId);
      setSavedTrips(updated);
      const storageKey = `detoura_saved_trips_${user.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } else {
      throw new Error("Could not delete trip from Cloud Firestore.");
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
        t
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
  const { language, setLanguage, t } = useDetoura();
  return { language, setLanguage, t };
}
