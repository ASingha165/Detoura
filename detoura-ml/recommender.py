import math
import json
import re
import numpy as np
import pandas as pd
import sqlite3
from pathlib import Path
from typing import List, Optional, Set, Union, Any
from sklearn.metrics.pairwise import cosine_similarity

def calculate_cosine_similarity(user_prefs: np.ndarray, dest_features: np.ndarray) -> np.ndarray:
    """
    Calculates cosine similarity between user preferences and destination features.
    Preference axes: [Nature, Adventure, Culture, Relaxation]
    """
    user_prefs_2d = user_prefs.reshape(1, -1)
    if dest_features.ndim == 1:
        dest_features = dest_features.reshape(1, -1)
    # Return 1D array of similarities
    return cosine_similarity(user_prefs_2d, dest_features).flatten()

def calculate_cpi(hotel_count_norm: float, poi_count_norm: float, review_proxy_norm: float) -> float:
    """
    Calculates Base Crowd Pressure Index (CPI).
    Expected range: [0.001, 1.0]
    """
    cpi = 0.45 * hotel_count_norm + 0.35 * poi_count_norm + 0.20 * review_proxy_norm
    return max(0.001, min(1.0, cpi))

def calculate_aus(attraction_diversity: float, ndvi: float, hotel_count: float, review_proxy: float) -> float:
    """
    Calculates AI-Estimated Underrated Score (AUS) and returns the calibrated score.
    """
    denominator = 1.0 + math.log(1.0 + hotel_count + review_proxy)
    aus = (attraction_diversity * (1.0 + ndvi)) / denominator
    calibrated_score = 0.053894 * aus + 0.149564
    return calibrated_score

def calculate_ssi(temperature: float, rainfall: float) -> float:
    """
    Calculates Season Suitability Index (SSI) based on TempUtility and RainUtility.
    Gaussian comfort centered around 20°C; Rainfall utility penalty over 50mm.
    """
    # Temperature utility: Gaussian comfort centered around 20°C
    sigma = 5.0
    temp_utility = math.exp(-0.5 * ((temperature - 20.0) / sigma) ** 2)
    
    # Rainfall utility
    if rainfall < 50.0:
        rain_utility = 1.0
    elif rainfall > 150.0:
        rain_utility = 0.0
    else:
        rain_utility = 1.0 - (rainfall - 50.0) / 100.0
        
    return temp_utility * rain_utility

def calculate_final_score(
    similarity: float,
    ssi: float,
    cpi: float,
    underrated_score: float,
    w_sim: float,
    w_season: float,
    w_crowd: float,
    w_gem: float
) -> float:
    """
    Calculates the final DETOURA score.
    Score = w_sim * Sim + w_season * SSI - w_crowd * CPI + w_gem * underrated_score
    """
    return (w_sim * similarity) + (w_season * ssi) - (w_crowd * cpi) + (w_gem * underrated_score)

def parse_monthly_climate(val) -> List[float]:
    """
    Safely parses 12-element monthly climate array strings using json.loads (never eval()).
    """
    if isinstance(val, list):
        return [float(x) for x in val]
    if isinstance(val, str):
        val = val.strip()
        if val.startswith('[') and val.endswith(']'):
            try:
                parsed = json.loads(val)
                if isinstance(parsed, list):
                    return [float(x) for x in parsed]
            except Exception:
                pass
            nums = re.findall(r"[-+]?(?:\d*\.\d+|\d+)", val)
            if nums:
                return [float(x) for x in nums]
    return []

