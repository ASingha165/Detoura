import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDetoura } from '../DetouraContext';
import { useAuth } from '../AuthContext';
import { getRecommendations, saveTravelDnaToBackend, fetchTravelDnaFromBackend } from '../api';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import LanguageSelector from '../components/LanguageSelector';

export const PLACE_TYPES = [
  { id: 'mountains', label: 'Mountains & Hills', icon: 'landscape' },
  { id: 'coast', label: 'Ocean / Coast', icon: 'waves' },
  { id: 'beaches', label: 'Beaches', icon: 'beach_access' },
  { id: 'forests', label: 'Forests', icon: 'forest' },
  { id: 'waterfalls', label: 'Waterfalls', icon: 'water_drop' },
  { id: 'wildlife', label: 'Wildlife', icon: 'pets' },
  { id: 'rivers_lakes', label: 'Rivers & Lakes', icon: 'water' },
  { id: 'heritage', label: 'Heritage & Historic', icon: 'fort' },
  { id: 'spiritual', label: 'Spiritual', icon: 'temple_hindu' },
  { id: 'countryside', label: 'Rural / Countryside', icon: 'cottage' },
  { id: 'tea_gardens', label: 'Tea Gardens', icon: 'emoji_nature' },
  { id: 'islands', label: 'Islands', icon: 'island' },
];

export const MONTHS = [
  { num: 1, name: 'January' },
  { num: 2, name: 'February' },
  { num: 3, name: 'March' },
  { num: 4, name: 'April' },
  { num: 5, name: 'May' },
  { num: 6, name: 'June' },
  { num: 7, name: 'July' },
  { num: 8, name: 'August' },
  { num: 9, name: 'September' },
  { num: 10, name: 'October' },
  { num: 11, name: 'November' },
  { num: 12, name: 'December' },
];

