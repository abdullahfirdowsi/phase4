"""
D-ID Avatar Generation Service
Handles D-ID API integration for creating talking avatars
"""
import os
import requests
import asyncio
import logging
import uuid
import time
from typing import Dict, Any, Optional, List
from services.s3_service import s3_service
from database import get_collections

logger = logging.getLogger(__name__)

class DIDService:
    def __init__(self):
        self.api_key = os.getenv("DID_API_KEY")
        self.api_url = os.getenv("DID_API_URL", "https://api.d-id.com")
        self.webhook_secret = os.getenv("DID_WEBHOOK_SECRET")
        self.collections = get_collections()
        
        # Check if D-ID is configured
        self.is_configured = bool(
            self.api_key and 
            self.api_key != "your_did_api_key_here" and
            self.api_url
        )
        
        if not self.is_configured:
            logger.warning("⚠️ D-ID API not configured - avatar generation disabled")
        else:
            logger.info("✅ D-ID API configured successfully")
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers for D-ID API requests"""
        return {
            "Authorization": f"Basic {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def create_avatar_talk(self, 
                               source_url: str, 
                               script_text: str,
                               voice_id: Optional[str] = None,
                               webhook_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a talking avatar using D-ID API
        
        Args:
            source_url: URL of the source image (S3 URL)
            script_text: Text for the avatar to speak
            voice_id: Optional voice ID for custom voice
            webhook_url: Optional webhook URL for status updates
            
        Returns:
            Dict with creation result
        """
        try:
            if not self.is_configured:
                return {
                    "success": False,
                    "error": "D-ID API not configured"
                }
            
            # Prepare the request payload
            payload = {
                "source_url": source_url,
                "script": {
                    "type": "text",
                    "input": script_text,
                    "provider": {
                        "type": "microsoft",
                        "voice_id": voice_id or "en-US-JennyNeural"
                    }
                },
                "config": {
                    "fluent": True,
                    "pad_audio": 0.0,
                    "stitch": True
                }
            }
            
            # Add webhook if provided
            if webhook_url:
                payload["webhook"] = {
                    "url": webhook_url,
                    "secret": self.webhook_secret
                }
            
            logger.info(f"🎬 Creating D-ID avatar with source: {source_url}")
            
            # Make API request
            response = requests.post(
                f"{self.api_url}/talks",
                headers=self.get_headers(),
                json=payload,
                timeout=30
            )
            
            if response.status_code == 201:
                result = response.json()
                talk_id = result.get("id")
                
                logger.info(f"✅ D-ID avatar creation started: {talk_id}")
                
                return {
                    "success": True,
                    "talk_id": talk_id,
                    "status": result.get("status", "created"),
                    "created_at": result.get("created_at"),
                    "result_url": result.get("result_url")
                }
            else:
                error_msg = f"D-ID API error: {response.status_code} - {response.text}"
                logger.error(f"❌ {error_msg}")
                
                return {
                    "success": False,
                    "error": error_msg,
                    "status_code": response.status_code
                }
                
        except requests.exceptions.Timeout:
            logger.error("❌ D-ID API request timeout")
            return {
                "success": False,
                "error": "Request timeout"
            }
        except Exception as e:
            logger.error(f"❌ D-ID avatar creation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_talk_status(self, talk_id: str) -> Dict[str, Any]:
        """
        Get the status of a D-ID talk generation
        
        Args:
            talk_id: D-ID talk ID
            
        Returns:
            Dict with status information
        """
        try:
            if not self.is_configured:
                return {
                    "success": False,
                    "error": "D-ID API not configured"
                }
            
            response = requests.get(
                f"{self.api_url}/talks/{talk_id}",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                return {
                    "success": True,
                    "talk_id": talk_id,
                    "status": result.get("status"),
                    "created_at": result.get("created_at"),
                    "started_at": result.get("started_at"),
                    "completed_at": result.get("completed_at"),
                    "result_url": result.get("result_url"),
                    "duration": result.get("duration"),
                    "error": result.get("error")
                }
            else:
                error_msg = f"D-ID API error: {response.status_code} - {response.text}"
                logger.error(f"❌ {error_msg}")
                
                return {
                    "success": False,
                    "error": error_msg
                }
                
        except Exception as e:
            logger.error(f"❌ D-ID status check error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_voice_clone(self, 
                               audio_url: str, 
                               voice_name: str) -> Dict[str, Any]:
        """
        Create a voice clone using D-ID API
        
        Args:
            audio_url: URL of the audio sample
            voice_name: Name for the voice clone
            
        Returns:
            Dict with voice clone result
        """
        try:
            if not self.is_configured:
                return {
                    "success": False,
                    "error": "D-ID API not configured"
                }
            
            payload = {
                "name": voice_name,
                "audio_url": audio_url
            }
            
            logger.info(f"🎤 Creating D-ID voice clone: {voice_name}")
            
            response = requests.post(
                f"{self.api_url}/voices",
                headers=self.get_headers(),
                json=payload,
                timeout=60
            )
            
            if response.status_code == 201:
                result = response.json()
                voice_id = result.get("id")
                
                logger.info(f"✅ D-ID voice clone created: {voice_id}")
                
                return {
                    "success": True,
                    "voice_id": voice_id,
                    "name": result.get("name"),
                    "status": result.get("status"),
                    "created_at": result.get("created_at")
                }
            else:
                error_msg = f"D-ID Voice API error: {response.status_code} - {response.text}"
                logger.error(f"❌ {error_msg}")
                
                return {
                    "success": False,
                    "error": error_msg
                }
                
        except Exception as e:
            logger.error(f"❌ D-ID voice clone error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_voice_status(self, voice_id: str) -> Dict[str, Any]:
        """
        Get the status of a voice clone
        
        Args:
            voice_id: D-ID voice ID
            
        Returns:
            Dict with voice status
        """
        try:
            if not self.is_configured:
                return {
                    "success": False,
                    "error": "D-ID API not configured"
                }
            
            response = requests.get(
                f"{self.api_url}/voices/{voice_id}",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                return {
                    "success": True,
                    "voice_id": voice_id,
                    "name": result.get("name"),
                    "status": result.get("status"),
                    "created_at": result.get("created_at"),
                    "ready": result.get("status") == "done"
                }
            else:
                return {
                    "success": False,
                    "error": f"Voice not found or API error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"❌ D-ID voice status error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def download_and_upload_video(self, 
                                      result_url: str, 
                                      lesson_id: str) -> Dict[str, Any]:
        """
        Download video from D-ID and upload to S3
        
        Args:
            result_url: D-ID result video URL
            lesson_id: Lesson ID for naming
            
        Returns:
            Dict with S3 upload result
        """
        try:
            # Download video from D-ID
            response = requests.get(result_url, timeout=120)
            
            if response.status_code == 200:
                # Generate filename
                video_filename = f"avatar_{lesson_id}_{uuid.uuid4()}.mp4"
                
                # Upload to S3
                upload_result = s3_service.upload_file(
                    file_obj=response.content,
                    filename=video_filename,
                    content_type="video/mp4",
                    folder="avatars"
                )
                
                if upload_result["success"]:
                    logger.info(f"✅ Avatar video uploaded to S3: {upload_result['url']}")
                    return {
                        "success": True,
                        "s3_url": upload_result["url"],
                        "s3_key": upload_result["key"]
                    }
                else:
                    return {
                        "success": False,
                        "error": f"S3 upload failed: {upload_result['error']}"
                    }
            else:
                return {
                    "success": False,
                    "error": f"Failed to download video: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"❌ Video download/upload error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def process_avatar_generation(self, 
                                      lesson_id: str, 
                                      avatar_image_url: str,
                                      script_text: Optional[str] = None,
                                      voice_id: Optional[str] = None,
                                      language: str = "en") -> Dict[str, Any]:
        """
        Process avatar generation for a lesson
        
        Args:
            lesson_id: ID of the lesson
            avatar_image_url: URL of the avatar image
            script_text: Optional text for the avatar to speak (if not provided, will use lesson content)
            voice_id: Optional voice ID for custom voice
            language: Language for voice generation
            
        Returns:
            Dict with result information
        """
        try:
            # Get lesson content if script_text not provided
            if not script_text:
                lesson = self.collections['lessons'].find_one({"lesson_id": lesson_id})
                
                if not lesson:
                    return {
                        "success": False,
                        "error": "Lesson not found",
                        "lesson_id": lesson_id
                    }
                
                script_text = lesson.get("content", "")
                if not script_text:
                    return {
                        "success": False,
                        "error": "Lesson has no content",
                        "lesson_id": lesson_id
                    }
            
            # Update lesson status to processing
            self.collections['lessons'].update_one(
                {"lesson_id": lesson_id},
                {"$set": {
                    "avatar_status": "processing",
                    "updated_at": time.time()
                }}
            )
            
            # Create webhook URL for status updates
            webhook_url = None
            if self.webhook_secret:
                # In a production environment, this would be your public-facing webhook URL
                # For local development, you might use a service like ngrok
                webhook_url = "https://your-server.com/lessons/webhook"
            
            # Create talking avatar
            talk_result = await self.create_avatar_talk(
                source_url=avatar_image_url,
                script_text=script_text,
                voice_id=voice_id,
                webhook_url=webhook_url
            )
            
            if not talk_result["success"]:
                # Update lesson status to failed
                self.collections['lessons'].update_one(
                    {"lesson_id": lesson_id},
                    {"$set": {
                        "avatar_status": "failed",
                        "avatar_error": talk_result["error"],
                        "updated_at": time.time()
                    }}
                )
                
                return {
                    "success": False,
                    "error": f"Avatar creation failed: {talk_result['error']}",
                    "lesson_id": lesson_id
                }
            
            talk_id = talk_result["talk_id"]
            
            # Store talk ID in lesson for webhook processing
            self.collections['lessons'].update_one(
                {"lesson_id": lesson_id},
                {"$set": {
                    "did_talk_id": talk_id,
                    "updated_at": time.time()
                }}
            )
            
            # If webhook is not configured, poll for completion
            if not webhook_url:
                max_attempts = 30  # 5 minutes (10 seconds * 30)
                for attempt in range(max_attempts):
                    status_result = await self.get_talk_status(talk_id)
                    
                    if not status_result["success"]:
                        logger.error(f"❌ Status check failed: {status_result['error']}")
                        await asyncio.sleep(10)
                        continue
                    
                    status = status_result["status"]
                    logger.info(f"🔄 D-ID status check ({attempt+1}/{max_attempts}): {status}")
                    
                    if status == "done":
                        result_url = status_result["result_url"]
                        
                        # Download and upload to S3
                        upload_result = await self.download_and_upload_video(result_url, lesson_id)
                        
                        if upload_result["success"]:
                            # Update lesson with avatar video URL
                            self.collections['lessons'].update_one(
                                {"lesson_id": lesson_id},
                                {"$set": {
                                    "avatar_video_url": upload_result["s3_url"],
                                    "avatar_status": "completed",
                                    "updated_at": time.time()
                                }}
                            )
                            
                            return {
                                "success": True,
                                "message": "Avatar video generated successfully",
                                "lesson_id": lesson_id,
                                "avatar_video_url": upload_result["s3_url"],
                                "talk_id": talk_id
                            }
                        else:
                            # Update lesson status to failed
                            self.collections['lessons'].update_one(
                                {"lesson_id": lesson_id},
                                {"$set": {
                                    "avatar_status": "failed",
                                    "avatar_error": upload_result["error"],
                                    "updated_at": time.time()
                                }}
                            )
                            
                            return {
                                "success": False,
                                "error": upload_result["error"],
                                "lesson_id": lesson_id
                            }
                    
                    elif status == "error":
                        # Update lesson status to failed
                        self.collections['lessons'].update_one(
                            {"lesson_id": lesson_id},
                            {"$set": {
                                "avatar_status": "failed",
                                "avatar_error": status_result.get("error", "Unknown error"),
                                "updated_at": time.time()
                            }}
                        )
                        
                        return {
                            "success": False,
                            "error": f"D-ID processing error: {status_result.get('error', 'Unknown error')}",
                            "lesson_id": lesson_id
                        }
                    
                    # Wait before next check
                    await asyncio.sleep(10)
                
                # If we get here, the process timed out
                # Update lesson status to timeout
                self.collections['lessons'].update_one(
                    {"lesson_id": lesson_id},
                    {"$set": {
                        "avatar_status": "timeout",
                        "updated_at": time.time()
                    }}
                )
                
                return {
                    "success": False,
                    "error": "Avatar generation timed out",
                    "lesson_id": lesson_id,
                    "talk_id": talk_id
                }
            
            # If webhook is configured, return success immediately
            # The webhook will handle the status updates
            return {
                "success": True,
                "message": "Avatar generation started. Status will be updated via webhook.",
                "lesson_id": lesson_id,
                "talk_id": talk_id
            }
            
        except Exception as e:
            logger.error(f"❌ Avatar generation error: {e}")
            
            # Update lesson status to failed
            self.collections['lessons'].update_one(
                {"lesson_id": lesson_id},
                {"$set": {
                    "avatar_status": "failed",
                    "avatar_error": str(e),
                    "updated_at": time.time()
                }}
            )
            
            return {
                "success": False,
                "error": str(e),
                "lesson_id": lesson_id
            }
    
    async def get_predefined_avatars(self) -> List[Dict[str, Any]]:
        """
        Get list of predefined celebrity avatars
        
        Returns:
            List of avatar information
        """
        # These are example avatars - in a real implementation, 
        # these would be stored in the database or fetched from D-ID
        return [
            {
                "id": "elon_musk",
                "name": "Elon Musk",
                "image_url": "https://images.pexels.com/photos/51329/elon-musk-tesla-spacex-solar-city-51329.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
                "description": "Tech entrepreneur and innovator"
            },
            {
                "id": "apj_kalam",
                "name": "APJ Abdul Kalam",
                "image_url": "https://upload.wikimedia.org/wikipedia/commons/6/6e/A._P._J._Abdul_Kalam.jpg",
                "description": "Former President of India and scientist"
            },
            {
                "id": "narendra_modi",
                "name": "Narendra Modi",
                "image_url": "https://upload.wikimedia.org/wikipedia/commons/c/c0/Official_Photograph_of_Prime_Minister_Narendra_Modi_Portrait.png",
                "description": "Prime Minister of India"
            },
            {
                "id": "thalapathy_vijay",
                "name": "Thalapathy Vijay",
                "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Vijay_at_the_Nadigar_Sangam_Protest.jpg/800px-Vijay_at_the_Nadigar_Sangam_Protest.jpg",
                "description": "Indian actor and filmmaker"
            }
        ]
    
    async def get_available_voices(self) -> Dict[str, Any]:
        """
        Get available voices from D-ID API
        
        Returns:
            Dict with voice information
        """
        try:
            if not self.is_configured:
                return {
                    "success": False,
                    "error": "D-ID API not configured"
                }
            
            response = requests.get(
                f"{self.api_url}/tts/voices",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                voices = response.json()
                
                # Group voices by provider and language
                organized_voices = {}
                for voice in voices:
                    provider = voice.get("provider")
                    language = voice.get("language")
                    
                    if provider not in organized_voices:
                        organized_voices[provider] = {}
                    
                    if language not in organized_voices[provider]:
                        organized_voices[provider][language] = []
                    
                    organized_voices[provider][language].append({
                        "id": voice.get("id"),
                        "name": voice.get("name"),
                        "gender": voice.get("gender")
                    })
                
                return {
                    "success": True,
                    "voices": organized_voices
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to get voices: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"❌ Error getting voices: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Global service instance
did_service = DIDService()