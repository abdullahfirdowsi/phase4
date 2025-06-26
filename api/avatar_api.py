"""
Avatar API - Handles avatar video generation
"""
from fastapi import APIRouter, HTTPException, Body, BackgroundTasks, Query, Depends, Header, Request
from fastapi.responses import JSONResponse
from services.avatar_service import avatar_service
from services.did_service import did_service
from services.tavus_service import tavus_service
from models.schemas import GenerateAvatarRequest, GenerateAvatarResponse, PredefinedAvatar, VoiceModel, AvatarCreationRequest
from typing import List, Dict, Any, Optional
import logging
import hmac
import hashlib
import time
from auth import get_current_user

logger = logging.getLogger(__name__)

avatar_router = APIRouter()

@avatar_router.post("/generate-avatar", response_model=GenerateAvatarResponse)
async def generate_avatar(
    request: GenerateAvatarRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user)
):
    """
    Generate avatar video for a lesson
    
    Args:
        request: Avatar generation request
        background_tasks: FastAPI background tasks
        current_user: Authenticated user
        
    Returns:
        GenerateAvatarResponse with status
    """
    try:
        # Validate request
        if not request.lesson_id:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Lesson ID is required",
                    "error": "Missing lesson_id",
                    "lesson_id": ""
                }
            )
        
        if not request.avatar_image_url:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Avatar image URL is required",
                    "error": "Missing avatar_image_url",
                    "lesson_id": request.lesson_id
                }
            )
        
        # Check if Tavus service is configured
        if tavus_service.is_configured:
            # Use Tavus service for avatar generation
            background_tasks.add_task(
                tavus_service.process_avatar_video_generation,
                lesson_id=request.lesson_id,
                avatar_url=request.avatar_image_url,
                voice_url=request.voice_url,
                voice_type=request.voice_type
            )
        # Check if D-ID service is configured as fallback
        elif did_service.is_configured:
            # Use D-ID service for avatar generation
            background_tasks.add_task(
                did_service.process_avatar_generation,
                lesson_id=request.lesson_id,
                avatar_image_url=request.avatar_image_url,
                voice_id=request.voice_id,
                language=request.voice_language
            )
        else:
            # Fall back to the original avatar service if neither is configured
            background_tasks.add_task(
                avatar_service.process_avatar_generation,
                lesson_id=request.lesson_id,
                avatar_image_url=request.avatar_image_url,
                language=request.voice_language
            )
        
        return {
            "success": True,
            "message": "Avatar generation started. This process may take a few minutes.",
            "lesson_id": request.lesson_id
        }
        
    except Exception as e:
        logger.error(f"❌ Avatar generation error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to start avatar generation",
                "error": str(e),
                "lesson_id": request.lesson_id if request else ""
            }
        )

@avatar_router.get("/status/{lesson_id}")
async def get_avatar_status(lesson_id: str, current_user: str = Depends(get_current_user)):
    """
    Get avatar generation status for a lesson
    
    Args:
        lesson_id: ID of the lesson
        current_user: Authenticated user
        
    Returns:
        Status information
    """
    try:
        # Get lesson from database
        collections = did_service.collections
        lesson = collections['lessons'].find_one({"lesson_id": lesson_id})
        
        if not lesson:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": "Lesson not found",
                    "lesson_id": lesson_id
                }
            )
        
        # Check if avatar video URL exists
        avatar_video_url = lesson.get("avatar_video_url")
        avatar_status = lesson.get("status", "pending")
        
        if avatar_video_url:
            return {
                "success": True,
                "message": "Avatar video is ready",
                "status": "completed",
                "lesson_id": lesson_id,
                "avatar_video_url": avatar_video_url
            }
        else:
            return {
                "success": True,
                "message": "Avatar video is not yet generated",
                "status": avatar_status,
                "lesson_id": lesson_id
            }
            
    except Exception as e:
        logger.error(f"❌ Avatar status error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to get avatar status",
                "error": str(e),
                "lesson_id": lesson_id
            }
        )

@avatar_router.get("/predefined-avatars")
async def get_predefined_avatars(current_user: str = Depends(get_current_user)):
    """
    Get list of predefined celebrity avatars
    
    Args:
        current_user: Authenticated user
        
    Returns:
        List of predefined avatars
    """
    try:
        avatars = await did_service.get_predefined_avatars()
        
        return {
            "success": True,
            "avatars": avatars
        }
        
    except Exception as e:
        logger.error(f"❌ Predefined avatars error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to get predefined avatars",
                "error": str(e)
            }
        )

