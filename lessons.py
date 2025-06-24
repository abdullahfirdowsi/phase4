# lessons.py - Lesson Management System
import json
import datetime
from fastapi import APIRouter, HTTPException, Body, Query, Depends
from database import chats_collection, users_collection
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from auth import get_current_user

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