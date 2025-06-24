import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Alert, ProgressBar } from "react-bootstrap";
import { 
  Trophy, 
  Plus, 
  Clock, 
  PlayCircleFill, 
  Eye,
  BarChart,
  CheckCircle,
  XCircle,
  Award,
  Bullseye
} from "react-bootstrap-icons";
import "./QuizSystem.scss";

const QuizSystem = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState(null);

  // Form state for creating quiz
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    difficulty: "medium",
    time_limit: 10,
    questions: []
  });

  useEffect(() => {
    fetchQuizzes();
    fetchQuizResults();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const username = localStorage.getItem("username");
      const response = await fetch(`/api/quiz/list?username=${username}`);
      const data = await response.json();
      
      if (response.ok) {
        setQuizzes(data.quizzes || []);
      } else {
        setError(data.detail || "Failed to fetch quizzes");
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      setError("Failed to fetch quizzes");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizResults = async () => {
    try {
      const username = localStorage.getItem("username");
      const response = await fetch(`/api/quiz/results?username=${username}`);
      const data = await response.json();
      
      if (response.ok) {
        setQuizResults(data.results || []);
      }
    } catch (error) {
      console.error("Error fetching quiz results:", error);
    }
  };

  const handleCreateQuiz = async () => {
    try {
      const username = localStorage.getItem("username");
      const response = await fetch("/api/quiz/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, quiz_data: formData })
      });

      const data = await response.json();
      
      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          title: "",
          description: "",
          subject: "",
          difficulty: "medium",
          time_limit: 10,
          questions: []
        });
        fetchQuizzes();
      } else {
        setError(data.detail || "Failed to create quiz");
      }
    } catch (error) {
      console.error("Error creating quiz:", error);
      setError("Failed to create quiz");
    }
  };

  const handleStartQuiz = async (quizId) => {
    try {
      const username = localStorage.getItem("username");
      const response = await fetch(`/api/quiz/detail/${quizId}?username=${username}`);
      const data = await response.json();
      
      if (response.ok) {
        setCurrentQuiz(data.quiz);
        setQuizAnswers({});
        setTimeRemaining(data.quiz.time_limit * 60); // Convert to seconds
        setShowQuizModal(true);
      } else {
        setError(data.detail || "Failed to load quiz");
      }
    } catch (error) {
      console.error("Error starting quiz:", error);
      setError("Failed to start quiz");
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      const username = localStorage.getItem("username");
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: currentQuiz.id,
          username,
          answers: quizAnswers
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setQuizResult(data.result);
        setShowQuizModal(false);
        setShowResultModal(true);
        fetchQuizResults();
      } else {
        setError(data.detail || "Failed to submit quiz");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      setError("Failed to submit quiz");
    }
  };

  const handleGenerateQuiz = async (topic) => {
    try {
      const username = localStorage.getItem("username");
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          topic,
          difficulty: "medium",
          num_questions: 5
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        fetchQuizzes();
        setError(null);
      } else {
        setError(data.detail || "Failed to generate quiz");
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      setError("Failed to generate quiz");
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy": return "success";
      case "medium": return "warning";
      case "hard": return "danger";
      default: return "secondary";
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Timer effect for quiz
  useEffect(() => {
    let interval;
    if (showQuizModal && timeRemaining > 0) {
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
  }, [showQuizModal, timeRemaining]);

  if (loading) {
    return (
      <div className="quiz-system-page">
        <Container fluid>
          <div className="loading-state">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading quiz system...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="quiz-system-page">
      <Container fluid>
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <Trophy className="me-3" />
              Quiz System
            </h1>
            <p className="page-subtitle">
              Test your knowledge and track your progress
            </p>
          </div>
          <div className="header-actions">
            <Button 
              variant="outline-primary" 
              className="me-2"
              onClick={() => handleGenerateQuiz("Python Programming")}
            >
              <Bullseye size={16} className="me-2" />
              Generate Quiz
            </Button>
            <Button 
              variant="primary" 
              className="create-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} className="me-2" />
              Create Quiz
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <div className="quiz-tabs">
          <Button 
            variant={activeTab === "available" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("available")}
          >
            Available Quizzes ({quizzes.length})
          </Button>
          <Button 
            variant={activeTab === "results" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("results")}
          >
            My Results ({quizResults.length})
          </Button>
        </div>

        {/* Content */}
        {activeTab === "available" ? (
          <div className="quizzes-grid">
            {quizzes.length > 0 ? (
              <Row className="g-4">
                {quizzes.map((quiz) => (
                  <Col lg={4} md={6} key={quiz.id}>
                    <Card className="quiz-card">
                      <Card.Body>
                        <div className="quiz-header">
                          <h5 className="quiz-title">{quiz.title}</h5>
                          <Badge bg={getDifficultyColor(quiz.difficulty)}>
                            {quiz.difficulty}
                          </Badge>
                        </div>
                        
                        <p className="quiz-description">{quiz.description}</p>
                        
                        <div className="quiz-meta">
                          <div className="meta-item">
                            <Clock size={14} />
                            <span>{quiz.time_limit} minutes</span>
                          </div>
                          <div className="meta-item">
                            <Trophy size={14} />
                            <span>{quiz.questions?.length || 0} questions</span>
                          </div>
                        </div>

                        <div className="quiz-actions">
                          <Button 
                            variant="primary" 
                            onClick={() => handleStartQuiz(quiz.id)}
                          >
                            <PlayCircleFill size={14} className="me-1" />
                            Start Quiz
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="empty-state">
                <Trophy size={64} className="empty-icon" />
                <h3>No Quizzes Available</h3>
                <p>Create your first quiz or generate one automatically to get started.</p>
                <div className="empty-actions">
                  <Button 
                    variant="primary" 
                    onClick={() => setShowCreateModal(true)}
                    className="me-2"
                  >
                    <Plus size={16} className="me-2" />
                    Create Quiz
                  </Button>
                  <Button 
                    variant="outline-primary"
                    onClick={() => handleGenerateQuiz("General Knowledge")}
                  >
                    <Bullseye size={16} className="me-2" />
                    Generate Quiz
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="results-grid">
            {quizResults.length > 0 ? (
              <Row className="g-4">
                {quizResults.map((result) => (
                  <Col lg={4} md={6} key={result.id}>
                    <Card className="result-card">
                      <Card.Body>
                        <div className="result-header">
                          <h6 className="result-title">{result.quiz_title}</h6>
                          <Badge 
                            bg={result.score_percentage >= 80 ? "success" : 
                                result.score_percentage >= 60 ? "warning" : "danger"}
                          >
                            {Math.round(result.score_percentage)}%
                          </Badge>
                        </div>
                        
                        <div className="result-stats">
                          <div className="stat-item">
                            <CheckCircle className="text-success" />
                            <span>{result.correct_answers} correct</span>
                          </div>
                          <div className="stat-item">
                            <XCircle className="text-danger" />
                            <span>{result.total_questions - result.correct_answers} incorrect</span>
                          </div>
                        </div>

                        <ProgressBar 
                          now={result.score_percentage} 
                          variant={result.score_percentage >= 80 ? "success" : 
                                  result.score_percentage >= 60 ? "warning" : "danger"}
                          className="result-progress"
                        />

                        <div className="result-date">
                          <small className="text-muted">
                            {new Date(result.submitted_at).toLocaleDateString()}
                          </small>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="empty-state">
                <BarChart size={64} className="empty-icon" />
                <h3>No Quiz Results</h3>
                <p>Take some quizzes to see your results and track your progress.</p>
                <Button 
                  variant="primary" 
                  onClick={() => setActiveTab("available")}
                >
                  Browse Quizzes
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quiz Taking Modal */}
        <Modal show={showQuizModal} onHide={() => setShowQuizModal(false)} size="lg" backdrop="static">
          <Modal.Header>
            <Modal.Title>{currentQuiz?.title}</Modal.Title>
            <div className="quiz-timer">
              <Clock size={16} className="me-1" />
              {formatTime(timeRemaining)}
            </div>
          </Modal.Header>
          <Modal.Body>
            {currentQuiz && (
              <div className="quiz-content">
                {currentQuiz.questions?.map((question, index) => (
                  <Card key={question.id} className="question-card mb-3">
                    <Card.Body>
                      <h6 className="question-title">
                        Question {index + 1}: {question.question}
                      </h6>
                      
                      {question.type === "mcq" && (
                        <div className="question-options">
                          {question.options?.map((option, optIndex) => (
                            <Form.Check
                              key={optIndex}
                              type="radio"
                              name={`question_${question.id}`}
                              label={option}
                              value={option}
                              onChange={(e) => setQuizAnswers({
                                ...quizAnswers,
                                [question.id]: e.target.value
                              })}
                              checked={quizAnswers[question.id] === option}
                            />
                          ))}
                        </div>
                      )}
                      
                      {question.type === "true_false" && (
                        <div className="question-options">
                          <Form.Check
                            type="radio"
                            name={`question_${question.id}`}
                            label="True"
                            value="true"
                            onChange={(e) => setQuizAnswers({
                              ...quizAnswers,
                              [question.id]: e.target.value
                            })}
                            checked={quizAnswers[question.id] === "true"}
                          />
                          <Form.Check
                            type="radio"
                            name={`question_${question.id}`}
                            label="False"
                            value="false"
                            onChange={(e) => setQuizAnswers({
                              ...quizAnswers,
                              [question.id]: e.target.value
                            })}
                            checked={quizAnswers[question.id] === "false"}
                          />
                        </div>
                      )}
                      
                      {question.type === "short_answer" && (
                        <Form.Control
                          type="text"
                          placeholder="Enter your answer..."
                          value={quizAnswers[question.id] || ""}
                          onChange={(e) => setQuizAnswers({
                            ...quizAnswers,
                            [question.id]: e.target.value
                          })}
                        />
                      )}
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowQuizModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitQuiz}>
              Submit Quiz
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Quiz Result Modal */}
        <Modal show={showResultModal} onHide={() => setShowResultModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Quiz Results</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {quizResult && (
              <div className="quiz-result-content">
                <div className="result-summary">
                  <div className="score-display">
                    <Award size={48} className="score-icon" />
                    <div className="score-text">
                      <h2>{Math.round(quizResult.score_percentage)}%</h2>
                      <p>{quizResult.correct_answers} out of {quizResult.total_questions} correct</p>
                    </div>
                  </div>
                </div>

                <div className="detailed-results">
                  <h5>Detailed Results</h5>
                  {quizResult.detailed_results?.map((result, index) => (
                    <Card key={index} className={`result-item ${result.is_correct ? 'correct' : 'incorrect'}`}>
                      <Card.Body>
                        <div className="result-question">
                          <strong>Q{index + 1}: {result.question}</strong>
                        </div>
                        <div className="result-answers">
                          <div className="user-answer">
                            <span className="label">Your answer:</span>
                            <span className={result.is_correct ? 'text-success' : 'text-danger'}>
                              {result.user_answer || "No answer"}
                            </span>
                          </div>
                          {!result.is_correct && (
                            <div className="correct-answer">
                              <span className="label">Correct answer:</span>
                              <span className="text-success">{result.correct_answer}</span>
                            </div>
                          )}
                        </div>
                        {result.explanation && (
                          <div className="explanation">
                            <small className="text-muted">{result.explanation}</small>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => setShowResultModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default QuizSystem;