"""
Avatar API - Handles avatar video generation
"""
from fastapi import APIRouter, HTTPException, Body, BackgroundTasks
from fastapi.responses import JSONResponse
from services.avatar_service import avatar_service
from models.schemas import GenerateAvatarRequest, GenerateAvatarResponse
import logging

logger = logging.getLogger(__name__)

avatar_router = APIRouter()

@avatar_router.post("/generate-avatar", response_model=GenerateAvatarResponse)
async def generate_avatar(
    request: GenerateAvatarRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate avatar video for a lesson
    
    Args:
        request: Avatar generation request
        background_tasks: FastAPI background tasks
        
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
        
        # Process avatar generation in background
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
async def get_avatar_status(lesson_id: str):
    """
    Get avatar generation status for a lesson
    
    Args:
        lesson_id: ID of the lesson
        
    Returns:
        Status information
    """
    try:
        # Get lesson from database
        collections = avatar_service.collections
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
                "status": "pending",
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