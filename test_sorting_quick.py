#!/usr/bin/env python3
"""
Quick test to verify learning paths sorting
"""
import requests
import json

def test_sorting():
    """Test the learning paths sorting for a specific user"""
    
    # Test with the user who has the most recent paths
    username = "717821i136@kce.ac.in"
    
    print(f"🧪 Testing learning paths sorting for user: {username}")
    print("=" * 60)
    
    try:
        url = f"http://localhost:8000/learning-paths/list?username={username}"
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            paths = data.get("learning_paths", [])
            
            print(f"📊 Found {len(paths)} learning paths")
            print("\n🔄 Current order from API:")
            
            for i, path in enumerate(paths[:10]):  # Show first 10
                name = path.get("name", "Unknown")
                created_at = path.get("created_at", "No timestamp")
                path_id = path.get("id", "No ID")
                
                print(f"  {i+1:2d}. '{name[:50]}...' if len(name) > 50 else name")
                print(f"      Created: {created_at}")
                print(f"      ID: {path_id}")
                print()
            
            # Check if the sorting is correct (newest first)
            print("✅ Verification:")
            if len(paths) >= 2:
                first_date = paths[0].get("created_at")
                second_date = paths[1].get("created_at")
                
                if first_date and second_date:
                    from datetime import datetime
                    
                    try:
                        date1 = datetime.fromisoformat(first_date.replace('Z', '+00:00'))
                        date2 = datetime.fromisoformat(second_date.replace('Z', '+00:00'))
                        
                        if date1 >= date2:
                            print("   ✅ CORRECT: First path is newer than or equal to second path")
                        else:
                            print("   ❌ INCORRECT: First path is older than second path")
                            print(f"      First: {date1}")
                            print(f"      Second: {date2}")
                    except Exception as e:
                        print(f"   ⚠️  Could not compare dates: {e}")
                else:
                    print("   ⚠️  Missing timestamps for comparison")
            else:
                print("   ℹ️  Not enough paths to verify sorting")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_sorting()
