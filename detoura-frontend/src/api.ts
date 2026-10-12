import fallbackDestinations from './data/destinations.json';
import { auth } from './firebase';
import {
  localizeDestinationName,
  localizeRegion,
  localizeCategory,
  formatAddress,
  type Language
} from './i18n/translations';

/**
 * Resolves the backend base URL with strict priority:
 * 1. Runtime override via window.__DETOURA_API_BASE_URL__ or window.sessionStorage
 * 2. import.meta.env.VITE_API_BASE_URL (standard)
 * 3. import.meta.env.VITE_API_URL (fallback)
 * 4. Empty string '' (for development mode using Vite dev proxy)
 *
 * Trailing slashes are stripped to avoid double-slash path anomalies.
 */
function resolveApiBaseUrl(): string {
  let runtimeOverride: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      // 1. Check runtime property on window
      const winOverride = (window as any).__DETOURA_API_BASE_URL__;
      if (typeof winOverride === 'string' && winOverride.trim()) {
        runtimeOverride = winOverride.trim();
      }
      // 2. Check query parameter ?apiUrl= (stores in sessionStorage for session persistence)
      const urlParams = new URLSearchParams(window.location.search);
      const queryApi = urlParams.get('apiUrl') || urlParams.get('api_url');
      if (queryApi && queryApi.trim()) {
        runtimeOverride = queryApi.trim();
        window.sessionStorage.setItem('detoura_api_base_url', runtimeOverride);
      }
      // 3. Check sessionStorage
      if (!runtimeOverride) {
        const stored = window.sessionStorage.getItem('detoura_api_base_url');
        if (stored && stored.trim()) {
          runtimeOverride = stored.trim();
        }
      }
    } catch {
      // Ignore sessionStorage/URL errors in restricted environments
    }
  }

  const raw = (
    runtimeOverride ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).toString().trim();

  // Strip trailing slashes to guarantee clean concatenation
  const clean = raw.replace(/\/+$/, '');

  if (import.meta.env.PROD && !clean && typeof window !== 'undefined') {
    console.warn(
      '[DETOURA] Warning: Neither VITE_API_BASE_URL nor VITE_API_URL is configured in production. ' +
      'API requests will target the frontend origin unless configured.'
    );
  }

  return clean;
}

export const API_BASE_URL = resolveApiBaseUrl();

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return cleanPath;
  }
  return `${API_BASE_URL}${cleanPath}`;
}

