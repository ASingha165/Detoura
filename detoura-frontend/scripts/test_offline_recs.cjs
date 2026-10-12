const fallbackDestinations = require('../src/data/destinations.json');

function calculateCosineSimilarity4D(u, d) {
  const dot = u[0] * d[0] + u[1] * d[1] + u[2] * d[2] + u[3] * d[3];
  const magU = Math.sqrt(u[0] ** 2 + u[1] ** 2 + u[2] ** 2 + u[3] ** 2);
  const magD = Math.sqrt(d[0] ** 2 + d[1] ** 2 + d[2] ** 2 + d[3] ** 2);
  if (magU === 0 || magD === 0) return 0.5;
  return Math.max(0.0, Math.min(1.0, dot / (magU * magD)));
}

function calculateModel2SSI(temperature, rainfall) {
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

function computeOfflineRecommendations(request) {
  const rawList = fallbackDestinations;
  const w_sim = request.weights?.w_sim ?? 1.0;
  const w_season = request.weights?.w_season ?? 1.0;
  const w_crowd = request.weights?.w_crowd ?? 1.0;
  const w_gem = request.weights?.w_gem ?? 1.0;

  const userVector = [
    request.user_prefs?.nature ?? 0.85,
    request.user_prefs?.adventure ?? 0.65,
    request.user_prefs?.culture ?? 0.70,
    request.user_prefs?.relaxation ?? 0.90
  ];

  const monthIdx = request.month ? request.month - 1 : 9;

  const scored = rawList.map((dest) => {
    const destVector = [
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
    const ssi = calculateModel2SSI(temp, rain);
    const cpi = dest.crowd_pressure_index ?? dest.live_cpi ?? 0.2;
    const aus = dest.underrated_score ?? 0.5;

    const rawScore = (w_sim * sim) + (w_season * ssi) - (w_crowd * cpi) + (w_gem * aus);

    return {
      destination_id: dest.destination_id,
      name: dest.name,
      district: dest.district,
      rawScore,
      sim,
      ssi,
      cpi,
      aus,
      budget_tier: dest.budget_tier,
      estimated_daily_inr: dest.estimated_daily_inr
    };
  });

  let filtered = scored;
  if (request.budget_tier && request.budget_tier !== 'all') {
    const tierNum = parseInt(request.budget_tier);
    filtered = filtered.filter(i => i.budget_tier === tierNum);
  }

  filtered.sort((a, b) => b.rawScore - a.rawScore);
  return filtered.slice(0, 10);
}

const profiles = {
  "PROFILE A (High nature & serenity, low culture)": {
    user_prefs: { nature: 0.95, adventure: 0.30, culture: 0.10, relaxation: 0.95 },
    month: 10
  },
  "PROFILE B (High cultural heritage & food, lower nature)": {
    user_prefs: { nature: 0.20, adventure: 0.80, culture: 0.95, relaxation: 0.40 },
    month: 10
  },
  "PROFILE C (High adventure, lower tranquility, budget tier 1)": {
    user_prefs: { nature: 0.50, adventure: 0.95, culture: 0.30, relaxation: 0.20 },
    budget_tier: '1',
    month: 10
  }
};

for (const [name, req] of Object.entries(profiles)) {
  console.log(`\n=======================================================`);
  console.log(`Offline Testing ${name}`);
  console.log(`=======================================================`);
  const recs = computeOfflineRecommendations(req);
  recs.forEach((r, i) => {
    console.log(`${(i+1).toString().padStart(2)}. ${r.destination_id} | ${r.name.padEnd(35)} | ${r.district.padEnd(18)} | Score: ${r.rawScore.toFixed(4)} | Sim: ${r.sim.toFixed(4)} | SSI: ${r.ssi.toFixed(4)} | CPI: ${r.cpi.toFixed(4)} | AUS: ${r.aus.toFixed(4)}`);
  });
}
