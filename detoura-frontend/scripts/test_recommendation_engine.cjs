const fs = require('fs');
const path = require('path');

// Load real destinations catalog
const catalogPath = path.join(__dirname, '..', 'src', 'data', 'destinations.json');
const destinations = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

console.log(`Loaded ${destinations.length} destinations from ${catalogPath}`);

function calculateCosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0.0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateModel2Score(dest, userPrefs, weights, month = 10, placeTypes = []) {
  const destVector = [
    typeof dest.nature === 'number' ? dest.nature : 0.5,
    typeof dest.adventure === 'number' ? dest.adventure : 0.5,
    typeof dest.culture === 'number' ? dest.culture : 0.5,
    typeof dest.relaxation === 'number' ? dest.relaxation : 0.5
  ];

  const userVector = [
    typeof userPrefs.nature === 'number' ? userPrefs.nature : 0.5,
    typeof userPrefs.adventure === 'number' ? userPrefs.adventure : 0.5,
    typeof userPrefs.culture === 'number' ? userPrefs.culture : 0.5,
    typeof userPrefs.relaxation === 'number' ? userPrefs.relaxation : 0.5
  ];

  const sim = calculateCosineSimilarity(userVector, destVector);
  const ssi = dest.monthly_ssi ? (dest.monthly_ssi[month - 1] ?? 1.0) : (dest.ssi ?? 1.0);
  const cpi = dest.crowd_pressure_index ?? 0.5;
  const gem = dest.underrated_score ?? 0.5;

  const w_sim = weights.w_sim ?? 1.0;
  const w_season = weights.w_season ?? 1.0;
  const w_crowd = weights.w_crowd ?? 1.0;
  const w_gem = weights.w_gem ?? 1.0;

  let rawScore = (w_sim * sim) + (w_season * ssi) - (w_crowd * cpi) + (w_gem * gem);

  // Landscape bonus
  if (Array.isArray(placeTypes) && placeTypes.length > 0 && dest.place_type) {
    if (placeTypes.includes(dest.place_type)) {
      rawScore += 0.05;
    }
  }

  return {
    score: rawScore,
    sim,
    ssi,
    cpi,
    gem
  };
}

