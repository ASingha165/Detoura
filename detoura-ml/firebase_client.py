import os
import firebase_admin
from firebase_admin import credentials, firestore

def init_firebase():
    """Initializes the Firebase Admin SDK."""
    if not firebase_admin._apps:
        # Check for GOOGLE_APPLICATION_CREDENTIALS
        cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        if not cred_path:
            # Fallback path if env var is missing
            cred_path = os.path.join(os.path.dirname(__file__), 'credentials', 'detoura-f8a96-firebase-adminsdk-fbsvc-93a08f7635.json')
        
        project_id = os.environ.get('FIREBASE_PROJECT_ID', 'detoura-f8a96')
        
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                'projectId': project_id,
            })
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            raise e

def get_firestore_client():
    """Returns the Firestore client."""
    init_firebase()
    return firestore.client()

def test_connection():
    """Tests if Firebase and Firestore can be initialized."""
    try:
        init_firebase()
        app = firebase_admin.get_app()
        db = get_firestore_client()
        return {
            "status": "connected",
            "project_id": app.project_id,
            "firestore": "connected" if db else "not initialized"
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }
