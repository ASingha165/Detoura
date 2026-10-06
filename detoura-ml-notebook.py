# ============================================
# DETOURA — MODEL 1
# Content-Based Destination Recommender
# ============================================

import os
import ast
import numpy as np
import pandas as pd

from sklearn.metrics.pairwise import cosine_similarity

print("============================================")
print("DETOURA — MODEL 1")
print("Content-Based Destination Recommender")
print("============================================")

# ============================================
# CELL 2 — LOCATE DETOURA DATASET
# ============================================

import os

print("Searching Kaggle input directory...\n")

for root, dirs, files in os.walk("/kaggle/input"):
    for file in files:
        print(os.path.join(root, file))

# ============================================
# CELL 3 — LOAD DETOURA DATASET
# ============================================

csv_files = []

for root, dirs, files in os.walk("/kaggle/input"):
    for file in files:
        if file.lower().endswith(".csv"):
            csv_files.append(os.path.join(root, file))

print("CSV files found:")
for path in csv_files:
    print(" -", path)

if not csv_files:
    raise FileNotFoundError("No CSV file found in /kaggle/input")

# Prefer the DETOURA master dataset
master_files = [
    path for path in csv_files
    if "master-v2" in os.path.basename(path).lower()
]

CSV_PATH = master_files[0] if master_files else csv_files[0]

print("\nUsing:")
print(CSV_PATH)

df = pd.read_csv(CSV_PATH)

print("\nDataset loaded successfully!")
print("Shape:", df.shape)

# ============================================
# CELL 4 — DATASET VALIDATION
# ============================================

EXPECTED_ROWS = 515
EXPECTED_COLUMNS = 24

print("Rows:", len(df))
print("Columns:", len(df.columns))

assert len(df) == EXPECTED_ROWS, (
    f"Expected {EXPECTED_ROWS} rows, found {len(df)}"
)

assert len(df.columns) == EXPECTED_COLUMNS, (
    f"Expected {EXPECTED_COLUMNS} columns, found {len(df.columns)}"
)

print("\n✓ Row count validated")
print("✓ Column count validated")
print("✓ DETOURA master dataset is ready")

# ============================================
# CELL 5 — INSPECT DATASET SCHEMA
# ============================================

print("DETOURA DATASET COLUMNS")
print("=" * 50)

for i, column in enumerate(df.columns, start=1):
    print(f"{i:02d}. {column}")
# Preview the dataset
display(df.head(5))

# ============================================
# CELL 6 — VALIDATE PREFERENCE FEATURES
# ============================================

PREFERENCE_FEATURES = [
    "nature",
    "adventure",
    "culture",
    "relaxation"
]

print("Checking Model 1 features...\n")

for feature in PREFERENCE_FEATURES:
    print(f"{feature}:")
    print(f"  Data type : {df[feature].dtype}")
    print(f"  Missing   : {df[feature].isna().sum()}")
    print(f"  Minimum   : {df[feature].min()}")
    print(f"  Maximum   : {df[feature].max()}")
    print()

# ============================================
# CELL 7 — DESTINATION VECTOR SPACE
# ============================================

destination_matrix = (
    df[PREFERENCE_FEATURES]
    .astype(float)
    .to_numpy()
)

print("Destination matrix created.")
print("Shape:", destination_matrix.shape)
print("Dimensions:", destination_matrix.shape[1])

assert destination_matrix.shape[0] == 515
assert destination_matrix.shape[1] == 4

print("\n✓ 515 destinations")
print("✓ 4 preference dimensions")
print("✓ Vector space ready")

# ============================================
# CELL 8 — INSPECT DESTINATION VECTORS
# ============================================

vector_preview = df[
    ["name", "district"] + PREFERENCE_FEATURES
].head(10)

display(vector_preview)

# ============================================
# CELL 9 — USER PREFERENCE VECTOR
# ============================================

user_preferences = {
    "nature": 0.90,
    "adventure": 0.60,
    "culture": 0.30,
    "relaxation": 0.80
}

user_vector = np.array([
    user_preferences[feature]
    for feature in PREFERENCE_FEATURES
], dtype=float).reshape(1, -1)

print("User preferences:")
for feature, value in user_preferences.items():
    print(f"  {feature:12} = {value:.2f}")

print("\nUser vector:")
print(user_vector)

print("\nVector shape:", user_vector.shape)

