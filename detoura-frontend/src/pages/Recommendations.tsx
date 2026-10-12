import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDetoura } from '../DetouraContext';
import type { RecommendResponse } from '../api';
import { formatDistance, calculateHaversineDistance, getIntelligenceRecommendation, synthesizeOfflineIntelligence } from '../api';
import WestBengalMap from '../components/WestBengalMap';
import type { MapDestination } from '../components/WestBengalMap';
import { getDestinationImage } from '../services/imageService';
import DestinationImage from '../components/DestinationImage';
import BudgetFilter from '../components/BudgetFilter';
import LanguageSelector from '../components/LanguageSelector';

export default function Recommendations() {
  const navigate = useNavigate();
  const {
    recommendations,
    setRecommendations,
    addTrip,
    removeTrip,
    savedTrips,
    activeMonth,
    seasonMode,
    activeIntelligence,
    setActiveIntelligence,
    tripDays,
    selectedBudgetTier,
    userLocation,
    locationStatus,
    requestUserLocation,
    language,
    t
  } = useDetoura();

  const travelMonthName = useMemo(() => {
    return new Date(2026, (activeMonth || 9) - 1, 1).toLocaleString('default', { month: 'long' });
  }, [activeMonth]);

  // Dynamic budget boundaries and tier presets derived from recommendations
  const { minBudget, maxBudget, availableTiers } = useMemo(() => {
    const budgets = recommendations
      .map((r) => r.estimated_daily_inr || r.budget_per_day)
      .filter((b): b is number => typeof b === 'number' && !isNaN(b));

    const min = budgets.length > 0 ? Math.min(...budgets) : 800;
    const max = budgets.length > 0 ? Math.max(...budgets) : 4400;

    return {
      minBudget: Math.min(800, Math.floor(min / 50) * 50),
      maxBudget: Math.max(4400, Math.ceil(max / 100) * 100),
      availableTiers: [1, 2, 3]
    };
  }, [recommendations]);

  const [selectedBudget, setSelectedBudget] = useState<number>(4400);
  const [selectedTier, setSelectedTier] = useState<string>(() => {
    return selectedBudgetTier && selectedBudgetTier !== 'all' ? selectedBudgetTier : 'all';
  });
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [savingTripId, setSavingTripId] = useState<string | null>(null);
  const [imagesMap, setImagesMap] = useState<Record<string, string>>({});

  // Sync selected budget to maxBudget when recommendations load
  useEffect(() => {
    if (maxBudget > 0) {
      setSelectedBudget(maxBudget);
    }
  }, [maxBudget]);

  // Sync selected tier from context when recommendations load
  useEffect(() => {
    if (selectedBudgetTier && selectedBudgetTier !== 'all') {
      setSelectedTier(selectedBudgetTier);
    }
  }, [selectedBudgetTier]);

  // Filter recommendations dynamically against real dataset metrics
  // Preserves Model 2 ranking and detoura_score untouched!
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      const daily = rec.estimated_daily_inr || rec.budget_per_day || 2000;
      const tier = rec.budget_tier;

      // Budget ceiling check
      if (selectedBudget < maxBudget && daily > selectedBudget) {
        return false;
      }

      // Budget tier preset check
      if (selectedTier !== 'all') {
        if (!tier || tier.toString() !== selectedTier) {
          return false;
        }
      }

      return true;
    });
  }, [recommendations, selectedBudget, maxBudget, selectedTier]);

  // The featured showcase destination is strictly the highest-ranked recommendation
  const topRecommendation = filteredRecommendations[0] || recommendations[0];

  // Guaranteed active intelligence resolved for the top recommendation
  const activeOrFallbackIntelligence = useMemo(() => {
    if (!topRecommendation) return null;
    if (activeIntelligence && activeIntelligence.destination?.id === topRecommendation.destination_id) {
      return activeIntelligence;
    }
    if (topRecommendation.model3_payload && topRecommendation.model3_payload.destination?.id === topRecommendation.destination_id) {
      return topRecommendation.model3_payload;
    }
    return synthesizeOfflineIntelligence({
      destination_id: topRecommendation.destination_id,
      month: activeMonth,
      trip_days: tripDays,
      language: language,
      user_lat: userLocation?.latitude,
      user_lon: userLocation?.longitude,
    });
  }, [topRecommendation, activeIntelligence, activeMonth, tripDays, language, userLocation?.latitude, userLocation?.longitude]);

  // Synchronize top match intelligence narrative when top destination or language changes
  useEffect(() => {
    if (!topRecommendation) return;

    const destId = topRecommendation.destination_id;
    const currentExplanation = activeIntelligence?.explanation || '';
    const hasBengali = /[\u0980-\u09FF]/.test(currentExplanation);
    const hasHindi = /[\u0900-\u097F]/.test(currentExplanation);

    const needsSync =
      activeIntelligence?.destination?.id !== destId ||
      (language === 'bn' && !hasBengali) ||
      (language === 'hi' && !hasHindi) ||
      (language === 'en' && (hasBengali || hasHindi));

    if (!needsSync) return;

    // Adopt immediate payload if already present on top recommendation and matching target language
    if (topRecommendation.model3_payload && topRecommendation.model3_payload.destination?.id === destId) {
      const payloadExp = topRecommendation.model3_payload.explanation || '';
      const pHasBn = /[\u0980-\u09FF]/.test(payloadExp);
      const pHasHi = /[\u0900-\u097F]/.test(payloadExp);
      const pMatchesLang =
        (language === 'bn' && pHasBn) ||
        (language === 'hi' && pHasHi) ||
        (language === 'en' && !pHasBn && !pHasHi);
      if (pMatchesLang) {
        setActiveIntelligence(topRecommendation.model3_payload);
        return;
      }
    }

    getIntelligenceRecommendation({
      destination_id: destId,
      trip_days: tripDays,
      language: language,
      user_lat: userLocation?.latitude,
      user_lon: userLocation?.longitude,
    })
      .then((payload) => {
        setActiveIntelligence(payload);
        setRecommendations(
          recommendations.map((r) =>
            r.destination_id === payload.destination.id
              ? {
                  ...r,
                  description: payload.explanation || r.description,
                  activities: payload.activities || r.activities,
                  itinerary: payload.itinerary || r.itinerary,
                  model3_payload: payload,
                }
              : r
          )
        );
      })
      .catch((err) => {
        console.warn('Intelligence sync notice, using calibrated Model 2 synthesis:', err);
        const synth = synthesizeOfflineIntelligence({
          destination_id: destId,
          month: activeMonth,
          trip_days: tripDays,
          language: language,
          user_lat: userLocation?.latitude,
          user_lon: userLocation?.longitude,
        });
        if (synth) {
          setActiveIntelligence(synth);
        }
      });
  }, [
    topRecommendation?.destination_id,
    language,
    tripDays,
    activeMonth,
    userLocation?.latitude,
    userLocation?.longitude
  ]);

  // Safe selection clearing if selected destination is filtered out
  useEffect(() => {
    if (selectedDestId && !filteredRecommendations.some((r) => r.destination_id === selectedDestId)) {
      setSelectedDestId(null);
    }
  }, [filteredRecommendations, selectedDestId]);

  // Load real images lazily for recommendations
  useEffect(() => {
    filteredRecommendations.forEach((rec) => {
      if (!imagesMap[rec.destination_id]) {
        getDestinationImage(rec.name, rec.district, rec.category).then((img) => {
          setImagesMap((prev) => ({ ...prev, [rec.destination_id]: img }));
        });
      }
    });
  }, [filteredRecommendations, imagesMap]);

  // Transform for West Bengal Map
  const mapDestinations: MapDestination[] = useMemo(() => {
    return filteredRecommendations
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({
        destination_id: r.destination_id,
        name: r.name,
        district: r.district,
        category: r.category,
        latitude: r.latitude!,
        longitude: r.longitude!,
        detoura_score: r.detoura_score,
        match_score: r.match_score,
        budget_tier: r.budget_tier,
        estimated_daily_inr: r.estimated_daily_inr || r.budget_per_day
      }));
  }, [filteredRecommendations]);

  const handleSelectCard = (destId: string) => {
    setSelectedDestId(destId);
    const cardElem = document.getElementById(`rec-card-${destId}`);
    if (cardElem) {
      cardElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 mt-20 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-4">
          <span className="material-symbols-outlined text-[32px]">travel_explore</span>
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-2 font-semibold">
          {t('recommendations.noRecsYet')}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mb-6">
          {t('recommendations.tuneDnaPrompt')}
        </p>
        <button 
          onClick={() => navigate('/travel-dna')}
          className="px-6 py-3 bg-primary hover:bg-primary-container text-on-primary font-label-lg rounded-xl shadow-sm transition-all cursor-pointer"
        >
          {t('recommendations.buildTravelDnaBtn')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col w-full">
        {/* Header Section */}
        <div className="px-margin-mobile pt-space-md pb-space-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary">psychology</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">{t('recommendations.modelEngineBadge')}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
                <span className="material-symbols-outlined text-[14px] text-primary">calendar_month</span>
                <span>{t('months.' + (activeMonth || 9)) || travelMonthName} {seasonMode === 'current' ? `(${t('recommendations.currentSeasonBadge')})` : `(${t('recommendations.customSeasonBadge')})`}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-space-xs py-0.5 rounded-full font-medium">
                {filteredRecommendations.length} / {recommendations.length} {t('recommendations.matchedCount')}
              </span>
            </div>
          </div>
          <div className="mt-space-xs">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">
              {t('recommendations.heading')}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
              {t('recommendations.subheading')}
            </p>
          </div>
        </div>

        {/* Top Match Highlight Showcase (Gemma AI or Calibrated Model 2) */}
        {activeOrFallbackIntelligence && (
          <section className="px-margin-mobile my-2">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-surface-container-high border-2 border-primary/30 shadow-md p-4 transition-all">
              <div className="absolute top-0 right-0 w-44 h-44 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
              
              {/* Engine Badge & Duration */}
              <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold shadow-xs ${
                  activeOrFallbackIntelligence.generation_metadata?.source === 'gemma'
                    ? 'bg-primary text-on-primary'
                    : 'bg-secondary text-on-secondary'
                }`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {activeOrFallbackIntelligence.generation_metadata?.source === 'gemma' ? 'psychology' : 'analytics'}
                  </span>
                  <span>
                    {activeOrFallbackIntelligence.generation_metadata?.source === 'gemma'
                      ? t('recommendations.gemmaTopMatch')
                      : t('recommendations.modelTopMatch')}
                  </span>
                </div>
                <span className="text-[12px] font-bold text-secondary-fixed-variant bg-secondary-fixed/50 px-2.5 py-0.5 rounded-full">
                  {tripDays}-{t('common.day')} {t('recommendations.curatedPlanBadge')}
                </span>
              </div>

              {/* Destination Title & District */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    {activeOrFallbackIntelligence.destination.name}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                    <span>{activeOrFallbackIntelligence.destination.address || `${activeOrFallbackIntelligence.destination.district}, West Bengal`}</span>
                    <span>•</span>
                    <span className="font-semibold text-secondary">{activeOrFallbackIntelligence.destination.category || t('common.spot')}</span>
                    {userLocation && activeOrFallbackIntelligence.destination.latitude && activeOrFallbackIntelligence.destination.longitude ? (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-primary font-semibold">
                          <span className="material-symbols-outlined text-[14px]">near_me</span>
                          {formatDistance(activeOrFallbackIntelligence.user_distance?.distance_km ?? calculateHaversineDistance(userLocation.latitude, userLocation.longitude, activeOrFallbackIntelligence.destination.latitude, activeOrFallbackIntelligence.destination.longitude))} {t('destinationDetail.fromYourLocation')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestUserLocation();
                          }}
                          className="inline-flex items-center gap-1 text-primary hover:underline text-[12px] font-medium cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px]">my_location</span>
                          <span>{t('recommendations.enableLocationDistance')}</span>
                        </button>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="px-3 py-1 rounded-xl bg-secondary text-on-secondary font-bold text-label-lg shadow-sm">
                    {Math.min(Math.max(Math.round((activeOrFallbackIntelligence.destination_intelligence.match_score > 1.0 ? activeOrFallbackIntelligence.destination_intelligence.match_score / 2.5 : activeOrFallbackIntelligence.destination_intelligence.match_score) * 100), 50), 99)}% {t('common.match')}
                  </div>
                </div>
              </div>

              {/* AI / Model 2 Explanation / Reasoning */}
              {activeOrFallbackIntelligence.explanation && (
                <div className="mt-2.5 p-3 rounded-xl bg-surface-container/70 border border-outline-variant/30 text-body-sm text-on-surface leading-relaxed">
                  <span className="font-semibold text-primary block mb-0.5 flex items-center gap-1 text-[13px]">
                    <span className="material-symbols-outlined text-[15px]">
                      {activeOrFallbackIntelligence.generation_metadata?.source === 'gemma' ? 'auto_awesome' : 'insights'}
                    </span>
                    {activeOrFallbackIntelligence.generation_metadata?.source === 'gemma'
                      ? t('recommendations.gemmaReasoningTitle')
                      : t('recommendations.modelReasoningTitle')}
                  </span>
                  {activeOrFallbackIntelligence.explanation}
                </div>
              )}

              {/* Key Metrics Chips */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2 rounded-xl bg-surface-container-high/70">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">{t('recommendations.ssiBadge')}</span>
                  <span className="font-label-md font-bold text-primary">
                    {activeOrFallbackIntelligence.destination_intelligence.ssi.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-surface-container-high/70">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">{t('destinationDetail.tranquility')}</span>
                  <span className="font-label-md font-bold text-secondary">
                    {Math.round(activeOrFallbackIntelligence.destination_intelligence.underrated_score * 100)}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-surface-container-high/70">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">{t('destinationDetail.crowdIndex')}</span>
                  <span className="font-label-md font-bold text-on-surface">
                    {activeOrFallbackIntelligence.destination_intelligence.live_cpi.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-outline-variant/30">
                <button
                  id="view-gemma-itinerary-btn"
                  onClick={() => navigate(`/destination/${activeOrFallbackIntelligence.destination.id}`)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span>{t('recommendations.viewCuratedPlan').replace('{tripDays}', String(tripDays))}</span>
                </button>
                <button
                  id="locate-gemma-pin-btn"
                  onClick={() => {
                    handleSelectCard(activeOrFallbackIntelligence.destination.id);
                    const mapElem = document.getElementById('recommendations-map-section');
                    if (mapElem) {
                      mapElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">pin_drop</span>
                  <span>{t('recommendations.locatePin')}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Real Dynamic Budget Filter Component */}
        <section className="px-margin-mobile py-2.5">
          <BudgetFilter
            minBudget={minBudget}
            maxBudget={maxBudget}
            selectedBudget={selectedBudget}
            onBudgetChange={(b) => setSelectedBudget(b)}
            selectedTier={selectedTier}
            onTierChange={(t) => {
              setSelectedTier(t);
              if (t === 'all') {
                setSelectedBudget(maxBudget);
              } else if (t === '1') {
                setSelectedBudget(Math.min(maxBudget, 2200));
              } else if (t === '2') {
                setSelectedBudget(maxBudget);
              } else if (t === '3') {
                setSelectedBudget(maxBudget);
              }
            }}
            availableTiers={availableTiers}
            filteredCount={filteredRecommendations.length}
            totalCount={recommendations.length}
            onReset={() => {
              setSelectedBudget(maxBudget);
              setSelectedTier('all');
            }}
          />
        </section>

        {/* Interactive Leaflet Map of Recommendations (Strictly Synchronized) */}
        {mapDestinations.length > 0 && (
          <section id="recommendations-map-section" className="px-margin-mobile my-2">
            <WestBengalMap
              destinations={mapDestinations}
              selectedDestinationId={selectedDestId}
              onSelectDestination={(dest) => handleSelectCard(dest.destination_id)}
              height="280px"
            />
          </section>
        )}

        {/* Empty Filter State */}
        {filteredRecommendations.length === 0 && (
          <div className="p-8 mx-margin-mobile my-4 bg-surface-container-low rounded-2xl text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant mb-2">filter_alt_off</span>
            <p className="font-body-md text-body-md text-on-surface font-medium">{t('recommendations.noBudgetMatchTitle')}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 mb-4">
              {t('recommendations.noBudgetMatchSubtitle')}
            </p>
            <button
              onClick={() => {
                setSelectedBudget(maxBudget);
                setSelectedTier('all');
              }}
              className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md font-semibold cursor-pointer"
            >
              {t('recommendations.resetBudgetFilter')}
            </button>
          </div>
        )}

        {/* Location Status Prompt Banner (if not granted) */}
        {locationStatus !== 'granted' && (
          <div className="px-margin-mobile my-1.5">
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-3 text-body-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0">near_me</span>
                <span className="text-on-surface-variant truncate">
                  {locationStatus === 'denied'
                    ? t('recommendations.locationDeniedMsg')
                    : locationStatus === 'loading'
                    ? t('recommendations.locationDetectingMsg')
                    : t('recommendations.locationPromptMsg')}
                </span>
              </div>
              {locationStatus === 'prompt' && (
                <button
                  type="button"
                  onClick={() => requestUserLocation()}
                  className="px-3 py-1 bg-primary text-on-primary rounded-lg font-label-sm font-semibold shrink-0 cursor-pointer hover:bg-primary-container shadow-xs"
                >
                  {t('recommendations.enableLocationBtn')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Recommendations Cards Stack */}
        <div className="flex flex-col gap-space-lg px-margin-mobile pb-space-3xl mt-2">
          {filteredRecommendations.map((rec: RecommendResponse, index: number) => {
            const rawScore = rec.match_score || 0;
            const matchPercent = Math.min(Math.max(Math.round((rawScore > 1.0 ? rawScore / 2.5 : rawScore) * 100), 50), 99);
            const isSaved = savedTrips.some((t) => t.destination_id === rec.destination_id);
            const isSelected = selectedDestId === rec.destination_id;
            const dailyCost = Math.round(rec.estimated_daily_inr || rec.budget_per_day || 2000);
            const cardImage = imagesMap[rec.destination_id] || rec.image_url;

            return (
              <article
                key={rec.destination_id}
                id={`rec-card-${rec.destination_id}`}
                onClick={() => setSelectedDestId(rec.destination_id)}
                className={`bg-surface-container-lowest rounded-2xl shadow-md overflow-hidden flex flex-col relative transition-all duration-300 border cursor-pointer ${
                  isSelected ? 'border-primary ring-2 ring-primary/30 shadow-lg' : 'border-outline-variant/30 hover:shadow-lg'
                }`}
              >
                <div className="relative w-full h-52 bg-surface-dim overflow-hidden">
                  <DestinationImage
                    alt={rec.name}
                    name={rec.name}
                    district={rec.district}
                    category={rec.category}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    src={cardImage}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>
                  
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    <span className="bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider px-2.5 py-0.5 rounded shadow-sm font-semibold">
                      {t('recommendations.rankPrefix')} #{index + 1}
                    </span>
                    {rec.district && (
                      <span className="bg-black/50 backdrop-blur-xs text-white font-label-sm text-label-sm px-2 py-0.5 rounded">
                        {rec.district}
                      </span>
                    )}
                    {userLocation && rec.latitude && rec.longitude && (
                      <span className="bg-surface/95 backdrop-blur-xs text-on-surface font-label-sm text-label-sm px-2 py-0.5 rounded shadow-xs font-semibold inline-flex items-center gap-0.5">
                        <span className="text-[12px]">📍</span>
                        <span>{formatDistance(rec.distance_km ?? calculateHaversineDistance(userLocation.latitude, userLocation.longitude, rec.latitude, rec.longitude))} {t('common.kmAway')}</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <div className="bg-surface-container-lowest/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      <span className="font-label-sm text-label-sm font-bold text-on-surface">{matchPercent}% {t('common.match')}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <div>
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed font-bold">
                        {rec.category || t('common.spot')}
                      </span>
                      <h3 className="font-headline-md text-headline-md text-white font-bold leading-tight mt-0.5">
                        {rec.name}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="font-label-sm text-[10px] text-white/70 block uppercase">{t('recommendations.estDaily')}</span>
                      <span className="font-headline-sm text-headline-sm text-white font-bold">₹{dailyCost}{t('common.perDay')}</span>
                    </div>
                  </div>
                </div>

                {/* Card Content Details */}
                <div className="p-space-md flex flex-col gap-space-sm">
                  {/* Verified Address */}
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-[12px] font-medium">
                    <span className="material-symbols-outlined text-[15px] text-primary shrink-0">location_on</span>
                    <span className="truncate">{rec.address || (rec.district ? `${rec.name}, ${rec.district}, West Bengal` : 'West Bengal')}</span>
                  </div>

                  {/* Underrated & Crowd Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-surface-container-low text-on-surface">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[20px]">diamond</span>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-[10px] text-on-surface-variant uppercase">{t('recommendations.tranquilityScore')}</span>
                        <span className="font-label-md text-label-md font-bold text-secondary">
                          {Math.round((rec.underrated_score || 0.6) * 100)}% {t('recommendations.offbeatLabel')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">group</span>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-[10px] text-on-surface-variant uppercase">{t('recommendations.crowdPressureLabel')}</span>
                        <span className="font-label-md text-label-md font-bold text-primary">
                          {Math.round((rec.cpi_used || 0.3) * 100)}% {t('recommendations.lowDensity')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                    {rec.description || `${rec.name} in ${rec.district || 'West Bengal'} offers a calibrated offbeat detour with high scenic value and low crowd congestion.`}
                  </p>

                  <div className="pt-2 border-t border-surface-container flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`view-pin-btn-${rec.destination_id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCard(rec.destination_id);
                          const mapElem = document.getElementById('recommendations-map-section');
                          if (mapElem) {
                            mapElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        title={t('recommendations.viewPinOnMap')}
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                        <span>{t('explore.viewPin')}</span>
                      </button>

                      <button
                        id={`save-trip-btn-${rec.destination_id}`}
                        disabled={savingTripId === rec.destination_id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (savingTripId === rec.destination_id) return;
                          setSavingTripId(rec.destination_id);
                          try {
                            if (isSaved) {
                              await removeTrip(rec.destination_id);
                            } else {
                              await addTrip(rec);
                            }
                          } catch (err: any) {
                            alert(err?.message || 'Failed to update saved trips.');
                          } finally {
                            setSavingTripId(null);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-label-md text-label-md font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                          isSaved
                            ? 'bg-secondary-fixed text-on-secondary-fixed-variant shadow-xs'
                            : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
                        } ${savingTripId === rec.destination_id ? 'opacity-70 cursor-wait' : ''}`}
                      >
                        <span className={`material-symbols-outlined text-[16px] ${savingTripId === rec.destination_id ? 'animate-spin' : ''}`}>
                          {savingTripId === rec.destination_id
                            ? 'progress_activity'
                            : (isSaved ? 'bookmark_added' : 'bookmark_add')}
                        </span>
                        <span>{isSaved ? t('common.saved') : t('common.save')}</span>
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/destination/${rec.destination_id}`);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer ml-auto"
                    >
                      <span>{t('common.viewDetails')}</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
