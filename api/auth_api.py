"""
Enhanced Authentication API with new database structure
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import UserCreate, UserUpdate, UserProfile, APIResponse, UserProfileUpdate, UserPreferencesUpdate
from services.user_service import user_service
from services.chat_service import chat_service
import bcrypt
from jose import jwt
import os
from datetime import datetime, timedelta
import logging
import requests
import json

logger = logging.getLogger(__name__)
logger.info("🚀 AUTH API LOADED WITH NEW PROFILE UPDATE ENDPOINT - VERSION 2.0")

auth_router = APIRouter()
security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "blackboxgenai@gmail.com")

def create_jwt_token(username: str) -> str:
    """Create JWT token"""
    expiration = datetime.utcnow() + timedelta(days=1)
    payload = {"sub": username, "exp": expiration}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_jwt_token(token: str) -> str:
    """Verify JWT token and return username"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Get current user from JWT token"""
    return verify_jwt_token(credentials.credentials)

# Compatibility function for legacy imports
def get_current_user_from_token(token: str) -> str:
    """Legacy compatibility function for get_current_user"""
    return verify_jwt_token(token)

def is_default_admin(email: str) -> bool:
    """Check if email should have admin privileges"""
    return email.lower() == DEFAULT_ADMIN_EMAIL.lower()

