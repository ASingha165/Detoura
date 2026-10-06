import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDetoura } from '../DetouraContext';
import type { RecommendResponse } from '../api';
import { formatDistance, calculateHaversineDistance, getIntelligenceRecommendation } from '../api';
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

  // Synchronize top match intelligence narrative with selected language
  useEffect(() => {
    const destId = activeIntelligence?.destination?.id || recommendations[0]?.destination_id;
    if (!destId) return;

    const currentExplanation = activeIntelligence?.explanation || '';
    const hasBengali = /[\u0980-\u09FF]/.test(currentExplanation);
    const hasHindi = /[\u0900-\u097F]/.test(currentExplanation);

    const needsSync =
      (language === 'bn' && !hasBengali) ||
      (language === 'hi' && !hasHindi) ||
      (language === 'en' && (hasBengali || hasHindi));

    const getLocalizedFallbackDesc = (recName: string, district?: string) => {
      if (language === 'bn') {
        return `DETOURA আপনার ট্রাভেল ডিএনএ এবং অফবিট পছন্দের ওপর ভিত্তি করে ${recName} (${district || 'পশ্চিমবঙ্গ'}) নির্বাচন করেছে। মনোরম প্রাকৃতিক পরিবেশ এবং আঞ্চলিক ঐতিহ্য উপভোগ করুন।`;
      }
      if (language === 'hi') {
        return `DETOURA ने आपके यात्रा डीएनए और प्राथमिकताओं के आधार पर ${recName} (${district || 'पश्चिम बंगाल'}) का चयन किया है। शांत प्राकृतिक सुंदरता और स्थानीय संस्कृति का अनुभव करें।`;
      }
      return `DETOURA matched ${recName} (${district || 'West Bengal'}) with your travel DNA. Enjoy peaceful scenery, local heritage, and an authentic regional detour.`;
    };

    const getLocalizedFallbackHighlights = (district?: string, category?: string, tier?: number) => {
      if (language === 'bn') {
        return [
          district ? `জেলা: ${district}` : 'মনোরম বাংলা',
          category ? `ধরণ: ${category}` : 'অফবিট রুট',
          tier === 1 ? 'বাজেট বান্ধব' : tier === 3 ? 'প্রিমিয়াম ঐতিহ্য' : 'পরিমিত স্বাচ্ছন্দ্য'
        ];
      }
      if (language === 'hi') {
        return [
          district ? `ज़िला: ${district}` : 'सुंदर बंगाल',
          category ? `श्रेणी: ${category}` : 'ऑफबीट मार्ग',
          tier === 1 ? 'बजट अनुकूल' : tier === 3 ? 'प्रीमियम हेरिटेज' : 'मध्यम आराम'
        ];
      }
      return [
        district ? `District: ${district}` : 'Scenic Bengal',
        category ? `Vibe: ${category}` : 'Offbeat Route',
        tier === 1 ? 'Budget Friendly' : tier === 3 ? 'Premium Heritage' : 'Moderate Comfort'
      ];
    };

    if (needsSync) {
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
                : {
                    ...r,
                    description: getLocalizedFallbackDesc(r.name, r.district),
                    highlights: getLocalizedFallbackHighlights(r.district, r.category, r.budget_tier),
                  }
            )
          );
        })
        .catch((err) => console.warn('Language sync notice:', err));
    }
  }, [language, activeIntelligence?.destination?.id, tripDays, userLocation?.latitude, userLocation?.longitude]);

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
        <h2 className="font-headline-md text-headline-md text-on-surface mb-2">No recommendations yet</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mb-6">
          Tune your Travel DNA affinity sliders to generate bespoke West Bengal detours.
        </p>
        <button 
          onClick={() => navigate('/travel-dna')}
          className="px-6 py-3 bg-primary hover:bg-primary-container text-on-primary font-label-lg rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Build Travel DNA
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
                <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">Model 2 • Regional Engine</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
                <span className="material-symbols-outlined text-[14px] text-primary">calendar_month</span>
                <span>{travelMonthName} {seasonMode === 'current' ? '(Current Season)' : '(Custom)'}</span>
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

        {/* Gemma AI Top Match Highlight Showcase */}
        {activeIntelligence && (
          <section className="px-margin-mobile my-2">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-surface-container-high border-2 border-primary/30 shadow-md p-4 transition-all">
              <div className="absolute top-0 right-0 w-44 h-44 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
              
              {/* Engine Badge & Duration */}
              <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-semibold shadow-xs">
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                  <span>Gemma AI Generative Top Match</span>
                </div>
                <span className="text-[12px] font-bold text-secondary-fixed-variant bg-secondary-fixed/50 px-2.5 py-0.5 rounded-full">
                  {tripDays}-Day Curated Plan
                </span>
              </div>

              {/* Destination Title & District */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    {activeIntelligence.destination.name}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                    <span>{activeIntelligence.destination.address || `${activeIntelligence.destination.district}, West Bengal`}</span>
                    <span>•</span>
                    <span className="font-semibold text-secondary">{activeIntelligence.destination.category}</span>
                    {userLocation && activeIntelligence.destination.latitude && activeIntelligence.destination.longitude ? (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-primary font-semibold">
                          <span className="material-symbols-outlined text-[14px]">near_me</span>
                          {formatDistance(activeIntelligence.user_distance?.distance_km ?? calculateHaversineDistance(userLocation.latitude, userLocation.longitude, activeIntelligence.destination.latitude, activeIntelligence.destination.longitude))} from your location
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
                          <span>Enable location for distance</span>
                        </button>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="px-3 py-1 rounded-xl bg-secondary text-on-secondary font-bold text-label-lg shadow-sm">
                    {Math.min(Math.max(Math.round((activeIntelligence.destination_intelligence.match_score > 1.0 ? activeIntelligence.destination_intelligence.match_score / 2.5 : activeIntelligence.destination_intelligence.match_score) * 100), 50), 99)}% Match
                  </div>
                </div>
              </div>

              {/* AI Explanation / Reasoning */}
              {activeIntelligence.explanation && (
                <div className="mt-2.5 p-3 rounded-xl bg-surface-container/70 border border-outline-variant/30 text-body-sm text-on-surface leading-relaxed">
                  <span className="font-semibold text-primary block mb-0.5 flex items-center gap-1 text-[13px]">
                    <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                    Gemma Generative Synthesis &amp; Match Reasoning:
                  </span>
                  {activeIntelligence.explanation}
                </div>
              )}

              {/* Key Metrics Chips */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2 rounded-xl bg-surface-container-high/70">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Season SSI</span>
                  <span className="font-label-md font-bold text-primary">
                    {activeIntelligence.destination_intelligence.ssi.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-surface-container-high/70">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Tranquility</span>
                  <span className="font-label-md font-bold text-secondary">
                    {Math.round(activeIntelligence.destination_intelligence.underrated_score * 100)}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-surface-container-high/70">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Crowd Index</span>
                  <span className="font-label-md font-bold text-on-surface">
                    {activeIntelligence.destination_intelligence.live_cpi.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-outline-variant/30">
                <button
                  id="view-gemma-itinerary-btn"
                  onClick={() => navigate(`/destination/${activeIntelligence.destination.id}`)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span>View {tripDays}-Day AI Itinerary</span>
                </button>
                <button
                  id="locate-gemma-pin-btn"
                  onClick={() => {
                    handleSelectCard(activeIntelligence.destination.id);
                    const mapElem = document.getElementById('recommendations-map-section');
                    if (mapElem) {
                      mapElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">pin_drop</span>
                  <span>Locate Pin</span>
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
            <p className="font-body-md text-body-md text-on-surface font-medium">No destinations match this budget criteria</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 mb-4">
              Try selecting "All Tiers" or increasing the daily budget ceiling.
            </p>
            <button
              onClick={() => {
                setSelectedBudget(maxBudget);
                setSelectedTier('all');
              }}
              className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md font-semibold cursor-pointer"
            >
              Reset Budget Filter
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
                    ? 'Location permission denied. Enable in browser for live distance & directions.'
                    : locationStatus === 'loading'
                    ? 'Detecting your live position...'
                    : 'Enable live location to see exact distance and driving directions.'}
                </span>
              </div>
              {locationStatus === 'prompt' && (
                <button
                  type="button"
                  onClick={() => requestUserLocation()}
                  className="px-3 py-1 bg-primary text-on-primary rounded-lg font-label-sm font-semibold shrink-0 cursor-pointer hover:bg-primary-container shadow-xs"
                >
                  Enable Location
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
                      Rank #{index + 1}
                    </span>
                    {rec.district && (
                      <span className="bg-black/50 backdrop-blur-xs text-white font-label-sm text-label-sm px-2 py-0.5 rounded">
                        {rec.district}
                      </span>
                    )}
                    {userLocation && rec.latitude && rec.longitude && (
                      <span className="bg-surface/95 backdrop-blur-xs text-on-surface font-label-sm text-label-sm px-2 py-0.5 rounded shadow-xs font-semibold inline-flex items-center gap-0.5">
                        <span className="text-[12px]">📍</span>
                        <span>{formatDistance(rec.distance_km ?? calculateHaversineDistance(userLocation.latitude, userLocation.longitude, rec.latitude, rec.longitude))} away</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <div className="bg-surface-container-lowest/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      <span className="font-label-sm text-label-sm font-bold text-on-surface">{matchPercent}% Match</span>
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <div>
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed font-bold">
                        {rec.category || 'Spot'}
                      </span>
                      <h3 className="font-headline-md text-headline-md text-white font-bold leading-tight mt-0.5">
                        {rec.name}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="font-label-sm text-[10px] text-white/70 block uppercase">Est. Daily</span>
                      <span className="font-headline-sm text-headline-sm text-white font-bold">₹{dailyCost}</span>
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
                        <span className="font-label-sm text-[10px] text-on-surface-variant uppercase">Tranquility Score</span>
                        <span className="font-label-md text-label-md font-bold text-secondary">
                          {Math.round((rec.underrated_score || 0.6) * 100)}% Offbeat
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">group</span>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-[10px] text-on-surface-variant uppercase">Crowd Pressure</span>
                        <span className="font-label-md text-label-md font-bold text-primary">
                          {Math.round((rec.cpi_used || 0.3) * 100)}% Low Density
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
                        title="View Pin on Map"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                        <span>View Pin</span>
                      </button>

                      <button
                        id={`save-trip-btn-${rec.destination_id}`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            if (isSaved) {
                              await removeTrip(rec.destination_id);
                            } else {
                              await addTrip(rec);
                            }
                          } catch (err: any) {
                            alert(err?.message || 'Failed to update saved trips.');
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-label-md text-label-md font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                          isSaved
                            ? 'bg-secondary-fixed text-on-secondary-fixed-variant shadow-xs'
                            : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isSaved ? 'bookmark_added' : 'bookmark_add'}
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
