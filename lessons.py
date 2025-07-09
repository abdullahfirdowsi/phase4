# Using enhanced database with optimized collections
# lessons.py - User Lesson Management System
import json
import datetime
import uuid
from fastapi import APIRouter, HTTPException, Body, Query, Depends, Header, Request, status
from database import chats_collection, users_collection
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import logging
from api.auth_api import get_current_user
import os
from services.s3_service import s3_service

# Configure logging
logger = logging.getLogger(__name__)

# Router for lesson management
lessons_router = APIRouter()

class LessonSection(BaseModel):
    title: str
    content: str

class LessonCreate(BaseModel):
    title: str
    description: str
    content: str
    subject: Optional[str] = None
    difficulty: str = "Beginner"
    duration: int = 30
    tags: List[str] = []
    sections: List[LessonSection] = []
    videoUrl: Optional[str] = None
    avatarUrl: Optional[str] = None
    status: str = "draft"

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    subject: Optional[str] = None
    difficulty: Optional[str] = None
    duration: Optional[int] = None
    tags: Optional[List[str]] = None
    sections: Optional[List[Dict[str, Any]]] = None
    videoUrl: Optional[str] = None
    avatarUrl: Optional[str] = None
    status: Optional[str] = None

class ProgressUpdate(BaseModel):
    username: str
    progress: int
    completed: bool = False

class LessonSave(BaseModel):
    username: str
    save: bool = True

# Helper function to validate user ownership
async def validate_user_ownership(lesson_id: str, username: str) -> Dict[str, Any]:
    """Validate that the user owns the lesson"""
    lesson = chats_collection.find_one({
        "lesson_id": lesson_id,
        "type": "user_lesson"
    })
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    if lesson.get("created_by") != username:
        raise HTTPException(status_code=403, detail="You do not have permission to access this lesson")
    
    return lesson

# User Lesson Routes
@lessons_router.get("/user")
async def get_user_lessons(username: str = Query(...)):
    """Get all lessons created by a user"""
    try:
        # Get user's lessons
        user_lessons = list(chats_collection.find({
            "created_by": username,
            "type": "user_lesson"
        }))
        
        # Get user's saved lessons
        user = users_collection.find_one({"username": username})
        saved_lesson_ids = user.get("saved_lessons", []) if user else []
        
        # Add saved flag to user's lessons
        for lesson in user_lessons:
            lesson["_id"] = str(lesson["_id"])
            lesson["isSaved"] = lesson.get("lesson_id") in saved_lesson_ids
        
        return {
            "lessons": user_lessons,
            "total": len(user_lessons)
        }
    except Exception as e:
        logger.error(f"Error fetching user lessons: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/user")
