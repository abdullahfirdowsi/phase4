#!/usr/bin/env python3
"""
Test script to verify JSON parsing fixes
"""
import json
import sys
import os

# Add the current directory to the path to import modules
sys.path.append(os.path.dirname(__file__))

from utils import extract_json

def test_json_parsing_scenarios():
    """Test various JSON parsing scenarios that were causing errors"""
    print("🧪 Testing JSON parsing fixes...\n")
    
    # Test 1: JSON with extra text after (first error scenario)
    test1 = """{
    "course_duration": "4 weeks",
    "name": "Photosynthesis: Understanding How Plants Make Food",
    "links": [
        "https://www.khanacademy.org/science/biology/photosynthesis-in-plants",
        "https://www.sciencelearn.org.nz/resources/178-photosynthesis"
    ],
    "topics": [
        {
            "name": "Introduction to Photosynthesis",
            "description": "Learn what photosynthesis is and why it's important for plants and all living things.",
            "time_required": "2 hours",
            "links": ["https://example.com"],
            "videos": ["https://youtube.com/watch?v=example"],
            "subtopics": [
                {
                    "name": "Basic Concepts",
                    "description": "Fundamental photosynthesis concepts"
                }
            ]
        }
    ]
}
Some extra text after the JSON that caused the "Extra data" error."""

    result1 = extract_json(test1)
    print(f"✅ Test 1 - JSON with extra text: {'PASS' if result1 and 'topics' in result1 else 'FAIL'}")
    
    # Test 2: JSON without 'topics' field (second error scenario)
    test2 = '{"process": "Photosynthesis", "definition": "The process by which green plants...", "inputs": ["Sunlight", "Carbon Dioxide", "Water"], "outputs": ["Glucose", "Oxygen"], "location": "Chloroplasts", "stages": ["Light-dependent reactions", "Calvin cycle"]}'
    
    result2 = extract_json(test2)
    print(f"✅ Test 2 - JSON without topics field: {'PASS' if result2 and 'topics' not in result2 else 'FAIL'}")
    
    # Test 3: JSON wrapped in markdown code blocks (third error scenario)
    test3 = """```json
{
  "process": "Photosynthesis",
  "definition": "The process by which green plants and some other organisms use sunlight to synthesize foods with chemical energy from carbon dioxide and water.",
  "course_duration": "4 weeks",
  "name": "Photosynthesis Study Course",
  "links": ["https://example.com"],
  "topics": [
    {
      "name": "Basic Photosynthesis",
      "description": "Introduction to photosynthesis",
      "time_required": "1 hour",
      "links": ["https://example.com"],
      "videos": ["https://youtube.com/watch?v=example"],
      "subtopics": [
        {
          "name": "Chloroplasts",
          "description": "The organelles where photosynthesis occurs"
        }
      ]
    }
  ]
}
```"""

    result3 = extract_json(test3)
    print(f"✅ Test 3 - JSON in markdown code blocks: {'PASS' if result3 and 'topics' in result3 else 'FAIL'}")
    
    # Test 4: Empty string handling
    test4 = ""
    result4 = extract_json(test4)
    print(f"✅ Test 4 - Empty string handling: {'PASS' if result4 is None else 'FAIL'}")
    
    # Test 5: Malformed JSON handling
    test5 = '{"name": "Test", "topics": ['
    result5 = extract_json(test5)
    print(f"✅ Test 5 - Malformed JSON handling: {'PASS' if result5 is None else 'FAIL'}")
    
    # Test 6: Valid complete learning path JSON
    test6 = """{
    "course_duration": "6 weeks",
    "name": "Complete Python Programming Course",
    "links": [
        "https://docs.python.org/3/tutorial/",
        "https://realpython.com/python-first-steps/"
    ],
    "topics": [
        {
            "name": "Variables and Data Types",
            "description": "Learn about Python variables and basic data types",
            "time_required": "3 hours",
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
}"""

    result6 = extract_json(test6)
    print(f"✅ Test 6 - Valid complete learning path JSON: {'PASS' if result6 and 'topics' in result6 and len(result6['topics']) > 0 else 'FAIL'}")
    
    # Test 7: Multiple JSON objects in text
    test7 = """Here's some text before.
{
    "first": "object",
    "topics": []
}
Some text in between.
{
    "course_duration": "2 weeks",
    "name": "Second Course",
    "topics": [
        {
            "name": "Topic 1",
            "description": "Description 1",
            "time_required": "1 hour",
            "links": [],
            "videos": [],
            "subtopics": []
        }
    ]
}
Text after."""

    result7 = extract_json(test7)
    print(f"✅ Test 7 - Multiple JSON objects: {'PASS' if result7 and 'topics' in result7 else 'FAIL'}")
    
    print("\n🎉 JSON parsing tests completed!")
    return True

def validate_learning_path_structure(json_obj):
    """Validate that a JSON object has the required learning path structure"""
    if not isinstance(json_obj, dict):
        return False, "Not a dictionary"
    
    required_fields = ['topics']
    for field in required_fields:
        if field not in json_obj:
            return False, f"Missing field: {field}"
    
    if not isinstance(json_obj['topics'], list):
        return False, "'topics' is not a list"
    
    # Check each topic has required structure
    for i, topic in enumerate(json_obj['topics']):
        if not isinstance(topic, dict):
            return False, f"Topic {i} is not a dictionary"
        
        topic_required = ['name', 'description']
        for field in topic_required:
            if field not in topic:
                return False, f"Topic {i} missing field: {field}"
    
    return True, "Valid learning path structure"

def test_structure_validation():
    """Test the structure validation function"""
    print("🧪 Testing structure validation...\n")
    
    # Valid structure
    valid_json = {
        "course_duration": "4 weeks",
        "name": "Test Course",
        "topics": [
            {
                "name": "Topic 1",
                "description": "Description 1",
                "time_required": "2 hours",
                "links": [],
                "videos": [],
                "subtopics": []
            }
        ]
    }
    
    is_valid, message = validate_learning_path_structure(valid_json)
    print(f"✅ Valid structure test: {'PASS' if is_valid else 'FAIL'} - {message}")
    
    # Invalid structure - missing topics
    invalid_json1 = {
        "course_duration": "4 weeks",
        "name": "Test Course"
    }
    
    is_valid, message = validate_learning_path_structure(invalid_json1)
    print(f"✅ Missing topics test: {'PASS' if not is_valid else 'FAIL'} - {message}")
    
    # Invalid structure - topics not a list
    invalid_json2 = {
        "topics": "not a list"
    }
    
    is_valid, message = validate_learning_path_structure(invalid_json2)
    print(f"✅ Invalid topics type test: {'PASS' if not is_valid else 'FAIL'} - {message}")
    
    print("\n🎉 Structure validation tests completed!")

if __name__ == "__main__":
    print("🚀 Starting comprehensive JSON parsing tests...\n")
    test_json_parsing_scenarios()
    print()
    test_structure_validation()
    print("\n✅ All tests completed!")
