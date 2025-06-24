"""
File Upload API - Handles file uploads to S3
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from services.s3_service import s3_service
from models.schemas import UploadFileResponse
import logging
import os
import uuid
import mimetypes

logger = logging.getLogger(__name__)

upload_router = APIRouter()

@upload_router.post("/image", response_model=UploadFileResponse)
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image file to S3
    
    Args:
        file: Image file to upload
        
    Returns:
        UploadFileResponse with URL and key
    """
    try:
        # Validate file type
        content_type = file.content_type
        if not content_type or not content_type.startswith('image/'):
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
            ext = mimetypes.guess_extension(content_type) or ".jpg"
        
        # Generate unique filename
        filename = f"avatar_{uuid.uuid4()}{ext}"
        
        # Upload to S3
        result = s3_service.upload_file(
            file_obj=file.file,
            filename=filename,
            content_type=content_type,
            folder="avatars"
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Image uploaded successfully",
                "url": result["url"],
                "key": result["key"]
            }
        else:
            return {
                "success": False,
                "message": "Failed to upload image",
                "error": result["error"]
            }
            
    except Exception as e:
        logger.error(f"❌ Image upload error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to upload image",
                "error": str(e)
            }
        )

@upload_router.post("/audio", response_model=UploadFileResponse)
async def upload_audio(file: UploadFile = File(...)):
    """
    Upload an audio file to S3
    
    Args:
        file: Audio file to upload
        
    Returns:
        UploadFileResponse with URL and key
    """
    try:
        # Validate file type
        content_type = file.content_type
        if not content_type or not content_type.startswith('audio/'):
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Invalid file type. Only audio files are allowed.",
                    "error": "Invalid file type"
                }
            )
        
        # Get file extension
        ext = os.path.splitext(file.filename)[1] if file.filename else ""
        if not ext:
            # Try to guess extension from content type
            ext = mimetypes.guess_extension(content_type) or ".mp3"
        
        # Generate unique filename
        filename = f"audio_{uuid.uuid4()}{ext}"
        
        # Upload to S3
        result = s3_service.upload_file(
            file_obj=file.file,
            filename=filename,
            content_type=content_type,
            folder="audio"
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Audio uploaded successfully",
                "url": result["url"],
                "key": result["key"]
            }
        else:
            return {
                "success": False,
                "message": "Failed to upload audio",
                "error": result["error"]
            }
            
    except Exception as e:
        logger.error(f"❌ Audio upload error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to upload audio",
                "error": str(e)
            }
        )

@upload_router.post("/video", response_model=UploadFileResponse)
async def upload_video(file: UploadFile = File(...)):
    """
    Upload a video file to S3
    
    Args:
        file: Video file to upload
        
    Returns:
        UploadFileResponse with URL and key
    """
    try:
        # Validate file type
        content_type = file.content_type
        if not content_type or not content_type.startswith('video/'):
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Invalid file type. Only video files are allowed.",
                    "error": "Invalid file type"
                }
            )
        
        # Get file extension
        ext = os.path.splitext(file.filename)[1] if file.filename else ""
        if not ext:
            # Try to guess extension from content type
            ext = mimetypes.guess_extension(content_type) or ".mp4"
        
        # Generate unique filename
        filename = f"video_{uuid.uuid4()}{ext}"
        
        # Upload to S3
        result = s3_service.upload_file(
            file_obj=file.file,
            filename=filename,
            content_type=content_type,
            folder="videos"
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Video uploaded successfully",
                "url": result["url"],
                "key": result["key"]
            }
        else:
            return {
                "success": False,
                "message": "Failed to upload video",
                "error": result["error"]
            }
            
    except Exception as e:
        logger.error(f"❌ Video upload error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to upload video",
                "error": str(e)
            }
        )

@upload_router.delete("/{file_key}")
async def delete_file(file_key: str):
    """
    Delete a file from S3
    
    Args:
        file_key: S3 object key
        
    Returns:
        Success message
    """
    try:
        result = s3_service.delete_file(file_key)
        
        if result:
            return {
                "success": True,
                "message": "File deleted successfully"
            }
        else:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Failed to delete file"
                }
            )
            
    except Exception as e:
        logger.error(f"❌ File deletion error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to delete file",
                "error": str(e)
            }
        )