async function resolveAuthHeaders(idToken?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  let token = idToken;
  if (!token && typeof window !== 'undefined') {
    try {
      token = await auth.currentUser?.getIdToken();
    } catch (e) {
      console.warn('[DETOURA API] Notice: Unable to resolve Firebase ID token:', e);
    }
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s. The free Colab backend may be warming up or restarting.`);
    }
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Backend service is temporarily unreachable (free Colab runtime reset or tunnel reconnecting).');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function handleApiError(response: Response, endpoint: string): Promise<never> {
  let detail = '';
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      detail = json.detail || json.message || json.error || '';
    } catch {
      if (text && text.length < 120 && !text.includes('<')) {
        detail = text.trim();
      }
    }
  } catch {}

  if (response.status === 404) {
    if (!API_BASE_URL && import.meta.env.PROD) {
      throw new Error(
        `Backend API endpoint not found (404 at ${endpoint}). In production, ensure VITE_API_BASE_URL is set in Vercel settings and redeployed.`
      );
    }
    throw new Error(
      detail || `Resource not found (404 at ${endpoint}). If in production, ensure VITE_API_BASE_URL is configured to the deployed backend.`
    );
  }
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new Error(
      detail || `DETOURA recommendation service is temporarily unavailable (${response.status}). Please verify the backend tunnel or server is online.`
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      detail || `Authentication required (${response.status}). Please sign in.`
    );
  }
  throw new Error(
    detail || `API request failed with status ${response.status} (${response.statusText || 'Error'}).`
  );
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const MONTH_NAMES_HI = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
];

export function calculateCosineSimilarity4D(
  u: [number, number, number, number],
  d: [number, number, number, number]
): number {
  const dot = u[0] * d[0] + u[1] * d[1] + u[2] * d[2] + u[3] * d[3];
  const magU = Math.sqrt(u[0] ** 2 + u[1] ** 2 + u[2] ** 2 + u[3] ** 2);
  const magD = Math.sqrt(d[0] ** 2 + d[1] ** 2 + d[2] ** 2 + d[3] ** 2);
  if (magU === 0 || magD === 0) return 0.5;
  return Math.max(0.0, Math.min(1.0, dot / (magU * magD)));
}

export function calculateModel2SSI(temperature: number, rainfall: number): number {
  const sigma = 5.0;
  const tempUtility = Math.exp(-0.5 * Math.pow((temperature - 20.0) / sigma, 2));
  let rainUtility = 1.0;
  if (rainfall < 50.0) {
    rainUtility = 1.0;
  } else if (rainfall > 150.0) {
    rainUtility = 0.0;
  } else {
    rainUtility = 1.0 - (rainfall - 50.0) / 100.0;
  }
  return tempUtility * rainUtility;
}

export function getDestinationPlaceTypes(dest: any): string[] {
  const types = new Set<string>();
  const cat = (dest.category || '').toLowerCase();
  const district = (dest.district || '').toLowerCase();
  const name = (dest.name || '').toLowerCase();

  // mountains
  if (cat.includes('hill') || ['hill', 'peak', 'ghat', 'mountain', 'ridge', 'pass', 'view point'].some(k => name.includes(k))) {
    types.add('mountains');
  }
  // coast & beaches
  if (cat.includes('beach') || ['beach', 'sea', 'coast', 'shore', 'marine', 'digha', 'mandarmani', 'bakkhali', 'tajpur', 'shankarpur'].some(k => name.includes(k)) || district.includes('medinipur') || district.includes('24 parganas')) {
    types.add('coast');
    types.add('beaches');
  }
  // forests & wildlife
  if (cat.includes('forest') || cat.includes('wildlife') || ['forest', 'jungle', 'aranya', 'wildlife', 'sanctuary', 'national park', 'safari', 'reserve', 'sunderban', 'dooars', 'jaldapara', 'gorumara', 'buxa', 'neora', 'singalila', 'chapramari'].some(k => name.includes(k))) {
    types.add('forests');
    types.add('wildlife');
  }
  // waterfalls
  if (['fall', 'waterfall', 'jhora', 'cascade', 'spring', 'chhang'].some(k => name.includes(k))) {
    types.add('waterfalls');
  }
  // rivers_lakes
  if (['river', 'lake', 'ghat', 'dam', 'barrage', 'reservoir', 'teesta', 'ganga', 'hooghly', 'damodar', 'torsa', 'jaldhaka', 'stream'].some(k => name.includes(k))) {
    types.add('rivers_lakes');
  }
  // heritage
  if (cat.includes('heritage') || cat.includes('cultural') || ['heritage', 'palace', 'fort', 'rajbari', 'museum', 'archaeological', 'monument', 'historical', 'ruins', 'memorial', 'hazarduari', 'cooch behar palace'].some(k => name.includes(k))) {
    types.add('heritage');
  }
  // spiritual
  if (['temple', 'mandir', 'math', 'church', 'mosque', 'masjid', 'ashram', 'monastery', 'dham', 'stupa', 'cathedral', 'shrine', 'peeth', 'pith'].some(k => name.includes(k))) {
    types.add('spiritual');
  }
  // countryside
  if (cat.includes('nature') || ['village', 'gram', 'rural', 'eco', 'farm', 'valley', 'meadow', 'hamlet', 'countryside', 'retreat'].some(k => name.includes(k))) {
    types.add('countryside');
  }
  // tea_gardens
  if (['tea', 'chai', 'garden', 'estate', 'bagicha'].some(k => name.includes(k)) || (['darjeeling', 'jalpaiguri', 'alipurduar', 'kalimpong'].includes(district) && cat.includes('nature'))) {
    types.add('tea_gardens');
  }
  // islands
  if (['island', 'dwip', 'dweep', 'sagar', 'delta'].some(k => name.includes(k)) || name.includes('sunderban')) {
    types.add('islands');
  }

  return Array.from(types);
}

export function synthesizeOfflineIntelligence(request: RecommendRequest): Model3Recommendation {
  const targetId = request.destination_id;
  const rawList = fallbackDestinations as any[];
  
  let dest = targetId ? rawList.find(d => d.destination_id === targetId) : null;
  if (!dest) {
    const offlineRecs = computeOfflineRecommendations(request, request.language || 'en');
    const topId = offlineRecs[0]?.destination_id;
    dest = topId ? rawList.find(d => d.destination_id === topId) : rawList[0];
  }
  if (!dest) {
    dest = rawList[0];
  }

  const activeLang = (request.language || (typeof localStorage !== 'undefined' ? localStorage.getItem('detoura_language') : null) || 'en') as Language;
  const locName = localizeDestinationName(dest.name, activeLang);
  const locDistrict = localizeRegion(dest.district, activeLang);
  const locAddress = formatAddress(dest.name, dest.district, undefined, activeLang);
  const name = dest.name || 'Destination';
  const district = dest.district || 'West Bengal';
  const category = (dest.category || 'Nature').toLowerCase();
  const tripDays = request.trip_days || 3;

  const monthIdx = request.month !== undefined && request.month !== null && request.month >= 1 && request.month <= 12
    ? request.month - 1
    : 9;
  const monthNameEn = MONTH_NAMES[monthIdx];
  const monthNameBn = MONTH_NAMES_BN[monthIdx];
  const monthNameHi = MONTH_NAMES_HI[monthIdx];

  const userVector: [number, number, number, number] = [
    request.user_prefs?.nature ?? 0.85,
    request.user_prefs?.adventure ?? 0.65,
    request.user_prefs?.culture ?? 0.70,
    request.user_prefs?.relaxation ?? 0.90
  ];

  const destVector: [number, number, number, number] = [
    dest.nature ?? 0.5,
    dest.adventure ?? 0.5,
    dest.culture ?? 0.5,
    dest.relaxation ?? 0.5
  ];

  const sim = calculateCosineSimilarity4D(userVector, destVector);

  let temp = 25.0;
  let rain = 60.0;
  if (Array.isArray(dest.monthly_temperature) && dest.monthly_temperature.length > monthIdx) {
    temp = dest.monthly_temperature[monthIdx];
  }
  if (Array.isArray(dest.monthly_rainfall) && dest.monthly_rainfall.length > monthIdx) {
    rain = dest.monthly_rainfall[monthIdx];
  }
  const ssiVal = dest.ssi ?? dest.SSI ?? calculateModel2SSI(temp, rain);
  const cpiVal = dest.crowd_pressure_index ?? dest.live_cpi ?? 0.05;
  const undVal = dest.underrated_score ?? 0.5;

  const w_sim = request.weights?.w_sim ?? 1.0;
  const w_season = request.weights?.w_season ?? 1.0;
  const w_crowd = request.weights?.w_crowd ?? 1.0;
  const w_gem = request.weights?.w_gem ?? 1.0;

  const rawScore = (w_sim * sim) + (w_season * ssiVal) - (w_crowd * cpiVal) + (w_gem * undVal);
  const match_score = Math.min(Math.max(rawScore / 2.2, 0.65), 0.98);

  const bTier = dest.budget_tier || (dest.estimated_daily_inr > 3000 ? 3 : dest.estimated_daily_inr < 1500 ? 1 : 2);
  const dailyCost = dest.estimated_daily_inr ? Math.round(dest.estimated_daily_inr) : (bTier === 1 ? 1200 : bTier === 3 ? 3500 : 2000);

  let distKm: number | undefined;
  if (request.user_lat && request.user_lon && dest.latitude && dest.longitude) {
    distKm = Math.round(calculateHaversineDistance(request.user_lat, request.user_lon, dest.latitude, dest.longitude) * 10) / 10;
  }

  // Dynamic score-grounded explanation
  let focusEn = 'scenic serenity';
  let focusBn = 'মনোরম প্রাকৃতিক পরিবেশ';
  let focusHi = 'शांत प्राकृतिक वातावरण';

  if (userVector[0] >= 0.75 && (dest.nature ?? 0) >= 0.6) {
    focusEn = 'pristine nature and wilderness';
    focusBn = 'অনবদ্য বন্যপ্রাণী ও গভীর অরণ্যের সান্নিধ্য';
    focusHi = 'समृद्ध वन्यजीव और प्राकृतिक सुंदरता';
  } else if (userVector[2] >= 0.75 && (dest.culture ?? 0) >= 0.6) {
    focusEn = 'rich cultural heritage and historic landmarks';
    focusBn = 'সমৃদ্ধ ঐতিহ্য ও ঐতিহাসিক নিদর্শন';
    focusHi = 'ऐतिहासिक धरोहर और सांस्कृतिक वास्तुकला';
  } else if (userVector[1] >= 0.75 && (dest.adventure ?? 0) >= 0.6) {
    focusEn = 'invigorating trails and scenic exploration';
    focusBn = 'রোমাঞ্চকর পাহাড়ি ও অফবিট পথচলা';
    focusHi = 'रोमांचक पैदल मार्ग और परिदृश्य अन्वेषण';
  } else if (userVector[3] >= 0.75 && (dest.relaxation ?? 0) >= 0.6) {
    focusEn = 'deep tranquility and peaceful calm';
    focusBn = 'গভীর প্রশান্তি ও নির্জন অবসর';
    focusHi = 'गहरी शांति और सुकून भरा अवकाश';
  }

  let explanation = '';
  if (activeLang === 'bn') {
    explanation = `আপনার ট্রাভেল ডিএনএ-র সাথে ${Math.round(match_score * 100)}% সামঞ্জস্যপূর্ণ শীর্ষ ম্যাচ। ${locDistrict}-এর ${locName} চমৎকার ${focusBn}, ${monthNameBn}-এ আরামদায়ক আবহাওয়া (SSI ${ssiVal.toFixed(2)}) এবং কম ভিড়ের সূচক (${cpiVal.toFixed(2)}) সহ ${Math.round(undVal * 100)}% প্রশান্তি রেটিং নিশ্চিত করে।`;
  } else if (activeLang === 'hi') {
    explanation = `आपके यात्रा डीएनए के साथ ${Math.round(match_score * 100)}% मेल खाता हुआ शीर्ष विकल्प। ${locDistrict} स्थित ${locName} उत्कृष्ट ${focusHi}, ${monthNameHi} में सुखद मौसम (SSI ${ssiVal.toFixed(2)}) और कम भीड़ दबाव (${cpiVal.toFixed(2)}) के साथ ${Math.round(undVal * 100)}% शांति रेटिंग प्रदान करता है।`;
  } else {
    explanation = `Calibrated with your Travel DNA (${Math.round(match_score * 100)}% match). ${name} in ${district} features ${focusEn} with high seasonal comfort (${monthNameEn} SSI ${ssiVal.toFixed(2)}), secluded atmosphere (Crowd Index ${cpiVal.toFixed(2)}), and a ${Math.round(undVal * 100)}% tranquility rating.`;
  }

  let activities: Array<{ activity: string; score: number }> = [];
  let itinerary: Record<string, { morning: string; afternoon: string; evening: string }> = {};

  if (activeLang === 'bn') {
    if (category.includes('forest') || category.includes('wildlife')) {
      activities = [
        { activity: 'বন্যপ্রাণী ও প্রকৃতি অন্বেষণ', score: 1.0 },
        { activity: 'প্রকৃতি আলোকচিত্র ও পাখি দর্শন', score: 1.0 },
        { activity: 'অরণ্য ট্রেইলে শান্ত পদযাত্রা', score: 0.8 },
        { activity: 'স্থানীয় ইকো-ট্যুরিজম কেন্দ্র পরিদর্শন', score: 0.7 }
      ];
    } else if (category.includes('beach') || category.includes('coast')) {
      activities = [
        { activity: 'উপকূলীয় সৈকত ভ্রমণ ও পদযাত্রা', score: 1.0 },
        { activity: 'সূর্যোদয় ও সূর্যাস্ত আলোকচিত্র', score: 1.0 },
        { activity: 'তাজা সামুদ্রিক খাবারের স্বাদগ্রহণ', score: 0.9 },
        { activity: 'সামুদ্রিক বাস্তুতন্ত্র পর্যবেক্ষণ', score: 0.8 }
      ];
    } else {
      activities = [
        { activity: `${locName}-এর প্রাকৃতিক সৌন্দর্য অন্বেষণ`, score: 1.0 },
        { activity: 'স্থানীয় ঐতিহ্য ও ল্যান্ডস্কেপ ফটোগ্রাফি', score: 0.9 },
        { activity: 'আঞ্চলিক লোকসংস্কৃতি ও খাবারের স্বাদ', score: 0.8 },
        { activity: 'মনোরম পরিবেশে শান্ত বিশ্রাম', score: 0.7 }
      ];
    }
    itinerary = {
      'Day 1': {
        morning: `আগমন ও ${locName} পরিদর্শন`,
        afternoon: 'নির্দিষ্ট প্রাকৃতিক অঞ্চলে পদযাত্রা ও ফটোগ্রাফি',
        evening: 'স্থানীয় সুস্বাদু খাবার ও বিশ্রাম'
      },
      'Day 2': {
        morning: 'মনোরম ভিউপয়েন্টে সকালের ভ্রমণ',
        afternoon: 'আঞ্চলিক সংস্কৃতি ও কারুশিল্প বাজার',
        evening: 'সূর্যাস্ত দর্শন ও শান্তিময় সন্ধ্যা'
      },
      'Day 3': {
        morning: 'ভোরের প্রাকৃতিক পদযাত্রা',
        afternoon: 'স্থানীয় স্মৃতিচিহ্ন সংগ্রহ ও চা আস্বাদন',
        evening: 'প্রস্থানের প্রস্তুতি'
      }
    };
  } else if (activeLang === 'hi') {
    if (category.includes('forest') || category.includes('wildlife')) {
      activities = [
        { activity: 'वन्यजीव और प्रकृति अन्वेषण', score: 1.0 },
        { activity: 'प्रकृति फोटोग्राफी और पक्षी दर्शन', score: 1.0 },
        { activity: 'जंगल के पगडंडी रास्तों पर भ्रमण', score: 0.8 },
        { activity: 'स्थानीय पर्यावरण पर्यटन केंद्र का दौरा', score: 0.7 }
      ];
    } else if (category.includes('beach') || category.includes('coast')) {
      activities = [
        { activity: 'समुद्र तटीय भ्रमण और पदयात्रा', score: 1.0 },
        { activity: 'सूर्योदय एवं सूर्यास्त फोटोग्राफी', score: 1.0 },
        { activity: 'ताज़ा समुद्री व्यंजनों का स्वाद', score: 0.9 },
        { activity: 'समुद्री पारिस्थितिकी अवलोकन', score: 0.8 }
      ];
    } else {
      activities = [
        { activity: `${locName} का प्राकृतिक परिभ्रमण`, score: 1.0 },
        { activity: 'परिदृश्य फोटोग्राफी एवं सैर', score: 0.9 },
        { activity: 'स्थानीय खानपान एवं संस्कृति की खोज', score: 0.8 },
        { activity: 'शांत वातावरण में विश्राम', score: 0.7 }
      ];
    }
    itinerary = {
      'Day 1': {
        morning: `आगमन एवं ${locName} का अवलोकन`,
        afternoon: 'फोटोग्राफी एवं पैदल मार्ग अन्वेषण',
        evening: 'स्थानीय भोजन एवं विश्राम'
      },
      'Day 2': {
        morning: 'प्रातःकालीन शांत सैर एवं दृश्य दर्शन',
        afternoon: 'क्षेत्रीय हस्तशिल्प बाज़ार एवं संस्कृति',
        evening: 'सूर्यास्त अवलोकन एवं रात्रिभोज'
      },
      'Day 3': {
        morning: 'पक्षी दर्शन एवं भोर की फोटोग्राफी',
        afternoon: 'शिल्प खरीदारी एवं विश्राम',
        evening: 'प्रस्थान की तैयारी'
      }
    };
  } else {
    if (category.includes('forest') || category.includes('wildlife')) {
      activities = [
        { activity: 'Wildlife observation & nature photography', score: 1.0 },
        { activity: 'Guided forest canopy & trail walk', score: 0.9 },
        { activity: 'Bird watching & dawn exploration', score: 0.8 },
        { activity: 'Local eco-tourism center visit', score: 0.7 }
      ];
    } else if (category.includes('beach') || category.includes('coast')) {
      activities = [
        { activity: 'Coastal shore exploration & beach walk', score: 1.0 },
        { activity: 'Sunrise & sunset landscape photography', score: 1.0 },
        { activity: 'Fresh regional seafood culinary tasting', score: 0.9 },
        { activity: 'Marine ecosystem observation', score: 0.8 }
      ];
    } else {
      activities = [
        { activity: `Scenic exploration of ${name}`, score: 1.0 },
        { activity: 'Landscape photography & nature walk', score: 0.9 },
        { activity: 'Regional heritage & culinary discovery', score: 0.8 },
        { activity: 'Tranquil relaxation in nature', score: 0.7 }
      ];
    }
    itinerary = {
      'Day 1': {
        morning: `Arrival and scenic exploration of ${name}`,
        afternoon: 'Trail walk and landscape photography across prime viewpoints',
        evening: 'Authentic regional dinner and relaxing leisure time'
      },
      'Day 2': {
        morning: 'Morning walk and tranquil panoramic viewing',
        afternoon: 'Local artisan markets and regional heritage tasting',
        evening: 'Sunset observation and peaceful evening stroll'
      },
      'Day 3': {
        morning: 'Dawn photography and refreshing nature contemplation',
        afternoon: 'Craft souvenir shopping and local tea tasting',
        evening: 'Leisure and departure preparation'
      }
    };
  }

  const finalItinerary: Record<string, { morning: string; afternoon: string; evening: string }> = {};
  for (let d = 1; d <= Math.min(tripDays, 7); d++) {
    const key = `Day ${d}`;
    finalItinerary[key] = itinerary[key] || itinerary['Day 2'] || itinerary['Day 1'];
  }

  return {
    generation_metadata: {
      source: 'deterministic_fallback',
      engine: 'model2-deterministic'
    },
    destination: {
      id: dest.destination_id,
      name,
      district,
      category: dest.category || 'Nature',
      latitude: dest.latitude || 25.4786,
      longitude: dest.longitude || 88.9072,
      address: locAddress,
      state: 'West Bengal'
    },
    destination_intelligence: {
      match_score: Math.round(match_score * 1000) / 1000,
      ssi: Math.round(ssiVal * 1000) / 1000,
      live_cpi: Math.round(cpiVal * 1000) / 1000,
      underrated_score: Math.round(undVal * 1000) / 1000,
      budget_tier: bTier,
      estimated_daily_inr: dailyCost,
      name,
      address: locAddress,
      district,
      state: 'West Bengal',
      distance_from_user_km: distKm
    },
    traveler: {
      travel_style: dest.category || 'Regional Explorer',
      place_preferences: request.place_types || [dest.category || 'Nature'],
      budget_level: bTier === 1 ? 'Budget' : bTier === 3 ? 'Premium' : 'Medium',
      travel_month: monthNameEn,
      trip_days: tripDays
    },
    activities,
    itinerary: finalItinerary,
    explanation,
    location: {
      latitude: dest.latitude || 25.4786,
      longitude: dest.longitude || 88.9072,
      address: locAddress,
      district,
      state: 'West Bengal'
    },
    user_distance: {
      distance_km: distKm,
      available: distKm !== undefined
    }
  };
}

export function computeOfflineRecommendations(request: RecommendRequest, activeLang: string = 'en'): RecommendResponse[] {
  const rawList = fallbackDestinations as any[];
  const userLat = request.user_lat;
  const userLon = request.user_lon;

  const w_sim = request.weights?.w_sim ?? 1.0;
  const w_season = request.weights?.w_season ?? 1.0;
  const w_crowd = request.weights?.w_crowd ?? 1.0;
  const w_gem = request.weights?.w_gem ?? 1.0;

  const userVector: [number, number, number, number] = [
    request.user_prefs?.nature ?? 0.85,
    request.user_prefs?.adventure ?? 0.65,
    request.user_prefs?.culture ?? 0.70,
    request.user_prefs?.relaxation ?? 0.90
  ];

  const monthIdx = request.month !== undefined && request.month !== null && request.month >= 1 && request.month <= 12
    ? request.month - 1
    : 9;

  const scored = rawList.map((dest) => {
    // 1. Content Cosine Similarity (4D vector matching Model 2)
    const destVector: [number, number, number, number] = [
      dest.nature ?? 0.5,
      dest.adventure ?? 0.5,
      dest.culture ?? 0.5,
      dest.relaxation ?? 0.5
    ];
    const sim = calculateCosineSimilarity4D(userVector, destVector);

    // 2. Season Suitability Index (SSI from monthly climate arrays)
    let temp = 25.0;
    let rain = 60.0;
    if (Array.isArray(dest.monthly_temperature) && dest.monthly_temperature.length > monthIdx) {
      temp = dest.monthly_temperature[monthIdx];
    } else if (request.month_temp !== undefined) {
      temp = request.month_temp;
    }
    if (Array.isArray(dest.monthly_rainfall) && dest.monthly_rainfall.length > monthIdx) {
      rain = dest.monthly_rainfall[monthIdx];
    } else if (request.month_rain !== undefined) {
      rain = request.month_rain;
    }
    const ssi = dest.ssi ?? dest.SSI ?? calculateModel2SSI(temp, rain);

    // 3. CPI & AUS
    const cpi = dest.crowd_pressure_index ?? dest.live_cpi ?? 0.2;
    const aus = dest.underrated_score ?? 0.5;

    // 4. Final Model 2 Score
    const rawScore = (w_sim * sim) + (w_season * ssi) - (w_crowd * cpi) + (w_gem * aus);

    // 5. Place Types & Distance
    const destPlaceTypes = getDestinationPlaceTypes(dest);
    const matchedPlaceTypes = request.place_types && request.place_types.length > 0
      ? request.place_types.filter(pt => destPlaceTypes.includes(pt))
      : [];
    const placeMatchCount = matchedPlaceTypes.length;

    let calculatedDist: number | undefined;
    if (userLat !== undefined && userLon !== undefined && dest.latitude && dest.longitude) {
      calculatedDist = Math.round(calculateHaversineDistance(userLat, userLon, dest.latitude, dest.longitude) * 10) / 10;
    }

    return {
      dest,
      rawScore,
      ssi,
      cpi,
      aus,
      sim,
      calculatedDist,
      destPlaceTypes,
      matchedPlaceTypes,
      placeMatchCount
    };
  });

  // 6. Apply Budget Constraints
  let filtered = scored;
  if (request.budget_tier !== undefined && request.budget_tier !== null && request.budget_tier !== 'all') {
    const tierNum = typeof request.budget_tier === 'number' ? request.budget_tier : parseInt(String(request.budget_tier));
    if (!isNaN(tierNum)) {
      const tierMatches = scored.filter(i => i.dest.budget_tier === tierNum);
      if (tierMatches.length > 0) {
        filtered = tierMatches;
      }
    }
  }

  if (request.budget_max !== undefined && request.budget_max !== null && request.budget_max > 0) {
    const budgetMatches = filtered.filter(i => (i.dest.estimated_daily_inr || 2000) <= request.budget_max!);
    if (budgetMatches.length > 0) {
      filtered = budgetMatches;
    }
  }

  // 7. Sort by place types prioritization (if requested) and detoura_score
  if (request.place_types && request.place_types.length > 0) {
    filtered.sort((a, b) => {
      const aHas = a.placeMatchCount > 0 ? 1 : 0;
      const bHas = b.placeMatchCount > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      if (a.placeMatchCount !== b.placeMatchCount) return b.placeMatchCount - a.placeMatchCount;
      return b.rawScore - a.rawScore;
    });
  } else {
    filtered.sort((a, b) => b.rawScore - a.rawScore);
  }

  const topItems = filtered.slice(0, 25);
  const maxScore = Math.max(...topItems.map(i => i.rawScore), 2.0);

  return topItems.map(({ dest, rawScore, ssi, cpi, aus, sim, calculatedDist, matchedPlaceTypes }, idx) => {
    const match_score = Math.min(Math.max(rawScore / maxScore, 0.65), 0.98);
    const dailyBudget = dest.estimated_daily_inr ? Math.round(dest.estimated_daily_inr) : (dest.budget_tier === 1 ? 1200 : dest.budget_tier === 3 ? 3500 : 2000);
    const durationDays = dest.category?.toLowerCase().includes('hill') || (calculatedDist && calculatedDist > 300) ? 3 : (calculatedDist && calculatedDist > 150) ? 2 : 1;
    const verifiedAddr = formatAddress(dest.name, dest.district, undefined, activeLang as Language);

    let focusLabel = 'Regional Discovery';
    if ((dest.nature ?? 0) >= 0.8) focusLabel = 'Pristine Wilderness';
    else if ((dest.culture ?? 0) >= 0.8) focusLabel = 'Cultural Heritage';
    else if ((dest.relaxation ?? 0) >= 0.8) focusLabel = 'Tranquil Sanctuary';
    else if ((dest.adventure ?? 0) >= 0.8) focusLabel = 'Scenic Trails';

    let desc = `DETOURA matched ${dest.name} in ${dest.district || 'West Bengal'} (${Math.round(match_score * 100)}% match). Features ${focusLabel.toLowerCase()} with seasonal index ${ssi.toFixed(2)} and low crowd index (${cpi.toFixed(2)}).`;
    let highlights = [
      dest.district ? `District: ${dest.district}` : 'Scenic Bengal',
      focusLabel,
      dest.budget_tier === 1 ? 'Budget Friendly' : dest.budget_tier === 3 ? 'Premium Heritage' : 'Moderate Comfort'
    ];

    if (activeLang === 'bn') {
      const locName = localizeDestinationName(dest.name, 'bn');
      const locDist = localizeRegion(dest.district, 'bn');
      let focusLabelBn = 'আঞ্চলিক অন্বেষণ';
      if ((dest.nature ?? 0) >= 0.8) focusLabelBn = 'গভীর অরণ্য ও বন্যপ্রাণী';
      else if ((dest.culture ?? 0) >= 0.8) focusLabelBn = 'সমৃদ্ধ ঐতিহাসিক ঐতিহ্য';
      else if ((dest.relaxation ?? 0) >= 0.8) focusLabelBn = 'শান্তিময় নিরিবিলি আশ্রয়';
      else if ((dest.adventure ?? 0) >= 0.8) focusLabelBn = 'রোমাঞ্চকর প্রাকৃতিক পথ';

      desc = `DETOURA ${locDist}-এর ${locName}-কে ${Math.round(match_score * 100)}% সামঞ্জস্যে নির্বাচন করেছে। ${focusLabelBn}, আবহাওয়া সূচক ${ssi.toFixed(2)} এবং ভিড়ের সূচক (${cpi.toFixed(2)}) যুক্ত।`;
      highlights = [
        dest.district ? `জেলা: ${locDist}` : 'মনোরম বাংলা',
        focusLabelBn,
        dest.budget_tier === 1 ? 'বাজেট বান্ধব' : dest.budget_tier === 3 ? 'প্রিমিয়াম ঐতিহ্য' : 'পরিমিত স্বাচ্ছন্দ্য'
      ];
    } else if (activeLang === 'hi') {
      const locName = localizeDestinationName(dest.name, 'hi');
      const locDist = localizeRegion(dest.district, 'hi');
      let focusLabelHi = 'क्षेत्रीय अन्वेषण';
      if ((dest.nature ?? 0) >= 0.8) focusLabelHi = 'प्राकृतिक सौंदर्य एवं वन्यजीव';
      else if ((dest.culture ?? 0) >= 0.8) focusLabelHi = 'ऐतिहासिक सांस्कृतिक धरोहर';
      else if ((dest.relaxation ?? 0) >= 0.8) focusLabelHi = 'शांत सुकून भरा विश्राम';
      else if ((dest.adventure ?? 0) >= 0.8) focusLabelHi = 'रोमांचक प्राकृतिक मार्ग';

      desc = `DETOURA ने ${locDist} स्थित ${locName} को ${Math.round(match_score * 100)}% मेल के साथ चुना है। ${focusLabelHi}, मौसमी सूचकांक ${ssi.toFixed(2)} और कम भीड़ (${cpi.toFixed(2)}) शामिल है।`;
      highlights = [
        dest.district ? `ज़िला: ${locDist}` : 'सुंदर बंगाल',
        focusLabelHi,
        dest.budget_tier === 1 ? 'बजट अनुकूल' : dest.budget_tier === 3 ? 'प्रीमियम हेरिटेज' : 'मध्यम आराम'
      ];
    }

    const recResult: RecommendResponse = {
      destination_id: dest.destination_id,
      name: dest.name,
      district: dest.district || 'West Bengal',
      category: dest.category || 'Regional Discovery',
      latitude: dest.latitude,
      longitude: dest.longitude,
      address: verifiedAddr,
      state: 'West Bengal',
      detoura_score: Math.round(rawScore * 1000) / 1000,
      similarity_score: Math.round(sim * 1000) / 1000,
      cpi_used: Math.round(cpi * 1000) / 1000,
      underrated_score: Math.round(aus * 1000) / 1000,
      ssi: Math.round(ssi * 1000) / 1000,
      match_score: Math.round(match_score * 1000) / 1000,
      distance_km: calculatedDist,
      recommended_duration_days: durationDays,
      budget_per_day: dailyBudget,
      travel_style: dest.category || 'Regional Discovery',
      description: desc,
      highlights,
      budget_tier: dest.budget_tier || 2,
      estimated_daily_inr: dailyBudget,
      place_type_matches: matchedPlaceTypes
    };

    // Attach computed intelligence to the top destination
    if (idx === 0) {
      recResult.model3_payload = synthesizeOfflineIntelligence({
        ...request,
        destination_id: dest.destination_id
      });
    }

    return recResult;
  });
}

// In-memory recommendations cache keyed by full preference vector and catalog version
const _clientRecCache = new Map<string, RecommendResponse[]>();

export function clearRecommendationCache(): void {
  _clientRecCache.clear();
  try {
    sessionStorage.removeItem('detoura_last_recommendations');
    sessionStorage.removeItem('detoura_last_cache_key');
  } catch {}
}

export function buildRecommendationCacheKey(request: RecommendRequest, activeLang: string): string {
  const prefs = request.user_prefs || { nature: 0.85, adventure: 0.65, culture: 0.70, relaxation: 0.90 };
  const weights = request.weights || { w_sim: 1.0, w_season: 1.0, w_crowd: 1.0, w_gem: 1.0 };
  return JSON.stringify({
    prefs: {
      nature: Math.round(prefs.nature * 1000) / 1000,
      adventure: Math.round(prefs.adventure * 1000) / 1000,
      culture: Math.round(prefs.culture * 1000) / 1000,
      relaxation: Math.round(prefs.relaxation * 1000) / 1000,
    },
    weights: {
      w_sim: weights.w_sim,
      w_season: weights.w_season,
      w_crowd: weights.w_crowd,
      w_gem: weights.w_gem,
    },
    month: request.month ?? 10,
    place_types: [...(request.place_types || [])].sort(),
    budget_max: request.budget_max ?? null,
    budget_tier: request.budget_tier ?? 'all',
    lang: activeLang,
    version: 'Model-2-v2'
  });
}

export const getIntelligenceRecommendation = async (
  request: RecommendRequest
): Promise<Model3Recommendation> => {
  const activeLang = request.language || localStorage.getItem('detoura_language') || 'en';
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/recommendations'), {
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
    }, 15000);

    if (response.ok) {
      const data: Model3Recommendation = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('[DETOURA] /api/recommendations notice, using verified offline intelligence:', err);
  }

  // Graceful offline fallback guarantees 0 errors on frontend hard refresh or Colab resets
  return synthesizeOfflineIntelligence(request);
};

export const getRecommendations = async (request: RecommendRequest): Promise<RecommendResponse[]> => {
  const activeLang = request.language || localStorage.getItem('detoura_language') || 'en';
  const cacheKey = buildRecommendationCacheKey(request, activeLang);

  if (_clientRecCache.has(cacheKey)) {
    return _clientRecCache.get(cacheKey)!;
  }

  // 1. Direct call to deterministic mathematical ranking engine (Model 2: ~30ms)
  // Preserves scoring contracts and never blocks for long Gemma inference
  try {
    const response = await fetchWithTimeout(getApiUrl('/recommend'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, language: activeLang }),
    }, 10000);

    if (response.ok) {
      const data: RecommendResponse[] = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const maxScore = Math.max(...data.map(d => d.detoura_score), 2.0);

        const formatted = data.map((rec) => {
          const match_score = Math.min(Math.max(rec.detoura_score / maxScore, 0.65), 0.98);
          const dailyBudget = rec.estimated_daily_inr ? Math.round(rec.estimated_daily_inr) : (rec.budget_tier === 1 ? 1200 : rec.budget_tier === 3 ? 3500 : 2000);
          
          let calculatedDist: number | undefined = rec.distance_km;
          if (calculatedDist === undefined && request.user_lat !== undefined && request.user_lon !== undefined && rec.latitude && rec.longitude) {
            calculatedDist = Math.round(calculateHaversineDistance(request.user_lat, request.user_lon, rec.latitude, rec.longitude) * 10) / 10;
          }
          const durationDays = rec.category?.toLowerCase().includes('hill') || (calculatedDist && calculatedDist > 300) ? 3 : (calculatedDist && calculatedDist > 150) ? 2 : 1;
          const verifiedAddr = formatAddress(rec.name, rec.district, rec.address, activeLang as Language);

          let focusLabel = 'Regional Detour';
          if ((rec.similarity_score || 0) >= 0.85) focusLabel = 'High DNA Affinity';
          else if ((rec.underrated_score || 0) >= 0.7) focusLabel = 'Tranquil Gem';
          else if ((rec.ssi || 0) >= 0.8) focusLabel = 'Optimal Season';

          let desc = `DETOURA calibrated ${rec.name} (${rec.district || 'West Bengal'}) with your travel DNA (${Math.round(match_score * 100)}% match). Features ${focusLabel.toLowerCase()} with seasonal comfort SSI ${(rec.ssi || 0.9).toFixed(2)}.`;
          let highlights = [
            rec.district ? `District: ${rec.district}` : 'Scenic Bengal',
            rec.category ? `Vibe: ${rec.category}` : 'Offbeat Route',
            rec.budget_tier === 1 ? 'Budget Friendly' : rec.budget_tier === 3 ? 'Premium Heritage' : 'Moderate Comfort'
          ];
          if (activeLang === 'bn') {
            const locName = localizeDestinationName(rec.name, 'bn');
            const locDistrict = localizeRegion(rec.district, 'bn');
            const locCategory = localizeCategory(rec.category, 'bn');
            desc = `DETOURA আপনার ট্রাভেল ডিএনএ-র সাথে ${locDistrict}-এর ${locName} মিলিয়েছে (${Math.round(match_score * 100)}% ম্যাচ)। আবহাওয়া সূচক ${(rec.ssi || 0.9).toFixed(2)} সহ শান্ত পরিবেশ।`;
            highlights = [
              rec.district ? `জেলা: ${locDistrict}` : 'মনোরম বাংলা',
              rec.category ? `ধরণ: ${locCategory}` : 'অফবিট রুট',
              rec.budget_tier === 1 ? 'বাজেট বান্ধব' : rec.budget_tier === 3 ? 'প্রিমিয়াম ঐতিহ্য' : 'পরিমিত স্বাচ্ছন্দ্য'
            ];
          } else if (activeLang === 'hi') {
            const locName = localizeDestinationName(rec.name, 'hi');
            const locDistrict = localizeRegion(rec.district, 'hi');
            const locCategory = localizeCategory(rec.category, 'hi');
            desc = `DETOURA ने आपके यात्रा डीएनए के साथ ${locDistrict} स्थित ${locName} को मेल कराया है (${Math.round(match_score * 100)}% मेल)। सुखद मौसमी स्थिति के साथ शांत गंतव्य।`;
            highlights = [
              rec.district ? `ज़िला: ${locDistrict}` : 'सुंदर बंगाल',
              rec.category ? `श्रेणी: ${locCategory}` : 'ऑफबीट मार्ग',
              rec.budget_tier === 1 ? 'बजट अनुकूल' : rec.budget_tier === 3 ? 'प्रीमियम हेरिटेज' : 'मध्यम आराम'
            ];
          }

          return {
            ...rec,
            address: verifiedAddr,
            match_score,
            distance_km: calculatedDist,
            recommended_duration_days: durationDays,
            budget_per_day: dailyBudget,
            travel_style: rec.category || 'Regional Discovery',
            description: desc,
            highlights
          };
        });

        // Ensure top recommendation has model3_payload
        if (formatted.length > 0 && !formatted[0].model3_payload) {
          formatted[0].model3_payload = synthesizeOfflineIntelligence({
            ...request,
            destination_id: formatted[0].destination_id
          });
        }

        _clientRecCache.set(cacheKey, formatted);
        try {
          sessionStorage.setItem('detoura_last_recommendations', JSON.stringify(formatted));
          sessionStorage.setItem('detoura_last_cache_key', cacheKey);
        } catch {}

        return formatted;
      }
    }
  } catch (err) {
    console.warn('[DETOURA] Backend /recommend unreachable or reset, using verified offline ranking engine:', err);
  }

  // 2. Offline deterministic ranking engine fallback guarantees zero-latency, zero-cost resilience
  const offlineResults = computeOfflineRecommendations(request, activeLang);
  _clientRecCache.set(cacheKey, offlineResults);
  try {
    sessionStorage.setItem('detoura_last_recommendations', JSON.stringify(offlineResults));
    sessionStorage.setItem('detoura_last_cache_key', cacheKey);
  } catch {}

  return offlineResults;
};

export const getPublicDestinations = async (category?: string): Promise<PublicDestination[]> => {
  // 1. Try FastAPI /destinations with fast 4s timeout
  try {
    const query = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetchWithTimeout(getApiUrl(`/destinations${query}`), {}, 4000);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {}

  // 2. Try static JSON served from Vercel public CDN
  try {
    const res = await fetch('/data/destinations.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        if (category && category !== 'All') {
          return data.filter((d: any) => d.category?.toLowerCase().includes(category.toLowerCase()));
        }
        return data;
      }
    }
  } catch {}

  // 3. Fallback to bundled dataset
  const list = fallbackDestinations as PublicDestination[];
  if (category && category !== 'All') {
    return list.filter(d => d.category.toLowerCase().includes(category.toLowerCase()));
  }
  return list;
};

export const syncTripToBackend = async (uid: string, trip: RecommendResponse, idToken?: string): Promise<boolean> => {
  try {
    const authHeaders = await resolveAuthHeaders(idToken);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
    };
    const res = await fetch(getApiUrl(`/api/users/${uid}/trips`), {
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
    const headers = await resolveAuthHeaders(idToken);
    const res = await fetch(getApiUrl(`/api/users/${uid}/trips`), { headers });
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
    const headers = await resolveAuthHeaders(idToken);
    const res = await fetch(getApiUrl(`/api/users/${uid}/trips/${tripId}`), {
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
    const authHeaders = await resolveAuthHeaders(idToken);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
    };
    const res = await fetch(getApiUrl(`/api/users/${uid}/travel-dna`), {
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
    const headers = await resolveAuthHeaders(idToken);
    const res = await fetch(getApiUrl(`/api/users/${uid}/travel-dna`), { headers });
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

function generateOfflineChatResponse(request: ChatRequest): ChatResponse {
  const lang = (request.language || 'en').toLowerCase();
  const langTyped = (lang === 'bn' || lang === 'hi' ? lang : 'en') as Language;
  const q = request.message.toLowerCase();
  const ctx = request.context || {};
  const rawName = ctx.destination_name || 'this destination';
  const name = localizeDestinationName(rawName, langTyped);
  const district = localizeRegion(ctx.district || 'West Bengal', langTyped);
  const dist = ctx.distance_km;

  // 1. Distance question
  if (
    q.includes('distance') || q.includes('how far') || q.includes('km') ||
    q.includes('দূরত্ব') || q.includes('কিলোমিটার') || q.includes('দূরে') ||
    q.includes('दूरी') || q.includes('किलोमीटर') || q.includes('दूर')
  ) {
    if (dist !== undefined && dist !== null && !isNaN(Number(dist))) {
      const distNum = Number(dist).toFixed(1);
      if (lang === 'bn') {
        return {
          response: `${name} আপনার অবস্থান থেকে আনুমানিক ${distNum} কিলোমিটার দূরে অবস্থিত (${district}, পশ্চিমবঙ্গ)।`,
          language: lang,
          source: 'grounded_offline'
        };
      } else if (lang === 'hi') {
        return {
          response: `${name} आपके वर्तमान स्थान से लगभग ${distNum} किलोमीटर दूर है (${district}, पश्चिम बंगाल)।`,
          language: lang,
          source: 'grounded_offline'
        };
      } else {
        return {
          response: `${name} is approximately ${distNum} km from your current location in ${district}, West Bengal.`,
          language: lang,
          source: 'grounded_offline'
        };
      }
    } else {
      if (lang === 'bn') {
        return {
          response: `${name} পশ্চিমবঙ্গের ${district} জেলায় অবস্থিত। সুনির্দিষ্ট দূরত্ব পরিমাপ করতে অনুগ্রহ করে আপনার অবস্থান সক্রিয় করুন।`,
          language: lang,
          source: 'grounded_offline'
        };
      } else if (lang === 'hi') {
        return {
          response: `${name} पश्चिम बंगाल के ${district} ज़िले में स्थित है। सटीक दूरी जानने के लिए कृपया लोकेशन सक्षम करें।`,
          language: lang,
          source: 'grounded_offline'
        };
      } else {
        return {
          response: `${name} is located in ${district}, West Bengal. Enable location services to calculate driving distance.`,
          language: lang,
          source: 'grounded_offline'
        };
      }
    }
  }

  // 2. Itinerary question
  if (
    q.includes('itinerary') || q.includes('plan') || q.includes('day') ||
    q.includes('ইটিনারে') || q.includes('পরিকল্পনা') || q.includes('দিন') ||
    q.includes('दिन') || q.includes('योजना')
  ) {
    const itin = ctx.itinerary;
    if (itin && typeof itin === 'object' && Object.keys(itin).length > 0) {
      const dayKeys = Object.keys(itin).sort();
      let planText = '';
      if (lang === 'bn') {
        planText = `${name}-এর জন্য আপনার ভ্রমণ পরিকল্পনা:\n` + dayKeys.map(k => `• ${k}: সকাল - ${itin[k].morning || 'ভ্রমণ'}, দুপুর - ${itin[k].afternoon || 'দর্শনীয় স্থান'}, সন্ধ্যা - ${itin[k].evening || 'বিশ্রাম'}`).join('\n');
      } else if (lang === 'hi') {
        planText = `${name} के लिए आपकी यात्रा योजना:\n` + dayKeys.map(k => `• ${k}: सुबह - ${itin[k].morning || 'भ्रमण'}, दोपहर - ${itin[k].afternoon || 'स्थल दर्शन'}, शाम - ${itin[k].evening || 'विश्राम'}`).join('\n');
      } else {
        planText = `Curated itinerary for ${name}:\n` + dayKeys.map(k => `• ${k}: Morning - ${itin[k].morning || 'Arrival'}, Afternoon - ${itin[k].afternoon || 'Exploration'}, Evening - ${itin[k].evening || 'Relaxation'}`).join('\n');
      }
      return {
        response: planText,
        language: lang,
        source: 'grounded_offline'
      };
    }
  }

  // 3. Activities question
  if (
    q.includes('activit') || q.includes('do') || q.includes('see') ||
    q.includes('কার্যক্রম') || q.includes('কী করব') || q.includes('কী দেখতে') ||
    q.includes('गतिविधि') || q.includes('क्या करें')
  ) {
    const acts = ctx.activities;
    if (acts && Array.isArray(acts) && acts.length > 0) {
      const actList = acts.map(a => typeof a === 'string' ? a : a.activity).slice(0, 5).join('\n• ');
      if (lang === 'bn') {
        return {
          response: `${name}-এ সেরা কার্যক্রম সমূহ:\n• ${actList}`,
          language: lang,
          source: 'grounded_offline'
        };
      } else if (lang === 'hi') {
        return {
          response: `${name} में प्रमुख गतिविधियां:\n• ${actList}`,
          language: lang,
          source: 'grounded_offline'
        };
      } else {
        return {
          response: `Top activities at ${name}:\n• ${actList}`,
          language: lang,
          source: 'grounded_offline'
        };
      }
    }
  }

  // 4. Budget / Hotel question
  if (
    q.includes('hotel') || q.includes('stay') || q.includes('budget') || q.includes('cost') ||
    q.includes('টাকা') || q.includes('হোটেল') || q.includes('খরচ') ||
    q.includes('होटल') || q.includes('बजट') || q.includes('खर्च')
  ) {
    const daily = ctx.estimated_daily_inr || 2000;
    const tier = ctx.budget_tier === 1 ? 'Budget' : ctx.budget_tier === 3 ? 'Premium' : 'Comfort';
    if (lang === 'bn') {
      return {
        response: `${name} (${district})-এর আনুমানিক দৈনিক খরচ প্রায় ₹${Math.round(daily)} (${tier})। স্থানীয় হোমস্টে এবং ইকো-রিসর্ট শান্ত পরিবেশের জন্য সেরা।`,
        language: lang,
        source: 'grounded_offline'
      };
    } else if (lang === 'hi') {
      return {
        response: `${name} (${district}) में अनुमानित दैनिक खर्च लगभग ₹${Math.round(daily)} (${tier}) है। प्रामाणिक अनुभव के लिए स्थानीय होमस्टे सबसे उपयुक्त हैं।`,
        language: lang,
        source: 'grounded_offline'
      };
    } else {
      return {
        response: `Estimated daily budget for ${name} (${district}) is ₹${Math.round(daily)} (${tier}). Authentic regional homestays and eco-lodges are recommended.`,
        language: lang,
        source: 'grounded_offline'
      };
    }
  }

  // General fallback
  if (lang === 'bn') {
    return {
      response: `DETOURA-তে স্বাগতম। ${name} পশ্চিমবঙ্গের ${district} জেলায় অবস্থিত একটি অফবিট গন্তব্য (${localizeCategory(ctx.category, 'bn')})। এর শান্ত পরিবেশ এবং আঞ্চলিক সৌন্দর্য উপভোগ করার জন্য এটি আদর্শ।`,
      language: lang,
      source: 'grounded_offline'
    };
  } else if (lang === 'hi') {
    return {
      response: `डेटूरा में स्वागत है। ${name} पश्चिम बंगाल के ${district} ज़िले में स्थित एक शांत ऑफबीट स्थल (${localizeCategory(ctx.category, 'hi')}) है, जो प्रकृति प्रेमियों के लिए अनुकूल है।`,
      language: lang,
      source: 'grounded_offline'
    };
  } else {
    return {
      response: `Welcome to DETOURA. ${name} is an offbeat ${ctx.category || 'scenic'} destination in ${district}, West Bengal, calibrated for low crowd pressure and authentic regional exploration.`,
      language: lang,
      source: 'grounded_offline'
    };
  }
}

export const sendChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }, 12000);

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('[DETOURA CHAT] Chat API unavailable or timed out, generating grounded offline response:', err);
  }

  // Always return grounded response to eliminate chatbot errors
  return generateOfflineChatResponse(request);
};

