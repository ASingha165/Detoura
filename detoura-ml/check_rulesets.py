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

print("Checking rulesets...")
try:
    req = urllib.request.Request(
        'https://firebaserules.googleapis.com/v1/projects/detoura-f8a96/rulesets',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req) as resp:
        print("Rulesets:", json.loads(resp.read().decode()))
except Exception as e:
    print("Error:", e)
