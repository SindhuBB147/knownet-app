import requests
import json

def verify_proxy_login():
    url = "http://localhost:5173/api/auth/login"
    print(f"Testing Proxy POST at: {url}")
    payload = {
        "email": "test@example.com",
        "password": "wrongpassword" 
    }
    
    try:
        response = requests.post(url, json=payload, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code in [200, 401, 404]:
            print("SUCCESS: Proxy forwarded request to backend (received valid HTTP response).")
        else:
            print(f"FAILURE: Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"FAILURE: Could not connect via proxy. Error: {e}")

if __name__ == "__main__":
    verify_proxy_login()
