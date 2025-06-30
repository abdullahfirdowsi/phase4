import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, ProgressBar, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { 
  PlayCircleFill, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trophy,
  Eye,
  Send,
  BarChart
} from 'react-bootstrap-icons';
import { submitQuiz } from '../../api';
import './QuizMessage.scss';

const QuizMessage = ({ message, onQuizComplete, username }) => {
  const navigate = useNavigate();
  const [quizData, setQuizData] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Parse quiz data from message content with enhanced error handling
    try {
      let parsedContent;
      
      console.log('🔍 QuizMessage received content:', {
        type: typeof message.content, 
        content: message.content,
        messageType: message.type,
        isString: typeof message.content === 'string',
        isObject: typeof message.content === 'object'
      });
      
      if (typeof message.content === 'string') {
        console.log('📝 Processing string content');
        // First try to parse the entire string as JSON
        try {
          parsedContent = JSON.parse(message.content);
          console.log('📝 Parsed entire string as JSON successfully');
        } catch (e) {
          // If that fails, try to extract JSON from string content
          const jsonMatch = message.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log('📝 Found JSON match:', jsonMatch[0].substring(0, 200) + '...');
            try {
              parsedContent = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
              console.warn('⚠️ Failed to parse extracted JSON:', parseError);
            }
          } else {
            console.log('❌ No JSON found in string content');
          }
        }
      } else if (typeof message.content === 'object' && message.content !== null) {
        console.log('📝 Using object content directly');
        parsedContent = message.content;
      }

      console.log('🔍 Parsed content result:', {
        parsedContent,
        hasQuizData: parsedContent && parsedContent.quiz_data,
        hasType: parsedContent && parsedContent.type,
        hasQuestions: parsedContent && parsedContent.questions,
        hasQuizId: parsedContent && parsedContent.quiz_id,
        hasResponse: parsedContent && parsedContent.response
      });

      // Multiple ways to extract quiz data with enhanced checks
      if (parsedContent && parsedContent.quiz_data) {
        setQuizData(parsedContent.quiz_data);
        console.log('📝 Using nested quiz_data:', parsedContent.quiz_data);
      } else if (parsedContent && parsedContent.type === 'quiz') {
        setQuizData(parsedContent);
        console.log('📝 Using direct quiz data (type=quiz):', parsedContent);
      } else if (parsedContent && parsedContent.questions && Array.isArray(parsedContent.questions)) {
        // Direct quiz structure without nested quiz_data
        setQuizData(parsedContent);
        console.log('📝 Using direct quiz structure:', parsedContent);
      } else if (parsedContent && parsedContent.quiz_id && parsedContent.topic) {
        // Quiz structure with quiz_id and topic but no type field
        setQuizData(parsedContent);
        console.log('📝 Using quiz structure with quiz_id:', parsedContent);
      } else if (parsedContent && parsedContent.response && parsedContent.quiz_data) {
        // Nested structure with response wrapper
        setQuizData(parsedContent.quiz_data);
        console.log('📝 Using quiz_data from response wrapper:', parsedContent.quiz_data);
      } else {
        console.warn('❌ Could not extract quiz data from content:', parsedContent);
        // Try a last resort - check if the content contains quiz keywords but failed parsing
        const contentStr = String(message.content || '').toLowerCase();
        if (contentStr.includes('quiz') && contentStr.includes('question')) {
          console.warn('🚨 Content seems to contain quiz data but parsing failed. Raw content:', message.content);
        }
      }
    } catch (error) {
      console.error('❌ Error parsing quiz data:', error);
      // Log the raw content for debugging
      console.error('❌ Raw message content that failed to parse:', message.content);
    }
  }, [message.content]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitQuiz(); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeRemaining]);

  const handleStartQuiz = () => {
    setIsActive(true);
    setTimeRemaining((quizData.time_limit || 10) * 60); // Convert to seconds
    setAnswers({});
    setError(null);
  };

  const handleAnswerChange = (questionNumber, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionNumber]: answer
    }));
  };

  const handleSubmitQuiz = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Convert answers object to array format
      const answersArray = [];
      const questions = quizData.questions || [];
      
      questions.forEach((question, index) => {
        const questionKey = question.question_number || index + 1;
        const userAnswer = answers[questionKey] || "";
        answersArray.push(userAnswer);
      });

      console.log('📤 Submitting chat quiz:', {
        quizId: quizData.quiz_id,
        answers: answersArray,
        answersObject: answers
      });

      // Submit to backend
      const result = await submitQuiz(quizData.quiz_id, answersArray);
      
      if (result) {
        setResult(result);
        setShowResult(true);
        setIsActive(false);
        
        // Save to localStorage for Quiz System
        const username = localStorage.getItem("username");
        const existingResults = localStorage.getItem(`quizResults_${username}`);
        let results = [];
        
        if (existingResults) {
          try {
            results = JSON.parse(existingResults);
          } catch (e) {
            console.error('Error parsing existing results:', e);
          }
        }
        
        // Add new result
        const newResult = {
          ...result,
          source: 'ai_chat',
          chat_message_id: message.id,
          created_from_chat: true
        };
        
        results.unshift(newResult); // Add to beginning
        localStorage.setItem(`quizResults_${username}`, JSON.stringify(results));
        
        // Also save the quiz itself for Quiz System
        const existingQuizzes = localStorage.getItem(`quizzes_${username}`);
        let quizzes = [];
        
        if (existingQuizzes) {
          try {
            quizzes = JSON.parse(existingQuizzes);
          } catch (e) {
            console.error('Error parsing existing quizzes:', e);
          }
        }
        
        // Check if quiz already exists
        const quizExists = quizzes.some(q => q.quiz_id === quizData.quiz_id);
        
        if (!quizExists) {
          const newQuiz = {
            id: quizData.quiz_id,
            quiz_id: quizData.quiz_id,
            title: `${quizData.topic || 'Chat'} Quiz`,
            description: `Quiz created from AI Chat about ${quizData.topic || 'various topics'}`,
            subject: quizData.topic || 'General',
            difficulty: quizData.difficulty || 'medium',
            time_limit: quizData.time_limit || 10,
            questions: quizData.questions || [],
            created_at: new Date().toISOString(),
            source: 'ai_chat'
          };
          
          quizzes.unshift(newQuiz); // Add to beginning
          localStorage.setItem(`quizzes_${username}`, JSON.stringify(quizzes));
        }
        
        // Notify parent component
        if (onQuizComplete) {
          onQuizComplete(result);
        }
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy": 
      case "beginner": 
        return "success";
      case "medium": 
      case "intermediate": 
        return "warning";
      case "hard": 
      case "advanced": 
        return "danger";
      default: return "secondary";
    }
  };

  if (!quizData) {
    return (
      <div className="quiz-message error">
        <Alert variant="warning">
          Unable to parse quiz data. This may be a malformed quiz.
        </Alert>
      </div>
    );
  }

  return (
    <div className="quiz-message">
      <Card className="quiz-card">
        <Card.Header className="quiz-header">
          <div className="quiz-title-section">
            <h5 className="quiz-title">
              <Trophy className="me-2" />
              {quizData.topic || 'Quiz'} Quiz
            </h5>
            <div className="quiz-badges">
              <Badge bg={getDifficultyColor(quizData.difficulty)}>
                {quizData.difficulty || 'Medium'}
              </Badge>
              <Badge bg="info" className="ms-2">
                {quizData.questions?.length || 0} Questions
              </Badge>
              <Badge bg="secondary" className="ms-2">
                <Clock size={12} className="me-1" />
                {quizData.time_limit || 10} min
              </Badge>
            </div>
          </div>
          
          {isActive && (
            <div className="quiz-timer">
              <Clock size={16} className="me-1" />
              <span className={timeRemaining <= 60 ? 'text-danger' : 'text-primary'}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </Card.Header>

        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {!isActive && !result && (
            <div className="quiz-start">
              <p className="quiz-description">
                Ready to test your knowledge? This quiz contains {quizData.questions?.length || 0} questions 
                and should take about {quizData.time_limit || 10} minutes to complete.
              </p>
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleStartQuiz}
                className="start-quiz-btn"
              >
                <PlayCircleFill className="me-2" />
                Start Quiz
              </Button>
            </div>
          )}

          {isActive && (
            <div className="quiz-questions">
              <div className="quiz-progress mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Progress: {Object.keys(answers).length}/{quizData.questions?.length || 0}</span>
                  <span>Time: {formatTime(timeRemaining)}</span>
                </div>
                <ProgressBar 
                  now={(Object.keys(answers).length / (quizData.questions?.length || 1)) * 100} 
                  variant="info"
                />
              </div>

              {quizData.questions?.map((question, index) => (
                <Card key={question.question_number || index + 1} className="question-card mb-3">
                  <Card.Body>
                    <h6 className="question-title">
                      Question {question.question_number || index + 1}: {question.question}
                    </h6>
                    
                    <div className="question-options mt-3">
                      {question.type === 'short_answer' ? (
                        <Form.Group>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Enter your answer here..."
                            value={answers[question.question_number || index + 1] || ''}
                            onChange={(e) => handleAnswerChange(
                              question.question_number || index + 1, 
                              e.target.value
                            )}
                          />
                        </Form.Group>
                      ) : (
                        question.options?.map((option, optIndex) => (
                          <Form.Check
                            key={optIndex}
                            type="radio"
                            id={`question_${question.question_number || index + 1}_option_${optIndex}`}
                            name={`question_${question.question_number || index + 1}`}
                            label={option}
                            value={option.startsWith('A) ') ? 'A' : 
                                   option.startsWith('B) ') ? 'B' : 
                                   option.startsWith('C) ') ? 'C' : 
                                   option.startsWith('D) ') ? 'D' : option}
                            onChange={(e) => handleAnswerChange(
                              question.question_number || index + 1, 
                              e.target.value
                            )}
                            checked={answers[question.question_number || index + 1] === 
                                    (option.startsWith('A) ') ? 'A' : 
                                     option.startsWith('B) ') ? 'B' : 
                                     option.startsWith('C) ') ? 'C' : 
                                     option.startsWith('D) ') ? 'D' : option)}
                          />
                        ))
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}

              <div className="quiz-actions mt-4">
                <Button 
                  variant="success" 
                  size="lg" 
                  onClick={handleSubmitQuiz}
                  disabled={isSubmitting || Object.keys(answers).length === 0}
                  className="submit-quiz-btn"
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="me-2" />
                      Submit Quiz ({Object.keys(answers).length}/{quizData.questions?.length || 0})
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Results Modal */}
      <Modal show={showResult} onHide={() => setShowResult(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Quiz Results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {result && (
            <div className="quiz-result-content">
              <div className="result-summary text-center mb-4">
                <div className="score-display">
                  <h2 className="score-percentage">
                    {Math.round(result.score_percentage || 0)}%
                  </h2>
                  <p className="score-details">
                    {result.correct_answers || 0} out of {result.total_questions || 0} correct
                  </p>
                  <ProgressBar 
                    now={result.score_percentage || 0} 
                    variant={result.score_percentage >= 80 ? "success" : 
                            result.score_percentage >= 60 ? "warning" : "danger"}
                    className="score-progress"
                  />
                </div>
              </div>

              <div className="result-actions text-center">
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setShowResult(false);
                    // Navigate to Quiz System to see detailed results
                    navigate('/dashboard/quiz-system?tab=results');
                  }}
                  className="me-2"
                >
                  <BarChart className="me-2" />
                  View Detailed Results
                </Button>
                <Button 
                  variant="outline-primary" 
                  onClick={() => setShowResult(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default QuizMessage;
