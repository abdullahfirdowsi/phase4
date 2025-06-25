# AI Quiz Generator - JSON Response Format

This document explains how to use the new AI Quiz Generator that creates interactive quizzes with JSON responses, similar to the AI Tutor chat examples you showed.

## Overview

The AI Quiz Generator creates quizzes that respond in structured JSON format, making them perfect for interactive learning experiences. The system generates both quiz questions and scoring results in a format consistent with your AI Tutor's JSON responses.

## Features

✅ **AI-Powered Question Generation** - Uses Groq AI to create contextual questions  
✅ **Multiple Question Types** - MCQ, True/False, and Short Answer  
✅ **JSON Response Format** - Consistent with AI Tutor chat format  
✅ **Automatic Scoring** - AI-powered result calculation with feedback  
✅ **Quiz History** - Track user progress and past quiz attempts  
✅ **Fallback System** - Ensures quizzes work even if AI generation fails  

## API Endpoints

### 1. Generate Quiz
**POST** `/quiz/generate-ai-quiz`

Generates a new quiz on any topic with AI-powered questions.

```json
{
  "username": "john_doe",
  "topic": "Python Programming",
  "difficulty": "medium",
  "num_questions": 5,
  "time_limit": 10
}
```

**Response Format:**
```json
{
  "response": "Here's your Python Programming quiz! Let's test your knowledge. Answer each question and I'll calculate your score at the end.\n\n",
  "type": "quiz",
  "quiz_data": {
    "quiz_id": "quiz_1703721234",
    "topic": "Python Programming",
    "difficulty": "medium",
    "total_questions": 3,
    "time_limit": 10,
    "questions": [
      {
        "question_number": 1,
        "question": "What is the correct way to define a function in Python?",
        "type": "mcq",
        "options": ["A) function myFunc():", "B) def myFunc():", "C) create myFunc():", "D) func myFunc():"],
        "correct_answer": "B",
        "explanation": "In Python, functions are defined using the 'def' keyword."
      }
    ]
  }
}
```

### 2. Submit Quiz
**POST** `/quiz/submit-ai-quiz`

Submit quiz answers and get AI-generated results with scoring.

```json
{
  "username": "john_doe",
  "quiz_id": "quiz_1703721234",
  "answers": ["B", "True", "class"]
}
```

**Response Format:**
```json
{
  "response": "Quiz completed! Here are your results:\n\nScore: 2/3 (66.7%)\n\nDetailed Results:\nQ1: ✓ B (Correct: B)\nQ2: ✓ True (Correct: True)\nQ3: ✗ cls (Correct: class)\n\nGood job! You're doing well, with room for minor improvements.",
  "type": "quiz_result",
  "score_data": {
    "total_questions": 3,
    "correct_answers": 2,
    "score_percentage": 66.7,
    "detailed_results": [
      {
        "question_number": 1,
        "question": "What is the correct way to define a function in Python?",
        "user_answer": "B",
        "correct_answer": "B",
        "is_correct": true,
        "explanation": "In Python, functions are defined using the 'def' keyword."
      }
    ],
    "feedback": "Good job! You're doing well, with room for minor improvements."
  }
}
```

### 3. Get Quiz History
**GET** `/quiz/quiz-history?username=john_doe`

Retrieve user's quiz history.

### 4. Get Active Quizzes
**GET** `/quiz/active-quizzes?username=john_doe`

Get user's incomplete quizzes.

## Usage Examples

### Frontend Integration

```javascript
// Generate a quiz
const generateQuiz = async (topic, difficulty = "medium", numQuestions = 5) => {
  const response = await fetch('/quiz/generate-ai-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: getCurrentUser(),
      topic,
      difficulty,
      num_questions: numQuestions,
      time_limit: numQuestions * 2 // 2 minutes per question
    })
  });
  
  const quizData = await response.json();
  
  // The response follows the same format as AI Tutor messages
  displayQuizMessage(quizData);
  
  return quizData.quiz_data.quiz_id;
};

// Submit quiz answers
const submitQuiz = async (quizId, answers) => {
  const response = await fetch('/quiz/submit-ai-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: getCurrentUser(),
      quiz_id: quizId,
      answers
    })
  });
  
  const resultData = await response.json();
  
  // Display results in the same format as AI Tutor messages
  displayQuizResults(resultData);
  
  return resultData.score_data;
};
```

