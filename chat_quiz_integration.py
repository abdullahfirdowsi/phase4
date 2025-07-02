# Using enhanced database with optimized collections
# chat_quiz_integration.py
"""
Example of how to integrate the AI Quiz Generator with your existing chat system
This shows how quiz requests can be detected and handled within the chat flow
"""

import re
import json
from typing import Optional, Dict, Any
from ai_quiz_generator import generate_ai_response, extract_json_from_response

def detect_quiz_request(user_message: str) -> Optional[Dict[str, Any]]:
    """
    Detect if user is requesting a quiz and extract parameters
    """
    message_lower = user_message.lower()
    
    # Quiz trigger phrases
    quiz_triggers = [
        "make a quiz", "create a quiz", "quiz me", "test me",
        "give me a quiz", "start a quiz", "quiz about",
        "test my knowledge", "create questions"
    ]
    
    # Check if message contains quiz triggers
    is_quiz_request = any(trigger in message_lower for trigger in quiz_triggers)
    
    if not is_quiz_request:
        return None
    
    # Extract topic from message
    topic = extract_topic_from_message(user_message)
    
    # Extract difficulty if mentioned
    difficulty = extract_difficulty_from_message(user_message)
    
    # Extract number of questions if mentioned
    num_questions = extract_num_questions_from_message(user_message)
    
    return {
        "type": "quiz_request",
        "topic": topic,
        "difficulty": difficulty,
        "num_questions": num_questions
    }

def extract_topic_from_message(message: str) -> str:
    """Extract topic from user message"""
    message_lower = message.lower()
    
    # Common topic patterns
    topic_patterns = [
        r"quiz (?:about|on|for) (.+?)(?:\s|$|,|\.)",
        r"(?:test|quiz) me (?:about|on|for) (.+?)(?:\s|$|,|\.)",
        r"create a (.+?) quiz",
        r"make a quiz about (.+?)(?:\s|$|,|\.)",
        r"(.+?) questions",
    ]
    
    for pattern in topic_patterns:
        match = re.search(pattern, message_lower)
        if match:
            topic = match.group(1).strip()
            # Clean up common words
            topic = re.sub(r'\b(the|a|an|some|my)\b', '', topic).strip()
            if topic:
                return topic.title()
    
    # Default topics based on keywords
    if any(word in message_lower for word in ['python', 'programming', 'code', 'coding']):
        return "Python Programming"
    elif any(word in message_lower for word in ['math', 'mathematics', 'algebra', 'calculus']):
        return "Mathematics"
    elif any(word in message_lower for word in ['science', 'physics', 'chemistry', 'biology']):
        return "Science"
    elif any(word in message_lower for word in ['history', 'historical', 'past']):
        return "History"
    
    return "General Knowledge"

def extract_difficulty_from_message(message: str) -> str:
    """Extract difficulty level from message"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ['easy', 'simple', 'basic', 'beginner']):
        return "easy"
    elif any(word in message_lower for word in ['hard', 'difficult', 'advanced', 'expert']):
        return "hard"
    else:
        return "medium"

def extract_num_questions_from_message(message: str) -> int:
    """Extract number of questions from message"""
    # Look for numbers in the message
    numbers = re.findall(r'\b(\d+)\b', message)
    
    for num_str in numbers:
        num = int(num_str)
        if 1 <= num <= 20:  # Reasonable range for quiz questions
            return num
    
    return 5  # Default

def create_quiz_response_prompt(topic: str, difficulty: str, num_questions: int) -> str:
    """Create a prompt for generating quiz in AI Tutor style"""
    return f"""
You are an AI Tutor responding to a student's request for a quiz. Create a {difficulty} level quiz about {topic} with {num_questions} questions.

Your response MUST be in this exact JSON format (no other text):
{{
    "response": "Here's your {topic} quiz! Let's test your knowledge. Answer each question and I'll calculate your score at the end.\\n\\n",
    "type": "quiz",
    "quiz_data": {{
        "quiz_id": "quiz_{int(time.time())}",
        "topic": "{topic}",
        "difficulty": "{difficulty}",
        "total_questions": {num_questions},
        "time_limit": {num_questions * 2},
        "questions": [
            {{
                "question_number": 1,
                "question": "Your question here",
                "type": "mcq",
                "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                "correct_answer": "A",
                "explanation": "Brief explanation"
            }}
        ]
    }}
}}

