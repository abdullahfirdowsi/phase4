"""
Profile API - Handles user profile operations
"""
from fastapi import APIRouter, HTTPException, Body, Query, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from models.schemas import UserProfile, APIResponse
from services.user_service import user_service
from services.s3_service import s3_service
from auth import get_current_user
import logging
import os
import uuid

logger = logging.getLogger(__name__)

profile_router = APIRouter()

@profile_router.get("/profile")
async def get_user_profile(username: str = Query(...), current_user: str = Depends(get_current_user)):
    """Get user profile endpoint"""
    try:
        # Verify user is requesting their own profile
        if current_user != username:
            raise HTTPException(status_code=403, detail="Access denied")
            
        user = await user_service.get_user_by_username(username)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Calculate real-time stats
        stats = await user_service.calculate_user_stats(username)
        
        # Check admin status
        current_admin_status = user.get("is_admin", False)
        
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

@profile_router.put("/profile")
async def update_user_profile(
    username: str = Body(...),
    profile: dict = Body(...),
    current_user: str = Depends(get_current_user)
):
    """Update user profile endpoint"""
    try:
        # Verify user is updating their own profile
        if current_user != username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update profile
        result = await user_service.update_user(username, {"profile": profile})
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return {"message": "Profile updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

@profile_router.patch("/profile/language")
async def update_language_preference(
    username: str = Body(...),
    language: str = Body(...),
    current_user: str = Depends(get_current_user)
):
    """Update language preference endpoint"""
    try:
        # Verify user is updating their own profile
        if current_user != username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get current user data
        user = await user_service.get_user_by_username(username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update language preference
        preferences = user.get("preferences", {})
        preferences["language"] = language
        
        # Update user preferences
        result = await user_service.update_user(username, {"preferences": preferences})
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return {"message": f"Language updated to {language} successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Language update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update language preference")

@profile_router.patch("/profile/password")
async def update_user_password(
    username: str = Body(...),
    current_password: str = Body(...),
    new_password: str = Body(...),
    current_user: str = Depends(get_current_user)
):
    """Update user password endpoint"""
    try:
        # Verify user is updating their own password
        if current_user != username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Verify current password and update to new password
        # This would be implemented in the user_service
        result = await user_service.update_password(username, current_password, new_password)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return {"message": "Password updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update password")

@profile_router.post("/profile/upload-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    """Upload profile image endpoint"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Invalid file type. Only images are allowed.",
                    "error": "Invalid file type"
                }
            )
        
        # Get file extension
        ext = os.path.splitext(file.filename)[1] if file.filename else ""
        if not ext:
            # Try to guess extension from content type
            import mimetypes
            ext = mimetypes.guess_extension(file.content_type) or ".jpg"
        
        # Generate unique filename
        filename = f"profile_{current_user}_{uuid.uuid4()}{ext}"
        
        # Upload to S3
        result = s3_service.upload_file(
            file_obj=file.file,
            filename=filename,
            content_type=file.content_type,
            folder="profiles"
        )
        
        if result["success"]:
            # Update user profile with new avatar URL
            user = await user_service.get_user_by_username(current_user)
            if not user:
                return JSONResponse(
                    status_code=404,
                    content={
                        "success": False,
                        "message": "User not found",
                        "error": "User not found"
                    }
                )
            
            # Get current profile or create new one
            profile = user.get("profile", {})
            profile["avatar_url"] = result["url"]
            
            # Update profile
            update_result = await user_service.update_user(current_user, {"profile": profile})
            
            if not update_result.success:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "message": update_result.message,
                        "error": "Failed to update profile"
                    }
                )
            
            return {
                "success": True,
                "message": "Profile image uploaded successfully",
                "url": result["url"]
            }
        else:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Failed to upload image",
                    "error": result["error"]
                }
            )
            
    except Exception as e:
        logger.error(f"Profile image upload error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to upload profile image",
                "error": str(e)
            }
        )

@profile_router.get("/profile/activity")
async def get_user_activity(
    username: str = Query(...),
    current_user: str = Depends(get_current_user)
):
    """Get user activity history endpoint"""
    try:
        # Verify user is requesting their own activity
        if current_user != username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get user activity from sessions collection
        activity = await user_service.get_user_activity(username)
        
        return {"activity": activity}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Activity history error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch activity history")