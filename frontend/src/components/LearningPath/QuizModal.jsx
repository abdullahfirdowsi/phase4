import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, ProgressBar, Spinner } from 'react-bootstrap';
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Clock
} from 'react-bootstrap-icons';
import { getQuizByTopic, submitQuizForScore } from '../../api';
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
    }
    return () => clearInterval(intervalId);
  }, [show, topic]);

  const fetchQuiz = async () => {
    try {
      setError(null);
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
      const result = await submitQuizForScore(topic.id, answersArray);

      if (result) {
        const passed = result.score_percentage >= 80;
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
