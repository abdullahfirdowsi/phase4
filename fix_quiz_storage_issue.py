#!/usr/bin/env python3
"""
Fix Quiz Storage Issue

This script addresses the problem where:
1. AI Chat conversations are not showing in quiz page
2. Quizzes created in Quiz page show in AI Chat
3. Database storage inconsistencies between old and new schema

Root Causes:
1. Mixed usage of 'chats_collection' (old) and 'chat_messages_collection' (new)
2. Different message type fields ('type' vs 'message_type')
3. Inconsistent data structures between collections

Solution:
1. Migrate quiz messages from old to new schema
2. Update storage methods to use consistent schema
3. Fix quiz retrieval to look in correct collections
"""

import os
import sys
import logging
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get MongoDB connection"""
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise ValueError("MONGO_URI environment variable is required")
    
    database_name = os.getenv("DATABASE_NAME", "ai_tutor_db")
    client = MongoClient(mongo_uri)
    db = client[database_name]
    
    # Test connection
    try:
        client.admin.command('ping')
        logger.info(f"✅ Connected to MongoDB: {database_name}")
        return db
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        raise

def analyze_quiz_storage_issue(db):
    """Analyze current quiz storage patterns"""
    logger.info("🔍 Analyzing quiz storage issue...")
    
    # Check old chats collection
    chats_collection = db.chats
    chat_messages_collection = db.chat_messages
    quizzes_collection = db.quizzes
    
    # Analyze old chats collection
    old_chat_sessions = list(chats_collection.find())
    total_quiz_messages_old = 0
    users_with_quiz_messages = set()
    
    for session in old_chat_sessions:
        username = session.get("username")
        messages = session.get("messages", [])
        
        quiz_messages = [msg for msg in messages if msg.get("type") == "quiz"]
        if quiz_messages:
            total_quiz_messages_old += len(quiz_messages)
            users_with_quiz_messages.add(username)
            
            logger.info(f"📋 User {username}: {len(quiz_messages)} quiz messages in old schema")
    
    # Analyze new chat_messages collection
    new_quiz_messages = list(chat_messages_collection.find({"message_type": "quiz"}))
    users_with_new_quiz_messages = set(msg["username"] for msg in new_quiz_messages)
    
    # Analyze quizzes collection
    quiz_records = list(quizzes_collection.find())
    users_with_quiz_records = set(quiz["username"] for quiz in quiz_records)
    
    logger.info(f"""
📊 Quiz Storage Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Old chats collection:
   • Total sessions: {len(old_chat_sessions)}
   • Quiz messages: {total_quiz_messages_old}
   • Users with quiz messages: {len(users_with_quiz_messages)}
   
📦 New chat_messages collection:
   • Quiz messages: {len(new_quiz_messages)}
   • Users with quiz messages: {len(users_with_new_quiz_messages)}
   
📦 Quizzes collection:
   • Quiz records: {len(quiz_records)}
   • Users with quiz records: {len(users_with_quiz_records)}
   
🎯 Issue Analysis:
   • Users only in old schema: {users_with_quiz_messages - users_with_new_quiz_messages}
   • Users only in new schema: {users_with_new_quiz_messages - users_with_quiz_messages}
   • Users missing quiz records: {(users_with_quiz_messages | users_with_new_quiz_messages) - users_with_quiz_records}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
    
    return {
        "old_schema_users": users_with_quiz_messages,
        "new_schema_users": users_with_new_quiz_messages,
        "quiz_record_users": users_with_quiz_records,
        "old_quiz_count": total_quiz_messages_old,
        "new_quiz_count": len(new_quiz_messages),
        "quiz_records_count": len(quiz_records)
    }

