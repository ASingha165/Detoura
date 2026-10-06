import os
import json
import urllib.request
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from firebase_client import init_firebase, get_firestore_client

cred_path = os.path.join(os.path.dirname(__file__), 'credentials', 'detoura-f8a96-firebase-adminsdk-fbsvc-93a08f7635.json')
creds = service_account.Credentials.from_service_account_file(
    cred_path,
    scopes=['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
)
creds.refresh(Request())
token = creds.token

# Check existing releases
print("Checking rules releases...")
try:
    req = urllib.request.Request(
        'https://firebaserules.googleapis.com/v1/projects/detoura-f8a96/releases',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req) as resp:
        print("Releases:", json.loads(resp.read().decode()))
except Exception as e:
    print("Error listing releases:", e)

# Check Firestore client connection
print("Checking Firestore client via Admin SDK...")
try:
    db = get_firestore_client()
    collections = list(db.collections())
    print("Collections in Firestore:", [c.id for c in collections])
except Exception as e:
    print("Error connecting to Firestore via Admin SDK:", e)