def get_destination_place_types(row: pd.Series) -> List[str]:
    """
    Determines matching place types from existing destination metadata (category, district, name).
    Does NOT invent classifications. Maps cleanly against existing attributes.
    """
    types: Set[str] = set()
    category = str(row.get('category') or '').lower()
    district = str(row.get('district') or '').lower()
    name = str(row.get('name') or '').lower()
    elevation = row.get('elevation_m')
    try:
        elev = float(elevation) if elevation is not None and pd.notnull(elevation) else 0.0
    except (ValueError, TypeError):
        elev = 0.0

    # mountains
    if 'hill' in category or elev > 250 or any(k in name for k in ['hill', 'peak', 'ghat', 'mountain', 'ridge', 'pass', 'view point']):
        types.add('mountains')

    # coast & beaches
    if 'beach' in category or any(k in name for k in ['beach', 'sea', 'coast', 'shore', 'marine', 'digha', 'mandarmani', 'bakkhali', 'tajpur', 'shankarpur']) or district in ['purba medinipur', 'south 24 parganas']:
        types.add('coast')
        types.add('beaches')

    # forests & wildlife
    if 'forest' in category or any(k in name for k in ['forest', 'jungle', 'aranya', 'jhar', 'wildlife', 'sanctuary', 'national park', 'safari', 'reserve', 'sunderban', 'dooars', 'jaldapara', 'gorumara', 'buxa', 'neora', 'singalila', 'chapramari', 'range']):
        types.add('forests')
        types.add('wildlife')

    # waterfalls
    if any(k in name for k in ['fall', 'waterfall', 'jhora', 'cascade', 'spring', 'chhang']):
        types.add('waterfalls')

    # rivers_lakes
    if any(k in name for k in ['river', 'lake', 'ghat', 'dam', 'barrage', 'reservoir', 'teesta', 'ganga', 'hooghly', 'rupnarayan', 'damodar', 'torsa', 'jaldhaka', 'promenade', 'stream']):
        types.add('rivers_lakes')

    # heritage
    if 'heritage' in category or 'cultural' in category or any(k in name for k in ['heritage', 'palace', 'fort', 'rajbari', 'museum', 'archaeological', 'monument', 'historical', 'mound', 'ruins', 'memorial', 'imambara', 'hazarduari', 'cooch behar palace']):
        types.add('heritage')

    # spiritual
    if any(k in name for k in ['temple', 'mandir', 'math', 'church', 'mosque', 'masjid', 'ashram', 'monastery', 'dham', 'stupa', 'cathedral', 'shrine', 'peeth', 'pith']):
        types.add('spiritual')

    # countryside
    if 'nature' in category or any(k in name for k in ['village', 'gram', 'rural', 'eco', 'farm', 'valley', 'meadow', 'hamlet', 'countryside', 'retreat']):
        types.add('countryside')

    # tea_gardens
    if any(k in name for k in ['tea', 'chai', 'garden', 'estate', 'bagicha']) or (district in ['darjeeling', 'jalpaiguri', 'alipurduar', 'kalimpong'] and 'nature' in category):
        types.add('tea_gardens')

    # islands
    if any(k in name for k in ['island', 'dwip', 'dweep', 'sagar', 'delta']) or 'sunderban' in name:
        types.add('islands')

    return sorted(list(types))

def load_destinations(db_path: Path) -> pd.DataFrame:
    """
    Loads destination data from SQLite database and parses climate arrays.
    """
    candidate_paths = [
        Path(db_path),
        Path(__file__).resolve().parent / "detoura_master-v2.db",
        Path(__file__).resolve().parent.parent / "detoura_master-v2.db",
        Path(__file__).resolve().parent / "data" / "detoura_master-v2.db",
    ]
    resolved_path = None
    for p in candidate_paths:
        try:
            if p.is_file() and p.stat().st_size > 0:
                resolved_path = p
                break
        except Exception:
            continue

    if not resolved_path:
        resolved_path = Path(__file__).resolve().parent / "detoura_master-v2.db"

    try:
        conn = sqlite3.connect(resolved_path)
        df = pd.read_sql_query("SELECT * FROM destinations", conn)
        conn.close()

        if 'climate_temp_c' in df.columns:
            df['monthly_temperature'] = df['climate_temp_c'].apply(parse_monthly_climate)
        if 'climate_rain_mm' in df.columns:
            df['monthly_rainfall'] = df['climate_rain_mm'].apply(parse_monthly_climate)

        return df
    except sqlite3.Error as e:
        print(f"Database error during load: {e}")
        return pd.DataFrame()
def normalize_budget_tier(tier: Any) -> Optional[int]:
    """
    Normalizes budget tier values across formats:
    - 1, '1', 'daily', 'budget', 'budget friendly', 'low' -> 1
    - 2, '2', 'mid-range', 'midrange', 'mid range', 'moderate', 'medium' -> 2
    - 3, '3', 'premium', 'luxury', 'high' -> 3
    """
    if tier is None:
        return None
    if isinstance(tier, int):
        return tier if tier in (1, 2, 3) else None
    if isinstance(tier, float):
        try:
            i = int(tier)
            return i if i in (1, 2, 3) else None
        except Exception:
            return None
    s = str(tier).strip().lower()
    if s in ("1", "tier 1", "tier1", "daily", "budget", "budget friendly", "low"):
        return 1
    if s in ("2", "tier 2", "tier2", "mid-range", "midrange", "mid range", "moderate", "medium"):
        return 2
    if s in ("3", "tier 3", "tier3", "premium", "luxury", "high"):
        return 3
    try:
        i = int(s)
        return i if i in (1, 2, 3) else None
    except Exception:
        return None

