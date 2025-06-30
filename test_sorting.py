#!/usr/bin/env python3
"""
Simple test script to validate learning path sorting
"""
import datetime
from database import chats_collection

def test_user_sorting(username="717821i136@kce.ac.in"):
    """Test sorting for a specific user"""
    print(f"Testing sorting for user: {username}")
    print("=" * 50)
    
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
                "created_at": goal.get("created_at"),  # This is the key fix!
                "tags": plan.get("tags", [])
            }
            learning_paths.append(learning_path)
    
    print(f"Found {len(learning_paths)} learning paths:")
    
    # Show unsorted data
    print("\nUNSORTED PATHS:")
    for i, path in enumerate(learning_paths):
        created_at = path.get("created_at", "No timestamp")
        path_id = path.get("id", "No ID")
        print(f"  {i+1}. '{path['name']}' - {created_at} (ID: {path_id})")
    
    # Test the improved sorting function
    def get_sort_date(path):
        # First priority: created_at from the path itself (from learning goal)
        created_at = path.get("created_at", "")
        
        # Second priority: extract timestamp from path ID if available
        if not created_at:
            path_id = path.get("id", "")
            if path_id and "path_" in path_id:
                try:
                    timestamp = float(path_id.replace("path_", ""))
                    return datetime.datetime.fromtimestamp(timestamp)
                except (ValueError, TypeError):
                    pass
            # If no valid timestamp found, return epoch for consistent sorting
            return datetime.datetime.min
            
        # Parse the created_at timestamp
        try:
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
                        # Fallback to basic strptime for ISO format
                        if 'T' in created_at and created_at.endswith('Z'):
                            return datetime.datetime.strptime(created_at, '%Y-%m-%dT%H:%M:%S.%fZ')
                        return datetime.datetime.min
                    
            elif isinstance(created_at, datetime.datetime):
                return created_at
            else:
                return datetime.datetime.min
                
        except (ValueError, TypeError):
            # Final fallback: try to extract timestamp from path ID
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
            path_id = path.get("id", "No ID")
            print(f"  {i+1}. '{path['name']}'")
            print(f"      Parsed date: {created_date}")
            print(f"      Raw timestamp: {created_at_raw}")
            print(f"      Path ID: {path_id}")
            print()
    except Exception as e:
        print(f"\nSorting failed: {e}")

if __name__ == "__main__":
    test_user_sorting()
