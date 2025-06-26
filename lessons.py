# lessons.py - Lesson Management System
import json
import datetime
from fastapi import APIRouter, HTTPException, Body, Query, Depends, Header, Request
from database import chats_collection, users_collection
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from auth import get_current_user
import logging
from services.tavus_service import tavus_service
from chat import generate_response

# Configure logging
logger = logging.getLogger(__name__)

# Router for lesson management
lessons_router = APIRouter()

class LessonCreate(BaseModel):
    title: str
    description: str
    content: str
    subject: str
    difficulty: str = "Beginner"
    duration: str = "30 minutes"
    tags: List[str] = []
    prerequisites: List[str] = []
    objectives: List[str] = []

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    subject: Optional[str] = None
    difficulty: Optional[str] = None
    duration: Optional[str] = None
    tags: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    objectives: Optional[List[str]] = None

class UserStats(BaseModel):
    email: str
    lesson_count: int
    last_login: Optional[str] = None
    total_study_time: int = 0
    completed_lessons: int = 0

class GenerateVideoRequest(BaseModel):
    lesson_id: str
    avatar_url: str
    voice_url: Optional[str] = None
    voice_type: str = "default_male"

def _build_script_prompt(topic: str, learning_path_json: Dict[str, Any]) -> str:
    """
    Build a prompt for script generation
    
    Args:
        topic: Lesson topic
        learning_path_json: Structured learning path JSON
        
    Returns:
        Prompt string for script generation
    """
    return f"""
You are a helpful AI tutor. Create a narration script in natural language based on the following structured lesson JSON.

Make it conversational, suitable for video narration. Include greetings, transitions, and summaries.

Topic: {topic}

Here is the learning path:
{json.dumps(learning_path_json, indent=2)}

The script should be:
1. Conversational and engaging
2. Well-structured with clear transitions
3. Include a greeting and introduction
4. Cover all key topics in the learning path
5. End with a summary and encouragement

Keep the script concise but comprehensive, suitable for a 5-10 minute video narration.
"""

# Helper function to check if user is admin
def is_admin_user(username: str) -> bool:
    """Check if user has admin privileges"""
    try:
        user = users_collection.find_one({"username": username})
        return user and user.get("isAdmin", False)
    except Exception:
        return False

