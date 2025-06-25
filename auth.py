import os
import bcrypt
from jose import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from database import users_collection, chats_collection
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Router for authentication
auth_router = APIRouter()

# JWT Secret
JWT_SECRET = os.getenv("JWT_SECRET")

# Default admin email
DEFAULT_ADMIN_EMAIL = "blackboxgenai@gmail.com"

# Request Models
class SignupRequest(BaseModel):
    name: str
    username: str
    password: str
    isAdmin: bool = False  # Added admin flag

class LoginRequest(BaseModel):
    username: str
    password: str

# Password Hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

# Generate JWT Token
def create_jwt_token(username: str):
    expiration = datetime.utcnow() + timedelta(days=1)
    payload = {"sub": username, "exp": expiration}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

# Get current user from token
def get_current_user(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Check if email should have admin privileges
def is_default_admin(email: str) -> bool:
    """Check if the email is the default admin email"""
    return email.lower() == DEFAULT_ADMIN_EMAIL.lower()

# Signup Endpoint
@auth_router.post("/signup")
async def signup(request: SignupRequest):
    if not request.name.strip() or not request.username.strip() or not request.password.strip():
        raise HTTPException(status_code=400, detail="All fields are required")

    if users_collection.find_one({"username": request.username}):
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = hash_password(request.password)

    # Default Preferences
    default_preferences = {
        "userRole": "Student",
        "timeValue": 15,
        "language": "English",
        "ageGroup": "Above 18"
    }

    # Check if this is the default admin email
    is_admin = is_default_admin(request.username) or request.isAdmin

    # Create user document
    user_doc = {
        "name": request.name,
        "username": request.username,
        "password": hashed_password,
        "isAdmin": is_admin,  # Store admin status (auto-grant for default admin email)
        "preferences": default_preferences,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "stats": {
            "totalGoals": 0,
            "completedGoals": 0,
            "totalQuizzes": 0,
            "averageScore": 0,
            "streakDays": 0,
            "totalStudyTime": 0
        }
    }

    users_collection.insert_one(user_doc)

    success_message = "User registered successfully with default preferences"
    if is_admin:
        success_message += " (Admin privileges granted)"

    return {"message": success_message, "isAdmin": is_admin}

# Login Endpoint
@auth_router.post("/login")
async def login(request: LoginRequest):
    user = users_collection.find_one({"username": request.username})
    
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    # Check and add default preferences if not present
    default_preferences = {
        "userRole": "Student",
        "timeValue": 15,
        "language": "English",
        "ageGroup": "Above 18"
    }
    
    if not user.get("preferences"):
        users_collection.update_one(
            {"username": request.username},
            {"$set": {"preferences": default_preferences}}
        )
        user["preferences"] = default_preferences

    # Ensure stats exist
    if not user.get("stats"):
        default_stats = {
            "totalGoals": 0,
            "completedGoals": 0,
            "totalQuizzes": 0,
            "averageScore": 0,
            "streakDays": 0,
            "totalStudyTime": 0
        }
        users_collection.update_one(
            {"username": request.username},
            {"$set": {"stats": default_stats}}
        )
        user["stats"] = default_stats

    # Check if user should have admin privileges (for existing users)
    current_admin_status = user.get("isAdmin", False)
    should_be_admin = is_default_admin(request.username)
    
    # Update admin status if needed
    if should_be_admin and not current_admin_status:
        users_collection.update_one(
            {"username": request.username},
            {"$set": {"isAdmin": True}}
        )
        current_admin_status = True
        print(f"✅ Admin privileges granted to {request.username}")

    token = create_jwt_token(request.username)
    return {
        "token": token, 
        "username": request.username, 
        "preferences": user["preferences"], 
        "name": user["name"],
        "isAdmin": current_admin_status  # Include admin status in response
    }

# Get User Profile Endpoint
@auth_router.get("/profile")
async def get_user_profile(username: str = Query(...)):
    try:
        user = users_collection.find_one({"username": username})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Calculate real-time stats from chat collection
        chat_session = chats_collection.find_one({"username": username})
        learning_goals = chat_session.get("learning_goals", []) if chat_session else []
        
        # Calculate stats
        total_goals = len(learning_goals)
        completed_goals = sum(1 for goal in learning_goals if goal.get("progress", 0) >= 100)
        
        # Count quiz messages in chat history - Fixed the error here
        messages = chat_session.get("messages", []) if chat_session else []
        quiz_messages = []
        for msg in messages:
            content = msg.get("content", "")
            # Ensure content is a string before calling .lower()
            if isinstance(content, str) and "quiz" in content.lower():
                quiz_messages.append(msg)
        
        total_quizzes = len(quiz_messages)
        
        # Update user stats
        updated_stats = {
            "totalGoals": total_goals,
            "completedGoals": completed_goals,
            "totalQuizzes": total_quizzes,
            "averageScore": user.get("stats", {}).get("averageScore", 0),
            "streakDays": user.get("stats", {}).get("streakDays", 0),
            "totalStudyTime": user.get("stats", {}).get("totalStudyTime", 0)
        }
        
        users_collection.update_one(
            {"username": username},
            {"$set": {"stats": updated_stats}}
        )

        # Check if user should have admin privileges (for profile updates)
        current_admin_status = user.get("isAdmin", False)
        should_be_admin = is_default_admin(username)
        
        if should_be_admin and not current_admin_status:
            users_collection.update_one(
                {"username": username},
                {"$set": {"isAdmin": True}}
            )
            current_admin_status = True

        return {
            "name": user["name"],
            "username": user["username"],
            "isAdmin": current_admin_status,
            "preferences": user.get("preferences", {}),
            "stats": updated_stats,
            "created_at": user.get("created_at")
        }
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")

# Admin check endpoint
@auth_router.get("/check-admin")
async def check_admin_status(username: str = Query(...)):
    """Check if user has admin privileges"""
    try:
        user = users_collection.find_one({"username": username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user should have admin privileges
        current_admin_status = user.get("isAdmin", False)
        should_be_admin = is_default_admin(username)
        
        # Update admin status if needed
        if should_be_admin and not current_admin_status:
            users_collection.update_one(
                {"username": username},
                {"$set": {"isAdmin": True}}
            )
            current_admin_status = True
            print(f"✅ Admin privileges auto-granted to {username}")
        
        return {"isAdmin": current_admin_status}
    except Exception as e:
        print(f"Error checking admin status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check admin status")

# Promote user to admin (for development/testing)
@auth_router.post("/promote-admin")
async def promote_to_admin(username: str = Query(...), admin_username: str = Query(...)):
    """Promote a user to admin (admin only)"""
    try:
        # Check if requesting user is admin
        admin_user = users_collection.find_one({"username": admin_username})
        if not admin_user or not admin_user.get("isAdmin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Promote user
        result = users_collection.update_one(
            {"username": username},
            {"$set": {"isAdmin": True}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": f"User {username} promoted to admin successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error promoting user to admin: {e}")
        raise HTTPException(status_code=500, detail="Failed to promote user")

# Get admin info endpoint
@auth_router.get("/admin-info")
async def get_admin_info():
    """Get information about admin configuration"""
    return {
        "default_admin_email": DEFAULT_ADMIN_EMAIL,
        "message": f"Users with email '{DEFAULT_ADMIN_EMAIL}' automatically receive admin privileges",
        "auto_admin_enabled": True
    }