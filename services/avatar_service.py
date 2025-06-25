"""
Avatar Service - Handles avatar video generation
"""
import os
import tempfile
import uuid
import logging
import asyncio
import time
from gtts import gTTS
from typing import Dict, Any, Optional
from services.s3_service import s3_service
from database_config import get_collections

logger = logging.getLogger(__name__)

class AvatarService:
    def __init__(self):
        self.collections = get_collections()
        self.lessons_collection = self.collections['lessons']
        self.temp_dir = tempfile.gettempdir()
    
    async def generate_voice_audio(self, 
                                 text: str, 
                                 language: str = "en", 
                                 slow: bool = False) -> Dict[str, Any]:
        """
        Generate voice audio from text using gTTS
        
        Args:
            text: Text to convert to speech
            language: Language code (e.g., 'en', 'hi', 'es')
            slow: Whether to speak slowly
            
        Returns:
            Dict with audio file path and S3 URL
        """
        try:
            # Create a unique filename
            audio_filename = f"audio_{uuid.uuid4()}.mp3"
            audio_path = os.path.join(self.temp_dir, audio_filename)
            
            # Generate audio file
            tts = gTTS(text=text, lang=language, slow=slow)
            tts.save(audio_path)
            
            logger.info(f"✅ Generated audio file: {audio_path}")
            
            # Upload to S3
            with open(audio_path, 'rb') as audio_file:
                upload_result = s3_service.upload_file(
                    file_obj=audio_file,
                    filename=audio_filename,
                    content_type="audio/mpeg",
                    folder="audio"
                )
            
            # Clean up local file
            if os.path.exists(audio_path):
                os.remove(audio_path)
            
            if upload_result["success"]:
                return {
                    "success": True,
                    "audio_path": audio_path,
                    "audio_url": upload_result["url"],
                    "audio_key": upload_result["key"]
                }
            else:
                return {
                    "success": False,
                    "error": upload_result["error"]
                }
            
        except Exception as e:
            logger.error(f"❌ Error generating voice audio: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def simulate_avatar_video_generation(self, 
                                            avatar_image_url: str, 
                                            audio_url: str) -> Dict[str, Any]:
        """
        Simulate avatar video generation (placeholder for Wav2Lip integration)
        
        Args:
            avatar_image_url: URL of the avatar image
            audio_url: URL of the audio file
            
        Returns:
            Dict with video URL
        """
        try:
            # In a real implementation, this would call Wav2Lip or similar
            # For now, we'll simulate the process with a delay
            
            logger.info(f"🎬 Simulating avatar video generation")
            logger.info(f"🖼️ Avatar image: {avatar_image_url}")
            logger.info(f"🔊 Audio: {audio_url}")
            
            # Simulate processing time
            await asyncio.sleep(2)
            
            # Create a dummy video file (in real implementation, this would be the output of Wav2Lip)
            video_filename = f"avatar_{uuid.uuid4()}.mp4"
            video_path = os.path.join(self.temp_dir, video_filename)
            
            # Create an empty file for demonstration
            with open(video_path, 'wb') as f:
                f.write(b'dummy video content')
            
            # Upload to S3
            with open(video_path, 'rb') as video_file:
                upload_result = s3_service.upload_file(
                    file_obj=video_file,
                    filename=video_filename,
                    content_type="video/mp4",
                    folder="videos"
                )
            
            # Clean up local file
            if os.path.exists(video_path):
                os.remove(video_path)
            
            if upload_result["success"]:
                return {
                    "success": True,
                    "video_url": upload_result["url"],
                    "video_key": upload_result["key"]
                }
            else:
                return {
                    "success": False,
                    "error": upload_result["error"]
                }
            
        except Exception as e:
            logger.error(f"❌ Error simulating avatar video generation: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def process_avatar_generation(self, 
                                      lesson_id: str, 
                                      avatar_image_url: str,
                                      language: str = "en") -> Dict[str, Any]:
        """
        Process avatar generation for a lesson
        
        Args:
            lesson_id: ID of the lesson
            avatar_image_url: URL of the avatar image
            language: Language for voice generation
            
        Returns:
            Dict with result information
        """
        try:
            # Get lesson content
            lesson = self.lessons_collection.find_one({"lesson_id": lesson_id})
            
            if not lesson:
                return {
                    "success": False,
                    "error": "Lesson not found",
                    "lesson_id": lesson_id
                }
            
            # Extract text content for voice generation
            content = lesson.get("content", "")
            if not content:
                return {
                    "success": False,
                    "error": "Lesson has no content",
                    "lesson_id": lesson_id
                }
            
            # Generate voice audio
            audio_result = await self.generate_voice_audio(
                text=content,
                language=language
            )
            
            if not audio_result["success"]:
                return {
                    "success": False,
                    "error": f"Voice generation failed: {audio_result['error']}",
                    "lesson_id": lesson_id
                }
            
            # Generate avatar video
            video_result = await self.simulate_avatar_video_generation(
                avatar_image_url=avatar_image_url,
                audio_url=audio_result["audio_url"]
            )
            
            if not video_result["success"]:
                return {
                    "success": False,
                    "error": f"Video generation failed: {video_result['error']}",
                    "lesson_id": lesson_id
                }
            
            # Update lesson with avatar video URL
            self.lessons_collection.update_one(
                {"lesson_id": lesson_id},
                {"$set": {
                    "avatar_video_url": video_result["video_url"],
                    "updated_at": time.time()
                }}
            )
            
            return {
                "success": True,
                "message": "Avatar video generated successfully",
                "lesson_id": lesson_id,
                "avatar_video_url": video_result["video_url"]
            }
            
        except Exception as e:
            logger.error(f"❌ Error processing avatar generation: {e}")
            return {
                "success": False,
                "error": str(e),
                "lesson_id": lesson_id
            }

# Global service instance
avatar_service = AvatarService()