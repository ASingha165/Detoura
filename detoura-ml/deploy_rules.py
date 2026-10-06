import os
import json
import urllib.request
import urllib.error
from google.auth.transport.requests import Request
from google.oauth2 import service_account

def deploy_firestore_rules():
    cred_path = os.path.join(os.path.dirname(__file__), 'credentials', 'detoura-f8a96-firebase-adminsdk-fbsvc-93a08f7635.json')
    creds = service_account.Credentials.from_service_account_file(
        cred_path,
        scopes=['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
    )
    creds.refresh(Request())
    token = creds.token

    rules_content = """rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile document: only the authenticated user can access their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Trips subcollection: only the authenticated user can read and write their own trips
      match /trips/{tripId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Default deny all other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}"""

    create_ruleset_url = 'https://firebaserules.googleapis.com/v1/projects/detoura-f8a96/rulesets'
    ruleset_payload = {
        'source': {
            'files': [
                {
                    'name': 'firestore.rules',
                    'content': rules_content
                }
            ]
        }
    }

    req = urllib.request.Request(
        create_ruleset_url,
        data=json.dumps(ruleset_payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as resp:
            ruleset_res = json.loads(resp.read().decode())
            ruleset_name = ruleset_res.get('name')
            print('Successfully created ruleset:', ruleset_name)
            
            # Now release this ruleset to cloud.firestore
            release_name = 'projects/detoura-f8a96/releases/cloud.firestore'
            release_payload = {
                'name': release_name,
                'rulesetName': ruleset_name
            }
            
            # Attempt to PATCH existing release or POST new release
            patch_url = f'https://firebaserules.googleapis.com/v1/{release_name}'
            patch_req = urllib.request.Request(
                patch_url,
                data=json.dumps({'release': release_payload}).encode('utf-8'),
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                method='PATCH'
            )
            try:
                with urllib.request.urlopen(patch_req) as patch_resp:
                    print('Release updated successfully:', json.loads(patch_resp.read().decode()))
            except urllib.error.HTTPError as he:
                if he.code == 404:
                    post_url = 'https://firebaserules.googleapis.com/v1/projects/detoura-f8a96/releases'
                    post_req = urllib.request.Request(
                        post_url,
                        data=json.dumps(release_payload).encode('utf-8'),
                        headers={
                            'Authorization': f'Bearer {token}',
                            'Content-Type': 'application/json'
                        },
                        method='POST'
                    )
                    with urllib.request.urlopen(post_req) as post_resp:
                        print('Release created successfully:', json.loads(post_resp.read().decode()))
                else:
                    err_msg = he.read().decode()
                    print(f'HTTPError during release ({he.code}): {err_msg}')
    except Exception as e:
        print('Error during rules deployment:', e)

if __name__ == '__main__':
    deploy_firestore_rules()
