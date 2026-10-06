import json, sqlite3, pandas as pd, numpy as np
from recommender import calculate_ssi, calculate_final_score, calculate_cosine_similarity
from pathlib import Path

db_path = Path('..') / 'detoura_master-v2.db'
conn = sqlite3.connect(db_path)
df = pd.read_sql_query('SELECT * FROM destinations', conn)
conn.close()

def parse_monthly(val):
    if isinstance(val, str):
        return [float(x) for x in json.loads(val)]
    return list(val)

df['monthly_temperature'] = df['climate_temp_c'].apply(parse_monthly)
df['monthly_rainfall'] = df['climate_rain_mm'].apply(parse_monthly)

user_vec = np.array([0.85, 0.65, 0.70, 0.90])
dest_features = df[['nature', 'adventure', 'culture', 'relaxation']].values
df['similarity'] = calculate_cosine_similarity(user_vec, dest_features)

for month_num, month_name in [(1, 'January'), (9, 'September')]:
    idx = month_num - 1
    ssis = [calculate_ssi(t[idx], r[idx]) for t, r in zip(df['monthly_temperature'], df['monthly_rainfall'])]
    df[f'ssi_{month_name}'] = ssis
    scores = [
        calculate_final_score(sim, ssi, cpi if pd.notnull(cpi) else 0.5, und, 1.0, 1.0, 1.0, 1.0)
        for sim, ssi, cpi, und in zip(df['similarity'], ssis, df['crowd_pressure_index'], df['underrated_score'])
    ]
    df[f'score_{month_name}'] = scores
    print(f'=== {month_name} (Month {month_num}) Top 3 ===')
    top = df.sort_values(f'score_{month_name}', ascending=False).head(3)
    for _, row in top.iterrows():
        print(f"  {row['name']} ({row['district']}): Score={row[f'score_{month_name}']:.4f}, SSI={row[f'ssi_{month_name}']:.4f}, Temp={row['monthly_temperature'][idx]}C, Rain={row['monthly_rainfall'][idx]}mm")
