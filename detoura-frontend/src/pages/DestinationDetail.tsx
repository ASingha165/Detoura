import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDetoura } from '../DetouraContext';
import { getDestinationImage } from '../services/imageService';
import DestinationImage from '../components/DestinationImage';
import fallbackDestinations from '../data/destinations.json';
import {
  getIntelligenceRecommendation,
  formatDistance,
  calculateHaversineDistance,
  getDirectionsUrl,
  type ActivityItem,
  type DayPlan,
  type RecommendResponse
} from '../api';
import LanguageSelector from '../components/LanguageSelector';

export default function DestinationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    recommendations,
    addTrip,
    removeTrip,
    savedTrips,
    activeIntelligence,
    setActiveIntelligence,
    tripDays,
    setRecommendations,
    userLocation,
    locationStatus,
    requestUserLocation,
    language,
    t
  } = useDetoura();

  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [selectedDayTab, setSelectedDayTab] = useState<string>('all');
  const [localDestination, setLocalDestination] = useState<RecommendResponse | null>(() => {
    if (!id) return null;
    const found = (fallbackDestinations as any[]).find(d => d.destination_id === id);
    if (!found) return null;
    return {
      destination_id: found.destination_id,
      name: found.name,
      district: found.district || 'West Bengal',
      category: found.category || 'Regional Discovery',
      latitude: found.latitude,
      longitude: found.longitude,
      address: `${found.name}, ${found.district || 'West Bengal'}, West Bengal`,
      state: 'West Bengal',
      budget_tier: found.budget_tier || 2,
      estimated_daily_inr: found.estimated_daily_inr || 2000,
      detoura_score: 2.2,
      similarity_score: 0.85,
      cpi_used: found.crowd_pressure_index || 0.05,
      underrated_score: found.underrated_score || 0.45,
      ssi: found.ssi || 0.95,
      match_score: 0.88,
      recommended_duration_days: tripDays,
      budget_per_day: found.estimated_daily_inr || 2000,
      travel_style: found.category || 'Regional Discovery',
      description: `DETOURA matched ${found.name} in ${found.district || 'West Bengal'} with your travel preferences.`,
      highlights: [
        `District: ${found.district || 'West Bengal'}`,
        `Vibe: ${found.category || 'Offbeat'}`,
        found.budget_tier === 1 ? 'Budget Friendly' : 'Comfortable Stay'
      ]
    };
  });

  // Reset local state when target destination ID changes to prevent stale data
  useEffect(() => {
    if (!id) {
      setLocalDestination(null);
    } else {
      const found = (fallbackDestinations as any[]).find(d => d.destination_id === id);
      if (found) {
        setLocalDestination({
          destination_id: found.destination_id,
          name: found.name,
          district: found.district || 'West Bengal',
          category: found.category || 'Regional Discovery',
          latitude: found.latitude,
          longitude: found.longitude,
          address: `${found.name}, ${found.district || 'West Bengal'}, West Bengal`,
          state: 'West Bengal',
          budget_tier: found.budget_tier || 2,
          estimated_daily_inr: found.estimated_daily_inr || 2000,
          detoura_score: 2.2,
          similarity_score: 0.85,
          cpi_used: found.crowd_pressure_index || 0.05,
          underrated_score: found.underrated_score || 0.45,
          ssi: found.ssi || 0.95,
          match_score: 0.88,
          recommended_duration_days: tripDays,
          budget_per_day: found.estimated_daily_inr || 2000,
          travel_style: found.category || 'Regional Discovery',
          description: `DETOURA matched ${found.name} in ${found.district || 'West Bengal'} with your travel preferences.`,
          highlights: [
            `District: ${found.district || 'West Bengal'}`,
            `Vibe: ${found.category || 'Offbeat'}`,
            found.budget_tier === 1 ? 'Budget Friendly' : 'Comfortable Stay'
          ]
        });
      }
    }
    setHeroImage(null);
    setSynthesisError(null);
  }, [id, tripDays]);

  // Match destination from current recommendations, activeIntelligence, or verified localDestination
  const ai = activeIntelligence;
  const currentDest: RecommendResponse | null =
    (id ? recommendations.find((r) => r.destination_id === id) : null) ||
    (ai && ai.destination && ai.destination.id === id ? {
      destination_id: ai.destination.id,
      name: ai.destination.name,
      district: ai.destination.district,
      category: ai.destination.category,
      latitude: ai.destination.latitude,
      longitude: ai.destination.longitude,
      address: ai.destination.address || (ai.destination.district ? `${ai.destination.name}, ${ai.destination.district}, West Bengal` : 'West Bengal'),
      state: ai.destination.state || 'West Bengal',
      budget_tier: ai.destination_intelligence?.budget_tier || (ai.traveler?.budget_level === 'Premium' ? 3 : ai.traveler?.budget_level === 'Budget' ? 1 : 2),
      estimated_daily_inr: ai.destination_intelligence?.estimated_daily_inr || (ai.traveler?.budget_level === 'Premium' ? 3500 : ai.traveler?.budget_level === 'Budget' ? 1200 : 2000),
      detoura_score: ai.destination_intelligence.match_score * 2.0,
      similarity_score: ai.destination_intelligence.match_score,
      cpi_used: ai.destination_intelligence.live_cpi,
      underrated_score: ai.destination_intelligence.underrated_score,
      ssi: ai.destination_intelligence.ssi,
      match_score: ai.destination_intelligence.match_score,
      distance_km: (userLocation && ai.destination.latitude && ai.destination.longitude ? calculateHaversineDistance(userLocation.latitude, userLocation.longitude, ai.destination.latitude, ai.destination.longitude) : undefined),
      recommended_duration_days: tripDays,
      budget_per_day: ai.destination_intelligence?.estimated_daily_inr || (ai.traveler?.budget_level === 'Premium' ? 3500 : ai.traveler?.budget_level === 'Budget' ? 1200 : 2000),
      travel_style: ai.destination.category,
      description: ai.explanation,
      highlights: ai.activities?.map(a => a.activity),
      activities: ai.activities,
      itinerary: ai.itinerary,
      model3_payload: ai
    } as RecommendResponse : null) || (localDestination && localDestination.destination_id === id ? localDestination : null);

  // If destination is missing itinerary or activities, load in background
  useEffect(() => {
    let isMounted = true;
    if (id && (!currentDest?.itinerary || !currentDest?.activities)) {
      setIsSynthesizing(true);
      getIntelligenceRecommendation({
        destination_id: id,
        trip_days: tripDays,
        language: language,
        user_lat: userLocation?.latitude,
        user_lon: userLocation?.longitude,
      })
        .then((payload) => {
          if (!isMounted) return;
          setActiveIntelligence(payload);
          const topRec = payload.recommendations?.[0];
          const synthesizedDest: RecommendResponse = {
            destination_id: payload.destination.id,
            name: payload.destination.name,
            district: payload.destination.district,
            category: payload.destination.category,
            latitude: payload.destination.latitude,
            longitude: payload.destination.longitude,
            address: payload.destination.address || (payload.destination.district ? `${payload.destination.name}, ${payload.destination.district}, West Bengal` : 'West Bengal'),
            state: payload.destination.state || 'West Bengal',
            budget_tier: topRec?.budget_tier || payload.destination_intelligence?.budget_tier || (payload.traveler?.budget_level === 'Premium' ? 3 : payload.traveler?.budget_level === 'Budget' ? 1 : 2),
            estimated_daily_inr: topRec?.estimated_daily_inr || payload.destination_intelligence?.estimated_daily_inr || (payload.traveler?.budget_level === 'Premium' ? 3500 : payload.traveler?.budget_level === 'Budget' ? 1200 : 2000),
            detoura_score: topRec?.detoura_score || 2.2,
            similarity_score: payload.destination_intelligence.match_score,
            cpi_used: payload.destination_intelligence.live_cpi,
            underrated_score: payload.destination_intelligence.underrated_score,
            ssi: payload.destination_intelligence.ssi,
            match_score: payload.destination_intelligence.match_score,
            distance_km: (userLocation && payload.destination.latitude && payload.destination.longitude ? calculateHaversineDistance(userLocation.latitude, userLocation.longitude, payload.destination.latitude, payload.destination.longitude) : payload.user_distance?.distance_km ?? undefined),
            recommended_duration_days: tripDays,
            budget_per_day: topRec?.estimated_daily_inr || payload.destination_intelligence?.estimated_daily_inr || (payload.traveler?.budget_level === 'Premium' ? 3500 : payload.traveler?.budget_level === 'Budget' ? 1200 : 2000),
            travel_style: payload.destination.category,
            description: payload.explanation,
            highlights: payload.activities?.map(a => a.activity),
            activities: payload.activities,
            itinerary: payload.itinerary,
            model3_payload: payload
          };
          setLocalDestination(synthesizedDest);
        })
        .catch((err) => {
          console.warn("Direct destination fetch notice:", err);
        })
        .finally(() => {
          if (isMounted) setIsSynthesizing(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [id, tripDays, language, userLocation?.latitude, userLocation?.longitude, setActiveIntelligence]);

  useEffect(() => {
    if (currentDest) {
      getDestinationImage(currentDest.name, currentDest.district, currentDest.category).then((img) => {
        setHeroImage(img);
      });
    }
  }, [currentDest]);

  // Determine itinerary and activities
  const matchingIntelligence = (activeIntelligence?.destination?.id === currentDest?.destination_id)
    ? activeIntelligence
    : currentDest?.model3_payload;

  const itinerary: Record<string, DayPlan> | undefined = currentDest?.itinerary || matchingIntelligence?.itinerary;
  const activities: ActivityItem[] | undefined = currentDest?.activities || matchingIntelligence?.activities;
  const aiExplanation = currentDest?.description || matchingIntelligence?.explanation;

  // Synchronize destination narrative and itinerary with selected language (en, hi, bn)
  useEffect(() => {
    if (!id || isSynthesizing) return;
    const currentExp = aiExplanation || '';
    const hasBengali = /[\u0980-\u09FF]/.test(currentExp);
    const hasHindi = /[\u0900-\u097F]/.test(currentExp);

    const needsSync =
      (language === 'bn' && !hasBengali) ||
      (language === 'hi' && !hasHindi) ||
      (language === 'en' && (hasBengali || hasHindi));

    if (needsSync) {
      setIsSynthesizing(true);
      getIntelligenceRecommendation({
        destination_id: id,
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
                    itinerary: payload.itinerary,
                    activities: payload.activities,
                    description: payload.explanation || r.description,
                    model3_payload: payload,
                  }
                : r
            )
          );
          if (localDestination) {
            setLocalDestination({
              ...localDestination,
              itinerary: payload.itinerary,
              activities: payload.activities,
              description: payload.explanation,
              model3_payload: payload,
            });
          }
        })
        .catch((err) => console.warn('Language sync notice:', err))
        .finally(() => setIsSynthesizing(false));
    }
  }, [language, id, aiExplanation, tripDays, userLocation?.latitude, userLocation?.longitude]);

  const handleSynthesizeOnDemand = async () => {
    if (!currentDest) return;
    setIsSynthesizing(true);
    setSynthesisError(null);
    try {
      const payload = await getIntelligenceRecommendation({
        destination_id: currentDest.destination_id,
        trip_days: tripDays,
        language: language,
      });

      setActiveIntelligence(payload);
      
      // Update destination in recommendation list with synthesized itinerary and activities
      setRecommendations(
        recommendations.map((r) =>
          r.destination_id === currentDest.destination_id
            ? {
                ...r,
                itinerary: payload.itinerary,
                activities: payload.activities,
                description: payload.explanation || r.description,
                model3_payload: payload
              }
            : r
        )
      );

      if (localDestination) {
        setLocalDestination({
          ...localDestination,
          itinerary: payload.itinerary,
          activities: payload.activities,
          description: payload.explanation,
          model3_payload: payload
        });
      }
    } catch (err: any) {
      console.warn("Synthesize notice:", err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  if (!currentDest) {
    return (
      <div className="flex flex-col items-center justify-center p-8 mt-20 text-center">
        {isSynthesizing ? (
          <>
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-4 animate-spin">
              <span className="material-symbols-outlined text-[32px]">sync</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
              {t('destinationDetail.synthesizingTitle')}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mb-6">
              {t('destinationDetail.synthesizingDesc')}
            </p>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">explore_off</span>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">{t('destinationDetail.notFoundTitle')}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              {synthesisError || t('destinationDetail.notFoundDesc')}
            </p>
            <button 
              onClick={() => navigate('/recommendations')}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-label-md font-semibold cursor-pointer shadow-sm hover:bg-primary-container transition-colors"
            >
              {t('destinationDetail.viewRecommendationsBtn')}
            </button>
          </>
        )}
      </div>
    );
  }

  const isSaved = savedTrips.some((t) => t.destination_id === currentDest.destination_id);
  const dailyCost = Math.round(currentDest.estimated_daily_inr || currentDest.budget_per_day || 2000);
  const displayImage = heroImage || currentDest.image_url;
  const daysList = itinerary ? Object.keys(itinerary).sort() : [];

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col w-full pb-28">
        {/* Top Navigation & Action Strip */}
        <div className="px-margin-mobile pt-space-sm pb-space-xs flex items-center justify-between">
          <button 
            className="inline-flex items-center gap-1 text-secondary font-label-md text-label-md hover:text-on-secondary-fixed-variant transition-colors py-1.5 px-3 rounded-full bg-secondary-fixed/30 active:scale-95 cursor-pointer" 
            onClick={() => navigate('/recommendations')}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>{t('destinationDetail.backBtn')}</span>
          </button>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button 
              disabled={isSavingTrip}
              onClick={async () => {
                if (isSavingTrip) return;
                setIsSavingTrip(true);
                try {
                  if (isSaved) {
                    await removeTrip(currentDest.destination_id);
                  } else {
                    await addTrip(currentDest);
                  }
                } catch (err: any) {
                  alert(err?.message || 'Failed to update saved trips.');
                } finally {
                  setIsSavingTrip(false);
                }
              }}
              aria-label={isSaved ? t('destinationDetail.savedTrip') : t('destinationDetail.saveTrip')} 
              className={`w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center active:scale-90 transition-transform shadow-sm cursor-pointer ${
                isSaved ? 'text-primary' : 'text-on-surface-variant'
              } ${isSavingTrip ? 'opacity-70 cursor-wait' : ''}`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isSavingTrip ? 'animate-spin' : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {isSavingTrip ? 'progress_activity' : (isSaved ? 'bookmark' : 'bookmark_border')}
              </span>
            </button>
          </div>
        </div>

        {/* Hero Visual Frame */}
        <div className="px-margin-mobile mt-space-2xs">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-md bg-surface-container-highest">
            <DestinationImage
              alt={currentDest.name}
              name={currentDest.name}
              category={currentDest.category}
              className="w-full h-72 object-cover object-center"
              src={displayImage}
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none"></div>
            
            {/* Badges */}
            <div className="absolute top-3.5 left-3.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface/90 backdrop-blur-md text-secondary font-label-sm text-label-sm uppercase tracking-wider shadow-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                {currentDest.district || 'West Bengal'}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white font-label-sm text-label-sm font-medium">
                {currentDest.category || 'Spot'}
              </span>
            </div>

            <div className="absolute top-3.5 right-3.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-on-secondary font-label-md text-label-md shadow-md">
                <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">auto_awesome</span>
                <span>{Math.min(Math.max(Math.round(((currentDest.match_score || 0.85) > 1.0 ? (currentDest.match_score || 0.85) / 2.5 : (currentDest.match_score || 0.85)) * 100), 50), 99)}% {t('destinationDetail.dnaMatch')}</span>
              </div>
            </div>

            <div className="absolute bottom-3.5 inset-x-3.5 text-surface-bright flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-tertiary-fixed text-label-sm font-label-sm tracking-wide">
                <span className="material-symbols-outlined text-[15px]">near_me</span>
                <span>
                  {userLocation && currentDest.latitude && currentDest.longitude
                    ? `${formatDistance(currentDest.distance_km ?? calculateHaversineDistance(userLocation.latitude, userLocation.longitude, currentDest.latitude, currentDest.longitude))} ${t('destinationDetail.fromYourLocation')}`
                    : currentDest.distance_km ? `${formatDistance(currentDest.distance_km)} ${t('destinationDetail.fromOrigin')}` : t('destinationDetail.liveDistUnavailable')}
                </span>
              </div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-white font-bold leading-tight drop-shadow-sm">
                {currentDest.name}
              </h1>
            </div>
          </div>
        </div>

        {/* Essential Trip Metadata Grid */}
        <div className="px-margin-mobile mt-space-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-surface-container-low p-3 rounded-xl flex items-start gap-2.5 shadow-sm border border-outline-variant/30">
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">timelapse</span>
              </div>
              <div className="min-w-0">
                <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider block">{t('destinationDetail.duration')}</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold truncate block">
                  {tripDays || currentDest.recommended_duration_days || 3} {t('common.days')}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low p-3 rounded-xl flex items-start gap-2.5 shadow-sm border border-outline-variant/30">
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </div>
              <div className="min-w-0">
                <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider block">{t('destinationDetail.realBudget')}</span>
                <span className="font-label-md text-label-md text-secondary font-bold truncate block">
                  ₹{dailyCost}/{t('common.day')}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low p-3 rounded-xl flex items-start gap-2.5 shadow-sm border border-outline-variant/30">
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">diamond</span>
              </div>
              <div className="min-w-0">
                <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider block">{t('destinationDetail.tranquility')}</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold truncate block">
                  {Math.round((currentDest.underrated_score || 0.7) * 100)}% {t('destinationDetail.offbeat')}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low p-3 rounded-xl flex items-start gap-2.5 shadow-sm border border-outline-variant/30">
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">groups</span>
              </div>
              <div className="min-w-0">
                <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider block">{t('destinationDetail.crowdIndex')}</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold truncate block">
                  {(currentDest.cpi_used || 0.25).toFixed(2)} CPI
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Geographic Information, Distance & Directions Card */}
        <div className="px-margin-mobile mt-space-sm">
          <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">location_on</span>
                <h3 className="font-label-lg text-label-lg font-bold text-on-surface">{t('destinationDetail.verifiedAddressNav')}</h3>
              </div>
              <span className="font-label-sm text-[11px] bg-secondary-fixed text-on-secondary-fixed-variant px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                {t('destinationDetail.verifiedGeodata')}
              </span>
            </div>

            {/* Official Address */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1">
              <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">{t('destinationDetail.address')}</span>
              <p className="font-body-md text-body-md text-on-surface font-semibold">
                {currentDest.address || (currentDest.district ? `${currentDest.name}, ${currentDest.district}, West Bengal` : 'West Bengal')}
              </p>
              {currentDest.latitude && currentDest.longitude ? (
                <span className="font-label-sm text-[11px] text-on-surface-variant">
                  {t('destinationDetail.coordinates')}: {currentDest.latitude.toFixed(4)}° N, {currentDest.longitude.toFixed(4)}° E
                </span>
              ) : (
                <span className="font-label-sm text-[11px] text-error">
                  {t('destinationDetail.coordsUnavailable')}
                </span>
              )}
            </div>

            {/* Distance from Location & How to Reach */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-2">
                <div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold block">{t('destinationDetail.distanceFromLoc')}</span>
                  <span className="font-headline-sm text-headline-sm text-primary font-bold block mt-0.5">
                    {userLocation && currentDest.latitude && currentDest.longitude
                      ? `${formatDistance(currentDest.distance_km ?? calculateHaversineDistance(userLocation.latitude, userLocation.longitude, currentDest.latitude, currentDest.longitude))} ${t('destinationDetail.fromYourLocation')}`
                      : locationStatus === 'loading'
                      ? t('destinationDetail.detectingLocation')
                      : locationStatus === 'denied'
                      ? t('destinationDetail.locationDenied')
                      : t('destinationDetail.locationNotEnabled')}
                  </span>
                </div>
                {!userLocation && (
                  <button
                    type="button"
                    onClick={() => requestUserLocation()}
                    disabled={locationStatus === 'loading'}
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm font-semibold hover:bg-primary-container cursor-pointer transition-all shadow-xs shrink-0 disabled:opacity-50"
                  >
                    {locationStatus === 'loading' ? t('destinationDetail.detectingBtn') : t('destinationDetail.enableLocation')}
                  </button>
                )}
              </div>

              {/* How to Reach / Directions */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold block">{t('destinationDetail.howToReach')}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant truncate block mt-0.5">
                    {t('destinationDetail.openDirectionsSub')}
                  </span>
                </div>
                {currentDest.latitude && currentDest.longitude ? (
                  userLocation?.latitude && userLocation?.longitude ? (
                    <a
                      id="destination-directions-btn"
                      href={getDirectionsUrl(
                        currentDest.latitude,
                        currentDest.longitude,
                        userLocation.latitude,
                        userLocation.longitude
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        console.log(`[DETOURA DIRECTIONS DISPATCH] Origin: ${userLocation.latitude},${userLocation.longitude} | Destination: ${currentDest.name} (${currentDest.latitude},${currentDest.longitude})`);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary font-label-md font-semibold hover:bg-secondary/90 transition-all inline-flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">directions</span>
                      <span>{t('destinationDetail.directionsBtn')}</span>
                    </a>
                  ) : (
                    <button
                      id="destination-enable-location-btn"
                      type="button"
                      onClick={() => requestUserLocation()}
                      disabled={locationStatus === 'loading'}
                      className="px-3.5 py-2 rounded-xl bg-secondary/15 text-secondary hover:bg-secondary/25 border border-secondary/30 font-label-md font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                      title={t('destinationDetail.enableLocationForDirections')}
                    >
                      <span className="material-symbols-outlined text-[18px]">near_me</span>
                      <span>{locationStatus === 'loading' ? t('destinationDetail.detectingBtn') : t('destinationDetail.enableLocationForDirections')}</span>
                    </button>
                  )
                ) : (
                  <span className="text-[12px] text-on-surface-variant italic">
                    {t('destinationDetail.directionsUnavailable')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Why DETOURA picked this (Gemma Generative Reasoning) */}
        <div className="px-margin-mobile mt-space-md">
          <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm relative overflow-hidden border border-outline-variant/30">
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-secondary-fixed/20 pointer-events-none blur-2xl"></div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                <span className="material-symbols-outlined text-[15px]">psychology</span>
              </div>
              <span className="font-label-md text-label-md font-semibold text-secondary uppercase tracking-wider">
                {t('destinationDetail.aiSynthesisTitle')}
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
              {aiExplanation || `${currentDest.name} in ${currentDest.district || 'West Bengal'} was calibrated using high cosine similarity to your travel weights, high offbeat index, and comfortable seasonal parameters.`}
            </p>
          </div>
        </div>

        {/* Destination Intelligence Metrics Deep Dive */}
        <div className="px-margin-mobile mt-space-md">
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
                <span>{t('destinationDetail.destinationIntelligence')}</span>
              </h3>
              <span className="font-label-sm text-[11px] bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-bold">
                {t('destinationDetail.contractVerified')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">{t('destinationDetail.matchScore')}</span>
                <span className="text-lg font-bold text-primary">
                  {Math.min(Math.max(Math.round(((currentDest.match_score || 0.85) > 1.0 ? (currentDest.match_score || 0.85) / 2.5 : (currentDest.match_score || 0.85)) * 100), 50), 99)}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">{t('destinationDetail.seasonSsi')}</span>
                <span className="text-lg font-bold text-secondary">
                  {(currentDest.ssi || 0.8).toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">{t('destinationDetail.underrated')}</span>
                <span className="text-lg font-bold text-on-surface">
                  {Math.round((currentDest.underrated_score || 0.7) * 100)}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">{t('destinationDetail.budgetTier')}</span>
                <span className="text-lg font-bold text-primary">
                  {t('destinationDetail.tierPrefix')} {currentDest.budget_tier || 2}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Gemma AI Multi-Day Itinerary */}
        <div className="px-margin-mobile mt-space-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[22px]">event_note</span>
              <span>{tripDays}-{t('destinationDetail.curatedItineraryTitle')}</span>
            </h3>
            {itinerary && (
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('destinationDetail.synthesizedByGemma')}
              </span>
            )}
          </div>

          {itinerary ? (
            <div className="space-y-4">
              {/* Day Selector Tabs if more than 1 day */}
              {daysList.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDayTab('all')}
                    className={`py-1.5 px-3 rounded-lg font-label-md text-label-md font-semibold cursor-pointer transition-all shrink-0 ${
                      selectedDayTab === 'all'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {t('destinationDetail.allDays')}
                  </button>
                  {daysList.map((dayKey) => (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => setSelectedDayTab(dayKey)}
                      className={`py-1.5 px-3 rounded-lg font-label-md text-label-md font-semibold cursor-pointer transition-all shrink-0 ${
                        selectedDayTab === dayKey
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {dayKey}
                    </button>
                  ))}
                </div>
              )}

              {/* Itinerary Days Cards */}
              {daysList
                .filter((dayKey) => selectedDayTab === 'all' || selectedDayTab === dayKey)
                .map((dayKey) => {
                  const dayPlan = itinerary[dayKey];
                  return (
                    <div
                      key={dayKey}
                      className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-surface-container pb-2">
                        <span className="font-headline-sm text-headline-sm text-primary font-bold">
                          {dayKey}
                        </span>
                        <span className="text-[11px] font-semibold text-secondary-fixed-variant bg-secondary-fixed/40 px-2.5 py-0.5 rounded-full">
                          {t('destinationDetail.timeSlotsBadge')}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {/* Morning */}
                        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low/60">
                          <div className="w-8 h-8 rounded-lg bg-secondary-fixed/50 text-secondary-fixed-variant flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[18px]">wb_twilight</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-label-sm text-label-sm uppercase font-bold text-secondary-fixed-variant block">
                              {t('destinationDetail.morningSlot')}
                            </span>
                            <p className="font-body-md text-body-md text-on-surface mt-0.5 leading-relaxed">
                              {dayPlan.morning || 'Early morning arrival and refreshing walk through the surrounding nature and scenic viewpoint.'}
                            </p>
                          </div>
                        </div>

                        {/* Afternoon */}
                        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-primary-fixed/50 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-8 h-8 rounded-lg bg-primary-fixed/50 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[18px]">wb_sunny</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-label-sm text-label-sm uppercase font-bold text-primary block">
                              {t('destinationDetail.afternoonSlot')}
                            </span>
                            <p className="font-body-md text-body-md text-on-surface mt-0.5 leading-relaxed">
                              {dayPlan.afternoon || 'Local regional culinary tasting followed by curated activities and cultural exploration.'}
                            </p>
                          </div>
                        </div>

                        {/* Evening */}
                        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low/60">
                          <div className="w-8 h-8 rounded-lg bg-tertiary-fixed/50 text-on-tertiary-fixed-variant flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[18px]">nights_stay</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-label-sm text-label-sm uppercase font-bold text-tertiary block">
                              {t('destinationDetail.eveningSlot')}
                            </span>
                            <p className="font-body-md text-body-md text-on-surface mt-0.5 leading-relaxed">
                              {dayPlan.evening || 'Relaxing sunset experience, tranquil riverside or forest stargazing, and authentic homestay dinner.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-center space-y-3">
              <span className="material-symbols-outlined text-[36px] text-primary">psychology</span>
              <div>
                <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
                  {t('destinationDetail.generateCustomItinerary')}
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto mt-1">
                  {t('destinationDetail.gemmaDescription')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSynthesizeOnDemand}
                disabled={isSynthesizing}
                className="py-2.5 px-5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isSynthesizing ? 'sync' : 'auto_awesome'}
                </span>
                <span>{isSynthesizing ? t('destinationDetail.synthesizingWithGemma') : `${t('destinationDetail.synthesizePlanCta')}`}</span>
              </button>
              {synthesisError && (
                <p className="text-[12px] text-error font-medium">{synthesisError}</p>
              )}
            </div>
          )}
        </div>

        {/* Section: Curated Activities with Match Scores & Descriptions */}
        {activities && activities.length > 0 && (
          <div className="px-margin-mobile mt-space-md">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[22px]">checklist</span>
              <span>{t('destinationDetail.curatedActivities')} ({activities.length})</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              {activities.map((act, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
                        {act.activity}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {act.category && (
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface font-label-sm text-[11px] font-semibold">
                          {act.category}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-[11px] font-bold">
                        {(() => {
                          const s = act.match_score ?? act.score ?? 0.8;
                          return Math.min(Math.max(Math.round((s > 1.0 ? s / 2.5 : s) * 100), 50), 99);
                        })()}% {t('common.match')}
                      </span>
                    </div>
                  </div>
                  {act.description && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed pl-7">
                      {act.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highlights fallback */}
        {(!activities || activities.length === 0) && currentDest.highlights && currentDest.highlights.length > 0 && (
          <div className="px-margin-mobile mt-space-md">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">{t('destinationDetail.highlights')}</h3>
            <ul className="space-y-2">
              {currentDest.highlights.map((highlight, idx) => {
                let localizedHighlight = highlight;
                if (highlight.startsWith('District:')) {
                  localizedHighlight = `${t('destinationDetail.district')}: ${highlight.replace('District:', '').trim()}`;
                } else if (highlight.startsWith('Vibe:')) {
                  localizedHighlight = `${t('destinationDetail.vibe')}: ${highlight.replace('Vibe:', '').trim()}`;
                } else if (highlight === 'Budget Friendly' || highlight === 'Moderate Comfort' || highlight === 'Premium Heritage') {
                  localizedHighlight = `${t('destinationDetail.comfort')}: ${highlight}`;
                }
                return (
                  <li key={idx} className="flex items-start gap-2 font-body-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <span>{localizedHighlight}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
