import os
import json
import urllib.request
from google.auth.transport.requests import Request
from google.oauth2 import service_account

def ensure_authorized_domains():
    cred_path = os.path.join(os.path.dirname(__file__), 'credentials', 'detoura-f8a96-firebase-adminsdk-fbsvc-93a08f7635.json')
    creds = service_account.Credentials.from_service_account_file(
        cred_path,
        scopes=['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
    )
    creds.refresh(Request())
    token = creds.token

    get_url = 'https://identitytoolkit.googleapis.com/admin/v2/projects/detoura-f8a96/config'
    req = urllib.request.Request(get_url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as resp:
        config = json.loads(resp.read().decode())
    
    current_domains = set(config.get('authorizedDomains', []))
    required_domains = {'localhost', '127.0.0.1', 'detoura-f8a96.firebaseapp.com', 'detoura-f8a96.web.app'}
    
    if not required_domains.issubset(current_domains):
        all_domains = sorted(list(current_domains.union(required_domains)))
        patch_url = 'https://identitytoolkit.googleapis.com/admin/v2/projects/detoura-f8a96/config?updateMask=authorizedDomains'
        payload = {'authorizedDomains': all_domains}
        patch_req = urllib.request.Request(
            patch_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
            method='PATCH'
        )
        with urllib.request.urlopen(patch_req) as patch_resp:
            updated = json.loads(patch_resp.read().decode())
            print('[DETOURA] Updated authorizedDomains:', updated.get('authorizedDomains'))
    else:
        print('[DETOURA] All required authorized domains are already configured:', list(current_domains))

if __name__ == '__main__':
    ensure_authorized_domains()
