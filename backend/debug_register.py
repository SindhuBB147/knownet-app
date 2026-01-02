
import requests
import json
import time

def debug_register():
    url = "http://127.0.0.1:8000/auth/register"
    print(f"Testing REGISTER at: {url}")
    
    # Unique email to avoid duplicates
    unique_email = f"test_{int(time.time())}@example.com"
    
    payload = {
        "email": unique_email,
        "password": "password123",
        "name": "Test User",
        "role": "student",
        "location": "Test City",
        "city": "Test City",
        "state": "Test State",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code in [200, 201]:
            print("SUCCESS: User registered successfully.")
        else:
            print(f"FAILURE: Registration failed with status {response.status_code}")
            
    except Exception as e:
        print(f"FAILURE: Error sending REGISTER request: {e}")

if __name__ == "__main__":
    debug_register()
