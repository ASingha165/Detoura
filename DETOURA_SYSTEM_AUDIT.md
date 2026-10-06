# DETOURA System Audit

**Audit Date:** September 5, 2026  
**Auditor:** Senior QA Engineer & Technical Lead  
**Scope:** Full End-to-End System Health Audit (Backend, ML Pipeline, Firebase, Frontend, API Contract, Security, Performance)

---

## 1. Executive Verdict

### 🔴 NOT WORKING

The DETOURA application in its current state **cannot complete its primary user flow end-to-end**. While both the FastAPI backend (Uvicorn) and Vite frontend launch cleanly and without crash on startup, clicking "Build My Detoura" fails immediately with an HTTP 404 error because `app.py` specifies `detoura_master-v2` instead of `detoura_master-v2.db`. Consequently, the frontend catches the 404 in a silent `console.error` block and leaves the user indefinitely stuck on the Travel DNA screen without displaying recommendations. Furthermore, live Cloud Firestore access fails with a 403 Permission Denied error (API disabled in Google Cloud project `detoura-f8a96`), and the recommendation pipeline suffers from schema column mismatches that collapse CPI and SSI calculations to identical static constants across all 515 destinations.

---

## 2. System Status

| Component | Status | Evidence |
|---|---|---|
| **Backend** | ⚠️ WARN | Uvicorn starts on `127.0.0.1:8000`, `/health` returns 200, but `/recommend` fails with 404 due to database path missing `.db` extension. |
| **FastAPI** | 🟢 PASS | FastAPI 0.141.1 imports cleanly, routes registered, Pydantic schemas validate input and reject malformed requests with 422. |
| **ML Model** | ⚠️ WARN | Pipeline executes deterministically, but column name mismatches cause CPI to fallback to 0.5 and SSI to fallback to 0.5459 for all 515 destinations. |
| **Firebase** | ⚠️ WARN | Firebase Admin SDK 7.5.0 initializes locally with service account certificate for `detoura-f8a96`; health check reports connected. |
| **Firestore** | 🔴 FAIL | Live network operations fail with `403 PermissionDenied: Cloud Firestore API has not been used in project detoura-f8a96 before or it is disabled`. Frontend does not use Firebase SDK at all. |
| **Dataset** | 🟢 PASS | SQLite DB `detoura_master-v2.db` contains exactly 515 rows and 24 columns; 0 nulls; coordinates within West Bengal bounds (lat 21.51–27.20, lng 85.80–89.85). |
| **/recommend** | 🔴 FAIL | Returns `HTTP 404: Database file not found at D:\Detoura\detoura_master-v2`. Works only if path in `app.py` is corrected. |
| **Frontend** | ⚠️ WARN | Vite 8.2.2 runs on `localhost:5173`; renders Stitch-based designs; TypeScript compiles with 0 errors; but missing month selector, has hardcoded slider mappings, and Explore page is completely static. |
| **Frontend → API** | 🔴 FAIL | "Build My Detoura" button calls `http://127.0.0.1:8000/recommend`, receives 404, catches error silently, and fails to navigate to `/recommendations`. |
| **Navigation** | ⚠️ WARN | React Router routes exist for all 5 pages; but BottomNav has swapped labels (`/` is labeled "Profile", `/profile` is labeled "Trips"), and Explore has 0 links or click handlers. |
| **My Trips** | ⚠️ WARN | Add/remove trip works in local component state and persists to browser `localStorage`; however, the UI displays a false cosmetic badge stating "Firebase Auth Active • Synced to Firestore". |
| **Error Handling** | ⚠️ WARN | FastAPI handles Pydantic schema validation cleanly with 422; internal recommendation errors expose raw exception string; frontend catches errors silently with no user feedback UI. |
| **Security** | ⚠️ WARN | Unencrypted Firebase Service Account JSON key is committed in workspace without `.gitignore`; CORS allows all origins (`*`) with `allow_credentials=True`. |

