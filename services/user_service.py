"""
User Service - Handles all user-related operations
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from models.schemas import User, UserCreate, UserUpdate, UserStats, APIResponse
from database_config import get_collections
import bcrypt
import logging

logger = logging.getLogger(__name__)

class UserService:
    def __init__(self):
        self.collections = get_collections()
        self.users_collection = self.collections['users']
        self.enrollments_collection = self.collections['user_enrollments']
        self.sessions_collection = self.collections['user_sessions']
    
    async def create_user(self, user_data: UserCreate) -> APIResponse:
        """Create a new user"""
        try:
            # Check if user already exists
            existing_user = self.users_collection.find_one({
                "$or": [
                    {"username": user_data.username},
                    {"email": user_data.email}
                ]
            })
            
            if existing_user:
                return APIResponse(
                    success=False,
                    message="User with this username or email already exists"
                )
            
            # Hash password
            password_hash = bcrypt.hashpw(
                user_data.password.encode('utf-8'), 
                bcrypt.gensalt()
            ).decode('utf-8')
            
            # Create user document
            user_doc = {
                "username": user_data.username,
                "email": user_data.email,
                "password_hash": password_hash,
                "is_admin": user_data.is_admin,
                "name": user_data.name or user_data.username,
                "preferences": {
                    "language": "en",
                    "user_role": "student",
                    "age_group": "10-12",
                    "time_value": 30
                },
                "profile": {
                    "bio": None,
                    "avatar_url": None,
                    "skill_level": "beginner"
                },
                "stats": {
                    "total_goals": 0,
                    "completed_goals": 0,
                    "average_score": 0.0,
                    "total_study_time": 0,
                    "streak_days": 0
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": datetime.utcnow()  # Set to current time instead of None
            }
            
            # Update profile if provided
            if user_data.profile:
                user_doc["profile"] = {
                    "bio": user_data.profile.bio,
                    "avatar_url": user_data.profile.avatar_url,
                    "skill_level": user_data.profile.skill_level
                }
            
            result = self.users_collection.insert_one(user_doc)
            
            return APIResponse(
                success=True,
                message="User created successfully",
                data={"user_id": str(result.inserted_id)}
            )
            
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return APIResponse(
                success=False,
                message="Failed to create user",
                errors=[str(e)]
            )
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        try:
            user = self.users_collection.find_one({"username": username})
            if user:
                user["_id"] = str(user["_id"])
            return user
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            return None
    
    async def update_user(self, username: str, update_data: UserUpdate) -> APIResponse:
        """Update user information"""
        try:
            update_doc = {"updated_at": datetime.utcnow()}
            
            if update_data.name:
                update_doc["name"] = update_data.name
            if update_data.preferences:
                update_doc["preferences"] = update_data.preferences.dict()
            if update_data.profile:
                # Get current profile to merge with updates
                user = await self.get_user_by_username(username)
                current_profile = user.get("profile", {}) if user else {}
                
                # Create updated profile by merging current with updates
                updated_profile = current_profile.copy()
                profile_updates = update_data.profile.dict(exclude_unset=True)
                
                for key, value in profile_updates.items():
                    if value is not None:  # Only update fields that are provided
                        updated_profile[key] = value
                
                update_doc["profile"] = updated_profile
            
            result = self.users_collection.update_one(
                {"username": username},
                {"$set": update_doc}
            )
            
            if result.matched_count == 0:
                return APIResponse(
                    success=False,
                    message="User not found"
                )
            
            return APIResponse(
                success=True,
                message="User updated successfully"
            )
            
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return APIResponse(
                success=False,
                message="Failed to update user",
                errors=[str(e)]
            )
    
    async def calculate_user_stats(self, username: str) -> UserStats:
        """Calculate real-time user statistics"""
        try:
            # Get learning goals count
            goals_collection = self.collections['learning_goals']
            total_goals = goals_collection.count_documents({"username": username})
            completed_goals = goals_collection.count_documents({
                "username": username,
                "status": "completed"
            })
            
            # Get quiz attempts
            attempts_collection = self.collections['quiz_attempts']
            quiz_attempts = list(attempts_collection.find({
                "username": username,
                "completed": True
            }))
            
            total_quizzes = len(quiz_attempts)
            average_score = 0.0
            if quiz_attempts:
                total_score = sum(attempt.get("score", 0) for attempt in quiz_attempts)
                average_score = total_score / total_quizzes
            
            # Calculate study time from enrollments
            total_study_time = self.enrollments_collection.aggregate([
                {"$match": {"username": username}},
                {"$group": {"_id": None, "total_time": {"$sum": "$time_spent"}}}
            ])
            
            study_time = 0
            for result in total_study_time:
                study_time = result.get("total_time", 0)
            
            # Calculate streak (simplified - based on recent activity)
            recent_activity = self.sessions_collection.count_documents({
                "username": username,
                "login_time": {"$gte": datetime.utcnow() - timedelta(days=7)}
            })
            
            streak_days = min(recent_activity, 7)  # Max 7 days for this example
            
            stats = UserStats(
                total_goals=total_goals,
                completed_goals=completed_goals,
                average_score=round(average_score, 2),
                total_study_time=study_time,
                streak_days=streak_days
            )
            
            # Update user stats in database
            self.users_collection.update_one(
                {"username": username},
                {"$set": {"stats": stats.dict(), "updated_at": datetime.utcnow()}}
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Error calculating user stats: {e}")
            return UserStats()
    
    async def update_last_login(self, username: str) -> None:
        """Update user's last login timestamp"""
        try:
            self.users_collection.update_one(
                {"username": username},
                {"$set": {"last_login": datetime.utcnow()}}
            )
        except Exception as e:
            logger.error(f"Error updating last login: {e}")
    
    async def get_users_overview(self, admin_username: str) -> APIResponse:
        """Get overview of all users (admin only)"""
        try:
            # Verify admin privileges
            admin_user = await self.get_user_by_username(admin_username)
            if not admin_user or not admin_user.get("is_admin", False):
                return APIResponse(
                    success=False,
                    message="Admin access required"
                )
            
            # Get all users with basic info
            users = list(self.users_collection.find(
                {},
                {
                    "username": 1,
                    "email": 1,
                    "is_admin": 1,
                    "created_at": 1,
                    "last_login": 1,
                    "stats": 1,
                    "profile.avatar_url": 1
                }
            ))
            
            # Convert ObjectId to string
            for user in users:
                user["_id"] = str(user["_id"])
            
            return APIResponse(
                success=True,
                message="Users overview retrieved successfully",
                data={
                    "users": users,
                    "total_users": len(users),
                    "admin_users": len([u for u in users if u.get("is_admin", False)])
                }
            )
            
        except Exception as e:
            logger.error(f"Error getting users overview: {e}")
            return APIResponse(
                success=False,
                message="Failed to get users overview",
                errors=[str(e)]
            )

# Global service instance
user_service = UserService()