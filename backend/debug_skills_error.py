import requests
import sys

# Constants
BASE_URL = "http://127.0.0.1:8000"
REGISTER_URL = f"{BASE_URL}/auth/register"
LOGIN_URL = f"{BASE_URL}/auth/login"
SKILLS_URL = f"{BASE_URL}/profile/skills"

def debug_skills():
    # 1. Login (or register if needed) to get token
    # We'll try to login with a known user, or just create a temp one
    email = "debug_skills_user@example.com"
    password = "password123"
    
    session = requests.Session()
    
    print(f"Logging in as {email}...")
    login_payload = {"email": email, "password": password}
    try:
        resp = session.post(LOGIN_URL, json=login_payload)
        if resp.status_code != 200:
            # Try registering
            print("Login failed, trying to register...")
            reg_payload = {
                "name": "Debug User",
                "email": email,
                "password": password,
                "location": "Test City",
                "role": "student"
            }
            reg_resp = session.post(REGISTER_URL, json=reg_payload)
            if reg_resp.status_code != 200:
                 print(f"Registration failed: {reg_resp.text}")
                 return
            
            # Login again
            resp = session.post(LOGIN_URL, json=login_payload)
            if resp.status_code != 200:
                print(f"Login failed after registration: {resp.text}")
                return

        data = resp.json()
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Logged in successfully.")

        # 2. Call GET /profile/skills
        print(f"Calling GET {SKILLS_URL}...")
        skills_resp = session.get(SKILLS_URL, headers=headers)
        
        print(f"Status Code: {skills_resp.status_code}")
        print(f"Response Body: {skills_resp.text}")

        # 3. If empty, try adding a skill then listing
        if skills_resp.status_code == 200:
            print("Adding a dummy skill...")
            add_resp = session.post(SKILLS_URL, json={"name": "Debug Skill", "level": "Expert"}, headers=headers)
            print(f"Add Skill Status: {add_resp.status_code}")
            print(f"Add Skill Body: {add_resp.text}")
            
            print("Listing skills again...")
            skills_resp_2 = session.get(SKILLS_URL, headers=headers)
            print(f"Status Code: {skills_resp_2.status_code}")
            print(f"Response Body: {skills_resp_2.text}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    debug_skills()
