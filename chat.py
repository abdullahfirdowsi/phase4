# chat.py
import json
import datetime
import asyncio
import groq
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
from database import chats_collection, users_collection
from constants import get_basic_environment_prompt, LEARNING_PATH_PROMPT, REGENRATE_OR_FILTER_JSON, CALCULATE_SCORE
from utils import extract_json
import os
from learning_path import process_learning_path_query
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Router for chat
chat_router = APIRouter()

# Initialize Groq client
client = groq.Client(api_key=os.getenv("API_KEY"))

def generate_response(prompt):
    """Generates a response using Groq's model with enhanced error handling"""
    try:
        # Check if API key is configured
        api_key = os.getenv("API_KEY")
        if not api_key or api_key == "your_groq_api_key_here":
            logger.error("❌ API_KEY not configured properly")
            return "API configuration error. Please check your API_KEY in the environment variables."
        
        model_name = os.getenv("MODEL_NAME", "llama3-70b-8192")
        logger.info(f"🤖 Calling Groq API with model: {model_name}")
        logger.info(f"📝 Prompt length: {len(prompt)} characters")
        
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=8000,  # Ensure we get a complete response
            temperature=0.7   # Add some creativity while maintaining consistency
        )
        
        content = response.choices[0].message.content
        if not content:
            logger.error("❌ Empty response from Groq API")
            return ""
        
        logger.info(f"✅ Successfully generated response: {len(content)} characters")
        return content
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error generating response: {error_msg}")
        
        # Provide more specific error messages
        if "api_key" in error_msg.lower() or "unauthorized" in error_msg.lower():
            return "API authentication error. Please check your API key configuration."
        elif "rate" in error_msg.lower() or "quota" in error_msg.lower():
            return "API rate limit exceeded. Please try again in a few moments."
        elif "timeout" in error_msg.lower():
            return "API request timed out. Please try again."
        else:
            return f"Error generating response: {error_msg}"

async def generate_chat_stream(messages):
    """Streams chat responses from Groq asynchronously"""
    try:
        response_stream = client.chat.completions.create(
            model=os.getenv("MODEL_NAME", "llama3-70b-8192"),
            messages=messages,
            stream=True,
        )

        for chunk in response_stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        logger.error(f"Error in chat stream: {e}")
        yield "Error in chat stream. Please try again."

def store_chat_history(username, messages):
    """Stores chat history in MongoDB"""
    try:
        chats_collection.update_one(
            {"username": username},
            {"$push": {"messages": messages}},
            upsert=True
        )
        logger.debug(f"✅ Successfully stored chat history for {username}")
    except Exception as e:
        logger.error(f"❌ Error storing chat history: {e}")

def filter_messages(messages):
    """Filters messages to keep only role and content."""
    return [{"role": msg["role"], "content": msg["content"]} for msg in messages if "role" in msg and "content" in msg]

