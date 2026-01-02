
import requests

def debug_direct():
    url = "http://127.0.0.1:8000/auth/login"
    print(f"Testing OPTIONS DIRECTLY at: {url}")
    headers = {
        "Origin": "http://10.185.193.136:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
    }
    try:
        response = requests.options(url, headers=headers, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {response.headers}")
        
        allow_origin = response.headers.get("access-control-allow-origin")
        print(f"Access-Control-Allow-Origin: {allow_origin}")
            
    except Exception as e:
        print(f"FAILURE: Error sending OPTIONS: {e}")

if __name__ == "__main__":
    debug_direct()