Make the questions relevant to {topic} at {difficulty} level. Include exactly {num_questions} questions with a mix of multiple choice, true/false, and short answer types.
"""

def handle_chat_with_quiz_integration(user_message: str, username: str) -> Dict[str, Any]:
    """
    Enhanced chat handler that can detect and generate quizzes
    This would integrate with your existing chat.py
    """
    
    # Check if this is a quiz request
    quiz_params = detect_quiz_request(user_message)
    
    if quiz_params:
        # Generate quiz using AI
        prompt = create_quiz_response_prompt(
            quiz_params["topic"],
            quiz_params["difficulty"], 
            quiz_params["num_questions"]
        )
        
        # Generate AI response
        ai_response = generate_ai_response(prompt)
        quiz_json = extract_json_from_response(ai_response)
        
        if quiz_json:
            # Store quiz in database (using existing chat storage)
            from database import chats_collection
            import datetime
            
            # Store as a chat message
            quiz_message = {
                "role": "assistant",
                "content": quiz_json,
                "type": "quiz",
                "timestamp": datetime.datetime.utcnow()
            }
            
            chats_collection.update_one(
                {"username": username},
                {"$push": {"messages": quiz_message}},
                upsert=True
            )
            
            # Also store quiz data for later submission
            quiz_data = {
                "quiz_id": quiz_json["quiz_data"]["quiz_id"],
                "username": username,
                "quiz_json": quiz_json,
                "created_at": datetime.datetime.utcnow(),
                "status": "active"
            }
            
            chats_collection.update_one(
                {"username": username},
                {"$push": {"active_quizzes": quiz_data}},
                upsert=True
            )
            
            return {
                "success": True,
                "response": quiz_json,
                "type": "quiz"
            }
        else:
            # Fallback response
            return {
                "success": False,
                "response": {
                    "response": f"I'd be happy to create a {quiz_params['topic']} quiz for you! However, I'm having trouble generating questions right now. Please try again in a moment.",
                    "type": "error"
                }
            }
    
    # If not a quiz request, handle normally
    return {
        "success": False,
        "response": None,
        "type": "normal_chat"
    }

def detect_quiz_answer(user_message: str, username: str) -> Optional[Dict[str, Any]]:
    """
    Detect if user is providing quiz answers
    """
    # Get user's active quizzes
    from database import chats_collection
    
    chat_session = chats_collection.find_one({"username": username})
    if not chat_session:
        return None
    
    active_quizzes = chat_session.get("active_quizzes", [])
    active_quiz = next((q for q in active_quizzes if q.get("status") == "active"), None)
    
    if not active_quiz:
        return None
    
    # Try to parse answers from message
    answers = parse_quiz_answers(user_message, active_quiz["quiz_json"]["quiz_data"])
    
    if answers:
        return {
            "quiz_id": active_quiz["quiz_id"],
            "answers": answers,
            "quiz_data": active_quiz["quiz_json"]["quiz_data"]
        }
    
    return None

def parse_quiz_answers(message: str, quiz_data: Dict[str, Any]) -> Optional[list]:
    """
    Parse quiz answers from user message
    """
    message = message.strip()
    total_questions = quiz_data["total_questions"]
    
    # Pattern 1: "A, B, C" or "A B C"
    pattern1 = re.findall(r'\b[A-D]\b', message.upper())
    if len(pattern1) == total_questions:
        return pattern1
    
    # Pattern 2: "1. A 2. B 3. C"
    pattern2 = re.findall(r'\d+[.)]\s*([A-D])', message.upper())
    if len(pattern2) == total_questions:
        return pattern2
    
    # Pattern 3: "True, False, True"
    pattern3 = re.findall(r'\b(True|False)\b', message, re.IGNORECASE)
    if len(pattern3) == total_questions:
        return [ans.title() for ans in pattern3]
    
    # Pattern 4: Mixed answers separated by commas or newlines
    answers = re.split(r'[,\n]', message)
    answers = [ans.strip() for ans in answers if ans.strip()]
    
    if len(answers) == total_questions:
        return answers
    
    return None

# Example usage in existing chat.py
def enhanced_chat_handler(user_prompt: str, username: str):
    """
    This would replace or enhance your existing chat handler
    """
    
    # First check if it's a quiz request
    quiz_result = handle_chat_with_quiz_integration(user_prompt, username)
    
    if quiz_result["success"]:
        # Return quiz response
        return quiz_result["response"]
    
    # Check if it's a quiz answer
    quiz_answer = detect_quiz_answer(user_prompt, username)
    
    if quiz_answer:
        # Submit the quiz and get results
        from ai_quiz_generator import calculate_fallback_score
        
        score_json = calculate_fallback_score(quiz_answer["quiz_data"], quiz_answer["answers"])
        
        # Store result and mark quiz as completed
        from database import chats_collection
        import datetime
        
        # Store result message
        result_message = {
            "role": "assistant",
            "content": score_json,
            "type": "quiz_result",
            "timestamp": datetime.datetime.utcnow()
        }
        
        chats_collection.update_one(
            {"username": username},
            {"$push": {"messages": result_message}},
            upsert=True
        )
        
        # Mark quiz as completed
        chats_collection.update_one(
            {"username": username, "active_quizzes.quiz_id": quiz_answer["quiz_id"]},
            {"$set": {"active_quizzes.$.status": "completed"}}
        )
        
        return score_json
    
    # Handle as normal chat if not quiz-related
    # (Your existing chat logic would go here)
    return handle_normal_chat(user_prompt, username)

def handle_normal_chat(user_prompt: str, username: str):
    """Placeholder for your existing chat logic"""
    # This would be your existing chat handling code
    return {
        "response": "This would be handled by your existing chat system",
        "type": "content"
    }

if __name__ == "__main__":
    # Test the quiz detection
    test_messages = [
        "Make a quiz about Python programming",
        "Create a hard math quiz with 10 questions",
        "Quiz me on science",
        "Can you test my knowledge of history?",
        "I want a simple quiz about JavaScript",
        "Just asking a normal question"
    ]
    
    for message in test_messages:
        result = detect_quiz_request(message)
        print(f"Message: {message}")
        print(f"Quiz detected: {result}")
        print("-" * 50)