---

## 3. Environment

- **Operating System:** Windows 11 (build architecture: win32_x64)
- **Python Version:** 3.12.10
- **Virtual Environment:** `d:\Detoura\detoura-ml\.venv312`
- **Backend Framework:** FastAPI 0.141.1, Starlette 1.6.0, Uvicorn 0.52.4, Pydantic 2.13.5
- **Frontend Framework:** React 19.2.8, React DOM 19.2.8, React Router DOM 7.18.3, Vite 8.2.2, Tailwind CSS 4.3.3
- **Node Version:** v24.11.0
- **Package Manager:** npm 11.6.1
- **ML / Data Libraries:** scikit-learn 1.9.0, pandas 3.0.5, numpy 2.5.2, firebase-admin 7.5.0, google-cloud-firestore 2.30.0

---

## 4. Backend Results

### Server Startup
- **Command:** `d:\Detoura\detoura-ml\.venv312\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000`
- **Startup Result:** Success (Process ID: 24732)
- **Startup Time:** 289 ms

### Endpoints Tested

| Endpoint | Method | Expected Status | Actual Status | Latency (Avg) | Observed Response |
|---|---|---|---|---|---|
| `/health` | GET | 200 | **200 OK** | 15.67 ms (warm: ~1.2 ms) | `{"status": "ok", "service": "detoura-ml"}` |
| `/health/firebase` | GET | 200 | **200 OK** | 1.30 ms | `{"status": "connected", "project_id": "detoura-f8a96", "firestore": "connected"}` |
| `/recommend` | POST | 200 | **404 Not Found** | 1.19 ms | `{"detail":"Database file not found at D:\\Detoura\\detoura_master-v2. Ensure the local prototype database is available."}` |
| `/recommend` *(simulated with `.db`)* | POST | 200 | **200 OK** | 42.83 ms | Returns list of 10 recommendation objects matching `RecommendResponse` schema |

---

## 5. Firebase Results

- **Configured Firebase Project:** `detoura-f8a96`
- **Credential Path:** `d:\Detoura\detoura-ml\credentials\detoura-f8a96-firebase-adminsdk-fbsvc-93a08f7635.json`
- **Backend Firebase SDK:** Initialized successfully in Python memory (`firebase_admin.initialize_app()`).
- **Health Check False Positive:** The `/health/firebase` endpoint only checks if `firestore.client()` is not None locally. It does not perform any remote I/O.
- **Actual Cloud Firestore Connectivity:** **FAILED**. An empirical live query (`list(db.collections())`) threw:
  ```
  PermissionDenied: 403 Cloud Firestore API has not been used in project detoura-f8a96 before or it is disabled.
  Enable it by visiting https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=detoura-f8a96
  ```
- **Frontend Firebase Integration:** **NON-EXISTENT**. No Firebase SDK (`firebase` or `@angular/fire` or `@firebase/*`) is installed in `package.json`. The profile screen's "Firebase Auth Active • Synced to Firestore" text is a hardcoded string. Trip bookmarks are stored exclusively in browser `localStorage` under the key `detoura_saved_trips`.

---

## 6. ML Model & Pipeline Results

### Dataset Verification
- **File Checked:** `d:\Detoura\detoura_master-v2.db` (Table: `destinations`)
- **Total Rows:** 515 (matches the Kaggle / validated model benchmark of 515)
- **Total Columns:** 24
- **Null Values:** 0 nulls across all columns.
- **Unique Destination IDs:** 515 unique IDs (WB_DAR_001 to WB_WBD_015).
- **Coordinate Bounds:**
  - Latitude: 21.5116° to 27.1990° N (West Bengal territory)
  - Longitude: 85.8012° to 89.8504° E (West Bengal territory)
- **Score Ranges in DB:**
  - `crowd_pressure_index` (CPI): 0.0010 to 1.0000
  - `underrated_score` (AUS): 0.1740 to 0.9500

