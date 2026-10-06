import os
import json
import urllib.request
import urllib.error
from google.auth.transport.requests import Request
from google.oauth2 import service_account

cred_path = os.path.join(os.path.dirname(__file__), 'credentials', 'detoura-f8a96-firebase-adminsdk-fbsvc-93a08f7635.json')
creds = service_account.Credentials.from_service_account_file(
    cred_path,
    scopes=['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
)
creds.refresh(Request())
token = creds.token

print("Attempting to POST release directly...")
post_url = 'https://firebaserules.googleapis.com/v1/projects/detoura-f8a96/releases'
payload = {
    'name': 'projects/detoura-f8a96/releases/cloud.firestore',
    'rulesetName': 'projects/detoura-f8a96/rulesets/cd0403b1-0b33-4d47-b5d1-c52c8056892b'
}
req = urllib.request.Request(
    post_url,
    data=json.dumps(payload).encode('utf-8'),
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    method='POST'
)
try:
    with urllib.request.urlopen(req) as resp:
        print("Release created successfully:", resp.read().decode())
except urllib.error.HTTPError as he:
    print(f"HTTPError ({he.code}):", he.read().decode())
except Exception as e:
    print("Error:", e)
