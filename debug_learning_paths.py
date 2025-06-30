#!/usr/bin/env python3
"""
Debug script to analyze learning path data and timestamps
"""
import json
import datetime
from database import chats_collection
from typing import List, Dict, Any

def analyze_learning_paths():
    """Analyze all learning paths in the database to understand timestamp issues"""
    print("Analyzing Learning Paths Database Structure")
    print("=" * 50)
    
    # Get all chat sessions with learning goals
    sessions = list(chats_collection.find({"learning_goals": {"$exists": True, "$ne": []}}))
    
    print(f"Found {len(sessions)} sessions with learning goals")
    
    for session in sessions:
        username = session.get("username", "Unknown")
        learning_goals = session.get("learning_goals", [])
        
        print(f"\nUser: {username}")
        print(f"   Learning Goals Count: {len(learning_goals)}")
        
        for i, goal in enumerate(learning_goals):
            print(f"\n   Goal {i+1}:")
            print(f"      Name: {goal.get('name', 'No name')}")
            print(f"      Created At: {goal.get('created_at', 'No timestamp')}")
            print(f"      Path ID: {goal.get('path_id', 'No path ID')}")
            
            # Analyze study plans within the goal
            study_plans = goal.get("study_plans", [])
            print(f"      Study Plans: {len(study_plans)}")
            
            for j, plan in enumerate(study_plans):
                print(f"        Plan {j+1}:")
                print(f"           ID: {plan.get('id', 'No ID')}")
                print(f"           Name: {plan.get('name', 'No name')}")
                print(f"           Created At: {plan.get('created_at', 'No timestamp')}")
                print(f"           Updated At: {plan.get('updated_at', 'No timestamp')}")
                print(f"           Topics Count: {len(plan.get('topics', []))}")

def test_sorting_logic():
    """Test the sorting logic with actual data"""
    print("\nTesting Sorting Logic")
    print("=" * 30)
    
    # Get test data
    username = input("Enter username to test (or press Enter for first available): ").strip()
    
    if not username:
        # Find first user with learning goals
        session = chats_collection.find_one({"learning_goals": {"$exists": True, "$ne": []}})
        if session:
            username = session.get("username", "")
        else:
            print("No users with learning goals found!")
            return
    
    print(f"Testing with user: {username}")
    
    # Get user's learning paths
    chat_session = chats_collection.find_one({"username": username})
    if not chat_session:
        print(f"No session found for user: {username}")
        return
    
    learning_goals = chat_session.get("learning_goals", [])
    learning_paths = []
    
    # Transform to learning paths format (same as in learning_paths.py)
    for goal in learning_goals:
        for plan in goal.get("study_plans", []):
            learning_path = {
                "id": plan.get("id", goal["name"]),
                "name": plan.get("name", goal["name"]),
                "description": plan.get("description", ""),
                "difficulty": plan.get("difficulty", "Intermediate"),
                "duration": plan.get("duration", goal.get("duration", "")),
                "progress": goal.get("progress", 0),
                "topics_count": len(plan.get("topics", [])),
                "created_at": goal.get("created_at"),
                "tags": plan.get("tags", [])
            }
            learning_paths.append(learning_path)
    
    print(f"\nFound {len(learning_paths)} learning paths:")
    
    # Show unsorted data
    print("\nUNSORTED PATHS:")
    for i, path in enumerate(learning_paths):
        created_at = path.get("created_at", "No timestamp")
        print(f"  {i+1}. '{path['name']}' - {created_at}")
    
    # Test the sorting function from learning_paths.py
    def get_sort_date(path):
        created_at = path.get("created_at", "")
        if not created_at:
            # If no created_at, try to use path ID timestamp or return epoch
            path_id = path.get("id", "")
            if path_id and "path_" in path_id:
                try:
                    timestamp = float(path_id.replace("path_", ""))
                    return datetime.datetime.fromtimestamp(timestamp)
                except (ValueError, TypeError):
                    pass
            return datetime.datetime.min
            
        try:
            # Handle various datetime formats
            if isinstance(created_at, str):
                # Remove Z suffix for fromisoformat compatibility
                if created_at.endswith('Z'):
                    date_str = created_at[:-1]
                else:
                    date_str = created_at
                
                # Try fromisoformat first
                try:
                    return datetime.datetime.fromisoformat(date_str)
                except ValueError:
                    # Try other common formats
                    try:
                        from dateutil import parser
                        return parser.parse(created_at)
                    except ImportError:
                        # dateutil not available, try basic parsing
                        return datetime.datetime.strptime(created_at.replace('Z', '+00:00'), '%Y-%m-%dT%H:%M:%S.%f%z').replace(tzinfo=None)
                        
            elif isinstance(created_at, datetime.datetime):
                return created_at
            else:
                return datetime.datetime.min
                
        except (ValueError, TypeError):
            # Fallback: try to extract timestamp from path ID
            path_id = path.get("id", "")
            if path_id and "path_" in path_id:
                try:
                    timestamp = float(path_id.replace("path_", ""))
                    return datetime.datetime.fromtimestamp(timestamp)
                except (ValueError, TypeError):
                    pass
            return datetime.datetime.min
    
    # Sort the paths
    try:
        learning_paths.sort(key=get_sort_date, reverse=True)
        print("\nSORTED PATHS (newest first):")
        for i, path in enumerate(learning_paths):
            created_date = get_sort_date(path)
            created_at_raw = path.get("created_at", "No timestamp")
            print(f"  {i+1}. '{path['name']}' - {created_date} (raw: {created_at_raw})")
    except Exception as e:
        print(f"\nSorting failed: {e}")