assert user_vector.shape == (1, 4)
assert np.all(user_vector >= 0)
assert np.all(user_vector <= 1)

print("✓ User preference vector is valid")

# ============================================
# CELL 10 — COSINE SIMILARITY
# ============================================

similarity_scores = cosine_similarity(
    user_vector,
    destination_matrix
)[0]

print("Similarity calculation complete.")
print("Number of scores:", len(similarity_scores))

print("\nFirst 10 similarity scores:")
print(similarity_scores[:10])

assert len(similarity_scores) == 515
assert np.all(similarity_scores >= 0)
assert np.all(similarity_scores <= 1)

print("\n✓ 515 destinations compared")
print("✓ Similarity range is valid [0, 1]")

# ============================================
# CELL 11 — ATTACH SIMILARITY SCORES
# ============================================

df["similarity_score"] = similarity_scores

display(
    df[
        [
            "destination_id",
            "name",
            "district",
            "nature",
            "adventure",
            "culture",
            "relaxation",
            "similarity_score"
        ]
    ].head(10)
)

# ============================================
# CELL 12 — RANK DESTINATIONS
# ============================================

ranked_destinations = (
    df
    .sort_values(
        by="similarity_score",
        ascending=False
    )
    .reset_index(drop=True)
)

ranked_destinations["rank"] = (
    ranked_destinations.index + 1
)

print("Top 10 DETOURA recommendations")
print("=" * 70)

display(
    ranked_destinations[
        [
            "rank",
            "name",
            "district",
            "category",
            "similarity_score"
        ]
    ].head(10)
)

# ============================================
# CELL 13 — MODEL 1 VALIDATION
# ============================================

print("MODEL 1 VALIDATION")
print("=" * 60)

# 1. Check number of destinations
assert len(ranked_destinations) == 515
print("✓ 515 destinations ranked")

# 2. Check similarity values
assert ranked_destinations["similarity_score"].between(0, 1).all()
print("✓ All similarity scores are within [0, 1]")

# 3. Check ranking order
scores = ranked_destinations["similarity_score"].to_numpy()

assert np.all(scores[:-1] >= scores[1:])
print("✓ Destinations correctly sorted by similarity")

# 4. Check ranks
assert ranked_destinations["rank"].tolist() == list(range(1, 516))
print("✓ Ranking numbers are correct")

# 5. Check duplicate destination IDs
assert ranked_destinations["destination_id"].is_unique
print("✓ Destination IDs are unique")

print("\nMODEL 1 VALIDATION PASSED ✓")

# ============================================
# CELL 14 — COSINE SIMILARITY SANITY TEST
# ============================================

test_vector = np.array([
    [0.90, 0.60, 0.30, 0.80]
])

test_similarity = cosine_similarity(
    test_vector,
    test_vector
)[0][0]

print("Test vector:", test_vector[0])
print("Similarity with itself:", test_similarity)

assert np.isclose(test_similarity, 1.0)

print("\n✓ Mathematical sanity test passed")

# ============================================
# CELL 15 — REUSABLE RECOMMENDER
# ============================================

def recommend_destinations(
    nature,
    adventure,
    culture,
    relaxation,
    top_k=10
):
    """
    Content-based destination recommender.

    User preference vector:
    [Nature, Adventure, Culture, Relaxation]

    Returns the top-k destinations ranked
    by cosine similarity.
    """

    # Validate preference values
    preferences = [
        nature,
        adventure,
        culture,
        relaxation
    ]

    if not all(0 <= value <= 1 for value in preferences):
        raise ValueError(
            "All preference values must be between 0 and 1."
        )

    if top_k < 1:
        raise ValueError(
            "top_k must be at least 1."
        )

    # Create user vector
    user_vector = np.array(
        preferences,
        dtype=float
    ).reshape(1, -1)

    # Calculate similarity against all destinations
    similarity_scores = cosine_similarity(
        user_vector,
        destination_matrix
    )[0]

    # Copy dataset
    results = df.copy()

    # Attach similarity
    results["similarity_score"] = similarity_scores

    # Rank
    results = (
        results
        .sort_values(
            "similarity_score",
            ascending=False
        )
        .head(top_k)
        .reset_index(drop=True)
    )

    results["rank"] = (
        results.index + 1
    )

    return results

# ============================================
# CELL 16 — TEST RECOMMENDER FUNCTION
# ============================================

results = recommend_destinations(
    nature=0.90,
    adventure=0.60,
    culture=0.30,
    relaxation=0.80,
    top_k=10
)

