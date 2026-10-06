import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import json
from gemma_service import GemmaService

def test_multilingual():
    gemma = GemmaService.get_instance()
    
    dest = {
        "id": "WB_DDI_009",
        "name": "Banpara Forest Deer Park",
        "district": "Dakshin Dinajpur",
        "category": "Forest/Wildlife",
        "latitude": 25.4786,
        "longitude": 88.9072,
        "address": "Banpara Forest, Dakshin Dinajpur, West Bengal"
    }

    intel = {
        "match_score": 0.88,
        "ssi": 0.95,
        "live_cpi": 0.03,
        "underrated_score": 0.80,
        "distance_from_user_km": 142.5
    }

    traveler = {
        "travel_style": "Nature Enthusiast",
        "place_preferences": ["Forests", "Wildlife"],
        "budget_level": "Medium",
        "travel_month": "October",
        "trip_days": 3
    }

    for lang in ["en", "hi", "bn"]:
        print(f"\n==========================================")
        print(f"TESTING LANGUAGE: {lang}")
        print(f"==========================================")
        
        # Test prompt construction
        prompt = gemma.build_prompt(dest, intel, traveler, language=lang)
        assert "Banpara Forest Deer Park" in prompt
        assert "Dakshin Dinajpur" in prompt
        assert "25.4786" in prompt
        assert "Banpara Forest, Dakshin Dinajpur, West Bengal" in prompt
        if lang == "hi":
            assert "TARGET GENERATION LANGUAGE: Hindi" in prompt
        elif lang == "bn":
            assert "TARGET GENERATION LANGUAGE: Bengali" in prompt
        else:
            assert "TARGET GENERATION LANGUAGE: English" in prompt
        print(f"[OK] Prompt correctly constructed for {lang}")

        # Test deterministic fallback
        fallback = gemma._generate_deterministic_fallback(dest, intel, traveler, language=lang)
        assert "explanation" in fallback
        assert "activities" in fallback
        assert len(fallback["activities"]) >= 3
        assert "itinerary" in fallback
        assert "Day 1" in fallback["itinerary"]
        assert "morning" in fallback["itinerary"]["Day 1"]
        
        # Destination name and district must remain intact
        assert "Banpara Forest Deer Park" in fallback["explanation"]
        assert "Dakshin Dinajpur" in fallback["explanation"]
        
        if lang == "hi":
            # Hindi text present
            assert any("\u0900" <= c <= "\u097F" for c in fallback["explanation"])
            assert any("\u0900" <= c <= "\u097F" for c in fallback["activities"][0]["activity"])
            print(f"[OK] Hindi fallback verified: {fallback['explanation'][:80]}...")
        elif lang == "bn":
            # Bengali text present
            assert any("\u0980" <= c <= "\u09FF" for c in fallback["explanation"])
            assert any("\u0980" <= c <= "\u09FF" for c in fallback["activities"][0]["activity"])
            print(f"[OK] Bengali fallback verified: {fallback['explanation'][:80]}...")
        else:
            assert "DETOURA matched" in fallback["explanation"]
            print(f"[OK] English fallback verified: {fallback['explanation'][:80]}...")

        # Test assembly payload contract
        payload = gemma._assemble_payload(dest, intel, traveler, fallback, source="deterministic_fallback", language=lang)
        assert payload["destination"]["id"] == "WB_DDI_009"
        assert payload["destination"]["name"] == "Banpara Forest Deer Park"
        assert payload["destination"]["district"] == "Dakshin Dinajpur"
        assert payload["destination"]["address"] == "Banpara Forest, Dakshin Dinajpur, West Bengal"
        assert len(payload["activities"]) > 0
        assert "Day 1" in payload["itinerary"]
        print(f"[OK] Payload contract verified for {lang}")

    print("\nALL MULTILINGUAL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_multilingual()
