import json
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "gemma" in data

def test_model3_recommendations_contract():
    # Benchmark request: Nature traveler, October, 3 days
    payload = {
        "user_prefs": {
            "nature": 0.85,
            "relaxation": 0.90,
            "culture": 0.70,
            "adventure": 0.65
        },
        "weights": {
            "w_sim": 1.0,
            "w_season": 1.0,
            "w_crowd": 1.0,
            "w_gem": 1.0
        },
        "month": 10,
        "trip_days": 3,
        "travel_style": "Nature"
    }

    response = client.post("/api/recommendations", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    # 1. Contract Structure Check (matches detoura_model3_frontend_payload.json)
    assert "destination" in data
    assert "destination_intelligence" in data
    assert "traveler" in data
    assert "activities" in data
    assert "itinerary" in data
    assert "explanation" in data

    # 2. Destination attributes
    dest = data["destination"]
    assert "id" in dest
    assert "name" in dest
    assert "district" in dest
    assert "category" in dest
    assert "latitude" in dest
    assert "longitude" in dest

    # 3. Destination Intelligence metrics
    intel = data["destination_intelligence"]
    assert "match_score" in intel and isinstance(intel["match_score"], (int, float))
    assert 0.0 <= intel["match_score"] <= 1.0, f"match_score should be normalized to 0.0-1.0, got {intel['match_score']}"
    assert "ssi" in intel and isinstance(intel["ssi"], (int, float))
    assert 0.0 <= intel["ssi"] <= 1.0, f"ssi should be within 0.0-1.0, got {intel['ssi']}"
    assert "live_cpi" in intel and isinstance(intel["live_cpi"], (int, float))
    assert "underrated_score" in intel and isinstance(intel["underrated_score"], (int, float))

    # 4. Traveler contract
    traveler = data["traveler"]
    assert traveler["trip_days"] == 3
    assert traveler["travel_month"] == "October"

    # 5. Activities
    activities = data["activities"]
    assert isinstance(activities, list)
    assert len(activities) >= 3
    for act in activities:
        assert "activity" in act
        assert "score" in act

    # 6. Itinerary structure
    itinerary = data["itinerary"]
    assert isinstance(itinerary, dict)
    assert len(itinerary) == 3  # 3-day trip
    for day_key, day_plan in itinerary.items():
        assert "morning" in day_plan and len(day_plan["morning"]) > 0
        assert "afternoon" in day_plan and len(day_plan["afternoon"]) > 0
        assert "evening" in day_plan and len(day_plan["evening"]) > 0

    print("\n[SUCCESS] /api/recommendations passed contract verification!")
    print(f"Top Destination: {dest['name']} ({dest['id']}) in {dest['district']}")
    print(f"Match Score: {intel['match_score']}, SSI: {intel['ssi']}, CPI: {intel['live_cpi']}")

def test_specific_destination_id_lookup():
    # Test specific lookup: WB_DDI_009 (Banpara Forest Deer Park)
    payload = {
        "destination_id": "WB_DDI_009",
        "trip_days": 2,
        "month": 10
    }
    response = client.post("/api/recommendations", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["destination"]["id"] == "WB_DDI_009"
    assert "Banpara" in data["destination"]["name"]
    assert len(data["itinerary"]) == 2
    print("\n[SUCCESS] Direct destination_id lookup for WB_DDI_009 passed!")

def test_budget_tiers():
    tiers = [
        ("Daily", "daily", 1, "Budget"),
        ("Mid-range", "mid-range", 2, ["Medium", "Mid-range"]),
        ("Premium", "premium", 3, "Premium")
    ]
    for label, tier_input, expected_tier, expected_budget_level in tiers:
        payload = {
            "user_prefs": {"nature": 0.8, "adventure": 0.6, "culture": 0.5, "relaxation": 0.7},
            "weights": {"w_sim": 1.0, "w_season": 1.0, "w_crowd": 1.0, "w_gem": 1.0},
            "month": 10,
            "trip_days": 2,
            "budget_tier": tier_input
        }
        res = client.post("/api/recommendations", json=payload)
        assert res.status_code == 200, f"Failed for {label}: {res.text}"
        data = res.json()
        assert "destination" in data
        assert "recommendations" in data and len(data["recommendations"]) > 0
        top_cand = data["recommendations"][0]
        assert top_cand["budget_tier"] == expected_tier, f"{label} expected tier {expected_tier}, got {top_cand['budget_tier']}"
        traveler_level = data["traveler"]["budget_level"]
        if isinstance(expected_budget_level, list):
            assert traveler_level in expected_budget_level
        else:
            assert traveler_level == expected_budget_level
        print(f"\n[SUCCESS] {label} tier verified: Top destination '{data['destination']['name']}' is budget_tier {top_cand['budget_tier']} (INR {top_cand.get('estimated_daily_inr')}/day)")

if __name__ == "__main__":
    test_health()
    test_model3_recommendations_contract()
    test_specific_destination_id_lookup()
    test_budget_tiers()
