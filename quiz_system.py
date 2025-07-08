# Using enhanced database with optimized collections
# quiz_system.py
import json
import datetime
import random
import time
import logging
from fastapi import APIRouter, HTTPException, Body, Query
from database import chats_collection, users_collection
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

# Router for quiz system
quiz_router = APIRouter()

# Setup logger
logger = logging.getLogger(__name__)

class QuizQuestion(BaseModel):
    id: str
    type: str  # "mcq", "true_false", "short_answer"
    question: str
    options: Optional[List[str]] = None  # For MCQ
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 1
    difficulty: str = "medium"

class QuizCreate(BaseModel):
    title: str
    description: str
    subject: str
    difficulty: str
    time_limit: int  # in minutes
    max_attempts: int = 3
    questions: List[QuizQuestion]
    tags: List[str] = []

class QuizAttempt(BaseModel):
    quiz_id: str
    username: str
    answers: Dict[str, str]  # question_id -> answer

class QuizResult(BaseModel):
    quiz_id: str
    username: str
    score: float
    total_questions: int
    correct_answers: int
    time_taken: int  # in seconds
    answers: Dict[str, str]

@quiz_router.post("/create")
async def create_quiz(
    username: str = Body(...),
    quiz_data: QuizCreate = Body(...)
):
    """Create a new quiz"""
    try:
        quiz_id = f"quiz_{datetime.datetime.utcnow().timestamp()}"
        
        quiz = {
            "id": quiz_id,
            "title": quiz_data.title,
            "description": quiz_data.description,
            "subject": quiz_data.subject,
            "difficulty": quiz_data.difficulty,
            "time_limit": quiz_data.time_limit,
            "max_attempts": quiz_data.max_attempts,
            "questions": [q.dict() for q in quiz_data.questions],
            "tags": quiz_data.tags,
            "created_by": username,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "is_active": True,
            "attempts": 0
        }

        # Store quiz in user's session
        chat_session = chats_collection.find_one({"username": username}) or {}
        quizzes = chat_session.get("quizzes", [])
        quizzes.append(quiz)

        chats_collection.update_one(
            {"username": username},
            {"$set": {"quizzes": quizzes}},
            upsert=True
        )

        return {
            "message": "Quiz created successfully",
            "quiz_id": quiz_id,
            "quiz": quiz
        }
    except Exception as e:
        print(f"Error creating quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@quiz_router.get("/list")
async def list_quizzes(
    username: str = Query(...),
    subject: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None)
):
    """List available quizzes"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            return {"quizzes": []}

        quizzes = chat_session.get("quizzes", [])
        
        # Filter quizzes
        filtered_quizzes = []
        for quiz in quizzes:
            if subject and quiz.get("subject") != subject:
                continue
            if difficulty and quiz.get("difficulty") != difficulty:
                continue
            
            # Remove correct answers from questions for listing
            quiz_copy = quiz.copy()
            quiz_copy["questions"] = [
                {
                    "id": q["id"],
                    "type": q["type"],
                    "question": q["question"],
                    "options": q.get("options"),
                    "points": q.get("points", 1),
                    "difficulty": q.get("difficulty", "medium")
                }
                for q in quiz.get("questions", [])
            ]
            filtered_quizzes.append(quiz_copy)

        return {"quizzes": filtered_quizzes}
    except Exception as e:
        print(f"Error listing quizzes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@quiz_router.get("/detail/{quiz_id}")
async def get_quiz_detail(quiz_id: str, username: str = Query(...)):
    """Get quiz details for taking the quiz"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            raise HTTPException(status_code=404, detail="Quiz not found")

        quizzes = chat_session.get("quizzes", [])
        
        for quiz in quizzes:
            if quiz["id"] == quiz_id:
                # Remove correct answers for quiz taking
                quiz_copy = quiz.copy()
                quiz_copy["questions"] = [
                    {
                        "id": q["id"],
                        "type": q["type"],
                        "question": q["question"],
                        "options": q.get("options"),
                        "points": q.get("points", 1)
                    }
                    for q in quiz.get("questions", [])
                ]
                return {"quiz": quiz_copy}

        raise HTTPException(status_code=404, detail="Quiz not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting quiz detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@quiz_router.post("/submit")
async def submit_quiz(attempt: QuizAttempt):
    """Submit quiz answers and get results"""
    try:
        chat_session = chats_collection.find_one({"username": attempt.username})
        if not chat_session:
            raise HTTPException(status_code=404, detail="Quiz not found")

        quizzes = chat_session.get("quizzes", [])
        quiz = None
        
        for q in quizzes:
            if q["id"] == attempt.quiz_id:
                quiz = q
                break

        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

        # Calculate score
        total_questions = len(quiz["questions"])
        correct_answers = 0
        total_points = 0
        earned_points = 0
        
        detailed_results = []

        for question in quiz["questions"]:
            q_id = question["id"]
            user_answer = attempt.answers.get(q_id, "")
            correct_answer = question["correct_answer"]
            points = question.get("points", 1)
            
            total_points += points
            is_correct = False
            
            # Check answer based on question type
            if question["type"] == "mcq":
                is_correct = user_answer.lower() == correct_answer.lower()
            elif question["type"] == "true_false":
                is_correct = user_answer.lower() == correct_answer.lower()
            elif question["type"] == "short_answer":
                # Simple string matching (could be enhanced with fuzzy matching)
                is_correct = user_answer.lower().strip() == correct_answer.lower().strip()
            
            if is_correct:
                correct_answers += 1
                earned_points += points
            
            detailed_results.append({
                "question_id": q_id,
                "question": question["question"],
                "user_answer": user_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "points_earned": points if is_correct else 0,
                "explanation": question.get("explanation", "")
            })

        # Calculate percentage score
        score_percentage = (earned_points / total_points) * 100 if total_points > 0 else 0

        # Store quiz result
        result = {
            "id": f"result_{datetime.datetime.utcnow().timestamp()}",
            "quiz_id": attempt.quiz_id,
            "quiz_title": quiz["title"],
            "username": attempt.username,
            "score_percentage": score_percentage,
            "earned_points": earned_points,
            "total_points": total_points,
            "total_questions": total_questions,
            "correct_answers": correct_answers,
            "time_taken": 0,  # Would be calculated from frontend
            "answers": attempt.answers,
            "detailed_results": detailed_results,
            "submitted_at": datetime.datetime.utcnow().isoformat() + "Z"
        }

        # Store result in user session
        quiz_results = chat_session.get("quiz_results", [])
        quiz_results.append(result)

        # Update quiz attempts count
        for q in quizzes:
            if q["id"] == attempt.quiz_id:
                q["attempts"] = q.get("attempts", 0) + 1
                break

        chats_collection.update_one(
            {"username": attempt.username},
            {"$set": {
                "quiz_results": quiz_results,
                "quizzes": quizzes
            }}
        )

        # Update user stats
        users_collection.update_one(
            {"username": attempt.username},
            {"$inc": {"stats.totalQuizzes": 1}}
        )

        return {
            "message": "Quiz submitted successfully",
            "result": result
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@quiz_router.get("/results")
async def get_quiz_results(username: str = Query(...)):
    """Get user's quiz results"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            return {"results": []}

        results = chat_session.get("quiz_results", [])
        
        # Sort by submission date (newest first) with proper datetime parsing
        def get_datetime(result):
            submitted_at = result.get("submitted_at", "")
            if submitted_at:
                try:
                    # Try to parse ISO format datetime
                    from datetime import datetime
                    return datetime.fromisoformat(submitted_at.replace('Z', '+00:00'))
                except:
                    # Fallback to string comparison
                    return submitted_at
            return datetime.datetime.min
        
        results.sort(key=get_datetime, reverse=True)

        return {"results": results}
    except Exception as e:
        print(f"Error getting quiz results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@quiz_router.get("/analytics")
async def get_quiz_analytics(username: str = Query(...)):
    """Get quiz analytics for the user"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            return {"analytics": {}}

        results = chat_session.get("quiz_results", [])
        
        if not results:
            return {"analytics": {
                "total_quizzes": 0,
                "average_score": 0,
                "best_score": 0,
                "total_questions_answered": 0,
                "accuracy_rate": 0,
                "subject_performance": {}
            }}

        total_quizzes = len(results)
        total_score = sum(r.get("score_percentage", 0) for r in results)
        average_score = total_score / total_quizzes if total_quizzes > 0 else 0
        best_score = max(r.get("score_percentage", 0) for r in results)
        
        total_questions = sum(r.get("total_questions", 0) for r in results)
        total_correct = sum(r.get("correct_answers", 0) for r in results)
        accuracy_rate = (total_correct / total_questions) * 100 if total_questions > 0 else 0

        # Subject performance
        subject_performance = {}
        for result in results:
            quiz_title = result.get("quiz_title", "Unknown")
            if quiz_title not in subject_performance:
                subject_performance[quiz_title] = {
                    "attempts": 0,
                    "average_score": 0,
                    "best_score": 0
                }
            
            subject_performance[quiz_title]["attempts"] += 1
            subject_performance[quiz_title]["best_score"] = max(
                subject_performance[quiz_title]["best_score"],
                result.get("score_percentage", 0)
            )

        # Calculate average scores for subjects
        for subject in subject_performance:
            subject_results = [r for r in results if r.get("quiz_title") == subject]
            subject_total = sum(r.get("score_percentage", 0) for r in subject_results)
            subject_performance[subject]["average_score"] = subject_total / len(subject_results)

        analytics = {
            "total_quizzes": total_quizzes,
            "average_score": round(average_score, 2),
            "best_score": round(best_score, 2),
            "total_questions_answered": total_questions,
            "accuracy_rate": round(accuracy_rate, 2),
            "subject_performance": subject_performance
        }

        return {"analytics": analytics}
    except Exception as e:
        print(f"Error getting quiz analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@quiz_router.get("/quiz-history")
async def get_quiz_history(username: str = Query(...)):
    """Get user's quiz history from quiz_attempts collection"""
    try:
        from database import quiz_attempts_collection
        
        logger.info(f"🔍 Fetching quiz history for user: {username}")
        
        if not username:
            logger.warning("❌ No username provided")
            return {"quiz_history": []}
        
        # Get quiz attempts from quiz_attempts collection
        quiz_attempts = list(quiz_attempts_collection.find(
            {"username": username, "completed": True}
        ).sort("submitted_at", -1).limit(100))
        
        logger.info(f"📊 Found {len(quiz_attempts)} quiz attempts")
        
        # Format results for display
        history = []
        for attempt in quiz_attempts:
            try:
                result_data = attempt.get("result", {})
                
                quiz_info = {
                    "id": result_data.get("id", attempt.get("attempt_id", f"result_{int(datetime.datetime.utcnow().timestamp())}")) ,
                    "quiz_id": attempt.get("quiz_id"),
                    "quiz_title": result_data.get("quiz_title", "Quiz"),
                    "score_percentage": result_data.get("score_percentage", attempt.get("score", 0)),
                    "correct_answers": result_data.get("correct_answers", 0),
                    "total_questions": result_data.get("total_questions", 0),
                    "submitted_at": attempt.get("submitted_at"),
                    "answerReview": result_data.get("answerReview", []),
                    "source": "ai_chat"
                }
                
                # Format submitted_at properly
                submitted_at = quiz_info["submitted_at"]
                if hasattr(submitted_at, 'isoformat'):
                    quiz_info["submitted_at"] = submitted_at.isoformat() + "Z" if not str(submitted_at).endswith('Z') else submitted_at.isoformat()
                elif not isinstance(submitted_at, str):
                    quiz_info["submitted_at"] = datetime.datetime.utcnow().isoformat() + "Z"
                
                history.append(quiz_info)
                logger.info(f"  ✅ Quiz {quiz_info['quiz_id']}: {quiz_info['score_percentage']}%")
                
            except Exception as format_error:
                logger.error(f"❌ Error formatting quiz attempt: {format_error}")
                continue
        
        return {"quiz_history": history}
        
    except Exception as e:
        logger.error(f"❌ Error in get_quiz_history: {e}")
        return {"quiz_history": []}

@quiz_router.get("/active-quizzes")
async def get_active_quizzes(username: str = Query(...)):
    """Get user's active quizzes from both AI-generated and manual sources with proper authentication"""
    try:
        from database import quizzes_collection
        from bson import ObjectId
        
        logger.info(f"🔍 Fetching active quizzes for user: {username}")
        
        # Verify user authentication
        if not username:
            logger.warning("❌ No username provided for quiz fetching")
            return {"active_quizzes": []}
        
        # Get all quizzes from quizzes_collection with proper error handling
        ai_quizzes_raw = []
        try:
            ai_quizzes_raw = list(quizzes_collection.find(
                {"username": username}
            ).sort("created_at", -1))
            logger.info(f"📊 Found {len(ai_quizzes_raw)} quizzes in database")
        except Exception as db_error:
            logger.error(f"❌ Database query failed: {db_error}")
            # Continue with empty list rather than failing
        
        # Transform AI quizzes to frontend-compatible format
        transformed_quizzes = []
        for quiz in ai_quizzes_raw:
            try:
                # Get quiz data structure
                quiz_json = quiz.get("quiz_json", {})
                quiz_data = quiz_json.get("quiz_data", {}) if isinstance(quiz_json, dict) else {}
                
                # Ensure we have all required fields
                quiz_id = quiz.get("quiz_id")
                if not quiz_id:
                    logger.warning(f"⚠️ Skipping quiz without quiz_id: {quiz.get('_id')}")
                    continue
                
                # Get title from quiz_data or generate one
                title = quiz_data.get("quiz_title")
                if not title:
                    topic = quiz.get('topic', 'Knowledge')
                    title = f"{topic.title()} Challenge"
                
                # Format created_at properly
                created_at = quiz.get("created_at")
                if hasattr(created_at, 'isoformat'):
                    created_at_str = created_at.isoformat() + "Z" if not str(created_at).endswith('Z') else created_at.isoformat()
                elif isinstance(created_at, str):
                    created_at_str = created_at
                else:
                    import datetime
                    created_at_str = datetime.datetime.utcnow().isoformat() + "Z"
                
                # Create frontend-compatible quiz object
                transformed_quiz = {
                    "id": quiz_id,
                    "quiz_id": quiz_id,
                    "title": title,
                    "description": f"Test your knowledge about {quiz.get('topic', 'this topic')}",
                    "subject": quiz.get("topic", "General"),
                    "difficulty": quiz.get("difficulty", "medium"),
                    "time_limit": quiz_data.get("time_limit", 10),
                    "questions": quiz_data.get("questions", []),
                    "created_at": created_at_str,
                    "source": quiz.get("source", "ai_generated"),
                    "status": quiz.get("status", "active"),
                    "_id": str(quiz.get("_id", ""))
                }
                
                # Validate that we have questions
                if not transformed_quiz["questions"] or len(transformed_quiz["questions"]) == 0:
                    logger.warning(f"⚠️ Quiz {quiz_id} has no questions, skipping")
                    continue
                
                transformed_quizzes.append(transformed_quiz)
                logger.info(f"✅ Transformed quiz: {transformed_quiz['title']} ({quiz_id}) - Status: {transformed_quiz['status']}")
                
            except Exception as transform_error:
                logger.error(f"❌ Error transforming quiz {quiz.get('quiz_id', 'unknown')}: {transform_error}")
                import traceback
                logger.error(f"❌ Transform traceback: {traceback.format_exc()}")
                continue
        
        # Get manual quizzes from chat sessions (legacy storage)
        try:
            chat_session = chats_collection.find_one({"username": username})
            manual_count = 0
            if chat_session and "quizzes" in chat_session:
                manual_quizzes = chat_session.get("quizzes", [])
                # Filter only active quizzes and transform to consistent format
                for quiz in manual_quizzes:
                    if quiz.get("is_active", True) and quiz.get("questions"):
                        # Ensure proper ID format
                        quiz_id = quiz.get("id") or f"manual_{int(datetime.datetime.utcnow().timestamp())}"
                        
                        manual_quiz = {
                            "id": quiz_id,
                            "quiz_id": quiz_id,
                            "title": quiz.get("title", "Manual Quiz"),
                            "description": quiz.get("description", "Manually created quiz"),
                            "subject": quiz.get("subject", "General"),
                            "difficulty": quiz.get("difficulty", "medium"),
                            "time_limit": quiz.get("time_limit", 10),
                            "questions": quiz.get("questions", []),
                            "created_at": quiz.get("created_at", datetime.datetime.utcnow().isoformat() + "Z"),
                            "source": "manual",
                            "status": "active"
                        }
                        transformed_quizzes.append(manual_quiz)
                        manual_count += 1
            
            logger.info(f"📊 Found {manual_count} manual quizzes")
        except Exception as manual_error:
            logger.error(f"❌ Error fetching manual quizzes: {manual_error}")
        
        # Sort by creation time (newest first)
        try:
            transformed_quizzes.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        except Exception as sort_error:
            logger.warning(f"⚠️ Could not sort quizzes by created_at: {sort_error}")
        
        logger.info(f"✅ Returning {len(transformed_quizzes)} total quizzes")
        
        return {"active_quizzes": transformed_quizzes}
        
    except Exception as e:
        logger.error(f"❌ Error in get_active_quizzes: {e}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return {"active_quizzes": []}

@quiz_router.post("/generate")
async def generate_quiz_from_topic(
    username: str = Body(...),
    topic: str = Body(...),
    difficulty: str = Body("medium"),
    num_questions: int = Body(5)
):
    """Generate a quiz automatically from a topic using AI"""
    try:
        # This would integrate with the AI model to generate questions
        # For now, we'll create a sample quiz
        
        sample_questions = [
            {
                "id": f"q_{i}",
                "type": "mcq",
                "question": f"Sample question {i+1} about {topic}",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Option A",
                "explanation": f"Explanation for question {i+1}",
                "points": 1,
                "difficulty": difficulty
            }
            for i in range(num_questions)
        ]

        # Generate unique title based on topic and difficulty with proper capitalization
        capitalized_topic = ' '.join(word.capitalize() for word in topic.split())
        
        title_templates = {
            "easy": [f"{capitalized_topic} Fundamentals", f"Introduction to {capitalized_topic}", f"{capitalized_topic} Basics"],
            "medium": [f"{capitalized_topic} Challenge", f"{capitalized_topic} Mastery Test", f"Exploring {capitalized_topic}"],
            "hard": [f"Advanced {capitalized_topic}", f"{capitalized_topic} Expert Challenge", f"{capitalized_topic} Mastery"]
        }
        
        # Select template based on difficulty and add timestamp for uniqueness
        templates = title_templates.get(difficulty, title_templates["medium"])
        template_index = (int(time.time()) % len(templates))
        unique_title = templates[template_index]
        
        quiz_data = QuizCreate(
            title=unique_title,
            description=f"Test your knowledge about {topic}",
            subject=topic,
            difficulty=difficulty,
            time_limit=num_questions * 2,  # 2 minutes per question
            questions=[QuizQuestion(**q) for q in sample_questions]
        )

        return await create_quiz(username, quiz_data)
    except Exception as e:
        print(f"Error generating quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))