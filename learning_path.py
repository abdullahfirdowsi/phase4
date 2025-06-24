# learning_path.py
import json
import datetime

def process_learning_path_query(user_prompt, username, generate_response, extract_json, store_chat_history, REGENRATE_OR_FILTER_JSON, LEARNING_PATH_PROMPT, retry_count=0, max_retries=3):
    """Processes a learning path query, generating and validating JSON responses."""
    print("📚 Learning Path Query Detected")
    print(" Trying to generate Learning Path , Retry Count = " + str(retry_count))
    if retry_count < max_retries:
        print(f"🔄 Retrying JSON generation (attempt {retry_count + 1})...")

    if retry_count > 0:
        modified_prompt = f"{user_prompt} {REGENRATE_OR_FILTER_JSON}"
    else:
        modified_prompt = f"{user_prompt} {LEARNING_PATH_PROMPT}"

    response_content = generate_response(modified_prompt)
    response_timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    
    # Check if response is empty or None
    if not response_content or not response_content.strip():
        print("❌ Empty response from AI model")
        if retry_count < max_retries - 1:
            print("🔄 Retrying due to empty response...")
            return process_learning_path_query(
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
            
            store_chat_history(username, error_response)
            return {
                "response": "ERROR",
                "type": "content",
                "timestamp": response_timestamp,
                "content": error_message
            }

    print(f"📝 AI Response length: {len(response_content)} characters")
    print(f"📝 First 200 chars: {response_content[:200]}...")

    try:
        # Clean the response content first
        cleaned_content = response_content.strip()
        
        # Try to parse the JSON directly
        learning_path_json = json.loads(cleaned_content)
        
        # Validate the JSON structure
        if not isinstance(learning_path_json, dict):
            raise ValueError("Response is not a valid JSON object")
            
        if "topics" not in learning_path_json or not isinstance(learning_path_json["topics"], list):
            raise ValueError("Missing or invalid 'topics' field in JSON")
            
        print("✅ Successfully parsed and validated JSON")
        
        # Store the response
        response_message = {
            "role": "assistant",
            "content": learning_path_json,
            "type": "learning_path",
            "timestamp": response_timestamp
        }
        
        response_data = {
            "response": "JSON",
            "type": "learning_path",
            "timestamp": response_timestamp,
            "content": learning_path_json
        }
        
        store_chat_history(username, response_message)
        return response_data

    except (json.JSONDecodeError, ValueError) as e:
        print(f"❌ JSON parsing error: {str(e)}")
        print(f"📝 Raw response content: {repr(response_content[:500])}")
        
        # Try to extract JSON from text using utility function
        parsedData = extract_json(response_content)
        
        if parsedData and isinstance(parsedData, dict):
            # Validate extracted JSON
            if "topics" in parsedData and isinstance(parsedData["topics"], list):
                print("✅ Successfully extracted and validated JSON from text")
                response_message = {
                    "role": "assistant",
                    "content": parsedData,
                    "type": "learning_path",
                    "timestamp": response_timestamp
                }
                
                response_data = {
                    "response": "JSON",
                    "type": "learning_path",
                    "timestamp": response_timestamp,
                    "content": parsedData
                }
                
                store_chat_history(username, response_message)
                return response_data
        
        # If we're here, JSON extraction failed or validation failed
        print("❌ Failed to parse learning path JSON, retrying...")
        
        if retry_count < max_retries - 1:
            # Try again with more explicit instructions
            return process_learning_path_query(
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
            
            store_chat_history(username, error_response)
            return {
                "response": "ERROR",
                "type": "content",
                "timestamp": response_timestamp,
                "content": error_message
            }