display(
    results[
        [
            "rank",
            "destination_id",
            "name",
            "district",
            "category",
            "similarity_score"
        ]
    ]
)

# ============================================
# CELL 17 — MULTIPLE USER PROFILES
# ============================================

profiles = {
    "Nature & Relaxation": {
        "nature": 0.95,
        "adventure": 0.30,
        "culture": 0.20,
        "relaxation": 0.95
    },

    "Adventure": {
        "nature": 0.70,
        "adventure": 0.95,
        "culture": 0.20,
        "relaxation": 0.30
    },

    "Culture": {
        "nature": 0.30,
        "adventure": 0.20,
        "culture": 0.95,
        "relaxation": 0.50
    },

    "Balanced": {
        "nature": 0.70,
        "adventure": 0.70,
        "culture": 0.70,
        "relaxation": 0.70
    }
}

for profile_name, preferences in profiles.items():

    results = recommend_destinations(
        **preferences,
        top_k=5
    )

    print("\n" + "=" * 60)
    print(profile_name)
    print("=" * 60)

    display(
        results[
            [
                "rank",
                "name",
                "district",
                "similarity_score"
            ]
        ]
    )

# ============================================
# MODEL 2 — STEP 1
# BASELINE CROWD PRESSURE INDEX
# ============================================

BASE_CPI_COLUMN = "crowd_pressure_index"

df["base_cpi"] = df[BASE_CPI_COLUMN].astype(float)

print("BASELINE CROWD PRESSURE INDEX (CPI)")
print("=" * 50)

print(f"Minimum : {df['base_cpi'].min():.6f}")
print(f"Maximum : {df['base_cpi'].max():.6f}")
print(f"Mean    : {df['base_cpi'].mean():.6f}")
print(f"Median  : {df['base_cpi'].median():.6f}")
print(f"Missing : {df['base_cpi'].isna().sum()}")

print("\n✓ Baseline CPI loaded from master dataset")
print("✓ This value represents historical/static pressure")
print("✓ Live crowd data will be incorporated separately")

# ============================================
# BASELINE CPI VALIDATION
# ============================================

assert df["base_cpi"].notna().all(), \
    "Baseline CPI contains missing values"

assert df["base_cpi"].between(0.001, 1.0).all(), \
    "Baseline CPI values outside expected range"

print("✓ No missing baseline CPI values")
print("✓ Baseline CPI values are within [0.001, 1.0]")
print("✓ Baseline CPI validation passed")

# ============================================
# MODEL 2 — STEP 1.2
# LIVE CPI ADAPTER
# ============================================

def get_live_cpi(base_cpi, live_crowd_signal=None):
    """
    Convert the baseline CPI into a dynamic CPI.

    Parameters
    ----------
    base_cpi : float
        Historical/static CPI from the master dataset.

    live_crowd_signal : float or None
        Normalized live crowd signal in [0, 1].
        None means no live signal is currently available.

    Returns
    -------
    float
        Dynamic CPI in [0.001, 1.0].
    """

    # No live signal available:
    # temporarily use the historical baseline.
    if live_crowd_signal is None:
        return float(
            np.clip(base_cpi, 0.001, 1.0)
        )

    if not 0 <= live_crowd_signal <= 1:
        raise ValueError(
            "live_crowd_signal must be between 0 and 1."
        )

    # Blend historical baseline and live signal.
    # Live signal receives greater weight.
    live_cpi = (
        0.30 * base_cpi +
        0.70 * live_crowd_signal
    )

    return float(
        np.clip(live_cpi, 0.001, 1.0)
    )

# ============================================
# CREATE DYNAMIC CPI
# ============================================

df["live_cpi"] = df["base_cpi"].apply(
    lambda x: get_live_cpi(x)
)

print("Dynamic CPI generated.")
print("Destinations:", len(df))

display(
    df[
        [
            "name",
            "base_cpi",
            "live_cpi"
        ]
    ].head(10)
)

# ============================================
# DYNAMIC CPI VALIDATION
# ============================================

assert df["live_cpi"].notna().all()

assert df["live_cpi"].between(
    0.001, 1.0
).all()

print("✓ No missing dynamic CPI values")
print("✓ Dynamic CPI remains within [0.001, 1.0]")
print("✓ Live CPI interface is ready")

# ============================================
# ATTRACTION DIVERSITY PROXY
# ============================================

