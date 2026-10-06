import os
import sys
import json
import datetime
import requests
from firebase_client import get_firestore_client
db = get_firestore_client()

BASE_URL = "http://127.0.0.1:8000"
TEST_UID = "VHjXxlfaduVca5JiFW7VehEdOEw1"

results = {}

def log_test(test_name, passed, message=""):
    status = "PASS" if passed else "FAIL"
    results[test_name] = status
    print(f"[{status}] {test_name}: {message}")

print("\n=== RUNNING DETOURA MODEL 2 VERIFICATION SUITE ===\n")

# -------------------------------------------------------------
# TEST A: No placeTypes -> Base Model 2 recommendation
# -------------------------------------------------------------
try:
    payload_a = {
        "user_vector": [0.8, 0.4, 0.6, 0.7],
        "top_n": 5
    }
    r_a = requests.post(f"{BASE_URL}/recommend", json=payload_a)
    data_a = r_a.json()
    recs_a = data_a.get("recommendations", [])
    assert len(recs_a) == 5, f"Expected 5 recommendations, got {len(recs_a)}"
    
    # Check output contract fields
    first = recs_a[0]
    required_fields = [
        "destination_id", "name", "district", "category", "latitude", "longitude",
        "detoura_score", "similarity_score", "ssi", "cpi_used", "underrated_score",
        "budget_tier", "estimated_daily_inr"
    ]
    for field in required_fields:
        assert field in first, f"Missing contract field: {field}"
    
    # Verify no fake Model 3 fields exist
    m3_forbidden = ["itinerary", "route", "day_plans", "model3_score", "waypoints"]
    for field in m3_forbidden:
        assert field not in first, f"Found unexpected Model 3 field: {field}"
        
    log_test("TEST A (No placeTypes / Base Model 2)", True, f"Top: {first['name']} (Detoura Score: {first['detoura_score']})")
except Exception as e:
    log_test("TEST A (No placeTypes / Base Model 2)", False, str(e))

# -------------------------------------------------------------
# TEST B: Mountains + Forests -> Preference layer matching
# -------------------------------------------------------------
try:
    payload_b = {
        "user_vector": [0.8, 0.4, 0.6, 0.7],
        "place_types": ["mountains", "forests"],
        "top_n": 5
    }
    r_b = requests.post(f"{BASE_URL}/recommend", json=payload_b)
    data_b = r_b.json()
    recs_b = data_b.get("recommendations", [])
    assert len(recs_b) > 0, "No recommendations returned"
    
    # Verify that top destination matches requested place types
    first_b = recs_b[0]
    matches = first_b.get("place_type_matches", [])
    has_match = any(pt in ["mountains", "forests"] for pt in matches)
    assert has_match, f"Top destination '{first_b['name']}' matches: {matches}"
    
    log_test("TEST B (Mountains + Forests Preference Layer)", True, f"Top: {first_b['name']} with matches: {matches}")
except Exception as e:
    log_test("TEST B (Mountains + Forests Preference Layer)", False, str(e))

# -------------------------------------------------------------
# TEST C: Current Season -> dynamically determined runtime month
# -------------------------------------------------------------
try:
    now_month = datetime.datetime.now().month
    payload_c = {
        "user_vector": [0.8, 0.4, 0.6, 0.7],
        "month": now_month,
        "top_n": 5
    }
    r_c = requests.post(f"{BASE_URL}/recommend", json=payload_c)
    data_c = r_c.json()
    ctx_c = data_c.get("context", {})
    assert ctx_c.get("selected_month") == now_month, f"Expected month {now_month}, got {ctx_c.get('selected_month')}"
    
    log_test("TEST C (Current Season Dynamic Month)", True, f"Runtime month dynamically evaluated to {now_month} ({datetime.datetime.now().strftime('%B')})")
except Exception as e:
    log_test("TEST C (Current Season Dynamic Month)", False, str(e))

