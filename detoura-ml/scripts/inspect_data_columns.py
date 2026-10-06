import sqlite3
import pandas as pd

conn = sqlite3.connect('../detoura_master-v2.db')
for t in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
    tname = t[0]
    df = pd.read_sql(f"SELECT * FROM {tname} LIMIT 1", conn)
    print(f"Table {tname}: {df.columns.tolist()}")

df_wb = pd.read_csv('../detoura_west_bengal_master-v2.csv')
print("Master CSV columns:", df_wb.columns.tolist())
sample = df_wb.iloc[0].to_dict()
print("Sample row keys and sample attraction/activity columns:", {k: v for k, v in sample.items() if any(w in k.lower() for w in ['name', 'attr', 'activ', 'tag', 'desc', 'distr', 'type', 'cat'])})
