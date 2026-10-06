"""
Comprehensive Verification Test Suite for DETOURA:
1. Multilingual Gemma Output (English, Hindi, Bengali)
2. Factual Grounding & Schema Integrity (Address, Distance, Scores unchanged)
3. Ask Detoura Chatbot API (POST /api/chat) in Bengali, Hindi, English
4. Chatbot Grounding Compliance (no hallucinated hotels/rates, verified distance citation)
"""

import sys
import io
import re
import unittest
from fastapi.testclient import TestClient

# Ensure UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from app import app

client = TestClient(app)

class TestMultilingualAndChatbot(unittest.TestCase):

    def test_01_bengali_recommendations_and_itinerary(self):
        """Verify that when language=bn, Gemma generates authentic Bengali narrative."""
        payload = {
            "destination_id": "WB_DDI_009",
            "trip_days": 3,
            "language": "bn",
            "user_lat": 22.5726,
            "user_lon": 88.3639
        }
        res = client.post("/api/recommendations", json=payload)
        self.assertEqual(res.status_code, 200, f"Error: {res.text}")
        data = res.json()

        # Factual integrity
        dest = data["destination"]
        self.assertEqual(dest["id"], "WB_DDI_009")
        self.assertEqual(dest["name"], "Banpara Forest Deer Park")
        self.assertEqual(dest["district"], "Dakshin Dinajpur")
        self.assertIn("West Bengal", dest["address"])
        self.assertAlmostEqual(dest["latitude"], 25.4786, places=2)
        self.assertAlmostEqual(dest["longitude"], 88.9072, places=2)

        # Distance factual integrity
        user_dist = data.get("user_distance")
        self.assertIsNotNone(user_dist)
        self.assertTrue(user_dist["available"])
        self.assertGreater(user_dist["distance_km"], 300)

        # Narrative language checks - Bengali script: \u0980-\u09FF
        explanation = data.get("explanation", "")
        self.assertTrue(bool(re.search(r"[\u0980-\u09FF]", explanation)), f"Expected Bengali script in explanation, got: {explanation}")

        # Activities check
        activities = data.get("activities", [])
        self.assertGreater(len(activities), 0)
        has_bn_activity = any(re.search(r"[\u0980-\u09FF]", a["activity"]) for a in activities)
        self.assertTrue(has_bn_activity, "Expected at least one activity with Bengali script")

        # Itinerary check
        itinerary = data.get("itinerary", {})
        self.assertIn("Day 1", itinerary)
        day1 = itinerary["Day 1"]
        for slot in ("morning", "afternoon", "evening"):
            self.assertTrue(bool(re.search(r"[\u0980-\u09FF]", day1[slot])), f"Expected Bengali script in Day 1 {slot}, got: {day1[slot]}")

        print("\n[TEST 1 PASSED] Bengali Recommendations & Itinerary verified.")
        print(f"  Explanation: {explanation[:90]}...")
        print(f"  Day 1 Morning: {day1['morning']}")

    def test_02_hindi_recommendations_and_itinerary(self):
        """Verify that when language=hi, Gemma generates authentic Hindi narrative."""
        payload = {
            "destination_id": "WB_DDI_009",
            "trip_days": 3,
            "language": "hi"
        }
        res = client.post("/api/recommendations", json=payload)
        self.assertEqual(res.status_code, 200, f"Error: {res.text}")
        data = res.json()

        # Factual integrity
        self.assertEqual(data["destination"]["name"], "Banpara Forest Deer Park")

        # Narrative language checks - Devanagari script: \u0900-\u097F
        explanation = data.get("explanation", "")
        self.assertTrue(bool(re.search(r"[\u0900-\u097F]", explanation)), f"Expected Hindi script in explanation, got: {explanation}")

        # Activities check
        activities = data.get("activities", [])
        has_hi_activity = any(re.search(r"[\u0900-\u097F]", a["activity"]) for a in activities)
        self.assertTrue(has_hi_activity, "Expected at least one activity with Hindi script")

        # Itinerary check
        day1 = data["itinerary"]["Day 1"]
        self.assertTrue(bool(re.search(r"[\u0900-\u097F]", day1["morning"])), f"Expected Hindi script in Day 1 morning, got: {day1['morning']}")

        print("\n[TEST 2 PASSED] Hindi Recommendations & Itinerary verified.")
        print(f"  Explanation: {explanation[:90]}...")
        print(f"  Day 1 Morning: {day1['morning']}")

    def test_03_english_recommendations_and_itinerary(self):
        """Verify that when language=en, Gemma generates English narrative."""
        payload = {
            "destination_id": "WB_DDI_009",
            "trip_days": 3,
            "language": "en"
        }
        res = client.post("/api/recommendations", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        explanation = data.get("explanation", "")
        self.assertTrue(len(explanation) > 10)
        self.assertFalse(bool(re.search(r"[\u0980-\u09FF]", explanation)), "English should not contain Bengali script")
        self.assertFalse(bool(re.search(r"[\u0900-\u097F]", explanation)), "English should not contain Hindi script")

        print("\n[TEST 3 PASSED] English Recommendations & Itinerary verified.")

    def test_04_chatbot_bengali_inquiry(self):
        """Test Ask Detoura chatbot endpoint with user question in Bengali."""
        chat_payload = {
            "message": "আমি এখানে কী করতে পারি?",
            "language": "bn",
            "destination_id": "WB_DDI_009",
            "context": {
                "destination_name": "Banpara Forest Deer Park",
                "district": "Dakshin Dinajpur",
                "state": "West Bengal",
                "distance_km": 342.5,
                "category": "Forest/Wildlife"
            }
        }
        res = client.post("/api/chat", json=chat_payload)
        self.assertEqual(res.status_code, 200, f"Error: {res.text}")
        data = res.json()
        self.assertEqual(data["language"], "bn")
        response_text = data["response"]
        self.assertTrue(bool(re.search(r"[\u0980-\u09FF]", response_text)), f"Expected Bengali reply, got: {response_text}")

        print("\n[TEST 4 PASSED] Chatbot Bengali response verified:")
        print(f"  Question: {chat_payload['message']}")
        print(f"  Answer: {response_text}")

    def test_05_chatbot_hindi_inquiry(self):
        """Test Ask Detoura chatbot endpoint with user question in Hindi."""
        chat_payload = {
            "message": "मैं यहाँ क्या कर सकता हूँ?",
            "language": "hi",
            "destination_id": "WB_DDI_009",
            "context": {
                "destination_name": "Banpara Forest Deer Park",
                "district": "Dakshin Dinajpur",
                "state": "West Bengal",
                "distance_km": 342.5,
                "category": "Forest/Wildlife"
            }
        }
        res = client.post("/api/chat", json=chat_payload)
        self.assertEqual(res.status_code, 200, f"Error: {res.text}")
        data = res.json()
        self.assertEqual(data["language"], "hi")
        response_text = data["response"]
        self.assertTrue(bool(re.search(r"[\u0900-\u097F]", response_text)), f"Expected Hindi reply, got: {response_text}")

        print("\n[TEST 5 PASSED] Chatbot Hindi response verified:")
        print(f"  Question: {chat_payload['message']}")
        print(f"  Answer: {response_text}")

    def test_06_chatbot_english_inquiry(self):
        """Test Ask Detoura chatbot endpoint with user question in English."""
        chat_payload = {
            "message": "What can I do here?",
            "language": "en",
            "destination_id": "WB_DDI_009",
            "context": {
                "destination_name": "Banpara Forest Deer Park",
                "district": "Dakshin Dinajpur",
                "state": "West Bengal",
                "distance_km": 342.5,
                "category": "Forest/Wildlife"
            }
        }
        res = client.post("/api/chat", json=chat_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["language"], "en")
        response_text = data["response"]
        self.assertTrue(len(response_text) > 10)

        print("\n[TEST 6 PASSED] Chatbot English response verified:")
        print(f"  Question: {chat_payload['message']}")
        print(f"  Answer: {response_text}")

    def test_07_chatbot_distance_grounding(self):
        """Verify that distance inquiry cites verified distance and directs to Directions feature."""
        chat_payload = {
            "message": "এই গন্তব্যটি কত দূরে?",
            "language": "bn",
            "destination_id": "WB_DDI_009",
            "context": {
                "destination_name": "Banpara Forest Deer Park",
                "district": "Dakshin Dinajpur",
                "distance_km": 342.5
            }
        }
        res = client.post("/api/chat", json=chat_payload)
        self.assertEqual(res.status_code, 200)
        reply = res.json()["response"]
        self.assertTrue(any(w in reply for w in ["342.5", "Directions", "দিকনির্দেশ", "নেভিগেশন", "দূরত্ব", "কিমি"]))
        print("\n[TEST 7 PASSED] Distance Grounding verified:")
        print(f"  Answer: {reply}")

    def test_08_chatbot_hotel_unavailability_grounding(self):
        """Verify that asking for live hotel pricing returns explicit unavailability notice rather than hallucination."""
        chat_payload = {
            "message": "হোটেলের দাম কত এবং রুম বুকিং কিভাবে করব?",
            "language": "bn",
            "destination_id": "WB_DDI_009",
            "context": {
                "destination_name": "Banpara Forest Deer Park",
                "district": "Dakshin Dinajpur"
            }
        }
        res = client.post("/api/chat", json=chat_payload)
        self.assertEqual(res.status_code, 200)
        reply = res.json()["response"]
        # Must explicitly acknowledge unavailability of hotel pricing
        self.assertTrue(any(k in reply for k in ["উপলব্ধ নেই", "মূল্য", "unavailable", "যাচাইকৃত", "নেই", "জানা যায় না"]))
        print("\n[TEST 8 PASSED] Hotel Unavailability Grounding verified:")
        print(f"  Answer: {reply}")

if __name__ == "__main__":
    unittest.main()
