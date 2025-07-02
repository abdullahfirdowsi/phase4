"""
Enhanced Database Reset Script
Provides safe and comprehensive database reset functionality for ai_tutor_db
"""
import os
import asyncio
import logging
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv
import argparse

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseReset:
    def __init__(self):
        self.mongo_uri = os.getenv("MONGO_URI")
        if not self.mongo_uri:
            raise ValueError("MONGO_URI environment variable is required")
        
        self.client = MongoClient(self.mongo_uri)
        self.database_name = os.getenv("DATABASE_NAME", "ai_tutor_db")
        self.db = self.client[self.database_name]
        
        # Define all collections in the enhanced system
        self.collections = [
            "users",
            "chat_messages", 
            "learning_goals",
            "quizzes",
            "quiz_attempts",
            "lessons",
            "user_enrollments",
            "user_sessions"
        ]
    
    def create_backup(self) -> bool:
        """Create a backup before reset"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_db_name = f"{self.database_name}_backup_{timestamp}"
            backup_db = self.client[backup_db_name]
            
            logger.info(f"💾 Creating backup: {backup_db_name}")
            
            backup_count = 0
            for collection_name in self.collections:
                collection = self.db[collection_name]
                documents = list(collection.find({}))
                
                if documents:
                    backup_db[collection_name].insert_many(documents)
                    backup_count += len(documents)
                    logger.info(f"  📄 Backed up {len(documents)} documents from {collection_name}")
                else:
                    logger.info(f"  📄 {collection_name} is empty, skipping")
            
            logger.info(f"✅ Backup completed: {backup_count} total documents backed up")
            return True
            
        except Exception as e:
            logger.error(f"❌ Backup failed: {e}")
            return False
    
    def reset_specific_collections(self, collection_names: list) -> dict:
        """Reset specific collections only"""
        try:
            logger.info(f"🔄 Resetting specific collections: {collection_names}")
            
            reset_stats = {}
            for collection_name in collection_names:
                if collection_name not in self.collections:
                    logger.warning(f"⚠️ Unknown collection: {collection_name}")
                    continue
                
                collection = self.db[collection_name]
                count_before = collection.count_documents({})
                
                # Drop the collection
                collection.drop()
                logger.info(f"  🗑️ Dropped {collection_name} ({count_before} documents)")
                
                reset_stats[collection_name] = count_before
            
            # Recreate collections and indexes
            self._recreate_structure()
            
            logger.info(f"✅ Reset completed for collections: {collection_names}")
            return reset_stats
            
        except Exception as e:
            logger.error(f"❌ Specific reset failed: {e}")
            return {}
    
    def reset_all_collections(self) -> dict:
        """Reset all collections in the database"""
        try:
            logger.info("🔄 Resetting all collections...")
            
            reset_stats = {}
            for collection_name in self.collections:
                collection = self.db[collection_name]
                count_before = collection.count_documents({})
                
                # Drop the collection
                collection.drop()
                logger.info(f"  🗑️ Dropped {collection_name} ({count_before} documents)")
                
                reset_stats[collection_name] = count_before
            
            # Recreate collections and indexes
            self._recreate_structure()
            
            logger.info("✅ All collections reset completed")
            return reset_stats
            
        except Exception as e:
            logger.error(f"❌ Full reset failed: {e}")
            return {}
    
    def reset_user_data_only(self, username: str) -> dict:
        """Reset data for a specific user only"""
        try:
            logger.info(f"🔄 Resetting data for user: {username}")
            
            reset_stats = {}
            
            # Reset user-specific data in each collection
            collections_with_user_data = {
                "users": {"username": username},
                "chat_messages": {"username": username},
                "learning_goals": {"username": username},
                "quiz_attempts": {"username": username},
                "user_enrollments": {"username": username},
                "user_sessions": {"username": username}
            }
            
            for collection_name, query in collections_with_user_data.items():
                collection = self.db[collection_name]
                count_before = collection.count_documents(query)
                
                if count_before > 0:
                    result = collection.delete_many(query)
                    reset_stats[collection_name] = result.deleted_count
                    logger.info(f"  🗑️ Deleted {result.deleted_count} documents from {collection_name}")
                else:
                    reset_stats[collection_name] = 0
                    logger.info(f"  📄 No data found in {collection_name} for user {username}")
            
            logger.info(f"✅ User data reset completed for: {username}")
            return reset_stats
            
        except Exception as e:
            logger.error(f"❌ User data reset failed: {e}")
            return {}
    
    def _recreate_structure(self):
        """Recreate database structure with indexes"""
        try:
            logger.info("🏗️ Recreating database structure...")
            
            # Initialize the enhanced database structure
            from database_config import initialize_database
            initialize_database()
            
            logger.info("✅ Database structure recreated")
            
        except Exception as e:
            logger.error(f"❌ Structure recreation failed: {e}")
    
    def add_sample_data(self) -> dict:
        """Add sample data for testing"""
        try:
            logger.info("📝 Adding sample data...")
            
            from datetime import datetime
            import uuid
            import bcrypt
            
            sample_stats = {}
            
            # Sample user
            sample_user = {
                "username": "demo_user",
                "email": "demo@example.com",
                "password_hash": bcrypt.hashpw("demo123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                "is_admin": False,
                "name": "Demo User",
                "preferences": {
                    "language": "English",
                    "user_role": "student",
                    "age_group": "18-25",
                    "time_value": 30
                },
                "profile": {
                    "bio": "Demo user for testing",
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
                "last_login": datetime.utcnow()
            }
            
            # Insert sample user
            result = self.db.users.insert_one(sample_user)
            sample_stats["users"] = 1
            logger.info("  👤 Added sample user: demo_user")
            
            # Sample learning goal
            sample_goal = {
                "goal_id": str(uuid.uuid4()),
                "username": "demo_user",
                "name": "Learn Python Basics",
                "description": "Master the fundamentals of Python programming",
                "difficulty": "beginner",
                "duration": "2 weeks",
                "progress": 0.0,
                "status": "active",
                "prerequisites": [],
                "tags": ["python", "programming", "basics"],
                "study_plans": [{
                    "name": "Python Fundamentals",
                    "description": "Basic Python concepts and syntax",
                    "topics": [
                        {"name": "Variables and Data Types", "completed": False},
                        {"name": "Control Structures", "completed": False},
                        {"name": "Functions", "completed": False}
                    ],
                    "duration": "1 week"
                }],
                "created_at": datetime.utcnow(),
                "target_completion_date": None
            }
            
            # Insert sample goal
            self.db.learning_goals.insert_one(sample_goal)
            sample_stats["learning_goals"] = 1
            logger.info("  🎯 Added sample learning goal")
            
            # Sample quiz
            sample_quiz = {
                "quiz_id": str(uuid.uuid4()),
                "title": "Python Basics Assessment",
                "description": "Test your knowledge of Python fundamentals",
                "subject": "Python Programming",
                "difficulty": "beginner",
                "time_limit": 30,
                "is_public": True,
                "created_by": "system",
                "questions": [
                    {
                        "question_id": str(uuid.uuid4()),
                        "question": "What is the correct way to create a list in Python?",
                        "question_type": "mcq",
                        "options": ["[]", "()", "{}", "<>"],
                        "correct_answer": "[]",
                        "explanation": "Square brackets [] are used to create lists in Python",
                        "points": 1
                    },
                    {
                        "question_id": str(uuid.uuid4()),
                        "question": "Python is a compiled language.",
                        "question_type": "true_false",
                        "options": ["True", "False"],
                        "correct_answer": "False",
                        "explanation": "Python is an interpreted language, not compiled",
                        "points": 1
                    }
                ],
                "tags": ["python", "basics", "assessment"],
                "created_at": datetime.utcnow()
            }
            
            # Insert sample quiz
            self.db.quizzes.insert_one(sample_quiz)
            sample_stats["quizzes"] = 1
            logger.info("  📋 Added sample quiz")
            
            # Sample lesson
            sample_lesson = {
                "lesson_id": str(uuid.uuid4()),
                "title": "Introduction to Python Programming",
                "description": "Learn the basics of Python programming language",
                "content": "Python is a high-level, interpreted programming language with dynamic semantics. Its high-level built-in data structures, combined with dynamic typing and dynamic binding, make it very attractive for Rapid Application Development.",
                "lesson_type": "text",
                "subject": "Python Programming",
                "difficulty": "beginner",
                "duration": 45,
                "is_public": True,
                "created_by": "system",
                "resources": ["https://python.org", "https://docs.python.org"],
                "tags": ["python", "introduction", "programming"],
                "status": "published",
                "created_at": datetime.utcnow()
            }
            
            # Insert sample lesson
            self.db.lessons.insert_one(sample_lesson)
            sample_stats["lessons"] = 1
            logger.info("  📚 Added sample lesson")
            
            logger.info(f"✅ Sample data added: {sample_stats}")
            return sample_stats
            
        except Exception as e:
            logger.error(f"❌ Sample data creation failed: {e}")
            return {}
    
    def get_database_stats(self) -> dict:
        """Get current database statistics"""
        try:
            stats = {"database": self.database_name, "collections": {}}
            
            for collection_name in self.collections:
                collection = self.db[collection_name]
                count = collection.count_documents({})
                stats["collections"][collection_name] = count
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Stats retrieval failed: {e}")
            return {}

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(description="Enhanced Database Reset Tool")
    parser.add_argument("--action", choices=["reset-all", "reset-collections", "reset-user", "stats", "add-samples"], 
                       default="stats", help="Action to perform")
    parser.add_argument("--collections", nargs="+", help="Specific collections to reset")
    parser.add_argument("--username", help="Username for user-specific reset")
    parser.add_argument("--backup", action="store_true", help="Create backup before reset")
    parser.add_argument("--force", action="store_true", help="Skip confirmation prompts")
    
    args = parser.parse_args()
    
    try:
        db_reset = DatabaseReset()
        
        # Show current stats
        if args.action == "stats":
            logger.info("📊 Current Database Statistics:")
            stats = db_reset.get_database_stats()
            logger.info(f"Database: {stats['database']}")
            for collection, count in stats["collections"].items():
                logger.info(f"  {collection}: {count} documents")
            return
        
        # Add sample data
        if args.action == "add-samples":
            logger.info("📝 Adding sample data...")
            sample_stats = db_reset.add_sample_data()
            logger.info(f"✅ Sample data added: {sample_stats}")
            return
        
        # Confirmation for destructive operations
        if not args.force:
            if args.action == "reset-all":
                confirm = input("⚠️ This will delete ALL data in the database. Are you sure? (yes/no): ")
            elif args.action == "reset-collections":
                confirm = input(f"⚠️ This will delete data in collections: {args.collections}. Are you sure? (yes/no): ")
            elif args.action == "reset-user":
                confirm = input(f"⚠️ This will delete all data for user '{args.username}'. Are you sure? (yes/no): ")
            else:
                confirm = "yes"
            
            if confirm.lower() != "yes":
                logger.info("❌ Operation cancelled")
                return
        
        # Create backup if requested
        if args.backup:
            if not db_reset.create_backup():
                logger.error("❌ Backup failed, aborting operation")
                return
        
        # Perform the requested action
        if args.action == "reset-all":
            reset_stats = db_reset.reset_all_collections()
            logger.info(f"📊 Reset statistics: {reset_stats}")
            
        elif args.action == "reset-collections":
            if not args.collections:
                logger.error("❌ --collections parameter is required for reset-collections")
                return
            reset_stats = db_reset.reset_specific_collections(args.collections)
            logger.info(f"📊 Reset statistics: {reset_stats}")
            
        elif args.action == "reset-user":
            if not args.username:
                logger.error("❌ --username parameter is required for reset-user")
                return
            reset_stats = db_reset.reset_user_data_only(args.username)
            logger.info(f"📊 Reset statistics: {reset_stats}")
        
        # Show final stats
        logger.info("📊 Final Database Statistics:")
        final_stats = db_reset.get_database_stats()
        for collection, count in final_stats["collections"].items():
            logger.info(f"  {collection}: {count} documents")
        
        logger.info("✅ Database reset operation completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Database reset failed: {e}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    main()
