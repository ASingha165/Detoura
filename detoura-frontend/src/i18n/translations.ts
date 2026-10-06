export type Language = 'en' | 'hi' | 'bn';

export interface Translations {
  nav: {
    explore: string;
    travelDna: string;
    discover: string;
    profile: string;
  };
  common: {
    appName: string;
    loading: string;
    error: string;
    retry: string;
    back: string;
    save: string;
    saved: string;
    remove: string;
    cancel: string;
    close: string;
    search: string;
    viewDetails: string;
    viewItinerary: string;
    days: string;
    day: string;
    perDay: string;
    km: string;
    kmAway: string;
    distance: string;
    match: string;
    all: string;
    verified: string;
    firestoreSynced: string;
    signOut: string;
    signIn: string;
    signUp: string;
    share: string;
    getDirections: string;
    startNavigation: string;
    verifiedAddress: string;
    addressUnavailable: string;
    language: string;
    english: string;
    hindi: string;
    bengali: string;
  };
  explore: {
    aiEngineReady: string;
    heroHeadline: string;
    heroSubhead: string;
    startDnaQuiz: string;
    browseAllSpots: string;
    offbeatHighlights: string;
    offbeatSubhead: string;
    curatedDistricts: string;
    districtsSubhead: string;
    mapTitle: string;
    mapSubtitle: string;
    liveGpsTitle: string;
    viewDetour: string;
    featuredDetour: string;
    activeTravelers: string;
    destinationsIndexed: string;
    aiPrecision: string;
  };
  travelDna: {
    stepIndicator: string;
    stepTitle: string;
    pageHeading: string;
    pageSubheading: string;
    nature: string;
    natureDesc: string;
    serenity: string;
    serenityDesc: string;
    culture: string;
    cultureDesc: string;
    adventure: string;
    adventureDesc: string;
    seasonTitle: string;
    seasonSubtitle: string;
    currentSeason: string;
    customSeason: string;
    selectMonth: string;
    durationTitle: string;
    durationSubtitle: string;
    daysCount: string;
    placeTypesTitle: string;
    placeTypesSubtitle: string;
    budgetTitle: string;
    budgetSubtitle: string;
    budgetPerDay: string;
    tierBudget: string;
    tierMid: string;
    tierComfort: string;
    tierAll: string;
    generateCta: string;
    generatingCta: string;
    guestNotice: string;
    guestAction: string;
  };
  recommendations: {
    heading: string;
    subheading: string;
    matchedCount: string;
    filterAll: string;
    filterBudget: string;
    filterDistance: string;
    filterNearMe: string;
    filterMountains: string;
    filterForest: string;
    filterHeritage: string;
    ssiBadge: string;
    cpiBadge: string;
    gemBadge: string;
    matchBadge: string;
    emptyTitle: string;
    emptySubtitle: string;
    emptyAction: string;
    lowCrowds: string;
    moderateCrowds: string;
    highCrowds: string;
    idealSeason: string;
    offSeason: string;
    saveTripTooltip: string;
    removeTripTooltip: string;
    viewDetailsCta: string;
  };
  destinationDetail: {
    backBtn: string;
    saveTrip: string;
    savedTrip: string;
    shareTrip: string;
    directionsBtn: string;
    openGoogleMaps: string;
    synthesizingTitle: string;
    synthesizingDesc: string;
    notFoundTitle: string;
    notFoundDesc: string;
    overviewHeading: string;
    highlightsHeading: string;
    itineraryHeading: string;
    aiIntelligenceHeading: string;
    localIntelHeading: string;
    practicalInfoHeading: string;
    morningSlot: string;
    afternoonSlot: string;
    eveningSlot: string;
    dayPrefix: string;
    crowdPressure: string;
    seasonalFitness: string;
    underratedScore: string;
    estimatedCost: string;
    liveDistance: string;
    verifiedLocation: string;
    recommendedDuration: string;
    activitiesTitle: string;
    reSynthesize: string;
    destinationIntelligence: string;
    contractVerified: string;
    matchScore: string;
    seasonSsi: string;
    underrated: string;
    budgetTier: string;
    tierPrefix: string;
    curatedItineraryTitle: string;
    synthesizedByGemma: string;
    allDays: string;
    timeSlotsBadge: string;
    generateCustomItinerary: string;
    gemmaDescription: string;
    synthesizePlanCta: string;
    synthesizingWithGemma: string;
    highlights: string;
    curatedActivities: string;
    district: string;
    vibe: string;
    comfort: string;
    verifiedAddressNav: string;
    verifiedGeodata: string;
    address: string;
    coordinates: string;
    coordsUnavailable: string;
    distanceFromLoc: string;
    fromYourLocation: string;
    fromOrigin: string;
    liveDistUnavailable: string;
    detectingLocation: string;
    locationDenied: string;
    locationNotEnabled: string;
    enableLocation: string;
    detectingBtn: string;
    howToReach: string;
    openDirectionsSub: string;
    viewPin: string;
    save: string;
    saved: string;
    back: string;
    activities: string;
    morning: string;
    afternoon: string;
    evening: string;
    dnaMatch: string;
    duration: string;
    realBudget: string;
    tranquility: string;
    offbeat: string;
    crowdIndex: string;
    aiSynthesisTitle: string;
    viewRecommendationsBtn: string;
    directionsUnavailable: string;
    enableLocationForDirections: string;
  };
  profile: {
    heading: string;
    activeSession: string;
    savedTripsCount: string;
    kmMapped: string;
    aiAlignment: string;
    travelDnaSummary: string;
    editDna: string;
    mySavedTrips: string;
    loadingTrips: string;
    noTripsTitle: string;
    noTripsDesc: string;
    discoverDetours: string;
    removeSaved: string;
    viewItinerary: string;
    languageSettings: string;
    languageSubtitle: string;
    verifiedTraveler: string;
  };
  chatbot: {
    floatingButton: string;
    title: string;
    subtitle: string;
    currentDestination: string;
    inputPlaceholder: string;
    send: string;
    close: string;
    thinking: string;
    quickPromptsTitle: string;
    quickPromptActivities: string;
    quickPromptItinerary: string;
    quickPromptDistance: string;
    welcomeMessage: string;
    disclaimer: string;
  };
  placeTypes: Record<string, string>;
  months: Record<number, string>;
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      explore: 'Explore',
      travelDna: 'Travel DNA',
      discover: 'Discover',
      profile: 'Profile',
    },
    common: {
      appName: 'Detoura',
      loading: 'Loading...',
      error: 'Something went wrong',
      retry: 'Try Again',
      back: 'Back',
      save: 'Save',
      saved: 'Saved',
      remove: 'Remove',
      cancel: 'Cancel',
      close: 'Close',
      search: 'Search destinations...',
      viewDetails: 'View Details',
      viewItinerary: 'View Itinerary',
      days: 'Days',
      day: 'Day',
      perDay: 'day',
      km: 'km',
      kmAway: 'km away',
      distance: 'Distance',
      match: 'Match',
      all: 'All',
      verified: 'Verified',
      firestoreSynced: 'Firestore Synced',
      signOut: 'Sign Out',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      share: 'Share',
      getDirections: 'Get Directions',
      startNavigation: 'Start GPS Navigation',
      verifiedAddress: 'Verified Address',
      addressUnavailable: 'Address unavailable in verified destination data.',
      language: 'Language',
      english: 'English',
      hindi: 'हिन्दी',
      bengali: 'বাংলা',
    },
    explore: {
      aiEngineReady: 'AI Engine Ready',
      heroHeadline: 'Escape the Crowds. Discover Bengal\'s Secret Detours.',
      heroSubhead: 'Detoura uses real-time crowd pressure indexes, seasonal suitability, and your unique Travel DNA to craft serene, uncrowded regional getaways.',
      startDnaQuiz: 'Discover Your Travel DNA',
      browseAllSpots: 'Explore Offbeat Spots',
      offbeatHighlights: 'Featured Offbeat Sanctuaries',
      offbeatSubhead: 'Handpicked serene destinations with low tourist density and high regional charm.',
      curatedDistricts: 'Curated Bengal Districts',
      districtsSubhead: 'Explore lesser-known heritage, forests, and tranquil highlands across 23 districts.',
      mapTitle: 'Bengal Regional Sanctuary Map',
      mapSubtitle: 'Interactive spatial overview of low-crowd offbeat destinations.',
      liveGpsTitle: 'Live GPS Location Enabled',
      viewDetour: 'View Detour',
      featuredDetour: 'Featured Detour',
      activeTravelers: 'Active Travelers',
      destinationsIndexed: 'Offbeat Spots',
      aiPrecision: 'Recommendation Alignment',
    },
    travelDna: {
      stepIndicator: 'Step 2 of 3',
      stepTitle: 'Travel DNA',
      pageHeading: 'Calibrate Your Travel DNA',
      pageSubheading: 'Fine-tune your personal inclinations to generate mathematically optimized, crowd-free destination recommendations.',
      nature: 'Nature & Wilderness',
      natureDesc: 'Forests, wildlife sanctuaries, verdant trails, and biodiversity',
      serenity: 'Serenity & Relaxation',
      serenityDesc: 'Quiet retreats, peaceful shorelines, and calm hillsides away from crowds',
      culture: 'Heritage & Culture',
      cultureDesc: 'Terracotta temples, tribal crafts, ancient architecture, and folklore',
      adventure: 'Adventure & Exploration',
      adventureDesc: 'Trekking paths, scenic exploration, waterways, and active excursions',
      seasonTitle: 'Travel Season & Timing',
      seasonSubtitle: 'Optimize for climate comfort, low precipitation, and peak tranquil window.',
      currentSeason: 'Current Month',
      customSeason: 'Choose Specific Month',
      selectMonth: 'Select Target Travel Month',
      durationTitle: 'Trip Duration',
      durationSubtitle: 'How many days are you planning for this detour?',
      daysCount: 'Days',
      placeTypesTitle: 'Landscape & Place Preferences',
      placeTypesSubtitle: 'Select landscapes and experiential environments that inspire you.',
      budgetTitle: 'Daily Budget Constraint',
      budgetSubtitle: 'Filter accommodations, meals, and transit to match your comfort tier.',
      budgetPerDay: 'Max INR / Day',
      tierBudget: 'Budget (₹2,200)',
      tierMid: 'Mid-Range (₹4,400)',
      tierComfort: 'Comfort (₹5,000+)',
      tierAll: 'Any Budget',
      generateCta: 'Generate Personalized Detours',
      generatingCta: 'Synthesizing with Gemma AI...',
      guestNotice: 'Sign in to save detours and custom passport',
      guestAction: 'Join / Sign In',
    },
    recommendations: {
      heading: 'Your Personalized Detours',
      subheading: 'Ranked by AI recommendation alignment, seasonal suitability (SSI), and low crowd pressure (CPI).',
      matchedCount: 'Matched Sanctuaries',
      filterAll: 'All Categories',
      filterBudget: 'Budget',
      filterDistance: 'Nearest First',
      filterNearMe: 'Near Me',
      filterMountains: 'Hills & Mountains',
      filterForest: 'Forests & Wildlife',
      filterHeritage: 'Heritage & Culture',
      ssiBadge: 'SSI Season Score',
      cpiBadge: 'CPI Crowd Pressure',
      gemBadge: 'Hidden Gem Score',
      matchBadge: 'DNA Match',
      emptyTitle: 'No destinations match current criteria',
      emptySubtitle: 'Try expanding your budget constraint or exploring other landscape categories.',
      emptyAction: 'Adjust Travel DNA',
      lowCrowds: 'Low Crowds',
      moderateCrowds: 'Moderate Crowds',
      highCrowds: 'High Crowds',
      idealSeason: 'Ideal Season',
      offSeason: 'Off-Peak',
      saveTripTooltip: 'Save to My Trips',
      removeTripTooltip: 'Remove from Saved Trips',
      viewDetailsCta: 'View Itinerary & Details',
    },
    destinationDetail: {
      backBtn: 'Back',
      saveTrip: 'Save Detour',
      savedTrip: 'Saved',
      shareTrip: 'Share Detour',
      directionsBtn: 'Get Directions',
      openGoogleMaps: 'Open in Google Maps',
      synthesizingTitle: 'Synthesizing Regional Intelligence...',
      synthesizingDesc: 'Querying Gemma LLM and destination intelligence records.',
      notFoundTitle: 'Destination Not Found',
      notFoundDesc: 'The requested detour could not be located in verified records.',
      overviewHeading: 'AI Travel Synthesis & Overview',
      highlightsHeading: 'Curated Activities & Highlights',
      itineraryHeading: 'Gemma Synthesized Itinerary',
      aiIntelligenceHeading: 'Regional Intelligence Metrics',
      localIntelHeading: 'Live Location & Access',
      practicalInfoHeading: 'Practical Travel Information',
      morningSlot: 'Morning',
      afternoonSlot: 'Afternoon',
      eveningSlot: 'Evening',
      dayPrefix: 'Day',
      crowdPressure: 'Live Crowd Pressure (CPI)',
      seasonalFitness: 'Seasonal Suitability (SSI)',
      underratedScore: 'Hidden Gem Rating',
      estimatedCost: 'Estimated Daily Cost',
      liveDistance: 'Distance from Current GPS',
      verifiedLocation: 'Verified Coordinates',
      recommendedDuration: 'Recommended Stay',
      activitiesTitle: 'Recommended Activities',
      reSynthesize: 'Re-Synthesize Itinerary',
      destinationIntelligence: 'Destination Intelligence',
      contractVerified: 'Contract Verified',
      matchScore: 'Match Score',
      seasonSsi: 'Season SSI',
      underrated: 'Underrated',
      budgetTier: 'Budget Tier',
      tierPrefix: 'Tier',
      curatedItineraryTitle: 'Curated Itinerary',
      synthesizedByGemma: 'Synthesized by Local Gemma 2B',
      allDays: 'All Days',
      timeSlotsBadge: 'Morning • Afternoon • Evening',
      generateCustomItinerary: 'Generate Custom Itinerary with Gemma AI',
      gemmaDescription: 'Run our locally hosted Gemma 2B model to synthesize a custom time-slotted morning, afternoon, and evening plan.',
      synthesizePlanCta: 'Synthesize AI Plan',
      synthesizingWithGemma: 'Synthesizing with Gemma...',
      highlights: 'Highlights',
      curatedActivities: 'Curated Activities',
      district: 'District',
      vibe: 'Vibe',
      comfort: 'Comfort',
      verifiedAddressNav: 'Verified Address & Navigation',
      verifiedGeodata: 'Verified Geodata',
      address: 'Address',
      coordinates: 'GPS Coordinates',
      coordsUnavailable: 'Location coordinates unavailable',
      distanceFromLoc: 'Distance from your location',
      fromYourLocation: 'from your location',
      fromOrigin: 'from origin',
      liveDistUnavailable: 'Live distance available on location access',
      detectingLocation: 'Detecting live location...',
      locationDenied: 'Location access denied',
      locationNotEnabled: 'Location not enabled',
      enableLocation: 'Enable Location',
      detectingBtn: 'Detecting...',
      howToReach: 'How to reach',
      openDirectionsSub: 'Open directions for the best route',
      viewPin: 'View Pin',
      save: 'Save',
      saved: 'Saved',
      back: 'Back',
      activities: 'Activities',
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      dnaMatch: 'DNA MATCH',
      duration: 'Duration',
      realBudget: 'Real Budget',
      tranquility: 'Tranquility',
      offbeat: 'Offbeat',
      crowdIndex: 'Crowd Index',
      aiSynthesisTitle: 'Gemma AI & DETOURA Synthesis',
      viewRecommendationsBtn: 'View Recommendations',
      directionsUnavailable: 'Directions unavailable',
      enableLocationForDirections: 'Enable location for directions',
    },
    profile: {
      heading: 'Traveler Profile',
      activeSession: 'Active Traveler Session',
      savedTripsCount: 'Saved Trips',
      kmMapped: 'Km Mapped',
      aiAlignment: 'AI Alignment',
      travelDnaSummary: 'Travel DNA Profile',
      editDna: 'Edit DNA',
      mySavedTrips: 'My Saved Trips',
      loadingTrips: 'Loading saved trips from Firestore...',
      noTripsTitle: 'No trips saved yet',
      noTripsDesc: 'Generate recommendations and save your favorite offbeat spots to build your custom itinerary.',
      discoverDetours: 'Discover Offbeat Detours',
      removeSaved: 'Remove',
      viewItinerary: 'View Itinerary',
      languageSettings: 'Language & Localization',
      languageSubtitle: 'Select your preferred interface and narrative language',
      verifiedTraveler: 'Verified Traveler',
    },
    placeTypes: {
      mountains: 'Mountains & Hills',
      coast: 'Ocean / Coast',
      beaches: 'Beaches',
      forests: 'Forests',
      waterfalls: 'Waterfalls',
      wildlife: 'Wildlife',
      rivers_lakes: 'Rivers & Lakes',
      heritage: 'Heritage & Historic',
      spiritual: 'Spiritual',
      countryside: 'Rural / Countryside',
      tea_gardens: 'Tea Gardens',
      islands: 'Islands',
    },
    months: {
      1: 'January',
      2: 'February',
      3: 'March',
      4: 'April',
      5: 'May',
      6: 'June',
      7: 'July',
      8: 'August',
      9: 'September',
      10: 'October',
      11: 'November',
      12: 'December',
    },
    chatbot: {
      floatingButton: '✦ Ask Detoura',
      title: 'Ask Detoura',
      subtitle: 'Local Gemma 2B Intelligence',
      currentDestination: 'Current Destination',
      inputPlaceholder: 'Ask about activities, itinerary, distance...',
      send: 'Send',
      close: 'Close',
      thinking: 'Gemma is thinking...',
      quickPromptsTitle: 'Suggested Inquiries',
      quickPromptActivities: 'What can I do here?',
      quickPromptItinerary: 'Show me the itinerary plan',
      quickPromptDistance: 'How far is this destination?',
      welcomeMessage: 'Hello! I am your Ask Detoura travel assistant powered by local Gemma 2B. Ask me anything about destination activities, itineraries, or verified distances.',
      disclaimer: 'Answers are strictly grounded in verified regional intelligence. Hotel/traffic pricing is not estimated.',
    },
  },
  hi: {
    nav: {
      explore: 'एक्सप्लोर',
      travelDna: 'ट्रैवल डीएनए',
      discover: 'खोजें',
      profile: 'प्रोफ़ाइल',
    },
    common: {
      appName: 'डेटूरा (Detoura)',
      loading: 'लोड हो रहा है...',
      error: 'कुछ गड़बड़ हुई',
      retry: 'पुनः प्रयास करें',
      back: 'पीछे जाएं',
      save: 'सहेजें',
      saved: 'सहेजा गया',
      remove: 'हटाएं',
      cancel: 'रद्द करें',
      close: 'बंद करें',
      search: 'गंतव्य खोजें...',
      viewDetails: 'विवरण देखें',
      viewItinerary: 'यात्रा कार्यक्रम देखें',
      days: 'दिन',
      day: 'दिन',
      perDay: 'प्रति दिन',
      km: 'किमी',
      kmAway: 'किमी दूर',
      distance: 'दूरी',
      match: 'मेल',
      all: 'सभी',
      verified: 'सत्यापित',
      firestoreSynced: 'फायरस्टोर सिंक',
      signOut: 'साइन आउट',
      signIn: 'साइन इन',
      signUp: 'साइन अप',
      share: 'साझा करें',
      getDirections: 'दिशा-निर्देश प्राप्त करें',
      startNavigation: 'जीपीएस नेविगेशन शुरू करें',
      verifiedAddress: 'सत्यापित पता',
      addressUnavailable: 'सत्यापित गंतव्य डेटा में पता उपलब्ध नहीं है।',
      language: 'भाषा',
      english: 'English',
      hindi: 'हिन्दी',
      bengali: 'বাংলা',
    },
    explore: {
      aiEngineReady: 'एआई इंजन तैयार',
      heroHeadline: 'भीड़ से दूर हटें। बंगाल के अनूठे गुप्त स्थानों की खोज करें।',
      heroSubhead: 'डेटूरा वास्तविक समय भीड़ सूचकांक, मौसमी अनुकूलता और आपके व्यक्तिगत ट्रैवल डीएनए के आधार पर शांत, कम भीड़-भाड़ वाले स्थान सुझाता है।',
      startDnaQuiz: 'अपना ट्रैवल डीएनए पहचानें',
      browseAllSpots: 'सभी अनूठे स्थान देखें',
      offbeatHighlights: 'प्रमुख शांत व प्राकृतिक स्थल',
      offbeatSubhead: 'कम पर्यटकों और उच्च क्षेत्रीय आकर्षण वाले चुनिंदा शांत गंतव्य।',
      curatedDistricts: 'बंगाल के चुनिंदा जिले',
      districtsSubhead: '23 जिलों में फैले ऐतिहासिक स्थल, घने जंगल और शांत पर्वतीय क्षेत्र।',
      mapTitle: 'बंगाल क्षेत्रीय गंतव्य मानचित्र',
      mapSubtitle: 'कम भीड़ वाले अनूठे गंतव्यों का इंटरएक्टिव नक्शा।',
      liveGpsTitle: 'लाइव जीपीएस स्थान सक्रिय',
      viewDetour: 'स्थान देखें',
      featuredDetour: 'विशेष गंतव्य',
      activeTravelers: 'सक्रिय यात्री',
      destinationsIndexed: 'अनूठे स्थान',
      aiPrecision: 'सिफारिश सटीकता',
    },
    travelDna: {
      stepIndicator: 'चरण 2 / 3',
      stepTitle: 'ट्रैवल डीएनए',
      pageHeading: 'अपना ट्रैवल डीएनए सेट करें',
      pageSubheading: 'अपनी प्राथमिकताओं को अनुकूलित करें ताकि भीड़-मुक्त और शांतिपूर्ण यात्रा गंतव्य प्राप्त हो सकें।',
      nature: 'प्रकृति एवं वन्यजीव',
      natureDesc: 'जंगल, वन्यजीव अभयारण्य, हरियाली भरे रास्ते और जैव विविधता',
      serenity: 'शांति एवं विश्राम',
      serenityDesc: 'भीड़ से दूर शांत तट, शांत पहाड़ियां और सुकून भरे स्थल',
      culture: 'विरासत एवं संस्कृति',
      cultureDesc: 'टेराकोटा मंदिर, पारंपरिक हस्तशिल्प, ऐतिहासिक वास्तुकला',
      adventure: 'साहसिक एवं रोमांच',
      adventureDesc: 'ट्रेकिंग, प्रकृति परिभ्रमण, जलमार्ग और सक्रिय यात्राएं',
      seasonTitle: 'यात्रा का मौसम एवं समय',
      seasonSubtitle: 'सुहावने मौसम, कम बारिश और सर्वोत्तम शांत समय के अनुसार अनुकूलित करें।',
      currentSeason: 'वर्तमान माह',
      customSeason: 'विशिष्ट माह चुनें',
      selectMonth: 'यात्रा का लक्षित माह चुनें',
      durationTitle: 'यात्रा की अवधि',
      durationSubtitle: 'आप कितने दिनों की यात्रा की योजना बना रहे हैं?',
      daysCount: 'दिन',
      placeTypesTitle: 'भौगोलिक परिदृश्य प्राथमिकताएं',
      placeTypesSubtitle: 'अपनी पसंद के प्राकृतिक और सांस्कृतिक परिदृश्य चुनें।',
      budgetTitle: 'दैनिक बजट सीमा',
      budgetSubtitle: 'अपनी सुविधा के अनुसार आवास, भोजन और आवागमन बजट निर्धारित करें।',
      budgetPerDay: 'अधिकतम रुपये / दिन',
      tierBudget: 'किफायती (₹2,200)',
      tierMid: 'मध्यम (₹4,400)',
      tierComfort: 'आरामदायक (₹5,000+)',
      tierAll: 'कोई भी बजट',
      generateCta: 'वैयक्तिकृत सिफारिशें बनाएं',
      generatingCta: 'जेम्मा एआई विश्लेषण कर रहा है...',
      guestNotice: 'यात्राएं सहेजने और पासपोर्ट बनाने के लिए साइन इन करें',
      guestAction: 'शामिल हों / साइन इन करें',
    },
    recommendations: {
      heading: 'आपके लिए व्यक्तिगत गंतव्य',
      subheading: 'एआई मिलान, मौसमी अनुकूलता (SSI) और निम्न भीड़ दबाव (CPI) द्वारा क्रमबद्ध।',
      matchedCount: 'अनुकूल गंतव्य',
      filterAll: 'सभी श्रेणियां',
      filterBudget: 'बजट',
      filterDistance: 'निकटतम पहले',
      filterNearMe: 'मेरे पास',
      filterMountains: 'पहाड़ियां और पर्वत',
      filterForest: 'जंगल और वन्यजीव',
      filterHeritage: 'विरासत और संस्कृति',
      ssiBadge: 'SSI मौसमी स्कोर',
      cpiBadge: 'CPI भीड़ सूचकांक',
      gemBadge: 'छिपा हुआ रत्न स्कोर',
      matchBadge: 'डीएनए मेल',
      emptyTitle: 'वर्तमान मानदंडों से कोई गंतव्य मेल नहीं खाता',
      emptySubtitle: 'कृपया अपनी बजट सीमा बढ़ाएं या अन्य श्रेणियों का चयन करें।',
      emptyAction: 'ट्रैवल डीएनए समायोजित करें',
      lowCrowds: 'कम भीड़',
      moderateCrowds: 'मध्यम भीड़',
      highCrowds: 'अधिक भीड़',
      idealSeason: 'आदर्श मौसम',
      offSeason: 'कम अनुकूल मौसम',
      saveTripTooltip: 'सहेजी गई सूची में जोड़ें',
      removeTripTooltip: 'सहेजी गई सूची से हटाएं',
      viewDetailsCta: 'यात्रा कार्यक्रम और विवरण देखें',
    },
    destinationDetail: {
      backBtn: 'पीछे जाएं',
      saveTrip: 'यात्रा सहेजें',
      savedTrip: 'सहेजा गया',
      shareTrip: 'साझा करें',
      directionsBtn: 'दिशा-निर्देश प्राप्त करें',
      openGoogleMaps: 'गूगल मैप्स में खोलें',
      synthesizingTitle: 'क्षेत्रीय जानकारी तैयार हो रही है...',
      synthesizingDesc: 'जेम्मा एलएलएम और सत्यापित गंतव्य रिकॉर्ड का विश्लेषण किया जा रहा है।',
      notFoundTitle: 'गंतव्य नहीं मिला',
      notFoundDesc: 'अनुरोधित गंतव्य सत्यापित रिकॉर्ड में नहीं मिला।',
      overviewHeading: 'एआई यात्रा सारांश एवं अवलोकन',
      highlightsHeading: 'प्रमुख गतिविधियां एवं आकर्षण',
      itineraryHeading: 'जेम्मा द्वारा तैयार यात्रा कार्यक्रम',
      aiIntelligenceHeading: 'क्षेत्रीय विश्लेषण मेट्रिक्स',
      localIntelHeading: 'लाइव स्थान एवं पहुंच',
      practicalInfoHeading: 'व्यावहारिक यात्रा जानकारी',
      morningSlot: 'सुबह',
      afternoonSlot: 'दोपहर',
      eveningSlot: 'शाम',
      dayPrefix: 'दिन',
      crowdPressure: 'लाइव भीड़ दबाव (CPI)',
      seasonalFitness: 'मौसमी उपयुक्तता (SSI)',
      underratedScore: 'अन्वेषण रेटिंग',
      estimatedCost: 'अनुमानित दैनिक लागत',
      liveDistance: 'वर्तमान जीपीएस से दूरी',
      verifiedLocation: 'सत्यापित निर्देशांक',
      recommendedDuration: 'सुझाई गई अवधि',
      activitiesTitle: 'सुझाई गई गतिविधियां',
      reSynthesize: 'यात्रा कार्यक्रम पुनः बनाएं',
      destinationIntelligence: 'गंतव्य विश्लेषण',
      contractVerified: 'सत्यापित डेटा',
      matchScore: 'मैच स्कोर',
      seasonSsi: 'मौसम उपयुक्तता (SSI)',
      underrated: 'कम चर्चित (ऑफबीट)',
      budgetTier: 'बजट श्रेणी',
      tierPrefix: 'श्रेणी',
      curatedItineraryTitle: 'क्यूरेटेड यात्रा कार्यक्रम',
      synthesizedByGemma: 'स्थानीय Gemma 2B द्वारा तैयार',
      allDays: 'सभी दिन',
      timeSlotsBadge: 'सुबह • दोपहर • शाम',
      generateCustomItinerary: 'Gemma AI द्वारा यात्रा कार्यक्रम तैयार करें',
      gemmaDescription: 'स्थानीय रूप से होस्ट किए गए Gemma 2B मॉडल से समयबद्ध सुबह, दोपहर और शाम की योजना बनाएं।',
      synthesizePlanCta: 'एआई योजना तैयार करें',
      synthesizingWithGemma: 'Gemma AI द्वारा तैयार किया जा रहा है...',
      highlights: 'प्रमुख विशेषताएं',
      curatedActivities: 'अनुशंसित गतिविधियां',
      district: 'ज़िला',
      vibe: 'माहौल',
      comfort: 'आराम',
      verifiedAddressNav: 'सत्यापित पता एवं नेविगेशन',
      verifiedGeodata: 'सत्यापित भू-डेटा',
      address: 'सत्यापित पता',
      coordinates: 'जीपीएस निर्देशांक',
      coordsUnavailable: 'स्थान के निर्देशांक उपलब्ध नहीं हैं',
      distanceFromLoc: 'आपके स्थान से दूरी',
      fromYourLocation: 'आपके स्थान से',
      fromOrigin: 'शुरुआती बिंदु से',
      liveDistUnavailable: 'स्थान अनुमति पर लाइव दूरी उपलब्ध',
      detectingLocation: 'लाइव स्थान का पता लगाया जा रहा है...',
      locationDenied: 'स्थान अनुमति अस्वीकृत',
      locationNotEnabled: 'स्थान सक्षम नहीं है',
      enableLocation: 'स्थान सक्षम करें',
      detectingBtn: 'पता लगाया जा रहा है...',
      howToReach: 'कैसे पहुंचें',
      openDirectionsSub: 'सर्वोत्तम मार्ग के लिए दिशा-निर्देश खोलें',
      viewPin: 'पिन देखें',
      save: 'सहेजें',
      saved: 'सहेजा गया',
      back: 'पीछे',
      activities: 'गतिविधियां',
      morning: 'सुबह',
      afternoon: 'दोपहर',
      evening: 'शाम',
      dnaMatch: 'डीएनए मैच',
      duration: 'अवधि',
      realBudget: 'दैनिक बजट',
      tranquility: 'शांति एवं सुकून',
      offbeat: 'ऑफबीट',
      crowdIndex: 'भीड़ सूचकांक',
      aiSynthesisTitle: 'Gemma AI एवं DETOURA विश्लेषण',
      viewRecommendationsBtn: 'सिफारिशें देखें',
      directionsUnavailable: 'दिशा-निर्देश उपलब्ध नहीं हैं',
      enableLocationForDirections: 'दिशा-निर्देश के लिए स्थान सक्षम करें',
    },
    profile: {
      heading: 'यात्री प्रोफ़ाइल',
      activeSession: 'सक्रिय यात्री सत्र',
      savedTripsCount: 'सहेजी गई यात्राएं',
      kmMapped: 'किमी मैप किए गए',
      aiAlignment: 'एआई संरेखण',
      travelDnaSummary: 'ट्रैवल डीएनए प्रोफ़ाइल',
      editDna: 'डीएनए संपादित करें',
      mySavedTrips: 'मेरी सहेजी गई यात्राएं',
      loadingTrips: 'फायरस्टोर से यात्राएं लोड हो रही हैं...',
      noTripsTitle: 'अभी तक कोई यात्रा सहेजी नहीं गई',
      noTripsDesc: 'सिफारिशें देखें और अपनी पसंदीदा यात्रा सूची बनाने के लिए "सहेजें" पर क्लिक करें।',
      discoverDetours: 'अनूठे गंतव्य खोजें',
      removeSaved: 'हटाएं',
      viewItinerary: 'यात्रा कार्यक्रम देखें',
      languageSettings: 'भाषा और स्थानीयकरण',
      languageSubtitle: 'अपनी पसंदीदा इंटरफ़ेस और विवरण भाषा चुनें',
      verifiedTraveler: 'सत्यापित यात्री',
    },
    placeTypes: {
      mountains: 'पर्वत और पहाड़ियां',
      coast: 'समुद्र / तटीय क्षेत्र',
      beaches: 'समुद्र तट (बीच)',
      forests: 'जंगल एवं वन',
      waterfalls: 'झरने',
      wildlife: 'वन्यजीव अभयारण्य',
      rivers_lakes: 'नदियां और झीलें',
      heritage: 'विरासत एवं ऐतिहासिक',
      spiritual: 'आध्यात्मिक स्थल',
      countryside: 'ग्रामीण अंचल',
      tea_gardens: 'चाय बागान',
      islands: 'द्वीप',
    },
    months: {
      1: 'जनवरी',
      2: 'फ़रवरी',
      3: 'मार्च',
      4: 'अप्रैल',
      5: 'मई',
      6: 'जून',
      7: 'जुलाई',
      8: 'अगस्त',
      9: 'सितंबर',
      10: 'अक्टूबर',
      11: 'नवंबर',
      12: 'दिसंबर',
    },
    chatbot: {
      floatingButton: '✦ डेटौरा से पूछें',
      title: 'डेटौरा एआई',
      subtitle: 'स्थानीय जेमा 2B इंटेलिजेंस',
      currentDestination: 'वर्तमान गंतव्य',
      inputPlaceholder: 'गतिविधियों, यात्रा योजना, दूरी के बारे में पूछें...',
      send: 'भेजें',
      close: 'बंद करें',
      thinking: 'जेमा सोच रहा है...',
      quickPromptsTitle: 'सुझाए गए प्रश्न',
      quickPromptActivities: 'मैं यहाँ क्या कर सकता हूँ?',
      quickPromptItinerary: 'यात्रा योजना दिखाएं',
      quickPromptDistance: 'यह गंतव्य कितनी दूर है?',
      welcomeMessage: 'नमस्ते! मैं स्थानीय जेमा 2B द्वारा संचालित आपका डेटौरा यात्रा सहायक हूँ। गंतव्य की गतिविधियों, यात्रा योजना या सत्यापित दूरी के बारे में कुछ भी पूछें।',
      disclaimer: 'उत्तर पूरी तरह से सत्यापित क्षेत्रीय डेटा पर आधारित हैं। होटल और यातायात दरों का अनुमान नहीं लगाया जाता है।',
    },
  },
  bn: {
    nav: {
      explore: 'অন্বেষণ',
      travelDna: 'ট্রাভেল ডিএনএ',
      discover: 'খুঁজুন',
      profile: 'প্রোফাইল',
    },
    common: {
      appName: 'ডিট্যুরা (Detoura)',
      loading: 'লোড হচ্ছে...',
      error: 'কিছু সমস্যা হয়েছে',
      retry: 'পুনরায় চেষ্টা করুন',
      back: 'ফিরে যান',
      save: 'সংরক্ষণ করুন',
      saved: 'সংরক্ষিত',
      remove: 'মুছুন',
      cancel: 'বাতিল',
      close: 'বন্ধ করুন',
      search: 'গন্তব্য অনুসন্ধান...',
      viewDetails: 'বিস্তারিত দেখুন',
      viewItinerary: 'ভ্রমণসূচি দেখুন',
      days: 'দিন',
      day: 'দিন',
      perDay: 'প্রতি দিন',
      km: 'কিমি',
      kmAway: 'কিমি দূরে',
      distance: 'দূরত্ব',
      match: 'ম্যাচ',
      all: 'সকল',
      verified: 'যাচাইকৃত',
      firestoreSynced: 'ফায়ারস্টোর সিঙ্কড',
      signOut: 'সাইন আউট',
      signIn: 'সাইন ইন',
      signUp: 'সাইন আপ',
      share: 'শেয়ার করুন',
      getDirections: 'দিকনির্দেশনা পান',
      startNavigation: 'জিপিএস নেভিগেশন শুরু করুন',
      verifiedAddress: 'যাচাইকৃত ঠিকানা',
      addressUnavailable: 'যাচাইকৃত গন্তব্য তথ্যে ঠিকানা উপলব্ধ নেই।',
      language: 'ভাষা',
      english: 'English',
      hindi: 'हिन्दी',
      bengali: 'বাংলা',
    },
    explore: {
      aiEngineReady: 'এআই ইঞ্জিন সক্রিয়',
      heroHeadline: 'কোলাহল এড়িয়ে চলুন। আবিষ্কার করুন বাংলার অজানা নিভৃত প্রান্তর।',
      heroSubhead: 'ডিট্যুরা লাইভ ক্রাউড প্রেসার ইনডেক্স, ঋতুভিত্তিক উপযোগিতা এবং আপনার নিজস্ব ট্রাভেল ডিএনএ মিলিয়ে তৈরি করে শান্তিময় অফবিট ভ্রমণের পরামর্শ।',
      startDnaQuiz: 'আপনার ট্রাভেল ডিএনএ জানুন',
      browseAllSpots: 'সকল অফবিট স্থান অন্বেষণ করুন',
      offbeatHighlights: 'নির্বাচিত নিরিবিলি আশ্রয়স্থল',
      offbeatSubhead: 'কম পর্যটক সমাগম এবং উচ্চ আঞ্চলিক সৌন্দর্যে সমৃদ্ধ বাছাই করা গন্তব্যসমূহ।',
      curatedDistricts: 'বাংলার ২৩টি জেলা',
      districtsSubhead: 'ঐতিহাসিক নিদর্শন, সবুজ অরণ্য ও শান্ত পাহাড়ে ঘেরা অদেখা রূপ।',
      mapTitle: 'বাংলার আঞ্চলিক অফবিট মানচিত্র',
      mapSubtitle: 'কম ভিড়ের শান্ত স্থানসমূহের ইন্টারঅ্যাক্টিভ ভৌগোলিক মানচিত্র।',
      liveGpsTitle: 'লাইভ জিপিএস সক্রিয়',
      viewDetour: 'গন্তব্য দেখুন',
      featuredDetour: 'বিশেষ গন্তব্য',
      activeTravelers: 'সক্রিয় ভ্রমণকারী',
      destinationsIndexed: 'অফবিট গন্তব্য',
      aiPrecision: 'সুপারিশ যথার্থতা',
    },
    travelDna: {
      stepIndicator: 'ধাপ ২ / ৩',
      stepTitle: 'ট্রাভেল ডিএনএ',
      pageHeading: 'আপনার ট্রাভেল ডিএনএ প্রস্তুত করুন',
      pageSubheading: 'আপনার পছন্দসমূহ নির্ধারণ করুন যাতে কোনো ভিড় ছাড়াই নিখুঁত ও নির্মল ভ্রমণ গন্তব্য খুঁজে পাওয়া যায়।',
      nature: 'প্রকৃতি ও বন্যপ্রাণী',
      natureDesc: 'অরণ্য, বন্যপ্রাণী অভয়ারণ্য, পাহাড়ি ট্রেইল ও জীববৈচিত্র্য',
      serenity: 'প্রশান্তি ও নিস্তব্ধতা',
      serenityDesc: 'কোলাহলমুক্ত শান্ত তটরেখা, নির্জন উপত্যকা ও স্বস্তিদায়ক পরিবেশ',
      culture: 'ঐতিহ্য ও সংস্কৃতি',
      cultureDesc: 'পোড়ামাটির মন্দির, লোকশিল্প, প্রাচীন স্থাপত্য ও ইতিহাস',
      adventure: 'রোমাঞ্চ ও অভিযাত্রা',
      adventureDesc: 'ট্রেকিং পথ, পাহাড়ি পদযাত্রা, জলপথ ও সক্রিয় অন্বেষণ',
      seasonTitle: 'ভ্রমণের ঋতু ও সময়',
      seasonSubtitle: 'আবহাওয়া, কম বৃষ্টিপাত এবং নিখুঁত শান্ত সময়ের জন্য অনুকূল সময় নির্বাচন।',
      currentSeason: 'বর্তমান মাস',
      customSeason: 'নির্দিষ্ট মাস নির্বাচন করুন',
      selectMonth: 'ভ্রমণের নির্দিষ্ট মাস বেছে নিন',
      durationTitle: 'ভ্রমণের স্থায়িত্ব',
      durationSubtitle: 'আপনি কত দিনের ভ্রমণের পরিকল্পনা করছেন?',
      daysCount: 'দিন',
      placeTypesTitle: 'প্রাকৃতিক ও ভৌগোলিক পছন্দ',
      placeTypesSubtitle: 'আপনার পছন্দের প্রাকৃতিক ও ঐতিহাসিক পরিবেশসমূহ নির্বাচন করুন।',
      budgetTitle: 'দৈনিক বাজেট সীমা',
      budgetSubtitle: 'আপনার সুবিধা অনুযায়ী থাকা, খাওয়া ও যাতায়াত খরচ নির্ধারণ করুন।',
      budgetPerDay: 'সর্বোচ্চ টাকা / দিন',
      tierBudget: 'সাশ্রয়ী (₹২,২০০)',
      tierMid: 'মাঝারি (₹৪,৪০০)',
      tierComfort: 'প্রিমিয়াম (₹৫,০০০+)',
      tierAll: 'যেকোনো বাজেট',
      generateCta: 'ব্যক্তিগত ভ্রমণ পরিকল্পনা তৈরি করুন',
      generatingCta: 'জেমা এআই বিশ্লেষণ করছে...',
      guestNotice: 'ট্রিপ সংরক্ষণ করতে এবং পাসপোর্ট তৈরি করতে সাইন ইন করুন',
      guestAction: 'যুক্ত হন / সাইন ইন করুন',
    },
    recommendations: {
      heading: 'আপনার জন্য ব্যক্তিগত অফবিট গন্তব্য',
      subheading: 'এআই সামঞ্জস্য, ঋতুভিত্তিক উপযোগিতা (SSI) এবং কম ভিড়ের সূচক (CPI) অনুযায়ী সাজানো।',
      matchedCount: 'উপযুক্ত গন্তব্যসমূহ',
      filterAll: 'সকল বিভাগ',
      filterBudget: 'বাজেট',
      filterDistance: 'কাছের গুলো আগে',
      filterNearMe: 'আমার কাছাকাছি',
      filterMountains: 'পাহাড় ও পর্বতমালা',
      filterForest: 'অরণ্য ও বন্যপ্রাণী',
      filterHeritage: 'ঐতিহ্য ও সংস্কৃতি',
      ssiBadge: 'SSI ঋতু স্কোর',
      cpiBadge: 'CPI ভিড়ের সূচক',
      gemBadge: 'লুকানো রত্ন স্কোর',
      matchBadge: 'ডিএনএ ম্যাচ',
      emptyTitle: 'বর্তমান মানদণ্ডের সাথে কোনো গন্তব্য মেলেনি',
      emptySubtitle: 'আপনার বাজেট বাড়িয়ে অথবা অন্য বিভাগ নির্বাচন করে চেষ্টা করুন।',
      emptyAction: 'ট্রাভেল ডিএনএ পুনরায় সেট করুন',
      lowCrowds: 'কম ভিড়',
      moderateCrowds: 'মাঝারি ভিড়',
      highCrowds: 'অতিরিক্ত ভিড়',
      idealSeason: 'অনুকূল ঋতু',
      offSeason: 'কম উপযোগী ঋতু',
      saveTripTooltip: 'সংরক্ষিত তালিকায় রাখুন',
      removeTripTooltip: 'সংরক্ষিত তালিকা থেকে মুছুন',
      viewDetailsCta: 'ভ্রমণসূচি ও বিস্তারিত দেখুন',
    },
    destinationDetail: {
      backBtn: 'ফিরে যান',
      saveTrip: 'ট্রিপ সংরক্ষণ করুন',
      savedTrip: 'সংরক্ষিত',
      shareTrip: 'শেয়ার করুন',
      directionsBtn: 'দিকনির্দেশনা পান',
      openGoogleMaps: 'গুগল ম্যাপসে খুলুন',
      synthesizingTitle: 'আঞ্চলিক তথ্য প্রস্তুত করা হচ্ছে...',
      synthesizingDesc: 'জেমা এলএলএম ও যাচাইকৃত গন্তব্যের তথ্য পর্যালোচনা করা হচ্ছে।',
      notFoundTitle: 'গন্তব্যটি পাওয়া যায়নি',
      notFoundDesc: 'যাচাইকৃত নথিতে অনুরোধকৃত গন্তব্যটি খুঁজে পাওয়া যায়নি।',
      overviewHeading: 'এআই ভ্রমণ পর্যালোচনা ও বিবরণ',
      highlightsHeading: 'বিশেষ আকর্ষণ ও ক্রিয়াকলাপ',
      itineraryHeading: 'জেমা এআই প্রণীত ভ্রমণসূচি',
      aiIntelligenceHeading: 'আঞ্চলিক বিশ্লেষণ মেট্রিক্স',
      localIntelHeading: 'লাইভ অবস্থান ও যাতায়াত',
      practicalInfoHeading: 'প্রয়োজনীয় ভ্রমণ তথ্য',
      morningSlot: 'সকাল',
      afternoonSlot: 'দুপুর',
      eveningSlot: 'সন্ধ্যা',
      dayPrefix: 'দিন',
      crowdPressure: 'লাইভ ক্রাউড প্রেসার (CPI)',
      seasonalFitness: 'ঋতুভিত্তিক উপযোগিতা (SSI)',
      underratedScore: 'অফবিট রেটিং',
      estimatedCost: 'আনুমানিক দৈনিক খরচ',
      liveDistance: 'বর্তমান জিপিএস থেকে দূরত্ব',
      verifiedLocation: 'যাচাইকৃত স্থানাঙ্ক',
      recommendedDuration: 'সুপারিশকৃত সময়কাল',
      activitiesTitle: 'সুপারিশকৃত ক্রিয়াকলাপ',
      reSynthesize: 'ভ্রমণসূচি পুনর্নির্মাণ করুন',
      destinationIntelligence: 'গন্তব্য বিশ্লেষণ',
      contractVerified: 'যাচাইকৃত তথ্য',
      matchScore: 'ম্যাচ স্কোর',
      seasonSsi: 'মরসুম উপযোগীতা (SSI)',
      underrated: 'অপ্রচলিত (অফবিট)',
      budgetTier: 'বাজেট স্তর',
      tierPrefix: 'স্তর',
      curatedItineraryTitle: 'পরিকল্পিত ভ্রমণসূচি',
      synthesizedByGemma: 'স্থানীয় Gemma 2B দ্বারা প্রস্তুত',
      allDays: 'সব দিন',
      timeSlotsBadge: 'সকাল • দুপুর • সন্ধ্যা',
      generateCustomItinerary: 'Gemma AI দিয়ে কাস্টম ভ্রমণসূচি তৈরি করুন',
      gemmaDescription: 'স্থানীয়ভাবে হোস্ট করা Gemma 2B মডেল চালিয়ে সময়ভিত্তিক সকাল, দুপুর এবং সন্ধ্যার কাস্টম পরিকল্পনা তৈরি করুন।',
      synthesizePlanCta: 'এআই পরিকল্পনা তৈরি করুন',
      synthesizingWithGemma: 'Gemma AI দিয়ে প্রস্তুত হচ্ছে...',
      highlights: 'বিশেষ আকর্ষণ',
      curatedActivities: 'নির্বাচিত ক্রিয়াকলাপ',
      district: 'জেলা',
      vibe: 'পরিবেশ',
      comfort: 'স্বাচ্ছন্দ্য',
      verifiedAddressNav: 'যাচাইকৃত ঠিকানা ও নেভিগেশন',
      verifiedGeodata: 'যাচাইকৃত ভৌগোলিক তথ্য',
      address: 'যাচাইকৃত ঠিকানা',
      coordinates: 'জিপিএস স্থানাঙ্ক',
      coordsUnavailable: 'স্থানের স্থানাঙ্ক পাওয়া যায়নি',
      distanceFromLoc: 'আপনার অবস্থান থেকে দূরত্ব',
      fromYourLocation: 'আপনার অবস্থান থেকে',
      fromOrigin: 'উৎপত্তিস্থল থেকে',
      liveDistUnavailable: 'অবস্থানের অনুমতি পেলে লাইভ দূরত্ব দেখা যাবে',
      detectingLocation: 'লাইভ অবস্থান শনাক্ত করা হচ্ছে...',
      locationDenied: 'অবস্থানের অনুমতি মেলেনি',
      locationNotEnabled: 'অবস্থান চালু নেই',
      enableLocation: 'অবস্থান চালু করুন',
      detectingBtn: 'শনাক্ত করা হচ্ছে...',
      howToReach: 'কীভাবে পৌঁছাবেন',
      openDirectionsSub: 'সেরা রুটের জন্য দিকনির্দেশনা দেখুন',
      viewPin: 'পিন দেখুন',
      save: 'সংরক্ষণ',
      saved: 'সংরক্ষিত',
      back: 'ফিরে যান',
      activities: 'ক্রিয়াকলাপ',
      morning: 'সকাল',
      afternoon: 'দুপুর',
      evening: 'সন্ধ্যা',
      dnaMatch: 'ডিএনএ ম্যাচ',
      duration: 'সময়কাল',
      realBudget: 'দৈনিক বাজেট',
      tranquility: 'প্রশান্তি',
      offbeat: 'অফবিট',
      crowdIndex: 'ভিড়ের মাত্রা (CPI)',
      aiSynthesisTitle: 'Gemma AI ও DETOURA বিশ্লেষণ',
      viewRecommendationsBtn: 'সুপারিশসমূহ দেখুন',
      directionsUnavailable: 'দিকনির্দেশনা পাওয়া যায়নি',
      enableLocationForDirections: 'দিকনির্দেশনার জন্য লোকেশন চালু করুন',
    },
    profile: {
      heading: 'ভ্রমণকারী প্রোফাইল',
      activeSession: 'সক্রিয় সেশন',
      savedTripsCount: 'সংরক্ষিত ট্রিপ',
      kmMapped: 'কিমি দূরত্ব ম্যাপ করা হয়েছে',
      aiAlignment: 'এআই সাদৃশ্য',
      travelDnaSummary: 'ট্রাভেল ডিএনএ প্রোফাইল',
      editDna: 'ডিএনএ সম্পাদনা করুন',
      mySavedTrips: 'আমার সংরক্ষিত ট্রিপসমূহ',
      loadingTrips: 'ফায়ারস্টোর থেকে ট্রিপ লোড হচ্ছে...',
      noTripsTitle: 'এখনও কোনো ট্রিপ সংরক্ষিত হয়নি',
      noTripsDesc: 'পরামর্শসমূহ দেখুন এবং আপনার পছন্দের অফবিট স্থানগুলো সংগ্রহে রাখতে "সংরক্ষণ করুন" চাপুন।',
      discoverDetours: 'অফবিট গন্তব্য খুঁজুন',
      removeSaved: 'মুছুন',
      viewItinerary: 'ভ্রমণসূচি দেখুন',
      languageSettings: 'ভাষা ও স্থানীয়করণ',
      languageSubtitle: 'আপনার পছন্দের ইন্টারফেস ও বর্ণনার ভাষা নির্বাচন করুন',
      verifiedTraveler: 'যাচাইকৃত ভ্রমণকারী',
    },
    placeTypes: {
      mountains: 'পাহাড় ও পর্বতমালা',
      coast: 'সমুদ্র ও উপকূল',
      beaches: 'সমুদ্র সৈকত',
      forests: 'অরণ্য ও জঙ্গল',
      waterfalls: 'জলপ্রপাত',
      wildlife: 'বন্যপ্রাণী অভয়ারণ্য',
      rivers_lakes: 'নদী ও হ্রদ',
      heritage: 'ঐতিহাসিক ও প্রত্নতাত্ত্বিক',
      spiritual: 'আধ্যাত্মিক স্থান',
      countryside: 'গ্রামবাংলা ও প্রান্তর',
      tea_gardens: 'চা বাগান',
      islands: 'দ্বীপ',
    },
    months: {
      1: 'জানুয়ারি',
      2: 'ফেব্রুয়ারি',
      3: 'মার্চ',
      4: 'এপ্রিল',
      5: 'মে',
      6: 'জুন',
      7: 'জুলাই',
      8: 'আগস্ট',
      9: 'সেপ্টেম্বর',
      10: 'অক্টোবর',
      11: 'নভেম্বর',
      12: 'ডিসেম্বর',
    },
    chatbot: {
      floatingButton: '✦ ডিটৌরাকে জিজ্ঞাসা করুন',
      title: 'ডিটৌরা এআই',
      subtitle: 'স্থানীয় জেমা ২বি ইন্টেলিজেন্স',
      currentDestination: 'বর্তমান গন্তব্য',
      inputPlaceholder: 'কার্যকলাপ, ভ্রমণ পরিকল্পনা, দূরত্ব সম্পর্কে জিজ্ঞাসা করুন...',
      send: 'পাঠান',
      close: 'বন্ধ করুন',
      thinking: 'জেমা চিন্তা করছে...',
      quickPromptsTitle: 'প্রস্তাবিত প্রশ্নাবলী',
      quickPromptActivities: 'আমি এখানে কী করতে পারি?',
      quickPromptItinerary: 'ভ্রমণ পরিকল্পনা দেখান',
      quickPromptDistance: 'এই গন্তব্যটি কত দূরে?',
      welcomeMessage: 'নমস্কার! আমি স্থানীয় জেমা ২বি চালিত আপনার ডিটৌরা ভ্রমণ সহকারী। গন্তব্যের কার্যকলাপ, ভ্রমণ পরিকল্পনা বা যাচাইকৃত দূরত্ব সম্পর্কে যেকোনো প্রশ্ন করুন।',
      disclaimer: 'উত্তরগুলি সম্পূর্ণ যাচাইকৃত আঞ্চলিক তথ্যের ওপর প্রতিষ্ঠিত। হোটেল ও ট্রাফিক খরচ অনুমান করা হয় না।',
    },
  },
};

/**
 * Safely look up translation by dot-path. Returns English fallback or the path itself if key missing.
 */
export function translate(lang: Language, keyPath: string, fallback?: string): string {
  const parts = keyPath.split('.');
  let current: any = translations[lang] || translations.en;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to English
      let fallbackCurrent: any = translations.en;
      for (const fbPart of parts) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && fbPart in fallbackCurrent) {
          fallbackCurrent = fallbackCurrent[fbPart];
        } else {
          return fallback || keyPath;
        }
      }
      return typeof fallbackCurrent === 'string' ? fallbackCurrent : fallback || keyPath;
    }
  }
  return typeof current === 'string' ? current : fallback || keyPath;
}
