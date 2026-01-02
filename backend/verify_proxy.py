import requests

def verify_proxy():
    url = "http://localhost:5173/api/health"
    print(f"Checking Proxy at: {url}")
    try:
        response = requests.get(url, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        if response.status_code == 200:
            print("SUCCESS: Proxy is working and Backend is reachable.")
        else:
            print("FAILURE: Proxy returned unexpected status.")
    except Exception as e:
        print(f"FAILURE: Could not connect via proxy. Error: {e}")

if __name__ == "__main__":
    verify_proxy()
