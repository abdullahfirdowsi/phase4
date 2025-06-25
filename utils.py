# utils.py
import json
import re
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_json(text):
    """Extracts JSON from a string with comprehensive error handling."""
    if not text or not isinstance(text, str) or not text.strip():
        logger.error("❌ Empty, null, or non-string text provided to extract_json")
        return None
    
    logger.info(f"🔍 Attempting to extract JSON from text (length: {len(text)})")
    
    # Try to find JSON in code blocks (markdown format)
    code_block_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
    code_matches = re.findall(code_block_pattern, text)
    
    if code_matches:
        logger.info(f"📋 Found {len(code_matches)} code block(s)")
        for i, match in enumerate(code_matches):
            try:
                cleaned_match = match.strip()
                if cleaned_match:
                    result = json.loads(cleaned_match)
                    logger.info(f"✅ Successfully parsed JSON from code block {i+1}")
                    return result
            except json.JSONDecodeError as e:
                logger.error(f"❌ Failed to parse code block {i+1}: {str(e)}")
                continue
    
    # Try to find JSON with curly braces - use more comprehensive brace matching
    start_idx = text.find('{')
    if start_idx != -1:
        brace_count = 0
        potential_jsons = []
        
        for i, char in enumerate(text[start_idx:], start_idx):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    potential_json = text[start_idx:i+1]
                    potential_jsons.append(potential_json)
                    # Look for more JSON objects after this one
                    remaining_text = text[i+1:]
                    next_start = remaining_text.find('{')
                    if next_start != -1:
                        start_idx = i + 1 + next_start
                        brace_count = 0
                    else:
                        break
        
        if potential_jsons:
            logger.info(f"🔍 Found {len(potential_jsons)} potential JSON object(s) using brace matching")
            for i, potential_json in enumerate(potential_jsons):
                try:
                    cleaned_match = potential_json.strip()
                    if cleaned_match and cleaned_match.startswith('{') and cleaned_match.endswith('}'):
                        result = json.loads(cleaned_match)
                        logger.info(f"✅ Successfully parsed JSON object {i+1} using brace matching")
                        return result
                except json.JSONDecodeError as e:
                    logger.error(f"❌ Failed to parse JSON object {i+1}: {str(e)}")
                    continue
    
    # Try to extract the entire text as JSON
    try:
        cleaned_text = text.strip()
        if cleaned_text:
            result = json.loads(cleaned_text)
            logger.info("✅ Successfully parsed entire text as JSON")
            return result
    except json.JSONDecodeError as e:
        logger.error(f"❌ Failed to parse entire text as JSON: {str(e)}")
        pass
    
    # Try to clean up the text and parse again with more aggressive cleaning
    cleaned_text = text.strip()
    if cleaned_text.startswith('{') and cleaned_text.endswith('}'):
        try:
            # Remove common problematic characters
            cleaned_text = cleaned_text.replace('\\/', '/')
            cleaned_text = re.sub(r'\\(?!["\\bfnrt/])', '', cleaned_text)  # Remove invalid escapes
            
            result = json.loads(cleaned_text)
            logger.info("✅ Successfully parsed JSON after cleaning")
            return result
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse cleaned JSON: {str(e)}")
            pass
    
    # Additional pattern matching for specific JSON structures
    # Try to find JSON that might have extra text after it
    json_with_extra_pattern = r'({[\s\S]*?})\s*(?:[^{]|$)'
    extra_matches = re.findall(json_with_extra_pattern, text)
    
    if extra_matches:
        logger.info(f"🔍 Found {len(extra_matches)} JSON patterns with potential extra text")
        for i, match in enumerate(extra_matches):
            try:
                cleaned_match = match.strip()
                if cleaned_match and cleaned_match.startswith('{') and cleaned_match.endswith('}'):
                    result = json.loads(cleaned_match)
                    logger.info(f"✅ Successfully parsed JSON with extra text pattern {i+1}")
                    return result
            except json.JSONDecodeError as e:
                logger.error(f"❌ Failed to parse JSON pattern {i+1}: {str(e)}")
                continue
    
    logger.error("❌ Failed to extract JSON from text - all methods exhausted")
    logger.error(f"📝 Text preview: {repr(text[:200])}...")
    return None