def update_user_stats(username, stat_type, increment=1):
    """Updates user statistics"""
    try:
        users_collection.update_one(
            {"username": username},
            {"$inc": {f"stats.{stat_type}": increment}},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Error updating user stats: {e}")

@chat_router.post("/ask")
async def chat(
    user_prompt: str = Body(...),
    username: str = Body(...),
    isQuiz: bool = Body(False),
    isLearningPath: bool = Body(False)
):
    """Handles chat requests (both normal and streaming responses)"""
    try:
        logger.info(f"👤 User: {user_prompt} | 🆔 Username: {username}")

        user_timestamp = datetime.datetime.utcnow()

        chat_session = chats_collection.find_one({"username": username}) or {}
        prev_5_messages = chat_session.get("messages", [])[-10:] if "messages" in chat_session else []
        prev_5_messages = [msg for msg in prev_5_messages if msg.get("type") != "learning_path"]
        user_message = {
            "role": "user",
            "content": user_prompt,
            "type": "content",
            "timestamp": user_timestamp
        }
        
        if not isQuiz: 
            store_chat_history(username, user_message)
        prev_5_messages.append(user_message)

        if isQuiz:
            user_prompt = f"{user_prompt} {CALCULATE_SCORE}"
            # Update quiz stats
            update_user_stats(username, "totalQuizzes")
        
        # Case 1: Learning Path JSON generation 
        if isLearningPath:
            user_preferences = chat_session.get("preferences", {})
            prompt_with_preference = LEARNING_PATH_PROMPT.format(
                userRole=user_preferences.get("userRole", "Student"),
                timeValue=user_preferences.get("timeValue", 5),
                language=user_preferences.get("language", "English"),
                ageGroup=user_preferences.get("ageGroup", "Under 18")
            )

            user_message = {
                "role": "user",
                "content": user_prompt,
                "type": "learning_path",
                "timestamp": user_timestamp
            }
            store_chat_history(username, user_message)
            result = process_learning_path_query(user_prompt, username, generate_response, extract_json, store_chat_history, REGENRATE_OR_FILTER_JSON, prompt_with_preference)
            return JSONResponse(content=result)

        # Case 2 : Stream prompt
        # Get user preferences from user collection
        user = users_collection.find_one({"username": username})
        user_language = "English"  # Default to English
        if user and "preferences" in user:
            user_language = user["preferences"].get("language", "English")
        
        # Generate language-specific prompt
        language_specific_prompt = get_basic_environment_prompt(user_language)
        user_prompt = f"{user_prompt} {language_specific_prompt}"

        async def chat_stream():
            response_content = ""
            async for token in generate_chat_stream(filter_messages(prev_5_messages)):
                if token:  # Ensure token is not None
                    response_content += token
                    yield token

            response_timestamp = datetime.datetime.utcnow()
            response_message = {
                "role": "assistant",
                "content": response_content,
                "type": "content",
                "timestamp": response_timestamp
            }
            store_chat_history(username, response_message)

        return StreamingResponse(chat_stream(), media_type="text/plain")

    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        response_timestamp = datetime.datetime.utcnow()
        response_message = {
            "role": "assistant",
            "content": "There seems to be some error on our side, Please try again later.",
            "type": "content",
            "timestamp": response_timestamp
        }
        store_chat_history(username, response_message)
        return JSONResponse(status_code=500, content={"detail": str(e)})

@chat_router.get("/history")
async def get_chat_history(username: str):
    logger.info(f"Fetching Chat History for: {username}")

    chat_session = chats_collection.find_one({"username": username})
    
    if not chat_session:
        return {"history": []}
    
    messages = chat_session.get("messages", [])
    return {"history": messages}

# Save path functionality has been completely removed

@chat_router.get("/get-all-goals")
async def get_all_goals(username: str):
    """Retrieves all learning goals for a given user."""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session or "learning_goals" not in chat_session:
            return {"learning_goals": []}  # Return empty list if no goals found
        
        return {"learning_goals": chat_session["learning_goals"]}
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        logger.error(f"❌ Error type: {type(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        
        # Return default stats on error to prevent frontend crashes
        return {"learning_goals": []}

@chat_router.delete("/delete-goal")
async def delete_learning_goal(username: str = Body(...), goal_name: str = Body(...)):
    """Deletes a specific learning goal."""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session or "learning_goals" not in chat_session:
            raise HTTPException(status_code=404, detail="No learning goals found for this user")

        learning_goals = chat_session["learning_goals"]
        updated_goals = [goal for goal in learning_goals if goal["name"] != goal_name]

        if len(updated_goals) == len(learning_goals):
            raise HTTPException(status_code=404, detail="Learning goal not found")

        chats_collection.update_one(
            {"username": username},
            {"$set": {"learning_goals": updated_goals}}
        )

        # Update user stats
        update_user_stats(username, "totalGoals", -1)

        return {"message": f"Learning goal '{goal_name}' deleted successfully"}
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.put("/update-goal")
async def update_learning_goal(
    username: str = Body(...), 
    goal_name: str = Body(...), 
    updated_goal: dict = Body(...)
):
    """Updates a specific learning goal."""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session or "learning_goals" not in chat_session:
            raise HTTPException(status_code=404, detail="No learning goals found for this user")

        learning_goals = chat_session["learning_goals"]
        goal_index = next((i for i, goal in enumerate(learning_goals) if goal["name"] == goal_name), None)

        if goal_index is None:
            raise HTTPException(status_code=404, detail="Learning goal not found")

        # Update the goal while preserving the original structure
        learning_goals[goal_index].update(updated_goal)
        learning_goals[goal_index]["updated_at"] = datetime.datetime.utcnow()

        chats_collection.update_one(
            {"username": username},
            {"$set": {"learning_goals": learning_goals}}
        )

        return {"message": f"Learning goal '{goal_name}' updated successfully"}
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.get("/user-stats")
async def get_user_stats(username: str):
    """Retrieves user statistics."""
    try:
        logger.info(f"📊 Fetching user stats for: {username}")
        
        # Get stats from user collection
        user = users_collection.find_one({"username": username})
        if not user:
            logger.warning(f"⚠️ User not found in users collection: {username}")
            # Create default user stats if user doesn't exist
            default_stats = {
                "totalGoals": 0,
                "completedGoals": 0,
                "totalQuizzes": 0,
                "averageScore": 0,
                "streakDays": 0,
                "totalStudyTime": 0
            }
            return default_stats

        # Get real-time data from chat collection
        chat_session = chats_collection.find_one({"username": username})
        learning_goals = chat_session.get("learning_goals", []) if chat_session else []
        
        # Calculate stats
        total_goals = len(learning_goals)
        completed_goals = sum(1 for goal in learning_goals if goal.get("progress", 0) >= 100)
        
        # Count quiz messages in chat history - Fixed the error here
        messages = chat_session.get("messages", []) if chat_session else []
        quiz_messages = []
        for msg in messages:
            content = msg.get("content", "")
            # Ensure content is a string before calling .lower()
            if isinstance(content, str) and "quiz" in content.lower():
                quiz_messages.append(msg)
        
        total_quizzes = len(quiz_messages)
        
        # Update user stats
        updated_stats = {
            "totalGoals": total_goals,
            "completedGoals": completed_goals,
            "totalQuizzes": total_quizzes,
            "averageScore": user.get("stats", {}).get("averageScore", 0),
            "streakDays": user.get("stats", {}).get("streakDays", 0),
            "totalStudyTime": user.get("stats", {}).get("totalStudyTime", 0)
        }
        
        users_collection.update_one(
            {"username": username},
            {"$set": {"stats": updated_stats}}
        )

        logger.info(f"✅ User stats calculated successfully: {updated_stats}")
        return updated_stats
        
    except Exception as e:
        logger.error(f"❌ Error in get_user_stats: {str(e)}")
        logger.error(f"❌ Error type: {type(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        
        # Return default stats on error to prevent frontend crashes
        default_stats = {
            "totalGoals": 0,
            "completedGoals": 0,
            "totalQuizzes": 0,
            "averageScore": 0,
            "streakDays": 0,
            "totalStudyTime": 0
        }
        return default_stats

@chat_router.get("/assessments")
async def get_assessments(username: str):
    """Retrieves user assessments/quiz history."""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            return {"assessments": []}

        messages = chat_session.get("messages", [])
        assessments = []

        # Extract quiz-related messages and create assessment records
        for i, message in enumerate(messages):
            content = message.get("content", "")
            # Ensure content is a string before calling .lower()
            if isinstance(content, str) and "quiz" in content.lower() and message.get("role") == "user":
                # Look for the AI response that follows
                ai_response = None
                if i + 1 < len(messages) and messages[i + 1].get("role") == "assistant":
                    ai_response = messages[i + 1].get("content", "")

                # Determine assessment type and subject
                assessment_type = "Quiz"
                subject = "General"
                
                if "python" in content.lower():
                    subject = "Python Programming"
                elif "javascript" in content.lower() or "js" in content.lower():
                    subject = "JavaScript"
                elif "math" in content.lower():
                    subject = "Mathematics"
                elif "science" in content.lower():
                    subject = "Science"

                # Generate a mock score (in real implementation, this would be calculated)
                import random
                score = f"{random.randint(6, 10)}/10"
                
                assessment = {
                    "id": f"quiz_{i}",
                    "type": f"{subject} {assessment_type}",
                    "subject": subject,
                    "date": message.get("timestamp", datetime.datetime.utcnow().isoformat() + "Z"),
                    "score": score,
                    "status": "completed" if ai_response else "pending"
                }
                assessments.append(assessment)

        # Add some sample pending assessments if none exist
        if not assessments:
            sample_assessments = [
                {
                    "id": "sample_1",
                    "type": "Python Basics Quiz",
                    "subject": "Python Programming",
                    "date": datetime.datetime.utcnow(),
                    "score": "0/10",
                    "status": "pending"
                },
                {
                    "id": "sample_2",
                    "type": "Mathematics Quiz",
                    "subject": "Mathematics",
                    "date": datetime.datetime.utcnow(),
                    "score": "0/10",
                    "status": "pending"
                }
            ]
            assessments.extend(sample_assessments)

        return {"assessments": assessments}
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@chat_router.delete("/clear")
async def clear_chat(username: str):
    """Clears the chat history for a specific user."""
    try:
        result = chats_collection.update_one(
            {"username": username},
            {"$set": {"messages": []}}
        )

        if result.matched_count == 0:
            return {"message": "No chat history found for this user."}

        return {"message": "Chat history cleared successfully."}
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# New API to store user preferences
@chat_router.post("/save-preferences")
async def save_preferences(username: str = Body(...), preferences: dict = Body(...)):
    """Stores user preferences in the database."""
    try:
        if not isinstance(preferences, dict):
            raise HTTPException(status_code=400, detail="Preferences must be a valid JSON object")

        # Update preferences in both users and chats collections
        users_collection.update_one(
            {"username": username},
            {"$set": {"preferences": preferences}},
            upsert=True
        )

        chats_collection.update_one(
            {"username": username},
            {"$set": {"preferences": preferences}},
            upsert=True
        )

        return {"message": "Preferences saved successfully."}
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@chat_router.get("/analytics")
async def get_chat_analytics(username: str, days: int = 30):
    """Get chat analytics for user"""
    try:
        # This is a placeholder implementation - in a real app, you'd query the database
        # and generate actual analytics based on the user's chat history
        
        # Generate some sample data for the frontend
        sample_data = []
        today = datetime.datetime.now()
        
        for i in range(days):
            date = (today - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
            
            # Generate random counts for user and assistant messages
            import random
            user_count = random.randint(0, 10)
            assistant_count = random.randint(0, 10)
            
            # Add user messages data
            if user_count > 0:
                sample_data.append({
                    "_id": {
                        "date": date,
                        "role": "user"
                    },
                    "count": user_count,
                    "avg_length": random.randint(20, 100)
                })
            
            # Add assistant messages data
            if assistant_count > 0:
                sample_data.append({
                    "_id": {
                        "date": date,
                        "role": "assistant"
                    },
                    "count": assistant_count,
                    "avg_length": random.randint(100, 500)
                })
        
        return {"analytics": sample_data}
        
    except Exception as e:
        logger.error(f"❌ Analytics error: {str(e)}")
        return {"analytics": []}

@chat_router.get("/search")
async def search_messages(username: str, query: str):
    """Search messages using simple text matching"""
    try:
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session:
            return {"messages": []}
        
        messages = chat_session.get("messages", [])
        
        # Simple text search implementation
        results = []
        for msg in messages:
            content = msg.get("content", "")
            if isinstance(content, str) and query.lower() in content.lower():
                results.append(msg)
        
        return {"messages": results}
        
    except Exception as e:
        logger.error(f"❌ Search error: {str(e)}")
        return {"messages": []}