df["attraction_diversity"] = (
    df["osm_attraction_count"]
    .astype(float)
)

print("Attraction diversity proxy created.")

display(
    df[
        [
            "name",
            "osm_attraction_count",
            "attraction_diversity"
        ]
    ].head(10)
)

# ============================================
# RAW AUS CALCULATION
# ============================================

df["AUS"] = (
    df["attraction_diversity"] *
    (1 + df["avg_ndvi"])
) / (
    1 +
    np.log(
        1 +
        df["osm_hotel_count"] +
        df["historical_review_volume_proxy"]
    )
)

print("Raw AUS calculated.")

display(
    df[
        [
            "name",
            "attraction_diversity",
            "avg_ndvi",
            "osm_hotel_count",
            "historical_review_volume_proxy",
            "AUS"
        ]
    ].head(10)
)

# ============================================
# CALIBRATED UNDERRATED SCORE
# ============================================

df["underrated_score_calculated"] = (
    0.053894 * df["AUS"]
    + 0.149564
)

print("Calibrated underrated score calculated.")

display(
    df[
        [
            "name",
            "AUS",
            "underrated_score_calculated"
        ]
    ].head(10)
)

# ============================================
# AUS VALIDATION
# ============================================

assert df["AUS"].notna().all()
assert np.isfinite(df["AUS"]).all()

assert df["underrated_score_calculated"].notna().all()
assert np.isfinite(
    df["underrated_score_calculated"]
).all()

print("✓ AUS contains no NaN values")
print("✓ AUS contains no infinite values")
print("✓ Calibrated underrated scores are valid")
print("✓ AUS calculation passed")

# ============================================
# SSI — PARSE CLIMATE ARRAYS
# ============================================

TEMP_COLUMN = "climate_temp_c"
RAIN_COLUMN = "climate_rain_mm"


def parse_monthly_array(value, column_name):
    if isinstance(value, list):
        values = value
    else:
        values = ast.literal_eval(value)

    if len(values) != 12:
        raise ValueError(
            f"{column_name} must contain exactly 12 values. "
            f"Found {len(values)}."
        )

    values = [float(x) for x in values]

    if not np.all(np.isfinite(values)):
        raise ValueError(
            f"{column_name} contains invalid numeric values."
        )

    return values


df["monthly_temperature"] = df[TEMP_COLUMN].apply(
    lambda x: parse_monthly_array(x, TEMP_COLUMN)
)

df["monthly_rainfall"] = df[RAIN_COLUMN].apply(
    lambda x: parse_monthly_array(x, RAIN_COLUMN)
)

print("✓ Temperature arrays parsed")
print("✓ Rainfall arrays parsed")
print("✓ 12 monthly values available per destination")

# ============================================
# SSI — TEMPERATURE UTILITY
# ============================================

COMFORT_CENTER = 20.0
TEMPERATURE_SIGMA = 5.0


def temperature_utility(temp_c):
    utility = np.exp(
        -0.5 * (
            (temp_c - COMFORT_CENTER)
            / TEMPERATURE_SIGMA
        ) ** 2
    )

    return float(
        np.clip(utility, 0.0, 1.0)
    )


print("Temperature utility sanity check:")

for temp in [5, 10, 15, 20, 25, 30, 35]:
    print(
        f"{temp:2d}°C → "
        f"{temperature_utility(temp):.4f}"
    )

# ============================================
# SSI — RAINFALL UTILITY
# ============================================

def rainfall_utility(rainfall_mm):

    if rainfall_mm < 50:
        return 1.0

    if rainfall_mm > 150:
        return 0.0

    return float(
        (150 - rainfall_mm) / 100
    )


print("Rainfall utility sanity check:")

for rain in [0, 25, 49, 50, 75, 100, 125, 150, 200]:
    print(
        f"{rain:3d} mm → "
        f"{rainfall_utility(rain):.2f}"
    )

# ============================================
# SSI — CLIMATE ARRAY VALIDATION
# ============================================

assert len(df["monthly_temperature"]) == 515
assert len(df["monthly_rainfall"]) == 515

assert all(
    len(values) == 12
    for values in df["monthly_temperature"]
)

assert all(
    len(values) == 12
    for values in df["monthly_rainfall"]
)

assert all(
    np.all(np.isfinite(values))
    for values in df["monthly_temperature"]
)

