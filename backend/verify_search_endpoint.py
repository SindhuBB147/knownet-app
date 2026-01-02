import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_search():
    # 1. Login to get token (if needed, but dashboard might be protected)
    # Actually dashboard endpoint IS protected.
    # We need a user. I'll assume I can login or I can bypass auth for test if I knew a token.
    # Let's try to login as a test user if possible, or just check if the endpoint exists (401 is better than 404).
    
    # Try searching without auth first to see 401
    print("Testing unauthenticated search...")
    try:
        r = requests.get(f"{BASE_URL}/dashboard/search?q=test")
        print(f"Status: {r.status_code}")
        if r.status_code == 404:
            print("FAILED: Endpoint not found")
        elif r.status_code == 401:
            print("SUCCESS: Endpoint exists (Auth required)")
        else:
            print(f"Response: {r.text[:100]}...")
    except Exception as e:
        print(f"Connection failed: {e}")

    # If we have a way to get a token, that would be better.
    # I see 'test_registration.py' in the file list. Maybe I can use that to register/login?
    # Or just 'get_admin.py'.
    
if __name__ == "__main__":
    test_search()
