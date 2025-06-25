import React, { useState, useEffect } from "react";
import { Container, Form, Button, Card, Row, Col, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { ChatDots, Book, ClipboardCheck, Lightbulb, ArrowRight, Clock, Trophy, Star } from "react-bootstrap-icons";
import { getUserStats, getAllLearningGoals, getAssessments } from "../../../api";
import "./DashboardHome.scss";

const DashboardHome = () => {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [learningGoals, setLearningGoals] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setStatsLoading(true);
    try {
      // Fetch user stats, learning goals, and assessments in parallel
      const [stats, goals, userAssessments] = await Promise.all([
        getUserStats(),
        getAllLearningGoals(),
        getAssessments()
      ]);
      
      setUserStats(stats);
      setLearningGoals(goals || []);
      setAssessments(userAssessments || []);
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) {
      setError("Please enter a question or topic");
      return;
    }

    setIsLoading(true);
    
    // Store the question in sessionStorage to use in the chat page
    sessionStorage.setItem("initialQuestion", inputValue.trim());
    
    // Navigate to chat page after a brief delay to show loading state
    setTimeout(() => {
      navigate("/dashboard/chat", { replace: true });
    }, 300);
  };

  const handleQuickStart = (suggestion) => {
    setInputValue(suggestion);
    // Submit the form after a short delay to allow the input to update visually
    setTimeout(() => {
      sessionStorage.setItem("initialQuestion", suggestion.trim());
      setIsLoading(true);
      navigate("/dashboard/chat", { replace: true });
    }, 100);
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return "success";
    if (progress >= 50) return "info";
    if (progress >= 25) return "warning";
    return "danger";
  };

  return (
    <div className="enhanced-dashboard-home">
      <Container className="dashboard-container">
        {/* Hero Section with AI Input */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="welcome-title">
              Welcome, {localStorage.getItem("name") || "Learner"}!
            </h1>
            <p className="welcome-subtitle">
              What would you like to learn today?
            </p>

            <Form onSubmit={handleSubmit} className="search-form">
              <div className="input-wrapper">
                <Form.Control
                  type="text"
                  placeholder="Ask anything or create a learning path..."
                  value={inputValue}
                  onChange={handleInputChange}
                  className="search-input"
                  disabled={isLoading}
                  autoFocus
                />
                <Button 
                  type="submit" 
                  className={`submit-button ${!inputValue.trim() ? 'disabled' : ''}`}
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <ChatDots size={18} />
                      <span>Ask</span>
                    </>
                  )}
                </Button>
              </div>
              {error && <div className="error-message">{error}</div>}
            </Form>

            <div className="suggestion-chips">
              <Button 
                variant="outline-primary" 
                className="suggestion-chip"
                onClick={() => handleQuickStart("Create a learning path for JavaScript")}
                disabled={isLoading}
              >
                JavaScript learning path
              </Button>
              <Button 
                variant="outline-primary" 
                className="suggestion-chip"
                onClick={() => handleQuickStart("Generate a quiz about world history")}
                disabled={isLoading}
              >
                History quiz
              </Button>
              <Button 
                variant="outline-primary" 
                className="suggestion-chip"
                onClick={() => handleQuickStart("Explain quantum computing")}
                disabled={isLoading}
              >
                Quantum computing
              </Button>
            </div>
          </div>
        </section>

        {/* Quick Access Cards */}
        <section className="quick-access-section">
          <Row className="g-4">
            <Col lg={4} md={6}>
              <Card className="quick-access-card chat-card" onClick={() => handleNavigate('/dashboard/chat')}>
                <Card.Body>
                  <div className="card-icon">
                    <ChatDots size={24} />
                  </div>
                  <div className="card-content">
                    <h3>AI Chat</h3>
                    <p>Ask questions, get explanations, and receive personalized help</p>
                    <Button variant="link" className="card-action">
                      Start chatting <ArrowRight size={16} />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={4} md={6}>
              <Card className="quick-access-card learning-card" onClick={() => handleNavigate('/dashboard/learning-paths')}>
                <Card.Body>
                  <div className="card-icon">
                    <Book size={24} />
                  </div>
                  <div className="card-content">
                    <h3>Learning Paths</h3>
                    <p>Follow structured learning paths tailored to your goals</p>
                    <Button variant="link" className="card-action">
                      View paths <ArrowRight size={16} />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={4} md={6}>
              <Card className="quick-access-card quiz-card" onClick={() => handleNavigate('/dashboard/quiz-system')}>
                <Card.Body>
                  <div className="card-icon">
                    <ClipboardCheck size={24} />
                  </div>
                  <div className="card-content">
                    <h3>Quiz System</h3>
                    <p>Test your knowledge with interactive quizzes and assessments</p>
                    <Button variant="link" className="card-action">
                      Take a quiz <ArrowRight size={16} />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </section>

        {/* Learning Progress & Stats */}
        <section className="progress-section">
          <Row className="g-4">
            <Col lg={8}>
              <Card className="progress-card">
                <Card.Header>
                  <h3>
                    <Book className="me-2" />
                    Your Learning Progress
                  </h3>
                </Card.Header>
                <Card.Body>
                  {statsLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-3">Loading your progress...</p>
                    </div>
                  ) : learningGoals.length > 0 ? (
                    <div className="learning-goals-list">
                      {learningGoals.slice(0, 3).map((goal, index) => (
                        <div key={index} className="learning-goal-item">
                          <div className="goal-info">
                            <h4>{goal.name}</h4>
                            <div className="goal-meta">
                              <span className="goal-duration">
                                <Clock size={14} className="me-1" />
                                {goal.duration || "Not specified"}
                              </span>
                              <Badge bg={getProgressColor(goal.progress || 0)} className="progress-badge">
                                {Math.round(goal.progress || 0)}% Complete
                              </Badge>
                            </div>
                          </div>
                          <div className="goal-progress">
                            <div className="progress">
                              <div 
                                className={`progress-bar bg-${getProgressColor(goal.progress || 0)}`} 
                                role="progressbar" 
                                style={{ width: `${goal.progress || 0}%` }} 
                                aria-valuenow={goal.progress || 0} 
                                aria-valuemin="0" 
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="continue-btn"
                            onClick={() => handleNavigate('/dashboard/learning-paths')}
                          >
                            Continue
                          </Button>
                        </div>
                      ))}
                      
                      {learningGoals.length > 3 && (
                        <div className="text-center mt-3">
                          <Button 
                            variant="link" 
                            onClick={() => handleNavigate('/dashboard/learning-paths')}
                          >
                            View all learning paths ({learningGoals.length})
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Lightbulb size={48} className="mb-3" />
                      <h4>No Learning Paths Yet</h4>
                      <p>Start by asking AI Tutor to create a personalized learning path for you.</p>
                      <Button 
                        variant="primary"
                        onClick={() => handleQuickStart("Create a learning path for Python programming")}
                      >
                        Create Your First Learning Path
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={4}>
              <Card className="stats-card">
                <Card.Header>
                  <h3>
                    <Trophy className="me-2" />
                    Your Stats
                  </h3>
                </Card.Header>
                <Card.Body>
                  {statsLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="stats-grid">
                      <div className="stat-item">
                        <div className="stat-icon">
                          <Book size={20} />
                        </div>
                        <div className="stat-content">
                          <div className="stat-value">{userStats?.totalGoals || 0}</div>
                          <div className="stat-label">Learning Paths</div>
                        </div>
                      </div>
                      
                      <div className="stat-item">
                        <div className="stat-icon">
                          <ClipboardCheck size={20} />
                        </div>
                        <div className="stat-content">
                          <div className="stat-value">{userStats?.totalQuizzes || 0}</div>
                          <div className="stat-label">Quizzes Taken</div>
                        </div>
                      </div>
                      
                      <div className="stat-item">
                        <div className="stat-icon">
                          <Trophy size={20} />
                        </div>
                        <div className="stat-content">
                          <div className="stat-value">{userStats?.completedGoals || 0}</div>
                          <div className="stat-label">Completed</div>
                        </div>
                      </div>
                      
                      <div className="stat-item">
                        <div className="stat-icon">
                          <Star size={20} />
                        </div>
                        <div className="stat-content">
                          <div className="stat-value">{userStats?.streakDays || 0}</div>
                          <div className="stat-label">Day Streak</div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
              
              {/* Recent Assessments */}
              <Card className="assessments-card mt-4">
                <Card.Header>
                  <h3>
                    <ClipboardCheck className="me-2" />
                    Recent Assessments
                  </h3>
                </Card.Header>
                <Card.Body>
                  {statsLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : assessments.length > 0 ? (
                    <div className="assessments-list">
                      {assessments.slice(0, 3).map((assessment, index) => (
                        <div key={index} className="assessment-item">
                          <div className="assessment-info">
                            <div className="assessment-title">{assessment.type}</div>
                            <div className="assessment-date">{new Date(assessment.date).toLocaleDateString()}</div>
                          </div>
                          <div className="assessment-score">
                            <Badge bg={assessment.score.includes('10/10') ? 'success' : 'primary'}>
                              {assessment.score}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      
                      {assessments.length > 3 && (
                        <div className="text-center mt-3">
                          <Button 
                            variant="link" 
                            onClick={() => handleNavigate('/dashboard/quiz-system')}
                          >
                            View all assessments
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <ClipboardCheck size={32} className="mb-2" />
                      <p className="mb-2">No assessments yet</p>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleQuickStart("Generate a quiz about general knowledge")}
                      >
                        Take your first quiz
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </section>

        {/* Quick Tips Section */}
        <section className="tips-section">
          <Card className="tips-card">
            <Card.Body>
              <h3>
                <Lightbulb className="me-2" />
                Quick Tips
              </h3>
              <div className="tips-grid">
                <div className="tip-item">
                  <div className="tip-number">1</div>
                  <div className="tip-content">
                    <h4>Ask Specific Questions</h4>
                    <p>The more specific your questions, the better the AI can help you learn.</p>
                  </div>
                </div>
                
                <div className="tip-item">
                  <div className="tip-number">2</div>
                  <div className="tip-content">
                    <h4>Create Learning Paths</h4>
                    <p>Ask AI to create a learning path for any topic you want to master.</p>
                  </div>
                </div>
                
                <div className="tip-item">
                  <div className="tip-number">3</div>
                  <div className="tip-content">
                    <h4>Test Your Knowledge</h4>
                    <p>Generate quizzes to test what you've learned and identify knowledge gaps.</p>
                  </div>
                </div>
                
                <div className="tip-item">
                  <div className="tip-number">4</div>
                  <div className="tip-content">
                    <h4>Track Your Progress</h4>
                    <p>Monitor your learning journey through the stats and progress indicators.</p>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </section>
      </Container>
    </div>
  );
};

export default DashboardHome;