assert all(
    np.all(np.isfinite(values))
    for values in df["monthly_rainfall"]
)

print("✓ 515 temperature arrays validated")
print("✓ 515 rainfall arrays validated")
print("✓ 12 months present for every destination")
print("✓ Climate dataset is ready for SSI")

# ============================================
# SSI — SELECT MONTH & CALCULATE SSI
# ============================================

SELECTED_MONTH = 9
MONTH_INDEX = SELECTED_MONTH - 1

df["selected_temperature"] = df[
    "monthly_temperature"
].apply(lambda values: values[MONTH_INDEX])

df["selected_rainfall"] = df[
    "monthly_rainfall"
].apply(lambda values: values[MONTH_INDEX])

df["temperature_utility"] = df[
    "selected_temperature"
].apply(temperature_utility)

df["rainfall_utility"] = df[
    "selected_rainfall"
].apply(rainfall_utility)

df["SSI"] = (
    df["temperature_utility"] *
    df["rainfall_utility"]
)

print(f"✓ SSI calculated for month {SELECTED_MONTH}")

display(
    df[
        [
            "name",
            "selected_temperature",
            "selected_rainfall",
            "temperature_utility",
            "rainfall_utility",
            "SSI"
        ]
    ].head(10)
)

# ============================================
# SSI VALIDATION
# ============================================

assert df["SSI"].notna().all()
assert np.isfinite(df["SSI"]).all()
assert df["SSI"].between(0.0, 1.0).all()

print("✓ No missing SSI values")
print("✓ No infinite SSI values")
print("✓ SSI values are within [0, 1]")
print("✓ SSI validation passed")

# ============================================
# DYNAMIC SCORING — USER PREFERENCES
# ============================================

PREFERENCE_AXES = [
    "nature",
    "adventure",
    "culture",
    "relaxation"
]

def create_preference_vector(
    nature=0.5,
    adventure=0.5,
    culture=0.5,
    relaxation=0.5
):
    vector = np.array([
        nature,
        adventure,
        culture,
        relaxation
    ], dtype=float)

    if np.any(vector < 0) or np.any(vector > 1):
        raise ValueError(
            "Preferences must be between 0 and 1."
        )

    return vector


user_vector = create_preference_vector(
    nature=0.8,
    adventure=0.5,
    culture=0.4,
    relaxation=0.7
)

print("User preference vector:")
print(user_vector)

# ============================================
# DYNAMIC WEIGHTS
# ============================================

def calculate_dynamic_weights(user_vector):

    preference_strength = np.mean(user_vector)

    w_sim = 0.40 + (0.15 * preference_strength)
    w_season = 0.20
    w_crowd = 0.20
    w_underrated = 1.0 - (
        w_sim + w_season + w_crowd
    )

    return {
        "similarity": w_sim,
        "season": w_season,
        "crowd": w_crowd,
        "underrated": w_underrated
    }


weights = calculate_dynamic_weights(
    user_vector
)

print("DYNAMIC WEIGHTS")
print("=" * 40)

for name, weight in weights.items():
    print(f"{name:15}: {weight:.4f}")

print(
    f"\nWeight total: "
    f"{sum(weights.values()):.4f}"
)

# ============================================
# WEIGHT VALIDATION
# ============================================

assert all(
    0 <= weight <= 1
    for weight in weights.values()
)

assert np.isclose(
    sum(weights.values()),
    1.0
)

print("✓ All weights are within [0, 1]")
print("✓ Weight sum = 1.0")
print("✓ Dynamic weighting validated")

# ============================================
# MODEL 2 — PRE-SCORING CHECK
# ============================================

print("CURRENT DATAFRAME COLUMNS")
print("=" * 60)

for i, column in enumerate(df.columns):
    print(f"{i:3}: {column}")

# ============================================
# MODEL 2 — FINAL DETOURA SCORE
# ============================================

SIM_COLUMN = "similarity_score"
SSI_COLUMN = "SSI"
CPI_COLUMN = "live_cpi"
UNDERRATED_COLUMN = "underrated_score_calculated"

df["detoura_score"] = (
    weights["similarity"] * df[SIM_COLUMN]
    + weights["season"] * df[SSI_COLUMN]
    - weights["crowd"] * df[CPI_COLUMN]
    + weights["underrated"] * df[UNDERRATED_COLUMN]
)

print("✓ Final DETOURA score calculated")

