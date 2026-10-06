import fallbackDestinations from './data/destinations.json';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface UserPreferences {
  nature: number;
  adventure: number;
  culture: number;
  relaxation: number;
}

export interface Weights {
  w_sim: number;
  w_season: number;
  w_crowd: number;
  w_gem: number;
}

export interface RecommendRequest {
  user_prefs?: UserPreferences;
  weights?: Weights;
  month?: number;
  month_temp?: number;
  month_rain?: number;
  place_types?: string[];
  budget_max?: number;
  budget_tier?: number | string;
  trip_days?: number;
  travel_style?: string;
  destination_id?: string;
  user_lat?: number;
  user_lon?: number;
  language?: string;
}

export interface LocationContract {
  latitude?: number;
  longitude?: number;
  address?: string;
  district?: string;
  state?: string;
}

export interface UserDistanceContract {
  distance_km?: number | null;
  available: boolean;
}

export interface DestinationContract {
  id: string;
  name: string;
  district: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  state?: string;
}

export interface DestinationIntelligenceContract {
  match_score: number;
  ssi: number;
  live_cpi: number;
  underrated_score: number;
  name?: string;
  address?: string;
  district?: string;
  state?: string;
  distance_from_user_km?: number | null;
  budget_tier?: number;
  estimated_daily_inr?: number;
}

export interface TravelerContract {
  travel_style: string;
  place_preferences: string[];
  budget_level: string;
  travel_month: string;
  trip_days: number;
}

export interface ActivityItem {
  activity: string;
  score: number;
  category?: string;
  match_score?: number;
  description?: string;
}

export interface DayPlan {
  morning: string;
  afternoon: string;
  evening: string;
}

export interface Model3Recommendation {
  destination: DestinationContract;
  destination_intelligence: DestinationIntelligenceContract;
  traveler: TravelerContract;
  activities: ActivityItem[];
  itinerary: Record<string, DayPlan>;
  explanation?: string;
  location?: LocationContract;
  user_distance?: UserDistanceContract;
  generation_metadata?: {
    engine?: string;
    source?: string;
  };
  recommendations?: RecommendResponse[];
}

export interface RecommendResponse {
  destination_id: string;
  name: string;
  detoura_score: number;
  similarity_score: number;
  cpi_used: number;
  underrated_score: number;
  ssi: number;
  district?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  state?: string;
  distance_km?: number;
  location?: LocationContract;
  user_distance?: UserDistanceContract;
  budget_tier?: number;
  estimated_daily_inr?: number;
  place_type_matches?: string[];
  context?: {
    selected_month?: number | null;
    place_types_requested?: string[];
    budget_max?: number | null;
    budget_tier?: number | null;
    model_version?: string;
  };
  // Augmented UI fields
  image_url?: string;
  match_score?: number;
  recommended_duration_days?: number;
  budget_per_day?: number;
  travel_style?: string;
  description?: string;
  highlights?: string[];
  activities?: ActivityItem[];
  itinerary?: Record<string, DayPlan>;
  model3_payload?: Model3Recommendation;
}