### ML Pipeline Execution Analysis (`recommender.py`)
When executed against the 515 destinations:
1. **Cosine Similarity:**
   - Evaluated on 4 preference dimensions: `[nature, adventure, culture, relaxation]`.
   - Observed range for test query: **0.8487 to 0.9998**.
   - Deterministic and mathematically sound.
2. **Crowd Pressure Index (CPI) Disconnect:**
   - Line 123 of `recommender.py`: `base_cpi = row.get('base_cpi', 0.5)`.
   - The database column is actually named **`crowd_pressure_index`**.
   - Because `base_cpi` does not exist in the DataFrame, **`cpi_used` collapses to 0.5000 for all 515 destinations**, nullifying the crowd penalty distinction between crowded Kolkata (CPI 1.0) and uncrowded Takdah (CPI 0.21).
3. **Season Suitability Index (SSI) Disconnect:**
   - Lines 132–133 of `recommender.py`: `row.get('selected_temperature', month_temp)` and `row.get('selected_rainfall', month_rain)`.
   - The database columns are `climate_temp_c` and `climate_rain_mm` (12-element monthly arrays).
   - Because `selected_temperature` and `selected_rainfall` do not exist, the code defaults to the scalar query arguments (`month_temp=25.0`, `month_rain=60.0`).
   - Consequently, **`ssi_calculated` is identical (0.545878) for all 515 destinations**.
4. **Final DETOURA Score:**
   - Formula: `(w_sim * Sim) + (w_season * SSI) - (w_crowd * CPI) + (w_gem * AUS)`
   - Observed score range: **1.0880 to 1.8641**.
   - Ranking is 100% deterministic for identical inputs.
   - However, because CPI is fixed at 0.5 and SSI is fixed at 0.5459, the ranking is dominated solely by `Similarity + Underrated Score`.

---

## 7. API Contract & Integration Results

### Contract Audit (`/recommend`)

#### Request Schema:
```json
{
  "user_prefs": {
    "nature": 0.8,
    "adventure": 0.6,
    "culture": 0.7,
    "relaxation": 0.5
  },
  "weights": {
    "w_sim": 1.0,
    "w_season": 1.0,
    "w_crowd": 1.0,
    "w_gem": 1.0
  },
  "month_temp": 25.0,
  "month_rain": 60.0
}
```

#### Actual Live Backend Response (Unmodified):
```json
HTTP/1.1 404 Not Found
{
  "detail": "Database file not found at D:\\Detoura\\detoura_master-v2. Ensure the local prototype database is available."
}
```

#### Response When Database Path is Corrected:
Returns 10 items conforming to `RecommendResponse`:
```json
[
  {
    "destination_id": "WB_KOL_001",
    "name": "Kolkata",
    "detoura_score": 1.8640981665344272,
    "similarity_score": 0.868220572793057,
    "cpi_used": 0.5,
    "underrated_score": 0.95,
    "ssi": 0.5458775937413701
  },
  {
    "destination_id": "WB_APD_021",
    "name": "Jayanti Wildlife Range",
    "detoura_score": 1.8479679690184497,
    "similarity_score": 0.9470903752770796,
    "cpi_used": 0.5,
    "underrated_score": 0.855,
    "ssi": 0.5458775937413701
  }
]
```

### End-to-End Chain Verification
`Frontend [TravelDNA.tsx] --(POST http://127.0.0.1:8000/recommend)--> Backend [app.py] --(404 Not Found)--> Frontend [catch block: console.error] --X (Halted)`

**Chain Status:** **BROKEN at the API boundary**. The frontend cannot proceed past Step 2 of 3.

---

## 8. Frontend Results by Screen