def migrate_quiz_messages(db, dry_run=True):
    """Migrate quiz messages from old to new schema"""
    logger.info(f"🔄 {'DRY RUN: ' if dry_run else ''}Migrating quiz messages from old to new schema...")
    
    chats_collection = db.chats
    chat_messages_collection = db.chat_messages
    quizzes_collection = db.quizzes
    
    migrated_count = 0
    quiz_records_created = 0
    
    # Get all old chat sessions
    old_chat_sessions = list(chats_collection.find())
    
    for session in old_chat_sessions:
        username = session.get("username")
        messages = session.get("messages", [])
        
        for message in messages:
            # Only process quiz messages that haven't been migrated
            if message.get("type") == "quiz" and message.get("role") == "assistant":
                
                # Check if this message already exists in new schema
                existing_message = chat_messages_collection.find_one({
                    "username": username,
                    "content": message.get("content"),
                    "message_type": "quiz",
                    "timestamp": message.get("timestamp")
                })
                
                if existing_message:
                    logger.debug(f"🔍 Quiz message already exists in new schema for {username}")
                    continue
                
                # Create new message document
                new_message = {
                    "username": username,
                    "session_id": "migrated_session",  # Use special session ID for migrated messages
                    "role": message.get("role", "assistant"),
                    "content": message.get("content"),
                    "message_type": "quiz",  # Use new field name
                    "type": "quiz",  # Keep old field for compatibility
                    "metadata": {
                        "migrated_from": "chats_collection",
                        "migration_timestamp": datetime.utcnow()
                    },
                    "timestamp": message.get("timestamp", datetime.utcnow())
                }
                
                if not dry_run:
                    # Insert into new collection
                    result = chat_messages_collection.insert_one(new_message)
                    logger.info(f"✅ Migrated quiz message for {username}: {result.inserted_id}")
                    migrated_count += 1
                    
                    # Also create quiz record if it doesn't exist
                    content = message.get("content", {})
                    if isinstance(content, dict) and "quiz_data" in content:
                        quiz_data = content["quiz_data"]
                        quiz_id = quiz_data.get("quiz_id")
                        
                        if quiz_id:
                            existing_quiz = quizzes_collection.find_one({
                                "quiz_id": quiz_id,
                                "username": username
                            })
                            
                            if not existing_quiz:
                                quiz_record = {
                                    "quiz_id": quiz_id,
                                    "username": username,
                                    "quiz_json": content,
                                    "created_at": message.get("timestamp", datetime.utcnow()),
                                    "status": "active",
                                    "source": "migrated_from_chat"
                                }
                                
                                quizzes_collection.insert_one(quiz_record)
                                logger.info(f"✅ Created quiz record for {username}: {quiz_id}")
                                quiz_records_created += 1
                else:
                    logger.info(f"🔄 Would migrate quiz message for {username}")
                    migrated_count += 1
    
    logger.info(f"{'🔄 DRY RUN: ' if dry_run else '✅ '}Migration completed: {migrated_count} messages, {quiz_records_created} quiz records")
    return migrated_count, quiz_records_created

def fix_message_types(db, dry_run=True):
    """Fix message type inconsistencies"""
    logger.info(f"🔧 {'DRY RUN: ' if dry_run else ''}Fixing message type inconsistencies...")
    
    chat_messages_collection = db.chat_messages
    
    # Fix messages that have 'type' but not 'message_type'
    messages_to_fix = list(chat_messages_collection.find({
        "type": {"$exists": True},
        "message_type": {"$exists": False}
    }))
    
    fixed_count = 0
    
    for message in messages_to_fix:
        message_type = message.get("type")
        
        if not dry_run:
            chat_messages_collection.update_one(
                {"_id": message["_id"]},
                {"$set": {"message_type": message_type}}
            )
            logger.info(f"✅ Fixed message type for message {message['_id']}: {message_type}")
        else:
            logger.info(f"🔄 Would fix message type for message {message['_id']}: {message_type}")
        
        fixed_count += 1
    
    # Fix messages that have 'message_type' but not 'type' (for compatibility)
    messages_to_fix_reverse = list(chat_messages_collection.find({
        "message_type": {"$exists": True},
        "type": {"$exists": False}
    }))
    
    for message in messages_to_fix_reverse:
        message_type = message.get("message_type")
        
        if not dry_run:
            chat_messages_collection.update_one(
                {"_id": message["_id"]},
                {"$set": {"type": message_type}}
            )
            logger.info(f"✅ Added compatibility type field for message {message['_id']}: {message_type}")
        else:
            logger.info(f"🔄 Would add compatibility type field for message {message['_id']}: {message_type}")
        
        fixed_count += 1
    
    logger.info(f"{'🔄 DRY RUN: ' if dry_run else '✅ '}Fixed {fixed_count} message type inconsistencies")
    return fixed_count

