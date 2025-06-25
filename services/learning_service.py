"""
Learning Service - Handles learning goals, paths, and progress tracking
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from models.schemas import LearningGoal, DifficultyLevel, APIResponse
from database_config import get_collections
import uuid
import logging

logger = logging.getLogger(__name__)

class LearningService:
    def __init__(self):
        self.collections = get_collections()
        self.goals_collection = self.collections['learning_goals']
        self.enrollments_collection = self.collections['user_enrollments']
    
    async def create_learning_goal(self, username: str, goal_data: Dict[str, Any]) -> APIResponse:
        """Create a new learning goal"""
        try:
            goal_id = str(uuid.uuid4())
            
            goal_doc = {
                "goal_id": goal_id,
                "username": username,
                "name": goal_data.get("name"),
                "description": goal_data.get("description", ""),
                "difficulty": goal_data.get("difficulty", "beginner"),
                "duration": goal_data.get("duration", ""),
                "progress": 0.0,
                "status": "active",
                "prerequisites": goal_data.get("prerequisites", []),
                "tags": goal_data.get("tags", []),
                "study_plans": goal_data.get("study_plans", []),
                "created_at": datetime.utcnow(),
                "target_completion_date": goal_data.get("target_completion_date")
            }
            
            result = self.goals_collection.insert_one(goal_doc)
            
            # Create enrollment record
            await self.create_enrollment(username, "learning_goal", goal_id)
            
            return APIResponse(
                success=True,
                message="Learning goal created successfully",
                data={"goal_id": goal_id}
            )
            
        except Exception as e:
            logger.error(f"Error creating learning goal: {e}")
            return APIResponse(
                success=False,
                message="Failed to create learning goal",
                errors=[str(e)]
            )
    
    async def get_user_goals(self, username: str, status: Optional[str] = None) -> APIResponse:
        """Get learning goals for a user"""
        try:
            query = {"username": username}
            if status:
                query["status"] = status
            
            goals = list(self.goals_collection.find(query).sort("created_at", -1))
            
            # Convert ObjectId to string
            for goal in goals:
                goal["_id"] = str(goal["_id"])
            
            return APIResponse(
                success=True,
                message="Learning goals retrieved successfully",
                data={"goals": goals}
            )
            
        except Exception as e:
            logger.error(f"Error getting user goals: {e}")
            return APIResponse(
                success=False,
                message="Failed to get learning goals",
                errors=[str(e)]
            )
    
    async def update_goal_progress(self, username: str, goal_id: str, 
                                 progress: float, topic_index: Optional[int] = None,
                                 completed: Optional[bool] = None) -> APIResponse:
        """Update progress for a learning goal"""
        try:
            update_doc = {
                "progress": min(max(progress, 0.0), 100.0),  # Clamp between 0-100
                "updated_at": datetime.utcnow()
            }
            
            # If marking as completed
            if progress >= 100.0:
                update_doc["status"] = "completed"
                update_doc["completed_at"] = datetime.utcnow()
            
            # Update specific topic if provided
            if topic_index is not None and completed is not None:
                update_doc[f"study_plans.0.topics.{topic_index}.completed"] = completed
            
            result = self.goals_collection.update_one(
                {"goal_id": goal_id, "username": username},
                {"$set": update_doc}
            )
            
            if result.matched_count == 0:
                return APIResponse(
                    success=False,
                    message="Learning goal not found"
                )
            
            # Update enrollment progress
            await self.update_enrollment_progress(username, "learning_goal", goal_id, progress)
            
            return APIResponse(
                success=True,
                message="Progress updated successfully"
            )
            
        except Exception as e:
            logger.error(f"Error updating goal progress: {e}")
            return APIResponse(
                success=False,
                message="Failed to update progress",
                errors=[str(e)]
            )
    
    async def delete_learning_goal(self, username: str, goal_id: str) -> APIResponse:
        """Delete a learning goal"""
        try:
            result = self.goals_collection.delete_one({
                "goal_id": goal_id,
                "username": username
            })
            
            if result.deleted_count == 0:
                return APIResponse(
                    success=False,
                    message="Learning goal not found"
                )
            
            # Remove enrollment record
            self.enrollments_collection.delete_one({
                "username": username,
                "content_type": "learning_goal",
                "content_id": goal_id
            })
            
            return APIResponse(
                success=True,
                message="Learning goal deleted successfully"
            )
            
        except Exception as e:
            logger.error(f"Error deleting learning goal: {e}")
            return APIResponse(
                success=False,
                message="Failed to delete learning goal",
                errors=[str(e)]
            )
    
    async def create_enrollment(self, username: str, content_type: str, content_id: str) -> str:
        """Create an enrollment record"""
        try:
            enrollment_id = str(uuid.uuid4())
            
            enrollment_doc = {
                "enrollment_id": enrollment_id,
                "username": username,
                "content_type": content_type,
                "content_id": content_id,
                "progress": 0.0,
                "status": "in_progress",
                "time_spent": 0,
                "enrolled_at": datetime.utcnow(),
                "last_accessed": datetime.utcnow()
            }
            
            self.enrollments_collection.insert_one(enrollment_doc)
            return enrollment_id
            
        except Exception as e:
            logger.error(f"Error creating enrollment: {e}")
            return ""
    
    async def update_enrollment_progress(self, username: str, content_type: str, 
                                       content_id: str, progress: float) -> None:
        """Update enrollment progress"""
        try:
            update_doc = {
                "progress": progress,
                "last_accessed": datetime.utcnow()
            }
            
            if progress >= 100.0:
                update_doc["status"] = "completed"
            
            self.enrollments_collection.update_one(
                {
                    "username": username,
                    "content_type": content_type,
                    "content_id": content_id
                },
                {"$set": update_doc}
            )
            
        except Exception as e:
            logger.error(f"Error updating enrollment progress: {e}")
    
    async def get_learning_analytics(self, username: str) -> APIResponse:
        """Get learning analytics for a user"""
        try:
            # Get goal statistics
            goal_stats = self.goals_collection.aggregate([
                {"$match": {"username": username}},
                {
                    "$group": {
                        "_id": None,
                        "total_goals": {"$sum": 1},
                        "completed_goals": {
                            "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                        },
                        "avg_progress": {"$avg": "$progress"},
                        "goals_by_difficulty": {
                            "$push": "$difficulty"
                        }
                    }
                }
            ])
            
            stats = list(goal_stats)
            
            # Get enrollment statistics
            enrollment_stats = self.enrollments_collection.aggregate([
                {"$match": {"username": username}},
                {
                    "$group": {
                        "_id": "$content_type",
                        "count": {"$sum": 1},
                        "avg_progress": {"$avg": "$progress"},
                        "total_time": {"$sum": "$time_spent"}
                    }
                }
            ])
            
            enrollments = list(enrollment_stats)
            
            return APIResponse(
                success=True,
                message="Analytics retrieved successfully",
                data={
                    "goal_stats": stats[0] if stats else {},
                    "enrollment_stats": enrollments
                }
            )
            
        except Exception as e:
            logger.error(f"Error getting learning analytics: {e}")
            return APIResponse(
                success=False,
                message="Failed to get analytics",
                errors=[str(e)]
            )
    
    async def get_recommended_goals(self, username: str, limit: int = 5) -> APIResponse:
        """Get recommended learning goals based on user's history"""
        try:
            # Get user's completed goals and preferences
            user_goals = await self.get_user_goals(username)
            if not user_goals.success:
                return user_goals
            
            completed_goals = [g for g in user_goals.data["goals"] if g["status"] == "completed"]
            user_tags = set()
            user_difficulties = set()
            
            for goal in completed_goals:
                user_tags.update(goal.get("tags", []))
                user_difficulties.add(goal.get("difficulty"))
            
            # Find similar goals from other users (public goals)
            recommended_pipeline = [
                {
                    "$match": {
                        "username": {"$ne": username},
                        "status": "completed",
                        "$or": [
                            {"tags": {"$in": list(user_tags)}},
                            {"difficulty": {"$in": list(user_difficulties)}}
                        ]
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "name": "$name",
                            "difficulty": "$difficulty",
                            "tags": "$tags"
                        },
                        "count": {"$sum": 1},
                        "avg_progress": {"$avg": "$progress"}
                    }
                },
                {"$sort": {"count": -1, "avg_progress": -1}},
                {"$limit": limit}
            ]
            
            recommendations = list(self.goals_collection.aggregate(recommended_pipeline))
            
            return APIResponse(
                success=True,
                message="Recommendations retrieved successfully",
                data={"recommendations": recommendations}
            )
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return APIResponse(
                success=False,
                message="Failed to get recommendations",
                errors=[str(e)]
            )

# Global service instance
learning_service = LearningService()