def check_timestamp_consistency():
    """Check for timestamp format consistency"""
    print("\nChecking Timestamp Format Consistency")
    print("=" * 40)
    
    sessions = list(chats_collection.find({"learning_goals": {"$exists": True, "$ne": []}}))
    
    timestamp_formats = set()
    timestamp_examples = []
    
    for session in sessions:
        learning_goals = session.get("learning_goals", [])
        
        for goal in learning_goals:
            created_at = goal.get("created_at")
            if created_at:
                timestamp_formats.add(type(created_at).__name__)
                timestamp_examples.append({
                    "user": session.get("username", "Unknown"),
                    "goal_name": goal.get("name", "Unknown"),
                    "timestamp": created_at,
                    "type": type(created_at).__name__
                })
            
            # Check study plans too
            for plan in goal.get("study_plans", []):
                plan_created = plan.get("created_at")
                if plan_created:
                    timestamp_formats.add(type(plan_created).__name__)
                    timestamp_examples.append({
                        "user": session.get("username", "Unknown"),
                        "plan_name": plan.get("name", "Unknown"),
                        "timestamp": plan_created,
                        "type": type(plan_created).__name__
                    })
    
    print(f"Timestamp formats found: {timestamp_formats}")
    print(f"Total timestamp examples: {len(timestamp_examples)}")
    
    print("\nSample timestamps:")
    for example in timestamp_examples[:10]:  # Show first 10
        print(f"  {example['user']} - {example['goal_name'] or example.get('plan_name', 'Unknown')}")
        print(f"    Type: {example['type']}")
        print(f"    Value: {example['timestamp']}")
        print()

def main():
    """Main function to run all diagnostics"""
    print("Learning Path Diagnostic Tool")
    print("================================")
    
    while True:
        print("\nChoose an option:")
        print("1. Analyze database structure")
        print("2. Test sorting logic")
        print("3. Check timestamp consistency")
        print("4. Run all diagnostics")
        print("5. Exit")
        
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == "1":
            analyze_learning_paths()
        elif choice == "2":
            test_sorting_logic()
        elif choice == "3":
            check_timestamp_consistency()
        elif choice == "4":
            analyze_learning_paths()
            test_sorting_logic()
            check_timestamp_consistency()
        elif choice == "5":
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