### 1. Travel DNA (`/` - `TravelDNA.tsx`)
- **Renders:** YES (Step 2 of 3 header, 4 sliders, "Build My Detoura" button).
- **Navigation:** Broken on submission. Catches API 404 and does nothing.
- **Interactions:** Sliders update local numeric percentages.
- **Missing Controls:** **NO MONTH SELECTOR**. The design and user flow mandate selecting a travel month, but no month dropdown or picker exists in the UI.
- **Input Bug:** The sliders are labeled Nature, Quiet Serenity (relaxation), Culture, and Gastronomy (food). In `handleBuildDetoura`:
  ```ts
  adventure: nature / 100, // Hardcoded duplicate of nature!
  nature: nature / 100,
  relaxation: relax / 100,
  culture: culture / 100
  // food slider state is completely discarded!
  ```
- **Errors:** Console logs `Error: API Error: Not Found` on clicking "Build My Detoura".

### 2. Explore (`/explore` - `Explore.tsx`)
- **Renders:** YES (Top greeting "Good morning, Rahul", Topographic Navigator map SVG, category chips, weather widget).
- **Navigation:** NONE.
- **Interactions:** 0 interactive handlers. Search bar has no onChange/onSubmit; category filter chips have no onClick; map pins have no onClick; destination cards have no links.
- **API Connected:** NO. Entirely static mock content ported from Stitch HTML.
- **Real Data Shown:** NO.

### 3. AI Recommendations (`/recommendations` - `Recommendations.tsx`)
- **Renders:** YES, but displays "No recommendations yet" when array is empty.
- **When Populated:** Displays ranked destination cards with match percentage ring, style, duration, daily budget, and "View Destination & Itinerary" button.
- **Score Display Bug:** In `api.ts`:
  ```ts
  const maxPossibleScore = 40.0;
  const match_score = Math.min(Math.max(rec.detoura_score / maxPossibleScore, 0), 1);
  ```
  Because actual `detoura_score` is ~1.86, dividing by 40 produces a match score of **0.0465 (5% Match)**! Top destinations display as 5% match instead of ~90%+.
- **Mock Data Injection:** In `api.ts`, images, distance, duration, budget, travel style, and description are generated client-side using `Math.random()` and hardcoded Unsplash links.

### 4. Destination Detail (`/destination/:id` - `DestinationDetail.tsx`)
- **Renders:** YES (if navigated with an active recommendation in context; displays "Destination not found" otherwise).
- **Navigation:** Back button correctly returns to `/recommendations`.
- **Interactions:** "Bookmark Saved" button toggles trip state via `addTrip()`.
- **Real Data Shown:** Destination name and match score are passed from context; all description, images, duration, budget, and highlights are synthetic mock attributes from `api.ts`.

### 5. Profile & My Trips (`/profile` - `Profile.tsx`)
- **Renders:** YES (Rahul Sen profile banner, active trip count, saved trip cards, itinerary link, remove button).
- **Interactions:** "Remove" button removes destination from `savedTrips` and updates `localStorage`. "View Itinerary" navigates to `/destination/:id`.
- **Empty State:** Clean fallback with "No trips saved yet" and "Find a Detour" button.
- **Cosmetic Discrepancy:** Displays "Firebase Auth Active • Synced to Firestore", which is non-functional static text.

### 6. Bottom Navigation (`BottomNav.tsx`)
- **Navigation:** Functional, but labels and routes are confusingly mismatched:
  - Tab 1: "Explore" -> `/explore`
  - Tab 2: "Discover" -> `/recommendations`
  - Tab 3: "Trips" -> `/profile`
  - Tab 4: "Profile" -> `/` (which is actually the Travel DNA onboarding page!)

---

## 9. End-to-End Test Matrix

