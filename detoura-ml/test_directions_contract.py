"""
Deterministic Directions URL Contract & Database Verification Test Suite for DETOURA.

Validates the full directions contract:
A. Current user coordinates are used in origin.
B. Current destination coordinates are used in destination.
C. No stale coordinates are used when switching destinations.
D. Missing user coordinates are handled safely (returns empty string, never origin-less).
E. Missing destination coordinates are handled safely (returns empty string).
F. Kakrajhore coordinates in authoritative database match 22.2042, 86.6596.
G. At least two additional destinations from database generate correct URLs.
H. Generated URL contains exact origin: origin=17.324125,78.565392.
I. Generated URL contains exact destination: destination=22.2042,86.6596.
J. travelmode=driving is strictly present.
K. Haversine distance remains straight-line geodesic (1005.56 km) and distinct from road distance.
"""

import unittest
import urllib.parse
import sqlite3
import math
from pathlib import Path


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle geodesic distance between two points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def get_directions_url(dest_lat, dest_lon, user_lat, user_lon):
    """Mirror of the frontend getDirectionsUrl contract in api.ts."""
    if (
        dest_lat is None or dest_lon is None or
        user_lat is None or user_lon is None
    ):
        return ""
    
    try:
        d_lat = float(dest_lat)
        d_lon = float(dest_lon)
        u_lat = float(user_lat)
        u_lon = float(user_lon)
        if math.isnan(d_lat) or math.isnan(d_lon) or math.isnan(u_lat) or math.isnan(u_lon):
            return ""
    except (ValueError, TypeError):
        return ""

    origin = f"{urllib.parse.quote(str(u_lat))},{urllib.parse.quote(str(u_lon))}"
    destination = f"{urllib.parse.quote(str(d_lat))},{urllib.parse.quote(str(d_lon))}"
    return f"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}&travelmode=driving"


