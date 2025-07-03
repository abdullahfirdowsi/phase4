from database import quiz_attempts_collection, quizzes_collection
import json
from datetime import datetime

print('=== QUIZ ATTEMPTS ANALYSIS ===')
attempts = list(quiz_attempts_collection.find({'username': '717821i102@kce.ac.in'}).sort('submitted_at', -1).limit(3))

for i, attempt in enumerate(attempts):
    print(f'\n--- ATTEMPT {i+1} ---')
    print(f'Attempt ID: {attempt.get("attempt_id")}')
    print(f'Quiz ID: {attempt.get("quiz_id")}')
    print(f'Score field: {attempt.get("score")}')
    print(f'Completed: {attempt.get("completed")}')
    print(f'Submitted at: {attempt.get("submitted_at")}')
    
    # Check result structure
    result = attempt.get("result", {})
    if result:
        print(f'Result score_percentage: {result.get("score_percentage")}')
        print(f'Result correct_answers: {result.get("correct_answers")}')
        print(f'Result total_questions: {result.get("total_questions")}')
        print(f'Result quiz_title: {result.get("quiz_title")}')
    else:
        print('No result object found')
    
    # Show full structure
    print(f'Full structure keys: {list(attempt.keys())}')

print('\n=== QUIZZES COLLECTION ===')
quizzes = list(quizzes_collection.find({'username': '717821i102@kce.ac.in'}).sort('created_at', -1).limit(3))

for i, quiz in enumerate(quizzes):
    print(f'\n--- QUIZ {i+1} ---')
    print(f'Quiz ID: {quiz.get("quiz_id")}')
    print(f'Created at: {quiz.get("created_at")}')
    print(f'Status: {quiz.get("status")}')
    
    # Check quiz_data structure
    quiz_json = quiz.get("quiz_json", {})
    if quiz_json and "quiz_data" in quiz_json:
        quiz_data = quiz_json["quiz_data"]
        print(f'Topic: {quiz_data.get("topic")}')
        print(f'Quiz Title: {quiz_data.get("quiz_title")}')
        print(f'Questions count: {len(quiz_data.get("questions", []))}')
