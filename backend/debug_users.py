
from app import SessionLocal
from app.models.user import User
from app.services.recommendation_service import recommend_users_by_location
import sys
import os

# Force IPv4 loopback for local debug
os.environ["DATABASE_URL"] = "mysql+pymysql://root:@127.0.0.1/knownet"

def inspect_users():
    db = SessionLocal()
    try:
        # Fetch users by partial name matches
        users = db.query(User).all()
        
        print(f"Listing ALL {len(users)} users in DB:")
        for u in users:
            print(f"ID: {u.id} | Name: '{u.name}' | City: '{u.city}' | Location: '{u.location}' | Lat: {u.latitude} | Lon: {u.longitude} | Role: {u.role}")

        # Assuming ID 1 and 2 are the ones we care about based on previous output
        user1 = db.query(User).filter(User.id == 1).first()
        user2 = db.query(User).filter(User.id == 2).first()

        if user1 and user2:
            print(f"\n--- Testing Recs for {user1.name} (ID: {user1.id}) ---")
            
            # Test direct service call
            from app.services import dashboard_service
            # Mocking logic check
            # We want to see what happens if we force one user to be far away
            
            print("Calling dashboard_service.get_dashboard_overview(db, user=user1)...")
            overview = dashboard_service.get_dashboard_overview(db, user=user1)
            
            users_near = overview.get('users_near_you', [])
            print(f"Users Near You (Count: {len(users_near)}):")
            for u in users_near:
                print(f"  - {u['name']} (ID: {u['id']}) [Dist: {u['distance_km']}]")

        else:
            print("Could not find both user 1 and user 2")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_users()