def recommend_destinations(
    user_prefs: dict,
    weights: dict,
    month: Optional[int] = None,
    month_temp: float = 25.0,
    month_rain: float = 60.0,
    place_types: Optional[List[str]] = None,
    budget_max: Optional[float] = None,
    budget_tier: Optional[Union[int, str]] = None,
    db_path: Path = Path("detoura_master-v2.db")
) -> pd.DataFrame:
    """
    Main recommendation pipeline based on Validated Model-2.
    Integrates user month selection with existing destination climate arrays for SSI,
    and supports a separate preference layer for placeTypes and budget constraints.
    """
    df = load_destinations(db_path)
    if df.empty:
        return df
        
    # 1. Content similarity (Preserves exact 4D Model 2 vector [nature, adventure, culture, relaxation])
    user_vector = np.array([
        user_prefs.get('nature', 0.0),
        user_prefs.get('adventure', 0.0),
        user_prefs.get('culture', 0.0),
        user_prefs.get('relaxation', 0.0)
    ])
    
    feature_cols = ['nature', 'adventure', 'culture', 'relaxation']
    if all(col in df.columns for col in feature_cols):
        dest_features = df[feature_cols].fillna(0.0).values
        similarities = calculate_cosine_similarity(user_vector, dest_features)
        df['similarity_score'] = similarities
    else:
        df['similarity_score'] = 0.0

    scores = []
    ssi_values = []
    cpi_used_values = []
    place_type_matches_list = []
    place_match_count_list = []
    
    clean_selected_month: Optional[int] = None
    if month is not None:
        try:
            m_val = int(month)
            if 1 <= m_val <= 12:
                clean_selected_month = m_val
        except (ValueError, TypeError):
            clean_selected_month = None

    month_idx = (clean_selected_month - 1) if clean_selected_month is not None else None
    
    for idx, row in df.iterrows():
        # 2. CPI / live CPI - preserve distinction
        live_cpi = row.get('live_cpi')
        base_cpi = row.get('crowd_pressure_index')
        if base_cpi is None or pd.isna(base_cpi):
            base_cpi = row.get('base_cpi', 0.5)
        selected_cpi = live_cpi if pd.notnull(live_cpi) else base_cpi
        cpi: float = float(selected_cpi) if selected_cpi is not None and pd.notnull(selected_cpi) else 0.5
        cpi_used_values.append(cpi)
        
        # 3. AUS (Underrated Score)
        underrated = row.get('underrated_score', 0.0)
        
        # 4. Season Suitability Index (SSI)
        # If user selected a month (1-12), use destination's existing monthly climate data
        dest_temp = None
        dest_rain = None
        
        if month_idx is not None:
            m_temps = row.get('monthly_temperature')
            m_rains = row.get('monthly_rainfall')
            if isinstance(m_temps, (list, tuple)) and len(m_temps) > month_idx:
                dest_temp = m_temps[month_idx]
            if isinstance(m_rains, (list, tuple)) and len(m_rains) > month_idx:
                dest_rain = m_rains[month_idx]
        
        # Fallback to general month_temp / month_rain if monthly array is unavailable
        if dest_temp is None or pd.isna(dest_temp):
            dest_temp = row.get('selected_temperature', month_temp)
        if dest_rain is None or pd.isna(dest_rain):
            dest_rain = row.get('selected_rainfall', month_rain)
            
        if pd.isna(dest_temp):
            dest_temp = 25.0
        if pd.isna(dest_rain):
            dest_rain = 60.0
            
        ssi = calculate_ssi(float(dest_temp), float(dest_rain))
        ssi_values.append(ssi)
        
        # 5. Final Multi-criteria DETOURA score (Preserves Model 2 mathematical formula)
        final_score = calculate_final_score(
            similarity=row.get('similarity_score', 0.0),
            ssi=ssi,
            cpi=cpi,
            underrated_score=underrated,
            w_sim=weights.get('w_sim', 1.0),
            w_season=weights.get('w_season', 1.0),
            w_crowd=weights.get('w_crowd', 1.0),
            w_gem=weights.get('w_gem', 1.0)
        )
        scores.append(final_score)

        # 6. Separate Preference Layer: Evaluate place types
        dest_types = get_destination_place_types(row)
        if place_types and len(place_types) > 0:
            matched = [pt for pt in place_types if pt in dest_types]
            place_type_matches_list.append(matched)
            place_match_count_list.append(len(matched))
        else:
            place_type_matches_list.append([])
            place_match_count_list.append(0)
        
    df['detoura_score'] = scores
    df['ssi_calculated'] = ssi_values
    df['cpi_used'] = cpi_used_values
    df['place_type_matches'] = place_type_matches_list
    df['place_match_count'] = place_match_count_list
    
    # 7. Apply Budget Constraint (User filter layer, does not alter mathematical scoring)
    clean_tier = normalize_budget_tier(budget_tier)
    if clean_tier is not None:
        filtered_tier = df[df['budget_tier'] == clean_tier]
        if not filtered_tier.empty:
            df = filtered_tier

    if budget_max is not None and budget_max > 0:
        filtered_budget = df[df['estimated_daily_inr'] <= budget_max]
        if not filtered_budget.empty:
            df = filtered_budget

    # 8. Rank destinations
    # If place_types were requested, matching destinations are prioritized in the separate preference layer,
    # with exact Model 2 detoura_score ranking preserved.
    if place_types and len(place_types) > 0:
        df['has_place_match'] = df['place_match_count'] > 0
        df_ranked = df.sort_values(
            by=['has_place_match', 'place_match_count', 'detoura_score'],
            ascending=[False, False, False]
        ).reset_index(drop=True)
    else:
        df_ranked = df.sort_values(by='detoura_score', ascending=False).reset_index(drop=True)
    
    # 9. Return ranked recommendations
    return df_ranked
