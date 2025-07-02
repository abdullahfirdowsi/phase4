"""
Unified Database Configuration
This module provides access to the enhanced database structure
and maintains backward compatibility during the transition period.
"""
import os
import logging
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# MongoDB Connection - Using enhanced database
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise ValueError("MONGO_URI environment variable is required")

client = MongoClient(mongo_uri)

# Use the enhanced database name
database_name = os.getenv("DATABASE_NAME", "ai_tutor_db")
db = client[database_name]

# Enhanced collections with proper structure
users_collection = db["users"]
chat_messages_collection = db["chat_messages"]
learning_goals_collection = db["learning_goals"]
quizzes_collection = db["quizzes"]
quiz_attempts_collection = db["quiz_attempts"]
lessons_collection = db["lessons"]
user_enrollments_collection = db["user_enrollments"]
user_sessions_collection = db["user_sessions"]

# Legacy compatibility - temporarily map old names to new collections
# This allows old code to work while we migrate
chats_collection = chat_messages_collection  # Backward compatibility

logger.info(f"Connected to enhanced database: {database_name}")
logger.info("Available collections: users, chat_messages, learning_goals, quizzes, quiz_attempts, lessons, user_enrollments, user_sessions")