function runProfile(name, userPrefs, weights, month, budgetTier) {
  let filtered = destinations;
  if (budgetTier !== undefined && budgetTier !== 'all') {
    filtered = filtered.filter(d => String(d.budget_tier) === String(budgetTier));
  }

  const scored = filtered.map(d => {
    const res = calculateModel2Score(d, userPrefs, weights, month);
    return {
      destination_id: d.destination_id,
      name: d.name,
      district: d.district,
      category: d.category,
      budget_tier: d.budget_tier,
      ...res
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10);
}

// PROFILE A: High nature/serenity, low culture
const profileA = {
  name: 'PROFILE A (High Nature & Serenity, Low Culture)',
  prefs: { nature: 0.95, relaxation: 0.95, culture: 0.10, adventure: 0.30 },
  weights: { w_sim: 1.0, w_season: 1.0, w_crowd: 1.0, w_gem: 1.0 },
  month: 10
};

// PROFILE B: High culture/food, lower nature
const profileB = {
  name: 'PROFILE B (High Culture & Heritage, Low Nature)',
  prefs: { nature: 0.20, relaxation: 0.50, culture: 0.95, adventure: 0.80 },
  weights: { w_sim: 1.0, w_season: 1.0, w_crowd: 1.0, w_gem: 1.0 },
  month: 10
};

// PROFILE C: High adventure, lower tranquility, budget tier 1
const profileC = {
  name: 'PROFILE C (High Adventure, Low Serenity, Budget Tier 1)',
  prefs: { nature: 0.70, relaxation: 0.20, culture: 0.30, adventure: 0.95 },
  weights: { w_sim: 1.0, w_season: 1.0, w_crowd: 1.0, w_gem: 1.0 },
  month: 10,
  budgetTier: '1'
};

console.log('\n==================================================');
console.log('TEST SCORE DIFFERENTIATION: 3 CONTRASTING PROFILES');
console.log('==================================================');

const resultsA = runProfile(profileA.name, profileA.prefs, profileA.weights, profileA.month);
const resultsB = runProfile(profileB.name, profileB.prefs, profileB.weights, profileB.month);
const resultsC = runProfile(profileC.name, profileC.prefs, profileC.weights, profileC.month, profileC.budgetTier);

function printTable(title, list) {
  console.log(`\n--- ${title} ---`);
  console.log('Rank | ID         | Name                           | Score  | Sim    | SSI   | CPI   | AUS');
  console.log('-----+------------+--------------------------------+--------+--------+-------+-------+------');
  list.forEach((r, idx) => {
    const padName = r.name.padEnd(30).slice(0, 30);
    console.log(
      `#${String(idx + 1).padStart(2, ' ')}  | ${r.destination_id} | ${padName} | ${r.score.toFixed(4)} | ${r.sim.toFixed(4)} | ${r.ssi.toFixed(3)} | ${r.cpi.toFixed(3)} | ${r.gem.toFixed(3)}`
    );
  });
}

printTable(profileA.name, resultsA);
printTable(profileB.name, resultsB);
printTable(profileC.name, resultsC);

// Verifications
console.log('\n==================================================');
console.log('ASSERTION CHECKS');
console.log('==================================================');

const topA = resultsA[0];
const topB = resultsB[0];
const topC = resultsC[0];

console.log(`Profile A Top #1: ${topA.destination_id} (${topA.name}) - Score: ${topA.score.toFixed(4)}`);
console.log(`Profile B Top #1: ${topB.destination_id} (${topB.name}) - Score: ${topB.score.toFixed(4)}`);
console.log(`Profile C Top #1: ${topC.destination_id} (${topC.name}) - Score: ${topC.score.toFixed(4)}`);

if (topA.destination_id !== topB.destination_id) {
  console.log('✅ PASS: Profile A and Profile B have different #1 destinations');
} else {
  console.error('❌ FAIL: Profile A and Profile B have identical #1 destination');
  process.exit(1);
}

if (topA.destination_id !== topC.destination_id) {
  console.log('✅ PASS: Profile A and Profile C have different #1 destinations');
} else {
  console.error('❌ FAIL: Profile A and Profile C have identical #1 destination');
  process.exit(1);
}

// Verify monotonic sorting
for (const [pName, res] of [['A', resultsA], ['B', resultsB], ['C', resultsC]]) {
  for (let i = 0; i < res.length - 1; i++) {
    if (res[i].score < res[i + 1].score) {
      console.error(`❌ FAIL: Profile ${pName} is not sorted descending at index ${i}`);
      process.exit(1);
    }
  }
  console.log(`✅ PASS: Profile ${pName} results are monotonically descending by score`);
}

// Verify no duplicate IDs in top 10
for (const [pName, res] of [['A', resultsA], ['B', resultsB], ['C', resultsC]]) {
  const ids = res.map(r => r.destination_id);
  const unique = new Set(ids);
  if (ids.length !== unique.size) {
    console.error(`❌ FAIL: Profile ${pName} contains duplicate destination IDs`);
    process.exit(1);
  }
  console.log(`✅ PASS: Profile ${pName} has 10 distinct, unique destination IDs`);
}

// Verify budget constraint in Profile C
const nonTier1 = resultsC.filter(r => String(r.budget_tier) !== '1');
if (nonTier1.length === 0) {
  console.log('✅ PASS: Profile C strictly respects budget tier 1 constraint');
} else {
  console.error(`❌ FAIL: Profile C contains non-tier-1 destinations: ${nonTier1.length}`);
  process.exit(1);
}

console.log('\nAll recommendation engine tests PASSED successfully!');
