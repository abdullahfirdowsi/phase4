LEARNING_PATH_PROMPT = """As a {userRole}, generate a study plan in very details, 
week by week. My daily spend time is {timeValue} hrs, my language preference is {language}, 
and my age group is {ageGroup}. 
Most importantly, your response for this query should be in JSON format with all details like course_duration, 
keep the videos links latest and updated, name, topics, subtopics, time required, links. 
Not a single character outside the JSON. Strict JSON format only. 
Do not format the JSON for markdown, just give pure string form which is directly convertible to JSON using JSON.parse().
Also remove any \\ or \\/ which may cause unexpected token error from the string. 
Strictly generate the entire response in less than 8000 tokens and the format should be strictly JSON only. 
The fields should be in this format only, there shouldn't be any extra field in the response:
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
