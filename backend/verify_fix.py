
from app import SessionLocal
from app.models.user import User
from app.services.recommendation_service import recommend_users_by_location
import sys
import os

# Force IPv4 loopback matching verification script
os.environ["DATABASE_URL"] = "mysql+pymysql://root:@127.0.0.1/knownet"

def verify_fix():
    db = SessionLocal()
    try:
        sindhu = db.get(User, 1)
        srishti = db.get(User, 2)
        
        if not sindhu or not srishti:
            print("Users not found by ID 1 and 2")
            return

        print(f"Testing Recommendation for {sindhu.name} (Loc: {sindhu.location}) -> Looking for {srishti.name} (Loc: {srishti.location})")
        
        # Simulate recommendation call
        # We need to pass list of 'other' users.
        all_others = db.query(User).filter(User.id != sindhu.id).all()
        
        rec = recommend_users_by_location(sindhu, all_others)
        
        found = False
        print("\nLocal Recommendations:")
        for r in rec['local']:
            print(f"  - {r['name']} (Dist: {r['distance_km']} km)")
            if r['id'] == srishti.id:
                found = True
        
        if found:
            print("\n[SUCCESS] Srishti found in Sindhu's recommendations!")
        else:
            print("\n[FAILURE] Srishti NOT found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_fix()
