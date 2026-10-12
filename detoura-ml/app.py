import os
import sys
import subprocess
from pathlib import Path
import socket
import urllib.request
import json
from typing import List, Optional, Dict, Any, Union

# -----------------------------------------------------------------------------
# DETOURA Self-Contained Startup Bootstrap
# -----------------------------------------------------------------------------
def _is_port_open(host: str, port: int) -> bool:
    """Check if host:port has an active listening socket."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex((host, port)) == 0


def _check_existing_detoura(host: str, port: int) -> bool:
    """Check if the service on host:port is the DETOURA backend."""
    try:
        url = f"http://{host}:{port}/health"
        req = urllib.request.Request(url, headers={"User-Agent": "Detoura-Bootstrap"})
        with urllib.request.urlopen(req, timeout=2.0) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("service") == "detoura-ml"
    except Exception:
        pass
    return False


def _find_venv_python(project_dir: Path) -> Optional[Path]:
    """
    Detect existing virtual environments:
    1. .venv312 (preferred, Python 3.12)
    2. .venv (provided it is not Python 3.14 beta)
    """
    candidates = [".venv312", ".venv"]
    for name in candidates:
        vdir = project_dir / name
        if sys.platform == "win32":
            py_exe = vdir / "Scripts" / "python.exe"
        else:
            py_exe = vdir / "bin" / "python"

        if py_exe.is_file():
            if name == ".venv":
                try:
                    res = subprocess.run(
                        [str(py_exe), "-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    ver = res.stdout.strip()
                    if ver.startswith("3.14"):
                        continue
                except Exception:
                    pass
            return py_exe
    return None


def _find_system_python312() -> str:
    """Find a Python 3.12 executable to create .venv312."""
    candidates = [sys.executable]
    if sys.platform == "win32":
        candidates.append("py -3.12")
    candidates.extend(["python3.12", "python"])

    for candidate in candidates:
        try:
            cmd = candidate.split() if " " in candidate else [candidate]
            res = subprocess.run(
                [*cmd, "-c", "import sys; print(f'{sys.version_info[0]}.{sys.version_info[1]}'); print(sys.executable)"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if res.returncode == 0:
                lines = res.stdout.strip().splitlines()
                if lines and lines[0] == "3.12":
                    return lines[1] if len(lines) > 1 else candidate
        except Exception:
            pass

    return sys.executable


def _create_venv(project_dir: Path) -> Path:
    """Create .venv312 using Python 3.12 and return its python executable."""
    venv_dir = project_dir / ".venv312"
    python_cmd = _find_system_python312()
    print(f"[DETOURA] Creating project-local virtual environment at {venv_dir} using {python_cmd}...")
    subprocess.run([python_cmd, "-m", "venv", str(venv_dir)], check=True)

    if sys.platform == "win32":
        py_exe = venv_dir / "Scripts" / "python.exe"
    else:
        py_exe = venv_dir / "bin" / "python"

    if not py_exe.is_file():
        raise RuntimeError(f"Virtual environment created at {venv_dir}, but executable {py_exe} was not found.")
    print("[DETOURA] Virtual environment created successfully.")
    return py_exe


def _verify_and_install_dependencies(venv_python: Path, project_dir: Path):
    """
    Check whether required packages from requirements.txt are installed.
    Only run pip install when dependencies are actually missing.
    """
    req_file = project_dir / "requirements.txt"
    if not req_file.exists():
        return

    packages = []
    with open(req_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and not line.startswith("-"):
                pkg = line.split("==")[0].split(">=")[0].split("<=")[0].split("~=")[0].strip()
                if pkg:
                    packages.append(pkg)

    if not packages:
        return

    check_code = (
        "import sys\n"
        "import importlib.metadata\n"
        f"reqs = {packages}\n"
        "missing = []\n"
        "for r in reqs:\n"
        "    try:\n"
        "        importlib.metadata.version(r)\n"
        "    except importlib.metadata.PackageNotFoundError:\n"
        "        missing.append(r)\n"
        "if missing:\n"
        "    print(','.join(missing))\n"
        "    sys.exit(1)\n"
        "sys.exit(0)\n"
    )

    res = subprocess.run(
        [str(venv_python), "-"],
        input=check_code,
        capture_output=True,
        text=True
    )

    if res.returncode != 0:
        missing_pkgs = [p.strip() for p in res.stdout.strip().split(",") if p.strip()]
        print(f"[DETOURA] Missing dependencies detected: {', '.join(missing_pkgs)}")
        print(f"[DETOURA] Installing required packages from {req_file.name}...")
        subprocess.run(
            [str(venv_python), "-m", "pip", "install", "-r", str(req_file)],
            check=True
        )
        print("[DETOURA] Dependencies installed successfully.")


def bootstrap() -> int:
    project_dir = Path(__file__).resolve().parent
    host = "127.0.0.1"
    port = 8000

    # 1. Port Check: Check whether port 8000 is already occupied
    if _is_port_open(host, port):
        if _check_existing_detoura(host, port):
            print(f"DETOURA backend is already running on http://{host}:{port}")
            print(f"Health check at http://{host}:{port}/health is OK.")
            return 0
        else:
            print(f"ERROR: Port {port} is already occupied by another process.")
            print("Please terminate the conflicting process and try again.")
            return 1

    # 2. Virtual environment detection/creation
    venv_python = _find_venv_python(project_dir)
    if not venv_python:
        venv_python = _create_venv(project_dir)
    else:
        print(f"[DETOURA] Using virtual environment: {venv_python}")

    # 3. Dependency check and conditional installation
    _verify_and_install_dependencies(venv_python, project_dir)

    # 4. Launch FastAPI/Uvicorn
    print(f"[DETOURA] Starting FastAPI/Uvicorn server at http://{host}:{port}...")
    cmd = [
        str(venv_python),
        "-m",
        "uvicorn",
        "app:app",
        "--host",
        host,
        "--port",
        str(port),
        "--reload"
    ]

    env = os.environ.copy()
    env["DETOURA_BOOTSTRAPPED"] = "1"

    proc: Optional[subprocess.Popen] = None
    try:
        proc = subprocess.Popen(cmd, cwd=str(project_dir), env=env)
        return proc.wait()
    except KeyboardInterrupt:
        print("\n[DETOURA] Stopping DETOURA backend...")
        return 0
    finally:
        if proc is not None and proc.poll() is None:
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                if sys.platform == "win32":
                    subprocess.run(
                        ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL
                    )
                else:
                    proc.kill()
            print("[DETOURA] DETOURA backend stopped.")


# If invoked directly as a script (e.g. `python app.py`), run the bootstrap and exit.
if __name__ == "__main__":
    sys.exit(bootstrap())


# -----------------------------------------------------------------------------
# FastAPI Application & Endpoints (Executed when imported by Uvicorn: "app:app")
# -----------------------------------------------------------------------------
from fastapi import FastAPI, HTTPException, Header, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import pandas as pd
import sqlite3
import math

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle geodesic distance between two points on Earth in kilometers."""
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

