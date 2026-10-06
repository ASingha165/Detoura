"""
DETOURA - Gemma Generative Travel Intelligence Service (Model 3)
Connects locally running Gemma model to generate structured travel recommendations,
including personalized activities, day-by-day itineraries, and destination matching rationale.
"""

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("detoura.gemma")

DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "models" / "gemma-2-2b-it-Q4_K_M.gguf"


class GemmaService:
    _instance: Optional["GemmaService"] = None

    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or Path(os.getenv("GEMMA_MODEL_PATH", str(DEFAULT_MODEL_PATH)))
        self.llm = None
        self.is_loaded = False
        self._initialize_model()

    @classmethod
    def get_instance(cls) -> "GemmaService":
        if cls._instance is None:
            cls._instance = GemmaService()
        return cls._instance

    def _initialize_model(self):
        """Loads Gemma model via llama_cpp once into memory."""
        if not self.model_path.exists():
            logger.warning(
                f"[GEMMA SERVICE] Model not found at {self.model_path}. "
                "Will operate in deterministic high-fidelity fallback mode until downloaded."
            )
            return

        try:
            import llama_cpp
            logger.info(f"[GEMMA SERVICE] Loading Gemma model from {self.model_path}...")
            # n_ctx: 2048 tokens is lightweight and fast
            # n_threads: 6 threads for multicore CPU inference
            self.llm = llama_cpp.Llama(
                model_path=str(self.model_path),
                n_ctx=2048,
                n_threads=6,
                verbose=False
            )
            self.is_loaded = True
            logger.info("[GEMMA SERVICE] Gemma model successfully loaded and ready for inference.")
        except Exception as e:
            logger.error(f"[GEMMA SERVICE] Failed to load model ({e}). Fallback active.")
            self.llm = None
            self.is_loaded = False

    def build_prompt(
        self,
        destination: Dict[str, Any],
        intelligence: Dict[str, Any],
        traveler: Dict[str, Any],
        language: str = "en"
    ) -> str:
        """Constructs a compact, strictly factually grounded instruction prompt for Gemma."""
        dest_name = destination.get("name", "Unknown Destination")
        district = destination.get("district", "West Bengal")
        category = destination.get("category", "General")
        state = destination.get("state") or "West Bengal"
        lat = destination.get("latitude")
        lon = destination.get("longitude")
        
        address = destination.get("address")
        if not address:
            address = f"{dest_name}, {district}, {state}" if district else "Address unavailable in verified destination data."

        user_dist = intelligence.get("distance_from_user_km") or destination.get("distance_from_user_km")
        if user_dist is not None:
            dist_str = f"{user_dist:.1f} km from traveler's live location"
        else:
            dist_str = "Unavailable (traveler location not provided)"
        
        style = traveler.get("travel_style", "Leisure")
        prefs = ", ".join(traveler.get("place_preferences", [])) or category
        budget = traveler.get("budget_level", "Medium")
        month = traveler.get("travel_month", "October")
        trip_days = traveler.get("trip_days", 3)

        match_score = intelligence.get("match_score", 0.75)
        ssi = intelligence.get("ssi", 0.90)
        cpi = intelligence.get("live_cpi", 0.05)
        underrated = intelligence.get("underrated_score", 0.30)

        lang_code = (language or "en").lower().strip()
        if lang_code == "bn":
            lang_title = "Bengali"
            lang_name = "Bengali"
            lang_script = "বাংলা"
            lang_directive = (
                "EXPLICIT LANGUAGE MANDATE:\n"
                "- Selected output language: Bengali (বাংলা).\n"
                "- All narrative and explanatory output MUST be written in the selected language. Do not return English narrative text when Bengali or Hindi is selected.\n"
                "- All narrative and explanatory fields ('explanation', all 'activities', and 'morning', 'afternoon', 'evening' slots) MUST be written in authentic Bengali script (বাংলা).\n"
                "- Do NOT output English narrative text.\n"
                f"- Preserve verified proper nouns, destination name '{dest_name}', district '{district}', state '{state}', coordinates, distances, and numeric scores exactly.\n"
                f"- EXACT ADDRESS: For the 'address' field, output the EXACT verified address: \"{address}\". Never invent, translate, or fabricate an address."
            )
            schema_example = f"""{{
  "explanation": "বাঙালি ভাষায় সংক্ষিপ্ত বিবরণ: কেন এই গন্তব্যটি পর্যটকের জন্য একটি আদর্শ নির্বাচন...",
  "address": "{address}",
  "activities": [
    {{"activity": "আঞ্চলিক প্রাকৃতিক সৌন্দর্য ও শান্ত পরিবেশ অন্বেষণ", "score": 1.0}},
    {{"activity": "ফটোগ্রাফি ও পথপ্রদর্শিত পদযাত্রা", "score": 0.9}},
    {{"activity": "স্থানীয় পরিবেশ ও গ্রামীণ দৃশ্য অবলোকন", "score": 0.8}},
    {{"activity": "প্রশান্তিময় উন্মুক্ত অবকাশ যাপন", "score": 0.8}},
    {{"activity": "সাংস্কৃতিক ঐতিহ্য ও লোকশিল্প পর্যবেক্ষণ", "score": 0.7}}
  ],
  "itinerary": {{
    "Day 1": {{"morning": "প্রভাতকালীন শান্ত আগমন ও প্রাথমিক পরিচিতি", "afternoon": "দুপুরের মনোরম পদযাত্রা ও স্থানীয় সৌন্দর্য দর্শন", "evening": "সন্ধ্যার শান্ত অবসর ও সূর্যাস্ত উপভোগ"}},
    "Day 2": {{"morning": "সকালের নির্মল প্রাকৃতিক পরিবেশ পর্যবেক্ষণ", "afternoon": "আঞ্চলিক পথ পরিক্রমা ও আলোকচিত্র ধারণ", "evening": "প্রশান্তিময় পরিবেশে সান্ধ্যকালীন বিশ্রাম"}},
    "Day 3": {{"morning": "বিদায়ী প্রভাতকালীন পদচারণা", "afternoon": "প্রকৃতির সান্নিধ্যে শান্ত সময় যাপন", "evening": "ভ্রমণের সমাপ্তি ও শান্তিপ্রিয় প্রস্থান"}}
  }}
}}"""
        elif lang_code == "hi":
            lang_title = "Hindi"
            lang_name = "Hindi"
            lang_script = "हिन्दी"
            lang_directive = (
                "EXPLICIT LANGUAGE MANDATE:\n"
                "- Selected output language: Hindi (हिन्दी).\n"
                "- All narrative and explanatory output MUST be written in the selected language. Do not return English narrative text when Bengali or Hindi is selected.\n"
                "- All narrative and explanatory fields ('explanation', all 'activities', and 'morning', 'afternoon', 'evening' slots) MUST be written in authentic Hindi (हिन्दी).\n"
                "- Do NOT output English narrative text.\n"
                f"- Preserve verified proper nouns, destination name '{dest_name}', district '{district}', state '{state}', coordinates, distances, and numeric scores exactly.\n"
                f"- EXACT ADDRESS: For the 'address' field, output the EXACT verified address: \"{address}\". Never invent, translate, or fabricate an address."
            )
            schema_example = f"""{{
  "explanation": "हिन्दी में संक्षिप्त विवरण: यह गंतव्य यात्री के लिए क्यों उपयुक्त है...",
  "address": "{address}",
  "activities": [
    {{"activity": "प्राकृतिक एवं शांत वातावरण का अन्वेषण", "score": 1.0}},
    {{"activity": "फोटोग्राफी एवं मार्गदर्शित पदयात्रा", "score": 0.9}},
    {{"activity": "स्थानीय प्राकृतिक सुंदरता का अवलोकन", "score": 0.8}},
    {{"activity": "शांत एवं आरामदायक अवकाश", "score": 0.8}},
    {{"activity": "सांस्कृतिक एवं हेरिटेज अध्ययन", "score": 0.7}}
  ],
  "itinerary": {{
    "Day 1": {{"morning": "प्रातःकालीन शांत आगमन एवं भ्रमण", "afternoon": "दोपहर की प्रकृति पदयात्रा", "evening": "शाम को शांत विश्राम"}},
    "Day 2": {{"morning": "सुबह का प्राकृतिक दृश्यावलोकन", "afternoon": "स्थानीय क्षेत्रों का अवलोकन", "evening": "सूर्यास्त दर्शन एवं शांतिपूर्ण समय"}},
    "Day 3": {{"morning": "अंतिम सुबह की शांत सैर", "afternoon": "प्रकृति के बीच विश्राम", "evening": "यात्रा समापन एवं प्रस्थान"}}
  }}
}}"""
        else:
            lang_title = "English"
            lang_name = "English"
            lang_script = "English"
            lang_directive = (
                "EXPLICIT LANGUAGE MANDATE:\n"
                "- Selected output language: English.\n"
                "- Write the 'explanation', 'activities', and itinerary slots in natural, descriptive English.\n"
                f"- Preserve verified proper nouns, destination name '{dest_name}', district '{district}', and state '{state}'.\n"
                f"- EXACT ADDRESS: For the 'address' field, output the EXACT verified address: \"{address}\". Never invent an address."
            )
            schema_example = f"""{{
  "explanation": "A realistic 1-2 sentence explanation of why this destination matches the traveler.",
  "address": "{address}",
  "activities": [
    {{"activity": "Scenic nature observation and exploration", "score": 1.0}},
    {{"activity": "Landscape photography and trail walk", "score": 0.9}},
    {{"activity": "Guided walking tour through surroundings", "score": 0.8}},
    {{"activity": "Relaxing leisure time amidst nature", "score": 0.8}},
    {{"activity": "Cultural and heritage study", "score": 0.7}}
  ],
  "itinerary": {{
    "Day 1": {{"morning": "Morning arrival and exploration", "afternoon": "Afternoon scenic walk", "evening": "Peaceful evening relaxation"}},
    "Day 2": {{"morning": "Morning trail and birdwatching", "afternoon": "Local exploration", "evening": "Sunset viewing and personal time"}},
    "Day 3": {{"morning": "Final morning stroll", "afternoon": "Leisure amidst scenery", "evening": "Trip conclusion and rest"}}
  }}
}}"""

        prompt = f"""<start_of_turn>user
You are DETOURA's factually grounded travel intelligence assistant for West Bengal, India.
Generate realistic, factually grounded activity recommendations and a {trip_days}-day itinerary for this traveler and destination.

{lang_directive}

VERIFIED GEOGRAPHIC & DESTINATION CONTEXT:
- Destination: {dest_name}
- Verified Address: {address}
- District: {district}
- State: {state}
- Coordinates: Latitude {lat}, Longitude {lon}
- Distance: {dist_str}
- Category: {category}
- Intelligence Metrics: Match Score {match_score:.3f}, Seasonal Suitability {ssi:.3f}, Crowd Index {cpi:.3f} (low congestion), Tranquility Score {underrated:.3f}

TRAVELER PROFILE:
- Style: {style}
- Place Preferences: {prefs}
- Budget: {budget}
- Travel Month: {month}
- Duration: {trip_days} days

CRITICAL FACTUAL GROUNDING RULES:
1. Use the supplied verified address exactly: "{address}". Never invent or infer a street address, door number, or locality.
2. If address is unavailable, output exactly "Address unavailable in verified destination data."
3. Never invent coordinates, distances, or travel times.
4. Never claim a route or turn-by-turn navigation is available unless supplied by the application.
5. ONLY generate activities and attractions directly consistent with the destination ({dest_name}) and its category ({category}).
6. DO NOT invent or fabricate named landmarks, third-party museums, specific named restaurants, or distant city markets.
7. If specific verified attraction-level data is unavailable, generate GENERIC activity descriptions appropriate for {category}.
8. Keep itinerary items realistic and generic to the destination setting without hallucinating external places.

OUTPUT FORMAT INSTRUCTIONS:
Return ONLY valid JSON matching this exact structure:
{schema_example}

MANDATORY GENERATION INSTRUCTIONS:
- Selected output language: {lang_title}.
- All narrative and explanatory output MUST be written in the selected language. Do not return English narrative text when Bengali or Hindi is selected.
- All narrative and explanatory fields ('explanation', all 'activities', and 'morning', 'afternoon', 'evening' slots) MUST be written in {lang_name} ({lang_script}).
- Do NOT output English narrative text when Bengali or Hindi is requested.
- Preserve verified proper nouns, destination names, addresses, coordinates, scores, and other supplied factual values exactly.
- Return ONLY the JSON object. No other text, markdown explanations, or commentary outside the JSON.
<end_of_turn>
<start_of_turn>model
"""
        return prompt

    def _validate_language(self, parsed: Dict[str, Any], target_lang: str) -> bool:
        """
        Validates that generated narrative content is authentically in the target language.
        If target_lang is 'bn' or 'hi' and the output is clearly English,
        rejects the output so safe deterministic fallback can take over.
        """
        lang = (target_lang or "en").lower().strip()
        if lang not in ("bn", "hi"):
            return True

        narratives = []
        exp = parsed.get("explanation")
        if isinstance(exp, str) and exp.strip():
            narratives.append(exp)
            if lang == "bn" and not re.search(r"[\u0980-\u09FF]", exp):
                logger.warning("[GEMMA SERVICE] Language validation failed: 'explanation' contains no Bengali characters.")
                return False
            elif lang == "hi" and not re.search(r"[\u0900-\u097F]", exp):
                logger.warning("[GEMMA SERVICE] Language validation failed: 'explanation' contains no Hindi characters.")
                return False

        activities = parsed.get("activities", [])
        if isinstance(activities, list):
            for a in activities:
                if isinstance(a, dict) and "activity" in a:
                    narratives.append(str(a["activity"]))
                elif isinstance(a, str):
                    narratives.append(a)

        itinerary = parsed.get("itinerary", {})
        if isinstance(itinerary, dict):
            for _, day in itinerary.items():
                if isinstance(day, dict):
                    for slot in ("morning", "afternoon", "evening"):
                        if slot in day and isinstance(day[slot], str):
                            narratives.append(day[slot])

        full_text = " ".join(narratives)
        if not full_text:
            return False

        if lang == "bn":
            target_chars = len(re.findall(r"[\u0980-\u09FF]", full_text))
            alpha_chars = len(re.findall(r"[a-zA-Z\u0980-\u09FF]", full_text))
            if alpha_chars > 15:
                ratio = target_chars / alpha_chars
                if ratio < 0.35:
                    logger.warning(
                        f"[GEMMA SERVICE] Language validation failed for Bengali (ratio: {ratio:.2f} < 0.35). "
                        "Rejecting English-dominant output."
                    )
                    return False
            elif target_chars == 0:
                logger.warning("[GEMMA SERVICE] Language validation failed: No Bengali characters found in narrative.")
                return False

        elif lang == "hi":
            target_chars = len(re.findall(r"[\u0900-\u097F]", full_text))
            alpha_chars = len(re.findall(r"[a-zA-Z\u0900-\u097F]", full_text))
            if alpha_chars > 15:
                ratio = target_chars / alpha_chars
                if ratio < 0.35:
                    logger.warning(
                        f"[GEMMA SERVICE] Language validation failed for Hindi (ratio: {ratio:.2f} < 0.35). "
                        "Rejecting English-dominant output."
                    )
                    return False
            elif target_chars == 0:
                logger.warning("[GEMMA SERVICE] Language validation failed: No Hindi characters found in narrative.")
                return False

        return True

    def _sanitize_factual_grounding(self, parsed: Dict[str, Any], destination: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
        """
        Ensures that generated activities and itineraries contain no hallucinated landmarks,
        distant attractions from other cities, or invented named restaurants.
        If an activity is overly specific and unverified, normalizes it to a grounded generic activity
        in the target language.
        """
        dest_name = destination.get("name", "").lower()
        lang = (language or "en").lower().strip()

        # Known distant landmarks often hallucinated across districts
        if lang == "bn":
            distant_hallucinations = [
                ("darjeeling himalayan railway", "আঞ্চলিক ঐতিহ্যবাহী মনোরম পথযাত্রা"),
                ("tiger hill", "প্যানোরামিক সূর্যোদয় ও প্রাকৃতিক দৃশ্য অবলোকন"),
                ("chowrasta", "স্থানীয় হাট ও গ্রামীণ পথচারণ"),
                ("batasia loop", "মনোরম প্রাকৃতিক ভিউপয়েন্ট পর্যবেক্ষণ"),
                ("victoria memorial", "ঐতিহাসিক স্থাপত্য অনুসন্ধান"),
                ("howrah bridge", "নদীর তীরবর্তী পরিবেশ অবলোকন"),
                ("gorkha war memorial", "আঞ্চলিক ঐতিহ্য পদযাত্রা"),
                ("padmaja naidu", "স্থানীয় বন্যপ্রাণী পর্যবেক্ষণ"),
                ("peace pagoda", "প্রশান্তিময় ধ্যান ও মনোরম পদযাত্রা")
            ]
        elif lang == "hi":
            distant_hallucinations = [
                ("darjeeling himalayan railway", "क्षेत्रीय प्राकृतिक एवं हेरिटेज पदयात्रा"),
                ("tiger hill", "सूर्योदय एवं सुंदर दृश्यावलोकन"),
                ("chowrasta", "स्थानीय बाजार एवं ग्राम भ्रमण"),
                ("batasia loop", "सुंदर पर्वतीय दृश्य अवलोकन"),
                ("victoria memorial", "ऐतिहासिक वास्तुकला अध्ययन"),
                ("howrah bridge", "नदी किनारे का सुंदर दृश्यावलोकन"),
                ("gorkha war memorial", "क्षेत्रीय हेरिटेज पदयात्रा"),
                ("padmaja naidu", "स्थानीय वन्यजीव अवलोकन"),
                ("peace pagoda", "शांत ध्यान एवं प्राकृतिक भ्रमण")
            ]
        else:
            distant_hallucinations = [
                ("darjeeling himalayan railway", "Regional scenic heritage walk"),
                ("tiger hill", "Panoramic sunrise and landscape viewpoint walk"),
                ("chowrasta", "Local marketplace and village stroll"),
                ("batasia loop", "Scenic mountain viewpoint observation"),
                ("victoria memorial", "Historical architecture study"),
                ("howrah bridge", "Riverside observation"),
                ("gorkha war memorial", "Regional heritage walk"),
                ("padmaja naidu", "Native wildlife observation"),
                ("peace pagoda", "Tranquil meditation and scenic walk")
            ]

        # Sanitize activities
        activities = parsed.get("activities", [])
        clean_activities = []
        if isinstance(activities, list):
            for item in activities:
                if isinstance(item, dict) and "activity" in item:
                    act_text = str(item["activity"])
                    act_lower = act_text.lower()

                    for halo, replacement in distant_hallucinations:
                        if halo in act_lower and halo not in dest_name:
                            act_text = replacement
                            break

                    clean_activities.append({
                        "activity": act_text,
                        "score": item.get("score", 0.8)
                    })

        if clean_activities:
            parsed["activities"] = clean_activities

        # Sanitize itinerary days
        itinerary = parsed.get("itinerary", {})
        if isinstance(itinerary, dict):
            for day_key, day_plan in itinerary.items():
                if isinstance(day_plan, dict):
                    for slot in ["morning", "afternoon", "evening"]:
                        slot_text = str(day_plan.get(slot, ""))
                        slot_lower = slot_text.lower()
                        for halo, replacement in distant_hallucinations:
                            if halo in slot_lower and halo not in dest_name:
                                slot_text = re.sub(re.escape(halo), replacement, slot_text, flags=re.IGNORECASE)
                        day_plan[slot] = slot_text

        return parsed

    def generate_recommendation_intelligence(
        self,
        destination: Dict[str, Any],
        intelligence: Dict[str, Any],
        traveler: Dict[str, Any],
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Generates structured Model 3 JSON recommendation.
        Validates language adherence and factual grounding; falls back safely if needed.
        """
        req_lang = (language or "en").lower().strip()
        if req_lang not in ("en", "hi", "bn"):
            req_lang = "en"

        # 1. Attempt Gemma Inference if loaded
        if self.is_loaded and self.llm is not None:
            try:
                prompt = self.build_prompt(destination, intelligence, traveler, language=req_lang)
                output = self.llm(
                    prompt,
                    max_tokens=650,
                    temperature=0.1,  # Low temperature for strict factual adherence
                    top_p=0.85,
                    repeat_penalty=1.15,
                    stop=["<end_of_turn>", "</s>"]
                )
                text = output["choices"][0]["text"].strip()
                parsed = self._clean_and_parse_json(text)
                if parsed and "activities" in parsed and "itinerary" in parsed:
                    if not self._validate_language(parsed, req_lang):
                        logger.warning(f"[GEMMA SERVICE] Output failed '{req_lang}' language validation. Using localized fallback.")
                    else:
                        grounded_parsed = self._sanitize_factual_grounding(parsed, destination, language=req_lang)
                        return self._assemble_payload(destination, intelligence, traveler, grounded_parsed, source="gemma", language=req_lang)
                else:
                    logger.warning("[GEMMA SERVICE] Parsed output missing required keys. Triggering fallback.")
            except Exception as e:
                logger.error(f"[GEMMA SERVICE] Inference error: {e}. Triggering fallback.")

        # 2. Deterministic High-Fidelity Localized Fallback
        fallback_data = self._generate_deterministic_fallback(destination, intelligence, traveler, language=req_lang)
        return self._assemble_payload(destination, intelligence, traveler, fallback_data, source="deterministic_fallback", language=req_lang)

    def _clean_and_parse_json(self, raw_text: str) -> Optional[Dict[str, Any]]:
        """Safely extracts and parses JSON even if wrapped in markdown codeblocks or having syntax flaws."""
        if not raw_text:
            return None

        # 1. Remove markdown code fences
        cleaned = re.sub(r"^```json\s*", "", raw_text, flags=re.MULTILINE)
        cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = cleaned.strip()

        # Find first { and last }
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            json_str = cleaned[start:end+1]
        else:
            json_str = cleaned

        # 2. Try standard json.loads
        try:
            parsed = json.loads(json_str)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

        # 3. Try json_repair (automatically repairs missing commas, unclosed brackets, quotes)
        try:
            import json_repair
            repaired = json_repair.loads(json_str)
            if isinstance(repaired, dict):
                return repaired
        except Exception:
            pass

        # 4. Regex heuristics: fix missing commas between lines and trailing commas
        try:
            fixed = re.sub(r'("(?:[^"\\]|\\.)*")\s*\n\s*(")', r'\1,\n\2', json_str)
            fixed = re.sub(r",\s*([}\]])", r"\1", fixed)
            parsed = json.loads(fixed)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

        return None

    def _generate_deterministic_fallback(
        self,
        destination: Dict[str, Any],
        intelligence: Dict[str, Any],
        traveler: Dict[str, Any],
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        High-fidelity template generator that creates customized activities and itineraries
        tailored to destination category, traveler preferences, and selected language (en / hi / bn).
        Guarantees 100% demo reliability without crashing.
        """
        name = destination.get("name", "Destination")
        district = destination.get("district", "West Bengal")
        category = (destination.get("category") or "Nature").lower()
        trip_days = traveler.get("trip_days", 3)
        style = traveler.get("travel_style", "Explorer")
        lang = (language or "en").lower().strip()
        live_cpi = intelligence.get('live_cpi', 0.05)
        travel_month = traveler.get('travel_month', 'trip')

        if lang == "hi":
            if "forest" in category or "wildlife" in category or "deer" in name.lower():
                activities = [
                    {"activity": "वन्यजीव और प्रकृति अन्वेषण", "score": 1.0},
                    {"activity": "प्रकृति फोटोग्राफी और पक्षी दर्शन", "score": 1.0},
                    {"activity": "जंगल के पगडंडी रास्तों पर भ्रमण", "score": 0.8},
                    {"activity": "कैनोपी और प्राकृतिक दृश्यावलोकन", "score": 0.8},
                    {"activity": "स्थानीय पर्यावरण पर्यटन केंद्र का दौरा", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": f"आगमन एवं {name} में वन्यजीव अन्वेषण",
                        "afternoon": "निर्धारित क्षेत्रों में प्रकृति फोटोग्राफी",
                        "evening": "प्राकृतिक वातावरण में विश्राम एवं शांतिपूर्ण समय"
                    },
                    "Day 2": {
                        "morning": "कैनोपी एवं सुंदर दृश्यों का अवलोकन",
                        "afternoon": "मार्गदर्शित वन पगडंडी पदयात्रा",
                        "evening": "स्थानीय चाय का आस्वादन एवं विश्राम"
                    },
                    "Day 3": {
                        "morning": "पक्षी दर्शन एवं भोर की फोटोग्राफी",
                        "afternoon": "स्थानीय पर्यावरण केंद्र का दौरा",
                        "evening": "व्यक्तिगत समय एवं प्रस्थान की तैयारी"
                    }
                }
            elif "beach" in category or "coast" in category:
                activities = [
                    {"activity": "समुद्र तटीय भ्रमण और पदयात्रा", "score": 1.0},
                    {"activity": "सूर्योदय एवं सूर्यास्त फोटोग्राफी", "score": 1.0},
                    {"activity": "ताज़ा समुद्री व्यंजनों का स्वाद", "score": 0.9},
                    {"activity": "समुद्री पारिस्थितिकी अवलोकन", "score": 0.8},
                    {"activity": "शांत रेतीले टीलों पर विश्राम", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": "तट पर आगमन एवं चेक-इन",
                        "afternoon": "समुद्र तट अन्वेषण एवं शांतिपूर्ण सैर",
                        "evening": "सूर्यास्त फोटोग्राफी एवं ताज़ा समुद्री भोजन"
                    },
                    "Day 2": {
                        "morning": "रेतीले टीलों पर विश्राम एवं समुद्री हवा",
                        "afternoon": "समुद्री पारिस्थितिकी अवलोकन एवं नौकायन",
                        "evening": "शाम के बाज़ार में भ्रमण एवं तटीय भोजन"
                    },
                    "Day 3": {
                        "morning": "सूर्योदय दर्शन एवं सीपियां इकट्ठा करना",
                        "afternoon": "स्थानीय तटीय शिल्प बाज़ार",
                        "evening": "व्यक्तिगत समय एवं विश्राम"
                    }
                }
            elif "hill" in category or "mountain" in category:
                activities = [
                    {"activity": "हिमालयी मनोरम दृश्य ट्रेक", "score": 1.0},
                    {"activity": "ऑर्गेनिक चाय बागान भ्रमण", "score": 0.9},
                    {"activity": "पर्वतीय बादलों की फोटोग्राफी", "score": 0.9},
                    {"activity": "प्राचीन मठ एवं सांस्कृतिक अवलोकन", "score": 0.8},
                    {"activity": "पहाड़ी कैफे एवं हस्तशिल्प खरीदारी", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": "पर्वतीय यात्रा एवं आगमन",
                        "afternoon": "चाय बागान में शांत सैर",
                        "evening": "गर्म चाय का आस्वादन एवं सूर्यास्त दर्शन"
                    },
                    "Day 2": {
                        "morning": "मनोरम हिमालयी दृश्य ट्रेक",
                        "afternoon": "ऐतिहासिक मठ भ्रमण एवं संस्कृति दर्शन",
                        "evening": "पहाड़ी कैफे एवं स्मृति चिन्ह खरीदारी"
                    },
                    "Day 3": {
                        "morning": "प्रातःकालीन कोहरा फोटोग्राफी",
                        "afternoon": "स्थानीय स्मृति चिन्ह खरीदारी",
                        "evening": "प्रस्थान की तैयारी"
                    }
                }
            elif "heritage" in category or "cultural" in category:
                activities = [
                    {"activity": "टेराकोटा एवं ऐतिहासिक स्मारक भ्रमण", "score": 1.0},
                    {"activity": "संग्रहालय एवं प्राचीन महल अन्वेषण", "score": 0.9},
                    {"activity": "धरोहर फोटोग्राफी एवं नक्काशी अध्ययन", "score": 0.8},
                    {"activity": "पारंपरिक हस्तशिल्प एवं हथकरघा केंद्र दौरा", "score": 0.8},
                    {"activity": "प्रामाणिक क्षेत्रीय बंगाली व्यंजनों का स्वाद", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": "आगमन एवं ऐतिहासिक स्मारक भ्रमण",
                        "afternoon": "संग्रहालय एवं प्राचीन महल अवलोकन",
                        "evening": "धरोहर फोटोग्राफी एवं मंदिर परिसर"
                    },
                    "Day 2": {
                        "morning": "पारंपरिक शिल्प एवं हथकरघा दौरा",
                        "afternoon": "प्रामाणिक क्षेत्रीय बंगाली भोजन",
                        "evening": "लोक कथाएं एवं सांस्कृतिक संध्या"
                    },
                    "Day 3": {
                        "morning": "प्राचीन खंडहर एवं कला अध्ययन",
                        "afternoon": "स्थानीय कारीगर बाज़ार एवं मिठाई खरीदारी",
                        "evening": "विश्राम एवं प्रस्थान"
                    }
                }
            else:
                activities = [
                    {"activity": f"{name} का प्राकृतिक परिभ्रमण", "score": 1.0},
                    {"activity": "परिदृश्य फोटोग्राफी एवं सैर", "score": 0.9},
                    {"activity": "स्थानीय समुदाय एवं खानपान की खोज", "score": 0.8},
                    {"activity": "शांत वातावरण में विश्राम", "score": 0.8},
                    {"activity": "क्षेत्रीय हस्तशिल्प अवलोकन", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": f"आगमन एवं {name} का अवलोकन",
                        "afternoon": "फोटोग्राफी एवं पैदल मार्ग",
                        "evening": "व्यक्तिगत विश्राम"
                    },
                    "Day 2": {
                        "morning": "प्रकृति में शांतिपूर्ण विश्राम",
                        "afternoon": "स्थानीय खानपान की खोज",
                        "evening": "सूर्यास्त दर्शन एवं रात्रिभोज"
                    },
                    "Day 3": {
                        "morning": "प्रातःकालीन सैर एवं फोटोग्राफी",
                        "afternoon": "शिल्प खरीदारी",
                        "evening": "प्रस्थान की तैयारी"
                    }
                }
            explanation = (
                f"डेटूरा ने {district} स्थित {name} को आपके {style} यात्रा डीएनए से मेल कराया है। "
                f"न्यूनतम भीड़ दबाव (CPI {live_cpi:.3f}) और प्राकृतिक शांति के साथ, यह आपके {travel_month} के सफर के लिए एक आदर्श विकल्प है।"
            )

        elif lang == "bn":
            if "forest" in category or "wildlife" in category or "deer" in name.lower():
                activities = [
                    {"activity": "বন্যপ্রাণী ও প্রকৃতি অন্বেষণ", "score": 1.0},
                    {"activity": "প্রকৃতি আলোকচিত্র ও পাখি দর্শন", "score": 1.0},
                    {"activity": "অরণ্য ট্রেইলে শান্ত পদযাত্রা", "score": 0.8},
                    {"activity": "ক্যানোপি ও প্রাকৃতিক সৌন্দর্য দর্শন", "score": 0.8},
                    {"activity": "স্থানীয় পরিবেশ-পর্যটন কেন্দ্র পরিদর্শন", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": f"আগমন ও {name}-এ বন্যপ্রাণী অন্বেষণ",
                        "afternoon": "নির্দিষ্ট অঞ্চলে প্রকৃতি ও ল্যান্ডস্কেপ ফটোগ্রাফি",
                        "evening": "প্রাকৃতিক শান্তিময় পরিবেশে বিশ্রাম"
                    },
                    "Day 2": {
                        "morning": "ক্যানোপি ও মনোরম দৃশ্য পর্যবেক্ষণ",
                        "afternoon": "পথপ্রদর্শিত বনপথের শান্ত হাঁটা",
                        "evening": "স্থানীয় চা আস্বাদন ও স্বস্তিকর অবসর"
                    },
                    "Day 3": {
                        "morning": "পাখি পর্যবেক্ষণ ও ভোরের ফটোগ্রাফি",
                        "afternoon": "স্থানীয় ইকো-ট্যুরিজম কেন্দ্র পরিদর্শন",
                        "evening": "ব্যক্তিগত অবসর ও প্রস্থানের প্রস্তুতি"
                    }
                }
            elif "beach" in category or "coast" in category:
                activities = [
                    {"activity": "উপকূলীয় সৈকত ভ্রমণ ও পদযাত্রা", "score": 1.0},
                    {"activity": "সূর্যোদয় ও সূর্যাস্ত আলোকচিত্র", "score": 1.0},
                    {"activity": "তাজা সামুদ্রিক খাবারের স্বাদগ্রহণ", "score": 0.9},
                    {"activity": "সামুদ্রিক বাস্তুতন্ত্র পর্যবেক্ষণ", "score": 0.8},
                    {"activity": "নির্জন বালিয়াড়িতে প্রশান্তি", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": "উপকূলে পৌঁছানো ও চেক-ইন",
                        "afternoon": "সৈকত অন্বেষণ ও প্রশান্তিময় পদযাত্রা",
                        "evening": "সূর্যাস্ত দর্শন ও সামুদ্রিক খাবার আস্বাদন"
                    },
                    "Day 2": {
                        "morning": "নির্জন বালিয়াড়িতে প্রশান্তি ও সমুদ্রের হাওয়া",
                        "afternoon": "সামুদ্রিক বাস্তুতন্ত্র পর্যবেক্ষণ ও হারবার ভ্রমণ",
                        "evening": "সাঁঝের বাজারে হাঁটা ও সমুদ্রতীরে নৈশভোজ"
                    },
                    "Day 3": {
                        "morning": "ভোরের সূর্যোদয় দর্শন ও ঝিনুক সংগ্রহ",
                        "afternoon": "স্থানীয় উপকূলীয় হস্তশিল্প বাজার",
                        "evening": "ব্যক্তিগত অবসর ও বিশ্রাম"
                    }
                }
            elif "hill" in category or "mountain" in category:
                activities = [
                    {"activity": "হিমালয়ের মনোরম ভিউপয়েন্ট ট্রেক", "score": 1.0},
                    {"activity": "জৈব চা বাগান পরিক্রমা", "score": 0.9},
                    {"activity": "পাহাড় ও মেঘের আলোকচিত্র", "score": 0.9},
                    {"activity": "ঐতিহ্যবাহী প্রাচীন মঠ দর্শন", "score": 0.8},
                    {"activity": "পাহাড়ি ক্যাফে ও হস্তশিল্প কেনাকাটা", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": "মনোরম পাহাড়ি পথ ধরে আগমন",
                        "afternoon": "চা বাগানে প্রশান্তিময় পদযাত্রা",
                        "evening": "গরম চা আস্বাদন ও সূর্যাস্ত ভিউপয়েন্ট"
                    },
                    "Day 2": {
                        "morning": "হিমালয়ের প্যানোরামিক ভিউপয়েন্ট ট্রেক",
                        "afternoon": "ঐতিহ্যবাহী মঠ ও সাংস্কৃতিক দর্শন",
                        "evening": "পাহাড়ি ক্যাফে ও স্থানীয় শিল্পসামগ্রী"
                    },
                    "Day 3": {
                        "morning": "ভোরের কুয়াশা ও উপত্যকা ট্রেইল ফটোগ্রাফি",
                        "afternoon": "স্থানীয় স্মারক সামগ্রী কেনাকাটা",
                        "evening": "প্রস্থানের প্রস্তুতি"
                    }
                }
            elif "heritage" in category or "cultural" in category:
                activities = [
                    {"activity": "পোড়ামাটির মন্দির ও স্থাপত্য পরিভ্রমণ", "score": 1.0},
                    {"activity": "ঐতিহাসিক জাদুঘর ও রাজপ্রাসাদ অন্বেষণ", "score": 0.9},
                    {"activity": "ঐতিহ্য আলোকচিত্র ও ভাস্কর্য পর্যবেক্ষণ", "score": 0.8},
                    {"activity": "ঐতিহ্যবাহী তাঁত ও হস্তশিল্প কর্মশালা পরিদর্শন", "score": 0.8},
                    {"activity": "খাঁটি আঞ্চলিক বাঙালি খাবারের স্বাদ", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": "আগমন ও পোড়ামাটির স্থাপত্য পরিভ্রমণ",
                        "afternoon": "ঐতিহাসিক জাদুঘর ও রাজপ্রাসাদ অন্বেষণ",
                        "evening": "ঐতিহ্য আলোকচিত্র ও মন্দির প্রাঙ্গণ"
                    },
                    "Day 2": {
                        "morning": "ঐতিহ্যবাহী তাঁত ও হস্তশিল্প কেন্দ্র পরিদর্শন",
                        "afternoon": "আঞ্চলিক বাঙালি খাবার আস্বাদন",
                        "evening": "লোকশিল্প ও সাংস্কৃতিক সন্ধ্যা"
                    },
                    "Day 3": {
                        "morning": "প্রাচীন ধ্বংসাবশেষ ও ভাস্কর্য দর্শন",
                        "afternoon": "স্থানীয় মিষ্টি ও কারুশিল্প বাজার",
                        "evening": "বিশ্রাম ও প্রস্থান"
                    }
                }
            else:
                activities = [
                    {"activity": f"{name}-এর প্রাকৃতিক সৌন্দর্য অন্বেষণ", "score": 1.0},
                    {"activity": "ল্যান্ডস্কেপ ফটোগ্রাফি ও পদযাত্রা", "score": 0.9},
                    {"activity": "স্থানীয় জনপদ ও খাবারের স্বাদ", "score": 0.8},
                    {"activity": "শান্তিময় উন্মুক্ত বিশ্রাম", "score": 0.8},
                    {"activity": "আঞ্চলিক কারুশিল্প পর্যবেক্ষণ", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": f"আগমন ও {name}-এর সাধারণ পরিচিতি",
                        "afternoon": "ফটোগ্রাফি ও পদযাত্রা",
                        "evening": "ব্যক্তিগত অবসর"
                    },
                    "Day 2": {
                        "morning": "প্রকৃতির মাঝে প্রশান্তিময় বিশ্রাম",
                        "afternoon": "স্থানীয় সংস্কৃতি ও খাবারের খোঁজ",
                        "evening": "সূর্যাস্ত দর্শন ও সান্ধ্যভোজ"
                    },
                    "Day 3": {
                        "morning": "ভোরের পদযাত্রা ও ফটোগ্রাফি",
                        "afternoon": "স্থানীয় কারুশিল্প সংগ্রহ",
                        "evening": "প্রস্থানের প্রস্তুতি"
                    }
                }
            explanation = (
                f"ডিট্যুরা {district}-এর {name}-কে আপনার {style} ট্রাভেল ডিএনএ-র সাথে সামঞ্জস্যপূর্ণ করেছে। "
                f"অত্যন্ত কম ভিড়ের চাপ (CPI {live_cpi:.3f}) এবং গভীর প্রশান্তির কারণে, এটি আপনার {travel_month} ভ্রমণের এক নিখুঁত আশ্রয়স্থল।"
            )

        else:
            # English Default
            if "forest" in category or "wildlife" in category or "deer" in name.lower():
                activities = [
                    {"activity": "Wildlife and nature exploration", "score": 1.0},
                    {"activity": "Nature photography & birdwatching", "score": 1.0},
                    {"activity": "Forest trail walking", "score": 0.8},
                    {"activity": "Canopy and scenic observation", "score": 0.8},
                    {"activity": "Local eco-tourism center visit", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": "Arrival & Wildlife and nature exploration",
                        "afternoon": "Nature photography across designated zones",
                        "evening": "Relaxation / personal time amidst natural sounds"
                    },
                    "Day 2": {
                        "morning": "Canopy and scenic observation",
                        "afternoon": "Guided forest trail walk",
                        "evening": "Relaxation & local tea tasting"
                    },
                    "Day 3": {
                        "morning": "Bird watching & dawn photography",
                        "afternoon": "Local eco-tourism center visit",
                        "evening": "Relaxation / departure preparation"
                    }
                }
            elif "beach" in category or "coast" in category:
                activities = [
                    {"activity": "Coastal shore exploration & beach walk", "score": 1.0},
                    {"activity": "Sunrise & sunset photography", "score": 1.0},
                    {"activity": "Fresh seafood culinary tasting", "score": 0.9},
                    {"activity": "Marine ecosystem observation", "score": 0.8},
                    {"activity": "Secluded dunes relaxation", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": "Arrival & check-in by the shoreline",
                        "afternoon": "Coastal shore exploration & beach walk",
                        "evening": "Sunset photography and fresh seafood tasting"
                    },
                    "Day 2": {
                        "morning": "Secluded dunes relaxation & ocean breeze walk",
                        "afternoon": "Marine ecosystem observation & boat harbor",
                        "evening": "Evening market stroll & beachside dining"
                    },
                    "Day 3": {
                        "morning": "Sunrise contemplation & shell collecting",
                        "afternoon": "Local coastal village craft market",
                        "evening": "Relaxation / personal time"
                    }
                }
            elif "hill" in category or "mountain" in category:
                activities = [
                    {"activity": "Panoramic Himalayan viewpoint trek", "score": 1.0},
                    {"activity": "Organic tea estate garden walk", "score": 0.9},
                    {"activity": "Cloud & ridge photography", "score": 0.9},
                    {"activity": "Heritage monastery exploration", "score": 0.8},
                    {"activity": "Local hillside cafe & artisanal shopping", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": "Scenic mountain drive & arrival check-in",
                        "afternoon": "Organic tea estate garden walk",
                        "evening": "Warm tea tasting & sunset viewpoint"
                    },
                    "Day 2": {
                        "morning": "Panoramic Himalayan viewpoint trek",
                        "afternoon": "Heritage monastery exploration & culture immersion",
                        "evening": "Local hillside cafe & artisanal shopping"
                    },
                    "Day 3": {
                        "morning": "Morning mist photography & valley trail",
                        "afternoon": "Souvenir craft browsing & leisure",
                        "evening": "Relaxation / departure preparation"
                    }
                }
            elif "heritage" in category or "cultural" in category:
                activities = [
                    {"activity": "Terracotta & architectural monument tour", "score": 1.0},
                    {"activity": "Historical museum & royal palace exploration", "score": 0.9},
                    {"activity": "Heritage photography & stone carving study", "score": 0.8},
                    {"activity": "Traditional craft & weaving workshop visit", "score": 0.8},
                    {"activity": "Authentic regional Bengali cuisine tasting", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": "Arrival & Terracotta & architectural monument tour",
                        "afternoon": "Historical museum & royal palace exploration",
                        "evening": "Heritage photography & temple courtyards"
                    },
                    "Day 2": {
                        "morning": "Traditional craft & weaving workshop visit",
                        "afternoon": "Authentic regional Bengali cuisine tasting",
                        "evening": "Folk storytelling & evening cultural performance"
                    },
                    "Day 3": {
                        "morning": "Ancient ruins & quiet stone carving study",
                        "afternoon": "Local artisan market & sweets shopping",
                        "evening": "Relaxation / departure"
                    }
                }
            else:
                activities = [
                    {"activity": f"Scenic exploration of {name}", "score": 1.0},
                    {"activity": "Landscape photography & walking", "score": 0.9},
                    {"activity": "Local community & culinary discovery", "score": 0.8},
                    {"activity": "Tranquil outdoor relaxation", "score": 0.8},
                    {"activity": "Regional artisan craft browsing", "score": 0.7}
                ]
                itinerary_plan = {
                    "Day 1": {
                        "morning": f"Arrival & scenic orientation of {name}",
                        "afternoon": "Landscape photography & walking trails",
                        "evening": "Relaxation / personal time"
                    },
                    "Day 2": {
                        "morning": "Tranquil outdoor relaxation & nature immersion",
                        "afternoon": "Local community & culinary discovery",
                        "evening": "Sunset contemplation & regional dining"
                    },
                    "Day 3": {
                        "morning": "Morning stroll & photography",
                        "afternoon": "Regional artisan craft browsing",
                        "evening": "Departure preparation"
                    }
                }
            explanation = (
                f"DETOURA matched {name} in {district} with your {style} travel DNA. "
                f"With low crowd density (CPI {live_cpi:.3f}) and exceptional tranquility, "
                f"this detour provides an ideal regional sanctuary tailored for {travel_month}."
            )

        # Adjust itinerary days if traveler requested != 3 days
        final_itinerary = {}
        for day_num in range(1, trip_days + 1):
            day_key = f"Day {day_num}"
            if day_key in itinerary_plan:
                final_itinerary[day_key] = itinerary_plan[day_key]
            else:
                if lang == "hi":
                    final_itinerary[day_key] = {
                        "morning": f"{name} के आसपास प्राकृतिक अन्वेषण और भ्रमण",
                        "afternoon": "स्थानीय व्यंजनों का स्वाद और शांतिपूर्ण पदयात्रा",
                        "evening": "व्यक्तिगत विश्राम एवं शांतिपूर्ण समय"
                    }
                elif lang == "bn":
                    final_itinerary[day_key] = {
                        "morning": f"{name}-এর চারপাশে শান্ত পরিবেশ ও দৃশ্য অবলোকন",
                        "afternoon": "স্থানীয় খাবারের স্বাদ ও শান্ত পদযাত্রা",
                        "evening": "ব্যক্তিগত অবসর ও প্রশান্তি"
                    }
                else:
                    final_itinerary[day_key] = {
                        "morning": f"Exploration & scenic sightseeing around {name}",
                        "afternoon": "Local cuisine & relaxing trail walk",
                        "evening": "Personal leisure & relaxation"
                    }

        return {
            "explanation": explanation,
            "activities": activities,
            "itinerary": final_itinerary
        }

    def _assemble_payload(
        self,
        destination: Dict[str, Any],
        intelligence: Dict[str, Any],
        traveler: Dict[str, Any],
        generated: Dict[str, Any],
        source: str = "gemma",
        language: str = "en"
    ) -> Dict[str, Any]:
        dest_id = destination.get("id") or destination.get("destination_id") or "WB_DEST_001"
        lang = (language or "en").lower().strip()
        # Normalize and sanitize activities
        raw_activities = generated.get("activities", [])
        clean_activities = []
        if isinstance(raw_activities, list):
            for act in raw_activities:
                if isinstance(act, dict) and "activity" in act:
                    score_val = act.get("score", 0.8)
                    try:
                        clean_score = round(float(score_val), 2)
                    except (ValueError, TypeError):
                        clean_score = 0.8
                    clean_activities.append({
                        "activity": str(act["activity"]),
                        "score": clean_score
                    })
        if not clean_activities:
            if lang == "hi":
                clean_activities = [
                    {"activity": f"{destination.get('name', 'गंतव्य')} का प्राकृतिक अन्वेषण", "score": 1.0},
                    {"activity": "प्रकृति एवं परिदृश्य फोटोग्राफी", "score": 0.9},
                    {"activity": "मार्गदर्शित पदयात्रा", "score": 0.8},
                    {"activity": "शांत एवं आरामदायक अवकाश", "score": 0.7}
                ]
            elif lang == "bn":
                clean_activities = [
                    {"activity": f"{destination.get('name', 'গন্তব্য')}-এর প্রাকৃতিক সৌন্দর্য অন্বেষণ", "score": 1.0},
                    {"activity": "প্রকৃতি ও ল্যান্ডস্কেপ আলোকচিত্র", "score": 0.9},
                    {"activity": "পথপ্রদর্শিত শান্ত পদযাত্রা", "score": 0.8},
                    {"activity": "প্রশান্তিময় অবসর যাপন", "score": 0.7}
                ]
            else:
                clean_activities = [
                    {"activity": f"Scenic exploration of {destination.get('name', 'location')}", "score": 1.0},
                    {"activity": "Nature and landscape photography", "score": 0.9},
                    {"activity": "Guided walking tour", "score": 0.8},
                    {"activity": "Relaxing leisure time", "score": 0.7}
                ]

        # Normalize and sanitize itinerary structure
        raw_itinerary = generated.get("itinerary", {})
        clean_itinerary = {}
        trip_days = int(traveler.get("trip_days", 3))

        for day_num in range(1, trip_days + 1):
            day_key = f"Day {day_num}"
            raw_day = raw_itinerary.get(day_key) or raw_itinerary.get(str(day_num)) or {}
            if not isinstance(raw_day, dict):
                raw_day = {}

            if lang == "hi":
                default_m = f"{destination.get('name', 'गंतव्य')} के आसपास प्रातःकालीन भ्रमण"
                default_a = "दोपहर की शांत पदयात्रा और स्थानीय खानपान की खोज"
                default_e = "शांत वातावरण में विश्राम एवं व्यक्तिगत समय"
            elif lang == "bn":
                default_m = f"{destination.get('name', 'গন্তব্য')}-এর চারপাশে প্রভাতকালীন ভ্রমণ"
                default_a = "দুপুরের শান্ত পদযাত্রা ও আঞ্চলিক খাবারের স্বাদগ্রহণ"
                default_e = "প্রশান্তিময় পরিবেশে সান্ধ্যকালীন অবসর"
            else:
                default_m = f"Morning exploration and sightseeing around {destination.get('name', 'destination')}"
                default_a = "Afternoon trail walk and local culinary discovery"
                default_e = "Relaxation / personal time amidst peaceful surroundings"

            clean_itinerary[day_key] = {
                "morning": str(raw_day.get("morning") or default_m),
                "afternoon": str(raw_day.get("afternoon") or default_a),
                "evening": str(raw_day.get("evening") or default_e)
            }

        dest_name = str(destination.get("name", ""))
        dest_district = str(destination.get("district", ""))
        dest_state = str(destination.get("state") or "West Bengal")
        raw_address = generated.get("address") or destination.get("address")
        if raw_address and raw_address != "Address unavailable in verified destination data.":
            dest_address = str(raw_address)
        elif dest_district:
            dest_address = f"{dest_name}, {dest_district}, {dest_state}" if dest_name and dest_name != dest_district else f"{dest_district}, {dest_state}"
        else:
            dest_address = "Address unavailable in verified destination data."

        user_dist = intelligence.get("distance_from_user_km") or destination.get("distance_from_user_km")
        user_dist_km = round(float(user_dist), 2) if user_dist is not None else None

        if lang == "bn":
            default_explanation = f"আপনার ভ্রমণ পছন্দ এবং কম ভিড়ের বৈশিষ্ট্যের ওপর ভিত্তি করে DETOURA {dest_name} গন্তব্যটি নির্বাচন করেছে।"
        elif lang == "hi":
            default_explanation = f"आपकी यात्रा प्राथमिकताओं और शांत वातावरण के आधार पर DETOURA ने {dest_name} का चयन किया है।"
        else:
            default_explanation = f"DETOURA selected {dest_name} based on your travel DNA and preference for serene destinations."

        gen_exp = generated.get("explanation")
        if gen_exp and isinstance(gen_exp, str) and gen_exp.strip():
            if lang == "bn" and not re.search(r"[\u0980-\u09FF]", gen_exp):
                final_exp = default_explanation
            elif lang == "hi" and not re.search(r"[\u0900-\u097F]", gen_exp):
                final_exp = default_explanation
            else:
                final_exp = str(gen_exp)
        else:
            final_exp = default_explanation

        return {
                "destination": {
                    "id": str(dest_id),
                    "name": dest_name,
                    "district": dest_district,
                    "category": str(destination.get("category", "")),
                    "latitude": float(destination.get("latitude") or 0.0),
                    "longitude": float(destination.get("longitude") or 0.0),
                    "address": dest_address,
                    "state": dest_state
                },
                "destination_intelligence": {
                    "name": dest_name,
                    "address": dest_address,
                    "district": dest_district,
                    "state": dest_state,
                    "distance_from_user_km": user_dist_km,
                    "match_score": round(float(intelligence.get("match_score", 0.0)), 3),
                    "ssi": round(float(intelligence.get("ssi", 0.0)), 3),
                    "live_cpi": round(float(intelligence.get("live_cpi", 0.0)), 3),
                    "underrated_score": round(float(intelligence.get("underrated_score", 0.0)), 3),
                    "budget_tier": intelligence.get("budget_tier"),
                    "estimated_daily_inr": intelligence.get("estimated_daily_inr")
                },
                "location": {
                    "latitude": float(destination.get("latitude") or 0.0),
                    "longitude": float(destination.get("longitude") or 0.0),
                    "address": dest_address,
                    "district": dest_district,
                    "state": dest_state
                },
                "user_distance": {
                    "distance_km": user_dist_km,
                    "available": user_dist_km is not None
                },
                "traveler": {
                    "travel_style": str(traveler.get("travel_style", "Nature")),
                    "place_preferences": list(traveler.get("place_preferences", [])),
                    "budget_level": str(traveler.get("budget_level", "Medium")),
                    "travel_month": str(traveler.get("travel_month", "October")),
                    "trip_days": trip_days
                },
                "activities": clean_activities,
                "itinerary": clean_itinerary,
                "explanation": final_exp,
                "generation_metadata": {
                    "engine": "Gemma-2-2B-IT" if source == "gemma" else "Deterministic Intelligence Engine",
                    "source": source
                }
            }

    def build_chat_prompt(self, message: str, context: Dict[str, Any], language: str = "en") -> str:
        """Constructs an ultra-grounded conversational prompt for Ask Detoura."""
        lang = (language or "en").lower().strip()
        dest_name = context.get("destination_name") or context.get("name") or "West Bengal Destination"
        district = context.get("district") or "West Bengal"
        state = context.get("state") or "West Bengal"
        address = context.get("address") or f"{dest_name}, {district}, {state}"
        category = context.get("category") or "Nature & Heritage"
        lat = context.get("latitude")
        lon = context.get("longitude")
        user_dist = context.get("distance_km") or context.get("distance_from_user_km")
        dist_str = f"{float(user_dist):.1f} km from user's live location" if user_dist is not None else "Distance unavailable (traveler location not enabled)"
        match_score = context.get("match_score")
        ssi = context.get("ssi")
        underrated = context.get("underrated_score")
        budget_tier = context.get("budget_tier")
        daily_inr = context.get("estimated_daily_inr")
        itinerary = context.get("itinerary")
        activities = context.get("activities")

        # Format verified activities text
        act_lines = []
        if isinstance(activities, list):
            for a in activities[:5]:
                if isinstance(a, dict) and "activity" in a:
                    act_lines.append(f"- {a['activity']}")
                elif isinstance(a, str):
                    act_lines.append(f"- {a}")
        act_summary = "\n".join(act_lines) if act_lines else "- Scenic nature walks, photography, and local tranquility."

        # Format verified itinerary text
        itin_lines = []
        if isinstance(itinerary, dict):
            for day_k, day_v in list(itinerary.items())[:3]:
                if isinstance(day_v, dict):
                    m = day_v.get("morning", "")
                    af = day_v.get("afternoon", "")
                    ev = day_v.get("evening", "")
                    itin_lines.append(f"{day_k}: Morning: {m} | Afternoon: {af} | Evening: {ev}")
        itin_summary = "\n".join(itin_lines) if itin_lines else "Standard 3-day regional exploration."

        if lang == "bn":
            lang_rule = (
                "EXPLICIT LANGUAGE MANDATE:\n"
                "- Selected output language: Bengali (বাংলা).\n"
                "- Your entire response MUST be written in authentic Bengali script (বাংলা).\n"
                "- Do NOT answer in English.\n"
                f"- Retain exact proper nouns and numbers: '{dest_name}', '{district}', '{address}', coordinates, and verified distances."
            )
        elif lang == "hi":
            lang_rule = (
                "EXPLICIT LANGUAGE MANDATE:\n"
                "- Selected output language: Hindi (हिन्दी).\n"
                "- Your entire response MUST be written in authentic Hindi script (हिन्दी).\n"
                "- Do NOT answer in English.\n"
                f"- Retain exact proper nouns and numbers: '{dest_name}', '{district}', '{address}', coordinates, and verified distances."
            )
        else:
            lang_rule = (
                "EXPLICIT LANGUAGE MANDATE:\n"
                "- Selected output language: English.\n"
                "- Answer helpfully and naturally in English."
            )

        prompt = f"""<start_of_turn>user
You are "Ask Detoura", the factually grounded AI travel assistant for DETOURA in West Bengal, India.
Answer the traveler's question using ONLY the verified facts supplied below.

{lang_rule}

VERIFIED DESTINATION INTELLIGENCE:
- Destination: {dest_name}
- Category: {category}
- District: {district}, State: {state}
- Exact Verified Address: {address}
- Coordinates: Latitude {lat}, Longitude {lon}
- Verified Distance from Traveler: {dist_str}
- Match Score: {match_score if match_score is not None else 'N/A'}
- Seasonal Suitability (SSI): {ssi if ssi is not None else 'N/A'}
- Tranquility Score: {underrated if underrated is not None else 'N/A'}
- Budget Tier: Tier {budget_tier} (~₹{daily_inr}/day) if budget_tier else 'Standard regional'
- Verified Activities:
{act_summary}
- Verified Itinerary:
{itin_summary}

STRICT GROUNDING & FACTUAL RULES:
1. NEVER invent hotel prices, restaurant prices, room availability, live weather, live traffic, opening hours, transport schedules, or unverified attractions.
2. If asked about hotel rates, food pricing, train schedules, or live weather, explicitly state that this information is unavailable in verified destination data.
3. For navigation or route questions, provide the verified distance ({dist_str}) and instruct the traveler to use the application's built-in "Directions" feature.
4. Do NOT claim live internet access.
5. Answer concisely in 2-4 sentences or clear bullet points.

Traveler Question:
{message}
<end_of_turn>
<start_of_turn>model
"""
        return prompt

    def _generate_grounded_chat_fallback(
        self,
        message: str,
        context: Dict[str, Any],
        language: str = "en"
    ) -> str:
        """
        Deterministic, 100% factually grounded fallback responses for Ask Detoura.
        Guarantees instant, reliable, properly localized responses in en, hi, and bn.
        """
        lang = (language or "en").lower().strip()
        dest_name = context.get("destination_name") or context.get("name") or "এই গন্তব্য" if lang == "bn" else "यह गंतव्य" if lang == "hi" else "this destination"
        district = context.get("district") or "West Bengal"
        user_dist = context.get("distance_km") or context.get("distance_from_user_km")
        dist_str = f"{float(user_dist):.1f} কিমি" if lang == "bn" and user_dist is not None else f"{float(user_dist):.1f} किमी" if lang == "hi" and user_dist is not None else f"{float(user_dist):.1f} km" if user_dist is not None else None
        
        msg_lower = message.lower()

        # 1. Activities / What to do inquiries
        if any(k in msg_lower for k in ["কী করতে", "করতে পারি", "কী করা", "দেখার", "দর্শনীয়", "কি করতে", "কি করব", "activities", "what to do", "what can i do", "करना", "क्या कर", "घूमने"]):
            activities = context.get("activities", [])
            act_list = []
            if isinstance(activities, list):
                for a in activities[:4]:
                    if isinstance(a, dict) and "activity" in a:
                        act_list.append(str(a["activity"]))
                    elif isinstance(a, str):
                        act_list.append(a)

            if lang == "bn":
                items = act_list if act_list else [
                    f"{dest_name}-এর প্রাকৃতিক ও গ্রামীণ পরিবেশ অন্বেষণ",
                    "ল্যান্ডস্কেপ আলোকচিত্র ও শান্ত পদযাত্রা",
                    "স্থানীয় লোকশিল্প ও সাংস্কৃতিক পরিবেশ দর্শন",
                    "শান্তিময় উন্মুক্ত অবকাশ যাপন"
                ]
                formatted = "\n• " + "\n• ".join(items)
                return f"{dest_name} ({district})-এ আপনি নিম্নলিখিত কার্যক্রমগুলি উপভোগ করতে পারেন:{formatted}\n\nএটি একটি নিরিবিলি এবং সুন্দর আঞ্চলিক গন্তব্য।"
            elif lang == "hi":
                items = act_list if act_list else [
                    f"{dest_name} के शांत प्राकृतिक वातावरण का अन्वेषण",
                    "लैंडस्केप फोटोग्राफी और शांत पदयात्रा",
                    "स्थानीय संस्कृति और शांत दृश्यावलोकन",
                    "प्रकृति के बीच शांतिपूर्ण अवकाश"
                ]
                formatted = "\n• " + "\n• ".join(items)
                return f"{dest_name} ({district}) में आप निम्नलिखित गतिविधियों का आनंद ले सकते हैं:{formatted}\n\nयह एक शांत और सुंदर क्षेत्रीय स्थल है।"
            else:
                items = act_list if act_list else [
                    f"Scenic nature exploration of {dest_name}",
                    "Landscape photography and peaceful trail walks",
                    "Discovering local heritage and calm surroundings",
                    "Relaxing leisure time away from urban crowds"
                ]
                formatted = "\n• " + "\n• ".join(items)
                return f"At {dest_name} ({district}), you can experience:{formatted}\n\nThis is a peaceful and scenic regional destination."

        # 2. Distance and Directions inquiries
        elif any(k in msg_lower for k in ["দূরত্ব", "কত দূর", "দূর", "দূরে", "পথ", "রাস্তা", "direction", "distance", "how far", "route", "दूरी", "कितनी दूर", "रास्ता"]):
            if lang == "bn":
                if dist_str:
                    return f"{dest_name} আপনার বর্তমান লাইভ অবস্থান থেকে আনুমানিক {dist_str} দূরে অবস্থিত। সরাসরি লাইভ রুট এবং নেভিগেশনের জন্য দয়া করে অ্যাপ্লিকেশনের 'Directions' বোতামটি ব্যবহার করুন।"
                return f"{dest_name} {district} জেলায় অবস্থিত। আপনার বর্তমান অবস্থান থেকে সঠিক দূরত্ব এবং রুট দেখতে দয়া করে আপনার লোকেশন অনুমতি চালু করুন অথবা 'Directions' বোতামটি দেখুন।"
            elif lang == "hi":
                if dist_str:
                    return f"{dest_name} आपके वर्तमान स्थान से लगभग {dist_str} की दूरी पर स्थित है। सटीक टर्न-बाय-टर्न नेविगेशन के लिए कृपया ऐप में दिए गए 'Directions' बटन का उपयोग करें।"
                return f"{dest_name} {district} जिले में स्थित है। अपने स्थान से सटीक दूरी और मार्ग देखने के लिए कृपया लोकेशन सक्षम करें या 'Directions' बटन देखें।"
            else:
                if dist_str:
                    return f"{dest_name} is approximately {dist_str} from your live location. For real-time turn-by-turn navigation, please use the 'Directions' button in the application."
                return f"{dest_name} is located in {district} district. To calculate verified distance and get turn-by-turn route directions, please enable location or use the 'Directions' button."

        # 3. Itinerary inquiries
        elif any(k in msg_lower for k in ["পরিকল্পনা", "ইটিনারারি", "দিন", "ট্যুর", "itinerary", "plan", "day 1", "days", "योजना", "दिन"]):
            itinerary = context.get("itinerary", {})
            if lang == "bn":
                if isinstance(itinerary, dict) and itinerary:
                    lines = []
                    for d_k, d_v in list(itinerary.items())[:3]:
                        if isinstance(d_v, dict):
                            lines.append(f"• **{d_k}**: সকাল: {d_v.get('morning', '')} | দুপুর: {d_v.get('afternoon', '')} | সন্ধ্যা: {d_v.get('evening', '')}")
                    return f"{dest_name}-এর প্রস্তাবিত ভ্রমণ পরিকল্পনা:\n" + "\n".join(lines)
                return f"{dest_name}-এর জন্য ২-৩ দিনের একটি শান্ত ভ্রমণ পরিকল্পনা আদর্শ। বিস্তারিত দিনের পরিকল্পনা দেখতে গন্তব্য বিবরণের 'ইটিনারারি' বিভাগটি দেখুন।"
            elif lang == "hi":
                if isinstance(itinerary, dict) and itinerary:
                    lines = []
                    for d_k, d_v in list(itinerary.items())[:3]:
                        if isinstance(d_v, dict):
                            lines.append(f"• **{d_k}**: सुबह: {d_v.get('morning', '')} | दोपहर: {d_v.get('afternoon', '')} | शाम: {d_v.get('evening', '')}")
                    return f"{dest_name} के लिए अनुशंसित यात्रा योजना:\n" + "\n".join(lines)
                return f"{dest_name} के लिए 2-3 दिनों की शांत यात्रा योजना सर्वोत्तम है। विस्तृत योजना देखने के लिए गंतव्य विवरण के 'यात्रा योजना' भाग को देखें।"
            else:
                if isinstance(itinerary, dict) and itinerary:
                    lines = []
                    for d_k, d_v in list(itinerary.items())[:3]:
                        if isinstance(d_v, dict):
                            lines.append(f"• **{d_k}**: Morning: {d_v.get('morning', '')} | Afternoon: {d_v.get('afternoon', '')} | Evening: {d_v.get('evening', '')}")
                    return f"Curated itinerary for {dest_name}:\n" + "\n".join(lines)
                return f"A 2-3 day itinerary is ideal for {dest_name}. Please check the Itinerary section on the Destination Detail page for day-by-day activities."

        # 4. Hotel, restaurant, pricing inquiries (explicitly ungrounded)
        elif any(k in msg_lower for k in ["হোটেল", "রেস্তোরাঁ", "খাবার", "দাম", "ভাড়া", "আবাসন", "hotel", "stay", "room", "restaurant", "food", "price", "booking", "होटल", "किराया", "कमरा", "खाना", "मूल्य"]):
            if lang == "bn":
                return f"লাইভ হোটেল মূল্য, রিয়েল-টাইম প্রাপ্যতা এবং রেস্তোরাঁর মেনু এই মুহূর্তে যাচাইকৃত গন্তব্য ডেটায় উপলব্ধ নেই। DETOURA গন্তব্যের শান্ত পরিবেশ, প্রাকৃতিক আকর্ষণ এবং রুট নির্দেশনায় সহায়তা প্রদান করে।"
            elif lang == "hi":
                return f"लाइव होटल मूल्य, वास्तविक समय में कमरों की उपलब्धता और रेस्तरां की कीमतें वर्तमान में सत्यापित डेटा में उपलब्ध नहीं हैं। DETOURA गंतव्य के शांत वातावरण, प्राकृतिक आकर्षण और मार्ग मार्गदर्शन में सहायता करता है।"
            else:
                return f"Live hotel pricing, real-time room availability, and restaurant menus are currently unavailable in verified destination data. DETOURA focuses on verified destination intelligence, tranquil offbeat activities, and route guidance."

        # 5. Default general grounded response
        if lang == "bn":
            return f"{dest_name} হলো {district} জেলার একটি মনোরম অফবিট গন্তব্য। এখানে আপনি শান্ত পরিবেশে প্রকৃতি উপভোগ, আলোকচিত্র এবং ঐতিহ্যময় আঞ্চলিক ভ্রমণ করতে পারেন। নির্দিষ্ট কার্যক্রম বা পথ নির্দেশনার জন্য যেকোনো সময় জিজ্ঞাসা করতে পারেন।"
        elif lang == "hi":
            return f"{dest_name} {district} जिले का एक शांत एवं सुंदर ऑफबीट गंतव्य है। यहाँ आप प्रकृति दर्शन, फोटोग्राफी और शांत वातावरण का आनंद ले सकते हैं। किसी भी विशिष्ट गतिविधि या मार्ग के बारे में पूछने के लिए संपर्क करें।"
        else:
            return f"{dest_name} is a scenic, offbeat destination located in {district}, West Bengal. It offers serene natural beauty, photography opportunities, and peaceful local exploration. Feel free to ask about activities, itinerary, or verified distance."

    def generate_chat_response(
        self,
        message: str,
        context: Dict[str, Any],
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Generates a grounded, localized conversational response using local Gemma 2B.
        Validates language adherence and falls back safely to guarantee 100% demo reliability.
        """
        lang = (language or "en").lower().strip()
        if lang not in ("en", "hi", "bn"):
            lang = "en"

        if self.is_loaded and self.llm is not None:
            try:
                prompt = self.build_chat_prompt(message, context, language=lang)
                output = self.llm(
                    prompt,
                    max_tokens=300,
                    temperature=0.1,
                    top_p=0.85,
                    repeat_penalty=1.15,
                    stop=["<end_of_turn>", "</s>", "user\n", "\nTraveler Question:"]
                )
                raw_reply = output["choices"][0]["text"].strip()
                clean_reply = re.sub(r"^model\s*", "", raw_reply).strip()

                # Check for degenerate repetition
                words = clean_reply.split()
                has_loop = False
                if len(words) >= 8:
                    for w_len in range(2, 6):
                        for i in range(len(words) - 2 * w_len):
                            if words[i:i+w_len] == words[i+w_len:i+2*w_len] == words[i+2*w_len:i+3*w_len]:
                                has_loop = True
                                break
                        if has_loop:
                            break

                if not has_loop:
                    # Validate language script
                    if lang == "bn":
                        bn_chars = len(re.findall(r"[\u0980-\u09FF]", clean_reply))
                        if bn_chars >= 8:
                            return {"response": clean_reply, "language": "bn", "source": "gemma"}
                        logger.warning(f"[GEMMA CHAT] Response lacked Bengali script ({bn_chars} chars). Using grounded fallback.")
                    elif lang == "hi":
                        hi_chars = len(re.findall(r"[\u0900-\u097F]", clean_reply))
                        if hi_chars >= 8:
                            return {"response": clean_reply, "language": "hi", "source": "gemma"}
                        logger.warning(f"[GEMMA CHAT] Response lacked Hindi script ({hi_chars} chars). Using grounded fallback.")
                    else:
                        if len(clean_reply) > 5:
                            return {"response": clean_reply, "language": "en", "source": "gemma"}
                else:
                    logger.warning("[GEMMA CHAT] Detected repetitive phrase loop in generation. Using grounded fallback.")
            except Exception as e:
                logger.error(f"[GEMMA CHAT] Inference error: {e}. Using grounded fallback.")

        # High-fidelity grounded fallback
        fallback_reply = self._generate_grounded_chat_fallback(message, context, language=lang)
        return {"response": fallback_reply, "language": lang, "source": "gemma_grounded_fallback"}
