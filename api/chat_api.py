"""
Enhanced Chat API with new database structure
"""
from fastapi import APIRouter, HTTPException, Query, Body, Request
from fastapi.responses import StreamingResponse
from services.chat_service import chat_service
from services.learning_service import learning_service
from models.schemas import MessageType
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

chat_router = APIRouter()

@chat_router.post("/ask")
async def chat_endpoint(
    request: Request,
    user_prompt: str = Body(...),
    username: str = Body(...),
    isQuiz: bool = Body(False),
    isLearningPath: bool = Body(False)
):
    """Enhanced chat endpoint with new database structure"""
    try:
        logger.info(f"👤 User: {user_prompt} | 🆔 Username: {username}")
        
        # Get client info for session
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent", "Unknown")
        
        # Create or get session
        session_id = await chat_service.create_session(username, client_ip, user_agent)
        
        # Determine message type
        message_type = MessageType.CONTENT
        if isLearningPath:
            message_type = MessageType.LEARNING_PATH
        elif isQuiz:
            message_type = MessageType.QUIZ
        
        # Store user message
        await chat_service.store_message(
            username=username,
            session_id=session_id,
            role="user",
            content=user_prompt,
            message_type=message_type
        )
        
        # Process based on type
        if isLearningPath:
            return await process_learning_path_request(username, session_id, user_prompt)
        elif isQuiz:
            return await process_quiz_request(username, session_id, user_prompt)
        else:
            return await process_chat_request(username, session_id, user_prompt)
            
    except Exception as e:
        logger.error(f"❌ Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail="Chat service temporarily unavailable")

async def process_chat_request(username: str, session_id: str, user_prompt: str):
    """Process regular chat request with streaming"""
    try:
        # Import here to avoid circular imports
        from chat import generate_chat_stream, BASIC_ENVIRONMENT_PROMPT
        
        # Get recent chat history for context
        history_result = await chat_service.get_chat_history(username, session_id, limit=10)
        recent_messages = []
        
        if history_result.success:
            recent_messages = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in history_result.data["messages"]
                if msg.get("message_type") != "learning_path"
            ]
        
        # Add current prompt
        enhanced_prompt = f"{user_prompt} {BASIC_ENVIRONMENT_PROMPT}"
        recent_messages.append({"role": "user", "content": enhanced_prompt})
        
        async def chat_stream():
            response_content = ""
            try:
                async for token in generate_chat_stream(recent_messages):
                    if token:
                        response_content += token
                        yield token
                
                # Store assistant response
                await chat_service.store_message(
                    username=username,
                    session_id=session_id,
                    role="assistant",
                    content=response_content,
                    message_type=MessageType.CONTENT
                )
                
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                error_message = "I'm experiencing technical difficulties. Please try again later."
                yield error_message
                
                await chat_service.store_message(
                    username=username,
                    session_id=session_id,
                    role="assistant",
                    content=error_message,
                    message_type=MessageType.CONTENT
                )
        
        return StreamingResponse(chat_stream(), media_type="text/plain")
        
    except Exception as e:
        logger.error(f"Chat processing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat request")

async def process_learning_path_request(username: str, session_id: str, user_prompt: str):
    """Process learning path generation request"""
    try:
        # Import here to avoid circular imports
        from learning_path import process_learning_path_query
        from chat import generate_response
        from utils import extract_json
        from constants import LEARNING_PATH_PROMPT, REGENRATE_OR_FILTER_JSON
        
        # Get user preferences for learning path generation
        from services.user_service import user_service
        user = await user_service.get_user_by_username(username)
        preferences = user.get("preferences", {}) if user else {}
        
        # Format prompt with preferences
        prompt_with_preference = LEARNING_PATH_PROMPT.format(
            userRole=preferences.get("user_role", "Student"),
            timeValue=preferences.get("time_value", 15),
            language=preferences.get("language", "English"),
            ageGroup=preferences.get("age_group", "Above 18")
        )
        
        # Store chat history function
        async def store_chat_history(username, message):
            await chat_service.store_message(
                username=username,
                session_id=session_id,
                role=message["role"],
                content=message["content"],
                message_type=MessageType.LEARNING_PATH
            )
        
        # Process learning path query
        result = process_learning_path_query(
            user_prompt, username, generate_response, extract_json,
            store_chat_history, REGENRATE_OR_FILTER_JSON, prompt_with_preference
        )
        
        # If successful, create learning goal
        if result.get("response") == "JSON" and result.get("content"):
            learning_goal_data = {
                "name": result["content"].get("name", "AI Generated Learning Path"),
                "description": result["content"].get("description", ""),
                "duration": result["content"].get("course_duration", ""),
                "study_plans": [result["content"]],
                "tags": result["content"].get("tags", [])
            }
            
            await learning_service.create_learning_goal(username, learning_goal_data)
        
        return result
        
    except Exception as e:
        logger.error(f"Learning path processing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process learning path request")

async def process_quiz_request(username: str, session_id: str, user_prompt: str):
    """Process quiz generation request"""
    try:
        # Import here to avoid circular imports
        from chat import generate_response
        from constants import CALCULATE_SCORE
        
        enhanced_prompt = f"{user_prompt} {CALCULATE_SCORE}"
        response = generate_response(enhanced_prompt)
        
        # Store assistant response
        await chat_service.store_message(
            username=username,
            session_id=session_id,
            role="assistant",
            content=response,
            message_type=MessageType.QUIZ
        )
        
        return {"response": response, "type": "quiz"}
        
    except Exception as e:
        logger.error(f"Quiz processing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process quiz request")

@chat_router.get("/history")
async def get_chat_history(username: str = Query(...), limit: int = Query(50)):
    """Get chat history for user"""
    try:
        result = await chat_service.get_chat_history(username, limit=limit)
        
        if not result.success:
            raise HTTPException(status_code=404, detail=result.message)
        
        return {"history": result.data["messages"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"History error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")

@chat_router.delete("/clear")
async def clear_chat_history(username: str = Query(...)):
    """Clear chat history for user"""
    try:
        result = await chat_service.clear_chat_history(username)
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.message)
        
        return {"message": result.message}
        
    except Exception as e:
        logger.error(f"Clear history error: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear chat history")

@chat_router.get("/search")
async def search_messages(username: str = Query(...), query: str = Query(...)):
    """Search messages using full-text search"""
    try:
        result = await chat_service.search_messages(username, query)
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.message)
        
        return result.data
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Failed to search messages")

@chat_router.get("/analytics")
async def get_chat_analytics(username: str = Query(...), days: int = Query(30)):
    """Get chat analytics for user"""
    try:
        result = await chat_service.get_message_analytics(username, days)
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.message)
        
        return result.data
        
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get analytics")

@chat_router.post("/archive")
async def archive_old_messages(days_old: int = Body(90)):
    """Archive old messages (admin only)"""
    try:
        result = await chat_service.archive_old_messages(days_old)
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.message)
        
        return result.data
        
    except Exception as e:
        logger.error(f"Archive error: {e}")
        raise HTTPException(status_code=500, detail="Failed to archive messages")