# Admin Routes
@lessons_router.get("/admin/lessons")
async def get_admin_lessons(username: str = Query(...)):
    """Get all admin-created lessons (admin only)"""
    try:
        if not is_admin_user(username):
            raise HTTPException(status_code=403, detail="Admin access required")

        # Get all admin lessons from a dedicated collection or filter
        admin_lessons = list(chats_collection.find({
            "type": "admin_lesson",
            "isAdminLesson": True
        }))

        # Convert ObjectId to string for JSON serialization
        for lesson in admin_lessons:
            lesson["_id"] = str(lesson["_id"])

        return {
            "lessons": admin_lessons,
            "total": len(admin_lessons)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching admin lessons: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/admin/lessons")
async def create_admin_lesson(
    username: str = Body(...),
    lesson_data: LessonCreate = Body(...)
):
    """Create new admin lesson (admin only)"""
    try:
        if not is_admin_user(username):
            raise HTTPException(status_code=403, detail="Admin access required")

        lesson_id = f"admin_lesson_{datetime.datetime.utcnow().timestamp()}"
        
        admin_lesson = {
            "_id": lesson_id,
            "type": "admin_lesson",
            "title": lesson_data.title,
            "description": lesson_data.description,
            "content": lesson_data.content,
            "subject": lesson_data.subject,
            "difficulty": lesson_data.difficulty,
            "duration": lesson_data.duration,
            "tags": lesson_data.tags,
            "prerequisites": lesson_data.prerequisites,
            "objectives": lesson_data.objectives,
            "userId": None,  # Admin lessons have no specific user
            "isAdminLesson": True,
            "createdBy": username,
            "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.datetime.utcnow().isoformat() + "Z",
            "isActive": True,
            "enrollments": 0,
            "completions": 0
        }

        # Insert into database
        chats_collection.insert_one(admin_lesson)

        return {
            "message": "Admin lesson created successfully",
            "lesson_id": lesson_id,
            "lesson": admin_lesson
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating admin lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.delete("/admin/lessons/{lesson_id}")
async def delete_admin_lesson(lesson_id: str, username: str = Query(...)):
    """Delete admin lesson (admin only)"""
    try:
        if not is_admin_user(username):
            raise HTTPException(status_code=403, detail="Admin access required")

        result = chats_collection.delete_one({
            "_id": lesson_id,
            "type": "admin_lesson",
            "isAdminLesson": True
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Admin lesson not found")

        return {"message": "Admin lesson deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting admin lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.get("/admin/users")
async def get_admin_users_overview(username: str = Query(...)):
    """Get overview of all users (admin only)"""
    try:
        if not is_admin_user(username):
            raise HTTPException(status_code=403, detail="Admin access required")

        # Get all users
        users = list(users_collection.find({}, {
            "username": 1,
            "name": 1,
            "created_at": 1,
            "stats": 1,
            "isAdmin": 1
        }))

        user_stats = []
        for user in users:
            # Get user's lesson count from chat collection
            user_chat = chats_collection.find_one({"username": user["username"]})
            lesson_count = 0
            if user_chat and "learning_goals" in user_chat:
                lesson_count = len(user_chat["learning_goals"])

            stats = user.get("stats", {})
            user_stats.append({
                "email": user["username"],
                "name": user.get("name", "Unknown"),
                "lesson_count": lesson_count,
                "last_login": user.get("created_at", "Never"),
                "total_study_time": stats.get("totalStudyTime", 0),
                "completed_lessons": stats.get("completedGoals", 0),
                "is_admin": user.get("isAdmin", False),
                "created_at": user.get("created_at")
            })

        return {
            "users": user_stats,
            "total_users": len(user_stats),
            "admin_users": len([u for u in user_stats if u["is_admin"]])
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching users overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.get("/admin/dashboard")
async def get_admin_dashboard_stats(username: str = Query(...)):
    """Get admin dashboard statistics"""
    try:
        if not is_admin_user(username):
            raise HTTPException(status_code=403, detail="Admin access required")

        # Get total users
        total_users = users_collection.count_documents({})
        
        # Get total admin lessons
        total_admin_lessons = chats_collection.count_documents({
            "type": "admin_lesson",
            "isAdminLesson": True
        })
        
        # Get total user-generated lessons
        total_user_lessons = chats_collection.count_documents({
            "learning_goals": {"$exists": True}
        })
        
        # Get recent activity (last 7 days)
        week_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        recent_users = users_collection.count_documents({
            "created_at": {"$gte": week_ago.isoformat() + "Z"}
        })

        return {
            "total_users": total_users,
            "total_admin_lessons": total_admin_lessons,
            "total_user_lessons": total_user_lessons,
            "recent_users": recent_users,
            "active_lessons": total_admin_lessons + total_user_lessons,
            "platform_health": "healthy"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching admin dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# User Routes
@lessons_router.get("/lessons")
async def get_user_lessons(username: str = Query(...)):
    """Get lessons for a specific user (admin lessons + user's own lessons)"""
    try:
        # Get admin lessons (visible to all users)
        admin_lessons = list(chats_collection.find({
            "type": "admin_lesson",
            "isAdminLesson": True,
            "isActive": True
        }))

        # Get user's own lessons from learning goals
        user_chat = chats_collection.find_one({"username": username})
        user_lessons = []
        
        if user_chat and "learning_goals" in user_chat:
            for goal in user_chat["learning_goals"]:
                # Convert learning goals to lesson format
                for plan in goal.get("study_plans", []):
                    user_lesson = {
                        "_id": f"user_lesson_{goal['name']}",
                        "title": goal["name"],
                        "description": plan.get("description", ""),
                        "content": plan.get("topics", []),
                        "subject": "User Generated",
                        "difficulty": plan.get("difficulty", "Intermediate"),
                        "duration": goal.get("duration", "Unknown"),
                        "userId": username,
                        "isAdminLesson": False,
                        "progress": goal.get("progress", 0),
                        "createdAt": goal.get("created_at"),
                        "type": "user_lesson"
                    }
                    user_lessons.append(user_lesson)

        # Convert ObjectId to string for admin lessons
        for lesson in admin_lessons:
            lesson["_id"] = str(lesson["_id"])

        return {
            "adminLessons": admin_lessons,
            "myLessons": user_lessons,
            "totalAdminLessons": len(admin_lessons),
            "totalUserLessons": len(user_lessons)
        }
    except Exception as e:
        print(f"Error fetching user lessons: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/lessons/enroll")
async def enroll_in_lesson(
    username: str = Body(...),
    lesson_id: str = Body(...)
):
    """Enroll user in a lesson"""
    try:
        # Check if lesson exists
        lesson = chats_collection.find_one({
            "_id": lesson_id,
            "type": "admin_lesson"
        })
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        # Add enrollment to user's record
        user_chat = chats_collection.find_one({"username": username}) or {}
        enrollments = user_chat.get("lesson_enrollments", [])
        
        # Check if already enrolled
        if lesson_id not in [e.get("lesson_id") for e in enrollments]:
            enrollment = {
                "lesson_id": lesson_id,
                "lesson_title": lesson["title"],
                "enrolled_at": datetime.datetime.utcnow().isoformat() + "Z",
                "progress": 0,
                "completed": False
            }
            enrollments.append(enrollment)
            
            chats_collection.update_one(
                {"username": username},
                {"$set": {"lesson_enrollments": enrollments}},
                upsert=True
            )
            
            # Update lesson enrollment count
            chats_collection.update_one(
                {"_id": lesson_id},
                {"$inc": {"enrollments": 1}}
            )

        return {"message": "Successfully enrolled in lesson"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error enrolling in lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.put("/lessons/{lesson_id}/progress")
async def update_lesson_progress(
    lesson_id: str,
    username: str = Body(...),
    progress: int = Body(...),
    completed: bool = Body(False)
):
    """Update user's progress in a lesson"""
    try:
        user_chat = chats_collection.find_one({"username": username})
        if not user_chat:
            raise HTTPException(status_code=404, detail="User not found")

        enrollments = user_chat.get("lesson_enrollments", [])
        
        # Find and update the enrollment
        for enrollment in enrollments:
            if enrollment["lesson_id"] == lesson_id:
                enrollment["progress"] = progress
                enrollment["completed"] = completed
                enrollment["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
                break
        else:
            raise HTTPException(status_code=404, detail="Enrollment not found")

        chats_collection.update_one(
            {"username": username},
            {"$set": {"lesson_enrollments": enrollments}}
        )

        # If completed, update lesson completion count
        if completed:
            chats_collection.update_one(
                {"_id": lesson_id},
                {"$inc": {"completions": 1}}
            )

        return {"message": "Progress updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating lesson progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.get("/lessons/{lesson_id}")
async def get_lesson_detail(lesson_id: str, username: str = Query(...)):
    """Get detailed information about a specific lesson"""
    try:
        # Try to find admin lesson first
        lesson = chats_collection.find_one({
            "_id": lesson_id,
            "type": "admin_lesson"
        })
        
        if lesson:
            lesson["_id"] = str(lesson["_id"])
            
            # Check if user is enrolled
            user_chat = chats_collection.find_one({"username": username})
            enrollment = None
            if user_chat and "lesson_enrollments" in user_chat:
                for enroll in user_chat["lesson_enrollments"]:
                    if enroll["lesson_id"] == lesson_id:
                        enrollment = enroll
                        break
            
            lesson["enrollment"] = enrollment
            return {"lesson": lesson}
        
        # If not found in admin lessons, check user lessons
        user_chat = chats_collection.find_one({"username": username})
        if user_chat and "learning_goals" in user_chat:
            for goal in user_chat["learning_goals"]:
                if f"user_lesson_{goal['name']}" == lesson_id:
                    return {
                        "lesson": {
                            "_id": lesson_id,
                            "title": goal["name"],
                            "description": goal.get("description", ""),
                            "content": goal.get("study_plans", []),
                            "progress": goal.get("progress", 0),
                            "type": "user_lesson"
                        }
                    }
        
        raise HTTPException(status_code=404, detail="Lesson not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching lesson detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.get("/lessons/{lesson_id}/script")
async def get_lesson_script(lesson_id: str, username: str = Query(...)):
    """
    Get or generate script for a lesson
    
    If the lesson doesn't have a script, one will be generated
    using the learning path content
    """
    try:
        # Find the lesson
        lesson = chats_collection.find_one({"lesson_id": lesson_id})
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Check if script already exists
        if "script" in lesson and lesson["script"]:
            return {
                "script": lesson["script"],
                "lesson_id": lesson_id,
                "topic": lesson.get("topic", ""),
                "generated": False
            }
        
        # Generate script from learning path
        learning_path = lesson.get("learning_path")
        if not learning_path:
            raise HTTPException(status_code=400, detail="Lesson has no learning path content")
        
        # Build prompt for script generation
        topic = lesson.get("topic", "")
        prompt = _build_script_prompt(topic, learning_path)
        
        # Generate script using Groq
        script = generate_response(prompt)
        
        if not script:
            raise HTTPException(status_code=500, detail="Failed to generate script")
        
        # Update lesson with script
        chats_collection.update_one(
            {"lesson_id": lesson_id},
            {"$set": {
                "script": script,
                "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
            }}
        )
        
        return {
            "script": script,
            "lesson_id": lesson_id,
            "topic": topic,
            "generated": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting/generating lesson script: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/lessons/generate-avatar-video")
async def generate_avatar_video(request: GenerateVideoRequest):
    """
    Generate avatar video for a lesson
    
    Args:
        request: Video generation request with lesson_id, avatar_url, etc.
        
    Returns:
        Generation status
    """
    try:
        lesson_id = request.lesson_id
        avatar_url = request.avatar_url
        voice_url = request.voice_url
        voice_type = request.voice_type
        
        # Validate inputs
        if not lesson_id:
            raise HTTPException(status_code=400, detail="Lesson ID is required")
        
        if not avatar_url:
            raise HTTPException(status_code=400, detail="Avatar image URL is required")
        
        # Process video generation
        result = await tavus_service.process_avatar_video_generation(
            lesson_id=lesson_id,
            avatar_url=avatar_url,
            voice_url=voice_url,
            voice_type=voice_type
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Avatar video generation started",
                "lesson_id": lesson_id,
                "video_id": result.get("video_id"),
                "status": "processing"
            }
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate avatar video: {result['error']}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating avatar video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.get("/lessons/{lesson_id}/video-status")
async def get_video_status(lesson_id: str, username: str = Query(...)):
    """
    Get avatar video generation status
    
    Args:
        lesson_id: Lesson ID
        username: Username
        
    Returns:
        Video status information
    """
    try:
        # Find the lesson
        lesson = chats_collection.find_one({"lesson_id": lesson_id})
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Get video status
        status = lesson.get("status", "unknown")
        video_url = lesson.get("avatar_video_url")
        error = lesson.get("error")
        
        return {
            "lesson_id": lesson_id,
            "status": status,
            "video_url": video_url,
            "error": error,
            "has_video": bool(video_url)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting video status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/lessons/webhook")
async def tavus_webhook(request: Request, x_tavus_signature: Optional[str] = Header(None)):
    """
    Webhook endpoint for Tavus status updates
    
    Args:
        request: Request object
        x_tavus_signature: Tavus signature for verification
        
    Returns:
        Acknowledgement
    """
    try:
        # Get request body
        payload = await request.json()
        
        # Process webhook
        result = await tavus_service.handle_webhook(payload)
        
        if result["success"]:
            return {
                "success": True,
                "message": "Webhook processed successfully"
            }
        else:
            return {
                "success": False,
                "message": f"Failed to process webhook: {result['error']}"
            }
            
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return {
            "success": False,
            "message": f"Error processing webhook: {str(e)}"
        }