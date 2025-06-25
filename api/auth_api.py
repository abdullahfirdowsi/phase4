"""
Enhanced Authentication API with new database structure
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import UserCreate, UserUpdate, UserProfile, APIResponse
from services.user_service import user_service
from services.chat_service import chat_service
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
import logging
import requests
import json

logger = logging.getLogger(__name__)

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

def is_default_admin(email: str) -> bool:
    """Check if email should have admin privileges"""
    return email.lower() == DEFAULT_ADMIN_EMAIL.lower()

@auth_router.post("/signup")
async def signup(user_data: UserCreate):
    """User registration endpoint"""
    try:
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
        user = await user_service.get_user_by_username(username)
        
        if not user or not bcrypt.checkpw(password.encode('utf-8'), user["password_hash"].encode('utf-8')):
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

@auth_router.get("/check-admin")
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
    username: str = Body(...),
    preferences: dict = Body(...),
    current_user: str = Depends(get_current_user)
):
    """Update user preferences"""
    try:
        if current_user != username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        update_data = UserUpdate(preferences=preferences)
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
    username: str = Body(...),
    profile: dict = Body(...),
    current_user: str = Depends(get_current_user)
):
    """Update user profile"""
    try:
        if current_user != username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        update_data = UserUpdate(profile=profile)
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