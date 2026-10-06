import json
from pathlib import Path
from recommender import recommend_destinations

db_path = Path("..") / "detoura_master-v2.db"
user_prefs = {"nature": 0.85, "adventure": 0.65, "culture": 0.70, "relaxation": 0.90}
weights = {"w_sim": 1.0, "w_season": 1.0, "w_crowd": 1.0, "w_gem": 1.0}

print("--- Test A: No placeTypes (Base Model 2) ---")
res_base = recommend_destinations(user_prefs, weights, month=None, db_path=db_path)
print(f"Base count: {len(res_base)}, Top destination: {res_base.iloc[0]['name']}, Score: {res_base.iloc[0]['detoura_score']:.4f}")

print("\n--- Test B: PlaceTypes Mountains + Forests ---")
res_places = recommend_destinations(user_prefs, weights, month=None, place_types=["mountains", "forests"], db_path=db_path)
print(f"Places count: {len(res_places)}, Top destination: {res_places.iloc[0]['name']}, Matches: {res_places.iloc[0]['place_type_matches']}, Score: {res_places.iloc[0]['detoura_score']:.4f}")

print("\n--- Test C & D: Month 1 (January) Climate ---")
res_jan = recommend_destinations(user_prefs, weights, month=1, db_path=db_path)
top_jan = res_jan.iloc[0]
print(f"Jan Top: {top_jan['name']} ({top_jan['district']}), SSI: {top_jan['ssi_calculated']:.4f}, Score: {top_jan['detoura_score']:.4f}")

print("\n--- Test E: Month 9 (September) Climate ---")
res_sep = recommend_destinations(user_prefs, weights, month=9, db_path=db_path)
top_sep = res_sep.iloc[0]
print(f"Sep Top: {top_sep['name']} ({top_sep['district']}), SSI: {top_sep['ssi_calculated']:.4f}, Score: {top_sep['detoura_score']:.4f}")

print("\n--- Test F: Budget Filter (budget_max=2000) ---")
res_budget = recommend_destinations(user_prefs, weights, budget_max=2000, db_path=db_path)
max_daily = res_budget['estimated_daily_inr'].max()
print(f"Budget count: {len(res_budget)}, Max daily: {max_daily} INR")
assert max_daily <= 2000, f"Expected <= 2000, got {max_daily}"

print("\nALL BACKEND MODEL 2 TESTS PASSED!")
