import requests
import sys

def check_backend():
    url = "http://127.0.0.1:8000/health"
    print(f"Checking {url}...")
    try:
        response = requests.get(url, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        if response.status_code == 200:
            print("SUCCESS: Backend is reachable.")
        else:
            print("FAILURE: Backend returned unexpected status.")
    except Exception as e:
        print(f"FAILURE: Could not connect to backend. Error: {e}")

if __name__ == "__main__":
    check_backend()