@avatar_router.get("/available-voices")
async def get_available_voices(current_user: str = Depends(get_current_user)):
    """
    Get available voices from Tavus or D-ID API
    
    Args:
        current_user: Authenticated user
        
    Returns:
        List of available voices
    """
    try:
        # Try Tavus first, then fall back to D-ID
        if tavus_service.is_configured:
            # In a real implementation, you would call Tavus API to get voices
            # For now, return a placeholder
            return {
                "success": True,
                "voices": {
                    "tavus": {
                        "English": [
                            {"id": "default_male", "name": "Default Male", "gender": "male"},
                            {"id": "default_female", "name": "Default Female", "gender": "female"}
                        ]
                    }
                }
            }
        elif did_service.is_configured:
            result = await did_service.get_available_voices()
            
            if result["success"]:
                return {
                    "success": True,
                    "voices": result["voices"]
                }
            else:
                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "message": "Failed to get available voices",
                        "error": result["error"]
                    }
                )
        else:
            # Return default voices if neither service is configured
            return {
                "success": True,
                "voices": {
                    "default": {
                        "English": [
                            {"id": "default_male", "name": "Default Male", "gender": "male"},
                            {"id": "default_female", "name": "Default Female", "gender": "female"}
                        ]
                    }
                }
            }
            
    except Exception as e:
        logger.error(f"❌ Available voices error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to get available voices",
                "error": str(e)
            }
        )

@avatar_router.post("/create-voice-clone")
async def create_voice_clone(
    audio_url: str = Body(...),
    voice_name: str = Body(...),
    current_user: str = Depends(get_current_user)
):
    """
    Create a voice clone using Tavus or D-ID API
    
    Args:
        audio_url: URL of the audio sample
        voice_name: Name for the voice clone
        current_user: Authenticated user
        
    Returns:
        Voice clone result
    """
    try:
        # Try Tavus first, then fall back to D-ID
        if tavus_service.is_configured:
            # In a real implementation, you would call Tavus API to create voice clone
            # For now, return a placeholder
            voice_id = f"tavus_voice_{int(time.time())}"
            
            # Store voice ID in user profile
            collections = did_service.collections
            collections['users'].update_one(
                {"username": current_user},
                {"$set": {
                    "profile.voice_id": voice_id,
                    "profile.voice_name": voice_name
                }}
            )
            
            return {
                "success": True,
                "message": "Voice clone created successfully",
                "voice_id": voice_id,
                "status": "processing"
            }
        elif did_service.is_configured:
            result = await did_service.create_voice_clone(audio_url, voice_name)
            
            if result["success"]:
                # Store voice ID in user profile
                collections = did_service.collections
                collections['users'].update_one(
                    {"username": current_user},
                    {"$set": {
                        "profile.voice_id": result["voice_id"],
                        "profile.voice_name": voice_name
                    }}
                )
                
                return {
                    "success": True,
                    "message": "Voice clone created successfully",
                    "voice_id": result["voice_id"],
                    "status": result["status"]
                }
            else:
                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "message": "Failed to create voice clone",
                        "error": result["error"]
                    }
                )
        else:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Voice cloning service not configured",
                    "error": "No voice cloning service available"
                }
            )
            
    except Exception as e:
        logger.error(f"❌ Voice clone error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to create voice clone",
                "error": str(e)
            }
        )

@avatar_router.get("/voice-status/{voice_id}")
async def get_voice_status(
    voice_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get status of a voice clone
    
    Args:
        voice_id: Voice ID
        current_user: Authenticated user
        
    Returns:
        Voice status
    """
    try:
        # Try Tavus first, then fall back to D-ID
        if tavus_service.is_configured:
            # In a real implementation, you would call Tavus API to check voice status
            # For now, return a placeholder
            return {
                "success": True,
                "voice_id": voice_id,
                "status": "ready",
                "ready": True
            }
        elif did_service.is_configured:
            result = await did_service.get_voice_status(voice_id)
            
            if result["success"]:
                return {
                    "success": True,
                    "voice_id": voice_id,
                    "status": result["status"],
                    "ready": result["ready"]
                }
            else:
                return JSONResponse(
                    status_code=404,
                    content={
                        "success": False,
                        "message": "Voice not found",
                        "error": result["error"]
                    }
                )
        else:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Voice cloning service not configured",
                    "error": "No voice cloning service available"
                }
            )
            
    except Exception as e:
        logger.error(f"❌ Voice status error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to get voice status",
                "error": str(e)
            }
        )

@avatar_router.post("/webhook")
async def avatar_webhook(
    request: Request,
    x_signature: Optional[str] = Header(None)
):
    """
    Webhook endpoint for Tavus or D-ID status updates
    
    Args:
        request: Request object
        x_signature: Signature for verification
        
    Returns:
        Acknowledgement
    """
    try:
        # Get request body
        payload = await request.json()
        
        # Check for Tavus-specific fields
        if "video_id" in payload:
            # Process Tavus webhook
            result = await tavus_service.handle_webhook(payload)
        else:
            # Process D-ID webhook
            result = await did_service.handle_webhook(payload)
        
        if result["success"]:
            return {
                "success": True,
                "message": "Webhook processed successfully"
            }
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": f"Failed to process webhook: {result['error']}"
                }
            )
        
    except Exception as e:
        logger.error(f"❌ Webhook processing error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to process webhook",
                "error": str(e)
            }
        )