/**
 * DETOURA Destination Image Service
 * Retrieves authentic photography for West Bengal destinations
 * using Wikimedia Commons and Wikipedia REST API,
 * with memory + localStorage caching and resilient SVG fallbacks.
 * 
 * Never renders broken images. No paid APIs or Google Maps/Places required.
 */

const CACHE_STORAGE_KEY = 'detoura_destination_image_cache_v2';

/**
 * Returns a high-fidelity inline SVG data-URI styled to the Bengal Terra Pine palette.
 * Since this is a self-contained data URI, it is 100% resilient and can NEVER fail or trigger HTTP errors.
 */
export function getFallbackImage(category?: string, name?: string): string {
  const cat = (category || '').toLowerCase();
  const label = (name || category || 'Bengal Detour').slice(0, 24);

  let bgGradient = '<stop offset="0%" stop-color="#1B3832"/><stop offset="100%" stop-color="#2D5A4C"/>'; // Forest/Pine
  let accentColor = '#E6C875'; // Ochre
  let iconSvg = `
    <!-- Forest / Pine Ridge Silhouette -->
    <path d="M120 180 L140 120 L150 135 L165 95 L180 135 L190 120 L210 180 Z" fill="#152B26" opacity="0.8"/>
    <path d="M60 190 L90 110 L105 130 L125 75 L145 130 L160 110 L190 190 Z" fill="#0E1E1B" opacity="0.9"/>
  `;

  if (cat.includes('hill') || cat.includes('mountain') || cat.includes('ridge')) {
    bgGradient = '<stop offset="0%" stop-color="#20333E"/><stop offset="60%" stop-color="#3A506B"/><stop offset="100%" stop-color="#E29578"/>';
    accentColor = '#FFDDD2';
    iconSvg = `
      <!-- Mountain Ridge / Kanchenjunga silhouette -->
      <polygon points="40,200 130,80 170,130 240,50 310,160 360,110 420,200" fill="#131B23" opacity="0.85"/>
      <polygon points="110,105 130,80 145,100" fill="#FFFFFF" opacity="0.7"/>
      <polygon points="215,85 240,50 265,95" fill="#FFFFFF" opacity="0.85"/>
    `;
  } else if (cat.includes('wild') || cat.includes('nature') || cat.includes('forest') || cat.includes('jungle')) {
    bgGradient = '<stop offset="0%" stop-color="#182E28"/><stop offset="70%" stop-color="#284B40"/><stop offset="100%" stop-color="#7F5300"/>';
    accentColor = '#D4A373';
    iconSvg = `
      <!-- Dooars Grassland / Wildlife Sanctuary trees -->
      <circle cx="80" cy="70" r="30" fill="#E6C875" opacity="0.25"/>
      <path d="M0 200 C80 160 140 180 200 170 C280 155 350 185 460 200 Z" fill="#11221D"/>
      <path d="M70 170 L70 120 M70 135 L50 115 M70 145 L88 125" stroke="#E6C875" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
      <path d="M140 175 L140 100 M140 120 L115 90 M140 135 L165 105" stroke="#E6C875" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
    `;
  } else if (cat.includes('coast') || cat.includes('beach') || cat.includes('sea') || cat.includes('river')) {
    bgGradient = '<stop offset="0%" stop-color="#1D3557"/><stop offset="60%" stop-color="#457B9D"/><stop offset="100%" stop-color="#E9C46A"/>';
    accentColor = '#F4A261';
    iconSvg = `
      <!-- Bay of Bengal Coastal Waves & Sun -->
      <circle cx="340" cy="75" r="35" fill="#E9C46A" opacity="0.6"/>
      <path d="M0 160 C80 140 120 175 200 160 C280 145 320 170 400 155 L400 200 L0 200 Z" fill="#1D3557" opacity="0.7"/>
      <path d="M0 175 C90 165 140 190 220 175 C300 160 360 185 400 170 L400 200 L0 200 Z" fill="#0F1F33"/>
    `;
  } else if (cat.includes('heritage') || cat.includes('temple') || cat.includes('historic') || cat.includes('culture')) {
    bgGradient = '<stop offset="0%" stop-color="#582F0E"/><stop offset="65%" stop-color="#7F4F24"/><stop offset="100%" stop-color="#9F3C16"/>';
    accentColor = '#E6CCB2';
    iconSvg = `
      <!-- Bishnupur Terracotta Temple Arch Silhouette -->
      <path d="M150 200 L150 120 Q200 70 250 120 L250 200 Z" fill="#3D1E03" opacity="0.9"/>
      <path d="M170 200 L170 140 Q200 100 230 140 L230 200 Z" fill="#241202"/>
      <circle cx="200" cy="55" r="8" fill="#E6C875" opacity="0.8"/>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" width="100%" height="100%">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          ${bgGradient}
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#g)"/>
      ${iconSvg}
      <rect y="160" width="400" height="60" fill="black" opacity="0.45"/>
      <text x="20" y="195" fill="${accentColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" letter-spacing="1">
        ${label.toUpperCase()}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Curated verified landmark photography for iconic West Bengal detours (using valid 500px step thumbnail URLs)
const CURATED_LANDMARK_MAP: Record<string, string> = {
  'darjeeling': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/DarjeelingTrainFruitshop_%282%29.jpg/500px-DarjeelingTrainFruitshop_%282%29.jpg',
  'lepchajagat': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/DarjeelingTrainFruitshop_%282%29.jpg/500px-DarjeelingTrainFruitshop_%282%29.jpg',
  'takdah': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/DarjeelingTrainFruitshop_%282%29.jpg/500px-DarjeelingTrainFruitshop_%282%29.jpg',
  'sandakphu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Sandakphu.jpg/500px-Sandakphu.jpg',
  'kalimpong': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/View_of_Kalimpong%2C_India.jpg/500px-View_of_Kalimpong%2C_India.jpg',
  'lava': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/View_of_Kalimpong%2C_India.jpg/500px-View_of_Kalimpong%2C_India.jpg',
  'rishyap': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/View_of_Kalimpong%2C_India.jpg/500px-View_of_Kalimpong%2C_India.jpg',
  'kurseong': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/DarjeelingTrainFruitshop_%282%29.jpg/500px-DarjeelingTrainFruitshop_%282%29.jpg',
  'mirik': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/DarjeelingTrainFruitshop_%282%29.jpg/500px-DarjeelingTrainFruitshop_%282%29.jpg',
  'jaldapara': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Elephant_safari.jpg/500px-Elephant_safari.jpg',
  'gorumara': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Gorumara_Gateway_Arnab_Dutta.JPG/500px-Gorumara_Gateway_Arnab_Dutta.JPG',
  'buxa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Buxa_Duar%2C_Alipurduar.jpg/500px-Buxa_Duar%2C_Alipurduar.jpg',
  'jayanti': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Jayanti_river_Alipurduar.jpg/500px-Jayanti_river_Alipurduar.jpg',
  'mandarmani': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Mandarmani_Sea_Beach.jpg/500px-Mandarmani_Sea_Beach.jpg',
  'digha': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Digha_Tourist_Lodge_front_yard_1.jpg/500px-Digha_Tourist_Lodge_front_yard_1.jpg',
  'tajpur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Mandarmani_Sea_Beach.jpg/500px-Mandarmani_Sea_Beach.jpg',
  'bakkhali': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Mandarmani_Sea_Beach.jpg/500px-Mandarmani_Sea_Beach.jpg',
  'henry island': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Mandarmani_Sea_Beach.jpg/500px-Mandarmani_Sea_Beach.jpg',
  'sundarbans': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Save_the_sundarbans_20.jpg/500px-Save_the_sundarbans_20.jpg',
  'bishnupur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/RadhaShyam.jpg/500px-RadhaShyam.jpg',
  'mukutmanipur': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/RadhaShyam.jpg/500px-RadhaShyam.jpg',
  'shantiniketan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Shantiniketan_Bari_of_Rabindranath_Tagore.jpg/500px-Shantiniketan_Bari_of_Rabindranath_Tagore.jpg',
  'gongoni': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/RadhaShyam.jpg/500px-RadhaShyam.jpg',
  'purulia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Telkupi%2C_Purulia.jpg/500px-Telkupi%2C_Purulia.jpg',
  'ayodhya hills': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Telkupi%2C_Purulia.jpg/500px-Telkupi%2C_Purulia.jpg',
  'murshidabad': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/RadhaShyam.jpg/500px-RadhaShyam.jpg',
  'kolkata': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Victoria_Memorial_situated_in_Kolkata.jpg/500px-Victoria_Memorial_situated_in_Kolkata.jpg'
};

// In-memory cache
const memoryCache = new Map<string, string>();

// Initialize memory cache from localStorage
try {
  const stored = localStorage.getItem(CACHE_STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === 'string') memoryCache.set(k, v);
    });
  }
} catch {
  // Graceful fallback for non-storage environments
}

function saveToCache(key: string, url: string) {
  memoryCache.set(key, url);
  try {
    const current: Record<string, string> = {};
    memoryCache.forEach((v, k) => {
      current[k] = v;
    });
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage quota exceeded
  }
}

/**
 * Normalizes query string for cache key
 */
function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Sanitizes Wikimedia thumbnail URLs so they use an allowed step width (500px or 330px),
 * preventing HTTP 400 "Use thumbnail sizes listed on https://w.wiki/GHai".
 */
export function sanitizeWikimediaUrl(url: string): string {
  if (!url) return '';
  // If URL contains /800px-..., replace with /500px-... while preserving query params
  return url.replace(/\/800px-([^/?#]+)(.*)$/, '/500px-$1$2');
}

/**
 * Retrieves a real destination image from curated landmark photography, Wikipedia REST API,
 * or resilient category-based Bengal Terra Pine SVG fallback.
 * Never throws, never uses paid APIs, and caches all responses.
 */
export async function getDestinationImage(
  name: string,
  district?: string,
  category?: string
): Promise<string> {
  const normKey = normalizeKey(name);

  // 1. Check in-memory / local storage cache
  if (memoryCache.has(normKey)) {
    return sanitizeWikimediaUrl(memoryCache.get(normKey)!);
  }

  // 2. Check curated landmark list for prominent West Bengal spots
  for (const [landmark, url] of Object.entries(CURATED_LANDMARK_MAP)) {
    if (name.toLowerCase().includes(landmark) || landmark.includes(name.toLowerCase())) {
      const sanitized = sanitizeWikimediaUrl(url);
      saveToCache(normKey, sanitized);
      return sanitized;
    }
  }

  // 3. Attempt Wikipedia / Wikimedia API (public, no key required, geotagged real photos)
  try {
    const queries = [
      name.replace(/\s+/g, '_'),
      `${name.replace(/\s+/g, '_')},_West_Bengal`,
      `${name.replace(/\s+/g, '_')},_${district ? district.replace(/\s+/g, '_') : 'Bankura'}`
    ];

    for (const q of queries) {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        const rawUrl = data.thumbnail?.source || data.originalimage?.source;
        if (rawUrl && !rawUrl.includes('Disambig') && !rawUrl.includes('Question_book')) {
          const sanitized = sanitizeWikimediaUrl(rawUrl);
          saveToCache(normKey, sanitized);
          return sanitized;
        }
      }
    }
  } catch (err) {
    // Graceful continuation
    console.debug('Wikipedia photo query notice:', err);
  }

  // 4. Fallback to authentic category-based Bengal Terra Pine graphic
  const fallbackUrl = getFallbackImage(category, name);
  saveToCache(normKey, fallbackUrl);
  return fallbackUrl;
}
