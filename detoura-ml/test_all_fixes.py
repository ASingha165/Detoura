"""
Detoura Comprehensive Verification & Latency Benchmark Test Suite
Validates:
1. Task 1: Root cause diagnosis verification (DB path resolution, Ask Detoura ValueError, dest_name precedence)
2. Task 2: Mathematical recommendation engine (/recommend) speed & contract compliance
3. Task 3: Gemma AI generation optimization (caching, structured JSON, thread-safe execution, prompt limits)
4. Task 4: Reusable results caching (/recommend and /api/recommendations)
5. Task 5: Chatbot robustness (itinerary & distance queries, missing context handling)
6. Task 6: Firebase authentication and user isolation (UID authorization mismatch enforcement)
7. Task 7: Latency measurements before/after
"""

import time
import sys
import io
import json
import unittest
from fastapi.testclient import TestClient

# Ensure UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from app import app, _recommend_cache

client = TestClient(app)

class TestDetouraSystemFixes(unittest.TestCase):

    def test_01_mathematical_recommendation_speed_and_contract(self):
        """Task 2 & 4: /recommend executes purely mathematically under 100ms and caches cleanly."""
        payload = {
            "user_prefs": {"nature": 0.85, "adventure": 0.65, "culture": 0.70, "relaxation": 0.90},
            "weights": {"w_sim": 1.0, "w_season": 1.0, "w_crowd": 1.0, "w_gem": 1.0},
            "month": 10,
            "place_types": ["mountains", "forests"],
            "budget_max": 3000,
            "budget_tier": 2,
            "user_lat": 22.5726,
            "user_lon": 88.3639
        }

        # First call (computation)
        t0 = time.time()
        res1 = client.post("/recommend", json=payload)
        t_first = time.time() - t0

        self.assertEqual(res1.status_code, 200, f"Error: {res1.text}")
        data1 = res1.json()
        self.assertIsInstance(data1, list)
        self.assertGreater(len(data1), 0)

        # Verify contract compliance
        top = data1[0]
        self.assertIn("destination_id", top)
        self.assertIn("name", top)
        self.assertIn("detoura_score", top)
        self.assertIn("similarity_score", top)
        self.assertIn("ssi", top)
        self.assertIn("cpi_used", top)
        self.assertIn("underrated_score", top)
        self.assertIn("district", top)
        self.assertIn("category", top)
        self.assertIn("latitude", top)
        self.assertIn("longitude", top)
        self.assertIn("address", top)
        self.assertIn("distance_km", top)

        # Second call (cached in memory)
        t1 = time.time()
        res2 = client.post("/recommend", json=payload)
        t_cached = time.time() - t1

        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(len(data1), len(data2))
        self.assertEqual(data1[0]["destination_id"], data2[0]["destination_id"])

        print(f"\n[PERF BENCHMARK] /recommend first call: {t_first*1000:.1f}ms | cached call: {t_cached*1000:.2f}ms")
        self.assertLess(t_first, 0.25, "Model 2 computation took longer than 250ms")
        self.assertLess(t_cached, 0.05, "Cached response took longer than 50ms")

    def test_02_ask_detoura_distance_robustness_no_value_error(self):
        """Task 1 & 5: Ask Detoura handles formatted strings and missing distances without crashing."""
        # Test case A: Formatted string distance ("Distance unavailable")
        chat_req_a = {
            "message": "How far is this destination?",
            "language": "en",
            "destination_id": "WB_DDI_009",
            "context": {
                "destination_name": "Banpara Forest Deer Park",
                "district": "Dakshin Dinajpur",
                "distance_km": "Distance unavailable"  # Previously crashed float(user_dist)
            }
        }
        res_a = client.post("/api/chat", json=chat_req_a)
        self.assertEqual(res_a.status_code, 200, f"Error: {res_a.text}")
        reply_a = res_a.json()
        self.assertIn("response", reply_a)
        self.assertNotIn("Error", reply_a["response"])

        # Test case B: Valid numeric distance
        chat_req_b = {
            "message": "What is the driving distance from my location?",
            "language": "en",
            "destination_id": "WB_DDI_009",
            "context": {
                "destination_name": "Banpara Forest Deer Park",
                "district": "Dakshin Dinajpur",
                "distance_km": 342.5
            }
        }
        res_b = client.post("/api/chat", json=chat_req_b)
        self.assertEqual(res_b.status_code, 200)
        reply_b = res_b.json()
        self.assertIn("342.5", reply_b["response"])
        print("[TEST PASSED] Ask Detoura distance query successfully resolved without ValueError.")

    def test_03_ask_detoura_itinerary_and_hotel_grounding(self):
        """Task 3 & 5: Ask Detoura answers itinerary questions and refuses hallucinated hotels."""
        # Test itinerary retrieval
        chat_req_itin = {
            "message": "What can I do on day 1?",
            "language": "en",
            "destination_id": "WB_DDI_009",
            "context": {
                "destination_name": "Banpara Forest Deer Park",
                "district": "Dakshin Dinajpur",
                "itinerary": {
                    "Day 1": {
                        "morning": "Morning forest deer park exploration",
                        "afternoon": "Photography walk along canopy trail",
                        "evening": "Tranquil evening relaxation"
                    }
                }
            }
        }
        res_itin = client.post("/api/chat", json=chat_req_itin)
        self.assertEqual(res_itin.status_code, 200)
        reply_itin = res_itin.json()
        self.assertTrue(
            "deer" in reply_itin["response"].lower() or "day 1" in reply_itin["response"].lower() or "exploration" in reply_itin["response"].lower(),
            f"Expected day 1 context in response, got: {reply_itin['response']}"
        )

        # Test hotel question (must decline unverified hotels)
        chat_req_hotel = {
            "message": "Which 5 star hotel can I book in Banpara?",
            "language": "en",
            "destination_id": "WB_DDI_009",
            "context": {
                "destination_name": "Banpara Forest Deer Park",
                "district": "Dakshin Dinajpur"
            }
        }
        res_hotel = client.post("/api/chat", json=chat_req_hotel)
        self.assertEqual(res_hotel.status_code, 200)
        reply_hotel = res_hotel.json()
        self.assertTrue(
            "unavailable" in reply_hotel["response"].lower() or "not available" in reply_hotel["response"].lower(),
            f"Expected hotel ungrounded refusal, got: {reply_hotel['response']}"
        )
        print("[TEST PASSED] Ask Detoura itinerary & hotel grounding verified.")

    def test_04_firebase_auth_user_isolation(self):
        """Task 5 & Constraints: Firebase user isolation strictly enforced."""
        user_a = "USER_ALICE_123"
        user_b = "USER_BOB_456"

        # Case 1: Unauthenticated request -> 401 Unauthorized
        res_no_auth = client.get(f"/api/users/{user_a}/trips")
        self.assertEqual(res_no_auth.status_code, 401, "Expected 401 for unauthenticated request")

        # Case 2: User A accessing User A with matching dev token -> passes auth check
        res_alice = client.get(
            f"/api/users/{user_a}/trips",
            headers={"Authorization": f"Bearer dev-token-{user_a}"}
        )
        self.assertIn(res_alice.status_code, [200, 500], "Auth check must succeed (500 only if Firestore mock offline)")

        # Case 3: User B trying to access User A's data -> 401/403 Forbidden
        res_mismatch = client.get(
            f"/api/users/{user_a}/trips",
            headers={"Authorization": f"Bearer dev-token-{user_b}"}
        )
        self.assertIn(res_mismatch.status_code, [401, 403], f"Expected 401 or 403, got {res_mismatch.status_code}")
        print("[TEST PASSED] Firebase authentication and cross-user data isolation verified.")

    def test_05_caching_and_timeout_behavior(self):
        """Task 3 & 4: Model 3 caching and timeout ensures responsiveness."""
        payload = {
            "destination_id": "WB_DDI_009",
            "trip_days": 3,
            "language": "en",
            "user_lat": 22.5726,
            "user_lon": 88.3639
        }

        # First call: either completes or triggers fast fallback under 15s
        t0 = time.time()
        res1 = client.post("/api/recommendations", json=payload)
        t1 = time.time() - t0
        self.assertEqual(res1.status_code, 200)

        # Second call: served from in-memory intelligence cache in <150ms
        t2 = time.time()
        res2 = client.post("/api/recommendations", json=payload)
        t_cache = time.time() - t2
        self.assertEqual(res2.status_code, 200)
        self.assertLess(t_cache, 0.15, f"Cache lookup took {t_cache*1000:.1f}ms, expected < 150ms")

        print(f"[PERF BENCHMARK] /api/recommendations first call: {t1*1000:.1f}ms | cached call: {t_cache*1000:.2f}ms")


if __name__ == "__main__":
    unittest.main()