export default function TravelDNA() {
  const [nature, setNature] = useState(85);
  const [relax, setRelax] = useState(90);
  const [culture, setCulture] = useState(70);
  const [food, setFood] = useState(65);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const navigate = useNavigate();
  const {
    setRecommendations,
    setActiveIntelligence,
    seasonMode,
    setSeasonMode,
    customMonth,
    setCustomMonth,
    tripDays,
    setTripDays,
    selectedPlaceTypes,
    setSelectedPlaceTypes,
    selectedBudgetMax,
    setSelectedBudgetMax,
    selectedBudgetTier,
    setSelectedBudgetTier,
    language,
    t
  } = useDetoura();
  const { user } = useAuth();

  // Dynamically compute runtime calendar month and year from user's system date
  const runtimeDate = useMemo(() => new Date(), []);
  const currentCalendarMonthNumber = runtimeDate.getMonth() + 1; // 1-12
  const currentCalendarMonthName = runtimeDate.toLocaleString('default', { month: 'long' });
  const currentCalendarYear = runtimeDate.getFullYear();

  // Active travel month sent to Model 2 SSI pipeline:
  // If 'current', dynamically use current system calendar month.
  // If 'custom', use custom user-selected month.
  const activeTravelMonth = seasonMode === 'current' ? currentCalendarMonthNumber : customMonth;
  const activeTravelMonthName = MONTHS.find((m) => m.num === activeTravelMonth)?.name || currentCalendarMonthName;

  // Toggle multi-select place types
  const togglePlaceType = (id: string) => {
    if (selectedPlaceTypes.includes(id)) {
      setSelectedPlaceTypes(selectedPlaceTypes.filter((t) => t !== id));
    } else {
      setSelectedPlaceTypes([...selectedPlaceTypes, id]);
    }
  };

  // Toggle budget tier preset
  const handleBudgetTierSelect = (tier: string) => {
    if (selectedBudgetTier === tier) {
      setSelectedBudgetTier('all');
      setSelectedBudgetMax(5000);
    } else {
      setSelectedBudgetTier(tier);
      if (tier === '1') {
        setSelectedBudgetMax(2200);
      } else if (tier === '2') {
        setSelectedBudgetMax(4400);
      } else if (tier === '3') {
        setSelectedBudgetMax(5000);
      }
    }
  };

  // Load saved Travel DNA preferences on mount or auth change
  useEffect(() => {
    const storageKey = user ? `detoura_travel_dna_${user.uid}` : 'detoura_travel_dna_guest';
    const local = localStorage.getItem(storageKey);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (typeof parsed.nature === 'number') setNature(parsed.nature);
        if (typeof parsed.relaxation === 'number') setRelax(parsed.relaxation);
        else if (typeof parsed.relax === 'number') setRelax(parsed.relax);
        if (typeof parsed.culture === 'number') setCulture(parsed.culture);
        if (typeof parsed.adventure === 'number') setFood(parsed.adventure);
        else if (typeof parsed.food === 'number') setFood(parsed.food);
        if (Array.isArray(parsed.placeTypes)) setSelectedPlaceTypes(parsed.placeTypes);
        if (parsed.seasonMode === 'current' || parsed.seasonMode === 'custom') setSeasonMode(parsed.seasonMode);
        if (typeof parsed.selectedMonth === 'number' && parsed.selectedMonth >= 1 && parsed.selectedMonth <= 12) {
          setCustomMonth(parsed.selectedMonth);
        }
        if (typeof parsed.budgetMax === 'number') setSelectedBudgetMax(parsed.budgetMax);
        if (parsed.budgetTier) setSelectedBudgetTier(String(parsed.budgetTier));
      } catch (e) {
        console.warn('Could not parse local Travel DNA:', e);
      }
    }

    if (!user) return;

    let isMounted = true;
    const fetchSavedDna = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          const dna = data.travelDNA || data.travelDna || data.preferences;
          if (dna && isMounted) {
            if (typeof dna.nature === 'number') setNature(dna.nature);
            if (typeof dna.relaxation === 'number') setRelax(dna.relaxation);
            if (typeof dna.culture === 'number') setCulture(dna.culture);
            if (typeof dna.adventure === 'number') setFood(dna.adventure);
            else if (typeof dna.food === 'number') setFood(dna.food);
            if (Array.isArray(dna.placeTypes)) setSelectedPlaceTypes(dna.placeTypes);
            if (dna.seasonMode === 'current' || dna.seasonMode === 'custom') setSeasonMode(dna.seasonMode);
            if (typeof dna.selectedMonth === 'number' && dna.selectedMonth >= 1 && dna.selectedMonth <= 12) {
              setCustomMonth(dna.selectedMonth);
            }
            if (typeof dna.budgetMax === 'number') setSelectedBudgetMax(dna.budgetMax);
            if (dna.budgetTier) setSelectedBudgetTier(String(dna.budgetTier));
            return;
          }
        }

        // Fallback to backend API
        const idToken = await auth.currentUser?.getIdToken();
        const backendDna = await fetchTravelDnaFromBackend(user.uid, idToken);
        if (backendDna && isMounted) {
          if (typeof backendDna.nature === 'number') setNature(backendDna.nature);
          if (typeof backendDna.relaxation === 'number') setRelax(backendDna.relaxation);
          if (typeof backendDna.culture === 'number') setCulture(backendDna.culture);
          if (typeof backendDna.adventure === 'number') setFood(backendDna.adventure);
          else if (typeof backendDna.food === 'number') setFood(backendDna.food);
          if (Array.isArray(backendDna.placeTypes)) setSelectedPlaceTypes(backendDna.placeTypes);
          if (backendDna.seasonMode === 'current' || backendDna.seasonMode === 'custom') setSeasonMode(backendDna.seasonMode);
          if (typeof backendDna.selectedMonth === 'number' && backendDna.selectedMonth >= 1 && backendDna.selectedMonth <= 12) {
            setCustomMonth(backendDna.selectedMonth);
          }
          if (typeof backendDna.budgetMax === 'number') setSelectedBudgetMax(backendDna.budgetMax);
          if (backendDna.budgetTier) setSelectedBudgetTier(String(backendDna.budgetTier));
        }
      } catch (err) {
        console.warn('Notice loading Travel DNA from Firestore:', err);
      }
    };

    fetchSavedDna();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleBuildDetoura = async () => {
    setIsGenerating(true);
    setApiError(null);

    const dnaPayload = {
      nature,
      relaxation: relax,
      culture,
      adventure: food,
      food,
      placeTypes: selectedPlaceTypes,
      seasonMode,
      selectedMonth: activeTravelMonth,
      budgetMax: selectedBudgetMax,
      budgetTier: selectedBudgetTier,
      updatedAt: new Date().toISOString(),
    };

    const storageKey = user ? `detoura_travel_dna_${user.uid}` : 'detoura_travel_dna_guest';
    localStorage.setItem(storageKey, JSON.stringify(dnaPayload));

    // Persist preferences to Firestore user document
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          travelDNA: dnaPayload,
          travelDna: dnaPayload,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (firestoreErr: any) {
        console.warn('[Firestore] Direct write notice, attempting backend API sync:', firestoreErr?.message || firestoreErr);
        try {
          const idToken = await auth.currentUser?.getIdToken();
          await saveTravelDnaToBackend(user.uid, dnaPayload, idToken);
        } catch (bErr) {
          console.warn('Backend saveTravelDna fallback notice:', bErr);
        }
      }
    }

    try {
      // Model 2 Recommendation + Gemma Model 3 Intelligence request:
      // - 4D cosine similarity preference vector [nature, adventure, culture, relaxation]
      // - Model 2 weights
      // - Selected travel month (1-12) to calculate destination-specific SSI from 12-month climate data
      // - Landscape/place types preference layer
      // - Budget constraint
      // - Trip duration for Gemma multi-day itinerary synthesis
      const response = await getRecommendations({
        user_prefs: {
          adventure: food / 100,
          nature: nature / 100,
          relaxation: relax / 100,
          culture: culture / 100,
        },
        weights: {
          w_sim: 1.0,
          w_season: 1.0,
          w_crowd: 1.0,
          w_gem: 1.0,
        },
        month: activeTravelMonth,
        place_types: selectedPlaceTypes,
        budget_max: selectedBudgetMax,
        budget_tier: selectedBudgetTier !== 'all' ? selectedBudgetTier : undefined,
        trip_days: tripDays,
        language: language,
      });

      if (!response || response.length === 0) {
        throw new Error("No recommendations found for this configuration. Try broadening your budget or preferences.");
      }

      // Check if top recommendation has model3_payload
      const topModel3 = response.find(r => r.model3_payload)?.model3_payload;
      if (topModel3) {
        setActiveIntelligence(topModel3);
      }
      setRecommendations(response);
      navigate("/recommendations");
    } catch (error: any) {
      console.error('BuildDetoura error:', error);
      const isFetchError = error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError');
      if (isFetchError) {
        setApiError("Unable to connect to the DETOURA ML service (port 8000). Please ensure the backend server is running.");
      } else {
        setApiError(error?.message || "Failed to generate recommendations. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col w-full">
        {/* Progress Header & Engine Status */}
        <section className="px-margin-mobile pt-space-md pb-space-xs">
          <div className="flex items-center justify-between gap-space-sm mb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center font-semibold">2</span>
              <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider font-semibold">{t('travelDna.stepIndicator')}</span>
              <span className="text-on-surface-variant font-label-sm text-label-sm">{t('travelDna.stepTitle')}</span>
            </div>

            {/* Auth options in entry flow */}
            <div className="flex items-center gap-1.5">
              <LanguageSelector />
              {user ? (
                <Link
                  to="/profile"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold hover:bg-primary-fixed-dim transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">account_circle</span>
                  <span className="truncate max-w-[85px]">{user.displayName || user.email?.split('@')[0]}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/login"
                    id="entry-login-btn"
                    className="px-2.5 py-1 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    id="entry-signup-btn"
                    className="px-2.5 py-1 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold transition-colors shadow-xs"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Guest awareness banner */}
          {!user && (
            <div className="mb-space-sm p-2 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-secondary text-[16px]">travel_explore</span>
                <span className="font-body-sm text-[12px] text-on-surface-variant truncate">
                  Sign in to save detours and custom passport
                </span>
              </div>
              <Link to="/login" className="text-primary font-label-sm text-[12px] font-semibold hover:underline shrink-0">
                Join / Sign In
              </Link>
            </div>
          )}

          {/* API Error Alert */}
          {apiError && (
            <div className="mb-space-sm p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex flex-col gap-2 animate-fadeIn">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[20px] text-error shrink-0">error</span>
                <div className="flex-1">
                  <span>{apiError}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-7">
                <button
                  type="button"
                  onClick={handleBuildDetoura}
                  className="px-3 py-1 bg-error text-on-error rounded-lg font-label-sm text-label-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
                <Link
                  to="/catalog"
                  className="px-3 py-1 bg-surface-container text-on-surface rounded-lg font-label-sm text-label-sm font-semibold hover:bg-surface-container-high transition-colors"
                >
                  Explore Offline Catalog
                </Link>
              </div>
            </div>
          )}

          {/* Step Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden mb-space-md">
            <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: "66.6%" }}></div>
          </div>
          <div className="space-y-1">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{t('travelDna.pageHeading')}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{t('travelDna.pageSubheading')}</p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 1: AFFINITY RESONANCE (Core 4D Model 2 Vectors - UNCHANGED)       */}
        {/* ========================================================================= */}
        <section className="px-margin-mobile py-space-sm">
          <div className="flex items-center justify-between mb-space-sm">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Affinity Resonance</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Slide to weight your destination discovery engine.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold">Live Weights</span>
          </div>
          <div className="space-y-space-sm">
            {/* Card: Nature */}
            <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                  </div>
                  <div>
                    <span className="font-label-lg text-label-lg text-on-surface block">Nature &amp; Wildlands</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Misty hills, wildlife trails, tea gardens</span>
                  </div>
                </div>
                <span className="font-label-lg text-label-lg text-secondary font-bold" id="val-nature">{nature}%</span>
              </div>
              <div className="mt-space-sm flex items-center gap-space-sm">
                <input
                  id="slider-nature"
                  className="w-full h-2 rounded-lg bg-surface-container-highest accent-secondary cursor-pointer"
                  max="100"
                  min="20"
                  onChange={(e) => setNature(Number(e.target.value))}
                  type="range"
                  value={nature}
                />
              </div>
            </div>

            {/* Card: Relaxation */}
            <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>water</span>
                  </div>
                  <div>
                    <span className="font-label-lg text-label-lg text-on-surface block">Quiet Serenity</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Calm coasts, heritage tea retreats, quiet ghats</span>
                  </div>
                </div>
                <span className="font-label-lg text-label-lg text-secondary font-bold" id="val-relax">{relax}%</span>
              </div>
              <div className="mt-space-sm flex items-center gap-space-sm">
                <input
                  id="slider-relax"
                  className="w-full h-2 rounded-lg bg-surface-container-highest accent-secondary cursor-pointer"
                  max="100"
                  min="20"
                  onChange={(e) => setRelax(Number(e.target.value))}
                  type="range"
                  value={relax}
                />
              </div>
            </div>

            {/* Card: Culture & Heritage */}
            <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>museum</span>
                  </div>
                  <div>
                    <span className="font-label-lg text-label-lg text-on-surface block">Culture &amp; Living Heritage</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Terracotta temples, handlooms, baul music</span>
                  </div>
                </div>
                <span className="font-label-lg text-label-lg text-primary font-bold" id="val-culture">{culture}%</span>
              </div>
              <div className="mt-space-sm flex items-center gap-space-sm">
                <input
                  id="slider-culture"
                  className="w-full h-2 rounded-lg bg-surface-container-highest accent-primary cursor-pointer"
                  max="100"
                  min="20"
                  onChange={(e) => setCulture(Number(e.target.value))}
                  type="range"
                  value={culture}
                />
              </div>
            </div>

            {/* Card: Gastronomy / Adventure */}
            <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed-variant">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>skillet</span>
                  </div>
                  <div>
                    <span className="font-label-lg text-label-lg text-on-surface block">Gastronomy &amp; Local Food</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Authentic regional flavors, sweets, kosha</span>
                  </div>
                </div>
                <span className="font-label-lg text-label-lg text-tertiary font-bold" id="val-food">{food}%</span>
              </div>
              <div className="mt-space-sm flex items-center gap-space-sm">
                <input
                  id="slider-food"
                  className="w-full h-2 rounded-lg bg-surface-container-highest accent-tertiary cursor-pointer"
                  max="100"
                  min="20"
                  onChange={(e) => setFood(Number(e.target.value))}
                  type="range"
                  value={food}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: LANDSCAPE & PLACE PREFERENCES (Separate Preference Layer)      */}
        {/* ========================================================================= */}
        <section className="px-margin-mobile py-space-sm">
          <div className="flex items-center justify-between mb-space-xs">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Landscape &amp; Place Preferences</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Select geographical landscapes to tailor regional discovery.</p>
            </div>
            {selectedPlaceTypes.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
                {selectedPlaceTypes.length} Selected
              </span>
            )}
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PLACE_TYPES.map((pt) => {
                const isSelected = selectedPlaceTypes.includes(pt.id);
                return (
                  <button
                    key={pt.id}
                    id={`place-type-${pt.id}`}
                    type="button"
                    onClick={() => togglePlaceType(pt.id)}
                    className={`px-3 py-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95 ${
                      isSelected
                        ? 'bg-primary text-on-primary border-primary shadow-xs font-semibold'
                        : 'bg-surface-container border-outline-variant/40 text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] shrink-0 ${
                        isSelected ? 'text-on-primary' : 'text-primary'
                      }`}
                    >
                      {pt.icon}
                    </span>
                    <span className="font-label-sm text-label-sm truncate">{pt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: WHEN DO YOU WANT TO TRAVEL? (Season & Month SSI Pipeline)      */}
        {/* ========================================================================= */}
        <section className="px-margin-mobile py-space-sm">
          <div className="flex items-center justify-between mb-space-xs">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">When Do You Want To Travel?</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Feeds destination monthly temperature &amp; rainfall into Model 2 SSI.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-semibold">
              {activeTravelMonthName}
            </span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm space-y-3">
            {/* Season Toggle: [ Current Season ] [ Custom Season ] */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-container-highest">
              <button
                id="season-mode-current"
                type="button"
                onClick={() => setSeasonMode('current')}
                className={`flex-1 py-2 px-3 rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  seasonMode === 'current'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>Current Season</span>
              </button>
              <button
                id="season-mode-custom"
                type="button"
                onClick={() => setSeasonMode('custom')}
                className={`flex-1 py-2 px-3 rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  seasonMode === 'custom'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Custom Month</span>
              </button>
            </div>

            {/* Current Season Dynamic Badge */}
            {seasonMode === 'current' && (
              <div className="p-3 rounded-lg bg-surface-container flex items-center justify-between gap-2 border border-outline-variant/30 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-secondary">wb_sunny</span>
                  <div>
                    <span className="font-label-md text-label-md text-on-surface font-semibold block">
                      Runtime System Month: {currentCalendarMonthName} {currentCalendarYear}
                    </span>
                    <span className="font-body-sm text-[12px] text-on-surface-variant">
                      Automatically calculated from your current device calendar. No hardcoded values.
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold shrink-0">
                  Month {currentCalendarMonthNumber}
                </span>
              </div>
            )}

            {/* Custom Season Month Grid */}
            {seasonMode === 'custom' && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">Select Travel Month:</span>
                  <span className="font-label-sm text-label-sm text-primary font-bold">{activeTravelMonthName}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {MONTHS.map((m) => {
                    const isMonthActive = customMonth === m.num;
                    return (
                      <button
                        key={m.num}
                        id={`month-select-${m.num}`}
                        type="button"
                        onClick={() => setCustomMonth(m.num)}
                        className={`py-1.5 px-2 rounded-lg text-center font-label-sm text-label-sm transition-all cursor-pointer ${
                          isMonthActive
                            ? 'bg-primary text-on-primary font-bold shadow-xs'
                            : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                        }`}
                      >
                        {m.name.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: BUDGET (User Constraint / Filter Layer)                         */}
        {/* ========================================================================= */}
        <section className="px-margin-mobile py-space-sm">
          <div className="flex items-center justify-between mb-space-xs">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Budget Preference</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Maximum daily estimate constraint for accommodation and food.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">
              ₹{selectedBudgetMax.toLocaleString()}/day
            </span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Daily Ceiling</span>
              <span className="font-label-md text-label-md text-primary font-bold">
                Up to ₹{selectedBudgetMax.toLocaleString()}
              </span>
            </div>
            <input
              id="slider-budget"
              type="range"
              min="1000"
              max="5000"
              step="100"
              value={selectedBudgetMax}
              onChange={(e) => setSelectedBudgetMax(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-surface-container-highest accent-primary cursor-pointer"
            />
            {/* 3 Interactive Budget Categories */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                id="budget-daily"
                data-testid="budget-daily"
                onClick={() => handleBudgetTierSelect('1')}
                className={`py-2 px-2 rounded-xl text-center font-label-sm text-[12px] font-medium transition-all active:scale-95 cursor-pointer border ${
                  selectedBudgetTier === '1'
                    ? 'bg-secondary text-on-secondary border-secondary font-bold shadow-xs'
                    : 'bg-surface-container-highest/60 border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span id="budget-tier-1" className="block pointer-events-none">
                  <div className="font-semibold text-[13px]">Daily</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Tier 1 (₹1,200)</div>
                </span>
              </button>

              <button
                type="button"
                id="budget-mid-range"
                data-testid="budget-mid-range"
                onClick={() => handleBudgetTierSelect('2')}
                className={`py-2 px-2 rounded-xl text-center font-label-sm text-[12px] font-medium transition-all active:scale-95 cursor-pointer border ${
                  selectedBudgetTier === '2'
                    ? 'bg-secondary text-on-secondary border-secondary font-bold shadow-xs'
                    : 'bg-surface-container-highest/60 border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span id="budget-tier-2" className="block pointer-events-none">
                  <div className="font-semibold text-[13px]">Mid-range</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Tier 2 (₹2,000)</div>
                </span>
              </button>

              <button
                type="button"
                id="budget-premium"
                data-testid="budget-premium"
                onClick={() => handleBudgetTierSelect('3')}
                className={`py-2 px-2 rounded-xl text-center font-label-sm text-[12px] font-medium transition-all active:scale-95 cursor-pointer border ${
                  selectedBudgetTier === '3'
                    ? 'bg-secondary text-on-secondary border-secondary font-bold shadow-xs'
                    : 'bg-surface-container-highest/60 border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span id="budget-tier-3" className="block pointer-events-none">
                  <div className="font-semibold text-[13px]">Premium</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Tier 3 (₹3,500+)</div>
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: TRIP DURATION & GEMMA AI SYNTHESIS                            */}
        {/* ========================================================================= */}
        <section className="px-margin-mobile py-space-sm">
          <div className="flex items-center justify-between mb-space-xs">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Trip Duration &amp; Gemma AI Plan</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Local Gemma model synthesizes a custom multi-day morning/afternoon/evening itinerary.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">
              {tripDays} {tripDays === 1 ? 'Day' : 'Days'}
            </span>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  id={`trip-days-${d}`}
                  type="button"
                  onClick={() => setTripDays(d)}
                  className={`py-2.5 px-1 rounded-xl text-center font-label-md text-label-md transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    tripDays === d
                      ? 'bg-primary text-on-primary font-bold shadow-md ring-2 ring-primary/20 scale-[1.02]'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  <span className="text-base font-bold">{d} Days</span>
                  <span className={`text-[10px] ${tripDays === d ? 'text-on-primary/85' : 'text-on-surface-variant'}`}>
                    {d === 2 ? 'Weekend' : d === 3 ? 'Classic' : d === 4 ? 'Extended' : 'Complete'}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container/70 border border-outline-variant/30 text-[12px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-primary shrink-0">psychology</span>
              <span>Gemma 2B LLM runs locally on CPU/CUDA to generate your {tripDays}-day time-slotted itinerary &amp; contextual activity rankings.</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* STICKY BOTTOM SUBMIT: BUILD MY DETOURA                                    */}
        {/* ========================================================================= */}
        <section className="px-margin-mobile pt-space-sm pb-space-lg">
          <div className="p-space-md rounded-2xl bg-surface-container-low shadow-md space-y-space-xs">
            <button
              className="w-full py-3.5 px-space-md rounded-xl bg-primary hover:bg-primary-container active:scale-[0.99] text-on-primary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-60 cursor-pointer"
              id="build-dna-btn"
              type="button"
              onClick={handleBuildDetoura}
              disabled={isGenerating}
            >
              <span>{isGenerating ? t('travelDna.generatingCta') : t('travelDna.generateCta')}</span>
              <span className="material-symbols-outlined text-[20px]">
                {isGenerating ? "sync" : "arrow_forward"}
              </span>
            </button>
            <div className="flex items-center justify-center gap-1.5 text-center">
              <span className="material-symbols-outlined text-secondary text-[14px]">verified</span>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Model 2 Multi-Criteria: Cosine Similarity + Real {activeTravelMonthName} SSI + Live CPI + Underrated Score + Gemma AI
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