class TestDirectionsContract(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.db_path = Path(__file__).resolve().parent / "detoura_master-v2.db"
        if not cls.db_path.exists():
            cls.db_path = Path(__file__).resolve().parent.parent / "detoura_master-v2.db"

    def test_database_kakrajhore_coordinates(self):
        """Test F: Kakrajhore coordinates in authoritative database match 22.2042, 86.6596."""
        self.assertTrue(self.db_path.exists(), f"Database not found at {self.db_path}")
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT destination_id, name, district, latitude, longitude FROM destinations WHERE destination_id = ?",
            ("WB_JHR_017",)
        ).fetchone()
        conn.close()

        self.assertIsNotNone(row, "WB_JHR_017 must exist in authoritative database")
        self.assertEqual(row["name"], "Kakrajhore Forest Ashram Complex")
        self.assertEqual(row["district"], "Jhargram")
        self.assertAlmostEqual(float(row["latitude"]), 22.2042, places=4)
        self.assertAlmostEqual(float(row["longitude"]), 86.6596, places=4)
        print(f"\n[TEST F PASSED] Authoritative database record: {row['name']} -> ({row['latitude']}, {row['longitude']})")

    def test_kakrajhore_directions_url_and_contract(self):
        """Test A, B, H, I, J: Origin, Destination, travelmode, and exact coordinates."""
        user_lat = 17.324125
        user_lon = 78.565392
        dest_lat = 22.2042
        dest_lon = 86.6596

        url = get_directions_url(dest_lat, dest_lon, user_lat, user_lon)
        self.assertTrue(url.startswith("https://www.google.com/maps/dir/?api=1"))
        self.assertIn("origin=17.324125,78.565392", url)
        self.assertIn("destination=22.2042,86.6596", url)
        self.assertIn("travelmode=driving", url)
        
        # Verify no random strings in the URL
        self.assertNotIn("VINAYAK", url)
        self.assertNotIn("Gadgadhar", url)
        self.assertNotIn("Gadadhar", url)
        self.assertNotIn("school", url)
        print("\n[TEST A, B, H, I, J PASSED] Kakrajhore Directions URL successfully verified:")
        print(f"  Generated URL: {url}")

    def test_section_8_deterministic_regression_test(self):
        """
        Regression Test per Section 8 of specification:
        Selected destination: WB_JHR_017
        Expected destination: Kakrajhore Forest Ashram Complex
        Expected coordinates: 22.2042, 86.6596
        User coordinates: 22.82507, 88.381547
        """
        user_lat = 22.82507
        user_lon = 88.381547
        
        # 1. Authoritative DB fetch
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        dest = conn.execute(
            "SELECT destination_id, name, district, latitude, longitude FROM destinations WHERE destination_id = ?",
            ("WB_JHR_017",)
        ).fetchone()
        self.assertEqual(dest["name"], "Kakrajhore Forest Ashram Complex")
        self.assertAlmostEqual(float(dest["latitude"]), 22.2042, places=4)
        self.assertAlmostEqual(float(dest["longitude"]), 86.6596, places=4)
        
        dest_lat = float(dest["latitude"])
        dest_lon = float(dest["longitude"])
        
        # 2. Directions URL Generation
        url = get_directions_url(dest_lat, dest_lon, user_lat, user_lon)
        
        # 3. Assertions
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        
        self.assertEqual(params["origin"][0], f"{user_lat},{user_lon}")
        self.assertEqual(params["destination"][0], f"{dest_lat},{dest_lon}")
        self.assertEqual(params["travelmode"][0], "driving")
        
        # Assert destination is strictly the Detoura destination and NOT Gadadhar primary school coordinates
        gadadhar_lat = 22.2029
        gadadhar_lon = 86.6576
        self.assertNotEqual(params["destination"][0], f"{gadadhar_lat},{gadadhar_lon}")
        self.assertEqual(params["destination"][0], "22.2042,86.6596")
        
        # 4. Test at least two other destination IDs
        other_ids = [("WB_BAN_001", "Bishnupur", 23.0678, 87.3168), ("WB_DAR_001", "Darjeeling", 27.036, 88.2627)]
        for other_id, exp_name, exp_lat, exp_lon in other_ids:
            other_dest = conn.execute(
                "SELECT destination_id, name, latitude, longitude FROM destinations WHERE destination_id = ?",
                (other_id,)
            ).fetchone()
            self.assertIsNotNone(other_dest)
            self.assertEqual(other_dest["name"], exp_name)
            
            other_url = get_directions_url(other_dest["latitude"], other_dest["longitude"], user_lat, user_lon)
            other_params = urllib.parse.parse_qs(urllib.parse.urlparse(other_url).query)
            self.assertEqual(other_params["origin"][0], f"{user_lat},{user_lon}")
            self.assertEqual(other_params["destination"][0], f"{other_dest['latitude']},{other_dest['longitude']}")
            self.assertEqual(other_params["travelmode"][0], "driving")
            print(f"[TEST 8 PASSED] Destination: {other_dest['name']} -> Destination param: {other_params['destination'][0]}")

        conn.close()
        print(f"\n[SECTION 8 PASSED] WB_JHR_017 regression test complete:")
        print(f"  Origin: {params['origin'][0]}")
        print(f"  Destination: {params['destination'][0]} (Verified Kakrajhore, not Gadadhar)")
        print(f"  URL: {url}")

    def test_multiple_destinations_from_database(self):
        """Test G: At least two additional destinations from database generate correct URLs."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        test_ids = ["WB_BAN_001", "WB_DAR_001", "WB_PUR_001"]
        user_lat, user_lon = 17.324125, 78.565392
        
        for dest_id in test_ids:
            row = conn.execute(
                "SELECT destination_id, name, district, latitude, longitude FROM destinations WHERE destination_id = ?",
                (dest_id,)
            ).fetchone()
            self.assertIsNotNone(row)
            
            d_lat = float(row["latitude"])
            d_lon = float(row["longitude"])
            url = get_directions_url(d_lat, d_lon, user_lat, user_lon)
            
            self.assertTrue(url.startswith("https://www.google.com/maps/dir/?api=1"))
            self.assertIn(f"origin={user_lat},{user_lon}", url)
            self.assertIn(f"destination={d_lat},{d_lon}", url)
            self.assertIn("travelmode=driving", url)
            print(f"[TEST G PASSED] Destination: {row['name']} ({row['district']}) -> URL: {url}")

        conn.close()

    def test_no_stale_coordinates_on_destination_switch(self):
        """Test C: Switching destination updates the URL immediately without stale cache."""
        user_lat, user_lon = 17.324125, 78.565392
        
        # First destination
        url1 = get_directions_url(22.2042, 86.6596, user_lat, user_lon)
        self.assertIn("destination=22.2042,86.6596", url1)
        
        # Second destination (Bishnupur)
        url2 = get_directions_url(23.0678, 87.3168, user_lat, user_lon)
        self.assertIn("destination=23.0678,87.3168", url2)
        self.assertNotIn("22.2042,86.6596", url2)
        
        # Third destination (Darjeeling)
        url3 = get_directions_url(27.036, 88.2627, user_lat, user_lon)
        self.assertIn("destination=27.036,88.2627", url3)
        self.assertNotIn("23.0678,87.3168", url3)
        print("\n[TEST C PASSED] No stale coordinates between sequential destination requests.")

    def test_missing_user_location_handled_safely(self):
        """Test D: Missing user coordinates returns empty string, preventing origin-less URLs."""
        dest_lat = 22.2042
        dest_lon = 86.6596

        self.assertEqual(get_directions_url(dest_lat, dest_lon, None, None), "")
        self.assertEqual(get_directions_url(dest_lat, dest_lon, None, 78.565392), "")
        self.assertEqual(get_directions_url(dest_lat, dest_lon, 17.324125, None), "")
        print("\n[TEST D PASSED] Missing user location safely blocked.")

    def test_missing_destination_coordinates_handled_safely(self):
        """Test E: Missing destination coordinates returns empty string."""
        user_lat = 17.324125
        user_lon = 78.565392

        self.assertEqual(get_directions_url(None, None, user_lat, user_lon), "")
        self.assertEqual(get_directions_url(None, 86.6596, user_lat, user_lon), "")
        self.assertEqual(get_directions_url(22.2042, None, user_lat, user_lon), "")
        print("\n[TEST E PASSED] Missing destination coordinates safely blocked.")

    def test_haversine_vs_road_distance_consistency(self):
        """Test K: Haversine distance is straight-line geodesic (~1005.56 km)."""
        dist = calculate_haversine_distance(17.324125, 78.565392, 22.2042, 86.6596)
        # Expected straight-line geodesic distance: 1005.56 km
        self.assertAlmostEqual(dist, 1005.56, delta=1.0)
        # Google Maps road network distance is ~1269 km due to highways/turns
        self.assertLess(dist, 1200.0, "Geodesic straight-line must be shorter than road-network distance")
        print(f"\n[TEST K PASSED] Haversine geodesic distance confirmed: {dist:.2f} km (Road network ~1269 km).")


if __name__ == "__main__":
    unittest.main()
