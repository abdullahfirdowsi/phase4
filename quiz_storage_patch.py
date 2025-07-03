# Unified Quiz Storage API Patch
# This patch ensures quiz messages are stored consistently across both old and new schemas

import logging
from database import chats_collection, chat_messages_collection, quizzes_collection
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

def store_quiz_message_unified(username: str, user_message: dict, quiz_message: dict):
    """
    Store quiz messages in both old and new schema for consistency
    This ensures compatibility during the transition period
    """
    try:
        # Store in NEW schema (chat_messages collection) - PREFERRED
        session_id = str(uuid.uuid4())
        
        # Store user message
        user_doc = {
            "username": username,
            "session_id": session_id,
            "role": user_message.get("role", "user"),
            "content": user_message.get("content", ""),
            "message_type": "content",
            "type": "content",  # Compatibility field
            "metadata": {},
            "timestamp": user_message.get("timestamp", datetime.utcnow())
        }
        chat_messages_collection.insert_one(user_doc)
        
        # Store quiz message
        quiz_doc = {
            "username": username,
            "session_id": session_id,
            "role": quiz_message.get("role", "assistant"),
            "content": quiz_message.get("content", {}),
            "message_type": "quiz",
            "type": "quiz",  # Compatibility field
            "metadata": {},
            "timestamp": quiz_message.get("timestamp", datetime.utcnow())
        }
        chat_messages_collection.insert_one(quiz_doc)
        
        # Store quiz record for Quiz System
        content = quiz_message.get("content", {})
        if isinstance(content, dict) and "quiz_data" in content:
            quiz_data = content["quiz_data"]
            quiz_id = quiz_data.get("quiz_id")
            
            if quiz_id:
                quiz_record = {
                    "quiz_id": quiz_id,
                    "username": username,
                    "quiz_json": content,
                    "created_at": quiz_message.get("timestamp", datetime.utcnow()),
                    "status": "active",
                    "source": "ai_chat"
                }
                
                quizzes_collection.update_one(
                    {"quiz_id": quiz_id, "username": username},
                    {"$set": quiz_record},
                    upsert=True
                )
                
                logger.info(f"Quiz record stored: {quiz_id}")
        
        logger.info(f"Successfully stored quiz messages for {username}")
        return True
        
    except Exception as e:
        logger.error(f"Error storing unified quiz message: {e}")
        return False

def get_quiz_messages_unified(username: str):
    """
    Get quiz messages from both old and new schemas
    Returns deduplicated list of quiz messages
    """
    try:
        quiz_messages = []
        seen_quiz_ids = set()
        
        # Get from NEW schema first (preferred)
        new_messages = list(chat_messages_collection.find({
            "username": username,
            "message_type": "quiz",
            "role": "assistant"
        }).sort("timestamp", -1))
        
        for msg in new_messages:
            content = msg.get("content", {})
            if isinstance(content, dict) and "quiz_data" in content:
                quiz_id = content["quiz_data"].get("quiz_id")
                if quiz_id and quiz_id not in seen_quiz_ids:
                    quiz_messages.append(msg)
                    seen_quiz_ids.add(quiz_id)
        
        logger.info(f"Found {len(quiz_messages)} unique quiz messages for {username}")
        return quiz_messages
        
    except Exception as e:
        logger.error(f"Error getting unified quiz messages: {e}")
        return []
