import requests
import json

url = 'http://127.0.0.1:8000/api/recommendations'
payload = {
    'user_prefs': {'nature': 0.85, 'relaxation': 0.90, 'culture': 0.70, 'adventure': 0.65},
    'weights': {'w_sim': 1.0, 'w_season': 1.0, 'w_crowd': 1.0, 'w_gem': 1.0},
    'month': 10,
    'trip_days': 3,
    'travel_style': 'Nature'
}

try:
    response = requests.post(url, json=payload, timeout=2.0)
except Exception:
    from fastapi.testclient import TestClient
    from app import app
    client = TestClient(app)
    response = client.post('/api/recommendations', json=payload)

if response.status_code != 200:
    print(f"Error {response.status_code}: {response.text}")
    exit(1)

res = response.json()
intel = res['destination_intelligence']
top_dest = res['destination']
recs = res['recommendations']

print("=== LIVE BACKEND INTELLIGENCE CONTRACT ===")
print(f"Destination: {top_dest['name']} ({top_dest['id']}) in {top_dest['district']}")
print(f"Raw detoura_score (top candidate): {recs[0]['detoura_score']:.4f}")
print(f"Backend match_score (normalized): {intel['match_score']} (SSI: {intel['ssi']}, CPI: {intel['live_cpi']}, Underrated: {intel['underrated_score']})")

max_score = max([r.get('detoura_score', 2.0) for r in recs] + [2.0])

# Top AI highlight card display calculation
top_highlight_raw = intel['match_score']
top_highlight_norm = top_highlight_raw / 2.5 if top_highlight_raw > 1.0 else top_highlight_raw
top_highlight_pct = min(max(round(top_highlight_norm * 100), 50), 99)

print(f"\nTop AI Highlight Card Display: {top_highlight_pct}% Match")
print("\n=== TOP 5 RECOMMENDATION CARDS DISPLAY ===")
print(f"{'#':<3} {'Destination':<35} {'District':<15} {'Raw Score':<12} {'Contract Score':<16} {'Rendered Display':<18}")
print("-" * 105)

for idx, r in enumerate(recs[:5]):
    is_top = (idx == 0)
    raw_top = intel['match_score']
    norm_top = min(raw_top / max_score, 0.98) if raw_top > 1.0 else raw_top
    cand_score = min(max(r['detoura_score'] / max_score, 0.65), 0.98)
    final_score = norm_top if is_top else cand_score
    
    # Recommendations.tsx card formula:
    card_score = final_score / 2.5 if final_score > 1.0 else final_score
    display_pct = min(max(round(card_score * 100), 50), 99)
    
    print(f"{idx+1:<3} {r['name']:<35} {r['district']:<15} {r['detoura_score']:<12.4f} {final_score:<16.4f} {display_pct}% Match")
