# learning_path.py
import json
import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_learning_path_query(user_prompt, username, generate_response, extract_json, store_chat_history, REGENRATE_OR_FILTER_JSON, LEARNING_PATH_PROMPT, retry_count=0, max_retries=3):
    """Processes a learning path query, generating and validating JSON responses."""
    logger.info("📚 Learning Path Query Detected")
    logger.info(f"🔄 Trying to generate Learning Path, Retry Count = {retry_count}")
    
    if retry_count < max_retries:
        logger.info(f"🔄 Retrying JSON generation (attempt {retry_count + 1})...")

    if retry_count > 0:
        # More specific instructions for retry attempts
        modified_prompt = f"{user_prompt} {REGENRATE_OR_FILTER_JSON}. IMPORTANT: Return ONLY valid JSON with 'topics' field containing an array of topic objects. Do not include any text before or after the JSON."
    else:
        modified_prompt = f"{user_prompt} {LEARNING_PATH_PROMPT}"

    response_content = generate_response(modified_prompt)
    response_timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    
    # Check if response is empty or None
    if not response_content or not isinstance(response_content, str) or not response_content.strip():
        logger.error("❌ Empty or invalid response from AI model")
        if retry_count < max_retries - 1:
            logger.info("🔄 Retrying due to empty response...")
            return await process_learning_path_query(
                user_prompt, 
                username, 
                generate_response, 
                extract_json, 
                store_chat_history, 
                REGENRATE_OR_FILTER_JSON, 
                LEARNING_PATH_PROMPT, 
                retry_count=retry_count + 1, 
                max_retries=max_retries
            )
        else:
            # Final fallback for empty response
            error_message = "I'm sorry, I couldn't generate a response. Please check your API configuration and try again."
            error_response = {
                "role": "assistant",
                "content": error_message,
                "type": "content",
                "timestamp": response_timestamp
            }
            
        try:
            await store_chat_history(username, error_response)
        except Exception as store_error:
            logger.error(f"❌ Error storing chat history: {store_error}")
        return {
            "response": "ERROR",
            "type": "content",
            "timestamp": response_timestamp,
            "content": error_message
        }

    logger.info(f"📝 AI Response length: {len(response_content)} characters")
    logger.info(f"📝 First 200 chars: {response_content[:200]}...")

    try:
        # Clean the response content first
        cleaned_content = response_content.strip()
        
        # Try to extract JSON using utility function first (handles markdown, extra text, etc.)
        learning_path_json = extract_json(cleaned_content)
        
        # If extract_json failed, try direct parsing as fallback
        if not learning_path_json:
            try:
                learning_path_json = json.loads(cleaned_content)
            except json.JSONDecodeError:
                raise ValueError("Could not parse JSON from response")
        
        # Validate the JSON structure
        if not isinstance(learning_path_json, dict):
            raise ValueError("Response is not a valid JSON object")
            
        if "topics" not in learning_path_json or not isinstance(learning_path_json["topics"], list):
            raise ValueError("Missing or invalid 'topics' field in JSON")
            
        logger.info("✅ Successfully parsed and validated JSON")
        
        # Store the response in chat history for display purposes only
        # NOT saving to learning goals collection - that will only happen when user clicks "Save Study Plan"
        response_message = {
            "role": "assistant",
            "content": json.dumps(learning_path_json) if isinstance(learning_path_json, dict) else learning_path_json,
            "type": "learning_path",
            "timestamp": response_timestamp
        }
        
        response_data = {
            "response": "JSON",
            "type": "learning_path",
            "timestamp": response_timestamp,
            "content": learning_path_json
        }
        
        try:
            await store_chat_history(username, response_message)
        except Exception as store_error:
            logger.error(f"❌ Error storing chat history: {store_error}")
        return response_data

    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"❌ JSON parsing error: {str(e)}")
        logger.error(f"📝 Raw response content: {repr(response_content[:500])}")
        
        # Try to extract JSON from text using utility function
        parsedData = extract_json(response_content)
        
        if parsedData and isinstance(parsedData, dict):
            # Validate extracted JSON
            if "topics" in parsedData and isinstance(parsedData["topics"], list):
                logger.info("✅ Successfully extracted and validated JSON from text")
                response_message = {
                    "role": "assistant",
                    "content": json.dumps(parsedData) if isinstance(parsedData, dict) else parsedData,
                    "type": "learning_path",
                    "timestamp": response_timestamp
                }
                
                response_data = {
                    "response": "JSON",
                    "type": "learning_path",
                    "timestamp": response_timestamp,
                    "content": parsedData
                }
                
                try:
                    await store_chat_history(username, response_message)
                except Exception as store_error:
                    logger.error(f"❌ Error storing chat history: {store_error}")
                return response_data
        
        # If we're here, JSON extraction failed or validation failed
        logger.error("❌ Failed to parse learning path JSON, retrying...")
        
        if retry_count < max_retries - 1:
            # Try again with more explicit instructions
            return await process_learning_path_query(
                user_prompt,  # Use original prompt, not the response
                username, 
                generate_response, 
                extract_json, 
                store_chat_history, 
                REGENRATE_OR_FILTER_JSON, 
                LEARNING_PATH_PROMPT, 
                retry_count=retry_count + 1, 
                max_retries=max_retries
            )
        else:
            # Final fallback - return error message
            error_message = "I'm sorry, I couldn't generate a valid learning path. Please try again with more specific details."
            error_response = {
                "role": "assistant",
                "content": error_message,
                "type": "content",
                "timestamp": response_timestamp
            }
            
            try:
                await store_chat_history(username, error_response)
            except Exception as store_error:
                logger.error(f"❌ Error storing chat history: {store_error}")
            return {
                "response": "ERROR",
                "type": "content",
                "timestamp": response_timestamp,
                "content": error_message
            }