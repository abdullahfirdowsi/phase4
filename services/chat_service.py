"""
Chat Service - Handles all chat and messaging operations
"""
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
from models.schemas import ChatMessage, MessageType, APIResponse
from database import get_collections
import uuid
import logging

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        self.collections = get_collections()
        self.chat_collection = self.collections['chat_messages']
        self.sessions_collection = self.collections['user_sessions']
    
    async def create_session(self, username: str, ip_address: str, user_agent: str) -> str:
        """Create or get existing chat session for user"""
        try:
            # Check for existing active session first
            existing_session = self.sessions_collection.find_one({
                "username": username,
                "logout_time": None  # Active session
            }, sort=[("login_time", -1)])  # Get most recent
            
            if existing_session:
                session_id = existing_session["session_id"]
                logger.info(f"🔄 Reusing existing session for {username}: {session_id}")
                return session_id
            
            # Create new session if none exists
            session_id = f"chat_session_{username}_{int(datetime.utcnow().timestamp() * 1000)}"
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
            logger.info(f"🆕 Created new session for {username}: {session_id}")
            return session_id
            
        except Exception as e:
            logger.error(f"Error creating chat session: {e}")
            # Fallback with consistent format
            return f"chat_session_{username}_{int(datetime.utcnow().timestamp() * 1000)}"
    
    async def store_message(self, username: str, session_id: str, role: str, 
                          content: Union[str, Dict[str, Any]], message_type: MessageType = MessageType.CONTENT,
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
        """Clear chat history for a user (preserves learning paths and quizzes)"""
        try:
            # Only clear regular content messages, preserve learning paths and quizzes
            query = {
                "username": username,
                "message_type": {"$in": ["content", "CONTENT"]}
            }
            if session_id:
                query["session_id"] = session_id
            
            result = self.chat_collection.delete_many(query)
            
            return APIResponse(
                success=True,
                message=f"Cleared {result.deleted_count} chat messages (learning paths and quizzes preserved)",
                data={"deleted_count": result.deleted_count}
            )
            
        except Exception as e:
            logger.error(f"Error clearing chat history: {e}")
            return APIResponse(
                success=False,
                message="Failed to clear chat history",
                errors=[str(e)]
            )
    
    async def clear_all_messages(self, username: str, session_id: Optional[str] = None) -> APIResponse:
        """Clear ALL messages for a user (including learning paths and quizzes)"""
        try:
            query = {"username": username}
            if session_id:
                query["session_id"] = session_id
            
            result = self.chat_collection.delete_many(query)
            
            return APIResponse(
                success=True,
                message=f"Cleared all {result.deleted_count} messages",
                data={"deleted_count": result.deleted_count}
            )
            
        except Exception as e:
            logger.error(f"Error clearing all messages: {e}")
            return APIResponse(
                success=False,
                message="Failed to clear all messages",
                errors=[str(e)]
            )
    
    async def search_messages(self, username: str, query: str, limit: int = 20) -> APIResponse:
        """Search messages using full-text search with fallback to regex"""
        try:
            search_results = []
            
            # First try full-text search (requires text index)
            try:
                search_results = list(self.chat_collection.find({
                    "username": username,
                    "$text": {"$search": query}
                }).limit(limit))
                logger.debug(f"Full-text search returned {len(search_results)} results")
            except Exception as text_search_error:
                logger.warning(f"Full-text search failed: {text_search_error}")
                
                # Fallback to regex search if full-text search fails
                try:
                    search_results = list(self.chat_collection.find({
                        "username": username,
                        "content": {"$regex": query, "$options": "i"}
                    }).limit(limit))
                    logger.debug(f"Regex search returned {len(search_results)} results")
                except Exception as regex_error:
                    logger.warning(f"Regex search failed: {regex_error}")
                    
                    # Final fallback: iterate through messages
                    all_messages = list(self.chat_collection.find({"username": username}).limit(1000))
                    search_results = []
                    
                    for msg in all_messages:
                        content = msg.get("content", "")
                        if isinstance(content, str) and query.lower() in content.lower():
                            search_results.append(msg)
                            if len(search_results) >= limit:
                                break
                    
                    logger.debug(f"Manual search returned {len(search_results)} results")
            
            # Sort by timestamp (most recent first)
            search_results.sort(key=lambda x: x.get("timestamp", datetime.utcnow()), reverse=True)
            
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
                        "avg_length": {
                            "$avg": {
                                "$cond": {
                                    "if": {"$eq": [{"$type": "$content"}, "string"]},
                                    "then": {"$strLenCP": "$content"},
                                    "else": {
                                        "$strLenCP": {
                                            "$convert": {
                                                "input": "$content",
                                                "to": "string",
                                                "onError": "[Complex Object]"
                                            }
                                        }
                                    }
                                }
                            }
                        }
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