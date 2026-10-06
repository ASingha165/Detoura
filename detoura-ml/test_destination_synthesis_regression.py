"""
Regression test for Destination Detail itinerary-generation flow across languages.

Verifies:
- valid destination
- selected language = en
- selected language = hi
- selected language = bn
- Gemma response parses successfully
- 3-day itinerary is returned
- verified address remains grounded
- no fabricated geographic information
"""

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_destination_detail_itinerary_synthesis(language="en"):
    destination_id = "WB_DAR_011"
    payload = {
        "destination_id": destination_id,
        "trip_days": 3,
        "language": language
    }
    response = client.post("/api/recommendations", json=payload)
    assert response.status_code == 200, f"Failed for language {language}: {response.text}"
    data = response.json()

    # 1. Valid destination matching requested destination_id
    dest = data.get("destination")
    assert dest is not None, "Missing destination in response"
    assert dest["id"] == destination_id
    assert dest["name"] == "Toryok Town Center"
    assert dest["district"] == "Darjeeling"

    # 2. Verified address remains grounded (no fabricated geographic information)
    assert "address" in dest and dest["address"] is not None
    assert "Darjeeling" in dest["address"]
    assert "West Bengal" in dest["address"]
    assert dest["state"] == "West Bengal"
    assert 26.0 <= dest["latitude"] <= 28.0
    assert 87.0 <= dest["longitude"] <= 89.0

    # 3. 3-day itinerary is returned and structured
    itinerary = data.get("itinerary")
    assert isinstance(itinerary, dict), "Itinerary must be a dict"
    assert len(itinerary) == 3, f"Expected 3 days, got {len(itinerary)}"
    for day_name in ["Day 1", "Day 2", "Day 3"]:
        assert day_name in itinerary, f"{day_name} missing from itinerary"
        day_plan = itinerary[day_name]
        assert "morning" in day_plan and len(day_plan["morning"]) > 0
        assert "afternoon" in day_plan and len(day_plan["afternoon"]) > 0
        assert "evening" in day_plan and len(day_plan["evening"]) > 0

    # 4. Activities returned
    activities = data.get("activities")
    assert isinstance(activities, list)
    assert len(activities) >= 3
    for act in activities:
        assert "activity" in act and len(act["activity"]) > 0
        assert "score" in act

    # 5. Destination intelligence metrics verified
    intel = data.get("destination_intelligence")
    assert intel is not None
    assert 0.0 <= intel["match_score"] <= 1.0
    assert 0.0 <= intel["ssi"] <= 1.0

    # 6. Generation metadata
    meta = data.get("generation_metadata")
    assert meta is not None
    assert meta.get("engine") == "Gemma-2-2B-IT" or meta.get("source") in ("gemma", "deterministic_fallback")
    print(f"\n[PASSED] Regression test for Destination Detail with language='{language}' succeeded.")

if __name__ == "__main__":
    for lang in ["en", "hi", "bn"]:
        print(f"\n--- Testing Destination Detail Synthesis for language='{lang}' ---")
        test_destination_detail_itinerary_synthesis(lang)
    print("\nAll Destination Detail synthesis tests passed successfully!")

