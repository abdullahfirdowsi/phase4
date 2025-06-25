"""
Migration Script - Migrate data from old chats collection to new schema
"""
import asyncio
from datetime import datetime
from database_config import get_collections, initialize_database
from services.user_service import user_service
from services.chat_service import chat_service
from services.learning_service import learning_service
import logging
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataMigration:
    def __init__(self):
        self.collections = get_collections()
        self.old_chats_collection = self.collections.get('chats')  # Old collection
        
    async def migrate_all_data(self):
        """Main migration function"""
        try:
            logger.info("🚀 Starting data migration...")
            
            # Initialize new database structure
            initialize_database()
            
            # Get all documents from old chats collection
            if not self.old_chats_collection:
                logger.warning("⚠️ Old chats collection not found. Creating sample data...")
                await self.create_sample_data()
                return
            
            old_documents = list(self.old_chats_collection.find({}))
            logger.info(f"📊 Found {len(old_documents)} documents to migrate")
            
            migrated_users = set()
            
            for doc in old_documents:
                username = doc.get("username")
                if not username:
                    continue
                
                # Migrate user data (once per user)
                if username not in migrated_users:
                    await self.migrate_user_data(doc)
                    migrated_users.add(username)
                
                # Migrate chat messages
                await self.migrate_chat_messages(doc)
                
                # Migrate learning goals
                await self.migrate_learning_goals(doc)
                
                # Migrate quiz data
                await self.migrate_quiz_data(doc)
                
                # Migrate lesson enrollments
                await self.migrate_lesson_enrollments(doc)
            
            logger.info("✅ Data migration completed successfully!")
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            raise
    
    async def migrate_user_data(self, doc):
        """Migrate user data from old format"""
        try:
            username = doc.get("username")
            
            # Check if user already exists in new format
            existing_user = await user_service.get_user_by_username(username)
            if existing_user:
                logger.info(f"👤 User {username} already exists, skipping...")
                return
            
            # Extract user preferences and stats from old document
            preferences = doc.get("preferences", {})
            stats = doc.get("stats", {})
            
            # Create user document in new format
            user_doc = {
                "username": username,
                "email": username,  # Assuming username is email
                "password_hash": "migrated_user",  # Placeholder
                "is_admin": username.lower() == "blackboxgenai@gmail.com",
                "preferences": {
                    "language": preferences.get("language", "en"),
                    "user_role": preferences.get("userRole", "student").lower(),
                    "age_group": preferences.get("ageGroup", "10-12"),
                    "time_value": preferences.get("timeValue", 30)
                },
                "profile": {
                    "bio": None,
                    "avatar_url": None,
                    "skill_level": "beginner"
                },
                "stats": {
                    "total_goals": stats.get("totalGoals", 0),
                    "completed_goals": stats.get("completedGoals", 0),
                    "average_score": stats.get("averageScore", 0),
                    "total_study_time": stats.get("totalStudyTime", 0),
                    "streak_days": stats.get("streakDays", 0)
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": None
            }
            
            self.collections['users'].insert_one(user_doc)
            logger.info(f"✅ Migrated user: {username}")
            
        except Exception as e:
            logger.error(f"❌ Error migrating user {username}: {e}")
    
    async def migrate_chat_messages(self, doc):
        """Migrate chat messages from old format"""
        try:
            username = doc.get("username")
            messages = doc.get("messages", [])
            
            if not messages:
                return
            
            session_id = str(uuid.uuid4())
            
            for message in messages:
                message_doc = {
                    "username": username,
                    "session_id": session_id,
                    "role": message.get("role", "user"),
                    "content": message.get("content", ""),
                    "message_type": message.get("type", "content"),
                    "metadata": {
                        "migrated": True,
                        "original_timestamp": message.get("timestamp")
                    },
                    "timestamp": datetime.fromisoformat(
                        message.get("timestamp", datetime.utcnow().isoformat()).replace("Z", "")
                    ) if message.get("timestamp") else datetime.utcnow()
                }
                
                self.collections['chat_messages'].insert_one(message_doc)
            
            logger.info(f"✅ Migrated {len(messages)} messages for {username}")
            
        except Exception as e:
            logger.error(f"❌ Error migrating chat messages for {username}: {e}")
    
    async def migrate_learning_goals(self, doc):
        """Migrate learning goals from old format"""
        try:
            username = doc.get("username")
            learning_goals = doc.get("learning_goals", [])
            
            for goal in learning_goals:
                goal_id = str(uuid.uuid4())
                
                goal_doc = {
                    "goal_id": goal_id,
                    "username": username,
                    "name": goal.get("name", "Untitled Goal"),
                    "description": goal.get("description", ""),
                    "difficulty": "intermediate",  # Default
                    "duration": goal.get("duration", ""),
                    "progress": goal.get("progress", 0),
                    "status": "completed" if goal.get("progress", 0) >= 100 else "active",
                    "prerequisites": [],
                    "tags": [],
                    "study_plans": goal.get("study_plans", []),
                    "created_at": datetime.fromisoformat(
                        goal.get("created_at", datetime.utcnow().isoformat()).replace("Z", "")
                    ) if goal.get("created_at") else datetime.utcnow(),
                    "target_completion_date": None
                }
                
                self.collections['learning_goals'].insert_one(goal_doc)
                
                # Create enrollment record
                enrollment_doc = {
                    "enrollment_id": str(uuid.uuid4()),
                    "username": username,
                    "content_type": "learning_goal",
                    "content_id": goal_id,
                    "progress": goal.get("progress", 0),
                    "status": "completed" if goal.get("progress", 0) >= 100 else "in_progress",
                    "time_spent": 0,
                    "enrolled_at": datetime.utcnow(),
                    "last_accessed": datetime.utcnow()
                }
                
                self.collections['user_enrollments'].insert_one(enrollment_doc)
            
            logger.info(f"✅ Migrated {len(learning_goals)} learning goals for {username}")
            
        except Exception as e:
            logger.error(f"❌ Error migrating learning goals for {username}: {e}")
    
    async def migrate_quiz_data(self, doc):
        """Migrate quiz data from old format"""
        try:
            username = doc.get("username")
            quizzes = doc.get("quizzes", [])
            quiz_results = doc.get("quiz_results", [])
            
            # Migrate quiz templates
            for quiz in quizzes:
                quiz_id = quiz.get("id", str(uuid.uuid4()))
                
                quiz_doc = {
                    "quiz_id": quiz_id,
                    "title": quiz.get("title", "Untitled Quiz"),
                    "description": quiz.get("description", ""),
                    "subject": quiz.get("subject", "General"),
                    "difficulty": quiz.get("difficulty", "medium"),
                    "time_limit": quiz.get("time_limit", 10),
                    "is_public": False,  # User-created quizzes are private by default
                    "created_by": username,
                    "questions": quiz.get("questions", []),
                    "tags": quiz.get("tags", []),
                    "created_at": datetime.utcnow()
                }
                
                self.collections['quizzes'].insert_one(quiz_doc)
            
            # Migrate quiz attempts/results
            for result in quiz_results:
                attempt_doc = {
                    "attempt_id": result.get("id", str(uuid.uuid4())),
                    "quiz_id": result.get("quiz_id", ""),
                    "username": username,
                    "answers": result.get("answers", {}),
                    "score": result.get("score_percentage", 0),
                    "total_questions": result.get("total_questions", 0),
                    "correct_answers": result.get("correct_answers", 0),
                    "time_taken": result.get("time_taken", 0),
                    "completed": True,
                    "completed_at": datetime.fromisoformat(
                        result.get("submitted_at", datetime.utcnow().isoformat()).replace("Z", "")
                    ) if result.get("submitted_at") else datetime.utcnow()
                }
                
                self.collections['quiz_attempts'].insert_one(attempt_doc)
            
            logger.info(f"✅ Migrated {len(quizzes)} quizzes and {len(quiz_results)} results for {username}")
            
        except Exception as e:
            logger.error(f"❌ Error migrating quiz data for {username}: {e}")
    
    async def migrate_lesson_enrollments(self, doc):
        """Migrate lesson enrollment data from old format"""
        try:
            username = doc.get("username")
            lesson_enrollments = doc.get("lesson_enrollments", [])
            
            for enrollment in lesson_enrollments:
                enrollment_doc = {
                    "enrollment_id": str(uuid.uuid4()),
                    "username": username,
                    "content_type": "lesson",
                    "content_id": enrollment.get("lesson_id", ""),
                    "progress": enrollment.get("progress", 0),
                    "status": "completed" if enrollment.get("completed", False) else "in_progress",
                    "time_spent": 0,  # Not available in old format
                    "enrolled_at": datetime.fromisoformat(
                        enrollment.get("enrolled_at", datetime.utcnow().isoformat()).replace("Z", "")
                    ) if enrollment.get("enrolled_at") else datetime.utcnow(),
                    "last_accessed": datetime.fromisoformat(
                        enrollment.get("updated_at", datetime.utcnow().isoformat()).replace("Z", "")
                    ) if enrollment.get("updated_at") else datetime.utcnow()
                }
                
                self.collections['user_enrollments'].insert_one(enrollment_doc)
            
            logger.info(f"✅ Migrated {len(lesson_enrollments)} lesson enrollments for {username}")
            
        except Exception as e:
            logger.error(f"❌ Error migrating lesson enrollments for {username}: {e}")
    
    async def create_sample_data(self):
        """Create sample data for testing"""
        try:
            logger.info("📝 Creating sample data...")
            
            # Sample user
            sample_user = {
                "username": "sample@example.com",
                "email": "sample@example.com",
                "password_hash": "sample_hash",
                "is_admin": False,
                "preferences": {
                    "language": "en",
                    "user_role": "student",
                    "age_group": "18-25",
                    "time_value": 30
                },
                "profile": {
                    "bio": "Sample user for testing",
                    "avatar_url": None,
                    "skill_level": "beginner"
                },
                "stats": {
                    "total_goals": 2,
                    "completed_goals": 1,
                    "average_score": 85.0,
                    "total_study_time": 120,
                    "streak_days": 5
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": datetime.utcnow()
            }
            
            self.collections['users'].insert_one(sample_user)
            logger.info("✅ Sample data created successfully")
            
        except Exception as e:
            logger.error(f"❌ Error creating sample data: {e}")

async def run_migration():
    """Run the migration process"""
    migration = DataMigration()
    await migration.migrate_all_data()

if __name__ == "__main__":
    asyncio.run(run_migration())