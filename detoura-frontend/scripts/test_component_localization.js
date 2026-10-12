import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  translations,
  localizeDestinationName,
  localizeRegion,
  localizeCategory,
  formatAddress,
  formatPricePerDay,
  formatDuration,
  formatDestinationDescription,
  translate
} from '../src/i18n/translations.ts';

console.log('====================================================');
console.log('🧪 DETOURA COMPONENT-LEVEL LOCALIZATION REGRESSION SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failCount++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    passCount++;
  }
}

// ----------------------------------------------------
// Mock Components Simulating Actual Application Pages
// ----------------------------------------------------

// 1. Recommendation Card Component (exact logic from Recommendations.tsx)
function RecommendationCard({ rec, lang }) {
  const locCategory = localizeCategory(rec.category, lang);
  const locName = localizeDestinationName(rec.name, lang);
  const locAddress = formatAddress(rec.name, rec.district, rec.address, lang);
  const locDesc = formatDestinationDescription(rec, lang);
  const priceLabel = formatPricePerDay(rec.estimated_daily_inr, lang);
  const saveLabel = translate(lang, 'common.save');
  const viewPinLabel = translate(lang, 'explore.viewPin');

  return React.createElement(
    'div',
    { className: 'recommendation-card', 'data-lang': lang },
    React.createElement('span', { className: 'category-badge' }, locCategory),
    React.createElement('h3', { className: 'destination-title' }, locName),
    React.createElement('span', { className: 'price-label' }, priceLabel),
    React.createElement('div', { className: 'address-field' }, locAddress),
    React.createElement('p', { className: 'description-field' }, locDesc),
    React.createElement('button', { className: 'btn-pin' }, viewPinLabel),
    React.createElement('button', { className: 'btn-save' }, saveLabel)
  );
}

// 2. Saved Trip Card Component (exact logic from Profile.tsx)
function SavedTripCard({ trip, lang }) {
  const locRegion = localizeRegion(trip.district, lang);
  const locCategory = localizeCategory(trip.category, lang);
  const locName = localizeDestinationName(trip.name, lang);
  const locDuration = formatDuration(trip.recommended_duration_days || 2, lang);
  const locPrice = formatPricePerDay(trip.estimated_daily_inr || 2000, lang);
  const viewItineraryLabel = translate(lang, 'profile.viewItinerary');
  const removeLabel = translate(lang, 'profile.removeSaved');

  return React.createElement(
    'div',
    { className: 'saved-trip-card' },
    React.createElement('span', { className: 'meta-badge' }, `${locRegion} • ${locCategory}`),
    React.createElement('h3', { className: 'trip-title' }, locName),
    React.createElement('span', { className: 'duration-field' }, locDuration),
    React.createElement('span', { className: 'price-field' }, locPrice),
    React.createElement('button', { className: 'btn-itinerary' }, viewItineraryLabel),
    React.createElement('button', { className: 'btn-remove' }, removeLabel)
  );
}

// 3. Destination Detail Hero & Highlights (exact logic from DestinationDetail.tsx)
function DestinationDetailView({ dest, lang }) {
  const locName = localizeDestinationName(dest.name, lang);
  const locAddress = formatAddress(dest.name, dest.district, dest.address, lang);
  const locCategory = localizeCategory(dest.category, lang);
  const locDesc = formatDestinationDescription(dest, lang);
  const durationLabel = formatDuration(dest.recommended_duration_days || 3, lang);
  const itineraryTitle = translate(lang, 'destinationDetail.curatedItineraryTitle');
  const highlightsHeading = translate(lang, 'destinationDetail.highlights');

  // Render highlights
  const highlights = (dest.highlights || []).map((h, i) => {
    let localizedHighlight = h;
    if (h.startsWith('District:') || h.startsWith('জেলা:') || h.startsWith('ज़िला:')) {
      const distVal = h.replace(/^(District:|জেলা:|ज़िला:)/, '').trim();
      localizedHighlight = `${translate(lang, 'destinationDetail.district')}: ${localizeRegion(distVal, lang)}`;
    } else if (h.startsWith('Vibe:') || h.startsWith('ধরণ:') || h.startsWith('श्रेणी:')) {
      const vibeVal = h.replace(/^(Vibe:|ধরণ:|श्रेणी:)/, '').trim();
      localizedHighlight = `${translate(lang, 'destinationDetail.vibe')}: ${localizeCategory(vibeVal, lang)}`;
    }
    return React.createElement('li', { key: i }, localizedHighlight);
  });

  return React.createElement(
    'div',
    { className: 'destination-detail' },
    React.createElement('h1', { className: 'detail-title' }, locName),
    React.createElement('div', { className: 'detail-address' }, locAddress),
    React.createElement('span', { className: 'detail-category' }, locCategory),
    React.createElement('p', { className: 'detail-narrative' }, locDesc),
    React.createElement('h2', { className: 'itinerary-heading' }, `${durationLabel} • ${itineraryTitle}`),
    React.createElement('h3', { className: 'highlights-heading' }, highlightsHeading),
    React.createElement('ul', { className: 'highlights-list' }, highlights)
  );
}