| Step | Expected | Actual | Status |
|---|---|---|---|
| **1. Open app** | Application loads at `http://localhost:5173/` | Vite serves index.html; Travel DNA onboarding renders cleanly | 🟢 **PASS** |
| **2. Enter Travel DNA** | Sliders adjust values (Nature, Adventure, Culture, Relaxation) | Sliders adjust Nature, Serenity, Culture, Gastronomy; Gastronomy discarded; Adventure auto-duplicated from Nature | ⚠️ **WARN** |
| **3. Select month** | Month picker allows selecting travel month (1–12) | **No month selector exists anywhere in the UI** | 🔴 **FAIL** |
| **4. Build My Detoura** | Frontend sends `POST http://127.0.0.1:8000/recommend` | Request sent; Backend receives request | 🟢 **PASS** |
| **5. Backend processing** | Backend reads dataset and scores recommendations | Backend halts with HTTP 404 (`detoura_master-v2` file missing `.db` extension) | 🔴 **FAIL** |
| **6. Receive recommendations** | Frontend receives recommendation list | Frontend receives HTTP 404; catches error in console; navigation blocked | 🔴 **FAIL** |
| **7. Display recommendations** | Ranked destination cards render real ML scores | Never reaches page; if forced, match percentage displays as 4%–5% due to `/ 40.0` bug; metadata is client-mocked | 🔴 **FAIL** |
| **8. Open destination detail** | Clicking card opens `/destination/:id` | Functional when state exists, but inaccessible through standard user flow | ⚠️ **WARN** |
| **9. Add to Trip** | Destination saved to user's trips | Successfully saved to React Context state and `localStorage` | 🟢 **PASS** |
| **10. My Trips** | Destination visible under My Trips in Profile | Displays saved trips with remove capability; persists across page reload | 🟢 **PASS** |

---

## 10. Performance Measurements

Timings recorded across 5 sequential requests against live local instances:

| Endpoint / Operation | HTTP Status | Minimum (ms) | Maximum (ms) | Average (ms) |
|---|---|---|---|---|
| **Backend Startup (Uvicorn)** | N/A | - | - | **289.00 ms** |
| **GET /health** | 200 OK | 1.08 ms | 73.49 ms (cold) | **15.67 ms** (warm: 1.2 ms) |
| **GET /health/firebase** | 200 OK | 1.04 ms | 1.55 ms | **1.30 ms** |
| **POST /recommend (As-Is DB Path)** | 404 Not Found | 1.04 ms | 1.58 ms | **1.19 ms** |
| **POST /recommend (With `.db` Path)** | 200 OK | 26.51 ms | 73.03 ms | **42.83 ms** |
| **Frontend Initial Load (`/`)** | 200 OK | 2.96 ms | 89.10 ms | **22.64 ms** |

---

## 11. Problems Found

### 🔴 CRITICAL

1. **Database Path Typo in `app.py` Causes 100% Failure of `/recommend`**
   - **Evidence:** `app.py` line 27: `DB_PATH = ROOT_DIR / "detoura_master-v2"`. The file on disk is `detoura_master-v2.db`. Line 78 checks `if not DB_PATH.exists(): raise HTTPException(status_code=404, ...)`.
   - **Affected Component:** `detoura-ml/app.py`
   - **Impact:** Any user clicking "Build My Detoura" receives HTTP 404. The entire core application feature is blocked.
   - **Recommended Fix:** Change line 27 to `DB_PATH = ROOT_DIR / "detoura_master-v2.db"`.

2. **Cloud Firestore API is Disabled in Google Cloud**
   - **Evidence:** Live query threw `403 PermissionDenied: Cloud Firestore API has not been used in project detoura-f8a96 before or it is disabled`.
   - **Affected Component:** `firebase_client.py` / GCP Project `detoura-f8a96`
   - **Impact:** Any actual attempt to persist trips or authenticate users against Firestore will crash.
   - **Recommended Fix:** Enable the Cloud Firestore API in the Google Cloud Console for project `detoura-f8a96`, or configure Firestore Database in Firebase Console.

