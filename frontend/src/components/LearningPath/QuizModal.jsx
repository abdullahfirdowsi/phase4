import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, ProgressBar, Spinner } from 'react-bootstrap';
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Clock
} from 'react-bootstrap-icons';
import { getQuizByTopic, submitQuizForScore, markTopicComplete, clearQuizCache } from '../../api';
import './QuizModal.scss';

const QuizModal = ({ 
  show, 
  topic, 
  onClose, 
  onComplete, 
  isProcessing
}) => {
  const [quizData, setQuizData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  useEffect(() => {
    if (show && topic) {
      fetchQuiz();
    } else if (!show) {
      // Reset state when modal is closed
      setUserAnswers({});
      setQuizData(null);
      setError(null);
      setIsSubmitting(false);
      setTimeLeft(0);
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [show, topic]); // Removed intervalId from dependencies to prevent infinite loop

  const fetchQuiz = async () => {
    try {
      setError(null);
      // Reset user answers when starting a new quiz
      setUserAnswers({});
      
      // Clear quiz cache to ensure we get a new unique quiz every time
      clearQuizCache();
      console.log('🗑️ Quiz cache cleared - generating new unique quiz for:', topic.name);
      
      // Show loading state
      setQuizData({ loading: true });
      
      const quiz = await getQuizByTopic(topic.name);
      
      // Validate quiz data
      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        throw new Error('Invalid quiz data received');
      }
      
      // Ensure questions have proper structure
      const validatedQuiz = {
        ...quiz,
        questions: quiz.questions.map((q, index) => ({
          ...q,
          id: q.id || index + 1,
          text: q.text || q.question || `Question ${index + 1}`,
          type: q.type || 'mcq',
          options: q.options || [],
          correct_answer: q.correct_answer || (q.options && q.options[0]) || 'A'
        }))
      };
      
      setQuizData(validatedQuiz);
      setTimeLeft((quiz.time_limit || 10) * 60); // Convert minutes to seconds
      startCountdown();
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
      setError(`Failed to load quiz: ${error.message}. Please try again.`);
      setQuizData(null);
    }
  };

  const startCountdown = () => {
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setIntervalId(id);
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return; // Prevent duplicate submissions
    setIsSubmitting(true);

    try {
      const answersArray = quizData.questions.map((_, i) => userAnswers[i] || '');
      
      // Use the quiz_id from the generated quiz data
      const quizId = quizData.quiz_id || topic.id || topic.name;
      console.log('🎯 Submitting quiz with ID:', quizId);
      console.log('📝 Answers being submitted:', answersArray);
      
      const result = await submitQuizForScore(quizId, answersArray);
      console.log('📊 Quiz evaluation result:', result);

      if (result) {
        const passed = result.score_percentage >= 80;
        
        // If quiz passed, mark topic as complete in backend
        if (passed && topic.topicIndex !== undefined) {
          try {
            await markTopicComplete(
              topic.learningPathId || 'unknown',
              topic.topicIndex,
              result.score_percentage
            );
          } catch (backendError) {
            console.warn('Failed to save topic completion to backend:', backendError);
          }
        }
        
        // Always call onComplete regardless of pass/fail status
        onComplete?.({
          passed,
          score: result.score_percentage,
          answers: answersArray,
          details: result.details || [],
          correct_answers: result.correct_answers || 0,
          total_questions: result.total_questions || answersArray.length
        });
      } else {
        // Handle case where result is null/undefined
        console.error('Quiz submission returned null result');
        setError('Quiz evaluation failed. Please try again.');
        return; // Don't close modal on failure
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz. Please try again.');
      return; // Don't close modal on error
    } finally {
      setIsSubmitting(false);
    }
    
    // Only close modal if submission was successful
    onClose();
  };

  const formattedTimeLeft = `${Math.floor(timeLeft / 60)}:${timeLeft % 60 < 10 ? '0' : ''}${timeLeft % 60}`;

  if (!show) {
    return null;
  }

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Trophy className="me-2" />
          Quiz: {topic?.name || 'Loading...'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger">
            <div className="d-flex justify-content-between align-items-center">
              <span>{error}</span>
              <Button 
                variant="outline-danger" 
                size="sm" 
                onClick={fetchQuiz}
              >
                Retry
              </Button>
            </div>
          </Alert>
        )}

        {/* Loading State */}
        {quizData?.loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p>Generating unique quiz questions...</p>
          </div>
        )}

        {/* Quiz Content */}
        {quizData && !quizData.loading && quizData.questions && (
          <>
            <div className="quiz-timer mb-3 d-flex justify-content-end align-items-center">
              <Clock className="me-1" />
              <div className={timeLeft < 60 ? 'text-danger fw-bold' : ''}>
                {formattedTimeLeft}
              </div>
            </div>

            <div className="quiz-progress mb-3">
              <small className="text-muted">
                Progress: {Object.keys(userAnswers).length} of {quizData.questions.length} questions answered
              </small>
              <ProgressBar 
                now={(Object.keys(userAnswers).length / quizData.questions.length) * 100} 
                size="sm" 
                className="mt-1"
              />
            </div>

            <Form>
              {quizData.questions.map((question, index) => (
                <Form.Group key={`${question.id || index}`} className="mb-4">
                  <Form.Label className="fw-bold">
                    {index + 1}. {question.text}
                  </Form.Label>
                  <div className="quiz-options mt-2">
                    {question.type === 'short_answer' ? (
                      <Form.Control
                        type="text"
                        placeholder="Enter your answer here..."
                        value={userAnswers[index] || ''}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        className="short-answer-input"
                      />
                    ) : (
                      question.options && question.options.length > 0 ? (
                        question.options.map((option, i) => (
                          <Form.Check 
                            type="radio"
                            key={`${index}-${i}`}
                            name={`question-${index}`}
                            label={option}
                            value={option}
                            onChange={() => handleAnswerChange(index, option)}
                            checked={userAnswers[index] === option}
                            className="mb-2"
                          />
                        ))
                      ) : (
                        <Alert variant="warning" className="mb-0">
                          No options available for this question.
                        </Alert>
                      )
                    )}
                  </div>
                </Form.Group>
              ))}
            </Form>
          </>
        )}

        {/* Empty State */}
        {!quizData && !error && (
          <div className="text-center py-5">
            <Trophy size={48} className="text-muted mb-3" />
            <p className="text-muted">No quiz data available.</p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isProcessing || isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmitQuiz} disabled={isProcessing || isSubmitting}>
          {isSubmitting ? (
            <div>
              <Spinner animation="border" size="sm" className="me-2" />
              Submitting...
            </div>
          ) : (
            'Submit Quiz'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QuizModal;
