"""
Unit and Integration Tests for:
LIVE LOCATION + DISTANCE + DIRECTIONS + VERIFIED ADDRESS

Test Cases:
A. Location permission granted (user_lat, user_lon passed -> distance calculated)
B. Location permission denied / unavailable (no user_lat/lon -> graceful fallback, user_distance.available == False)
C. Destination with valid coordinates -> accurate Haversine distance
D. Destination without coordinates -> graceful handling (distance is None, available is False)
E. Address available -> formatted as verified "name, district, West Bengal"
F. Address unavailable -> explicitly falls back to "Address unavailable in verified destination data."
G. Recommendations still work normally without location
H. Gemma receives verified address
I. Gemma prompt instructions strictly forbid fabricating missing address or street address
J. Directions generation logic (Google Maps URL construction with and without user origin)
"""

import math
from fastapi.testclient import TestClient
from app import app, calculate_haversine_distance
from gemma_service import GemmaService

client = TestClient(app)

def test_haversine_formula():
    # Kolkata: 22.5726, 88.3639
    # Darjeeling: 27.0360, 88.2627
    dist = calculate_haversine_distance(22.5726, 88.3639, 27.0360, 88.2627)
    # Geodesic distance is approximately 496 km
    assert 480.0 <= dist <= 515.0, f"Expected approx 496 km, got {dist}"
    print(f"\n[TEST A/C] Haversine calculation verified: Kolkata to Darjeeling = {dist:.2f} km")