@auth_router.post("/signup")
async def signup(user_data: UserCreate):
    """User registration endpoint"""
    try:
        # Normalize username and email to lowercase for consistency
        user_data.username = user_data.username.lower().strip()
        user_data.email = user_data.email.lower().strip()
        
        # Check if this is the default admin email
        if is_default_admin(user_data.username):
            user_data.is_admin = True
        
        result = await user_service.create_user(user_data)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        success_message = result.message
        if user_data.is_admin:
            success_message += " (Admin privileges granted)"
        
        return {
            "message": success_message,
            "isAdmin": user_data.is_admin
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@auth_router.post("/login")
async def login(username: str = Body(...), password: str = Body(...)):
    """User login endpoint"""
    try:
        # Normalize username to lowercase for consistency
        username = username.lower().strip()
        
        user = await user_service.get_user_by_username(username)
        
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        
        # Check if this is a Google OAuth user trying to login with password
        if user["password_hash"] and bcrypt.checkpw("google-oauth-user".encode('utf-8'), user["password_hash"].encode('utf-8')):
            # This is a Google OAuth user - they need to set a password first
            raise HTTPException(
                status_code=423,  # 423 Locked - special status for password setup needed
                detail="google_oauth_password_setup_required"
            )
        
        if not bcrypt.checkpw(password.encode('utf-8'), user["password_hash"].encode('utf-8')):
            raise HTTPException(status_code=400, detail="Invalid credentials")
        
        # Check if user should have admin privileges
        should_be_admin = is_default_admin(username)
        current_admin_status = user.get("is_admin", False)
        
        # Update admin status if needed
        if should_be_admin and not current_admin_status:
            update_result = await user_service.update_user(username, UserUpdate())
            if update_result.success:
                current_admin_status = True
                logger.info(f"✅ Admin privileges granted to {username}")
        
        # Update last login
        await user_service.update_last_login(username)
        
        # Create JWT token
        token = create_jwt_token(username)
        
        # Get avatar URL
        avatar_url = user.get("profile", {}).get("avatar_url")
        
        return {
            "token": token,
            "username": username,
            "preferences": user.get("preferences", {}),
            "name": user.get("name", username),
            "isAdmin": current_admin_status,
            "avatarUrl": avatar_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@auth_router.post("/google-login")
async def google_login(request_body: dict = Body(...)):
    """Google login endpoint"""
    try:
        credential = request_body.get("credential")
        
        if not credential:
            raise HTTPException(status_code=422, detail="Missing credential in request body")
        
        logger.info(f"Received Google login request with credential length: {len(credential)}")
        
        # Determine if this is an access_token or id_token based on length and format
        if len(credential) > 1000:  # Likely an id_token (JWT)
            # Verify the Google token with Google's ID token verification endpoint
            google_response = requests.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
            )
        else:  # Likely an access_token
            # Verify the Google token with Google's access token verification endpoint
            google_response = requests.get(
                f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={credential}"
            )
        
        if google_response.status_code != 200:
            logger.error(f"Google token verification failed: {google_response.status_code} - {google_response.text}")
            raise HTTPException(status_code=400, detail="Invalid Google token")
        
        google_data = google_response.json()
        logger.info(f"Google data received: {json.dumps(google_data)}")
        
        email = google_data.get("email")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in Google token")
        
        # Normalize email to lowercase for consistency
        email = email.lower()
        
        # Check if user exists
        user = await user_service.get_user_by_username(email)
        
        if not user:
            # Create new user
            name = google_data.get("name", email.split("@")[0])
            picture = google_data.get("picture")
            
            # Check if this is the default admin email
            is_admin = is_default_admin(email)
            
            # Create user profile with avatar URL
            profile = UserProfile(
                avatar_url=picture,
                bio=None,
                skill_level="beginner"
            )
            
            user_data = UserCreate(
                username=email,
                email=email,
                password="google-oauth-user",  # This won't be used for login
                name=name,
                is_admin=is_admin,
                profile=profile
            )
            
            result = await user_service.create_user(user_data)
            
            if not result.success:
                raise HTTPException(status_code=400, detail=result.message)
            
            # Get the newly created user
            user = await user_service.get_user_by_username(email)
        else:
            # Update existing user's profile picture if it's not set
            if not user.get("profile", {}).get("avatar_url") and google_data.get("picture"):
                profile_update = UserProfile(avatar_url=google_data.get("picture"))
                await user_service.update_user(email, UserUpdate(profile=profile_update))
                # Refresh user data
                user = await user_service.get_user_by_username(email)
        
        # Check if user should have admin privileges
        should_be_admin = is_default_admin(email)
        current_admin_status = user.get("is_admin", False)
        
        # Update admin status if needed
        if should_be_admin and not current_admin_status:
            update_result = await user_service.update_user(email, UserUpdate())
            if update_result.success:
                current_admin_status = True
                logger.info(f"✅ Admin privileges granted to {email}")
        
        # Update last login
        await user_service.update_last_login(email)
        
        # Create JWT token
        token = create_jwt_token(email)
        
        # Get avatar URL
        avatar_url = user.get("profile", {}).get("avatar_url")
        
        return {
            "token": token,
            "username": email,
            "preferences": user.get("preferences", {}),
            "name": user.get("name", email),
            "isAdmin": current_admin_status,
            "avatarUrl": avatar_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google login error: {e}")
        raise HTTPException(status_code=500, detail="Google login failed")

@auth_router.get("/profile")
async def get_user_profile(username: str = Query(...)):
    """Get user profile endpoint"""
    try:
        user = await user_service.get_user_by_username(username)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Calculate real-time stats
        stats = await user_service.calculate_user_stats(username)
        
        # Check admin status
        current_admin_status = user.get("is_admin", False)
        should_be_admin = is_default_admin(username)
        
        if should_be_admin and not current_admin_status:
            await user_service.update_user(username, UserUpdate())
            current_admin_status = True
        
        return {
            "name": user.get("name", username),
            "username": user["username"],
            "email": user["email"],
            "isAdmin": current_admin_status,
            "preferences": user.get("preferences", {}),
            "profile": user.get("profile", {}),
            "stats": stats.dict(),
            "created_at": user.get("created_at"),
            "avatarUrl": user.get("profile", {}).get("avatar_url")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")

@auth_router.get("/admin/moderation")
async def get_content_for_moderation(username: str = Query(...)):
    """Get content that needs moderation (admin only)"""
    try:
        from database import users_collection, chats_collection

        # Verify admin status
        user = users_collection.find_one({"username": username})
        if not user or not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")

        # Fetch moderation content
        recent_lessons = list(chats_collection.find({"type": "user_lesson", "status": "published", "moderation_status": {"$exists": False}}).sort("created_at", -1).limit(20))
        reported_content = list(chats_collection.find({"type": "user_lesson", "reports": {"$exists": True, "$ne": []}}).sort("created_at", -1))

        for lesson in recent_lessons:
            lesson["_id"] = str(lesson["_id"])
        for content in reported_content:
            content["_id"] = str(content["_id"])

        return {"recent_lessons": recent_lessons, "reported_content": reported_content, "total_pending": len(recent_lessons) + len(reported_content)}
    except Exception as e:
        logger.error(f"Error fetching content for moderation: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch moderation content")

@auth_router.get("/admin/analytics")
async def get_admin_analytics(username: str = Query(...)):
    """Get platform analytics (admin only)"""
    try:
        from database import users_collection, chats_collection
        import datetime

        # Verify admin status
        user = users_collection.find_one({"username": username})
        if not user or not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")

        # Calculate analytics from existing data
        total_users = users_collection.count_documents({})
        admin_users = users_collection.count_documents({"is_admin": True})
        active_users = users_collection.count_documents({"status": {"$ne": "blocked"}})
        
        total_lessons = chats_collection.count_documents({"type": "user_lesson"})
        published_lessons = chats_collection.count_documents({"type": "user_lesson", "status": "published"})
        
        # Get recent activity
        recent_activity = []
        recent_users = list(users_collection.find({}).sort("created_at", -1).limit(5))
        for u in recent_users:
            recent_activity.append({
                "type": "user_registration",
                "username": u["username"],
                "timestamp": u.get("created_at", datetime.datetime.utcnow().isoformat())
            })
        
        recent_lessons_list = list(chats_collection.find({"type": "user_lesson"}).sort("created_at", -1).limit(5))
        for lesson in recent_lessons_list:
            recent_activity.append({
                "type": "lesson_created",
                "lesson_title": lesson.get("title", "Untitled"),
                "created_by": lesson.get("created_by", "Unknown"),
                "timestamp": lesson.get("created_at", datetime.datetime.utcnow().isoformat())
            })
        
        # Sort by timestamp
        recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)
        recent_activity = recent_activity[:10]
        
        # Get top lessons and users
        top_lessons = list(chats_collection.find({"type": "user_lesson"}).sort("views", -1).limit(5))
        for lesson in top_lessons:
            lesson["_id"] = str(lesson["_id"])
        
        # Get top users by lesson count
        pipeline = [
            {"$match": {"type": "user_lesson"}},
            {"$group": {"_id": "$created_by", "lesson_count": {"$sum": 1}}},
            {"$sort": {"lesson_count": -1}},
            {"$limit": 5}
        ]
        top_users_data = list(chats_collection.aggregate(pipeline))
        
        top_users = []
        for user_data in top_users_data:
            user_details = users_collection.find_one({"username": user_data["_id"]})
            if user_details:
                top_users.append({
                    "username": user_data["_id"],
                    "name": user_details.get("name", user_data["_id"]),
                    "lesson_count": user_data["lesson_count"]
                })
        
        # Calculate total views
        total_views = 0
        for lesson in chats_collection.find({"type": "user_lesson"}):
            total_views += lesson.get("views", 0)
        
        analytics = {
            "total_users": total_users,
            "active_users": active_users,
            "admin_users": admin_users,
            "total_lessons": total_lessons,
            "published_lessons": published_lessons,
            "total_views": total_views,
            "recent_activity": recent_activity,
            "top_lessons": top_lessons,
            "top_users": top_users,
            "generated_at": datetime.datetime.utcnow().isoformat()
        }
        
        return analytics
    except Exception as e:
        logger.error(f"Error fetching admin analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics data")

@auth_router.get("/auth/check-admin")
async def check_admin_status(username: str = Query(...)):
    """Check if user has admin privileges"""
    try:
        user = await user_service.get_user_by_username(username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_admin_status = user.get("is_admin", False)
        should_be_admin = is_default_admin(username)
        
        if should_be_admin and not current_admin_status:
            await user_service.update_user(username, UserUpdate())
            current_admin_status = True
            logger.info(f"✅ Admin privileges auto-granted to {username}")
        
        return {"isAdmin": current_admin_status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin check error: {e}")
        raise HTTPException(status_code=500, detail="Failed to check admin status")

@auth_router.post("/update-preferences")
async def update_user_preferences(
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Update user preferences"""
    try:
        # Get the raw JSON body
        request_data = await request.json()
        
        logger.info(f"RAW PREFERENCES REQUEST: {request_data}")
        logger.info(f"PREFERENCES REQUEST TYPE: {type(request_data)}")
        
        # Extract data from request
        username = request_data.get("username")
        preferences = request_data.get("preferences")
        
        logger.info(f"Preferences update request: username={username}, preferences={preferences}")
        
        if not username:
            raise HTTPException(status_code=400, detail="Username is required")
            
        if current_user != username:
            raise HTTPException(status_code=403, detail="Access denied")
            
        if not preferences:
            raise HTTPException(status_code=400, detail="Preferences data is required")
        
        try:
            update_data = UserUpdate(preferences=UserPreferencesUpdate(**preferences))
        except Exception as pref_error:
            logger.error(f"Preferences validation error: {pref_error}")
            raise HTTPException(status_code=422, detail=f"Invalid preferences data: {pref_error}")
            
        result = await user_service.update_user(username, update_data)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return {"message": "Preferences updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preferences update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update preferences")

@auth_router.post("/update-profile")
async def update_user_profile(
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Update user profile and basic info"""
    try:
        # Get the raw JSON body
        request_data = await request.json()
        
        logger.info(f"RAW REQUEST RECEIVED: {request_data}")
        logger.info(f"REQUEST TYPE: {type(request_data)}")
        
        # Extract data from request
        username = request_data.get("username")
        name = request_data.get("name")
        profile = request_data.get("profile")
        
        logger.info(f"Profile update request: username={username}, name={name}, profile={profile}")
        
        if not username:
            raise HTTPException(status_code=400, detail="Username is required")
            
        if current_user != username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Build update data
        update_dict = {}
        
        # Add name if provided
        if name is not None and name.strip():
            update_dict["name"] = name.strip()
            
        # Add profile if provided
        if profile is not None:
            try:
                update_dict["profile"] = UserProfileUpdate(**profile)
            except Exception as profile_error:
                logger.error(f"Profile validation error: {profile_error}")
                raise HTTPException(status_code=422, detail=f"Invalid profile data: {profile_error}")
        
        if not update_dict:
            raise HTTPException(status_code=400, detail="No valid data provided for update")
        
        update_data = UserUpdate(**update_dict)
        result = await user_service.update_user(username, update_data)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return {"message": "Profile updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@auth_router.get("/admin-info")
async def get_admin_info():
    """Get information about admin configuration"""
    return {
        "default_admin_email": DEFAULT_ADMIN_EMAIL,
        "message": f"Users with email '{DEFAULT_ADMIN_EMAIL}' automatically receive admin privileges",
        "auto_admin_enabled": True
    }

@auth_router.post("/setup-password")
async def setup_password_for_google_user(
    username: str = Body(...), 
    new_password: str = Body(...)
):
    """Setup password for Google OAuth users"""
    try:
        # Normalize username to lowercase for consistency
        username = username.lower().strip()
        
        user = await user_service.get_user_by_username(username)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify this is a Google OAuth user
        if not (user["password_hash"] and bcrypt.checkpw("google-oauth-user".encode('utf-8'), user["password_hash"].encode('utf-8'))):
            raise HTTPException(
                status_code=400, 
                detail="This endpoint is only for Google OAuth users who haven't set a password yet"
            )
        
        # Validate password
        if len(new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
        
        # Hash the new password
        new_password_hash = bcrypt.hashpw(
            new_password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Update user's password in database
        from database import get_collections
        collections = get_collections()
        users_collection = collections['users']
        
        result = users_collection.update_one(
            {"username": {"$regex": f"^{username}$", "$options": "i"}},
            {
                "$set": {
                    "password_hash": new_password_hash,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Password setup completed for Google OAuth user: {username}")
        
        return {
            "message": "Password setup successful! You can now login with both Google OAuth and email/password.",
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password setup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to setup password")

@auth_router.get("/users-overview")
async def get_users_overview(current_user: str = Depends(get_current_user)):
    """Get overview of all users (admin only)"""
    try:
        result = await user_service.get_users_overview(current_user)
        
        if not result.success:
            raise HTTPException(status_code=403, detail=result.message)
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Users overview error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get users overview")