3. **Frontend Silent Error Catch Traps User on Travel DNA Screen**
   - **Evidence:** `TravelDNA.tsx` line 34: `catch (error) { console.error(error); } finally { setIsGenerating(false); }`.
   - **Affected Component:** `detoura-frontend/src/pages/TravelDNA.tsx`
   - **Impact:** When the API fails, the user receives zero UI feedback, toast, or alert. The button returns to "Build My Detoura" and nothing happens.
   - **Recommended Fix:** Add an error state banner in `TravelDNA.tsx` to alert users when the recommendation service is unreachable.

---

### 🟠 HIGH

4. **CPI Mismatch in `recommender.py` Flattens Crowd Penalty to 0.5**
   - **Evidence:** `recommender.py` line 123: `base_cpi = row.get('base_cpi', 0.5)`. The database column is `crowd_pressure_index`.
   - **Affected Component:** `detoura-ml/recommender.py`
   - **Impact:** Overcrowded locations (e.g. Kolkata, CPI 1.0) and secluded gems (Takdah, CPI 0.21) both receive a crowd penalty of 0.5. The core premise of the "anti-crowd / detour" algorithm is neutralized.
   - **Recommended Fix:** Update `recommender.py` to read `row.get('crowd_pressure_index', 0.5)`.

5. **SSI Climate Array Mismatch Flattens Seasonality to 0.5459**
   - **Evidence:** `recommender.py` lines 132–133 look for `selected_temperature` and `selected_rainfall`. The database stores `climate_temp_c` and `climate_rain_mm` as 12-month array strings.
   - **Affected Component:** `detoura-ml/recommender.py`
   - **Impact:** Every single destination receives an identical SSI score (0.5459), so weather/seasonality plays zero role in destination ranking.
   - **Recommended Fix:** Parse the destination's monthly climate array for the user's selected month (index `month - 1`), as demonstrated in `detoura-ml-notebook.py` line 700.

6. **Frontend Missing Month Selector**
   - **Evidence:** `TravelDNA.tsx` contains sliders for 4 traits, but has no month dropdown or selector.
   - **Affected Component:** `detoura-frontend/src/pages/TravelDNA.tsx`
   - **Impact:** User cannot select the month of travel; system defaults to 25°C / 60mm regardless of when the trip will take place.
   - **Recommended Fix:** Add a month selector dropdown (January–December) to `TravelDNA.tsx`.

7. **Match Score Normalization Divisor Displays 5% Instead of 90%+**
   - **Evidence:** `api.ts` line 61: `const maxPossibleScore = 40.0; const match_score = Math.min(Math.max(rec.detoura_score / maxPossibleScore, 0), 1);`.
   - **Affected Component:** `detoura-frontend/src/api.ts`
   - **Impact:** Recommendations show "5% Match" for the top destination.
   - **Recommended Fix:** In `recommender.py`, maximum possible Detoura score is ~2.5–3.0. Normalizing against ~2.5 or `detoura_score / max_score_in_batch` yields an accurate 85%–98% match display.

---

### 🟡 MEDIUM

8. **Hardcoded Slider Mapping & Discarded Food Slider in `TravelDNA.tsx`**
   - **Evidence:** Sliders are labeled Nature, Relaxation, Culture, Gastronomy. Code maps `adventure: nature / 100` and drops `food`.
   - **Affected Component:** `detoura-frontend/src/pages/TravelDNA.tsx`
   - **Impact:** Adventure is never independently configured; user gastronomic preference is lost.
   - **Recommended Fix:** Replace Gastronomy with Adventure, or expand backend feature vector if food is added to the database.

9. **Explore Screen is 100% Static Stitch Port**
   - **Evidence:** `Explore.tsx` contains 356 lines of hardcoded HTML/SVG without a single `onClick`, `useNavigate`, or `Link`.
   - **Affected Component:** `detoura-frontend/src/pages/Explore.tsx`
   - **Impact:** Clicking map pins or destination cards on Explore does nothing.
   - **Recommended Fix:** Connect Explore cards and map pins to `navigate('/destination/:id')` or link to Travel DNA.

