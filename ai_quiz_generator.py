# ai_quiz_generator.py
"""
AI-powered quiz generator that creates interactive quizzes in JSON format
Similar to the AI Tutor chat responses shown in the examples
"""

import json
import datetime
import random
import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from database import chats_collection, users_collection
from constants import get_basic_environment_prompt
import os
import groq
import logging

logger = logging.getLogger(__name__)

# Initialize Groq client
client = groq.Client(api_key=os.getenv("API_KEY"))

# Router for AI quiz generation
ai_quiz_router = APIRouter()

class QuizGenerationRequest(BaseModel):
    username: str
    topic: str
    difficulty: str = "medium"  # easy, medium, hard
    question_count: int = 5  # Change from num_questions to question_count to match frontend
    question_types: List[str] = ["mcq", "true_false", "short_answer"]
    time_limit: int = 10  # minutes
    
    @property
    def num_questions(self):
        """Alias for backward compatibility"""
        return self.question_count

class QuizSubmissionRequest(BaseModel):
    username: str
    quiz_id: str
    answers: List[str]  # User's answers in order

# Quiz generation prompts
QUIZ_GENERATION_PROMPT = """
You are an AI Tutor creating an interactive quiz. Generate a quiz about {topic} with {num_questions} questions at {difficulty} difficulty level.

Your response must be ONLY a valid JSON object in this exact format:
{{
    "response": "Here's your {topic} quiz! Let's test your knowledge. Answer each question and I'll calculate your score at the end.\\n\\n",
    "type": "quiz",
    "quiz_data": {{
        "quiz_id": "{quiz_id}",
        "topic": "{topic}",
        "difficulty": "{difficulty}",
        "total_questions": {num_questions},
        "time_limit": {time_limit},
        "questions": [
            {{
                "question_number": 1,
                "question": "What is...",
                "type": "mcq",
                "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                "correct_answer": "A",
                "explanation": "Brief explanation of why this is correct"
            }},
            {{
                "question_number": 2,
                "question": "True or False: ...",
                "type": "true_false",
                "options": ["True", "False"],
                "correct_answer": "True",
                "explanation": "Explanation here"
            }},
            {{
                "question_number": 3,
                "question": "Explain...",
                "type": "short_answer",
                "correct_answer": "Expected answer",
                "explanation": "Detailed explanation"
            }}
        ]
    }}
}}

Rules:
1. Include exactly {num_questions} questions
2. Mix question types: multiple choice (mcq), true/false, and short answer
3. For MCQ: provide 4 options labeled A, B, C, D
4. For True/False: provide True/False options
5. For Short Answer: provide the expected answer
6. Include explanations for all answers
7. Make questions relevant to {topic} at {difficulty} level
8. Respond with ONLY the JSON object, no extra text
9. Ensure the JSON is valid and parseable
"""

SCORE_CALCULATION_PROMPT = """
Calculate the quiz score based on the user's answers.

Quiz Data: {quiz_data}
User Answers: {user_answers}

Return ONLY a valid JSON object in this format:
{{
    "response": "Quiz completed! Here are your results:\\n\\nScore: X/Y (XX%)\\n\\nDetailed Results:\\n[detailed results here]\\n\\nGreat job! [feedback here]",
    "type": "quiz_result",
    "score_data": {{
        "total_questions": Y,
        "correct_answers": X,
        "score_percentage": percentage,
        "detailed_results": [
            {{
                "question_number": 1,
                "question": "Question text",
                "user_answer": "User's answer",
                "correct_answer": "Correct answer",
                "is_correct": true/false,
                "explanation": "Explanation text"
            }}
        ],
        "feedback": "Personalized feedback based on performance"
    }}
}}

Calculate accurately and provide encouraging feedback.
"""

def generate_ai_response(prompt: str) -> str:
    """Generate AI response using Groq"""
    try:
        response = client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "llama3-70b-8192"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4000,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating AI response: {e}")
        return ""

def extract_json_from_response(response: str) -> Dict[str, Any]:
    """Extract JSON from AI response"""
    try:
        # Try to parse as direct JSON
        return json.loads(response)
    except:
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
    
    return None

