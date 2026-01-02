"""
Quick test script to verify registration endpoint works
Run this from the backend directory: python test_registration.py
"""
import urllib.request
import urllib.error
import json

url = "http://localhost:5712/auth/register"
payload = {
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123",
    "role": "student",
    "location": "Test City"
}

print(f"Testing registration endpoint: {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req) as response:
        status_code = response.getcode()
        response_data = json.loads(response.read().decode('utf-8'))
        
        print(f"\nStatus Code: {status_code}")
        print(f"Response: {json.dumps(response_data, indent=2)}")
        
        if status_code == 200:
            print("\n[SUCCESS] Registration successful!")
            print(f"User ID: {response_data.get('user', {}).get('id')}")
            print(f"Email: {response_data.get('user', {}).get('email')}")
except urllib.error.HTTPError as e:
    error_body = e.read().decode('utf-8')
    print(f"\n[ERROR] Registration failed!")
    print(f"Status Code: {e.code}")
    print(f"Error: {error_body}")
except urllib.error.URLError as e:
    print(f"\n[ERROR] Cannot connect to backend. Is it running on http://localhost:5712?")
    print(f"Error: {str(e)}")
except Exception as e:
    print(f"\n[ERROR] {str(e)}")

