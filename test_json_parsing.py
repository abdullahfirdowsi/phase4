#!/usr/bin/env python3
"""
Test script to verify JSON parsing fixes
"""
import json
from utils import extract_json
from learning_path import process_learning_path_query

def test_extract_json():
    """Test the extract_json function with various inputs"""
    print("🧪 Testing extract_json function...")
    
    # Test 1: Valid JSON string
    test1 = '{"name": "Python Basics", "topics": [{"name": "Variables", "description": "Learn about variables"}]}'
    result1 = extract_json(test1)
    print(f"✅ Test 1 - Valid JSON: {result1 is not None}")
    
    # Test 2: JSON in markdown code block
    test2 = '''```json
    {
        "name": "Python Basics",
        "topics": [
            {
                "name": "Variables",
                "description": "Learn about variables"
            }
        ]
    }
    ```'''
    result2 = extract_json(test2)
    print(f"✅ Test 2 - JSON in code block: {result2 is not None}")
    
    # Test 3: Empty string
    test3 = ""
    result3 = extract_json(test3)
    print(f"✅ Test 3 - Empty string: {result3 is None}")
    
    # Test 4: Malformed JSON
    test4 = '{"name": "Python Basics", "topics": [}'
    result4 = extract_json(test4)
    print(f"✅ Test 4 - Malformed JSON: {result4 is None}")
    
    print("🎉 extract_json tests completed!")

def mock_generate_response(prompt):
    """Mock generate_response function for testing"""
    if "empty" in prompt.lower():
        return ""
    elif "malformed" in prompt.lower():
        return '{"name": "Test", "topics": ['
    else:
        return '''{
            "course_duration": "4 weeks",
            "name": "Python Programming Basics",
            "links": [
                "https://docs.python.org/3/tutorial/",
                "https://realpython.com/python-first-steps/"
            ],
            "topics": [
                {
                    "name": "Variables and Data Types",
                    "description": "Learn about Python variables and basic data types",
                    "time_required": "2 hours",
                    "links": [
                        "https://realpython.com/python-variables/"
                    ],
                    "videos": [
                        "https://www.youtube.com/watch?v=example1"
                    ],
                    "subtopics": [
                        {
                            "name": "Integer and Float",
                            "description": "Numeric data types in Python"
                        },
                        {
                            "name": "Strings",
                            "description": "Text data type in Python"
                        }
                    ]
                }
            ]
        }'''

def mock_store_chat_history(username, message):
    """Mock store_chat_history function for testing"""
    print(f"📝 Storing message for {username}: {message.get('type', 'unknown')}")

def test_learning_path_processing():
    """Test the learning path processing function"""
    print("🧪 Testing learning path processing...")
    
    # Test 1: Normal processing
    result1 = process_learning_path_query(
        "Create a Python learning path",
        "test_user",
        mock_generate_response,
        extract_json,
        mock_store_chat_history,
        "Please fix the JSON format",
        "Generate a learning path in JSON format: {user_prompt}"
    )
    print(f"✅ Test 1 - Normal processing: {result1.get('response') == 'JSON'}")
    
    # Test 2: Empty response handling
    result2 = process_learning_path_query(
        "Create an empty learning path",
        "test_user",
        mock_generate_response,
        extract_json,
        mock_store_chat_history,
        "Please fix the JSON format",
        "Generate a learning path in JSON format: {user_prompt}"
    )
    print(f"✅ Test 2 - Empty response handling: {result2.get('response') == 'ERROR'}")
    
    print("🎉 Learning path processing tests completed!")

if __name__ == "__main__":
    print("🚀 Starting JSON parsing tests...\n")
    test_extract_json()
    print()
    test_learning_path_processing()
    print("\n✅ All tests completed!")
