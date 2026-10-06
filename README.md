# DETOURA — Regional Travel Intelligence Platform
### Hackspire 26 • Squad Brainware

DETOURA is an AI-powered regional travel discovery platform for West Bengal. It counters overtourism by steering travelers toward tranquil, hidden-gem destinations matched mathematically to their personal **Travel DNA**, and leverages a locally hosted **Google Gemma 2B** language model to synthesize tailored, time-slotted multi-day itineraries and curated activities.

---

## System Architecture Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USER / CLIENT BROWSER                         │
│   • Sets Travel DNA sliders (Nature, Relaxation, Culture, Adventure)  │
│   • Selects Month/Season (Dynamic Climate Matrix)                      │
│   • Selects Trip Duration (2, 3, 4, or 5 Days)                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP POST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite + TS)                      │
│   • Interactive Leaflet West Bengal Map                                │
│   • Real-Time Dynamic Budget Filters & Tier Presets                    │
│   • Gemma Generative Intelligence Showcase Card                        │
│   • Multi-Day Morning / Afternoon / Evening Timeline                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ POST /api/recommendations
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI Microservice)                   │
├───────────────────────────────────┬────────────────────────────────────┤
│  STAGE 1: MATHEMATICAL RANKING    │  STAGE 2: GENERATIVE INTELLIGENCE  │
│  • Cosine Similarity Matrix       │  • Local Gemma 2B GGUF Model       │
│  • Real-Time Climate SSI (12-mo)  │  • llama-cpp-python Runtime        │
│  • Crowd Pressure Index (CPI)     │  • Contextual Activity Alignment   │
│  • Underrated / Hidden Gem Score  │  • Multi-Day DayPlan Itinerary     │
│  • Budget & Category Filters      │  • JSON Repair & Sanitization      │
└───────────────────────────────────┴────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      STANDARDIZED JSON PAYLOAD                         │
│  Contract matches detoura_model3_frontend_payload.json benchmark:      │
│  { destination, destination_intelligence, traveler, activities,        │
│    itinerary: { Day 1: {morning, afternoon, evening}, ... },           │
│    explanation, recommendations: [...] }                               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Key Highlights

1. **Gemma 2B Generative AI**:
   - Runs **100% locally** via `llama-cpp-python` with quantized `Q4_K_M` GGUF weights.
   - Requires zero external proprietary cloud API keys or billable tokens.
   - Robust `json_repair` pipeline ensures valid structural JSON parsing with zero crashes.
   - Generates contextual morning/afternoon/evening itineraries and activity match scores.

2. **123 Real West Bengal Destinations**:
   - Sourced from `data/detoura_model2_recommendations.csv` and `detoura_master-v2.db`.
   - Includes real GPS coordinates, 12-month climate records (temperature and rainfall), crowd metrics, and budget tiers.

3. **Production-Ready Frontend**:
   - Modern Material Design 3 and Tailwind CSS styling.
   - Interactive West Bengal Leaflet map with synchronised marker highlights.
   - Multi-day itinerary timeline with time-slot badges and category tags.

---

## Quickstart & Run Instructions

### Prerequisites
- Python 3.12+
- Node.js v18+

### 1. Start Backend (`detoura-ml`)
```bash
cd detoura-ml
# Activate the existing virtual environment:
.\.venv312\Scripts\activate

# (First time only) Download the un-gated Gemma GGUF model (~1.7 GB):
python scripts/download_gemma.py

# Start the FastAPI server on port 8000:
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
*Health Check*: `http://127.0.0.1:8000/health`  
*API Docs*: `http://127.0.0.1:8000/docs`

### 2. Start Frontend (`detoura-frontend`)
```bash
cd detoura-frontend
# Install dependencies:
npm install

# Start Vite dev server on port 5173:
npm run dev -- --host 127.0.0.1 --port 5173
```
*App URL*: `http://localhost:5173/travel-dna`

---

## API Contract Verification

The endpoint `POST /api/recommendations` produces a payload structured strictly according to the benchmark:

```json
{
  "destination": {
    "id": "WB_DDI_009",
    "name": "Banpara Forest Deer Park",
    "district": "Dakshin Dinajpur",
    "category": "Forest/Wildlife",
    "latitude": 25.4786,
    "longitude": 88.9072
  },
  "destination_intelligence": {
    "match_score": 0.714,
    "ssi": 0.984,
    "live_cpi": 0.018,
    "underrated_score": 0.293,
    "budget_tier": 1,
    "estimated_daily_inr": 1200
  },
  "traveler": {
    "travel_style": "Nature",
    "place_preferences": ["Forest/Wildlife", "Nature"],
    "budget_level": "Medium",
    "travel_month": "October",
    "trip_days": 3
  },
  "activities": [
    { "activity": "Wildlife and nature exploration", "score": 1.0 },
    { "activity": "Nature photography", "score": 1.0 },
    { "activity": "Forest walk", "score": 0.8 }
  ],
  "itinerary": {
    "Day 1": {
      "morning": "Arrival and scenic nature walk.",
      "afternoon": "Guided deer park tour and wildlife photography.",
      "evening": "Quiet sunset watch and local culinary tasting."
    },
    "Day 2": {
      "morning": "Early birdwatching trail along forest boundary.",
      "afternoon": "Visit to nearby historical ruins and rural artisan village.",
      "evening": "Stargazing and relaxing riverside tea."
    },
    "Day 3": {
      "morning": "Morning forest canopy walk.",
      "afternoon": "Souvenir shopping for local terracotta crafts.",
      "evening": "Departure."
    }
  },
  "explanation": "Banpara Forest Deer Park in Dakshin Dinajpur offers a pristine wildlife experience with a near-perfect seasonal climate score in October and exceptionally low crowd density."
}
```

---

## Testing & Verification

Run the automated integration test suite:
```bash
cd detoura-ml
.\.venv312\Scripts\python.exe test_integration.py
```
Test covers:
- System health and Gemma model loading state
- Hybrid Model 2 + Model 3 `/api/recommendations` contract validation
- Specific `destination_id` lookup (Banpara Forest Deer Park benchmark `WB_DDI_009`)