def create_unified_endpoints_patch(db):
    """Create a patch file to unify quiz storage endpoints"""
    
    patch_content = '''# Unified Quiz Storage API Patch
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
        
        # ALSO store in OLD schema (chats collection) for backward compatibility
        chat_session = chats_collection.find_one({"username": username}) or {"username": username, "messages": []}
        
        # Add messages to old format
        chat_session["messages"] = chat_session.get("messages", [])
        chat_session["messages"].append(user_message)
        chat_session["messages"].append(quiz_message)
        
        # Update or create session
        chats_collection.update_one(
            {"username": username},
            {"$set": chat_session},
            upsert=True
        )
        
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
                
                logger.info(f"✅ Stored quiz record: {quiz_id}")
        
        logger.info(f"✅ Successfully stored quiz messages for {username} in both schemas")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error storing unified quiz message: {e}")
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
        
        # Get from OLD schema for missing messages
        old_session = chats_collection.find_one({"username": username})
        if old_session:
            old_messages = old_session.get("messages", [])
            for msg in reversed(old_messages):  # Most recent first
                if msg.get("type") == "quiz" and msg.get("role") == "assistant":
                    content = msg.get("content", {})
                    if isinstance(content, dict) and "quiz_data" in content:
                        quiz_id = content["quiz_data"].get("quiz_id")
                        if quiz_id and quiz_id not in seen_quiz_ids:
                            quiz_messages.append(msg)
                            seen_quiz_ids.add(quiz_id)
        
        logger.info(f"📋 Found {len(quiz_messages)} unique quiz messages for {username}")
        return quiz_messages
        
    except Exception as e:
        logger.error(f"❌ Error getting unified quiz messages: {e}")
        return []
'''
    
    with open("quiz_storage_patch.py", "w", encoding="utf-8") as f:
        f.write(patch_content)
    
    logger.info("📄 Created quiz_storage_patch.py - Apply this patch to unify quiz storage")

def main():
    """Main function to fix quiz storage issues"""
    try:
        logger.info("🚀 Starting Quiz Storage Issue Fix")
        logger.info("=" * 80)
        
        # Get database connection
        db = get_db_connection()
        
        # Step 1: Analyze the issue
        analysis = analyze_quiz_storage_issue(db)
        
        # Step 2: Ask user for confirmation
        print("\n" + "=" * 80)
        print("🛠️  QUIZ STORAGE FIX PLAN")
        print("=" * 80)
        print("This script will:")
        print("1. Migrate quiz messages from old schema to new schema")
        print("2. Fix message type inconsistencies")
        print("3. Create quiz records for missing quizzes")
        print("4. Generate a patch file for unified storage")
        print()
        
        response = input("Do you want to proceed? (y/N): ").strip().lower()
        if response != 'y':
            logger.info("🚫 Operation cancelled by user")
            return
        
        # Step 3: Perform dry run first
        logger.info("\n🔄 Performing dry run...")
        migrate_count, quiz_records = migrate_quiz_messages(db, dry_run=True)
        type_fixes = fix_message_types(db, dry_run=True)
        
        print(f"\n📊 Dry Run Results:")
        print(f"   • Messages to migrate: {migrate_count}")
        print(f"   • Quiz records to create: {quiz_records}")
        print(f"   • Type inconsistencies to fix: {type_fixes}")
        
        # Confirm actual execution
        response = input("\nProceed with actual migration? (y/N): ").strip().lower()
        if response != 'y':
            logger.info("🚫 Migration cancelled by user")
            return
        
        # Step 4: Perform actual migration
        logger.info("\n✅ Performing actual migration...")
        migrate_count, quiz_records = migrate_quiz_messages(db, dry_run=False)
        type_fixes = fix_message_types(db, dry_run=False)
        
        # Step 5: Create patch file
        create_unified_endpoints_patch(db)
        
        # Step 6: Final analysis
        logger.info("\n🔍 Final analysis...")
        final_analysis = analyze_quiz_storage_issue(db)
        
        # Summary
        logger.info(f"""
🎉 Quiz Storage Fix Completed Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Results:
   • Messages migrated: {migrate_count}
   • Quiz records created: {quiz_records}
   • Type inconsistencies fixed: {type_fixes}
   
📊 Final State:
   • New schema quiz messages: {final_analysis['new_quiz_count']}
   • Quiz records: {final_analysis['quiz_records_count']}
   
📋 Next Steps:
   1. Apply the patch in 'quiz_storage_patch.py' to your codebase
   2. Update frontend to use unified quiz retrieval
   3. Test quiz creation and retrieval in both AI Chat and Quiz pages
   4. Consider removing old schema after testing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
        
    except Exception as e:
        logger.error(f"❌ Error during quiz storage fix: {e}")
        raise

if __name__ == "__main__":
    main()
