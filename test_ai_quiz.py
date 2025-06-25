# test_ai_quiz.py
"""
Test script for AI Quiz Generator
Demonstrates how to create quizzes that return JSON responses like the AI Tutor
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8000"
USERNAME = "testuser"

def test_generate_quiz():
    """Test generating an AI quiz"""
    print("🧪 Testing AI Quiz Generation...")
    
    # Quiz generation request
    quiz_request = {
        "username": USERNAME,
        "topic": "Python Programming",
        "difficulty": "medium",
        "num_questions": 3,
        "time_limit": 10
    }
    
    try:
        response = requests.post(f"{BASE_URL}/quiz/generate-ai-quiz", json=quiz_request)
        
        if response.status_code == 200:
            quiz_data = response.json()
            print("✅ Quiz generated successfully!")
            print("\n📋 Quiz Response:")
            print(json.dumps(quiz_data, indent=2))
            
            # Extract quiz ID for submission test
            quiz_id = quiz_data.get("quiz_data", {}).get("quiz_id")
            return quiz_id
        else:
            print(f"❌ Failed to generate quiz: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_submit_quiz(quiz_id):
    """Test submitting quiz answers"""
    print(f"\n🧪 Testing Quiz Submission for Quiz ID: {quiz_id}")
    
    # Sample answers (adjust based on your quiz)
    answers = ["B", "True", "def myFunc():"]
    
    submission_request = {
        "username": USERNAME,
        "quiz_id": quiz_id,
        "answers": answers
    }
    
    try:
        response = requests.post(f"{BASE_URL}/quiz/submit-ai-quiz", json=submission_request)
        
        if response.status_code == 200:
            result_data = response.json()
            print("✅ Quiz submitted successfully!")
            print("\n📊 Quiz Results:")
            print(json.dumps(result_data, indent=2))
            return True
        else:
            print(f"❌ Failed to submit quiz: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_quiz_history():
    """Test getting quiz history"""
    print(f"\n🧪 Testing Quiz History for User: {USERNAME}")
    
    try:
        response = requests.get(f"{BASE_URL}/quiz/quiz-history", params={"username": USERNAME})
        
        if response.status_code == 200:
            history_data = response.json()
            print("✅ Quiz history retrieved successfully!")
            print("\n📚 Quiz History:")
            print(json.dumps(history_data, indent=2))
            return True
        else:
            print(f"❌ Failed to get quiz history: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def demonstrate_json_format():
    """Demonstrate the expected JSON format"""
    print("\n📝 Expected JSON Format for Quiz Response:")
    
    example_quiz = {
        "response": "Here's your Python Programming quiz! Let's test your knowledge. Answer each question and I'll calculate your score at the end.\n\n",
        "type": "quiz",
        "quiz_data": {
            "quiz_id": "quiz_1234567890",
            "topic": "Python Programming",
            "difficulty": "medium",
            "total_questions": 3,
            "time_limit": 10,
            "questions": [
                {
                    "question_number": 1,
                    "question": "What is the correct way to define a function in Python?",
                    "type": "mcq",
                    "options": ["A) function myFunc():", "B) def myFunc():", "C) create myFunc():", "D) func myFunc():"],
                    "correct_answer": "B",
                    "explanation": "In Python, functions are defined using the 'def' keyword."
                },
                {
                    "question_number": 2,
                    "question": "True or False: Python is case-sensitive.",
                    "type": "true_false",
                    "options": ["True", "False"],
                    "correct_answer": "True",
                    "explanation": "Python is case-sensitive, meaning 'Variable' and 'variable' are different."
                },
                {
                    "question_number": 3,
                    "question": "What keyword is used to create a class in Python?",
                    "type": "short_answer",
                    "correct_answer": "class",
                    "explanation": "The 'class' keyword is used to define a new class in Python."
                }
            ]
        }
    }
    
    print(json.dumps(example_quiz, indent=2))
    
    print("\n📊 Expected JSON Format for Quiz Results:")
    
    example_result = {
        "response": "Quiz completed! Here are your results:\n\nScore: 2/3 (66.7%)\n\nDetailed Results:\nQ1: ✓ B (Correct: B)\nQ2: ✓ True (Correct: True)\nQ3: ✗ cls (Correct: class)\n\nGood job! You're doing well, with room for minor improvements.",
        "type": "quiz_result",
        "score_data": {
            "total_questions": 3,
            "correct_answers": 2,
            "score_percentage": 66.7,
            "detailed_results": [
                {
                    "question_number": 1,
                    "question": "What is the correct way to define a function in Python?",
                    "user_answer": "B",
                    "correct_answer": "B",
                    "is_correct": True,
                    "explanation": "In Python, functions are defined using the 'def' keyword."
                }
            ],
            "feedback": "Good job! You're doing well, with room for minor improvements."
        }
    }
    
    print(json.dumps(example_result, indent=2))

def main():
    """Main test function"""
    print("🚀 Starting AI Quiz Generator Tests")
    print("=" * 50)
    
    # Demonstrate expected formats
    demonstrate_json_format()
    
    # Test the actual API
    print("\n" + "=" * 50)
    print("🧪 Running API Tests")
    
    # Generate a quiz
    quiz_id = test_generate_quiz()
    
    if quiz_id:
        # Wait a moment
        time.sleep(1)
        
        # Submit the quiz
        test_submit_quiz(quiz_id)
        
        # Wait a moment
        time.sleep(1)
        
        # Check history
        test_quiz_history()
    
    print("\n" + "=" * 50)
    print("✅ Tests completed!")
    
    print("\n📌 Usage Instructions:")
    print("1. Start your FastAPI server: python main.py")
    print("2. Use the /quiz/generate-ai-quiz endpoint to create quizzes")
    print("3. Use the /quiz/submit-ai-quiz endpoint to submit answers")
    print("4. Use the /quiz/quiz-history endpoint to view past quizzes")
    print("\n🔗 API Documentation: http://localhost:8000/docs")

if __name__ == "__main__":
    main()
