# DETOURA ML Microservice (Squad Brainware)

This is the Python ML microservice for DETOURA, an AI-driven regional travel intelligence platform for West Bengal that recommends high-similarity, low-crowd destinations paired with locally hosted **Gemma 2B** generative intelligence for personalized multi-day itineraries.

## Architecture

- **Python Version**: 3.12
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Core ML Dependencies**: NumPy, Pandas, scikit-learn
- **Generative AI Runtime**: `llama-cpp-python` (Quantized GGUF inference on CPU / CUDA)
- **Generative Model**: Google Gemma 2B Instruction-Tuned (`gemma-2-2b-it-Q4_K_M.gguf`, ~1.7 GB)
- **JSON Sanitization**: `json_repair` for fault-tolerant LLM output recovery
- **Database & Data**: SQLite (`detoura_master-v2.db`) + CSV destination intelligence (`data/detoura_model2_recommendations.csv`)

## Two-Stage Hybrid Architecture

1. **Stage 1: Mathematical Filtering & Multi-Criteria Ranking (Model 2)**:
   - **Content-Based Cosine Similarity**: Evaluates 4D user preference vectors (Nature, Adventure, Culture, Relaxation) against real destination profiles.
   - **Seasonal Suitability Index (SSI)**: Calculated dynamically using destination-specific historical climate (monthly temperatures and rainfall).
   - **Crowd Pressure Index (CPI)**: Evaluates live vs. base crowd congestion indices.
   - **AI-Estimated Underrated Score (AUS)**: Highlights hidden gems and tranquil offbeat locations.
   - **Constraint Filtering**: Enforces daily budget maximums and landscape preference tags.

2. **Stage 2: Generative Travel Intelligence (Model 3 - Gemma 2B)**:
   - Takes the top-ranked destination and traveler profile.
   - Generates customized activity rankings with alignment scores.
   - Synthesizes a granular multi-day itinerary (Morning, Afternoon, Evening) calibrated to the trip duration.
   - Provides clear, contextual natural-language explanations for why the destination was selected.
   - Zero-crash fallback engine ensures continuous demo availability even in edge cases.

## Project Structure

```
detoura-ml/
├── app.py                     # FastAPI application, Pydantic schemas, and endpoints
├── gemma_service.py           # Gemma 2B GGUF inference, prompt engineering, and parser
├── recommender.py             # Model 2 multi-criteria mathematical ranking algorithms
├── firebase_client.py         # Firebase Admin SDK integration
├── requirements.txt           # Dependency specifications
├── scripts/
│   └── download_gemma.py      # Automated un-gated Gemma GGUF model downloader
├── data/
│   └── detoura_model2_recommendations.csv  # 123-destination dataset with climate & metrics
├── models/
│   └── gemma-2-2b-it-Q4_K_M.gguf          # Local quantized Gemma weights (git-ignored)
└── test_integration.py        # Automated contract and endpoint test suite
```

## Setup & Running

1. **Activate Virtual Environment**:
   ```bash
   cd detoura-ml
   .\.venv312\Scripts\activate
   ```

2. **Download Gemma GGUF Model**:
   ```bash
   python scripts/download_gemma.py
   ```

3. **Start the Microservice**:
   ```bash
   uvicorn app:app --host 127.0.0.1 --port 8000 --reload
   ```

   Interactive Swagger UI: `http://127.0.0.1:8000/docs`

## API Endpoints

- `GET /health`: Returns service status and Gemma model loaded state.
- `POST /api/recommendations`: Unified hybrid endpoint. Computes Model 2 recommendations and invokes Gemma for generative itinerary synthesis. Returns payload strictly adhering to `detoura_model3_frontend_payload.json`.
- `POST /recommend`: Direct Model 2 candidate ranking endpoint.
- `GET /api/destinations`: Public catalog of all West Bengal destinations.
- `POST /api/users/{uid}/travel-dna`: Synchronizes Travel DNA to Firestore.
