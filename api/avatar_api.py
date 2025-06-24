"""
Avatar API - Handles avatar video generation
"""
from fastapi import APIRouter, HTTPException, Body, BackgroundTasks, Query, Depends
from fastapi.responses import JSONResponse
from services.avatar_service import avatar_service
from services.did_service import did_service
from models.schemas import GenerateAvatarRequest, GenerateAvatarResponse
from typing import List, Dict, Any, Optional
import logging
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
        
        # Check if D-ID service is configured
        if not did_service.is_configured:
            # Fall back to the original avatar service if D-ID is not configured
            background_tasks.add_task(
                avatar_service.process_avatar_generation,
                lesson_id=request.lesson_id,
                avatar_image_url=request.avatar_image_url,
                language=request.voice_language
            )
        else:
            # Use D-ID service for avatar generation
            background_tasks.add_task(
                did_service.process_avatar_generation,
                lesson_id=request.lesson_id,
                avatar_image_url=request.avatar_image_url,
                voice_id=None,  # Use default voice
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
        avatar_status = lesson.get("avatar_status", "pending")
        
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
    Get available voices from D-ID API
    
    Args:
        current_user: Authenticated user
        
    Returns:
        List of available voices
    """
    try:
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
    Create a voice clone using D-ID API
    
    Args:
        audio_url: URL of the audio sample
        voice_name: Name for the voice clone
        current_user: Authenticated user
        
    Returns:
        Voice clone result
    """
    try:
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
        voice_id: D-ID voice ID
        current_user: Authenticated user
        
    Returns:
        Voice status
    """
    try:
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
async def did_webhook(
    payload: Dict[str, Any] = Body(...),
    signature: str = Query(None, alias="x-did-signature")
):
    """
    Webhook endpoint for D-ID status updates
    
    Args:
        payload: Webhook payload
        signature: D-ID signature for verification
        
    Returns:
        Acknowledgement
    """
    try:
        # Verify webhook signature if configured
        if did_service.webhook_secret and signature:
            # In a real implementation, verify the signature here
            # This would involve creating a hash of the payload with your webhook secret
            # and comparing it to the provided signature
            pass
        
        # Process webhook payload
        talk_id = payload.get("id")
        status = payload.get("status")
        result_url = payload.get("result_url")
        
        if not talk_id or not status:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Invalid webhook payload"
                }
            )
        
        logger.info(f"📣 D-ID Webhook: Talk {talk_id} status: {status}")
        
        if status == "done" and result_url:
            # Find the lesson associated with this talk_id
            collections = did_service.collections
            lesson = collections['lessons'].find_one({"did_talk_id": talk_id})
            
            if lesson:
                lesson_id = lesson.get("lesson_id")
                
                # Download and upload to S3
                upload_result = await did_service.download_and_upload_video(result_url, lesson_id)
                
                if upload_result["success"]:
                    # Update lesson with avatar video URL
                    collections['lessons'].update_one(
                        {"lesson_id": lesson_id},
                        {"$set": {
                            "avatar_video_url": upload_result["s3_url"],
                            "avatar_status": "completed",
                            "updated_at": time.time()
                        }}
                    )
                    
                    logger.info(f"✅ Avatar video updated for lesson: {lesson_id}")
                else:
                    logger.error(f"❌ Failed to process webhook video: {upload_result['error']}")
        
        return {
            "success": True,
            "message": "Webhook received"
        }
        
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