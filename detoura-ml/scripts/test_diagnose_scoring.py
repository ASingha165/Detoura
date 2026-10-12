import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import sqlite3
import pandas as pd
from recommender import recommend_destinations

weights = {'w_sim': 1.0, 'w_season': 1.0, 'w_crowd': 1.0, 'w_gem': 1.0}

profiles = {
    "PROFILE A (High nature & serenity, low culture)": {
        'nature': 0.95, 'adventure': 0.30, 'culture': 0.10, 'relaxation': 0.95
    },
    "PROFILE B (High cultural heritage & food, lower nature)": {
        'nature': 0.20, 'adventure': 0.80, 'culture': 0.95, 'relaxation': 0.40
    },
    "PROFILE C (High adventure, lower tranquility, budget tier 1)": {
        'nature': 0.50, 'adventure': 0.95, 'culture': 0.30, 'relaxation': 0.20
    }
}

for name, prefs in profiles.items():
    print(f"\n=======================================================")
    print(f"Testing {name}")
    print(f"Preferences: {prefs}")
    print(f"=======================================================")
    tier = 1 if "budget tier 1" in name else None
    df = recommend_destinations(prefs, weights, month=10, budget_tier=tier)
    for i, r in df.head(10).iterrows():
        print(f"{i+1:2d}. {r['destination_id']} | {r['name']:<35} | {r['district']:<18} | Score: {r['detoura_score']:.4f} | Sim: {r['similarity_score']:.4f} | SSI: {r['ssi_calculated']:.4f} | CPI: {r['cpi_used']:.4f} | AUS: {r['underrated_score']:.4f}")