def store_quiz_message(username: str, content: Dict[str, Any]):
    """Store quiz message in chat history"""
    try:
        message = {
            "role": "assistant",
            "content": content,
            "type": "quiz",
            "timestamp": datetime.datetime.utcnow()
        }
        
        chats_collection.update_one(
            {"username": username},
            {"$push": {"messages": message}},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Error storing quiz message: {e}")

@ai_quiz_router.post("/generate")
async def generate_ai_quiz(request: QuizGenerationRequest):
    """Generate an AI-powered quiz in JSON format"""
    try:
        # Generate unique quiz ID
        quiz_id = f"quiz_{int(datetime.datetime.utcnow().timestamp())}"
        
        # Create the prompt
        prompt = QUIZ_GENERATION_PROMPT.format(
            topic=request.topic,
            num_questions=request.num_questions,
            difficulty=request.difficulty,
            quiz_id=quiz_id,
            time_limit=request.time_limit
        )
        
        # Generate AI response
        ai_response = generate_ai_response(prompt)
        if not ai_response:
            raise HTTPException(status_code=500, detail="Failed to generate quiz")
        
        # Extract JSON from response
        quiz_json = extract_json_from_response(ai_response)
        if not quiz_json:
            # Fallback to manual quiz generation
            quiz_json = create_fallback_quiz(request, quiz_id)
        
        # Store in chat history
        store_quiz_message(request.username, quiz_json)
        
        # Store quiz data for later scoring
        quiz_data = {
            "quiz_id": quiz_id,
            "username": request.username,
            "quiz_json": quiz_json,
            "created_at": datetime.datetime.utcnow(),
            "status": "active"
        }
        
        chats_collection.update_one(
            {"username": request.username},
            {"$push": {"active_quizzes": quiz_data}},
            upsert=True
        )
        
        # Store as a chat message for AI Chat integration
        quiz_message = {
            "role": "assistant",
            "content": quiz_json,
            "type": "quiz",
            "timestamp": datetime.datetime.utcnow()
        }
        
        chats_collection.update_one(
            {"username": request.username},
            {"$push": {"messages": quiz_message}},
            upsert=True
        )
        
        return quiz_json
        
    except Exception as e:
        logger.error(f"Error generating AI quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@ai_quiz_router.post("/submit")
async def submit_ai_quiz(request: QuizSubmissionRequest):
    """Submit quiz answers and get AI-generated results"""
    try:
        # Find the quiz data
        chat_session = chats_collection.find_one({"username": request.username})
        if not chat_session:
            raise HTTPException(status_code=404, detail="User session not found")
        
        # Find the specific quiz
        active_quizzes = chat_session.get("active_quizzes", [])
        quiz_data = None
        for quiz in active_quizzes:
            if quiz["quiz_id"] == request.quiz_id:
                quiz_data = quiz
                break
        
        if not quiz_data:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        # Prepare data for scoring
        quiz_json = quiz_data["quiz_json"]
        logger.info(f"🔍 Quiz JSON structure: {json.dumps(quiz_json, indent=2)}")
        
        # Handle both AI-generated and fallback quiz structures
        if "quiz_data" in quiz_json:
            quiz_info = quiz_json["quiz_data"]
            logger.info(f"📋 Using nested quiz_data structure")
        else:
            quiz_info = quiz_json
            logger.info(f"📋 Using direct quiz structure")
        
        questions = quiz_info.get("questions", [])
        logger.info(f"📊 Found {len(questions)} questions in quiz data")
        
        # Calculate score using fallback method (more reliable)
        total_questions = len(questions)
        correct_answers = 0
        detailed_results = []
        
        logger.info(f"📊 Scoring quiz with {total_questions} questions and {len(request.answers)} answers")
        
        for i, question in enumerate(questions):
            user_answer = request.answers[i] if i < len(request.answers) else ""
            correct_answer = question.get("correct_answer", "")
            question_type = question.get("type", "mcq")
            
            logger.info(f"Question {i+1}: User='{user_answer}', Correct='{correct_answer}', Type={question_type}")
            
            is_correct = False
            
            if user_answer and user_answer.strip():
                if question_type == "mcq":
                    # For MCQ, compare the letter (A, B, C, D)
                    is_correct = user_answer.strip().upper() == correct_answer.strip().upper()
                elif question_type == "true_false":
                    is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
                elif question_type == "short_answer":
                    # Simple keyword matching for short answers
                    user_words = set(user_answer.lower().split())
                    correct_words = set(correct_answer.lower().split())
                    # Consider correct if at least 50% of keywords match
                    match_ratio = len(user_words.intersection(correct_words)) / len(correct_words) if correct_words else 0
                    is_correct = match_ratio >= 0.5
            
            if is_correct:
                correct_answers += 1
            
            detailed_results.append({
                "questionNumber": question.get("question_number", i + 1),
                "question": question.get("question", ""),
                "type": question_type,
                "options": question.get("options", []),
                "userAnswer": user_answer,
                "correctAnswer": correct_answer,
                "isCorrect": is_correct,
                "explanation": question.get("explanation", ""),
                "feedback": "Correct!" if is_correct else "Incorrect answer."
            })
        
        # Calculate percentage
        score_percentage = round((correct_answers / total_questions) * 100, 1) if total_questions > 0 else 0
        
        # Create frontend-compatible result
        frontend_result = {
            "id": f"result_{int(datetime.datetime.utcnow().timestamp())}",
            "quiz_id": request.quiz_id,
            "quiz_title": f"{quiz_info.get('topic', 'Quiz')} Quiz",
            "score_percentage": score_percentage,
            "correct_answers": correct_answers,
            "total_questions": total_questions,
            "submitted_at": datetime.datetime.utcnow().isoformat() + "Z",
            "answerReview": detailed_results  # Frontend expects this key
        }
        
        logger.info(f"📊 Final quiz result: {correct_answers}/{total_questions} = {score_percentage}%")
        
        # Store result in frontend format for compatibility
        result_data = {
            "quiz_id": request.quiz_id,
            "username": request.username,
            "answers": request.answers,
            "result": frontend_result,
            "submitted_at": datetime.datetime.utcnow()
        }
        
        # Debug: Log the exact structure being sent to frontend
        logger.info(f"🔍 Frontend result structure: {json.dumps(frontend_result, indent=2)}")
        
        chats_collection.update_one(
            {"username": request.username},
            {"$push": {"quiz_results": result_data}},
            upsert=True
        )
        
        # Update quiz status
        chats_collection.update_one(
            {"username": request.username, "active_quizzes.quiz_id": request.quiz_id},
            {"$set": {"active_quizzes.$.status": "completed"}}
        )
        
        return frontend_result
        
    except Exception as e:
        logger.error(f"Error submitting quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def create_fallback_quiz(request: QuizGenerationRequest, quiz_id: str) -> Dict[str, Any]:
    """Create a fallback quiz if AI generation fails"""
    sample_questions = {
        "python": [
            {
                "question": "What is the correct way to define a function in Python?",
                "type": "mcq",
                "options": ["A) function myFunc():", "B) def myFunc():", "C) create myFunc():", "D) func myFunc():"],
                "correct_answer": "B",
                "explanation": "In Python, functions are defined using the 'def' keyword."
            },
            {
                "question": "True or False: Python is case-sensitive.",
                "type": "true_false",
                "options": ["True", "False"],
                "correct_answer": "True",
                "explanation": "Python is case-sensitive, meaning 'Variable' and 'variable' are different."
            }
        ],
        "mathematics": [
            {
                "question": "What is 2 + 2?",
                "type": "mcq",
                "options": ["A) 3", "B) 4", "C) 5", "D) 6"],
                "correct_answer": "B",
                "explanation": "2 + 2 equals 4."
            },
            {
                "question": "True or False: 0 is a natural number.",
                "type": "true_false",
                "options": ["True", "False"],
                "correct_answer": "False",
                "explanation": "Natural numbers typically start from 1, not 0."
            }
        ]
    }
    
    # Select questions based on topic
    topic_key = request.topic.lower()
    if topic_key in sample_questions:
        questions = sample_questions[topic_key][:request.num_questions]
    else:
        questions = sample_questions["python"][:request.num_questions]
    
    # Add question numbers
    for i, q in enumerate(questions):
        q["question_number"] = i + 1
    
    return {
        "response": f"Here's your {request.topic} quiz! Let's test your knowledge. Answer each question and I'll calculate your score at the end.\n\n",
        "type": "quiz",
        "quiz_data": {
            "quiz_id": quiz_id,
            "topic": request.topic,
            "difficulty": request.difficulty,
            "total_questions": len(questions),
            "time_limit": request.time_limit,
            "questions": questions
        }
    }

def calculate_fallback_score(quiz_data: Dict[str, Any], user_answers: List[str]) -> Dict[str, Any]:
    """Calculate score if AI scoring fails"""
    questions = quiz_data["questions"]
    correct_count = 0
    detailed_results = []
    
    for i, question in enumerate(questions):
        user_answer = user_answers[i] if i < len(user_answers) else ""
        correct_answer = question["correct_answer"]
        is_correct = user_answer.strip().upper() == correct_answer.upper()
        
        if is_correct:
            correct_count += 1
        
        detailed_results.append({
            "question_number": question["question_number"],
            "question": question["question"],
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "explanation": question.get("explanation", "")
        })
    
    total_questions = len(questions)
    percentage = round((correct_count / total_questions) * 100, 1) if total_questions > 0 else 0
    
    # Generate feedback
    if percentage >= 90:
        feedback = "Excellent work! You have a strong understanding of the topic."
    elif percentage >= 70:
        feedback = "Good job! You're doing well, with room for minor improvements."
    elif percentage >= 50:
        feedback = "Not bad! Review the explanations and try to improve."
    else:
        feedback = "Keep practicing! Review the material and try again."
    
    results_text = "\n".join([
        f"Q{r['question_number']}: {'✓' if r['is_correct'] else '✗'} {r['user_answer']} (Correct: {r['correct_answer']})"
        for r in detailed_results
    ])
    
    return {
        "response": f"Quiz completed! Here are your results:\n\nScore: {correct_count}/{total_questions} ({percentage}%)\n\nDetailed Results:\n{results_text}\n\n{feedback}",
        "type": "quiz_result",
        "score_data": {
            "total_questions": total_questions,
            "correct_answers": correct_count,
            "score_percentage": percentage,
            "detailed_results": detailed_results,
            "feedback": feedback
        }
    }

@ai_quiz_router.get("/quiz-history")
async def get_quiz_history(username: str):
    """Get user's quiz history"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            return {"quiz_history": []}
        
        quiz_results = chat_session.get("quiz_results", [])
        
        # Format results for display
        history = []
        for result in quiz_results:
            # Handle different result structures
            if "score_json" in result and "score_data" in result["score_json"]:
                score_data = result["score_json"]["score_data"]
            elif "result" in result:
                score_data = result["result"]
            else:
                # Skip malformed results
                continue
                
            history.append({
                "quiz_id": result["quiz_id"],
                "submitted_at": result["submitted_at"],
                "score": f"{score_data.get('correct_answers', 0)}/{score_data.get('total_questions', 0)}",
                "percentage": score_data.get("score_percentage", 0),
                "topic": result.get("topic", "General")
            })
        
        return {"quiz_history": history}
        
    except Exception as e:
        logger.error(f"Error getting quiz history: {e}")
        return {"quiz_history": []}

@ai_quiz_router.get("/active-quizzes")
async def get_active_quizzes(username: str):
    """Get user's active (incomplete) quizzes"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            return {"active_quizzes": []}
        
        active_quizzes = chat_session.get("active_quizzes", [])
        active_only = [quiz for quiz in active_quizzes if quiz.get("status") == "active"]
        
        return {"active_quizzes": active_only}
        
    except Exception as e:
        logger.error(f"Error getting active quizzes: {e}")
        return {"active_quizzes": []}