### Chat Integration

You can integrate this with your existing chat system:

```javascript
// In your chat component
const handleQuizGeneration = (userMessage) => {
  if (userMessage.toLowerCase().includes('make a quiz') || 
      userMessage.toLowerCase().includes('create quiz')) {
    
    // Extract topic from message or prompt user
    const topic = extractTopicFromMessage(userMessage) || 'General Knowledge';
    
    // Generate quiz and add to chat
    generateQuiz(topic).then(quizId => {
      // Quiz response is automatically added to chat history
      setCurrentQuizId(quizId);
    });
  }
};

// Handle quiz answers in chat
const handleQuizAnswer = (userMessage, currentQuizId) => {
  if (currentQuizId && isQuizAnswer(userMessage)) {
    const answers = parseAnswersFromMessage(userMessage);
    
    submitQuiz(currentQuizId, answers).then(results => {
      // Results automatically added to chat history
      setCurrentQuizId(null);
    });
  }
};
```

## Testing

Run the test script to see the quiz generator in action:

```bash
# Make sure your server is running
python main.py

# In another terminal, run the test
python test_ai_quiz.py
```

The test script demonstrates:
- Quiz generation with different topics
- Answer submission and scoring
- Quiz history retrieval
- JSON format examples

## Configuration

### Environment Variables

Make sure these are set in your `.env` file:

```env
API_KEY=your_groq_api_key_here
MODEL_NAME=llama3-70b-8192
MONGODB_URI=your_mongodb_connection_string
```

### Supported Topics

The AI can generate quizzes on any topic, but some examples:

- **Programming:** Python, JavaScript, Java, C++, Web Development
- **Mathematics:** Algebra, Calculus, Statistics, Geometry
- **Science:** Physics, Chemistry, Biology, Computer Science
- **General:** History, Geography, Literature, Current Events

### Difficulty Levels

- **Easy:** Basic concepts, simple questions
- **Medium:** Intermediate understanding required
- **Hard:** Advanced topics, complex scenarios

## Error Handling

The system includes robust error handling:

1. **AI Generation Failure:** Falls back to predefined question templates
2. **Invalid Responses:** Attempts to extract JSON from malformed AI responses
3. **Network Issues:** Provides clear error messages
4. **Database Errors:** Graceful degradation with user feedback

## Integration with Existing System

The quiz generator integrates seamlessly with your existing AI Tutor:

1. **Chat History:** Quiz messages are stored in the same format as regular chat
2. **User Stats:** Quiz attempts update user statistics
3. **JSON Format:** Consistent with existing AI Tutor response structure
4. **Database:** Uses existing MongoDB collections with additional fields

## Performance Considerations

- **Caching:** Quiz templates are cached to reduce AI API calls
- **Fallback:** Predefined questions ensure system always works
- **Async:** All operations are asynchronous for better performance
- **Rate Limiting:** Respects AI API rate limits with proper error handling

## Future Enhancements

Potential improvements you could add:

1. **Adaptive Difficulty:** Questions get harder/easier based on performance
2. **Multiplayer Quizzes:** Real-time quiz competitions
3. **Visual Questions:** Support for images and diagrams
4. **Voice Integration:** Audio questions and answers
5. **Learning Analytics:** Advanced progress tracking and insights

## Support

If you encounter any issues:

1. Check the console logs for detailed error messages
2. Verify your API keys are correctly configured
3. Ensure MongoDB is running and accessible
4. Test with the provided test script first

The system is designed to be robust and will provide fallback functionality even if the AI service is unavailable.
