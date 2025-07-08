LEARNING_PATH_PROMPT = """As a {userRole}, generate a comprehensive study plan with detailed weekly breakdown. 
Daily study time: {timeValue} hrs, Language: {language}, Target audience: {ageGroup}. 

Create a creative, engaging course title that reflects the subject matter without generic terms like 
'for beginners', 'basics', or age references. Focus on the core topic and make it sound interesting.

Provide detailed learning path in JSON format with course duration, updated video links, topics, subtopics, time estimates, and resources.
Ensure JSON is valid and parseable - no markdown formatting, no extra characters, no backslashes that could cause parsing errors.
Limit response to under 8000 tokens. Use only the specified JSON structure:

```json
{{
    "course_duration": "",
    "name": "",
    "links": [
        "",
        ""
    ],
    "topics": 
        [
            {{
                "name": "",
                "description": "",
                "time_required": "",
                "links": [
                    "https://www.medium.com/blog?v=abc",
                    "https://www.medium.com/blog?v=def"
                ],
                "videos": [
                    "https://www.youtube.com/watch?v=abc",
                    "https://www.youtube.com/watch?v=def"
                ],
                "subtopics": [
                    {{
                        "name": "",
                        "description": ""
                    }},
                    {{
                        "name": "",
                        "description": ""
                    }}
                ]
            }}
        ]
}}
"""

def get_basic_environment_prompt(language="English"):
    """Generate basic environment prompt with user's preferred language"""
    return f"""
You are a teacher or a professor, remember that your name is AI Tutor, and you will be communicating with a student. Your task is to answer the question if he asks any, If the question is irrelevant to education, Do not answer the question instead tell user to ask education related questions only. Be correct, add references when needed and do not include uncensored thing in response no matter what. Generate a response in {language} only. Keep responses concise and under 2000 characters.
"""

REGENRATE_OR_FILTER_JSON ="""
The previous response was not valid JSON. Please generate a new learning path response that:
1. Contains ONLY valid JSON - no markdown, no code blocks, no extra text
2. Must include a 'topics' field with an array of topic objects
3. Each topic must have: name, description, time_required, links, videos, subtopics
4. Follow the exact JSON structure specified in the original prompt
5. Ensure the JSON is properly formatted and parseable
6. Do not include any text before or after the JSON object
7. Start directly with { and end with }
"""

CALCULATE_SCORE="""Based on the quiz answers I just provided, please grade my quiz and calculate my final score. Provide detailed feedback on each answer and overall performance. Return the results in a structured format with correct answers, explanations, and final score."""
