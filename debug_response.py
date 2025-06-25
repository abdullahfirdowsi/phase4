#!/usr/bin/env python3
"""
Debug script to check learning path response structure
"""
import json
import sys
import os

# Add the current directory to the path to import modules
sys.path.append(os.path.dirname(__file__))

from learning_path import process_learning_path_query
from utils import extract_json

# Mock store_chat_history function
def mock_store_chat_history(username, message):
    print(f"📝 Storing message for {username}: {message.get('type', 'unknown')}")

# Mock generate_response function
def mock_generate_response(prompt):
    return '{"course_duration": "4 weeks", "name": "React Basics", "topics": [{"name": "Introduction", "description": "Learn React basics", "time_required": "2 hours", "links": [], "videos": [], "subtopics": []}]}'

# Test the learning path processing
result = process_learning_path_query(
    'Create a React learning path',
    'test_user',
    mock_generate_response,
    extract_json,
    mock_store_chat_history,
    'Please fix the JSON format',
    'Generate a learning path in JSON format: {user_prompt}'
)

print('🔍 Result type:', type(result))
print('🔍 Result keys:', result.keys() if isinstance(result, dict) else 'Not a dict')
print('🔍 Result content type:', type(result.get('content')) if isinstance(result, dict) else 'N/A')
print('🔍 Result structure:')
print(json.dumps(result, indent=2) if isinstance(result, dict) else result)

# Check what the content actually contains
if isinstance(result, dict) and 'content' in result:
    content = result['content']
    print('\n🔍 Content details:')
    print('Content type:', type(content))
    print('Content keys:', content.keys() if isinstance(content, dict) else 'Not a dict')
    print('Has topics?:', 'topics' in content if isinstance(content, dict) else False)
