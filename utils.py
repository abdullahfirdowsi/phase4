# utils.py
import json
import re

def extract_json(text):
    """Extracts JSON from a string with comprehensive error handling."""
    if not text or not text.strip():
        print("❌ Empty or null text provided to extract_json")
        return None
    
    print(f"🔍 Attempting to extract JSON from text (length: {len(text)})")
    
    # Try to find JSON in code blocks (markdown format)
    code_block_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
    code_matches = re.findall(code_block_pattern, text)
    
    if code_matches:
        print(f"📋 Found {len(code_matches)} code block(s)")
        for i, match in enumerate(code_matches):
            try:
                cleaned_match = match.strip()
                if cleaned_match:
                    result = json.loads(cleaned_match)
                    print(f"✅ Successfully parsed JSON from code block {i+1}")
                    return result
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse code block {i+1}: {str(e)}")
                continue
    
    # Try to find JSON with curly braces - improved pattern
    json_pattern = r'({[^{}]*(?:{[^{}]*}[^{}]*)*})'
    json_matches = re.findall(json_pattern, text)
    
    if json_matches:
        print(f"🔍 Found {len(json_matches)} potential JSON object(s)")
        for i, match in enumerate(json_matches):
            try:
                cleaned_match = match.strip()
                if cleaned_match and cleaned_match.startswith('{') and cleaned_match.endswith('}'):
                    result = json.loads(cleaned_match)
                    print(f"✅ Successfully parsed JSON object {i+1}")
                    return result
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse JSON object {i+1}: {str(e)}")
                continue
    
    # Try to extract the entire text as JSON
    try:
        cleaned_text = text.strip()
        if cleaned_text:
            result = json.loads(cleaned_text)
            print("✅ Successfully parsed entire text as JSON")
            return result
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse entire text as JSON: {str(e)}")
        pass
    
    # Try to clean up the text and parse again with more aggressive cleaning
    cleaned_text = text.strip()
    if cleaned_text.startswith('{') and cleaned_text.endswith('}'):
        try:
            # Remove common problematic characters
            cleaned_text = cleaned_text.replace('\\/', '/')
            cleaned_text = re.sub(r'\\(?!["\\bfnrt/])', '', cleaned_text)  # Remove invalid escapes
            
            result = json.loads(cleaned_text)
            print("✅ Successfully parsed JSON after cleaning")
            return result
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse cleaned JSON: {str(e)}")
            pass
    
    # Last resort: try to find the largest valid JSON object
    start_idx = text.find('{')
    if start_idx != -1:
        brace_count = 0
        for i, char in enumerate(text[start_idx:], start_idx):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    potential_json = text[start_idx:i+1]
                    try:
                        result = json.loads(potential_json)
                        print("✅ Successfully parsed JSON using brace matching")
                        return result
                    except json.JSONDecodeError:
                        break
    
    print("❌ Failed to extract JSON from text - all methods exhausted")
    print(f"📝 Text preview: {repr(text[:200])}...")
    return None