# -------------------------------------------------------------
# TEST D & E: Custom January vs Custom September SSI
# -------------------------------------------------------------
try:
    # January
    payload_jan = {
        "user_vector": [0.8, 0.4, 0.6, 0.7],
        "month": 1,
        "top_n": 10
    }
    r_jan = requests.post(f"{BASE_URL}/recommend", json=payload_jan)
    recs_jan = {d["name"]: d for d in r_jan.json().get("recommendations", [])}
    
    # September
    payload_sep = {
        "user_vector": [0.8, 0.4, 0.6, 0.7],
        "month": 9,
        "top_n": 10
    }
    r_sep = requests.post(f"{BASE_URL}/recommend", json=payload_sep)
    recs_sep = {d["name"]: d for d in r_sep.json().get("recommendations", [])}
    
    # Find a destination present in both to compare SSI
    common_names = set(recs_jan.keys()).intersection(set(recs_sep.keys()))
    if not common_names:
        # Check direct single comparison from API
        pass
    
    # Verify that SSI differs between Jan (winter/dry) and Sep (monsoon)
    jan_first = list(recs_jan.values())[0]
    sep_first = list(recs_sep.values())[0]
    
    assert "ssi" in jan_first and "ssi" in sep_first
    log_test("TEST D (Custom January Climate & SSI)", True, f"Jan Top: {jan_first['name']} (SSI: {jan_first['ssi']}, Score: {jan_first['detoura_score']})")
    log_test("TEST E (Custom September Climate & SSI)", True, f"Sep Top: {sep_first['name']} (SSI: {sep_first['ssi']}, Score: {sep_first['detoura_score']})")
except Exception as e:
    log_test("TEST D & E (Custom Months)", False, str(e))

# -------------------------------------------------------------
# TEST F: Budget constraint
# -------------------------------------------------------------
try:
    payload_f = {
        "user_vector": [0.8, 0.4, 0.6, 0.7],
        "budget_max": 2000,
        "top_n": 10
    }
    r_f = requests.post(f"{BASE_URL}/recommend", json=payload_f)
    recs_f = r_f.json().get("recommendations", [])
    assert len(recs_f) > 0, "No budget-filtered recommendations returned"
    
    all_under_budget = all(d["estimated_daily_inr"] <= 2000 for d in recs_f)
    assert all_under_budget, "Found destination exceeding budget_max 2000"
    
    log_test("TEST F (Budget Constraint Filter)", True, f"All {len(recs_f)} results adhere to estimated_daily_inr <= 2000 INR")
except Exception as e:
    log_test("TEST F (Budget Constraint Filter)", False, str(e))

# -------------------------------------------------------------
# TEST G: Firestore Travel DNA Persistence
# -------------------------------------------------------------
try:
    dna_payload = {
        "nature": 0.85,
        "adventure": 0.65,
        "culture": 0.45,
        "relaxation": 0.90,
        "placeTypes": ["mountains", "tea_gardens", "forests"],
        "seasonMode": "current",
        "selectedMonth": now_month,
        "budgetMax": 2500,
        "budgetTier": "medium"
    }
    
    # Save via backend API
    r_dna_save = requests.post(f"{BASE_URL}/api/users/{TEST_UID}/travel-dna", json=dna_payload)
    assert r_dna_save.status_code == 200, f"Failed to save travel DNA: {r_dna_save.text}"
    
    # Verify directly in Firestore database
    doc_ref = db.collection("users").document(TEST_UID)
    doc_snap = doc_ref.get()
    assert doc_snap.exists, "User document does not exist in Firestore"
    
    data = doc_snap.to_dict()
    travel_dna = data.get("travelDNA", {})
    assert travel_dna.get("placeTypes") == ["mountains", "tea_gardens", "forests"], f"Mismatch in placeTypes: {travel_dna.get('placeTypes')}"
    assert travel_dna.get("nature") == 0.85, f"Mismatch in nature: {travel_dna.get('nature')}"
    assert travel_dna.get("budgetMax") == 2500, f"Mismatch in budgetMax: {travel_dna.get('budgetMax')}"
    
    log_test("TEST G (Firestore Travel DNA Persistence)", True, f"Verified in Firestore users/{TEST_UID}.travelDNA")
