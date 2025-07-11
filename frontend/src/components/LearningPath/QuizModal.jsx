import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, ProgressBar, Spinner } from 'react-bootstrap';
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Clock
} from 'react-bootstrap-icons';
import { getQuizByTopic, submitQuizForScore, markTopicComplete } from '../../api';
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
      const quiz = await getQuizByTopic(topic.name);
      setQuizData(quiz);
      setTimeLeft(quiz.time_limit * 60); // Convert minutes to seconds
      startCountdown();
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
      setError('Failed to load quiz. Please try again.');
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
      
      const result = await submitQuizForScore(quizId, answersArray);

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
        
        onComplete?.({
          passed,
          score: result.score_percentage,
          answers: answersArray
        });
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const formattedTimeLeft = `${Math.floor(timeLeft / 60)}:${timeLeft % 60 < 10 ? '0' : ''}${timeLeft % 60}`;

  if (!quizData) {
    return null;
  }

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Trophy className="me-2" />
          Quiz: {topic.name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger">
            {error}
          </Alert>
        )}

        <div className="quiz-timer mb-3 d-flex justify-content-end align-items-center">
          <Clock className="me-1" />
          <div>{formattedTimeLeft}</div>
        </div>

        <Form>
          {quizData.questions.map((question, index) => (
            <Form.Group key={index} className="mb-3">
              <Form.Label>{index + 1}. {question.text}</Form.Label>
                  <div className="quiz-options">
                {question.type === 'short_answer' ? (
                  <Form.Control
                    type="text"
                    placeholder="Enter your answer here..."
                    value={userAnswers[index] || ''}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    className="short-answer-input"
                  />
                ) : (
                  question.options.map((option, i) => (
                    <Form.Check 
                      type="radio"
                      key={i}
                      name={`question-${index}`}
                      label={option}
                      onChange={() => handleAnswerChange(index, option)}
                      checked={userAnswers[index] === option}
                    />
                  ))
                )}
              </div>
            </Form.Group>
          ))}
        </Form>
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
