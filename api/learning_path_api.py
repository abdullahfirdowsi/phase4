# Enhanced Learning Path API for Step-by-Step Navigation
import json
import datetime
import logging
import uuid
from fastapi import APIRouter, HTTPException, Body, Query, Depends, Header
from database import get_collections, learning_goals_collection, quiz_attempts_collection, user_topic_progress_collection, quizzes_collection, chat_messages_collection
import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from api.auth_api import get_current_user

# Configure logging
logger = logging.getLogger(__name__)

# Router for learning path stepper functionality
learning_path_api_router = APIRouter()

class TopicCompletionRequest(BaseModel):
    username: str
    topicIndex: int
    quizScore: float = 0.0
    completedAt: Optional[str] = None

class LearningPathProgressResponse(BaseModel):
    completedTopics: List[int] = []
    topicProgress: Dict[str, Any] = {}
    overallProgress: float = 0.0

@learning_path_api_router.post("/topic/complete/{learning_path_id}/{topic_index}")
async def mark_topic_complete(
    learning_path_id: str,
    topic_index: int,
    completion_data: TopicCompletionRequest = Body(...)
):
    """Mark a topic as complete in a learning path with new progress tracking"""
    try:
        logger.info(f"🎯 Marking topic {topic_index} complete for path {learning_path_id}")
        logger.info(f"📊 Quiz score: {completion_data.quizScore}%")
        
        # Update or create user progress record in new collection
        progress_filter = {
            "username": completion_data.username,
            "learning_path_id": learning_path_id
        }
        
        existing_progress = user_topic_progress_collection.find_one(progress_filter)
        
        if existing_progress:
            # Update existing progress
            completed_topics = existing_progress.get("completed_topics", [])
            if topic_index not in completed_topics:
                completed_topics.append(topic_index)
            
            # Calculate new overall progress
            # We need to know total topics - try to get from learning path
            learning_path = learning_goals_collection.find_one({
                "$or": [
                    {"goal_id": learning_path_id, "username": completion_data.username},
                    {"name": learning_path_id, "username": completion_data.username}
                ]
            })
            
            total_topics = len(learning_path.get("topics", [])) if learning_path else 5  # fallback
            overall_progress = (len(completed_topics) / total_topics) * 100
            
            user_topic_progress_collection.update_one(
                progress_filter,
                {
                    "$set": {
                        "completed_topics": completed_topics,
                        "current_topic_index": max(topic_index + 1, existing_progress.get("current_topic_index", 0)),
                        "overall_progress": overall_progress,
                        "last_updated": datetime.datetime.utcnow(),
                        f"topic_{topic_index}_quiz_score": completion_data.quizScore,
                        f"topic_{topic_index}_completed_at": completion_data.completedAt
                    }
                }
            )
        else:
            # Create new progress record
            learning_path = learning_goals_collection.find_one({
                "$or": [
                    {"goal_id": learning_path_id, "username": completion_data.username},
                    {"name": learning_path_id, "username": completion_data.username}
                ]
            })
            
            total_topics = len(learning_path.get("topics", [])) if learning_path else 5  # fallback
            overall_progress = (1 / total_topics) * 100
            
            new_progress = {
                "username": completion_data.username,
                "learning_path_id": learning_path_id,
                "completed_topics": [topic_index],
                "current_topic_index": topic_index + 1,
                "completed_lessons": {},
                "overall_progress": overall_progress,
                "last_updated": datetime.datetime.utcnow(),
                "created_at": datetime.datetime.utcnow(),
                f"topic_{topic_index}_quiz_score": completion_data.quizScore,
                f"topic_{topic_index}_completed_at": completion_data.completedAt
            }
            user_topic_progress_collection.insert_one(new_progress)
        
        # Also update the original learning path for backward compatibility
        if learning_path:
            topics = learning_path.get("topics", [])
            if topic_index < len(topics):
                topics[topic_index]["completed"] = True
                topics[topic_index]["completion_date"] = completion_data.completedAt
                topics[topic_index]["quiz_score"] = completion_data.quizScore
                topics[topic_index]["quiz_passed"] = completion_data.quizScore >= 80
                
                learning_goals_collection.update_one(
                    {"_id": learning_path["_id"]},
                    {
                        "$set": {
                            "topics": topics,
                            "progress": overall_progress,
                            "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
                        }
                    }
                )
        
        logger.info(f"✅ Topic {topic_index} marked complete. Overall progress: {overall_progress}%")
        
        return {
            "success": True,
            "message": f"Topic {topic_index} marked as complete",
            "topicIndex": topic_index,
            "quizScore": completion_data.quizScore,
            "overallProgress": overall_progress,
            "completedTopics": len(existing_progress.get("completed_topics", [])) + (1 if not existing_progress else 0),
            "totalTopics": total_topics if 'total_topics' in locals() else 5
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking topic complete: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@learning_path_api_router.get("/learning-path/progress/{learning_path_id}")
async def get_learning_path_progress(
    learning_path_id: str,
    username: str = Query(...)
):
    """Get progress for a specific learning path"""
    try:
        logger.info(f"📊 Fetching progress for learning path {learning_path_id}")
        
        # Find the learning path
        learning_path = learning_goals_collection.find_one({
            "goal_id": learning_path_id,
            "username": username
        })
        
        if not learning_path:
            # Try finding by name if goal_id doesn't work
            learning_path = learning_goals_collection.find_one({
                "name": learning_path_id,
                "username": username
            })
        
        if not learning_path:
            logger.warning(f"Learning path not found: {learning_path_id} for user {username}")
            return LearningPathProgressResponse()
        
        # Get user progress from user_topic_progress collection
        user_progress = user_topic_progress_collection.find_one({
            "username": username,
            "learning_path_id": learning_path_id
        })
        
        topics = learning_path.get("topics", [])
        completed_topics = []
        topic_progress = {}
        
        # Build progress data
        for index, topic in enumerate(topics):
            if topic.get("completed", False):
                completed_topics.append(index)
            
            # Get lesson completion data from user progress if available
            topic_key = str(index)
            completed_lesson_count = 0
            completed_lesson_ids = []
            
            if user_progress:
                completed_lesson_count = user_progress.get("completed_lessons", {}).get(topic_key, 0)
                completed_lesson_ids = user_progress.get("completed_lesson_ids", {}).get(topic_key, [])
            
            # If topic is completed but no lesson progress, assume all lessons are complete
            if topic.get("completed", False) and completed_lesson_count == 0:
                completed_lesson_count = len(topic.get("subtopics", []))
                # Generate IDs for all lessons if missing
                completed_lesson_ids = [f"{index}-{i}" for i in range(len(topic.get("subtopics", [])))]
            
            topic_progress[str(index)] = {
                "completed": topic.get("completed", False),
                "completion_date": topic.get("completion_date"),
                "quiz_score": topic.get("quiz_score", 0),
                "lessons_count": len(topic.get("subtopics", [])),
                "completed_lessons": completed_lesson_count,
                "completedLessonIds": completed_lesson_ids
            }
        
        overall_progress = (len(completed_topics) / len(topics)) * 100 if topics else 0
        
        return {
            "completedTopics": completed_topics,
            "topicProgress": topic_progress,
            "overallProgress": overall_progress,
            "totalTopics": len(topics),
            "learningPathId": learning_path_id,
            "lastUpdated": learning_path.get("updated_at")
        }
        
    except Exception as e:
        logger.error(f"Error fetching learning path progress: {e}")
        return LearningPathProgressResponse()

@learning_path_api_router.get("/quiz/{topic_name}")
async def get_quiz_by_topic(
    topic_name: str,
    username: str = Query(...),
    difficulty: str = Query("medium"),
    question_count: int = Query(5)
):
    """Generate a quiz for a specific topic"""
    try:
        logger.info(f"🎯 Generating quiz for topic: {topic_name}")
        
        # Use the existing AI quiz generator directly from the router
        from ai_quiz_generator import generate_quiz_route
        
        # Create request data for AI quiz generation
        request_data = {
            "topic": topic_name,
            "difficulty": difficulty,
            "question_count": question_count,
            "username": username
        }
        
        # Generate quiz using AI
        try:
            quiz_response = await generate_quiz_route(request_data)
            if quiz_response and quiz_response.get("success"):
                return {
                    "success": True,
                    "quiz": quiz_response["quiz"]
                }
        except Exception as ai_error:
            logger.warning(f"AI quiz generation failed, using fallback: {ai_error}")
        
        # Fallback quiz if AI generation fails
        fallback_quiz = create_fallback_quiz(topic_name, difficulty, question_count)
        return {
            "success": True,
            "quiz": fallback_quiz,
            "note": "Generated using fallback method"
        }
            
    except Exception as e:
        logger.error(f"Error generating quiz for topic {topic_name}: {e}")
        
        # Return fallback quiz on error
        fallback_quiz = create_fallback_quiz(topic_name, difficulty, question_count)
        return {
            "success": True,
            "quiz": fallback_quiz,
            "note": "Generated using fallback method due to error"
        }

def create_fallback_quiz(topic_name: str, difficulty: str, question_count: int):
    """Create a fallback quiz when AI generation fails"""
    quiz_id = f"topic_quiz_{int(datetime.datetime.utcnow().timestamp())}_{hash(topic_name) % 10000}"
    
    # Generate more varied questions based on the topic
    questions = []
    
    # Topic-specific question templates
    topic_lower = topic_name.lower()
    
    for i in range(question_count):
        question_num = i + 1
        
        if i % 3 == 0:  # MCQ questions
            if 'python' in topic_lower:
                questions.append({
                    "question_number": question_num,
                    "text": f"What is a key feature of {topic_name} programming?",
                    "type": "mcq",
                    "options": [
                        "A) Dynamic typing and readability",
                        "B) Memory management",
                        "C) Large standard library",
                        "D) All of the above"
                    ],
                    "correct_answer": "D",
                    "explanation": f"All features are important aspects of {topic_name} programming."
                })
            elif 'javascript' in topic_lower or 'js' in topic_lower:
                questions.append({
                    "question_number": question_num,
                    "text": f"What makes {topic_name} unique for web development?",
                    "type": "mcq",
                    "options": [
                        "A) Event-driven programming",
                        "B) Asynchronous operations",
                        "C) DOM manipulation",
                        "D) All of the above"
                    ],
                    "correct_answer": "D",
                    "explanation": f"All features are essential for {topic_name} web development."
                })
            else:
                questions.append({
                    "question_number": question_num,
                    "text": f"What is an important principle when learning {topic_name}?",
                    "type": "mcq",
                    "options": [
                        "A) Understanding the fundamentals",
                        "B) Practical application",
                        "C) Continuous learning",
                        "D) All of the above"
                    ],
                    "correct_answer": "D",
                    "explanation": f"All aspects are important when learning {topic_name}."
                })
        elif i % 3 == 1:  # True/False questions
            questions.append({
                "question_number": question_num,
                "text": f"True or False: {topic_name} requires consistent practice to master.",
                "type": "true_false",
                "options": ["True", "False"],
                "correct_answer": "True",
                "explanation": f"Consistent practice is essential for mastering {topic_name}."
            })
        else:  # Short answer questions
            questions.append({
                "question_number": question_num,
                "text": f"How would you apply {topic_name} concepts in a real-world scenario?",
                "type": "short_answer",
                "correct_answer": f"By understanding the principles of {topic_name} and applying them to solve practical problems.",
                "explanation": f"Real-world application of {topic_name} involves connecting theory with practice."
            })
    
    return {
        "quiz_id": quiz_id,
        "quiz_title": f"{topic_name} Assessment",
        "topic": topic_name,
        "difficulty": difficulty,
        "total_questions": question_count,
        "time_limit": max(question_count * 2, 10),  # 2 minutes per question, minimum 10
        "questions": questions
    }

# Function to be called by AI quiz generator (if needed)
async def generate_quiz_content(topic: str, difficulty: str, question_count: int, username: str):
    """Generate quiz content using AI - properly integrated with ai_quiz_generator"""
    try:
        # Import the actual AI quiz generation function
        from ai_quiz_generator import generate_quiz_route
        
        # Create request data for AI quiz generation
        request_data = {
            "topic": topic,
            "difficulty": difficulty,
            "question_count": question_count,
            "username": username
        }
        
        # Generate quiz using AI
        quiz_response = await generate_quiz_route(request_data)
        if quiz_response and quiz_response.get("success"):
            return quiz_response["quiz"]
        else:
            logger.warning(f"AI quiz generation returned unsuccessful response")
            return None
            
    except Exception as e:
        logger.error(f"AI quiz generation failed: {e}")
        return None

@learning_path_api_router.post("/quiz/submit-for-topic")
async def submit_topic_quiz(
    quiz_id: str = Body(...),
    topic_name: str = Body(...),
    answers: List[str] = Body(...),
    username: str = Body(...)
):
    """Submit quiz answers and get score for learning path topic"""
    try:
        logger.info(f"📝 Submitting quiz {quiz_id} for topic {topic_name}")
        
        # Try to retrieve the actual quiz data to get correct answers
        quiz_data = None
        
        # First, try to get quiz from quizzes collection
        try:
            quiz_doc = quizzes_collection.find_one({
                "quiz_id": quiz_id,
                "username": username
            })
            if quiz_doc:
                quiz_data = quiz_doc
                logger.info(f"📋 Found quiz data in quizzes collection")
        except Exception as e:
            logger.warning(f"Could not retrieve quiz from collection: {e}")
        
        # If not found, try to get from chat messages as fallback
        if not quiz_data:
            try:
                chat_message = chat_messages_collection.find_one({
                    "message_id": quiz_id,
                    "username": username,
                    "sender": "AI",
                    "quiz_data": {"$exists": True}
                })
                if chat_message and "quiz_data" in chat_message:
                    quiz_data = chat_message["quiz_data"]
                    logger.info(f"📋 Found quiz data in chat messages")
            except Exception as e:
                logger.warning(f"Could not retrieve quiz from chat messages: {e}")
        
        if not quiz_data:
            logger.error(f"❌ Could not find quiz data for quiz_id: {quiz_id}")
            raise HTTPException(status_code=404, detail="Quiz data not found")
        
        # Extract questions from quiz data
        questions = quiz_data.get("questions", [])
        total_questions = len(questions)
        
        if len(answers) != total_questions:
            raise HTTPException(status_code=400, detail="Number of answers doesn't match number of questions")
        
        # Proper answer evaluation using the same logic as ai_quiz_generator
        correct_count = 0
        detailed_results = []
        
        for i, (question, user_answer) in enumerate(zip(questions, answers)):
            question_number = i + 1
            question_type = question.get("type", "mcq")
            correct_answer = question.get("correct_answer", "")
            explanation = question.get("explanation", "")
            
            # Normalize user answer
            normalized_user_answer = (user_answer or "").strip()
            
            is_correct = False
            
            # Check if answer is empty
            if not normalized_user_answer:
                is_correct = False
                logger.debug(f"Question {question_number}: Empty answer marked as incorrect")
            elif question_type in ["mcq", "true_false"]:
                # For MCQ and True/False, compare first letter only to handle possible answer formatting
                normalized_correct = correct_answer.strip().upper()
                normalized_user = normalized_user_answer.strip().upper()

                # Extract first letter of user answer and correct answer
                correct_letter = normalized_correct[0] if normalized_correct else ""
                user_letter = ""
                if normalized_user:
                    user_letter = normalized_user[0]
                    # Sometimes answers start with a letter followed by ')' or '.' (e.g. 'A)', 'B.')
                    if len(normalized_user) > 1 and normalized_user[1] in [')', '.']:
                        user_letter = normalized_user[0]
                    else:
                        # Also consider cases where option letters are followed by space (e.g. 'A Option')
                        user_letter = normalized_user[0]

                is_correct = (user_letter == correct_letter)
                logger.debug(f"Question {question_number}: MCQ/TF - User letter: '{user_letter}', Correct letter: '{correct_letter}', Match: {is_correct}")
            elif question_type == "short_answer":
                # For short answers, use keyword matching
                import re
                
                # Extract meaningful words from correct answer
                correct_words = set(re.findall(r'\b\w{3,}\b', correct_answer.lower()))
                user_words = set(re.findall(r'\b\w{3,}\b', normalized_user_answer.lower()))
                
                # Remove common stop words
                stop_words = {'the', 'and', 'are', 'for', 'with', 'this', 'that', 'from', 'they', 'have', 'will', 'can', 'not', 'but', 'you', 'all', 'any', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'use', 'man', 'new', 'now', 'old', 'see', 'him', 'two', 'how', 'its', 'who', 'oil', 'sit', 'set', 'run', 'cut', 'end', 'why', 'try', 'put', 'say', 'she', 'may', 'way', 'too', 'own', 'yet', 'off', 'far', 'ask', 'let', 'big', 'got', 'top', 'few'}
                correct_words = correct_words - stop_words
                user_words = user_words - stop_words
                
                if correct_words:
                    # Check if at least 50% of key words are present
                    matches = len(user_words.intersection(correct_words))
                    threshold = max(1, len(correct_words) * 0.5)
                    is_correct = matches >= threshold
                    logger.debug(f"Question {question_number}: Short answer - Matches: {matches}/{len(correct_words)}, Threshold: {threshold}, Correct: {is_correct}")
                else:
                    # If no meaningful words in correct answer, fall back to basic comparison
                    is_correct = normalized_user_answer.lower() in correct_answer.lower() or correct_answer.lower() in normalized_user_answer.lower()
                    logger.debug(f"Question {question_number}: Short answer fallback - Contains match: {is_correct}")
            
            if is_correct:
                correct_count += 1
            
            detailed_results.append({
                "question_number": question_number,
                "user_answer": user_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "explanation": explanation
            })
        
        score_percentage = (correct_count / total_questions) * 100 if total_questions > 0 else 0
        passed = score_percentage >= 80
        
        logger.info(f"📊 Quiz evaluation complete - Score: {correct_count}/{total_questions} ({score_percentage:.1f}%), Passed: {passed}")
        
        # Store quiz attempt with detailed results
        attempt_doc = {
            "attempt_id": f"attempt_{int(datetime.datetime.utcnow().timestamp())}",
            "quiz_id": quiz_id,
            "username": username,
            "topic": topic_name,
            "answers": answers,
            "score": score_percentage,
            "correct_answers": correct_count,
            "total_questions": total_questions,
            "completed": True,
            "completed_at": datetime.datetime.utcnow(),
            "source": "learning_path_topic",
            "detailed_results": detailed_results
        }
        
        quiz_attempts_collection.insert_one(attempt_doc)
        
        logger.info(f"✅ Quiz attempt stored successfully")
        
        return {
            "success": True,
            "score_percentage": score_percentage,
            "correct_answers": correct_count,
            "total_questions": total_questions,
            "passed": passed,
            "details": detailed_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting topic quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Additional helper functions for learning path stepper integration
@learning_path_api_router.get("/user-progress/{username}")
async def get_user_progress(
    username: str
):
    """Get all learning path progress for a user"""
    try:
        logger.info(f"📊 Fetching user progress for: {username}")
        
        # Get all user progress from user_topic_progress collection
        progress_records = list(user_topic_progress_collection.find({
            "username": username
        }))
        
        user_progress = []
        for record in progress_records:
            user_progress.append({
                "learningPathId": record.get("learning_path_id"),
                "completedTopics": record.get("completed_topics", []),
                "lastTopicIndex": record.get("current_topic_index", 0),
                "overallProgress": record.get("overall_progress", 0),
                "lastUpdated": record.get("last_updated")
            })
        
        return {
            "success": True,
            "progress": user_progress
        }
        
    except Exception as e:
        logger.error(f"Error fetching user progress: {e}")
        return {
            "success": True,
            "progress": []
        }

@learning_path_api_router.post("/lesson/complete/{lesson_id}")
async def mark_lesson_complete(
    lesson_id: str,
    completion_data: dict = Body(...)
):
    """Mark a lesson as complete"""
    try:
        logger.info(f"📚 Marking lesson {lesson_id} complete")
        
        username = completion_data.get("username")
        learning_path_id = completion_data.get("learningPathId", "unknown")
        topic_index = completion_data.get("topicIndex", 0)
        
        # Update or create user progress record
        progress_filter = {
            "username": username,
            "learning_path_id": learning_path_id
        }
        
        # Get existing progress or create new
        existing_progress = user_topic_progress_collection.find_one(progress_filter)
        
        if existing_progress:
            # Update lesson completion tracking with both count and IDs
            completed_lessons = existing_progress.get("completed_lessons", {})
            completed_lesson_ids = existing_progress.get("completed_lesson_ids", {})
            topic_key = str(topic_index)
            
            # Update lesson count
            completed_lessons[topic_key] = completed_lessons.get(topic_key, 0) + 1
            
            # Update lesson IDs list
            if topic_key not in completed_lesson_ids:
                completed_lesson_ids[topic_key] = []
            if lesson_id not in completed_lesson_ids[topic_key]:
                completed_lesson_ids[topic_key].append(lesson_id)
            
            # Ensure count matches IDs
            completed_lessons[topic_key] = len(completed_lesson_ids[topic_key])
            
            user_topic_progress_collection.update_one(
                progress_filter,
                {
                    "$set": {
                        "completed_lessons": completed_lessons,
                        "completed_lesson_ids": completed_lesson_ids,
                        "last_updated": datetime.datetime.utcnow()
                    }
                }
            )
        else:
            # Create new progress record
            new_progress = {
                "username": username,
                "learning_path_id": learning_path_id,
                "completed_topics": [],
                "current_topic_index": topic_index,
                "completed_lessons": {str(topic_index): 1},
                "completed_lesson_ids": {str(topic_index): [lesson_id]},
                "overall_progress": 0,
                "last_updated": datetime.datetime.utcnow(),
                "created_at": datetime.datetime.utcnow()
            }
            user_topic_progress_collection.insert_one(new_progress)
        
        return {
            "success": True,
            "message": f"Lesson {lesson_id} marked as complete",
            "lessonId": lesson_id
        }
        
    except Exception as e:
        logger.error(f"Error marking lesson complete: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@learning_path_api_router.get("/learning-path/{path_id}/stepper-data")
async def get_stepper_data(
    path_id: str,
    username: str = Query(...)
):
    """Get learning path data formatted for the stepper component"""
    try:
        # Find the learning path
        learning_path = learning_goals_collection.find_one({
            "goal_id": path_id,
            "username": username
        })
        
        if not learning_path:
            learning_path = learning_goals_collection.find_one({
                "name": path_id,
                "username": username
            })
        
        if not learning_path:
            raise HTTPException(status_code=404, detail="Learning path not found")
        
        # Format data for stepper component
        topics = learning_path.get("topics", [])
        stepper_topics = []
        
        for index, topic in enumerate(topics):
            # Convert subtopics to lessons format
            lessons = []
            subtopics = topic.get("subtopics", [])
            
            for sub_index, subtopic in enumerate(subtopics):
                lesson = {
                    "id": f"{index}-{sub_index}",
                    "title": subtopic.get("name") if isinstance(subtopic, dict) else str(subtopic),
                    "description": subtopic.get("description", f"Learn about {subtopic.get('name', subtopic)}") if isinstance(subtopic, dict) else f"Learn about {subtopic}",
                    "completed": False,
                    "type": "lesson"
                }
                lessons.append(lesson)
            
            stepper_topic = {
                "name": topic.get("name", f"Topic {index + 1}"),
                "description": topic.get("description", ""),
                "time_required": topic.get("time_required", "1 hour"),
                "links": topic.get("links", []),
                "videos": topic.get("videos", []),
                "lessons": lessons,
                "completed": topic.get("completed", False),
                "topicIndex": index
            }
            stepper_topics.append(stepper_topic)
        
        return {
            "id": learning_path.get("goal_id", path_id),
            "name": learning_path.get("name", "Learning Path"),
            "description": learning_path.get("description", "A personalized learning journey"),
            "difficulty": learning_path.get("difficulty", "Intermediate"),
            "duration": learning_path.get("duration", "4-6 weeks"),
            "topics": stepper_topics,
            "progress": learning_path.get("progress", 0),
            "created_at": learning_path.get("created_at"),
            "updated_at": learning_path.get("updated_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stepper data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