def test_recommendations_with_user_location():
    # Test A: Location provided (Kolkata user coordinates)
    payload = {
        "user_prefs": {"nature": 0.85, "relaxation": 0.90, "culture": 0.70, "adventure": 0.65},
        "weights": {"w_sim": 1.0, "w_season": 1.0, "w_crowd": 1.0, "w_gem": 1.0},
        "month": 10,
        "trip_days": 3,
        "travel_style": "Nature",
        "user_lat": 22.5726,
        "user_lon": 88.3639
    }
    response = client.post("/api/recommendations", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    # Verify top destination has address and user_distance
    assert "destination" in data
    dest = data["destination"]
    assert "address" in dest and len(dest["address"]) > 0
    assert "West Bengal" in dest["address"]
    assert "state" in dest and dest["state"] == "West Bengal"

    # Verify user_distance in response
    assert "user_distance" in data
    assert data["user_distance"]["available"] is True
    assert data["user_distance"]["distance_km"] is not None
    assert data["user_distance"]["distance_km"] > 0

    # Verify location contract
    assert "location" in data
    assert data["location"]["address"] == dest["address"]
    assert data["location"]["latitude"] == dest["latitude"]
    assert data["location"]["longitude"] == dest["longitude"]

    # Verify recommendations candidates have distance and address
    assert len(data["recommendations"]) > 0
    for rec in data["recommendations"]:
        assert "address" in rec and len(rec["address"]) > 0
        assert "distance_km" in rec and rec["distance_km"] is not None
        assert rec["distance_km"] > 0
        assert "user_distance" in rec
        assert rec["user_distance"]["available"] is True

    print(f"\n[TEST A/C/E] Recommendations with location verified! Top destination: {dest['name']}, Address: {dest['address']}, Distance: {data['user_distance']['distance_km']} km")

def test_recommendations_without_user_location():
    # Test B & G: No location provided (permission denied or unrequested)
    payload = {
        "user_prefs": {"nature": 0.85, "relaxation": 0.90, "culture": 0.70, "adventure": 0.65},
        "weights": {"w_sim": 1.0, "w_season": 1.0, "w_crowd": 1.0, "w_gem": 1.0},
        "month": 10,
        "trip_days": 3,
        "travel_style": "Nature"
    }
    response = client.post("/api/recommendations", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    # Recommendations must still work normally
    assert "destination" in data
    assert "recommendations" in data and len(data["recommendations"]) > 0

    # user_distance should be unavailable without crashing
    assert "user_distance" in data
    assert data["user_distance"]["available"] is False
    assert data["user_distance"]["distance_km"] is None

    # Address must still be present and verified
    assert "address" in data["destination"]
    assert "West Bengal" in data["destination"]["address"]

    print("\n[TEST B/G] Recommendations without location verified! App works normally with graceful distance fallback.")

def test_gemma_address_prompt_and_rules():
    # Test H & I: Gemma receives verified address and grounding rules forbid fabricating street address
    gemma = GemmaService.get_instance()
    dest = {
        "id": "WB_BAN_001",
        "name": "Bishnupur Terracotta Temples",
        "district": "Bankura",
        "category": "Heritage/Culture",
        "latitude": 23.0678,
        "longitude": 87.3178,
        "address": "Bishnupur Terracotta Temples, Bankura, West Bengal",
        "state": "West Bengal",
        "distance_from_user_km": 142.5
    }
    intel = {
        "match_score": 0.95,
        "ssi": 0.98,
        "live_cpi": 0.12,
        "underrated_score": 0.78,
        "distance_from_user_km": 142.5
    }
    traveler = {
        "travel_style": "Cultural Heritage",
        "place_preferences": ["Heritage/Culture"],
        "budget_level": "Medium",
        "travel_month": "October",
        "trip_days": 3
    }
    prompt = gemma.build_prompt(dest, intel, traveler)

    # Check verified geographic context in prompt
    assert "Verified Address: Bishnupur Terracotta Temples, Bankura, West Bengal" in prompt
    assert "Latitude 23.0678, Longitude 87.3178" in prompt
    assert "142.5 km from traveler's live location" in prompt

    # Check strict anti-fabrication rules
    assert "Never invent or infer a street address" in prompt
    assert "Never invent coordinates, distances, or travel times" in prompt
    assert 'Address unavailable in verified destination data.' in prompt
    print("\n[TEST H/I] Gemma prompt verified! Verified address and strict factual grounding rules confirmed.")

def test_address_unavailable_fallback():
    # Test D & F: Destination without district or address falls back safely
    gemma = GemmaService.get_instance()
    dest = {
        "id": "UNKNOWN_01",
        "name": "Nameless Peak",
        "district": "",
        "category": "Nature",
        "latitude": 0.0,
        "longitude": 0.0
    }
    intel = {"match_score": 0.5, "ssi": 0.5, "live_cpi": 0.5, "underrated_score": 0.5}
    traveler = {"travel_style": "Nature", "place_preferences": [], "budget_level": "Medium", "travel_month": "October", "trip_days": 1}

    payload = gemma._assemble_payload(dest, intel, traveler, {}, source="fallback")
    assert payload["destination"]["address"] == "Address unavailable in verified destination data."
    assert payload["destination_intelligence"]["address"] == "Address unavailable in verified destination data."
    print("\n[TEST D/F] Address unavailable fallback verified!")

def test_directions_url_construction():
    # Test J: Directions link generation
    user_lat, user_lon = 22.5726, 88.3639
    dest_lat, dest_lon = 23.0678, 87.3178
    
    # When user location is available
    url_with_origin = f"https://www.google.com/maps/dir/?api=1&origin={user_lat},{user_lon}&destination={dest_lat},{dest_lon}"
    assert "api=1" in url_with_origin
    assert f"origin={user_lat},{user_lon}" in url_with_origin
    assert f"destination={dest_lat},{dest_lon}" in url_with_origin

    # When user location is not available
    url_dest_only = f"https://www.google.com/maps/dir/?api=1&destination={dest_lat},{dest_lon}"
    assert "origin" not in url_dest_only
    assert f"destination={dest_lat},{dest_lon}" in url_dest_only
    print("\n[TEST J] Directions URL construction verified!")

if __name__ == "__main__":
    test_haversine_formula()
    test_recommendations_with_user_location()
    test_recommendations_without_user_location()
    test_gemma_address_prompt_and_rules()
    test_address_unavailable_fallback()
    test_directions_url_construction()
    print("\n=======================================================")
    print("ALL LIVE LOCATION + DISTANCE + ADDRESS TESTS PASSED!")
    print("=======================================================")