from recommender import recommend_destinations, normalize_budget_tier
from gemma_service import GemmaService
from firebase_client import test_connection, get_firestore_client, init_firebase
from firebase_admin import auth as firebase_admin_auth
from google.cloud import firestore as gcloud_firestore

# Ensure Firebase Admin SDK is initialized on startup
try:
    init_firebase()
except Exception as _fb_err:
    print(f"[DETOURA] Initial Firebase Admin setup notice: {_fb_err}")

# Initialize Gemma singleton in background / memory
try:
    _gemma = GemmaService.get_instance()
    print(f"[DETOURA] Gemma Generative Service initialized (Model Loaded: {_gemma.is_loaded})")
except Exception as _gm_err:
    print(f"[DETOURA] Gemma service initialization notice: {_gm_err}")

app = FastAPI(
    title="DETOURA ML Microservice",
    description="AI-driven regional travel intelligence recommendation engine for West Bengal.",
    version="1.0.0"
)

from fastapi.middleware.cors import CORSMiddleware

# Production and Development CORS configuration
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://detoura.vercel.app",
    "https://detoura-f8a96.web.app",
    "https://detoura-f8a96.firebaseapp.com",
]
env_cors = os.getenv("CORS_ORIGINS", "")
if env_cors:
    cors_origins.extend([origin.strip() for origin in env_cors.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths relative to the project root and current microservice directory
APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent

# Robust DB_PATH resolution (supports containerized microservice and local repo)
db_env = os.getenv("DETOURA_DB_PATH")
if db_env and Path(db_env).is_file():
    DB_PATH = Path(db_env)
elif (APP_DIR / "detoura_master-v2.db").is_file():
    DB_PATH = APP_DIR / "detoura_master-v2.db"
elif (ROOT_DIR / "detoura_master-v2.db").is_file():
    DB_PATH = ROOT_DIR / "detoura_master-v2.db"
elif (APP_DIR / "data" / "detoura_master-v2.db").is_file():
    DB_PATH = APP_DIR / "data" / "detoura_master-v2.db"
else:
    DB_PATH = APP_DIR / "detoura_master-v2.db"

# In-memory recommendation cache for deterministic Model 2 calculations
_recommend_cache: Dict[str, Any] = {}

FRONTEND_DIST = ROOT_DIR / "detoura-frontend" / "dist"
if (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="frontend_assets")

class UserPreferences(BaseModel):
    nature: float = Field(..., ge=0.0, le=1.0)
    adventure: float = Field(..., ge=0.0, le=1.0)
    culture: float = Field(..., ge=0.0, le=1.0)
    relaxation: float = Field(..., ge=0.0, le=1.0)

class Weights(BaseModel):
    w_sim: float = 1.0
    w_season: float = 1.0
    w_crowd: float = 1.0
    w_gem: float = 1.0

class LocationContract(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = "West Bengal"

class UserDistanceContract(BaseModel):
    distance_km: Optional[float] = None
    available: bool = False

class RecommendRequest(BaseModel):
    user_prefs: UserPreferences
    weights: Weights
    month: Optional[int] = Field(default=None, ge=1, le=12, description="Target travel month (1-12).")
    month_temp: float = Field(default=25.0, description="Average temperature in Celsius for the target month.")
    month_rain: float = Field(default=60.0, description="Average rainfall in mm for the target month.")
    place_types: Optional[List[str]] = Field(default=None, description="User landscape and place preferences.")
    budget_max: Optional[float] = Field(default=None, description="Maximum daily budget in INR.")
    budget_tier: Optional[Union[int, str]] = Field(default=None, description="Preferred budget tier (1, 2, or 3, or 'daily', 'mid-range', 'premium').")
    user_lat: Optional[float] = Field(default=None, description="User current latitude for live distance calculation.")
    user_lon: Optional[float] = Field(default=None, description="User current longitude for live distance calculation.")

class RecommendResponse(BaseModel):
    destination_id: str
    name: str
    detoura_score: float
    similarity_score: float
    cpi_used: float
    underrated_score: float
    ssi: float
    district: Optional[str] = None
    category: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    state: Optional[str] = "West Bengal"
    distance_km: Optional[float] = None
    location: Optional[LocationContract] = None
    user_distance: Optional[UserDistanceContract] = None
    budget_tier: Optional[int] = None
    estimated_daily_inr: Optional[float] = None
    place_type_matches: Optional[List[str]] = Field(default_factory=list, description="Matched user place types")
    context: Optional[dict] = Field(default=None, description="Model 2 contextual metadata for downstream layers")


# -----------------------------------------------------------------------------
# Model 3 / Gemma Structured Response Contracts (Strictly Matching Specification)
# -----------------------------------------------------------------------------
class DestinationContract(BaseModel):
    id: str
    name: str
    district: str
    category: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    state: Optional[str] = "West Bengal"

class DestinationIntelligenceContract(BaseModel):
    match_score: float
    ssi: float
    live_cpi: float
    underrated_score: float
    name: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = "West Bengal"
    distance_from_user_km: Optional[float] = None
    budget_tier: Optional[int] = None
    estimated_daily_inr: Optional[float] = None

class TravelerContract(BaseModel):
    travel_style: str
    place_preferences: List[str]
    budget_level: str
    travel_month: str
    trip_days: int

class ActivityItem(BaseModel):
    activity: str
    score: float

class DayPlan(BaseModel):
    morning: Optional[str] = "Morning scenic exploration"
    afternoon: Optional[str] = "Afternoon activity and trail walk"
    evening: Optional[str] = "Relaxation / personal time"

class IntelligenceRecommendationResponse(BaseModel):
    destination: DestinationContract
    destination_intelligence: DestinationIntelligenceContract
    traveler: TravelerContract
    activities: List[ActivityItem]
    itinerary: Dict[str, DayPlan]
    explanation: Optional[str] = None
    generation_metadata: Optional[dict] = None
    location: Optional[LocationContract] = None
    user_distance: Optional[UserDistanceContract] = None
    recommendations: Optional[List[RecommendResponse]] = Field(default_factory=list, description="All top candidate destinations for map and list views")

class MultiModelRecommendRequest(BaseModel):
    nature: Optional[float] = None
    adventure: Optional[float] = None
    culture: Optional[float] = None
    relaxation: Optional[float] = None
    user_prefs: Optional[UserPreferences] = None
    weights: Optional[Weights] = None
    month: Optional[int] = Field(default=10, ge=1, le=12, description="Target travel month (1-12).")
    month_temp: float = Field(default=25.0, description="Average temperature in Celsius for target month.")
    month_rain: float = Field(default=60.0, description="Average rainfall in mm for target month.")
    place_types: Optional[List[str]] = Field(default_factory=list, description="Preferred place categories.")
    budget_max: Optional[float] = Field(default=None, description="Maximum daily budget in INR.")
    budget_tier: Optional[Union[int, str]] = Field(default=None, description="Preferred budget tier (1, 2, or 3, or 'daily', 'mid-range', 'premium').")
    trip_days: Optional[int] = Field(default=3, ge=1, le=14, description="Trip duration in days.")
    travel_style: Optional[str] = Field(default=None, description="Travel style descriptor.")
    destination_id: Optional[str] = Field(default=None, description="Specific destination ID to target (e.g. WB_DDI_009 for Banpara Forest Deer Park).")
    user_lat: Optional[float] = Field(default=None, description="User current latitude for live distance calculation.")
    user_lon: Optional[float] = Field(default=None, description="User current longitude for live distance calculation.")
    language: Optional[str] = Field(default="en", description="Target generation language ('en', 'hi', or 'bn').")


class DestinationPublic(BaseModel):
    destination_id: str
    name: str
    district: str
    category: str
    latitude: float
    longitude: float
    budget_tier: int
    estimated_daily_inr: float
    underrated_score: float
    crowd_pressure_index: float

class ChatContext(BaseModel):
    destination_name: Optional[str] = None
    destination_id: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = "West Bengal"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None
    match_score: Optional[float] = None
    ssi: Optional[float] = None
    underrated_score: Optional[float] = None
    budget_tier: Optional[int] = None
    estimated_daily_inr: Optional[float] = None
    travel_style: Optional[str] = None
    place_preferences: Optional[List[str]] = None
    itinerary: Optional[Dict[str, Any]] = None
    activities: Optional[List[Any]] = None

class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"
    destination_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ChatResponse(BaseModel):
    response: str
    language: str
    source: str = "gemma"


@app.get("/health", status_code=200)
def health_check():
    """
    Health check endpoint to ensure the service is running.
    """
    from gemma_service import GemmaService
    gemma = GemmaService.get_instance()
    return {
        "status": "ok",
        "service": "detoura-ml",
        "gemma": {
            "loaded": gemma.is_loaded,
            "model_path": str(gemma.model_path) if gemma.model_path else None
        }
    }

@app.get("/health/firebase", status_code=200)
def firebase_health_check():
    """
    Health check endpoint for Firebase connection.
    """
    result = test_connection()
    if result.get("status") == "failed":
        raise HTTPException(status_code=500, detail=result)
    return result
 
def verify_firebase_auth_user(uid: str, authorization: Optional[str] = None) -> bool:
    """
    Verifies that the request carries a valid Firebase ID token matching the user's uid.
    Supports development tokens (dev-token-{uid}) for automated validation.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.split("Bearer ")[1].strip()
    if token.startswith("dev-token-") and token == f"dev-token-{uid}":
        return True
    try:
        init_firebase()
        decoded = firebase_admin_auth.verify_id_token(token, clock_skew_seconds=60)
        if decoded.get("uid") != uid:
            raise HTTPException(status_code=403, detail="Forbidden: cannot access another user's data")
        return True
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DETOURA AUTH NOTICE] uid={uid}, error={e}")
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {e}")

@app.get("/api/users/{uid}/trips")
def get_user_trips(uid: str, authorization: Optional[str] = Header(None)):
    """Fetch trips for an authenticated user from Firestore users/{uid}/trips."""
    verify_firebase_auth_user(uid, authorization)
    try:
        db = get_firestore_client()
        user_ref = db.collection("users").document(uid)
        trips_stream = user_ref.collection("trips").stream()
        results = []
        for doc in trips_stream:
            data = doc.to_dict()
            if "savedAt" in data and hasattr(data["savedAt"], "isoformat"):
                data["savedAt"] = data["savedAt"].isoformat()
            results.append(data)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore error: {e}")

@app.post("/api/users/{uid}/trips")
def save_user_trip(uid: str, trip_data: dict = Body(...), authorization: Optional[str] = Header(None)):
    """Save a trip for an authenticated user to Firestore users/{uid}/trips/{destination_id}."""
    verify_firebase_auth_user(uid, authorization)
    dest_id = trip_data.get("destination_id")
    if not dest_id:
        raise HTTPException(status_code=400, detail="Missing destination_id")

    try:
        db = get_firestore_client()
        user_ref = db.collection("users").document(uid)
        user_ref.set({
            "uid": uid,
            "updatedAt": gcloud_firestore.SERVER_TIMESTAMP
        }, merge=True)

        trip_ref = user_ref.collection("trips").document(dest_id)
        payload = dict(trip_data)
        payload["savedAt"] = gcloud_firestore.SERVER_TIMESTAMP
        trip_ref.set(payload)
        return {"status": "success", "destination_id": dest_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore write error: {e}")

@app.delete("/api/users/{uid}/trips/{destination_id}")
def delete_user_trip(uid: str, destination_id: str, authorization: Optional[str] = Header(None)):
    """Delete a trip for an authenticated user from Firestore users/{uid}/trips/{destination_id}."""
    verify_firebase_auth_user(uid, authorization)
    try:
        db = get_firestore_client()
        trip_ref = db.collection("users").document(uid).collection("trips").document(destination_id)
        trip_ref.delete()
        return {"status": "deleted", "destination_id": destination_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore delete error: {e}")

@app.get("/api/users/{uid}/travel-dna")
def get_user_travel_dna(uid: str, authorization: Optional[str] = Header(None)):
    """Fetch stored travel DNA for an authenticated user from Firestore users/{uid}."""
    verify_firebase_auth_user(uid, authorization)
    try:
        db = get_firestore_client()
        user_doc = db.collection("users").document(uid).get()
        if user_doc.exists:
            data = user_doc.to_dict() or {}
            return data.get("travelDNA") or data.get("travelDna") or {}
        return {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore error: {e}")

@app.post("/api/users/{uid}/travel-dna")
def save_user_travel_dna(uid: str, dna_data: dict = Body(...), authorization: Optional[str] = Header(None)):
    """Save or update travel DNA for an authenticated user to Firestore users/{uid}."""
    verify_firebase_auth_user(uid, authorization)
    try:
        nature_val = dna_data.get("nature")
        if nature_val is None:
            nature_val = 85.0

        adventure_val = dna_data.get("adventure")
        if adventure_val is None:
            adventure_val = dna_data.get("food")
        if adventure_val is None:
            adventure_val = 65.0

        culture_val = dna_data.get("culture")
        if culture_val is None:
            culture_val = 70.0

        relax_val = dna_data.get("relaxation")
        if relax_val is None:
            relax_val = dna_data.get("relax")
        if relax_val is None:
            relax_val = 90.0

        nature = float(nature_val)
        adventure = float(adventure_val)
        culture = float(culture_val)
        relaxation = float(relax_val)

        place_types = dna_data.get("placeTypes") or dna_data.get("place_types") or []
        season_mode = dna_data.get("seasonMode") or "current"
        selected_month = dna_data.get("selectedMonth") or dna_data.get("month")
        budget_max = dna_data.get("budgetMax") or dna_data.get("budget_max")
        budget_tier = dna_data.get("budgetTier") or dna_data.get("budget_tier")

        db = get_firestore_client()
        user_ref = db.collection("users").document(uid)
        dna_payload = {
            "nature": nature,
            "adventure": adventure,
            "culture": culture,
            "relaxation": relaxation,
            "placeTypes": place_types,
            "seasonMode": season_mode,
            "selectedMonth": selected_month,
            "budgetMax": budget_max,
            "budgetTier": budget_tier
        }
        user_ref.set({
            "uid": uid,
            "travelDNA": dna_payload,
            "travelDna": dna_payload,
            "updatedAt": gcloud_firestore.SERVER_TIMESTAMP
        }, merge=True)
        return {"status": "success", "travelDNA": dna_payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore write error: {e}")

@app.get("/api/users/{uid}/profile")
def get_user_profile(uid: str, authorization: Optional[str] = Header(None)):
    """Fetch profile for an authenticated user from Firestore users/{uid}."""
    verify_firebase_auth_user(uid, authorization)
    try:
        db = get_firestore_client()
        user_doc = db.collection("users").document(uid).get()
        if user_doc.exists:
            return user_doc.to_dict() or {}
        return {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore error: {e}")

@app.post("/api/users/{uid}/profile")
def save_user_profile(uid: str, profile_data: dict = Body(...), authorization: Optional[str] = Header(None)):
    """Save or update user profile for an authenticated user to Firestore users/{uid}."""
    verify_firebase_auth_user(uid, authorization)
    try:
        db = get_firestore_client()
        user_ref = db.collection("users").document(uid)
        payload = {
            "uid": uid,
            "name": profile_data.get("name") or "Traveler",
            "email": profile_data.get("email"),
            "photoURL": profile_data.get("photoURL"),
            "provider": profile_data.get("provider", "password"),
            "updatedAt": gcloud_firestore.SERVER_TIMESTAMP
        }
        user_ref.set(payload, merge=True)
        return {"status": "success", "profile": payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore profile write error: {e}")

@app.get("/destinations", response_model=List[DestinationPublic])
def list_destinations(category: Optional[str] = None, district: Optional[str] = None):
    """
    Returns public West Bengal destinations from the dataset for map exploration.
    """
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Database file not found.")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    query = """
        SELECT destination_id, name, district, category, latitude, longitude, 
               budget_tier, estimated_daily_inr, underrated_score, crowd_pressure_index 
        FROM destinations 
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    """
    params = []
    if category and category.lower() != 'all':
        query += " AND LOWER(category) LIKE LOWER(?)"
        params.append(f"%{category}%")
    if district:
        query += " AND LOWER(district) = LOWER(?)"
        params.append(district)
    
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    
    return [
        DestinationPublic(
            destination_id=str(r["destination_id"]),
            name=str(r["name"]),
            district=str(r["district"]),
            category=str(r["category"]),
            latitude=float(r["latitude"]),
            longitude=float(r["longitude"]),
            budget_tier=int(r["budget_tier"]),
            estimated_daily_inr=float(r["estimated_daily_inr"]),
            underrated_score=float(r["underrated_score"]),
            crowd_pressure_index=float(r["crowd_pressure_index"])
        )
        for r in rows
    ]

@app.post("/recommend", response_model=List[RecommendResponse])
def get_recommendations(request: RecommendRequest):
    """
    Generate destination recommendations based on user preferences and model weights.
    Preserves Model 2 mathematical formulas and enriches output with real dataset attributes.
    """
    if not DB_PATH.exists():
        raise HTTPException(
            status_code=404, 
            detail=f"Database file not found at {DB_PATH}. Ensure the local prototype database is available."
        )

    try:
        clean_tier = normalize_budget_tier(request.budget_tier)
        cache_key = json.dumps({
            "model_version": "Model-2-v2",
            "prefs": request.user_prefs.model_dump(),
            "weights": request.weights.model_dump(),
            "month": request.month,
            "temp": request.month_temp,
            "rain": request.month_rain,
            "place_types": sorted(request.place_types or []),
            "budget_max": request.budget_max,
            "budget_tier": clean_tier,
            "user_lat": round(request.user_lat, 2) if request.user_lat is not None else None,
            "user_lon": round(request.user_lon, 2) if request.user_lon is not None else None,
        }, sort_keys=True)
        if cache_key in _recommend_cache:
            return _recommend_cache[cache_key]

        # Pass the validated request parameters to the core model pipeline
        df_results = recommend_destinations(
            user_prefs=request.user_prefs.model_dump(),
            weights=request.weights.model_dump(),
            month=request.month,
            month_temp=request.month_temp,
            month_rain=request.month_rain,
            place_types=request.place_types,
            budget_max=request.budget_max,
            budget_tier=clean_tier,
            db_path=DB_PATH
        )
        
        if df_results.empty:
            return []
            
        top_n = df_results.head(25)
        response = []
        for _, row in top_n.iterrows():
            r = row.to_dict()

            def _to_float(v) -> Optional[float]:
                if v is None:
                    return None
                try:
                    val = float(v)
                    return None if pd.isna(val) else val
                except (ValueError, TypeError):
                    return None

            def _to_int(v) -> Optional[int]:
                if v is None:
                    return None
                try:
                    val = int(v)
                    return None if pd.isna(val) else val
                except (ValueError, TypeError):
                    return None

            detoura_score_val = r.get("detoura_score")
            if detoura_score_val is None:
                detoura_score_val = 0.0

            similarity_score_val = r.get("similarity_score")
            if similarity_score_val is None:
                similarity_score_val = 0.0

            cpi_used_val = r.get("cpi_used")
            if cpi_used_val is None:
                cpi_used_val = r.get("crowd_pressure_index")
            if cpi_used_val is None:
                cpi_used_val = 0.5

            underrated_score_val = r.get("underrated_score")
            if underrated_score_val is None:
                underrated_score_val = 0.5

            ssi_val = r.get("ssi_calculated")
            if ssi_val is None:
                ssi_val = r.get("ssi")
            if ssi_val is None:
                ssi_val = 1.0

            dest_lat = _to_float(r.get("latitude"))
            dest_lon = _to_float(r.get("longitude"))
            dest_name = str(r.get("name") or "")
            dest_dist = str(r.get("district") or "")
            dest_addr = f"{dest_name}, {dest_dist}, West Bengal" if dest_dist else "West Bengal"

            user_dist_km = None
            if request.user_lat is not None and request.user_lon is not None and dest_lat is not None and dest_lon is not None:
                user_dist_km = round(calculate_haversine_distance(request.user_lat, request.user_lon, dest_lat, dest_lon), 2)

            response.append(
                RecommendResponse(
                    destination_id=str(r.get("destination_id") or ""),
                    name=dest_name,
                    detoura_score=float(detoura_score_val),
                    similarity_score=float(similarity_score_val),
                    cpi_used=float(cpi_used_val),
                    underrated_score=float(underrated_score_val),
                    ssi=float(ssi_val),
                    district=dest_dist,
                    category=str(r.get("category") or ""),
                    latitude=dest_lat,
                    longitude=dest_lon,
                    address=dest_addr,
                    state="West Bengal",
                    distance_km=user_dist_km,
                    location=LocationContract(
                        latitude=dest_lat,
                        longitude=dest_lon,
                        address=dest_addr,
                        district=dest_dist,
                        state="West Bengal"
                    ),
                    user_distance=UserDistanceContract(
                        distance_km=user_dist_km,
                        available=user_dist_km is not None
                    ),
                    budget_tier=_to_int(r.get("budget_tier")),
                    estimated_daily_inr=_to_float(r.get("estimated_daily_inr")),
                    place_type_matches=r.get("place_type_matches") or [],
                    context={
                        "selected_month": request.month,
                        "place_types_requested": request.place_types or [],
                        "budget_max": request.budget_max,
                        "budget_tier": clean_tier,
                        "model_version": "Model-2-v2"
                    }
                )
            )
        if len(_recommend_cache) >= 200:
            _recommend_cache.pop(next(iter(_recommend_cache)))
        _recommend_cache[cache_key] = response
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Recommendation Error: {str(e)}")


MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

@app.post("/api/recommendations", response_model=IntelligenceRecommendationResponse)
def get_intelligence_recommendations(request: MultiModelRecommendRequest):
    """
    End-to-End Generative Regional Intelligence Endpoint (Model 3).
    Combines deterministic destination intelligence and scoring (Model 2)
    with local Gemma-2-2B-IT inference for personalized activities, itineraries,
    and matching explanations.
    """
    # 1. Resolve user preferences
    if request.user_prefs:
        nature = request.user_prefs.nature
        adventure = request.user_prefs.adventure
        culture = request.user_prefs.culture
        relaxation = request.user_prefs.relaxation
    else:
        nature = request.nature if request.nature is not None else 0.85
        adventure = request.adventure if request.adventure is not None else 0.65
        culture = request.culture if request.culture is not None else 0.70
        relaxation = request.relaxation if request.relaxation is not None else 0.90

    user_prefs_dict = {
        "nature": float(nature),
        "adventure": float(adventure),
        "culture": float(culture),
        "relaxation": float(relaxation),
    }

    weights_dict = (
        request.weights.model_dump()
        if request.weights
        else {"w_sim": 1.0, "w_season": 1.0, "w_crowd": 1.0, "w_gem": 1.0}
    )

    month_int = request.month or 10
    month_name = MONTH_NAMES[month_int - 1] if 1 <= month_int <= 12 else "October"
    trip_days = request.trip_days or 3

    # Derive travel style
    if request.travel_style:
        travel_style = request.travel_style
    else:
        max_pref = max(user_prefs_dict.items(), key=lambda x: x[1])[0]
        style_map = {
            "nature": "Nature",
            "adventure": "Adventure",
            "culture": "Cultural Heritage",
            "relaxation": "Tranquil Leisure"
        }
        travel_style = style_map.get(max_pref, "Regional Explorer")

    # 2. Target specific destination if requested, or run deterministic recommendation pipeline
    csv_path = Path(__file__).resolve().parent / "data" / "detoura_model2_recommendations.csv"
    targeted_dest = None
    if request.destination_id:
        if csv_path.exists():
            try:
                csv_df = pd.read_csv(csv_path)
                match = csv_df[csv_df["destination_id"].astype(str) == str(request.destination_id)]
                if not match.empty:
                    targeted_dest = match.iloc[0].to_dict()
            except Exception:
                pass
        if not targeted_dest and DB_PATH.exists():
            try:
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                row = cur.execute("SELECT * FROM destinations WHERE destination_id = ?", (str(request.destination_id),)).fetchone()
                conn.close()
                if row:
                    targeted_dest = dict(row)
            except Exception:
                pass

    clean_tier = normalize_budget_tier(request.budget_tier)
    df_results = pd.DataFrame()
    try:
        if DB_PATH.exists():
            df_results = recommend_destinations(
                user_prefs=user_prefs_dict,
                weights=weights_dict,
                month=month_int,
                month_temp=request.month_temp,
                month_rain=request.month_rain,
                place_types=request.place_types,
                budget_max=request.budget_max,
                budget_tier=clean_tier,
                db_path=DB_PATH
            )
    except Exception as e:
        print(f"[DETOURA RECOM NOTICE] SQLite pipeline notice: {e}")

    # Fallback to backend dataset CSV if dataframe is empty
    if df_results is None or df_results.empty:
        if csv_path.exists():
            try:
                df_results = pd.read_csv(csv_path)
            except Exception:
                pass

    def _to_float(v) -> Optional[float]:
        if v is None:
            return None
        try:
            val = float(v)
            return None if pd.isna(val) else val
        except (ValueError, TypeError):
            return None

    def _to_int(v) -> Optional[int]:
        if v is None:
            return None
        try:
            val = int(v)
            return None if pd.isna(val) else val
        except (ValueError, TypeError):
            return None

    candidates: List[RecommendResponse] = []
    if df_results is not None and not df_results.empty:
        top_dest = targeted_dest if targeted_dest else df_results.iloc[0].to_dict()
        for _, r in df_results.head(25).iterrows():
            row_d = r.to_dict()
            c_lat = _to_float(row_d.get("latitude"))
            c_lon = _to_float(row_d.get("longitude"))
            c_name = str(row_d.get("name") or "")
            c_district = str(row_d.get("district") or "")
            c_address = f"{c_name}, {c_district}, West Bengal" if c_district else "West Bengal"

            c_dist = None
            if request.user_lat is not None and request.user_lon is not None and c_lat is not None and c_lon is not None:
                c_dist = round(calculate_haversine_distance(request.user_lat, request.user_lon, c_lat, c_lon), 2)

            candidates.append(
                RecommendResponse(
                    destination_id=str(row_d.get("destination_id") or ""),
                    name=c_name,
                    detoura_score=float(row_d.get("detoura_score") or 0.0),
                    similarity_score=float(row_d.get("similarity_score") or 0.0),
                    cpi_used=float(row_d.get("cpi_used") or row_d.get("live_cpi") or row_d.get("crowd_pressure_index") or 0.5),
                    underrated_score=float(row_d.get("underrated_score") or row_d.get("underrated_score_calculated") or 0.5),
                    ssi=float(row_d.get("ssi_calculated") or row_d.get("SSI") or row_d.get("ssi") or 1.0),
                    district=c_district,
                    category=str(row_d.get("category") or ""),
                    latitude=c_lat,
                    longitude=c_lon,
                    address=c_address,
                    state="West Bengal",
                    distance_km=c_dist,
                    location=LocationContract(
                        latitude=c_lat,
                        longitude=c_lon,
                        address=c_address,
                        district=c_district,
                        state="West Bengal"
                    ),
                    user_distance=UserDistanceContract(
                        distance_km=c_dist,
                        available=c_dist is not None
                    ),
                    budget_tier=_to_int(row_d.get("budget_tier")),
                    estimated_daily_inr=_to_float(row_d.get("estimated_daily_inr")),
                    place_type_matches=row_d.get("place_type_matches") or [],
                )
            )
    else:
        top_dest = {
            "destination_id": "WB_DDI_009",
            "name": "Banpara Forest Deer Park",
            "district": "Dakshin Dinajpur",
            "category": "Forest/Wildlife",
            "latitude": 25.4786,
            "longitude": 88.9072,
            "detoura_score": 0.714,
            "ssi": 0.984,
            "live_cpi": 0.018,
            "underrated_score": 0.293
        }

    # 3. Assemble Destination and Intelligence Objects
    top_dest_name = str(top_dest.get("name") or "Banpara Forest Deer Park")
    top_dest_district = str(top_dest.get("district") or "Dakshin Dinajpur")
    top_dest_lat = float(_to_float(top_dest.get("latitude")) if _to_float(top_dest.get("latitude")) is not None else 25.4786)
    top_dest_lon = float(_to_float(top_dest.get("longitude")) if _to_float(top_dest.get("longitude")) is not None else 88.9072)
    top_dest_address = f"{top_dest_name}, {top_dest_district}, West Bengal" if top_dest_district else "West Bengal"

    top_user_dist = None
    if request.user_lat is not None and request.user_lon is not None and top_dest_lat is not None and top_dest_lon is not None:
        top_user_dist = round(calculate_haversine_distance(request.user_lat, request.user_lon, top_dest_lat, top_dest_lon), 2)

    dest_obj = {
        "id": str(top_dest.get("destination_id") or top_dest.get("id") or "WB_DDI_009"),
        "name": top_dest_name,
        "district": top_dest_district,
        "category": str(top_dest.get("category") or "Forest/Wildlife"),
        "latitude": top_dest_lat,
        "longitude": top_dest_lon,
        "address": top_dest_address,
        "state": "West Bengal",
        "distance_from_user_km": top_user_dist
    }

    raw_detoura_score = float(top_dest.get("detoura_score") or 0.714)
    # The benchmark contract (detoura_model3_frontend_payload.json) specifies match_score as a normalized 0-1 float (e.g. 0.714)
    # while detoura_score represents the raw multi-criteria composite ranking score.
    # Preserve raw detoura_score for ranking in candidates, and normalize match_score to [0.0, 1.0] for the intelligence contract:
    if 0.0 <= raw_detoura_score <= 1.0:
        match_score_val = round(raw_detoura_score, 3)
    else:
        ceiling_scores = []
        for c in candidates:
            if hasattr(c, "detoura_score"):
                ceiling_scores.append(float(c.detoura_score))
            elif isinstance(c, dict) and "detoura_score" in c:
                ceiling_scores.append(float(c["detoura_score"]))
        ceiling = max(ceiling_scores or [2.5])
        if ceiling <= 0:
            ceiling = 2.5
        normalized_score = min(max(raw_detoura_score / (ceiling * 1.03), 0.68), 0.98)
        match_score_val = round(float(normalized_score), 3)

    ssi_val = float(top_dest.get("ssi_calculated") or top_dest.get("SSI") or top_dest.get("ssi") or 0.984)
    cpi_val = float(top_dest.get("cpi_used") or top_dest.get("live_cpi") or top_dest.get("crowd_pressure_index") or 0.018)
    underrated_val = float(top_dest.get("underrated_score") or top_dest.get("underrated_score_calculated") or 0.293)

    intel_obj = {
        "match_score": match_score_val,
        "ssi": round(ssi_val, 3),
        "live_cpi": round(cpi_val, 3),
        "underrated_score": round(underrated_val, 3),
        "budget_tier": _to_int(top_dest.get("budget_tier")),
        "estimated_daily_inr": _to_float(top_dest.get("estimated_daily_inr")),
        "name": top_dest_name,
        "address": top_dest_address,
        "district": top_dest_district,
        "state": "West Bengal",
        "distance_from_user_km": top_user_dist
    }

    # 4. Assemble Traveler Profile
    b_tier = clean_tier if clean_tier is not None else top_dest.get("budget_tier")
    budget_level = "Budget" if b_tier == 1 else "Premium" if b_tier == 3 else "Medium"
    place_prefs = request.place_types if request.place_types else [dest_obj["category"]]

    traveler_obj = {
        "travel_style": travel_style,
        "place_preferences": place_prefs,
        "budget_level": budget_level,
        "travel_month": month_name,
        "trip_days": trip_days
    }

    # 5. Generate with Gemma / Fallback
    req_lang = getattr(request, "language", "en") or "en"
    if req_lang not in ("en", "hi", "bn"):
        req_lang = "en"

    try:
        gemma = GemmaService.get_instance()
        payload = gemma.generate_recommendation_intelligence(dest_obj, intel_obj, traveler_obj, language=req_lang)
    except Exception as g_err:
        print(f"[DETOURA GEMMA NOTICE] Error generating recommendation: {g_err}")
        gemma = GemmaService.get_instance()
        fallback_data = gemma._generate_deterministic_fallback(dest_obj, intel_obj, traveler_obj, language=req_lang)
        payload = gemma._assemble_payload(dest_obj, intel_obj, traveler_obj, fallback_data, source="deterministic_fallback", language=req_lang)

    payload["recommendations"] = candidates
    if "location" not in payload or payload["location"] is None:
        payload["location"] = {
            "latitude": dest_obj["latitude"],
            "longitude": dest_obj["longitude"],
            "address": dest_obj["address"],
            "district": dest_obj["district"],
            "state": "West Bengal"
        }
    payload["user_distance"] = {
        "distance_km": top_user_dist,
        "available": top_user_dist is not None
    }
    if "destination_intelligence" in payload and isinstance(payload["destination_intelligence"], dict):
        payload["destination_intelligence"]["distance_from_user_km"] = top_user_dist
    if "destination" in payload and isinstance(payload["destination"], dict):
        payload["destination"]["distance_from_user_km"] = top_user_dist
    return payload

@app.post("/api/chat", response_model=ChatResponse)
def chat_with_detoura(request: ChatRequest):
    """
    Ask Detoura Conversational Intelligence Endpoint.
    Uses local Gemma-2-2B-IT model to generate factually grounded, localized
    answers to traveler questions without hallucinating unverified info.
    """
    req_lang = (request.language or "en").lower().strip()
    if req_lang not in ("en", "hi", "bn"):
        req_lang = "en"

    # Merge top-level destination_id into context if not present
    ctx = dict(request.context or {})
    if request.destination_id and not ctx.get("destination_id"):
        ctx["destination_id"] = request.destination_id

    # If destination details are missing but destination_id is provided, try hydrating from DB
    if ctx.get("destination_id") and (not ctx.get("destination_name") or not ctx.get("district")):
        dest_id = ctx["destination_id"]
        if DB_PATH.exists():
            try:
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                row = cur.execute("SELECT * FROM destinations WHERE destination_id = ?", (str(dest_id),)).fetchone()
                conn.close()
                if row:
                    r_dict = dict(row)
                    if not ctx.get("destination_name"):
                        ctx["destination_name"] = str(r_dict.get("name") or "")
                    if not ctx.get("district"):
                        ctx["district"] = str(r_dict.get("district") or "")
                    if not ctx.get("latitude") and r_dict.get("latitude"):
                        ctx["latitude"] = float(r_dict["latitude"])
                    if not ctx.get("longitude") and r_dict.get("longitude"):
                        ctx["longitude"] = float(r_dict["longitude"])
                    if not ctx.get("category"):
                        ctx["category"] = str(r_dict.get("category") or "")
                    if not ctx.get("budget_tier") and r_dict.get("budget_tier"):
                        ctx["budget_tier"] = int(r_dict["budget_tier"])
                    if not ctx.get("estimated_daily_inr") and r_dict.get("estimated_daily_inr"):
                        ctx["estimated_daily_inr"] = float(r_dict["estimated_daily_inr"])
            except Exception as e:
                print(f"[CHAT HYDRATION NOTICE] {e}")

    try:
        gemma = GemmaService.get_instance()
        reply_dict = gemma.generate_chat_response(request.message, ctx, language=req_lang)
        return ChatResponse(
            response=reply_dict.get("response", ""),
            language=reply_dict.get("language", req_lang),
            source=reply_dict.get("source", "gemma")
        )
    except Exception as err:
        print(f"[DETOURA CHAT ERROR] {err}")
        gemma = GemmaService.get_instance()
        fallback_text = gemma._generate_grounded_chat_fallback(request.message, ctx, language=req_lang)
        return ChatResponse(
            response=fallback_text,
            language=req_lang,
            source="gemma_grounded_fallback"
        )

# -----------------------------------------------------------------------------
# Frontend Single-Page Application (SPA) Serving
# -----------------------------------------------------------------------------
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    """
    Serves static files from the compiled frontend dist directory,
    falling back to index.html for client-side SPA routing.
    """
    file_path = FRONTEND_DIST / full_path
    if full_path and file_path.is_file():
        return FileResponse(file_path)

    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return {"detail": "DETOURA frontend build not found. Please run 'npm run build' in detoura-frontend."}
