# learning_paths.py
import json
import datetime
from fastapi import APIRouter, HTTPException, Body, Query
from database import chats_collection, users_collection
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

# Router for learning path management
learning_paths_router = APIRouter()

class LearningPathCreate(BaseModel):
    name: str
    description: str
    difficulty: str
    duration: str
    prerequisites: List[str] = []
    topics: List[Dict[str, Any]]
    tags: List[str] = []

class LearningPathUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    duration: Optional[str] = None
    prerequisites: Optional[List[str]] = None
    topics: Optional[List[Dict[str, Any]]] = None
    tags: Optional[List[str]] = None
    progress: Optional[float] = None

class EnrollmentRequest(BaseModel):
    path_id: str
    username: str

@learning_paths_router.post("/create")
async def create_learning_path(
    username: str = Body(...),
    path_data: LearningPathCreate = Body(...)
):
    """Create a new learning path"""
    try:
        # Create learning path document
        learning_path = {
            "id": f"path_{datetime.datetime.utcnow().timestamp()}",
            "name": path_data.name,
            "description": path_data.description,
            "difficulty": path_data.difficulty,
            "duration": path_data.duration,
            "prerequisites": path_data.prerequisites,
            "topics": path_data.topics,
            "tags": path_data.tags,
            "created_by": username,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
            "enrollments": 0,
            "rating": 0.0,
            "is_public": True
        }

        # Store in user's learning goals
        chat_session = chats_collection.find_one({"username": username}) or {}
        learning_goals = chat_session.get("learning_goals", [])
        
        # Add as learning goal
        new_goal = {
            "name": path_data.name,
            "duration": path_data.duration,
            "study_plans": [learning_path],
            "progress": 0,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "path_id": learning_path["id"]
        }
        learning_goals.append(new_goal)

        chats_collection.update_one(
            {"username": username},
            {"$set": {"learning_goals": learning_goals}},
            upsert=True
        )

        return {
            "message": "Learning path created successfully",
            "path_id": learning_path["id"],
            "path": learning_path
        }
    except Exception as e:
        print(f"Error creating learning path: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@learning_paths_router.get("/list")
async def list_learning_paths(
    username: str = Query(...),
    public_only: bool = Query(False),
    difficulty: Optional[str] = Query(None),
    tags: Optional[str] = Query(None)
):
    """List available learning paths"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            return {"learning_paths": []}

        learning_goals = chat_session.get("learning_goals", [])
        learning_paths = []

        for goal in learning_goals:
            for plan in goal.get("study_plans", []):
                if public_only and not plan.get("is_public", True):
                    continue
                
                if difficulty and plan.get("difficulty") != difficulty:
                    continue
                
                if tags:
                    tag_list = tags.split(",")
                    plan_tags = plan.get("tags", [])
                    if not any(tag in plan_tags for tag in tag_list):
                        continue

                learning_paths.append({
                    "id": plan.get("id", goal["name"]),
                    "name": plan.get("name", goal["name"]),
                    "description": plan.get("description", ""),
                    "difficulty": plan.get("difficulty", "Intermediate"),
                    "duration": plan.get("duration", goal.get("duration", "")),
                    "progress": goal.get("progress", 0),
                    "topics_count": len(plan.get("topics", [])),
                    "created_at": goal.get("created_at"),
                    "tags": plan.get("tags", [])
                })

        return {"learning_paths": learning_paths}
    except Exception as e:
        print(f"Error listing learning paths: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@learning_paths_router.get("/detail/{path_id}")
async def get_learning_path_detail(path_id: str, username: str = Query(...)):
    """Get detailed information about a learning path"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            raise HTTPException(status_code=404, detail="Learning path not found")

        learning_goals = chat_session.get("learning_goals", [])
        
        for goal in learning_goals:
            for plan in goal.get("study_plans", []):
                if plan.get("id") == path_id or goal["name"] == path_id:
                    return {
                        "path": {
                            "id": plan.get("id", goal["name"]),
                            "name": plan.get("name", goal["name"]),
                            "description": plan.get("description", ""),
                            "difficulty": plan.get("difficulty", "Intermediate"),
                            "duration": plan.get("duration", goal.get("duration", "")),
                            "progress": goal.get("progress", 0),
                            "topics": plan.get("topics", []),
                            "prerequisites": plan.get("prerequisites", []),
                            "tags": plan.get("tags", []),
                            "created_at": goal.get("created_at"),
                            "updated_at": goal.get("updated_at")
                        }
                    }

        raise HTTPException(status_code=404, detail="Learning path not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting learning path detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@learning_paths_router.put("/update/{path_id}")
async def update_learning_path(
    path_id: str,
    username: str = Body(...),
    updates: LearningPathUpdate = Body(...)
):
    """Update an existing learning path"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            raise HTTPException(status_code=404, detail="Learning path not found")

        learning_goals = chat_session.get("learning_goals", [])
        updated = False

        for goal in learning_goals:
            if goal.get("path_id") == path_id or goal["name"] == path_id:
                # Update goal fields
                if updates.name:
                    goal["name"] = updates.name
                if updates.duration:
                    goal["duration"] = updates.duration
                if updates.progress is not None:
                    goal["progress"] = updates.progress

                # Update study plan fields
                for plan in goal.get("study_plans", []):
                    if plan.get("id") == path_id:
                        if updates.name:
                            plan["name"] = updates.name
                        if updates.description:
                            plan["description"] = updates.description
                        if updates.difficulty:
                            plan["difficulty"] = updates.difficulty
                        if updates.duration:
                            plan["duration"] = updates.duration
                        if updates.prerequisites:
                            plan["prerequisites"] = updates.prerequisites
                        if updates.topics:
                            plan["topics"] = updates.topics
                        if updates.tags:
                            plan["tags"] = updates.tags
                        
                        plan["updated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
                        updated = True
                        break

        if not updated:
            raise HTTPException(status_code=404, detail="Learning path not found")

        chats_collection.update_one(
            {"username": username},
            {"$set": {"learning_goals": learning_goals}}
        )

        return {"message": "Learning path updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating learning path: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@learning_paths_router.post("/enroll")
async def enroll_in_path(enrollment: EnrollmentRequest):
    """Enroll user in a learning path"""
    try:
        # This would typically copy a public path to user's goals
        # For now, we'll just track enrollment
        chat_session = chats_collection.find_one({"username": enrollment.username}) or {}
        enrollments = chat_session.get("enrollments", [])
        
        if enrollment.path_id not in enrollments:
            enrollments.append({
                "path_id": enrollment.path_id,
                "enrolled_at": datetime.datetime.utcnow().isoformat() + "Z",
                "progress": 0
            })

        chats_collection.update_one(
            {"username": enrollment.username},
            {"$set": {"enrollments": enrollments}},
            upsert=True
        )

        return {"message": "Successfully enrolled in learning path"}
    except Exception as e:
        print(f"Error enrolling in path: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@learning_paths_router.post("/progress/update")
async def update_progress(
    username: str = Body(...),
    path_id: str = Body(...),
    topic_index: int = Body(...),
    completed: bool = Body(...)
):
    """Update progress for a specific topic in a learning path"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            raise HTTPException(status_code=404, detail="User session not found")

        learning_goals = chat_session.get("learning_goals", [])
        updated = False

        for goal in learning_goals:
            if goal.get("path_id") == path_id or goal["name"] == path_id:
                for plan in goal.get("study_plans", []):
                    topics = plan.get("topics", [])
                    if 0 <= topic_index < len(topics):
                        topics[topic_index]["completed"] = completed
                        
                        # Calculate overall progress
                        total_topics = len(topics)
                        completed_topics = sum(1 for topic in topics if topic.get("completed", False))
                        goal["progress"] = (completed_topics / total_topics) * 100 if total_topics > 0 else 0
                        
                        updated = True
                        break

        if not updated:
            raise HTTPException(status_code=404, detail="Learning path or topic not found")

        chats_collection.update_one(
            {"username": username},
            {"$set": {"learning_goals": learning_goals}}
        )

        return {"message": "Progress updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@learning_paths_router.get("/analytics/{path_id}")
async def get_path_analytics(path_id: str, username: str = Query(...)):
    """Get analytics for a learning path"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            return {"analytics": {}}

        learning_goals = chat_session.get("learning_goals", [])
        
        for goal in learning_goals:
            if goal.get("path_id") == path_id or goal["name"] == path_id:
                topics = []
                for plan in goal.get("study_plans", []):
                    topics.extend(plan.get("topics", []))
                
                total_topics = len(topics)
                completed_topics = sum(1 for topic in topics if topic.get("completed", False))
                
                analytics = {
                    "total_topics": total_topics,
                    "completed_topics": completed_topics,
                    "progress_percentage": goal.get("progress", 0),
                    "estimated_time_remaining": "2 weeks",  # Calculate based on remaining topics
                    "completion_rate": (completed_topics / total_topics) * 100 if total_topics > 0 else 0,
                    "last_activity": goal.get("updated_at", goal.get("created_at")),
                    "streak_days": 0  # Calculate based on activity
                }
                
                return {"analytics": analytics}

        raise HTTPException(status_code=404, detail="Learning path not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))