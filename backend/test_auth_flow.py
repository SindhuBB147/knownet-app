
import requests
import json
import time
import sys

def test_auth_flow():
    base_url = "http://127.0.0.1:8000"
    
    # 1. Register
    register_url = f"{base_url}/auth/register"
    unique_email = f"test_{int(time.time())}@example.com"
    password = "password123"
    
    register_payload = {
        "email": unique_email,
        "password": password,
        "name": "Test Flow User",
        "role": "student",
        "location": "Flow City"
    }
    
    print(f"1. Testing REGISTER with {unique_email}...")
    try:
        reg_resp = requests.post(register_url, json=register_payload, timeout=5)
        print(f"   Status: {reg_resp.status_code}")
        if reg_resp.status_code not in [200, 201]:
            print(f"   FAILED: {reg_resp.text}")
            return
        print("   SUCCESS: Registered.")
    except Exception as e:
        print(f"   ERROR: {e}")
        return

    # 2. Login
    login_url = f"{base_url}/auth/login"
    login_payload = {
        "email": unique_email,
        "password": password
    }
    
    print(f"2. Testing LOGIN with {unique_email}...")
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=5)
        print(f"   Status: {login_resp.status_code}")
        if login_resp.status_code != 200:
            print(f"   FAILED: {login_resp.text}")
            return
        
        data = login_resp.json()
        if "access_token" in data:
            print("   SUCCESS: Logged in. Token received.")
        else:
            print(f"   FAILED: No token in response: {data}")
            
    except Exception as e:
        print(f"   ERROR: {e}")

if __name__ == "__main__":
    test_auth_flow()