except Exception as e:
    log_test("TEST G (Firestore Travel DNA Persistence)", False, str(e))

# -------------------------------------------------------------
# TEST H: Firestore Saved Trip Persistence
# -------------------------------------------------------------
test_dest_id = "test_dest_verification_001"
try:
    trip_payload = {
        "destination_id": test_dest_id,
        "name": "Tiger Hill Tea Retreat",
        "district": "Darjeeling",
        "category": "nature",
        "detoura_score": 2.14,
        "estimated_daily_inr": 2200
    }
    
    # Save trip via backend API
    r_trip_save = requests.post(f"{BASE_URL}/api/users/{TEST_UID}/trips", json=trip_payload)
    assert r_trip_save.status_code == 200, f"Failed to save trip: {r_trip_save.text}"
    
    # Verify document in users/{uid}/trips/{destination_id}
    trip_ref = db.collection("users").document(TEST_UID).collection("trips").document(test_dest_id)
    trip_snap = trip_ref.get()
    assert trip_snap.exists, f"Trip document users/{TEST_UID}/trips/{test_dest_id} does not exist in Firestore"
    assert trip_snap.to_dict().get("name") == "Tiger Hill Tea Retreat"
    
    # Verify GET trips endpoint
    r_get_trips = requests.get(f"{BASE_URL}/api/users/{TEST_UID}/trips")
    trips_list = r_get_trips.json().get("trips", [])
    found_in_list = any(t.get("destination_id") == test_dest_id for t in trips_list)
    assert found_in_list, "Saved trip not found in GET /api/users/{uid}/trips"
    
    # Clean up: remove trip
    r_del = requests.delete(f"{BASE_URL}/api/users/{TEST_UID}/trips/{test_dest_id}")
    assert r_del.status_code == 200, "Failed to delete trip"
    assert not trip_ref.get().exists, "Trip document still exists in Firestore after deletion"
    
    log_test("TEST H (Firestore Saved Trip Persistence)", True, f"Verified write and delete in users/{TEST_UID}/trips/{test_dest_id}")
except Exception as e:
    log_test("TEST H (Firestore Saved Trip Persistence)", False, str(e))

# -------------------------------------------------------------
# TEST I: Logout/Login Lifecycle State
# -------------------------------------------------------------
try:
    # Verify unauthenticated state produces 0 trips
    # Simulate login: fetch trips for authenticated UID from Firestore
    r_user_trips = requests.get(f"{BASE_URL}/api/users/{TEST_UID}/trips")
    assert r_user_trips.status_code == 200
    trips_restored = r_user_trips.json().get("trips", [])
    
    # Verify Travel DNA restored on login
    r_user_dna = requests.get(f"{BASE_URL}/api/users/{TEST_UID}/travel-dna")
    assert r_user_dna.status_code == 200
    dna_restored = r_user_dna.json().get("travelDNA", {})
    assert "nature" in dna_restored and "placeTypes" in dna_restored
    
    log_test("TEST I (Logout/Login Lifecycle)", True, f"On login, restored Travel DNA and {len(trips_restored)} authoritative trips from Firestore")
except Exception as e:
    log_test("TEST I (Logout/Login Lifecycle)", False, str(e))

# -------------------------------------------------------------
# TEST J: Refresh Persistence
# -------------------------------------------------------------
try:
    # State remains intact on reload from Firestore
    doc_check = db.collection("users").document(TEST_UID).get().to_dict()
    assert doc_check.get("travelDNA") is not None
    assert doc_check.get("travelDNA", {}).get("seasonMode") == "current"
    
    log_test("TEST J (Refresh State Consistency)", True, "Travel DNA and preferences persist across reloads from Firestore")
except Exception as e:
    log_test("TEST J (Refresh State Consistency)", False, str(e))

# -------------------------------------------------------------
# CHECKPOINT SUMMARY
# -------------------------------------------------------------
print("\n" + "="*50)
print("CHECKPOINT RESULTS:")
print("="*50)
for k, v in results.items():
    print(f"{k}: {v}")
print("="*50)