// 4. Ask Detoura Fallback Message (exact logic from AskDetouraDrawer.tsx)
function getAskDetouraFallbackMessage(currentDest, lang) {
  if (currentDest) {
    const locName = localizeDestinationName(currentDest.name, lang);
    const locDist = localizeRegion(currentDest.district, lang);
    if (lang === 'bn') {
      return `${locName} পশ্চিমবঙ্গের ${locDist} জেলায় অবস্থিত একটি অফবিট গন্তব্য। আপনার ট্রাভেল ডিএনএ-র সাথে এর শান্ত প্রাকৃতিক পরিবেশ চমৎকারভাবে মেলে।`;
    } else if (lang === 'hi') {
      return `${locName} पश्चिम बंगाल के ${locDist} ज़िले में स्थित है। यह एक सुंदर और शांत ऑफबीट स्थल है।`;
    } else {
      return `${currentDest.name} is a verified offbeat destination in ${currentDest.district || 'West Bengal'}, West Bengal, calibrated for low crowds and authentic experiences.`;
    }
  } else {
    if (lang === 'bn') {
      return 'দুঃখিত, সংযোগ স্থাপন করতে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
    } else if (lang === 'hi') {
      return 'क्षमा करें, कनेक्शन में अस्थायी समस्या आई है। कृपया पुनः प्रयास करें।';
    }
    return 'Sorry, I encountered an issue retrieving an answer. Please try again.';
  }
}

// ----------------------------------------------------
// TEST SUITE EXECUTION
// ----------------------------------------------------

