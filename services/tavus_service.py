"""
Tavus Service - Handles Tavus API integration for creating talking avatars
"""
import os
import requests
import asyncio
import logging
import uuid
import time
from typing import Dict, Any, Optional, List
from services.s3_service import s3_service
from database_config import get_collections

logger = logging.getLogger(__name__)

class TavusService:
    def __init__(self):
        self.api_key = os.getenv("TAVUS_API_KEY")
        self.api_url = os.getenv("TAVUS_API_URL", "https://api.tavus.io/v1")
        self.webhook_url = os.getenv("TAVUS_WEBHOOK_URL")
        self.collections = get_collections()
        
        # Check if Tavus is configured
        self.is_configured = bool(
            self.api_key and 
            self.api_key != "your_tavus_api_key_here" and
            self.api_url
        )
        
        if not self.is_configured:
            logger.warning("⚠️ Tavus API not configured - avatar video generation disabled")
        else:
            logger.info("✅ Tavus API configured successfully")
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers for Tavus API requests"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def create_replica(self, 
                           avatar_url: str, 
                           voice_url: Optional[str] = None,
                           name: str = "AI Tutor") -> Dict[str, Any]:
        """
        Create a digital replica using Tavus API
        
        Args:
            avatar_url: URL of the avatar image
            voice_url: Optional URL of the voice sample
            name: Name for the replica
            
        Returns:
            Dict with creation result
        """
        try:
            if not self.is_configured:
                return {
                    "success": False,
                    "error": "Tavus API not configured"
                }
            
            # Prepare the request payload
            payload = {
                "name": name,
                "avatar_url": avatar_url
            }
            
            # Add voice URL if provided
            if voice_url:
                payload["voice_url"] = voice_url
            
            logger.info(f"🎬 Creating Tavus replica with avatar: {avatar_url}")
            
            # Make API request
            response = requests.post(
                f"{self.api_url}/replicas",
                headers=self.get_headers(),
                json=payload,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                replica_id = result.get("id")
                
                logger.info(f"✅ Tavus replica creation started: {replica_id}")
                
                return {
                    "success": True,
                    "replica_id": replica_id,
                    "status": result.get("status", "created"),
                    "created_at": result.get("created_at")
                }
            else:
                error_msg = f"Tavus API error: {response.status_code} - {response.text}"
                logger.error(f"❌ {error_msg}")
                
                return {
                    "success": False,
                    "error": error_msg,
                    "status_code": response.status_code
                }
                
        except requests.exceptions.Timeout:
            logger.error("❌ Tavus API request timeout")
            return {
                "success": False,
                "error": "Request timeout"
            }
        except Exception as e:
            logger.error(f"❌ Tavus replica creation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_video(self, 
                           script: str,
                           replica_id: Optional[str] = None,
                           voice_type: str = "default_male") -> Dict[str, Any]:
        """
        Generate a video using Tavus API
        
        Args:
            script: Narration script text
            replica_id: Optional Tavus replica ID (if user has created one)
            voice_type: Voice type to use if no replica_id ("default_male", "default_female")
            
        Returns:
            Dict with video generation result
        """
        try:
            if not self.is_configured:
                return {
                    "success": False,
                    "error": "Tavus API not configured"
                }
            
            # Prepare the request payload
            payload = {
                "script": script
            }
            
            # Add replica ID if provided, otherwise use default voice
            if replica_id:
                payload["replica_id"] = replica_id
            else:
                payload["voice_type"] = voice_type
            
            # Add webhook URL if configured
            if self.webhook_url:
                payload["webhook_url"] = self.webhook_url
            
            logger.info(f"🎬 Generating Tavus video with script length: {len(script)} chars")
            
            # Make API request
            response = requests.post(
                f"{self.api_url}/videos",
                headers=self.get_headers(),
                json=payload,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                video_id = result.get("id")
                
                logger.info(f"✅ Tavus video generation started: {video_id}")
                
                return {
                    "success": True,
                    "video_id": video_id,
                    "status": result.get("status", "processing"),
                    "created_at": result.get("created_at"),
                    "video_url": result.get("video_url")
                }
            else:
                error_msg = f"Tavus API error: {response.status_code} - {response.text}"
                logger.error(f"❌ {error_msg}")
                
                return {
                    "success": False,
                    "error": error_msg,
                    "status_code": response.status_code
                }
                
        except requests.exceptions.Timeout:
            logger.error("❌ Tavus API request timeout")
            return {
                "success": False,
                "error": "Request timeout"
            }
        except Exception as e:
            logger.error(f"❌ Tavus video generation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def check_video_status(self, video_id: str) -> Dict[str, Any]:
        """
        Check the status of a video generation
        
        Args:
            video_id: Tavus video ID
            
        Returns:
            Dict with status information
        """
        try:
            if not self.is_configured:
                return {
                    "success": False,
                    "error": "Tavus API not configured"
                }
            
            response = requests.get(
                f"{self.api_url}/videos/{video_id}",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                return {
                    "success": True,
                    "video_id": video_id,
                    "status": result.get("status"),
                    "created_at": result.get("created_at"),
                    "completed_at": result.get("completed_at"),
                    "video_url": result.get("video_url"),
                    "error": result.get("error")
                }
            else:
                error_msg = f"Tavus API error: {response.status_code} - {response.text}"
                logger.error(f"❌ {error_msg}")
                
                return {
                    "success": False,
                    "error": error_msg
                }
                
        except Exception as e:
            logger.error(f"❌ Tavus status check error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def process_avatar_video_generation(self, 
                                           lesson_id: str, 
                                           avatar_url: str,
                                           voice_url: Optional[str] = None,
                                           voice_type: str = "default_male") -> Dict[str, Any]:
        """
        Process avatar video generation for a lesson
        
        Args:
            lesson_id: ID of the lesson
            avatar_url: URL of the avatar image
            voice_url: Optional URL of the voice sample
            voice_type: Voice type to use if no voice_url
            
        Returns:
            Dict with result information
        """
        try:
            # Get lesson content
            lesson = self.collections['lessons'].find_one({"lesson_id": lesson_id})
            
            if not lesson:
                return {
                    "success": False,
                    "error": "Lesson not found",
                    "lesson_id": lesson_id
                }
            
            # Check if script exists, if not, generate it
            script = lesson.get("script")
            if not script:
                # Generate script from learning path
                # This would typically call a script generation service
                # For now, we'll use a placeholder
                learning_path = lesson.get("learning_path")
                if not learning_path:
                    return {
                        "success": False,
                        "error": "Lesson has no learning path",
                        "lesson_id": lesson_id
                    }
                
                # Call script generation (this would be implemented elsewhere)
                # For now, we'll use a placeholder
                script = f"Welcome to your lesson on {lesson.get('topic', 'this topic')}. Let's explore the key concepts together."
                
                # Update lesson with script
                self.collections['lessons'].update_one(
                    {"lesson_id": lesson_id},
                    {"$set": {
                        "script": script,
                        "updated_at": time.time()
                    }}
                )
            
            # Update lesson status to processing
            self.collections['lessons'].update_one(
                {"lesson_id": lesson_id},
                {"$set": {
                    "status": "processing_video",
                    "updated_at": time.time()
                }}
            )
            
            # Create replica if voice URL is provided
            replica_id = None
            if voice_url:
                replica_result = await self.create_replica(
                    avatar_url=avatar_url,
                    voice_url=voice_url,
                    name=f"Tutor_{lesson_id}"
                )
                
                if replica_result["success"]:
                    replica_id = replica_result["replica_id"]
                    
                    # Update lesson with replica info
                    self.collections['lessons'].update_one(
                        {"lesson_id": lesson_id},
                        {"$set": {
                            "replica_id": replica_id,
                            "avatar_image": avatar_url,
                            "voice_sample": voice_url,
                            "updated_at": time.time()
                        }}
                    )
                else:
                    logger.warning(f"⚠️ Failed to create replica: {replica_result['error']}")
                    # Continue with default voice
            
            # Generate video
            video_result = await self.generate_video(
                script=script,
                replica_id=replica_id,
                voice_type=voice_type
            )
            
            if not video_result["success"]:
                # Update lesson status to failed
                self.collections['lessons'].update_one(
                    {"lesson_id": lesson_id},
                    {"$set": {
                        "status": "video_failed",
                        "error": video_result["error"],
                        "updated_at": time.time()
                    }}
                )
                
                return {
                    "success": False,
                    "error": f"Video generation failed: {video_result['error']}",
                    "lesson_id": lesson_id
                }
            
            video_id = video_result["video_id"]
            
            # Update lesson with video info
            self.collections['lessons'].update_one(
                {"lesson_id": lesson_id},
                {"$set": {
                    "video_id": video_id,
                    "status": "video_processing",
                    "updated_at": time.time()
                }}
            )
            
            # If video URL is immediately available
            if video_result.get("video_url"):
                self.collections['lessons'].update_one(
                    {"lesson_id": lesson_id},
                    {"$set": {
                        "avatar_video_url": video_result["video_url"],
                        "status": "video_ready",
                        "has_avatar_video": True,
                        "updated_at": time.time()
                    }}
                )
                
                return {
                    "success": True,
                    "message": "Avatar video generated successfully",
                    "lesson_id": lesson_id,
                    "video_url": video_result["video_url"],
                    "video_id": video_id
                }
            
            # If webhook is not configured, poll for completion
            if not self.webhook_url:
                max_attempts = 30  # 5 minutes (10 seconds * 30)
                for attempt in range(max_attempts):
                    status_result = await self.check_video_status(video_id)
                    
                    if not status_result["success"]:
                        logger.error(f"❌ Status check failed: {status_result['error']}")
                        await asyncio.sleep(10)
                        continue
                    
                    status = status_result["status"]
                    logger.info(f"🔄 Tavus status check ({attempt+1}/{max_attempts}): {status}")
                    
                    if status == "completed":
                        video_url = status_result["video_url"]
                        
                        # Update lesson with video URL
                        self.collections['lessons'].update_one(
                            {"lesson_id": lesson_id},
                            {"$set": {
                                "avatar_video_url": video_url,
                                "status": "video_ready",
                                "has_avatar_video": True,
                                "updated_at": time.time()
                            }}
                        )
                        
                        return {
                            "success": True,
                            "message": "Avatar video generated successfully",
                            "lesson_id": lesson_id,
                            "video_url": video_url,
                            "video_id": video_id
                        }
                    
                    elif status == "failed":
                        # Update lesson status to failed
                        self.collections['lessons'].update_one(
                            {"lesson_id": lesson_id},
                            {"$set": {
                                "status": "video_failed",
                                "error": status_result.get("error", "Unknown error"),
                                "updated_at": time.time()
                            }}
                        )
                        
                        return {
                            "success": False,
                            "error": f"Tavus processing error: {status_result.get('error', 'Unknown error')}",
                            "lesson_id": lesson_id
                        }
                    
                    # Wait before next check
                    await asyncio.sleep(10)
                
                # If we get here, the process timed out
                # Update lesson status to timeout
                self.collections['lessons'].update_one(
                    {"lesson_id": lesson_id},
                    {"$set": {
                        "status": "video_timeout",
                        "updated_at": time.time()
                    }}
                )
                
                return {
                    "success": False,
                    "error": "Avatar video generation timed out",
                    "lesson_id": lesson_id,
                    "video_id": video_id
                }
            
            # If webhook is configured, return success immediately
            # The webhook will handle the status updates
            return {
                "success": True,
                "message": "Avatar video generation started. Status will be updated via webhook.",
                "lesson_id": lesson_id,
                "video_id": video_id
            }
            
        except Exception as e:
            logger.error(f"❌ Avatar video generation error: {e}")
            
            # Update lesson status to failed
            self.collections['lessons'].update_one(
                {"lesson_id": lesson_id},
                {"$set": {
                    "status": "video_failed",
                    "error": str(e),
                    "updated_at": time.time()
                }}
            )
            
            return {
                "success": False,
                "error": str(e),
                "lesson_id": lesson_id
            }
    
    async def handle_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle webhook from Tavus
        
        Args:
            payload: Webhook payload from Tavus
            
        Returns:
            Dict with processing result
        """
        try:
            video_id = payload.get("video_id")
            status = payload.get("status")
            video_url = payload.get("video_url")
            
            if not video_id or not status:
                return {
                    "success": False,
                    "error": "Invalid webhook payload"
                }
            
            logger.info(f"📣 Tavus Webhook: Video {video_id} status: {status}")
            
            # Find the lesson associated with this video
            lesson = self.collections['lessons'].find_one({"video_id": video_id})
            
            if not lesson:
                return {
                    "success": False,
                    "error": "Lesson not found for video ID"
                }
            
            lesson_id = lesson.get("lesson_id")
            
            if status == "completed" and video_url:
                # Update lesson with video URL
                self.collections['lessons'].update_one(
                    {"lesson_id": lesson_id},
                    {"$set": {
                        "avatar_video_url": video_url,
                        "status": "video_ready",
                        "has_avatar_video": True,
                        "updated_at": time.time()
                    }}
                )
                
                return {
                    "success": True,
                    "message": "Webhook processed successfully",
                    "lesson_id": lesson_id,
                    "video_url": video_url
                }
            elif status == "failed":
                error = payload.get("error", "Unknown error")
                
                # Update lesson status to failed
                self.collections['lessons'].update_one(
                    {"lesson_id": lesson_id},
                    {"$set": {
                        "status": "video_failed",
                        "error": error,
                        "updated_at": time.time()
                    }}
                )
                
                return {
                    "success": False,
                    "error": f"Video generation failed: {error}",
                    "lesson_id": lesson_id
                }
            else:
                # Update lesson status
                self.collections['lessons'].update_one(
                    {"lesson_id": lesson_id},
                    {"$set": {
                        "status": f"video_{status}",
                        "updated_at": time.time()
                    }}
                )
                
                return {
                    "success": True,
                    "message": f"Webhook processed: status updated to {status}",
                    "lesson_id": lesson_id
                }
                
        except Exception as e:
            logger.error(f"❌ Webhook processing error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Global service instance
tavus_service = TavusService()