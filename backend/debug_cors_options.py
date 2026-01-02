
import requests

def debug_options():
    url = "http://localhost:5173/api/auth/login"
    print(f"Testing OPTIONS at: {url}")
    headers = {
        "Origin": "http://10.185.193.136:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
    }
    try:
        response = requests.options(url, headers=headers, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {response.headers}")
        
        if response.status_code in [200, 204]:
            print("SUCCESS: OPTIONS request accepted.")
            allow_origin = response.headers.get("access-control-allow-origin")
            print(f"Access-Control-Allow-Origin: {allow_origin}")
        else:
            print(f"FAILURE: OPTIONS returned {response.status_code}")
            
    except Exception as e:
        print(f"FAILURE: Error sending OPTIONS: {e}")

if __name__ == "__main__":
    debug_options()