display(
    df[
        [
            "name",
            SIM_COLUMN,
            SSI_COLUMN,
            CPI_COLUMN,
            UNDERRATED_COLUMN,
            "detoura_score"
        ]
    ]
    .sort_values(
        "detoura_score",
        ascending=False
    )
    .head(10)
)

# ============================================
# FINAL SCORE VALIDATION
# ============================================

assert df["detoura_score"].notna().all()
assert np.isfinite(df["detoura_score"]).all()

print("✓ No missing final scores")
print("✓ No infinite final scores")
print("✓ DETOURA scoring completed")

# ============================================
# TOP 10 DETOURA RECOMMENDATIONS
# ============================================

top_10 = (
    df
    .sort_values(
        "detoura_score",
        ascending=False
    )
    .head(10)
    .reset_index(drop=True)
)

top_10.index += 1

display(
    top_10[
        [
            "name",
            "district",
            "category",
            "similarity_score",
            "SSI",
            "live_cpi",
            "underrated_score_calculated",
            "detoura_score"
        ]
    ]
)

# ============================================
# MODEL 2 — FINAL DETOURA SCORE
# ============================================

SIM_COLUMN = "similarity_score"
SSI_COLUMN = "SSI"
CPI_COLUMN = "live_cpi"
UNDERRATED_COLUMN = "underrated_score_calculated"

# Select travel month dynamically
SELECTED_MONTH = 1   # 1 = January ... 12 = December
MONTH_INDEX = SELECTED_MONTH - 1

# Calculate SSI for the selected month
df["selected_temperature"] = df[
    "monthly_temperature"
].apply(lambda values: values[MONTH_INDEX])

df["selected_rainfall"] = df[
    "monthly_rainfall"
].apply(lambda values: values[MONTH_INDEX])

df["temperature_utility"] = df[
    "selected_temperature"
].apply(temperature_utility)

df["rainfall_utility"] = df[
    "selected_rainfall"
].apply(rainfall_utility)

df["SSI"] = (
    df["temperature_utility"]
    * df["rainfall_utility"]
)

# Final DETOURA score
df["detoura_score"] = (
    weights["similarity"] * df[SIM_COLUMN]
    + weights["season"] * df[SSI_COLUMN]
    - weights["crowd"] * df[CPI_COLUMN]
    + weights["underrated"] * df[UNDERRATED_COLUMN]
)

print(f"✓ Final DETOURA score calculated")
print(f"✓ Selected travel month: {SELECTED_MONTH}")

display(
    df[
        [
            "name",
            SIM_COLUMN,
            SSI_COLUMN,
            CPI_COLUMN,
            UNDERRATED_COLUMN,
            "detoura_score"
        ]
    ]
    .sort_values(
        "detoura_score",
        ascending=False
    )
    .head(10)
)

# ============================================
# SSI + FINAL SCORE DIAGNOSTIC
# ============================================

print("SSI DISTRIBUTION")
print("=" * 50)

print(f"Minimum : {df['SSI'].min():.6f}")
print(f"Maximum : {df['SSI'].max():.6f}")
print(f"Mean    : {df['SSI'].mean():.6f}")
print(f"Median  : {df['SSI'].median():.6f}")
print(f"Zero SSI: {(df['SSI'] == 0).sum()} / {len(df)}")

print("\nSEPTEMBER RAINFALL")
print("=" * 50)

print(
    df["selected_rainfall"]
    .describe()
)

print("\nFINAL SCORE")
print("=" * 50)

print(f"Minimum : {df['detoura_score'].min():.6f}")
print(f"Maximum : {df['detoura_score'].max():.6f}")
print(f"Mean    : {df['detoura_score'].mean():.6f}")

# ============================================
# SSI — ALL MONTHS DIAGNOSTIC
# ============================================

monthly_ssi_summary = []

for month in range(1, 13):

    month_index = month - 1

    temp_values = df["monthly_temperature"].apply(
        lambda values: values[month_index]
    )

    rain_values = df["monthly_rainfall"].apply(
        lambda values: values[month_index]
    )

    temp_utilities = temp_values.apply(
        temperature_utility
    )

    rain_utilities = rain_values.apply(
        rainfall_utility
    )

    ssi_values = (
        temp_utilities * rain_utilities
    )

    monthly_ssi_summary.append({
        "month": month,
        "mean_temperature": temp_values.mean(),
        "mean_rainfall": rain_values.mean(),
        "mean_SSI": ssi_values.mean(),
        "max_SSI": ssi_values.max(),
        "zero_SSI_count": (ssi_values == 0).sum()
    })

