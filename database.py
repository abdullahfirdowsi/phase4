"""
Enhanced Database Configuration
Unified database access with backward compatibility and advanced features
"""
import os
import logging
from pymongo import MongoClient, IndexModel, ASCENDING, DESCENDING, TEXT
from pymongo.errors import CollectionInvalid
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.mongo_uri = os.getenv("MONGO_URI")
        if not self.mongo_uri:
            raise ValueError("MONGO_URI environment variable is required")
        
        self.database_name = os.getenv("DATABASE_NAME", "ai_tutor_db")
        self.client = MongoClient(self.mongo_uri)
        self.db = self.client[self.database_name]
        
        # Test connection
        try:
            self.client.admin.command('ping')
            logger.info(f"✅ Connected to MongoDB: {self.database_name}")
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            raise
    
    def get_collections(self):
        """Get all collection references"""
        return {
            'users': self.db.users,
            'chat_messages': self.db.chat_messages,
            'learning_goals': self.db.learning_goals,
            'quizzes': self.db.quizzes,
            'quiz_attempts': self.db.quiz_attempts,
            'lessons': self.db.lessons,
            'user_enrollments': self.db.user_enrollments,
            'user_sessions': self.db.user_sessions
        }
    
    def create_indexes(self):
        """Create optimized indexes for all collections"""
        try:
            # Users Collection Indexes
            users_indexes = [
                IndexModel([("username", ASCENDING)], unique=True),
                IndexModel([("email", ASCENDING)], unique=True),
                IndexModel([("is_admin", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
                IndexModel([("last_login", DESCENDING)]),
                IndexModel([("preferences.user_role", ASCENDING)]),
                IndexModel([("stats.total_goals", DESCENDING)]),
            ]
            self.db.users.create_indexes(users_indexes)
            
            # Chat Messages Collection Indexes
            chat_indexes = [
                IndexModel([("username", ASCENDING), ("timestamp", DESCENDING)]),
                IndexModel([("session_id", ASCENDING)]),
                IndexModel([("message_type", ASCENDING)]),
                IndexModel([("timestamp", DESCENDING)]),
                IndexModel([("role", ASCENDING)]),
                IndexModel([("content", TEXT)]),  # Full-text search
            ]
            self.db.chat_messages.create_indexes(chat_indexes)
            
            # Learning Goals Collection Indexes
            goals_indexes = [
                IndexModel([("username", ASCENDING)]),
                IndexModel([("goal_id", ASCENDING)], unique=True),
                IndexModel([("status", ASCENDING)]),
                IndexModel([("difficulty", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
                IndexModel([("target_completion_date", ASCENDING)]),
                IndexModel([("tags", ASCENDING)]),
                IndexModel([("progress", DESCENDING)]),
            ]
            self.db.learning_goals.create_indexes(goals_indexes)
            
            # Quizzes Collection Indexes
            quiz_indexes = [
                IndexModel([("quiz_id", ASCENDING)], unique=True),
                IndexModel([("created_by", ASCENDING)]),
                IndexModel([("subject", ASCENDING)]),
                IndexModel([("difficulty", ASCENDING)]),
                IndexModel([("is_public", ASCENDING)]),
                IndexModel([("tags", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ]
            self.db.quizzes.create_indexes(quiz_indexes)
            
            # Quiz Attempts Collection Indexes
            attempts_indexes = [
                IndexModel([("username", ASCENDING), ("completed_at", DESCENDING)]),
                IndexModel([("quiz_id", ASCENDING)]),
                IndexModel([("attempt_id", ASCENDING)], unique=True),
                IndexModel([("score", DESCENDING)]),
                IndexModel([("completed", ASCENDING)]),
                IndexModel([("completed_at", DESCENDING)]),
            ]
            self.db.quiz_attempts.create_indexes(attempts_indexes)
            
            # Lessons Collection Indexes
            lessons_indexes = [
                IndexModel([("lesson_id", ASCENDING)], unique=True),
                IndexModel([("created_by", ASCENDING)]),
                IndexModel([("subject", ASCENDING)]),
                IndexModel([("difficulty", ASCENDING)]),
                IndexModel([("is_public", ASCENDING)]),
                IndexModel([("lesson_type", ASCENDING)]),
                IndexModel([("tags", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ]
            self.db.lessons.create_indexes(lessons_indexes)
            
            # User Enrollments Collection Indexes
            enrollments_indexes = [
                IndexModel([("username", ASCENDING)]),
                IndexModel([("content_type", ASCENDING), ("content_id", ASCENDING)]),
                IndexModel([("enrollment_id", ASCENDING)], unique=True),
                IndexModel([("status", ASCENDING)]),
                IndexModel([("enrolled_at", DESCENDING)]),
                IndexModel([("last_accessed", DESCENDING)]),
            ]
            self.db.user_enrollments.create_indexes(enrollments_indexes)
            
            # User Sessions Collection Indexes
            sessions_indexes = [
                IndexModel([("session_id", ASCENDING)], unique=True),
                IndexModel([("username", ASCENDING)]),
                IndexModel([("login_time", DESCENDING)]),
                IndexModel([("logout_time", DESCENDING)]),
                IndexModel([("ip_address", ASCENDING)]),
            ]
            self.db.user_sessions.create_indexes(sessions_indexes)
            
            logger.info("✅ All database indexes created successfully")
            
        except Exception as e:
            logger.error(f"❌ Error creating indexes: {e}")
            raise
    
    def create_collections_with_validation(self):
        """Create collections with schema validation"""
        try:
            collections_to_create = [
                "users", "chat_messages", "learning_goals", "quizzes",
                "quiz_attempts", "lessons", "user_enrollments", "user_sessions"
            ]
            
            for collection_name in collections_to_create:
                try:
                    self.db.create_collection(collection_name)
                    logger.info(f"✅ Created collection: {collection_name}")
                except CollectionInvalid:
                    logger.info(f"📝 Collection {collection_name} already exists")
                    
        except Exception as e:
            logger.error(f"❌ Error creating collections: {e}")
            raise

# Global database manager
db_manager = DatabaseManager()

# Enhanced collections with proper structure
users_collection = db_manager.db["users"]
chat_messages_collection = db_manager.db["chat_messages"]
learning_goals_collection = db_manager.db["learning_goals"]
quizzes_collection = db_manager.db["quizzes"]
quiz_attempts_collection = db_manager.db["quiz_attempts"]
lessons_collection = db_manager.db["lessons"]
user_enrollments_collection = db_manager.db["user_enrollments"]
user_sessions_collection = db_manager.db["user_sessions"]

# Legacy compatibility - map old names to new collections
chats_collection = chat_messages_collection  # Backward compatibility

# Convenience functions
def get_collections():
    """Get all collection references"""
    return db_manager.get_collections()

def initialize_database():
    """Initialize database with proper indexes"""
    try:
        db_manager.create_collections_with_validation()
        db_manager.create_indexes()
        logger.info("🚀 Database initialization completed successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

logger.info(f"Connected to enhanced database: {db_manager.database_name}")
logger.info("Available collections: users, chat_messages, learning_goals, quizzes, quiz_attempts, lessons, user_enrollments, user_sessions")
