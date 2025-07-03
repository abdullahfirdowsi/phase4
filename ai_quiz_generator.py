# Using enhanced database with optimized collections
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
from database import chats_collection, users_collection, quizzes_collection, chat_messages_collection
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
You are an AI Tutor creating an interactive quiz. Generate a quiz about "{topic}" with {num_questions} questions at {difficulty} difficulty level.

IMPORTANT: You must generate questions specifically about "{topic}". If you cannot create questions about this topic, respond with an error message instead.

Your response must be ONLY a valid JSON object in this exact format:
{{
    "response": "Here's your quiz! Let's test your knowledge. Answer each question and I'll calculate your score at the end.\\n\\n",
    "type": "quiz",
    "quiz_data": {{
        "quiz_id": "{quiz_id}",
        "quiz_title": "[Generate a creative, unique title for this quiz - NOT just '{topic} Quiz']",
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
        logger.info(f"🤖 Sending request to AI model: {os.getenv('MODEL_NAME', 'llama3-70b-8192')}")
        response = client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "llama3-70b-8192"),
            messages=[
                {"role": "system", "content": "You are an expert quiz generator. Always respond with valid JSON format as requested. Generate questions that are accurate, educational, and appropriate for the given topic and difficulty level."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4000,
            temperature=0.3  # Lower temperature for more consistent JSON output
        )
        ai_content = response.choices[0].message.content
        logger.info(f"✅ Received AI response (length: {len(ai_content)})")
        return ai_content
    except Exception as e:
        logger.error(f"Error generating AI response: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

def extract_json_from_response(response: str) -> Dict[str, Any]:
    """Extract JSON from AI response"""
    try:
        # Clean the response first
        response = response.strip()
        
        # Try to parse as direct JSON
        parsed = json.loads(response)
        logger.info(f"✅ Successfully parsed JSON directly")
        return parsed
    except json.JSONDecodeError as e:
        logger.warning(f"⚠️ Direct JSON parsing failed: {e}")
        try:
            # Try to find JSON in the response using improved regex
            json_match = re.search(r'\{[\s\S]*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                parsed = json.loads(json_str)
                logger.info(f"✅ Successfully extracted JSON from response")
                return parsed
            else:
                logger.error(f"❌ No JSON pattern found in response")
        except json.JSONDecodeError as e2:
            logger.error(f"❌ JSON extraction also failed: {e2}")
        except Exception as e3:
            logger.error(f"❌ Unexpected error during JSON extraction: {e3}")
    except Exception as e:
        logger.error(f"❌ Unexpected error during JSON parsing: {e}")
    
    return None

def store_quiz_message(username: str, content: Dict[str, Any], role: str = "assistant"):
    """Store quiz message in chat_messages_collection with proper structure"""
    try:
        # Use consistent session ID format matching AI Chat component
        session_id = f"chat_session_{username}_{int(datetime.datetime.utcnow().timestamp() * 1000)}"
        
        message = {
            "username": username,
            "session_id": session_id,
            "role": role,
            "content": content,
            "message_type": "quiz",  # Use message_type instead of type to match chat service
            "metadata": {},
            "timestamp": datetime.datetime.utcnow()
        }
        
        chat_messages_collection.insert_one(message)
        
        logger.info(f"✅ Stored quiz message for user: {username} with session: {session_id}")
        
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
            raise HTTPException(status_code=500, detail="Failed to generate AI response for quiz")
        
        # Extract JSON from response
        quiz_json = extract_json_from_response(ai_response)
        if not quiz_json:
            logger.error(f"❌ Failed to parse JSON from AI response for topic: {request.topic}")
            logger.error(f"Raw AI response: {ai_response[:500]}...")  # Log first 500 chars
            raise HTTPException(
                status_code=500, 
                detail=f"Unable to generate a valid quiz for '{request.topic}'. The AI could not create appropriate questions for this topic. Please try:\n1. A more specific or well-known topic\n2. Using English language topics\n3. Educational subjects like 'Mathematics', 'Science', 'History', etc."
            )
        
        # Validate the quiz structure
        if not quiz_json.get("quiz_data") or not quiz_json["quiz_data"].get("questions"):
            logger.error(f"❌ Invalid quiz structure generated for topic: {request.topic}")
            raise HTTPException(
                status_code=500,
                detail=f"Generated quiz for '{request.topic}' has invalid structure. Please try a different topic."
            )
        
        # Note: Message storage is handled by the frontend AIChat component
        # to ensure proper session ID consistency. The frontend calls storeQuizMessage()
        # after receiving the quiz response, which maintains the correct session flow.
        
        # Store quiz data for later reference and scoring
        quiz_data = {
            "quiz_id": quiz_id,
            "username": request.username,
            "quiz_json": quiz_json,
            "created_at": datetime.datetime.utcnow(),
            "status": "active"
        }
        
        # Store in quizzes collection for proper organization
        result = quizzes_collection.update_one(
            {"quiz_id": quiz_id, "username": request.username},
            {"$set": quiz_data},
            upsert=True
        )
        logger.info(f"✅ Stored quiz in quizzes collection - matched: {result.matched_count}, modified: {result.modified_count}, upserted: {result.upserted_id}")
        
        # Don't create initial quiz attempt record - only create when submitting
        # This avoids duplicate records
        
        return quiz_json
        
    except Exception as e:
        logger.error(f"Error generating AI quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@ai_quiz_router.post("/submit")
async def submit_ai_quiz(request: QuizSubmissionRequest):
    """Submit quiz answers and get AI-generated results"""
    try:
        logger.info(f"📝 Quiz submission request: username={request.username}, quiz_id={request.quiz_id}, answers_count={len(request.answers)}")
        
        # Validate request data
        if not request.username or not request.quiz_id:
            raise HTTPException(status_code=400, detail="Username and quiz_id are required")
        
        if not request.answers or len(request.answers) == 0:
            raise HTTPException(status_code=400, detail="At least one answer is required")
        
        # Find the quiz data in quizzes collection first
        quiz_data = quizzes_collection.find_one({"quiz_id": request.quiz_id, "username": request.username})
        logger.info(f"🔍 Looking for quiz ID: {request.quiz_id}")
        
        if quiz_data:
            logger.info(f"✅ Found quiz in quizzes collection: {request.quiz_id}")
        else:
            logger.info(f"⚠️ Quiz not found in quizzes collection")
        
        # If not found in quizzes collection, check chat messages for fallback
        if not quiz_data:
            logger.info(f"⚠️ Quiz not found in quizzes collection, checking chat messages...")
            messages = list(chats_collection.find(
                {"username": request.username}
            ).sort("timestamp", -1).limit(10))
            logger.info(f"📬 Total user sessions to check: {len(messages)}")
            
            quiz_ids_in_messages = []
            for session in messages:
                messages_list = session.get("messages", [])
                for message in reversed(messages_list):  # Check most recent first
                    if message.get("type") == "quiz" and message.get("role") == "assistant":
                        content = message.get("content", {})
                        if isinstance(content, dict):
                            quiz_json = content
                        elif isinstance(content, str):
                            try:
                                quiz_json = json.loads(content)
                            except:
                                continue
                        else:
                            continue
                        
                        # Log the quiz ID found in this message
                        found_quiz_id = quiz_json.get("quiz_data", {}).get("quiz_id")
                        if found_quiz_id:
                            quiz_ids_in_messages.append(found_quiz_id)
                        
                        # Check if this is the quiz we're looking for
                        if found_quiz_id == request.quiz_id:
                            quiz_data = {
                                "quiz_id": request.quiz_id,
                                "quiz_json": quiz_json,
                                "created_at": message.get("timestamp", datetime.datetime.utcnow()),
                                "status": "active"
                            }
                            logger.info(f"📋 Found quiz in messages: {request.quiz_id}")
                            break
                if quiz_data:
                    break
            
            logger.info(f"🔍 Quiz IDs found in messages: {quiz_ids_in_messages}")
        
        if not quiz_data:
            logger.error(f"❌ Quiz not found: {request.quiz_id}")
            raise HTTPException(status_code=404, detail=f"Quiz {request.quiz_id} not found. Please generate a new quiz.")
        
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
            "quiz_title": quiz_info.get('quiz_title', quiz_info.get('topic', 'Knowledge Challenge')),  # Use AI-generated title or topic as fallback
            "score_percentage": score_percentage,
            "correct_answers": correct_answers,
            "total_questions": total_questions,
            "submitted_at": datetime.datetime.utcnow().isoformat() + "Z",
            "answerReview": detailed_results  # Frontend expects this key
        }
        
        logger.info(f"📊 Final quiz result: {correct_answers}/{total_questions} = {score_percentage}%")
        
        # Store result in frontend format for compatibility
        result_data = {
            "attempt_id": f"attempt_{int(datetime.datetime.utcnow().timestamp())}",
            "quiz_id": request.quiz_id,
            "username": request.username,
            "answers": request.answers,
            "result": frontend_result,
            "submitted_at": datetime.datetime.utcnow(),
            "completed": True,
            "score": score_percentage
        }
        
        # Debug: Log the exact structure being sent to frontend
        logger.info(f"🔍 Frontend result structure: {json.dumps(frontend_result, indent=2)}")
        
        # Store final quiz result in quiz_attempts collection
        from database import quiz_attempts_collection
        quiz_attempts_collection.insert_one(result_data)
        
        # Update quiz status in quizzes collection
        quizzes_collection.update_one(
            {"quiz_id": request.quiz_id, "username": request.username},
            {"$set": {"status": "completed"}}
        )
        
        return frontend_result
        
    except Exception as e:
        logger.error(f"Error submitting quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
    """Get user's quiz history from quiz_attempts collection"""
    try:
        from database import quiz_attempts_collection
        
        # Get quiz attempts from the correct collection
        quiz_attempts = list(quiz_attempts_collection.find(
            {"username": username, "completed": True}
        ).sort("submitted_at", -1).limit(100))
        
        logger.info(f"📊 Found {len(quiz_attempts)} quiz attempts for user: {username}")
        
        # Format results for display
        history = []
        for attempt in quiz_attempts:
            result_data = attempt.get("result", {})
            
            # Extract quiz info
            quiz_info = {
                "id": result_data.get("id", attempt.get("attempt_id")),
                "quiz_id": attempt.get("quiz_id"),
                "quiz_title": result_data.get("quiz_title", "Quiz"),
                "score_percentage": result_data.get("score_percentage", attempt.get("score", 0)),
                "correct_answers": result_data.get("correct_answers", 0),
                "total_questions": result_data.get("total_questions", 0),
                "submitted_at": attempt.get("submitted_at"),
                "answerReview": result_data.get("answerReview", []),
                "source": "ai_chat"  # Mark as AI Chat quiz
            }
            
            history.append(quiz_info)
            
            logger.info(f"  - Quiz {quiz_info['quiz_id']}: {quiz_info['score_percentage']}% ({quiz_info['quiz_title']})")
        
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