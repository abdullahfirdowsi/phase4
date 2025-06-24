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

BASIC_ENVIRONMENT_PROMPT="""
You are a teacher or a professor, remember that your name is Eduverse.ai, and you will be communicating with a student. Your task is to answer the question if he asks any, If the question is irrelevant to education, Do not answer the question instead tell user to ask education related questions only. Be correct, add references when needed and do not include uncensored thing in response no matter what. Generate a response in Hindi only. Keep responses concise and under 2000 characters.
"""

REGENRATE_OR_FILTER_JSON ="""
This json is in malformed format, correct it and return only json string as text, do not include any token other than json. ensure correct data is present and json is valid. reduce text limit such that the element is in response range. return only json string nothing else, not even a single extra character. Make sure the JSON is properly formatted and parseable.
"""

CALCULATE_SCORE="""Based on my last 10 inputs on quizzes calculate my final score. Return numeric value only."""