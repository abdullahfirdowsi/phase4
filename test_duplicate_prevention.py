#!/usr/bin/env python3
"""
Test script to verify duplicate prevention functionality
"""
from database import chats_collection

def test_duplicate_check(username="717821i136@kce.ac.in", test_path_name="React Native for Beginners"):
    """Test if duplicate checking logic works"""
    print(f"Testing duplicate check for user: {username}")
    print(f"Testing with path name: {test_path_name}")
    print("=" * 60)
    
    # Get user's learning paths
    chat_session = chats_collection.find_one({"username": username})
    if not chat_session:
        print(f"No session found for user: {username}")
        return
    
    learning_goals = chat_session.get("learning_goals", [])
    existing_paths = []
    
    # Extract all existing path names
    for goal in learning_goals:
        for plan in goal.get("study_plans", []):
            path_name = plan.get("name", goal["name"])
            existing_paths.append(path_name)
    
    print(f"Found {len(existing_paths)} existing paths:")
    for i, path_name in enumerate(existing_paths):
        print(f"  {i+1}. {path_name}")
    
    # Test duplicate checking logic
    print(f"\nTesting if '{test_path_name}' already exists...")
    
    # Case-insensitive comparison (same as frontend)
    is_duplicate = any(
        existing.lower() == test_path_name.lower() 
        for existing in existing_paths
    )
    
    print(f"Result: {'DUPLICATE FOUND' if is_duplicate else 'NOT A DUPLICATE'}")
    
    if is_duplicate:
        print(f"✅ Duplicate prevention working - '{test_path_name}' already exists")
    else:
        print(f"ℹ️  '{test_path_name}' can be saved (not a duplicate)")
    
    # Test with exact matches
    print(f"\nExact matches for '{test_path_name}':")
    exact_matches = [path for path in existing_paths if path.lower() == test_path_name.lower()]
    for match in exact_matches:
        print(f"  - {match}")

if __name__ == "__main__":
    test_duplicate_check()
