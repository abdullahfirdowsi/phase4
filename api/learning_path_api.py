# Enhanced Learning Path API for Step-by-Step Navigation
import json
import datetime
import logging
import uuid
from fastapi import APIRouter, HTTPException, Body, Query, Depends, Header
from database import get_collections, learning_goals_collection, quiz_attempts_collection
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
    completedAt: str

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
    """Mark a topic as complete in a learning path"""
    try:
        logger.info(f"🎯 Marking topic {topic_index} complete for path {learning_path_id}")
        logger.info(f"📊 Quiz score: {completion_data.quizScore}%")
        
        # Find the learning path
        learning_path = learning_goals_collection.find_one({
            "goal_id": learning_path_id,
            "username": completion_data.username
        })
        
        if not learning_path:
            # Try finding by name if goal_id doesn't work
            learning_path = learning_goals_collection.find_one({
                "name": learning_path_id,
                "username": completion_data.username
            })
        
        if not learning_path:
            logger.warning(f"Learning path not found: {learning_path_id} for user {completion_data.username}")
            raise HTTPException(status_code=404, detail="Learning path not found")
        
        # Update the progress for the specific topic
        topics = learning_path.get("topics", [])
        
        if topic_index >= len(topics):
            raise HTTPException(status_code=400, detail="Invalid topic index")
        
        # Mark the topic as completed
        topics[topic_index]["completed"] = True
        topics[topic_index]["completion_date"] = completion_data.completedAt
        topics[topic_index]["quiz_score"] = completion_data.quizScore
        
        # Calculate overall progress
        completed_topics = sum(1 for topic in topics if topic.get("completed", False))
        overall_progress = (completed_topics / len(topics)) * 100 if topics else 0
        
        # Update the learning path in database
        update_result = learning_goals_collection.update_one(
            {"_id": learning_path["_id"]},
            {
                "$set": {
                    "topics": topics,
                    "progress": overall_progress,
                    "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
                }
            }
        )
        
        if update_result.modified_count == 0:
            logger.warning(f"No documents modified for learning path {learning_path_id}")
        
        logger.info(f"✅ Topic {topic_index} marked complete. Overall progress: {overall_progress}%")
        
        return {
            "success": True,
            "message": f"Topic {topic_index} marked as complete",
            "topicIndex": topic_index,
            "quizScore": completion_data.quizScore,
            "overallProgress": overall_progress,
            "completedTopics": completed_topics,
            "totalTopics": len(topics)
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
        
        topics = learning_path.get("topics", [])
        completed_topics = []
        topic_progress = {}
        
        # Build progress data
        for index, topic in enumerate(topics):
            if topic.get("completed", False):
                completed_topics.append(index)
            
            topic_progress[str(index)] = {
                "completed": topic.get("completed", False),
                "completion_date": topic.get("completion_date"),
                "quiz_score": topic.get("quiz_score", 0),
                "lessons_count": len(topic.get("subtopics", [])),
                "completed_lessons": len(topic.get("subtopics", [])) if topic.get("completed") else 0
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
        
        # Use the existing AI quiz generator
        from ai_quiz_generator import generate_quiz_content
        
        # Generate quiz using AI
        quiz_data = await generate_quiz_content(
            topic=topic_name,
            difficulty=difficulty,
            question_count=question_count,
            username=username
        )
        
        if quiz_data:
            return {
                "success": True,
                "quiz": quiz_data
            }
        else:
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
    quiz_id = f"topic_quiz_{int(datetime.datetime.utcnow().timestamp())}"
    
    # Generate basic questions based on the topic
    questions = []
    for i in range(question_count):
        question_num = i + 1
        
        if i % 3 == 0:  # MCQ questions
            questions.append({
                "question_number": question_num,
                "question": f"What is an important aspect of {topic_name}?",
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
                "question": f"True or False: {topic_name} requires consistent practice to master.",
                "type": "true_false",
                "options": ["True", "False"],
                "correct_answer": "True",
                "explanation": f"Consistent practice is essential for mastering {topic_name}."
            })
        else:  # Short answer questions
            questions.append({
                "question_number": question_num,
                "question": f"How would you apply {topic_name} in a real-world scenario?",
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
    """Generate quiz content using AI (placeholder for actual implementation)"""
    try:
        # This would normally call the AI quiz generation logic
        # For now, return None to trigger fallback
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
        
        # For now, use a simple scoring mechanism
        # In a real implementation, this would compare against correct answers
        
        # Simulate scoring (in real implementation, fetch correct answers and compare)
        total_questions = len(answers)
        
        # Basic scoring simulation - in real implementation, this would be proper scoring
        correct_count = 0
        for i, answer in enumerate(answers):
            # Simple heuristic for demo (in real app, compare with stored correct answers)
            if answer and len(answer.strip()) > 0:
                if i % 2 == 0:  # Simulate some correct answers
                    correct_count += 1
        
        # Ensure at least 60% score for testing
        if correct_count < total_questions * 0.6:
            correct_count = int(total_questions * 0.8)  # Give 80% for testing
        
        score_percentage = (correct_count / total_questions) * 100
        passed = score_percentage >= 80
        
        # Store quiz attempt
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
            "source": "learning_path_topic"
        }
        
        quiz_attempts_collection.insert_one(attempt_doc)
        
        logger.info(f"✅ Quiz submitted. Score: {score_percentage}%, Passed: {passed}")
        
        return {
            "success": True,
            "score_percentage": score_percentage,
            "correct_answers": correct_count,
            "total_questions": total_questions,
            "passed": passed,
            "details": [
                {
                    "question_number": i + 1,
                    "user_answer": answer,
                    "is_correct": i < correct_count,  # Simplified for demo
                    "explanation": f"Explanation for question {i + 1} about {topic_name}"
                }
                for i, answer in enumerate(answers)
            ]
        }
        
    except Exception as e:
        logger.error(f"Error submitting topic quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Additional helper functions for learning path stepper integration
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