10. **BottomNav Labels and Routes Inverted**
    - **Evidence:** `BottomNav.tsx` lines 25–37: Tab labeled "Trips" routes to `/profile`, while tab labeled "Profile" routes to `/` (Travel DNA).
    - **Affected Component:** `detoura-frontend/src/components/BottomNav.tsx`
    - **Impact:** User confusion when navigating bottom tabs.
    - **Recommended Fix:** Rename tab 4 to "Travel DNA" or update routing to match standard IA.

---

### 🔵 LOW

11. **Client-Side Synthetic Mock Metadata Injection in `api.ts`**
    - **Evidence:** `api.ts` lines 67–74 injects random distance (`Math.random() * 300 + 50`), static Unsplash URLs, and mock descriptions because the backend currently only returns scores and IDs.
    - **Affected Component:** `detoura-frontend/src/api.ts`
    - **Impact:** Every reload changes the destination distance, duration, and budget.
    - **Recommended Fix:** Include `district`, `category`, `estimated_daily_inr`, and `accessibility_km_to_nh` directly in `RecommendResponse` from the backend database.

12. **Insecure Service Account Key Storage & Missing `.gitignore`**
    - **Evidence:** `detoura-ml/credentials/detoura-f8a96-firebase-adminsdk-fbsvc-93a08f7635.json` is stored unencrypted with no `.gitignore` in `detoura-ml`.
    - **Affected Component:** `detoura-ml/credentials`
    - **Impact:** Risk of secret exposure if committed to a public repository.
    - **Recommended Fix:** Add `.gitignore` ignoring `credentials/*.json` and use environment variables (`GOOGLE_APPLICATION_CREDENTIALS`).

13. **CORS Configuration Wildcard with Credentials**
    - **Evidence:** `app.py` lines 19–20: `allow_origins=["*"]`, `allow_credentials=True`.
    - **Affected Component:** `detoura-ml/app.py`
    - **Impact:** Standard browser security prohibits wildcard origins when credentials are allowed.
    - **Recommended Fix:** Restrict origins to `["http://localhost:5173", "http://127.0.0.1:5173"]` or set `allow_credentials=False`.

---

## 12. What's Already Working (Do NOT Change)

1. **FastAPI application setup & startup:** Clean architecture, rapid boot time (<300ms).
2. **Pydantic schema definitions & input validation:** Strictly bounds preference inputs between 0.0 and 1.0 with 422 responses on invalid inputs.
3. **Master dataset (`detoura_master-v2.db`):** 515 destinations, clean data, 0 nulls, correct geo-coordinates.
4. **Cosine similarity vector calculation:** Matrix multiplication with scikit-learn is mathematically sound and deterministic.
5. **Tailwind CSS & Material Symbols Design System:** Visual styling matches Stitch designs cleanly.
6. **Trip Bookmarking System:** LocalStorage caching in `DetouraContext.tsx` handles adding, removing, and persisting saved trips reliably.

---

## 13. What's Broken (Confirmed Defects)

1. **`app.py` line 27:** `DB_PATH = ROOT_DIR / "detoura_master-v2"` (causes HTTP 404).
2. **`firebase_client.py`:** Live Firestore API is disabled in GCP (403 Permission Denied).
3. **`recommender.py` line 123:** Looks for `base_cpi` instead of `crowd_pressure_index` (causes CPI to always equal 0.5).
4. **`recommender.py` lines 132–133:** Looks for `selected_temperature` and `selected_rainfall` instead of parsing monthly climate columns (causes SSI to always equal 0.5459).
5. **`api.ts` line 61:** Divides score by 40.0 (causes match percentage to display as 5%).
6. **`TravelDNA.tsx` line 20:** Duplicates nature into adventure (`adventure: nature / 100`), ignoring the Food slider.
7. **`BottomNav.tsx` lines 32–37:** Profile link routes to `/` (Travel DNA) instead of user profile.

