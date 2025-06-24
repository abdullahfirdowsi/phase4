"""
Chat Service - Handles all chat and messaging operations
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from models.schemas import ChatMessage, MessageType, APIResponse
from database_config import get_collections
import uuid
import logging

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        self.collections = get_collections()
        self.chat_collection = self.collections['chat_messages']
        self.sessions_collection = self.collections['user_sessions']
    
    async def create_session(self, username: str, ip_address: str, user_agent: str) -> str:
        """Create a new chat session"""
        try:
            session_id = str(uuid.uuid4())
            session_doc = {
                "session_id": session_id,
                "username": username,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "login_time": datetime.utcnow(),
                "logout_time": None,
                "activities": []
            }
            
            self.sessions_collection.insert_one(session_doc)
            return session_id
            
        except Exception as e:
            logger.error(f"Error creating chat session: {e}")
            return str(uuid.uuid4())  # Fallback
    
    async def store_message(self, username: str, session_id: str, role: str, 
                          content: str, message_type: MessageType = MessageType.CONTENT,
                          metadata: Optional[Dict[str, Any]] = None) -> APIResponse:
        """Store a chat message"""
        try:
            message_doc = {
                "username": username,
                "session_id": session_id,
                "role": role,
                "content": content,
                "message_type": message_type.value,
                "metadata": metadata or {},
                "timestamp": datetime.utcnow()
            }
            
            result = self.chat_collection.insert_one(message_doc)
            
            # Update session activity
            await self.log_activity(session_id, "message_sent", str(result.inserted_id))
            
            return APIResponse(
                success=True,
                message="Message stored successfully",
                data={"message_id": str(result.inserted_id)}
            )
            
        except Exception as e:
            logger.error(f"Error storing message: {e}")
            return APIResponse(
                success=False,
                message="Failed to store message",
                errors=[str(e)]
            )
    
    async def get_chat_history(self, username: str, session_id: Optional[str] = None,
                             limit: int = 50, offset: int = 0) -> APIResponse:
        """Get chat history for a user"""
        try:
            query = {"username": username}
            if session_id:
                query["session_id"] = session_id
            
            messages = list(self.chat_collection.find(query)
                          .sort("timestamp", -1)
                          .skip(offset)
                          .limit(limit))
            
            # Convert ObjectId to string and reverse order for chronological display
            for message in messages:
                message["_id"] = str(message["_id"])
            
            messages.reverse()  # Show oldest first
            
            return APIResponse(
                success=True,
                message="Chat history retrieved successfully",
                data={
                    "messages": messages,
                    "total": len(messages),
                    "has_more": len(messages) == limit
                }
            )
            
        except Exception as e:
            logger.error(f"Error getting chat history: {e}")
            return APIResponse(
                success=False,
                message="Failed to get chat history",
                errors=[str(e)]
            )
    
    async def clear_chat_history(self, username: str, session_id: Optional[str] = None) -> APIResponse:
        """Clear chat history for a user"""
        try:
            query = {"username": username}
            if session_id:
                query["session_id"] = session_id
            
            result = self.chat_collection.delete_many(query)
            
            return APIResponse(
                success=True,
                message=f"Cleared {result.deleted_count} messages",
                data={"deleted_count": result.deleted_count}
            )
            
        except Exception as e:
            logger.error(f"Error clearing chat history: {e}")
            return APIResponse(
                success=False,
                message="Failed to clear chat history",
                errors=[str(e)]
            )
    
    async def search_messages(self, username: str, query: str, limit: int = 20) -> APIResponse:
        """Search messages using full-text search"""
        try:
            search_results = list(self.chat_collection.find({
                "username": username,
                "$text": {"$search": query}
            }).limit(limit))
            
            # Convert ObjectId to string
            for message in search_results:
                message["_id"] = str(message["_id"])
            
            return APIResponse(
                success=True,
                message="Search completed successfully",
                data={
                    "messages": search_results,
                    "total": len(search_results)
                }
            )
            
        except Exception as e:
            logger.error(f"Error searching messages: {e}")
            return APIResponse(
                success=False,
                message="Failed to search messages",
                errors=[str(e)]
            )
    
    async def log_activity(self, session_id: str, action: str, resource_id: Optional[str] = None) -> None:
        """Log user activity in session"""
        try:
            activity = {
                "action": action,
                "resource_id": resource_id,
                "timestamp": datetime.utcnow()
            }
            
            self.sessions_collection.update_one(
                {"session_id": session_id},
                {"$push": {"activities": activity}}
            )
            
        except Exception as e:
            logger.error(f"Error logging activity: {e}")
    
    async def get_message_analytics(self, username: str, days: int = 30) -> APIResponse:
        """Get message analytics for a user"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Aggregate message statistics
            pipeline = [
                {
                    "$match": {
                        "username": username,
                        "timestamp": {"$gte": start_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                            "role": "$role"
                        },
                        "count": {"$sum": 1},
                        "avg_length": {"$avg": {"$strLenCP": "$content"}}
                    }
                },
                {
                    "$sort": {"_id.date": 1}
                }
            ]
            
            analytics = list(self.chat_collection.aggregate(pipeline))
            
            return APIResponse(
                success=True,
                message="Analytics retrieved successfully",
                data={"analytics": analytics}
            )
            
        except Exception as e:
            logger.error(f"Error getting message analytics: {e}")
            return APIResponse(
                success=False,
                message="Failed to get analytics",
                errors=[str(e)]
            )
    
    async def archive_old_messages(self, days_old: int = 90) -> APIResponse:
        """Archive messages older than specified days"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            # Move old messages to archive collection
            old_messages = list(self.chat_collection.find({
                "timestamp": {"$lt": cutoff_date}
            }))
            
            if old_messages:
                # Insert into archive collection
                archive_collection = self.collections.get('chat_messages_archive')
                if not archive_collection:
                    # Create archive collection if it doesn't exist
                    db = self.collections['chat_messages'].database
                    archive_collection = db.chat_messages_archive
                
                archive_collection.insert_many(old_messages)
                
                # Delete from main collection
                result = self.chat_collection.delete_many({
                    "timestamp": {"$lt": cutoff_date}
                })
                
                return APIResponse(
                    success=True,
                    message=f"Archived {result.deleted_count} old messages",
                    data={"archived_count": result.deleted_count}
                )
            else:
                return APIResponse(
                    success=True,
                    message="No old messages to archive",
                    data={"archived_count": 0}
                )
                
        except Exception as e:
            logger.error(f"Error archiving messages: {e}")
            return APIResponse(
                success=False,
                message="Failed to archive messages",
                errors=[str(e)]
            )

# Global service instance
chat_service = ChatService()