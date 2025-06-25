"""
Enhanced Database Configuration with MongoDB Best Practices
Handles connection, indexing, and collection management
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient, IndexModel, ASCENDING, DESCENDING, TEXT
from pymongo.errors import CollectionInvalid
from dotenv import load_dotenv
from datetime import datetime, timedelta
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseConfig:
    def __init__(self):
        self.mongo_uri = os.getenv("MONGO_URI")
        self.database_name = os.getenv("DATABASE_NAME", "ai_tutor_db")
        self.client = None
        self.async_client = None
        self.db = None
        self.async_db = None
        
    def connect_sync(self):
        """Synchronous MongoDB connection"""
        try:
            self.client = MongoClient(self.mongo_uri)
            self.db = self.client[self.database_name]
            # Test connection
            self.client.admin.command('ping')
            logger.info(f"✅ Connected to MongoDB: {self.database_name}")
            return self.db
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            raise
    
    async def connect_async(self):
        """Asynchronous MongoDB connection"""
        try:
            self.async_client = AsyncIOMotorClient(self.mongo_uri)
            self.async_db = self.async_client[self.database_name]
            # Test connection
            await self.async_client.admin.command('ping')
            logger.info(f"✅ Connected to MongoDB (Async): {self.database_name}")
            return self.async_db
        except Exception as e:
            logger.error(f"❌ MongoDB async connection failed: {e}")
            raise
    
    def create_indexes(self):
        """Create optimized indexes for all collections"""
        try:
            db = self.connect_sync()
            
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
            db.users.create_indexes(users_indexes)
            
            # Chat Messages Collection Indexes
            chat_indexes = [
                IndexModel([("username", ASCENDING), ("timestamp", DESCENDING)]),
                IndexModel([("session_id", ASCENDING)]),
                IndexModel([("message_type", ASCENDING)]),
                IndexModel([("timestamp", DESCENDING)]),
                IndexModel([("role", ASCENDING)]),
                IndexModel([("content", TEXT)]),  # Full-text search
            ]
            db.chat_messages.create_indexes(chat_indexes)
            
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
            db.learning_goals.create_indexes(goals_indexes)
            
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
            db.quizzes.create_indexes(quiz_indexes)
            
            # Quiz Attempts Collection Indexes
            attempts_indexes = [
                IndexModel([("username", ASCENDING), ("completed_at", DESCENDING)]),
                IndexModel([("quiz_id", ASCENDING)]),
                IndexModel([("attempt_id", ASCENDING)], unique=True),
                IndexModel([("score", DESCENDING)]),
                IndexModel([("completed", ASCENDING)]),
                IndexModel([("completed_at", DESCENDING)]),
            ]
            db.quiz_attempts.create_indexes(attempts_indexes)
            
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
            db.lessons.create_indexes(lessons_indexes)
            
            # User Enrollments Collection Indexes
            enrollments_indexes = [
                IndexModel([("username", ASCENDING)]),
                IndexModel([("content_type", ASCENDING), ("content_id", ASCENDING)]),
                IndexModel([("enrollment_id", ASCENDING)], unique=True),
                IndexModel([("status", ASCENDING)]),
                IndexModel([("enrolled_at", DESCENDING)]),
                IndexModel([("last_accessed", DESCENDING)]),
            ]
            db.user_enrollments.create_indexes(enrollments_indexes)
            
            # User Sessions Collection Indexes
            sessions_indexes = [
                IndexModel([("session_id", ASCENDING)], unique=True),
                IndexModel([("username", ASCENDING)]),
                IndexModel([("login_time", DESCENDING)]),
                IndexModel([("logout_time", DESCENDING)]),
                IndexModel([("ip_address", ASCENDING)]),
            ]
            db.user_sessions.create_indexes(sessions_indexes)
            
            logger.info("✅ All database indexes created successfully")
            
        except Exception as e:
            logger.error(f"❌ Error creating indexes: {e}")
            raise
    
    def create_collections_with_validation(self):
        """Create collections with schema validation"""
        try:
            db = self.connect_sync()
            
            # Create collections without validation for now
            # This is simpler and more flexible for development
            collections_to_create = [
                "users",
                "chat_messages",
                "learning_goals",
                "quizzes",
                "quiz_attempts",
                "lessons",
                "user_enrollments",
                "user_sessions"
            ]
            
            for collection_name in collections_to_create:
                try:
                    db.create_collection(collection_name)
                    logger.info(f"✅ Created collection: {collection_name}")
                except CollectionInvalid:
                    logger.info(f"📝 Collection {collection_name} already exists")
                    
        except Exception as e:
            logger.error(f"❌ Error creating collections: {e}")
            raise

# Global database instance
db_config = DatabaseConfig()

# Collection references
def get_collections():
    """Get all collection references"""
    db = db_config.connect_sync()
    return {
        'users': db.users,
        'chat_messages': db.chat_messages,
        'learning_goals': db.learning_goals,
        'quizzes': db.quizzes,
        'quiz_attempts': db.quiz_attempts,
        'lessons': db.lessons,
        'user_enrollments': db.user_enrollments,
        'user_sessions': db.user_sessions
    }

# Initialize database
def initialize_database():
    """Initialize database with collections and indexes"""
    try:
        db_config.create_collections_with_validation()
        db_config.create_indexes()
        logger.info("🚀 Database initialization completed successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

if __name__ == "__main__":
    initialize_database()