async function runTests() {
  const testDestinations = [
    {
      destination_id: 'WB_KLP_001',
      name: 'Lolegaon Heritage Garden',
      district: 'Kalimpong',
      category: 'Heritage',
      estimated_daily_inr: 2500,
      recommended_duration_days: 2,
      highlights: ['District: Kalimpong', 'Vibe: Heritage', 'Moderate Comfort'],
      description: 'Lolegaon in Kalimpong offers a calibrated offbeat detour with high scenic value and low crowd congestion.'
    },
    {
      destination_id: 'WB_APD_005',
      name: 'Buxa Fort Terracotta Complex',
      district: 'Alipurduar',
      category: 'Heritage',
      estimated_daily_inr: 2200,
      recommended_duration_days: 3,
      highlights: ['District: Alipurduar', 'Vibe: Heritage', 'Budget Friendly'],
      description: 'Calibrated offbeat destination in Alipurduar.'
    },
    {
      destination_id: 'WB_DAR_010',
      name: 'Kolakham National Park Range',
      district: 'Kalimpong',
      category: 'Forest/Wildlife',
      estimated_daily_inr: 2800,
      recommended_duration_days: 3,
      highlights: ['District: Kalimpong', 'Vibe: Forest/Wildlife', 'Comfortable Stay'],
      description: 'Serene forest retreat with Himalayan panoramic views.'
    }
  ];

  // ====================================================
  // TEST 1: Recommendation Cards Rendering (EN, HI, BN)
  // ====================================================
  console.log('\n--- 1. Testing Recommendation Cards Rendering ---');
  for (const dest of testDestinations) {
    // EN
    const enHtml = renderToString(React.createElement(RecommendationCard, { rec: dest, lang: 'en' }));
    assert(enHtml.includes(dest.name), `EN card contains English title: "${dest.name}"`);
    assert(enHtml.includes('Save'), `EN card contains "Save" button`);
    assert(enHtml.includes('/ day'), `EN card contains "/ day"`);

    // HI
    const hiHtml = renderToString(React.createElement(RecommendationCard, { rec: dest, lang: 'hi' }));
    assert(/[\u0900-\u097F]/.test(hiHtml), `HI card renders Devanagari text`);
    assert(!hiHtml.includes(`>${dest.name}<`), `HI card does NOT render raw English title: "${dest.name}"`);
    assert(hiHtml.includes('सहेजें') || hiHtml.includes('सेव करें') || hiHtml.includes('सहेजा गया'), `HI card contains localized save button`);
    assert(hiHtml.includes(' / दिन'), `HI card contains " / दिन"`);
    // Ensure no unlocalized English words leak into the title
    const hiTitleMatch = hiHtml.match(/<h3 class="destination-title">([^<]+)<\/h3>/);
    assert(hiTitleMatch && /[\u0900-\u097F]/.test(hiTitleMatch[1]), `HI title is authentically localized: "${hiTitleMatch?.[1]}"`);

    // BN
    const bnHtml = renderToString(React.createElement(RecommendationCard, { rec: dest, lang: 'bn' }));
    assert(/[\u0980-\u09FF]/.test(bnHtml), `BN card renders Bengali text`);
    assert(!bnHtml.includes(`>${dest.name}<`), `BN card does NOT render raw English title: "${dest.name}"`);
    assert(bnHtml.includes('সংরক্ষণ'), `BN card contains localized save button`);
    assert(bnHtml.includes(' / দিন'), `BN card contains " / দিন"`);
    const bnTitleMatch = bnHtml.match(/<h3 class="destination-title">([^<]+)<\/h3>/);
    assert(bnTitleMatch && /[\u0980-\u09FF]/.test(bnTitleMatch[1]), `BN title is authentically localized: "${bnTitleMatch?.[1]}"`);
  }

  // ====================================================
  // TEST 2: Saved Trip Cards Rendering (EN, HI, BN)
  // ====================================================
  console.log('\n--- 2. Testing Saved-Trip Cards Rendering ---');
  for (const trip of testDestinations) {
    // HI
    const hiTripHtml = renderToString(React.createElement(SavedTripCard, { trip, lang: 'hi' }));
    assert(/[\u0900-\u097F]/.test(hiTripHtml), `HI saved trip card renders Devanagari text`);
    assert(!hiTripHtml.includes(`>${trip.name}<`), `HI saved trip does NOT have raw English title`);
    assert(hiTripHtml.includes('दिन'), `HI saved trip formats duration in Hindi`);
    assert(hiTripHtml.includes('यात्रा कार्यक्रम देखें'), `HI saved trip has "यात्रा कार्यक्रम देखें"`);
    assert(hiTripHtml.includes('हटाएं'), `HI saved trip has "हटाएं"`);

    // BN
    const bnTripHtml = renderToString(React.createElement(SavedTripCard, { trip, lang: 'bn' }));
    assert(/[\u0980-\u09FF]/.test(bnTripHtml), `BN saved trip card renders Bengali text`);
    assert(!bnTripHtml.includes(`>${trip.name}<`), `BN saved trip does NOT have raw English title`);
    assert(bnTripHtml.includes('দিন'), `BN saved trip formats duration in Bengali`);
    assert(bnTripHtml.includes('ভ্রমণসূচি দেখুন'), `BN saved trip has "ভ্রমণসূচি দেখুন"`);
    assert(bnTripHtml.includes('মুছুন'), `BN saved trip has "মুছুন"`);
  }

  // ====================================================
  // TEST 3: Destination Detail Rendering (EN, HI, BN)
  // ====================================================
  console.log('\n--- 3. Testing Destination Detail View ---');
  for (const dest of testDestinations) {
    // HI
    const hiDetailHtml = renderToString(React.createElement(DestinationDetailView, { dest, lang: 'hi' }));
    assert(hiDetailHtml.includes('पश्चिम बंगाल'), `HI detail contains state name in Hindi: "पश्चिम बंगाल"`);
    assert(!hiDetailHtml.includes(`>${dest.name}<`), `HI detail does NOT contain raw English title`);
    assert(hiDetailHtml.includes('क्यूरेटेड यात्रा कार्यक्रम'), `HI detail contains "क्यूरेटेड यात्रा कार्यक्रम"`);
    assert(hiDetailHtml.includes('ज़िला:'), `HI detail contains localized highlight label "ज़िला:"`);

    // BN
    const bnDetailHtml = renderToString(React.createElement(DestinationDetailView, { dest, lang: 'bn' }));
    assert(bnDetailHtml.includes('পশ্চিমবঙ্গ'), `BN detail contains state name in Bengali: "পশ্চিমবঙ্গ"`);
    assert(!bnDetailHtml.includes(`>${dest.name}<`), `BN detail does NOT contain raw English title`);
    assert(bnDetailHtml.includes('পরিকল্পিত ভ্রমণসূচি'), `BN detail contains "পরিকল্পিত ভ্রমণসূচি"`);
    assert(bnDetailHtml.includes('জেলা:'), `BN detail contains localized highlight label "জেলা:"`);
  }

  // ====================================================
  // TEST 4: Ask Detoura Fallback Messages (EN, HI, BN)
  // ====================================================
  console.log('\n--- 4. Testing Ask Detoura Fallback Messages ---');
  const sampleDest = testDestinations[0];
  const enMsg = getAskDetouraFallbackMessage(sampleDest, 'en');
  const hiMsg = getAskDetouraFallbackMessage(sampleDest, 'hi');
  const bnMsg = getAskDetouraFallbackMessage(sampleDest, 'bn');

  assert(enMsg.includes('Lolegaon Heritage Garden') && enMsg.includes('Kalimpong'), 'EN fallback message is accurate');
  assert(hiMsg.includes('लोलेगांव हेरिटेज गार्डन') && hiMsg.includes('कालिम्पोंग') && /[\u0900-\u097F]/.test(hiMsg), 'HI fallback message contains Hindi destination & district');
  assert(!hiMsg.includes('Lolegaon'), 'HI fallback message has ZERO English destination name leakage');
  assert(bnMsg.includes('লোলেগাঁও হেরিটেজ গার্ডেন') && bnMsg.includes('কালিম্পং') && /[\u0980-\u09FF]/.test(bnMsg), 'BN fallback message contains Bengali destination & district');
  assert(!bnMsg.includes('Lolegaon'), 'BN fallback message has ZERO English destination name leakage');

  // Generic offline fallback
  const hiOffline = getAskDetouraFallbackMessage(null, 'hi');
  const bnOffline = getAskDetouraFallbackMessage(null, 'bn');
  assert(hiOffline.includes('क्षमा करें') && /[\u0900-\u097F]/.test(hiOffline), 'HI offline message is in authentic Hindi');
  assert(bnOffline.includes('দুঃখিত') && /[\u0980-\u09FF]/.test(bnOffline), 'BN offline message is in authentic Bengali');

  // ====================================================
  // TEST 5: Language Switching & State Transitions
  // ====================================================
  console.log('\n--- 5. Testing Language Transitions (EN → HI → BN → EN) ---');
  let currentLanguage = 'en';
  const recState = { ...testDestinations[1] };

  // 1. Initial EN
  let rendered = renderToString(React.createElement(RecommendationCard, { rec: recState, lang: currentLanguage }));
  assert(rendered.includes('Buxa Fort Terracotta Complex'), 'State 1 (EN): Renders English');

  // 2. Switch to HI
  currentLanguage = 'hi';
  rendered = renderToString(React.createElement(RecommendationCard, { rec: recState, lang: currentLanguage }));
  assert(rendered.includes('बक्सा किला टेराकोटा परिसर'), 'State 2 (HI): Renders authentic Devanagari title');
  assert(rendered.includes('अलीपुरद्वार'), 'State 2 (HI): Renders authentic Devanagari district');
  assert(!rendered.includes('Buxa Fort'), 'State 2 (HI): Zero English residue');

  // 3. Switch to BN
  currentLanguage = 'bn';
  rendered = renderToString(React.createElement(RecommendationCard, { rec: recState, lang: currentLanguage }));
  assert(rendered.includes('বক্সা দুর্গ টেরাকোটা চত্বর'), 'State 3 (BN): Renders authentic Bengali title');
  assert(rendered.includes('আলিপুরদুয়ার'), 'State 3 (BN): Renders authentic Bengali district');
  assert(!rendered.includes('Buxa Fort'), 'State 3 (BN): Zero English residue');
  assert(!rendered.includes('बक्सा किला'), 'State 3 (BN): Zero Hindi residue');

  // 4. Switch back to EN
  currentLanguage = 'en';
  rendered = renderToString(React.createElement(RecommendationCard, { rec: recState, lang: currentLanguage }));
  assert(rendered.includes('Buxa Fort Terracotta Complex'), 'State 4 (EN): Restores English cleanly');
  assert(!/[\u0900-\u097F\u0980-\u09FF]/.test(rendered), 'State 4 (EN): Zero Devanagari or Bengali residue');

  // ====================================================
  // TEST 6: Simulated Refresh Behavior with HI & BN active
  // ====================================================
  console.log('\n--- 6. Testing Refresh Behavior with Persisted Language ---');
  // Scenario: Page was refreshed with 'hi' stored in localStorage
  const persistedLangHi = 'hi';
  const refreshedHiHtml = renderToString(React.createElement(RecommendationCard, { rec: testDestinations[2], lang: persistedLangHi }));
  assert(refreshedHiHtml.includes('कोलाखम राष्ट्रीय उद्यान रेंज'), 'Refreshed HI renders Devanagari title without delay');
  assert(refreshedHiHtml.includes('कालिम्पोंग'), 'Refreshed HI renders Devanagari district without delay');

  // Scenario: Page was refreshed with 'bn' stored in localStorage
  const persistedLangBn = 'bn';
  const refreshedBnHtml = renderToString(React.createElement(RecommendationCard, { rec: testDestinations[2], lang: persistedLangBn }));
  assert(refreshedBnHtml.includes('কোলাখাম জাতীয় উদ্যান রেঞ্জ'), 'Refreshed BN renders Bengali title without delay');
  assert(refreshedBnHtml.includes('কালিম্পং'), 'Refreshed BN renders Bengali district without delay');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passCount} COMPONENT REGRESSION TESTS PASSED!`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
