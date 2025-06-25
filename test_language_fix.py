#!/usr/bin/env python3
"""
Test script to verify the language preference fix
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import users_collection
from datetime import datetime

def update_user_language(username, language="English"):
    """Update user's language preference"""
    try:
        # Find user
        user = users_collection.find_one({"username": username})
        if not user:
            print(f"❌ User not found: {username}")
            return False
            
        # Update preferences
        result = users_collection.update_one(
            {"username": username},
            {
                "$set": {
                    "preferences.language": language,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            print(f"✅ Updated {username}'s language preference to: {language}")
            return True
        else:
            print(f"⚠️ No changes made for user: {username}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating user preferences: {e}")
        return False

def get_user_language(username):
    """Get user's current language preference"""
    try:
        user = users_collection.find_one({"username": username})
        if not user:
            print(f"❌ User not found: {username}")
            return None
            
        language = user.get("preferences", {}).get("language", "English")
        print(f"📋 User {username} language preference: {language}")
        return language
        
    except Exception as e:
        print(f"❌ Error getting user preferences: {e}")
        return None

def main():
    print("🔧 Testing Language Preference Fix\n")
    
    # Test with the user from the logs
    test_username = "717821I102@kce.ac.in"
    
    print("1. Getting current language preference...")
    current_lang = get_user_language(test_username)
    
    print("\n2. Setting language to English...")
    success = update_user_language(test_username, "English")
    
    if success:
        print("\n3. Verifying updated preference...")
        new_lang = get_user_language(test_username)
        
        print(f"\n✅ Language preference update complete!")
        print(f"   Previous: {current_lang}")
        print(f"   Current:  {new_lang}")
        print(f"\n🎯 Next: Test chat with this user to see English responses")
    else:
        print("\n❌ Failed to update language preference")

if __name__ == "__main__":
    main()
