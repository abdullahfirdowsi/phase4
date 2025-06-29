"""
Complete Database Reset Script
Resets all collections and optionally recreates the database schema
"""
import os
import sys
import asyncio
from datetime import datetime
from database_config import DatabaseConfig, initialize_database, get_collections
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseReset:
    def __init__(self):
        self.db_config = DatabaseConfig()
        self.db = None
        
    def connect(self):
        """Connect to the database"""
        try:
            self.db = self.db_config.connect_sync()
            logger.info("✅ Connected to MongoDB successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            return False
    
    def backup_database(self, backup_name=None):
        """Create a backup before reset (optional)"""
        try:
            if not backup_name:
                backup_name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            logger.info(f"📦 Creating backup: {backup_name}")
            
            # Get all collection names
            collection_names = self.db.list_collection_names()
            backup_data = {}
            
            for collection_name in collection_names:
                collection = self.db[collection_name]
                documents = list(collection.find({}))
                backup_data[collection_name] = {
                    'count': len(documents),
                    'sample': documents[:5] if documents else []  # Store first 5 docs as sample
                }
                logger.info(f"  📊 {collection_name}: {len(documents)} documents")
            
            # Save backup info to a backup collection
            backup_collection = self.db[f"_backup_{backup_name}"]
            backup_collection.insert_one({
                'backup_name': backup_name,
                'created_at': datetime.utcnow(),
                'collections_info': backup_data,
                'total_collections': len(collection_names)
            })
            
            logger.info(f"✅ Backup created successfully: {backup_name}")
            return backup_name
            
        except Exception as e:
            logger.error(f"❌ Backup failed: {e}")
            return None
    
    def list_collections_with_counts(self):
        """List all collections and their document counts"""
        try:
            logger.info("📊 Current database status:")
            collection_names = self.db.list_collection_names()
            
            if not collection_names:
                logger.info("  🗂️ No collections found")
                return {}
            
            collection_stats = {}
            total_documents = 0
            
            for name in collection_names:
                if name.startswith('_backup_'):
                    continue  # Skip backup collections
                    
                collection = self.db[name]
                count = collection.count_documents({})
                collection_stats[name] = count
                total_documents += count
                logger.info(f"  📁 {name}: {count} documents")
            
            logger.info(f"  📈 Total: {total_documents} documents across {len(collection_stats)} collections")
            return collection_stats
            
        except Exception as e:
            logger.error(f"❌ Error listing collections: {e}")
            return {}
    
    def drop_all_collections(self, exclude_backups=True):
        """Drop all collections except backups"""
        try:
            collection_names = self.db.list_collection_names()
            dropped_count = 0
            
            for name in collection_names:
                if exclude_backups and name.startswith('_backup_'):
                    logger.info(f"  🔒 Preserving backup collection: {name}")
                    continue
                
                self.db[name].drop()
                logger.info(f"  🗑️ Dropped collection: {name}")
                dropped_count += 1
            
            logger.info(f"✅ Successfully dropped {dropped_count} collections")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error dropping collections: {e}")
            return False
    
    def reset_specific_collections(self, collections_to_reset):
        """Reset only specific collections"""
        try:
            reset_count = 0
            
            for collection_name in collections_to_reset:
                if collection_name in self.db.list_collection_names():
                    result = self.db[collection_name].delete_many({})
                    logger.info(f"  🧹 Cleared {collection_name}: {result.deleted_count} documents deleted")
                    reset_count += 1
                else:
                    logger.warning(f"  ⚠️ Collection not found: {collection_name}")
            
            logger.info(f"✅ Successfully reset {reset_count} collections")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error resetting collections: {e}")
            return False
    
    def recreate_schema(self):
        """Recreate database schema with collections and indexes"""
        try:
            logger.info("🏗️ Recreating database schema...")
            initialize_database()
            logger.info("✅ Database schema recreated successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error recreating schema: {e}")
            return False
    
    def create_default_admin(self):
        """Create default admin user"""
        try:
            collections = get_collections()
            admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com")
            
            # Check if admin already exists
            existing_admin = collections['users'].find_one({"email": admin_email})
            if existing_admin:
                logger.info(f"👤 Admin user already exists: {admin_email}")
                return True
            
            admin_user = {
                "username": admin_email,
                "email": admin_email,
                "password_hash": "admin_hash_please_change",  # Should be changed on first login
                "is_admin": True,
                "preferences": {
                    "language": "en",
                    "user_role": "admin",
                    "age_group": "25+",
                    "time_value": 60
                },
                "profile": {
                    "bio": "Default administrator account",
                    "avatar_url": None,
                    "skill_level": "expert"
                },
                "stats": {
                    "total_goals": 0,
                    "completed_goals": 0,
                    "average_score": 0,
                    "total_study_time": 0,
                    "streak_days": 0
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": None
            }
            
            collections['users'].insert_one(admin_user)
            logger.info(f"✅ Created default admin user: {admin_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error creating default admin: {e}")
            return False

def get_user_confirmation(message):
    """Get user confirmation for destructive operations"""
    response = input(f"{message} (y/N): ").strip().lower()
    return response in ['y', 'yes']

def main():
    """Main reset function with interactive options"""
    print("=" * 60)
    print("🔄 DATABASE RESET UTILITY")
    print("=" * 60)
    
    # Initialize reset utility
    reset_util = DatabaseReset()
    
    # Connect to database
    if not reset_util.connect():
        print("❌ Cannot proceed without database connection")
        sys.exit(1)
    
    # Show current status
    print("\n📊 CURRENT DATABASE STATUS:")
    collection_stats = reset_util.list_collections_with_counts()
    
    if not collection_stats:
        print("🗂️ Database is already empty")
        if get_user_confirmation("Would you like to initialize the schema?"):
            reset_util.recreate_schema()
            reset_util.create_default_admin()
        sys.exit(0)
    
    # Reset options
    print("\n🛠️ RESET OPTIONS:")
    print("1. Complete reset (drop all collections + recreate schema)")
    print("2. Clear data only (keep collections structure)")
    print("3. Reset specific collections")
    print("4. Create backup only")
    print("5. Cancel")
    
    while True:
        try:
            choice = input("\nSelect option (1-5): ").strip()
            
            if choice == "1":
                # Complete reset
                print("\n⚠️ COMPLETE DATABASE RESET")
                print("This will:")
                print("- Create a backup of current data")
                print("- Drop all collections")
                print("- Recreate database schema")
                print("- Create default admin user")
                
                if not get_user_confirmation("Are you sure you want to proceed?"):
                    print("❌ Operation cancelled")
                    break
                
                # Create backup
                backup_name = reset_util.backup_database()
                if backup_name:
                    print(f"✅ Backup created: {backup_name}")
                
                # Drop collections
                if reset_util.drop_all_collections():
                    print("✅ All collections dropped")
                
                # Recreate schema
                if reset_util.recreate_schema():
                    print("✅ Schema recreated")
                
                # Create admin
                if reset_util.create_default_admin():
                    print("✅ Default admin created")
                
                print("\n🎉 Complete database reset finished!")
                break
                
            elif choice == "2":
                # Clear data only
                print("\n🧹 CLEAR DATA ONLY")
                print("This will clear all documents but keep collection structure")
                
                if not get_user_confirmation("Are you sure you want to clear all data?"):
                    print("❌ Operation cancelled")
                    break
                
                # Create backup
                backup_name = reset_util.backup_database()
                if backup_name:
                    print(f"✅ Backup created: {backup_name}")
                
                collections_to_clear = list(collection_stats.keys())
                if reset_util.reset_specific_collections(collections_to_clear):
                    print("✅ All data cleared")
                
                # Create admin
                if reset_util.create_default_admin():
                    print("✅ Default admin created")
                
                print("\n🎉 Data clearing finished!")
                break
                
            elif choice == "3":
                # Reset specific collections
                print("\n🎯 RESET SPECIFIC COLLECTIONS")
                print("Available collections:")
                for i, name in enumerate(collection_stats.keys(), 1):
                    print(f"  {i}. {name} ({collection_stats[name]} documents)")
                
                selected_indices = input("\nEnter collection numbers (comma-separated): ").strip()
                try:
                    indices = [int(x.strip()) - 1 for x in selected_indices.split(',')]
                    collection_names = list(collection_stats.keys())
                    collections_to_reset = [collection_names[i] for i in indices if 0 <= i < len(collection_names)]
                    
                    if not collections_to_reset:
                        print("❌ No valid collections selected")
                        continue
                    
                    print(f"\nSelected collections: {', '.join(collections_to_reset)}")
                    
                    if not get_user_confirmation("Are you sure you want to reset these collections?"):
                        print("❌ Operation cancelled")
                        break
                    
                    # Create backup
                    backup_name = reset_util.backup_database()
                    if backup_name:
                        print(f"✅ Backup created: {backup_name}")
                    
                    if reset_util.reset_specific_collections(collections_to_reset):
                        print("✅ Selected collections reset")
                    
                    print("\n🎉 Specific reset finished!")
                    break
                    
                except ValueError:
                    print("❌ Invalid input. Please enter numbers separated by commas.")
                    continue
                
            elif choice == "4":
                # Backup only
                print("\n📦 CREATE BACKUP ONLY")
                backup_name = reset_util.backup_database()
                if backup_name:
                    print(f"✅ Backup created successfully: {backup_name}")
                else:
                    print("❌ Backup failed")
                break
                
            elif choice == "5":
                print("❌ Operation cancelled")
                break
                
            else:
                print("❌ Invalid choice. Please select 1-5.")
                continue
                
        except KeyboardInterrupt:
            print("\n❌ Operation cancelled by user")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            break
    
    print("\n👋 Database reset utility finished")

if __name__ == "__main__":
    main()