ssi_monthly_df = pd.DataFrame(
    monthly_ssi_summary
)

display(ssi_monthly_df)

# ============================================
# FINAL SCORE DIAGNOSTICS
# ============================================

print("FINAL DETOURA SCORE DIAGNOSTICS")
print("=" * 55)

print(f"Selected month : {SELECTED_MONTH}")

print("\nSSI")
print(f"Minimum : {df['SSI'].min():.6f}")
print(f"Maximum : {df['SSI'].max():.6f}")
print(f"Mean    : {df['SSI'].mean():.6f}")
print(f"Median  : {df['SSI'].median():.6f}")
print(f"Zero SSI: {(df['SSI'] == 0).sum()} / {len(df)}")

print("\nFINAL SCORE")
print(f"Minimum : {df['detoura_score'].min():.6f}")
print(f"Maximum : {df['detoura_score'].max():.6f}")
print(f"Mean    : {df['detoura_score'].mean():.6f}")
print(f"Median  : {df['detoura_score'].median():.6f}")

# ============================================
# FINAL DETOURA SCORE VALIDATION
# ============================================

assert df["detoura_score"].notna().all()
assert np.isfinite(df["detoura_score"]).all()

assert df["SSI"].between(0.0, 1.0).all()
assert df["live_cpi"].between(0.001, 1.0).all()
assert df["underrated_score_calculated"].between(0.01, 0.99).all()

print("✓ No missing final scores")
print("✓ No infinite final scores")
print("✓ SSI values valid")
print("✓ Live CPI values valid")
print("✓ Underrated scores valid")
print("✓ FINAL DETOURA SCORE VALIDATION PASSED")

# ============================================
# MODEL 2 — TOP 10 RECOMMENDATIONS
# ============================================

top_10 = (
    df
    .sort_values(
        "detoura_score",
        ascending=False
    )
    .head(10)
    .reset_index(drop=True)
)

top_10.index = top_10.index + 1

print("TOP 10 DETOURA RECOMMENDATIONS")
print("=" * 70)
print(f"Travel month: {SELECTED_MONTH}")
print()

display(
    top_10[
        [
            "name",
            "district",
            "category",
            "similarity_score",
            "SSI",
            "live_cpi",
            "underrated_score_calculated",
            "detoura_score"
        ]
    ]
)

# ============================================
# DETOURA — CLEAN RECOMMENDATION OUTPUT
# ============================================

recommendations = (
    df
    .sort_values(
        "detoura_score",
        ascending=False
    )
    .head(10)
    .copy()
)

recommendations["rank"] = range(
    1,
    len(recommendations) + 1
)

recommendations = recommendations[
    [
        "rank",
        "destination_id",
        "name",
        "district",
        "category",
        "latitude",
        "longitude",
        "similarity_score",
        "SSI",
        "live_cpi",
        "underrated_score_calculated",
        "detoura_score"
    ]
]

display(recommendations)

# ============================================
# MODEL 2 — EXPORT RECOMMENDATION DATA
# ============================================

OUTPUT_COLUMNS = [
    "destination_id",
    "name",
    "district",
    "category",
    "latitude",
    "longitude",
    "similarity_score",
    "SSI",
    "live_cpi",
    "underrated_score_calculated",
    "detoura_score"
]

model2_output = df[OUTPUT_COLUMNS].copy()

model2_output = model2_output.sort_values(
    "detoura_score",
    ascending=False
).reset_index(drop=True)

model2_output.to_csv(
    "detoura_model2_recommendations.csv",
    index=False
)

print("✓ Model 2 recommendation dataset exported")
print(f"✓ Destinations: {len(model2_output)}")
print("✓ File: detoura_model2_recommendations.csv")

# ============================================
# MODEL 2 — EXPORT VALIDATION
# ============================================

loaded_output = pd.read_csv(
    "detoura_model2_recommendations.csv"
)

assert len(loaded_output) == 515
assert loaded_output["destination_id"].notna().all()
assert loaded_output["detoura_score"].notna().all()

assert loaded_output["detoura_score"].is_monotonic_decreasing

print("✓ 515 destinations exported")
print("✓ Destination IDs present")
print("✓ Scores present")
print("✓ Ranking order preserved")
print("✓ MODEL 2 EXPORT VALIDATED")