async def create_user_lesson(
    username: str = Body(...),
    lesson_data: LessonCreate = Body(...)
):
    """Create a new user lesson"""
    try:
        # Validate user exists
        user = users_collection.find_one({"username": username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create lesson ID
        lesson_id = f"lesson_{uuid.uuid4()}"
        
        # Check if user is admin
        user = users_collection.find_one({"username": username})
        is_admin = user.get("is_admin", False) if user else False
        
        # Determine lesson type and featured status
        lesson_type = "admin_lesson" if is_admin else "user_lesson"
        is_featured = is_admin  # Admin lessons are automatically featured
        
        # Create lesson document
        lesson_doc = {
            "lesson_id": lesson_id,
            "type": lesson_type,
            "title": lesson_data.title,
            "description": lesson_data.description,
            "content": lesson_data.content,
            "subject": lesson_data.subject,
            "difficulty": lesson_data.difficulty,
            "duration": lesson_data.duration,
            "tags": lesson_data.tags,
            "sections": [section.dict() for section in lesson_data.sections],
            "videoUrl": lesson_data.videoUrl,
            "avatarUrl": lesson_data.avatarUrl,
            "status": lesson_data.status,
            "created_by": username,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
            "views": 0,
            "likes": 0,
            "dislikes": 0,
            "comments": [],
            "featured": is_featured,
            "featured_at": datetime.datetime.utcnow().isoformat() + "Z" if is_featured else None,
            "featured_by": username if is_featured else None
        }
        
        # Insert into database
        chats_collection.insert_one(lesson_doc)
        
        # Update user's lesson count
        users_collection.update_one(
            {"username": username},
            {"$inc": {"stats.total_lessons": 1}}
        )
        
        return {
            "message": "Lesson created successfully",
            "lesson_id": lesson_id,
            "lesson": lesson_doc
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.get("/user/{lesson_id}")
async def get_user_lesson_detail(lesson_id: str, username: str = Query(...)):
    """Get detailed information about a user lesson"""
    try:
        # Get the lesson
        lesson = chats_collection.find_one({
            "lesson_id": lesson_id,
            "type": "user_lesson"
        })
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Convert ObjectId to string
        lesson["_id"] = str(lesson["_id"])
        
        # Check if user has saved this lesson
        user = users_collection.find_one({"username": username})
        saved_lesson_ids = user.get("saved_lessons", []) if user else []
        lesson["isSaved"] = lesson_id in saved_lesson_ids
        
        # Increment view count if viewer is not the creator
        if username != lesson.get("created_by"):
            chats_collection.update_one(
                {"lesson_id": lesson_id},
                {"$inc": {"views": 1}}
            )
        
        # Get user's progress
        user_progress = chats_collection.find_one({
            "username": username,
            "lesson_enrollments.lesson_id": lesson_id
        })
        
        if user_progress:
            for enrollment in user_progress.get("lesson_enrollments", []):
                if enrollment.get("lesson_id") == lesson_id:
                    lesson["progress"] = enrollment.get("progress", 0)
                    break
        else:
            lesson["progress"] = 0
        
        return {"lesson": lesson}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user lesson detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.put("/user/{lesson_id}")
async def update_user_lesson(
    lesson_id: str,
    username: str = Body(...),
    lesson_data: LessonUpdate = Body(...)
):
    """Update a user lesson"""
    try:
        # Validate user ownership
        lesson = await validate_user_ownership(lesson_id, username)
        
        # Prepare update document
        update_doc = {
            "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
        
        # Add fields that are provided
        if lesson_data.title is not None:
            update_doc["title"] = lesson_data.title
        if lesson_data.description is not None:
            update_doc["description"] = lesson_data.description
        if lesson_data.content is not None:
            update_doc["content"] = lesson_data.content
        if lesson_data.subject is not None:
            update_doc["subject"] = lesson_data.subject
        if lesson_data.difficulty is not None:
            update_doc["difficulty"] = lesson_data.difficulty
        if lesson_data.duration is not None:
            update_doc["duration"] = lesson_data.duration
        if lesson_data.tags is not None:
            update_doc["tags"] = lesson_data.tags
        if lesson_data.sections is not None:
            update_doc["sections"] = lesson_data.sections
        if lesson_data.videoUrl is not None:
            update_doc["videoUrl"] = lesson_data.videoUrl
        if lesson_data.avatarUrl is not None:
            update_doc["avatarUrl"] = lesson_data.avatarUrl
        if lesson_data.status is not None:
            update_doc["status"] = lesson_data.status
        
        # Update the lesson
        chats_collection.update_one(
            {"lesson_id": lesson_id},
            {"$set": update_doc}
        )
        
        return {"message": "Lesson updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.delete("/user/{lesson_id}")
async def delete_user_lesson(
    lesson_id: str,
    username: str = Body(...)
):
    """Delete a user lesson"""
    try:
        # Validate user ownership
        lesson = await validate_user_ownership(lesson_id, username)
        
        # Delete the lesson
        chats_collection.delete_one({
            "lesson_id": lesson_id,
            "created_by": username
        })
        
        # Update user's lesson count
        users_collection.update_one(
            {"username": username},
            {"$inc": {"stats.total_lessons": -1}}
        )
        
        # Remove from saved lessons for all users
        users_collection.update_many(
            {"saved_lessons": lesson_id},
            {"$pull": {"saved_lessons": lesson_id}}
        )
        
        return {"message": "Lesson deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.put("/user/{lesson_id}/progress")
async def update_user_lesson_progress(
    lesson_id: str,
    progress_data: ProgressUpdate
):
    """Update user's progress in a lesson"""
    try:
        username = progress_data.username
        
        # Check if lesson exists
        lesson = chats_collection.find_one({
            "lesson_id": lesson_id,
            "type": "user_lesson"
        })
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Check if user is enrolled
        user_chat = chats_collection.find_one({"username": username})
        if not user_chat:
            # Create user chat document if it doesn't exist
            chats_collection.insert_one({
                "username": username,
                "messages": [],
                "lesson_enrollments": []
            })
            user_chat = chats_collection.find_one({"username": username})
        
        enrollments = user_chat.get("lesson_enrollments", [])
        
        # Find enrollment
        enrollment_index = None
        for i, enrollment in enumerate(enrollments):
            if enrollment.get("lesson_id") == lesson_id:
                enrollment_index = i
                break
        
        if enrollment_index is not None:
            # Update existing enrollment
            enrollments[enrollment_index]["progress"] = progress_data.progress
            enrollments[enrollment_index]["completed"] = progress_data.completed
            enrollments[enrollment_index]["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        else:
            # Create new enrollment
            enrollments.append({
                "lesson_id": lesson_id,
                "lesson_title": lesson.get("title"),
                "enrolled_at": datetime.datetime.utcnow().isoformat() + "Z",
                "progress": progress_data.progress,
                "completed": progress_data.completed,
                "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
            })
        
        # Update user's enrollments
        chats_collection.update_one(
            {"username": username},
            {"$set": {"lesson_enrollments": enrollments}}
        )
        
        # If completed, update user's completed lessons count
        if progress_data.completed:
            users_collection.update_one(
                {"username": username},
                {"$inc": {"stats.completed_lessons": 1}}
            )
        
        return {"message": "Progress updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lesson progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/user/{lesson_id}/save")
async def save_user_lesson(
    lesson_id: str,
    save_data: LessonSave
):
    """Save or unsave a lesson for a user"""
    try:
        username = save_data.username
        
        # Check if lesson exists
        lesson = chats_collection.find_one({
            "lesson_id": lesson_id,
            "type": "user_lesson"
        })
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        if save_data.save:
            # Add to saved lessons
            users_collection.update_one(
                {"username": username},
                {"$addToSet": {"saved_lessons": lesson_id}}
            )
            return {"message": "Lesson saved successfully"}
        else:
            # Remove from saved lessons
            users_collection.update_one(
                {"username": username},
                {"$pull": {"saved_lessons": lesson_id}}
            )
            return {"message": "Lesson unsaved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving/unsaving lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/user/{lesson_id}/like")
async def like_user_lesson(
    lesson_id: str,
    username: str = Body(...),
    like: bool = Body(...)
):
    """Like or unlike a lesson"""
    try:
        # Check if lesson exists
        lesson = chats_collection.find_one({
            "lesson_id": lesson_id,
            "type": "user_lesson"
        })
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Get user's likes
        user = users_collection.find_one({"username": username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        liked_lessons = user.get("liked_lessons", [])
        disliked_lessons = user.get("disliked_lessons", [])
        
        if like:
            # Add to liked lessons if not already liked
            if lesson_id not in liked_lessons:
                users_collection.update_one(
                    {"username": username},
                    {"$addToSet": {"liked_lessons": lesson_id}}
                )
                
                # Remove from disliked lessons if present
                if lesson_id in disliked_lessons:
                    users_collection.update_one(
                        {"username": username},
                        {"$pull": {"disliked_lessons": lesson_id}}
                    )
                    
                    # Decrement dislike count
                    chats_collection.update_one(
                        {"lesson_id": lesson_id},
                        {"$inc": {"dislikes": -1}}
                    )
                
                # Increment like count
                chats_collection.update_one(
                    {"lesson_id": lesson_id},
                    {"$inc": {"likes": 1}}
                )
                
                return {"message": "Lesson liked successfully"}
            else:
                return {"message": "Lesson already liked"}
        else:
            # Remove from liked lessons if present
            if lesson_id in liked_lessons:
                users_collection.update_one(
                    {"username": username},
                    {"$pull": {"liked_lessons": lesson_id}}
                )
                
                # Decrement like count
                chats_collection.update_one(
                    {"lesson_id": lesson_id},
                    {"$inc": {"likes": -1}}
                )
                
                return {"message": "Lesson unliked successfully"}
            else:
                return {"message": "Lesson not liked"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error liking/unliking lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/user/{lesson_id}/dislike")
async def dislike_user_lesson(
    lesson_id: str,
    username: str = Body(...),
    dislike: bool = Body(...)
):
    """Dislike or undislike a lesson"""
    try:
        # Check if lesson exists
        lesson = chats_collection.find_one({
            "lesson_id": lesson_id,
            "type": "user_lesson"
        })
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Get user's dislikes
        user = users_collection.find_one({"username": username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        liked_lessons = user.get("liked_lessons", [])
        disliked_lessons = user.get("disliked_lessons", [])
        
        if dislike:
            # Add to disliked lessons if not already disliked
            if lesson_id not in disliked_lessons:
                users_collection.update_one(
                    {"username": username},
                    {"$addToSet": {"disliked_lessons": lesson_id}}
                )
                
                # Remove from liked lessons if present
                if lesson_id in liked_lessons:
                    users_collection.update_one(
                        {"username": username},
                        {"$pull": {"liked_lessons": lesson_id}}
                    )
                    
                    # Decrement like count
                    chats_collection.update_one(
                        {"lesson_id": lesson_id},
                        {"$inc": {"likes": -1}}
                    )
                
                # Increment dislike count
                chats_collection.update_one(
                    {"lesson_id": lesson_id},
                    {"$inc": {"dislikes": 1}}
                )
                
                return {"message": "Lesson disliked successfully"}
            else:
                return {"message": "Lesson already disliked"}
        else:
            # Remove from disliked lessons if present
            if lesson_id in disliked_lessons:
                users_collection.update_one(
                    {"username": username},
                    {"$pull": {"disliked_lessons": lesson_id}}
                )
                
                # Decrement dislike count
                chats_collection.update_one(
                    {"lesson_id": lesson_id},
                    {"$inc": {"dislikes": -1}}
                )
                
                return {"message": "Lesson undisliked successfully"}
            else:
                return {"message": "Lesson not disliked"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disliking/undisliking lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/user/{lesson_id}/comment")
async def comment_on_lesson(
    lesson_id: str,
    username: str = Body(...),
    comment: str = Body(...)
):
    """Add a comment to a lesson"""
    try:
        # Check if lesson exists
        lesson = chats_collection.find_one({
            "lesson_id": lesson_id,
            "type": "user_lesson"
        })
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Create comment
        comment_doc = {
            "comment_id": str(uuid.uuid4()),
            "username": username,
            "content": comment,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "likes": 0,
            "dislikes": 0
        }
        
        # Add comment to lesson
        chats_collection.update_one(
            {"lesson_id": lesson_id},
            {"$push": {"comments": comment_doc}}
        )
        
        return {
            "message": "Comment added successfully",
            "comment": comment_doc
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.get("/user/{lesson_id}/comments")
async def get_lesson_comments(lesson_id: str):
    """Get comments for a lesson"""
    try:
        # Check if lesson exists
        lesson = chats_collection.find_one({
            "lesson_id": lesson_id,
            "type": "user_lesson"
        })
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Get comments
        comments = lesson.get("comments", [])
        
        return {
            "comments": comments,
            "total": len(comments)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin Content Moderation Routes
@lessons_router.get("/admin/moderation")
async def get_content_for_moderation(username: str = Query(...)):
    """Get content that needs moderation (admin only)"""
    try:
        # Check if user is admin
        user = users_collection.find_one({"username": username})
        if not user or not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get recently published lessons
        recent_lessons = list(chats_collection.find({
            "type": "user_lesson",
            "status": "published",
            "moderation_status": {"$exists": False}
        }).sort("created_at", -1).limit(20))
        
        # Convert ObjectId to string
        for lesson in recent_lessons:
            lesson["_id"] = str(lesson["_id"])
        
        # Get reported content
        reported_content = list(chats_collection.find({
            "type": "user_lesson",
            "reports": {"$exists": True, "$ne": []}
        }).sort("created_at", -1))
        
        # Convert ObjectId to string
        for content in reported_content:
            content["_id"] = str(content["_id"])
        
        return {
            "recent_lessons": recent_lessons,
            "reported_content": reported_content,
            "total_pending": len(recent_lessons) + len(reported_content)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting content for moderation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/admin/moderation/{content_id}")
async def moderate_content(
    content_id: str,
    admin_username: str = Body(...),
    action: str = Body(...),
    reason: Optional[str] = Body(None)
):
    """Moderate content (admin only)"""
    try:
        # Check if user is admin
        user = users_collection.find_one({"username": admin_username})
        if not user or not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if content exists
        content = chats_collection.find_one({
            "lesson_id": content_id,
            "type": "user_lesson"
        })
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        # Apply moderation action
        if action == "approve":
            chats_collection.update_one(
                {"lesson_id": content_id},
                {
                    "$set": {
                        "moderation_status": "approved",
                        "moderated_by": admin_username,
                        "moderated_at": datetime.datetime.utcnow().isoformat() + "Z"
                    },
                    "$unset": {"reports": ""}
                }
            )
            
            return {"message": "Content approved successfully"}
        elif action == "reject":
            if not reason:
                raise HTTPException(status_code=400, detail="Reason is required for rejection")
            
            chats_collection.update_one(
                {"lesson_id": content_id},
                {
                    "$set": {
                        "moderation_status": "rejected",
                        "moderation_reason": reason,
                        "moderated_by": admin_username,
                        "moderated_at": datetime.datetime.utcnow().isoformat() + "Z",
                        "status": "draft"  # Set back to draft
                    }
                }
            )
            
            return {"message": "Content rejected successfully"}
        elif action == "delete":
            if not reason:
                raise HTTPException(status_code=400, detail="Reason is required for deletion")
            
            # Store deletion record
            deletion_record = {
                "content_id": content_id,
                "content_type": "user_lesson",
                "content_title": content.get("title"),
                "created_by": content.get("created_by"),
                "deleted_by": admin_username,
                "deleted_at": datetime.datetime.utcnow().isoformat() + "Z",
                "reason": reason
            }
            
            # Add to deleted content collection
            chats_collection.insert_one({
                "type": "deleted_content",
                "content": deletion_record
            })
            
            # Delete the content
            chats_collection.delete_one({"lesson_id": content_id})
            
            return {"message": "Content deleted successfully"}
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moderating content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Report content
@lessons_router.post("/user/{lesson_id}/report")
async def report_lesson(
    lesson_id: str,
    username: str = Body(...),
    reason: str = Body(...),
    details: Optional[str] = Body(None)
):
    """Report a lesson for moderation"""
    try:
        # Check if lesson exists
        lesson = chats_collection.find_one({
            "lesson_id": lesson_id,
            "type": "user_lesson"
        })
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        # Create report
        report = {
            "report_id": str(uuid.uuid4()),
            "reported_by": username,
            "reason": reason,
            "details": details,
            "reported_at": datetime.datetime.utcnow().isoformat() + "Z",
            "status": "pending"
        }
        
        # Add report to lesson
        chats_collection.update_one(
            {"lesson_id": lesson_id},
            {"$push": {"reports": report}}
        )
        
        return {"message": "Lesson reported successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reporting lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin Analytics Routes
@lessons_router.get("/admin/analytics")
async def get_admin_analytics(username: str = Query(...)):
    """Get admin analytics dashboard data"""
    try:
        # Check if user is admin
        user = users_collection.find_one({"username": username})
        if not user or not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get total users
        total_users = users_collection.count_documents({})
        
        # Get total lessons
        total_lessons = chats_collection.count_documents({"type": "user_lesson"})
        
        # Get published lessons
        published_lessons = chats_collection.count_documents({
            "type": "user_lesson",
            "status": "published"
        })
        
        # Get total views
        total_views = 0
        lessons = chats_collection.find({"type": "user_lesson"})
        for lesson in lessons:
            total_views += lesson.get("views", 0)
        
        # Get recent activity
        recent_activity = []
        
        # Recent user registrations
        recent_users = list(users_collection.find().sort("created_at", -1).limit(5))
        for user in recent_users:
            recent_activity.append({
                "type": "user_registration",
                "username": user.get("username"),
                "timestamp": user.get("created_at")
            })
        
        # Recent lesson creations
        recent_lessons = list(chats_collection.find({"type": "user_lesson"}).sort("created_at", -1).limit(5))
        for lesson in recent_lessons:
            recent_activity.append({
                "type": "lesson_creation",
                "lesson_id": lesson.get("lesson_id"),
                "lesson_title": lesson.get("title"),
                "created_by": lesson.get("created_by"),
                "timestamp": lesson.get("created_at")
            })
        
        # Sort by timestamp
        recent_activity.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Get top lessons by views
        top_lessons = list(chats_collection.find({"type": "user_lesson"}).sort("views", -1).limit(5))
        for lesson in top_lessons:
            lesson["_id"] = str(lesson["_id"])
        
        # Get top users by lesson count
        user_lesson_counts = {}
        lessons = chats_collection.find({"type": "user_lesson"})
        for lesson in lessons:
            created_by = lesson.get("created_by")
            if created_by:
                user_lesson_counts[created_by] = user_lesson_counts.get(created_by, 0) + 1
        
        top_users = []
        for username, count in sorted(user_lesson_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
            user = users_collection.find_one({"username": username})
            if user:
                top_users.append({
                    "username": username,
                    "name": user.get("name", username),
                    "lesson_count": count
                })
        
        return {
            "total_users": total_users,
            "total_lessons": total_lessons,
            "published_lessons": published_lessons,
            "total_views": total_views,
            "recent_activity": recent_activity[:10],
            "top_lessons": top_lessons,
            "top_users": top_users
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting admin analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin Popular Content Routes
@lessons_router.get("/admin/popular-content")
async def get_popular_content(username: str = Query(...)):
    """Get popular content for admin management"""
    try:
        # Check if user is admin
        user = users_collection.find_one({"username": username})
        if not user or not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get popular lessons by views
        popular_lessons = list(chats_collection.find({
            "type": "user_lesson",
            "status": "published"
        }).sort("views", -1).limit(20))
        
        # Convert ObjectId to string
        for lesson in popular_lessons:
            lesson["_id"] = str(lesson["_id"])
        
        # Get featured content
        featured_content = list(chats_collection.find({
            "type": "user_lesson",
            "featured": True
        }))
        
        # Convert ObjectId to string
        for content in featured_content:
            content["_id"] = str(content["_id"])
        
        return {
            "popular_lessons": popular_lessons,
            "featured_content": featured_content
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting popular content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.post("/admin/popular-content/{content_id}")
async def feature_content(
    content_id: str,
    admin_username: str = Body(...),
    featured: bool = Body(...)
):
    """Feature or unfeature content"""
    try:
        # Check if user is admin
        user = users_collection.find_one({"username": admin_username})
        if not user or not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if content exists
        content = chats_collection.find_one({
            "lesson_id": content_id,
            "type": "user_lesson"
        })
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        # Update featured status
        chats_collection.update_one(
            {"lesson_id": content_id},
            {"$set": {
                "featured": featured,
                "featured_by": admin_username if featured else None,
                "featured_at": datetime.datetime.utcnow().isoformat() + "Z" if featured else None
            }}
        )
        
        return {
            "message": f"Content {'featured' if featured else 'unfeatured'} successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error featuring content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin User Management Routes
@lessons_router.get("/admin/users")
async def get_users(username: str = Query(...)):
    """Get all users for admin management"""
    try:
        # Check if user is admin
        user = users_collection.find_one({"username": username})
        if not user or not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get all users
        users = list(users_collection.find({}, {
            "password_hash": 0  # Exclude password hash
        }))
        
        # Convert ObjectId to string
        for user in users:
            user["_id"] = str(user["_id"])
        
        return {
            "users": users,
            "total": len(users)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.put("/admin/users/{target_username}/status")
async def update_user_status(
    target_username: str,
    admin_username: str = Body(...),
    status: str = Body(...)
):
    """Update user status (active, suspended, blocked)"""
    try:
        # Check if user is admin
        admin = users_collection.find_one({"username": admin_username})
        if not admin or not admin.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if target user exists
        target_user = users_collection.find_one({"username": target_username})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent modifying other admins
        if target_user.get("is_admin", False) and admin_username != target_username:
            raise HTTPException(status_code=403, detail="Cannot modify another admin's status")
        
        # Validate status
        valid_statuses = ["active", "suspended", "blocked"]
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        # Update user status
        users_collection.update_one(
            {"username": target_username},
            {"$set": {
                "status": status,
                "status_updated_by": admin_username,
                "status_updated_at": datetime.datetime.utcnow().isoformat() + "Z"
            }}
        )
        
        return {"message": f"User status updated to {status}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.delete("/admin/users/{target_username}")
async def delete_user(
    target_username: str,
    admin_username: str = Body(...)
):
    """Delete a user (admin only)"""
    try:
        # Check if user is admin
        admin = users_collection.find_one({"username": admin_username})
        if not admin or not admin.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if target user exists
        target_user = users_collection.find_one({"username": target_username})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent deleting other admins
        if target_user.get("is_admin", False) and admin_username != target_username:
            raise HTTPException(status_code=403, detail="Cannot delete another admin")
        
        # Store deletion record
        deletion_record = {
            "username": target_username,
            "email": target_user.get("email"),
            "deleted_by": admin_username,
            "deleted_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
        
        # Add to deleted users collection
        chats_collection.insert_one({
            "type": "deleted_user",
            "user": deletion_record
        })
        
        # Delete user's lessons
        chats_collection.delete_many({
            "created_by": target_username,
            "type": "user_lesson"
        })
        
        # Delete user's chat history
        chats_collection.delete_many({"username": target_username})
        
        # Delete user
        users_collection.delete_one({"username": target_username})
        
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin System Configuration Routes
@lessons_router.get("/admin/config")
async def get_system_config(username: str = Query(...)):
    """Get system configuration (admin only)"""
    try:
        # Check if user is admin
        user = users_collection.find_one({"username": username})
        if not user or not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get system config
        config = chats_collection.find_one({"type": "system_config"})
        
        if not config:
            # Create default config
            default_config = {
                "type": "system_config",
                "content_moderation": {
                    "enabled": True,
                    "auto_approve": False,
                    "profanity_filter": True
                },
                "user_limits": {
                    "max_lessons_per_day": 5,
                    "max_file_size_mb": 100,
                    "max_video_duration_minutes": 30
                },
                "feature_flags": {
                    "comments_enabled": True,
                    "ratings_enabled": True,
                    "sharing_enabled": True
                },
                "created_at": datetime.datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
                "updated_by": username
            }
            
            chats_collection.insert_one(default_config)
            config = default_config
        
        # Convert ObjectId to string
        config["_id"] = str(config["_id"])
        
        return config
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting system config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@lessons_router.put("/admin/config")
async def update_system_config(
    admin_username: str = Body(...),
    config: Dict[str, Any] = Body(...)
):
    """Update system configuration (admin only)"""
    try:
        # Check if user is admin
        user = users_collection.find_one({"username": admin_username})
        if not user or not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Add metadata
        config["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        config["updated_by"] = admin_username
        
        # Update config
        chats_collection.update_one(
            {"type": "system_config"},
            {"$set": config},
            upsert=True
        )
        
        return {"message": "System configuration updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating system config: {e}")
        raise HTTPException(status_code=500, detail=str(e))