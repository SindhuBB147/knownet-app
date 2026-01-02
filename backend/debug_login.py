import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_auth():
    print("Testing Authentication Flow...")
    
    # 1. Register
    email = "debug_user_123@example.com"
    password = "password123"
    register_payload = {
        "name": "Debug User",
        "email": email,
        "password": password,
        "role": "learner",
        "location": "Debug City",
        "latitude": 0.0,
        "longitude": 0.0
    }
    
    print(f"\n1. Attempting Register ({email})...")
    try:
        reg_res = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
        print(f"Status: {reg_res.status_code}")
        if reg_res.status_code == 200:
            print("Registration Success:", reg_res.json().get("access_token")[:20] + "...")
        elif reg_res.status_code == 400 and "already registered" in reg_res.text:
            print("User already exists, proceeding to login...")
        else:
            print("Registration Failed:", reg_res.text)
            return
    except Exception as e:
        print(f"Request Failed: {e}")
        return

    # 2. Login
    print(f"\n2. Attempting Login ({email})...")
    login_payload = {
        "email": email,
        "password": password
    }
    try:
        login_res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        print(f"Status: {login_res.status_code}")
        if login_res.status_code == 200:
            print("Login Success!")
            print("Token:", login_res.json().get("access_token")[:20] + "...")
            print("User:", login_res.json().get("user"))
        else:
            print("Login Failed:", login_res.text)
    except Exception as e:
        print(f"Request Failed: {e}")

if __name__ == "__main__":
    test_auth()
