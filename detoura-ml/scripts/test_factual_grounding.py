import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
from gemma_service import GemmaService

gemma = GemmaService.get_instance()
print("Gemma loaded:", gemma.is_loaded)

# Test Destination 1: Toryok Town Center (Cultural/Urban in Darjeeling)
dest_toryok = {
    "id": "WB_DAR_011",
    "name": "Toryok Town Center",
    "district": "Darjeeling",
    "category": "Cultural/Urban",
    "latitude": 27.0591,
    "longitude": 88.0194
}

# Test Destination 2: Banpara Forest Deer Park (Forest/Wildlife in Dakshin Dinajpur)
dest_banpara = {
    "id": "WB_DDI_009",
    "name": "Banpara Forest Deer Park",
    "district": "Dakshin Dinajpur",
    "category": "Forest/Wildlife",
    "latitude": 25.4786,
    "longitude": 88.9072
}

intel = {
    "match_score": 0.85,
    "ssi": 0.92,
    "live_cpi": 0.02,
    "underrated_score": 0.75
}

traveler = {
    "travel_style": "Nature",
    "place_preferences": ["Nature", "Forest/Wildlife"],
    "budget_level": "Medium",
    "travel_month": "October",
    "trip_days": 3
}

print("\n--- Testing Banpara Forest Deer Park ---")
res_banpara = gemma.generate_recommendation_intelligence(dest_banpara, intel, traveler)
print("Banpara Metadata:", res_banpara["generation_metadata"])
print("Banpara Explanation:", res_banpara["explanation"])
print("Banpara Activities:", json.dumps(res_banpara["activities"], indent=2))
print("Banpara Day 1:", res_banpara["itinerary"]["Day 1"])

print("\n--- Testing Toryok Town Center ---")
res_toryok = gemma.generate_recommendation_intelligence(dest_toryok, intel, traveler)
print("Toryok Metadata:", res_toryok["generation_metadata"])
print("Toryok Explanation:", res_toryok["explanation"])
print("Toryok Activities:", json.dumps(res_toryok["activities"], indent=2))
print("Toryok Day 1:", res_toryok["itinerary"]["Day 1"])