export interface PublicDestination {
  destination_id: string;
  name: string;
  district: string;
  category: string;
  latitude: number;
  longitude: number;
  budget_tier: number;
  estimated_daily_inr: number;
  underrated_score: number;
  crowd_pressure_index: number;
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(distanceKm?: number | null): string {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
    return 'Distance unavailable';
  }
  if (distanceKm < 1.0) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function getDirectionsUrl(
  destLat?: number | null,
  destLon?: number | null,
  userLat?: number | null,
  userLon?: number | null
): string {
  if (
    destLat === undefined || destLat === null || isNaN(destLat) ||
    destLon === undefined || destLon === null || isNaN(destLon) ||
    userLat === undefined || userLat === null || isNaN(userLat) ||
    userLon === undefined || userLon === null || isNaN(userLon)
  ) {
    return '';
  }
  const origin = `${encodeURIComponent(userLat)},${encodeURIComponent(userLon)}`;
  const destination = `${encodeURIComponent(destLat)},${encodeURIComponent(destLon)}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
}

export const getIntelligenceRecommendation = async (
  request: RecommendRequest
): Promise<Model3Recommendation> => {
  const activeLang = request.language || localStorage.getItem('detoura_language') || 'en';
  const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_prefs: request.user_prefs,
      weights: request.weights,
      month: request.month,
      month_temp: request.month_temp,
      month_rain: request.month_rain,
      place_types: request.place_types,
      budget_max: request.budget_max,
      budget_tier: request.budget_tier,
      trip_days: request.trip_days ?? 3,
      travel_style: request.travel_style,
      destination_id: request.destination_id,
      user_lat: request.user_lat,
      user_lon: request.user_lon,
      language: activeLang,
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  const data: Model3Recommendation = await response.json();
  return data;
};

export const getRecommendations = async (request: RecommendRequest): Promise<RecommendResponse[]> => {
  const activeLang = request.language || localStorage.getItem('detoura_language') || 'en';
  try {
    const model3 = await getIntelligenceRecommendation({
      ...request,
      language: activeLang,
    });
    if (model3.recommendations && model3.recommendations.length > 0) {
      const maxScore = Math.max(...model3.recommendations.map(d => d.detoura_score), 2.0);
      return model3.recommendations.map((rec, idx) => {
        const isTop = idx === 0 || rec.destination_id === model3.destination.id;
        const rawTopScore = model3.destination_intelligence?.match_score;
        const normalizedTopScore = typeof rawTopScore === 'number'
          ? (rawTopScore > 1.0 ? Math.min(rawTopScore / maxScore, 0.98) : rawTopScore)
          : 0.85;
        const candidateScore = Math.min(Math.max(rec.detoura_score / maxScore, 0.65), 0.98);
        const dailyBudget = rec.estimated_daily_inr ? Math.round(rec.estimated_daily_inr) : (rec.budget_tier === 1 ? 1200 : rec.budget_tier === 3 ? 3500 : 2000);
        
        let calculatedDist: number | undefined = rec.distance_km;
        if (calculatedDist === undefined && request.user_lat !== undefined && request.user_lon !== undefined && rec.latitude && rec.longitude) {
          calculatedDist = Math.round(calculateHaversineDistance(request.user_lat, request.user_lon, rec.latitude, rec.longitude) * 10) / 10;
        }

        const durationDays = rec.category?.toLowerCase().includes('hill') || (calculatedDist && calculatedDist > 300) ? 3 : (calculatedDist && calculatedDist > 150) ? 2 : 1;
        const verifiedAddr = rec.address || (rec.district ? `${rec.name}, ${rec.district}, West Bengal` : 'West Bengal');

        let fallbackDesc = `DETOURA matched ${rec.name} (${rec.district || 'West Bengal'}) with your travel DNA. Enjoy peaceful scenery, local heritage, and an authentic regional detour.`;
        let fallbackHighlights = [
          rec.district ? `District: ${rec.district}` : 'Scenic Bengal',
          rec.category ? `Vibe: ${rec.category}` : 'Offbeat Route',
          rec.budget_tier === 1 ? 'Budget Friendly' : rec.budget_tier === 3 ? 'Premium Heritage' : 'Moderate Comfort'
        ];
        if (activeLang === 'bn') {
          fallbackDesc = `DETOURA আপনার ট্রাভেল ডিএনএ এবং অফবিট পছন্দের ওপর ভিত্তি করে ${rec.name} (${rec.district || 'পশ্চিমবঙ্গ'}) নির্বাচন করেছে। মনোরম প্রাকৃতিক পরিবেশ এবং আঞ্চলিক ঐতিহ্য উপভোগ করুন।`;
          fallbackHighlights = [
            rec.district ? `জেলা: ${rec.district}` : 'মনোরম বাংলা',
            rec.category ? `ধরণ: ${rec.category}` : 'অফবিট রুট',
            rec.budget_tier === 1 ? 'বাজেট বান্ধব' : rec.budget_tier === 3 ? 'প্রিমিয়াম ঐতিহ্য' : 'পরিমিত স্বাচ্ছন্দ্য'
          ];
        } else if (activeLang === 'hi') {
          fallbackDesc = `DETOURA ने आपके यात्रा डीएनए और प्राथमिकताओं के आधार पर ${rec.name} (${rec.district || 'पश्चिम बंगाल'}) का चयन किया है। शांत प्राकृतिक सुंदरता और स्थानीय संस्कृति का अनुभव करें।`;
          fallbackHighlights = [
            rec.district ? `ज़िला: ${rec.district}` : 'सुंदर बंगाल',
            rec.category ? `श्रेणी: ${rec.category}` : 'ऑफबीट मार्ग',
            rec.budget_tier === 1 ? 'बजट अनुकूल' : rec.budget_tier === 3 ? 'प्रीमियम हेरिटेज' : 'मध्यम आराम'
          ];
        }

        return {
          ...rec,
          address: verifiedAddr,
          match_score: isTop ? normalizedTopScore : candidateScore,
          distance_km: calculatedDist,
          recommended_duration_days: durationDays,
          budget_per_day: dailyBudget,
          travel_style: rec.category || 'Regional Discovery',
          description: isTop && model3.explanation ? model3.explanation : fallbackDesc,
          highlights: isTop && model3.activities?.length ? model3.activities.map(a => a.activity) : fallbackHighlights,
          activities: isTop ? model3.activities : undefined,
          itinerary: isTop ? model3.itinerary : undefined,
          model3_payload: isTop ? model3 : undefined
        };
      });
    }
  } catch (err) {
    console.warn("Notice: /api/recommendations fallback to /recommend:", err);
  }

  // Fallback to /recommend if /api/recommendations is unreachable
  const response = await fetch(`${API_BASE_URL}/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  const data: RecommendResponse[] = await response.json();
  const maxScore = Math.max(...data.map(d => d.detoura_score), 2.0);

  return data.map((rec) => {
    // Normalizing detoura_score relative to highest score in result set
    const match_score = Math.min(Math.max(rec.detoura_score / maxScore, 0.65), 0.98);
    const dailyBudget = rec.estimated_daily_inr ? Math.round(rec.estimated_daily_inr) : (rec.budget_tier === 1 ? 1200 : rec.budget_tier === 3 ? 3500 : 2000);
    
    let calculatedDist: number | undefined = rec.distance_km;
    if (calculatedDist === undefined && request.user_lat !== undefined && request.user_lon !== undefined && rec.latitude && rec.longitude) {
      calculatedDist = Math.round(calculateHaversineDistance(request.user_lat, request.user_lon, rec.latitude, rec.longitude) * 10) / 10;
    }
    const durationDays = rec.category?.toLowerCase().includes('hill') || (calculatedDist && calculatedDist > 300) ? 3 : (calculatedDist && calculatedDist > 150) ? 2 : 1;
    const verifiedAddr = rec.address || (rec.district ? `${rec.name}, ${rec.district}, West Bengal` : 'West Bengal');

    return {
      ...rec,
      address: verifiedAddr,
      match_score,
      distance_km: calculatedDist,
      recommended_duration_days: durationDays,
      budget_per_day: dailyBudget,
      travel_style: rec.category || 'Regional Discovery',
      description: `DETOURA matched ${rec.name} (${rec.district || 'West Bengal'}) with your travel DNA. Enjoy peaceful scenery, local heritage, and an authentic regional detour.`,
      highlights: [
        rec.district ? `District: ${rec.district}` : 'Scenic Bengal',
        rec.category ? `Vibe: ${rec.category}` : 'Offbeat Route',
        rec.budget_tier === 1 ? 'Budget Friendly' : rec.budget_tier === 3 ? 'Premium Heritage' : 'Moderate Comfort'
      ]
    };
  });
};

export const getPublicDestinations = async (category?: string): Promise<PublicDestination[]> => {
  try {
    const url = `${API_BASE_URL}/destinations${category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('FastAPI /destinations notice, using local offline dataset:', err);
  }

  // Fallback to bundled dataset
  const list = fallbackDestinations as PublicDestination[];
  if (category && category !== 'All') {
    return list.filter(d => d.category.toLowerCase().includes(category.toLowerCase()));
  }
  return list;
};

export const syncTripToBackend = async (uid: string, trip: RecommendResponse, idToken?: string): Promise<boolean> => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    const res = await fetch(`${API_BASE_URL}/api/users/${uid}/trips`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        destination_id: trip.destination_id,
        name: trip.name,
        district: trip.district || '',
        category: trip.category || '',
        estimated_daily_inr: trip.estimated_daily_inr ?? trip.budget_per_day ?? 2000,
        budget_tier: trip.budget_tier ?? 2,
        image_url: trip.image_url,
        match_score: trip.match_score,
        distance_km: trip.distance_km,
        recommended_duration_days: trip.recommended_duration_days,
        budget_per_day: trip.budget_per_day,
        travel_style: trip.travel_style,
        description: trip.description,
        highlights: trip.highlights,
        detoura_score: trip.detoura_score,
        similarity_score: trip.similarity_score,
        cpi_used: trip.cpi_used,
        underrated_score: trip.underrated_score,
        ssi: trip.ssi,
        latitude: trip.latitude,
        longitude: trip.longitude,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend syncTrip error:', err);
    return false;
  }
};

export const fetchTripsFromBackend = async (uid: string, idToken?: string): Promise<RecommendResponse[] | null> => {
  try {
    const headers: Record<string, string> = {};
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    const res = await fetch(`${API_BASE_URL}/api/users/${uid}/trips`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('Backend fetchTrips error:', err);
  }
  return null;
};

export const deleteTripFromBackend = async (uid: string, tripId: string, idToken?: string): Promise<boolean> => {
  try {
    const headers: Record<string, string> = {};
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    const res = await fetch(`${API_BASE_URL}/api/users/${uid}/trips/${tripId}`, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend deleteTrip error:', err);
    return false;
  }
};

export const saveTravelDnaToBackend = async (uid: string, travelDna: Record<string, any>, idToken?: string): Promise<boolean> => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    const res = await fetch(`${API_BASE_URL}/api/users/${uid}/travel-dna`, {
      method: 'POST',
      headers,
      body: JSON.stringify(travelDna),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend saveTravelDna error:', err);
    return false;
  }
};

export const fetchTravelDnaFromBackend = async (uid: string, idToken?: string): Promise<Record<string, any> | null> => {
  try {
    const headers: Record<string, string> = {};
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    const res = await fetch(`${API_BASE_URL}/api/users/${uid}/travel-dna`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend fetchTravelDna error:', err);
  }
  return null;
};

// -----------------------------------------------------------------------------
// Ask Detoura Chatbot API Contracts & Client
// -----------------------------------------------------------------------------
export interface ChatContext {
  destination_name?: string;
  destination_id?: string;
  address?: string;
  district?: string;
  state?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  match_score?: number;
  ssi?: number;
  underrated_score?: number;
  budget_tier?: number;
  estimated_daily_inr?: number;
  travel_style?: string;
  place_preferences?: string[];
  itinerary?: Record<string, any>;
  activities?: Array<{ activity: string; score?: number } | string>;
}

export interface ChatRequest {
  message: string;
  language?: 'en' | 'hi' | 'bn';
  destination_id?: string;
  context?: ChatContext;
}

export interface ChatResponse {
  response: string;
  language: string;
  source: string;
}

export const sendChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Chat API Error: ${response.statusText}`);
  }

  return await response.json();
};