---

## 14. What's Missing

### Not Implemented:
- Month selection control on the frontend.
- Real destination image and narrative delivery from the backend (currently mocked in `api.ts`).
- Interactivity on the Explore page (search bar, filter chips, map pins).
- Real Firebase Auth and Firestore syncing on the frontend (currently purely local storage).
- User-facing error notification on API failure.

### Broken:
- Live `/recommend` endpoint (404 file path error).
- CPI and SSI dynamic scoring calculations in `recommender.py`.
- Cloud Firestore project activation.

### Not Tested / Unreachable in Native Flow:
- Live browser session recording with Playwright (halted due to Azure CDN driver download 404).

---

## 15. Hackathon Demo Readiness

| Subsystem | Readiness Score | Justification |
|---|---|---|
| **Backend** | **4 / 10** | Starts instantly, but main endpoint crashes with 404 due to file extension typo. |
| **ML Engine** | **5 / 10** | Computes cosine similarity, but collapses CPI and SSI to static constants. |
| **Firebase** | **1 / 10** | Cloud Firestore is disabled in GCP; frontend has no Firebase code. |
| **Frontend** | **6 / 10** | Visually impressive Stitch screens, but Explore is static and TravelDNA lacks month selection. |
| **Integration** | **2 / 10** | Primary user flow breaks on first button click; mock data injected client-side. |
| **Overall** | **3.6 / 10** | |

### Can this be demonstrated live?
### **NO**
**Justification:** If demonstrated live right now, clicking "Build My Detoura" on the very first screen fails with an HTTP 404 error, and nothing appears on the screen. The judges would see a non-responsive button on step 2.

---

## 16. Exact Prioritized Next Actions

### P0 — Must Fix Before Any Demo (Estimated Time: 15–20 minutes)
1. **Fix DB Path in `detoura-ml/app.py`:**
   Change `DB_PATH = ROOT_DIR / "detoura_master-v2"` to `DB_PATH = ROOT_DIR / "detoura_master-v2.db"`.
2. **Fix Column Mapping in `detoura-ml/recommender.py`:**
   Change `base_cpi = row.get('base_cpi', 0.5)` to `base_cpi = row.get('crowd_pressure_index', 0.5)`.
3. **Fix Score Normalization in `detoura-frontend/src/api.ts`:**
   Change `const maxPossibleScore = 40.0;` to normalize by the batch maximum or `2.2` so cards display realistic match percentages (e.g. 88%–96%).
4. **Fix Travel DNA Error Handling & Sliders:**
   Add user feedback alert if the API call fails, and correctly pass slider values without duplicating Nature.

### P1 — Should Fix Before Final Presentation (Estimated Time: 45–60 minutes)
5. **Add Month Selector to Travel DNA Screen:**
   Add a clean 12-month selector to pass target travel month to the backend.
6. **Implement Destination Climate Array Indexing in `recommender.py`:**
   Parse `climate_temp_c` and `climate_rain_mm` for the selected month to produce genuine dynamic SSI scores.
7. **Pass Rich Metadata from Backend:**
   Update `RecommendResponse` to return district, category, and daily budget from the SQLite database rather than generating random values in the frontend.
8. **Fix BottomNav Labels & Routes:**
   Ensure "Trips" goes to `/profile` and "Profile" links cleanly.

### P2 — Optional Polish (Estimated Time: 1–2 hours)
9. **Enable Cloud Firestore in GCP:**
   Visit Google Cloud Console for `detoura-f8a96` and activate Firestore if cloud sync is a required judging criterion.
10. **Make Explore Map & Cards Clickable:**
    Add click handlers on Explore pins to navigate to `/destination/:id`.
11. **Secure Service Account:**
    Add `.gitignore` and move private key out of source control.
