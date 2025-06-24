import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Modal, ProgressBar, Alert } from "react-bootstrap";
import { 
  BookHalf, 
  PlayCircleFill, 
  Clock, 
  Award,
  CheckCircle,
  Star,
  People,
  Eye
} from "react-bootstrap-icons";
import "./LessonsPage.scss";

const LessonsPage = () => {
  const [loading, setLoading] = useState(true);
  const [adminLessons, setAdminLessons] = useState([]);
  const [userLessons, setUserLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const username = localStorage.getItem("username");

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/lessons/lessons?username=${username}`);
      
      if (response.ok) {
        const data = await response.json();
        setAdminLessons(data.adminLessons || []);
        setUserLessons(data.myLessons || []);
      } else {
        setError("Failed to fetch lessons");
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
      setError("Failed to fetch lessons");
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollInLesson = async (lessonId) => {
    try {
      const response = await fetch("http://localhost:8000/lessons/lessons/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          lesson_id: lessonId
        })
      });

      if (response.ok) {
        setSuccess("Successfully enrolled in lesson!");
        fetchLessons();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to enroll in lesson");
      }
    } catch (error) {
      console.error("Error enrolling in lesson:", error);
      setError("Failed to enroll in lesson");
    }
  };

  const handleViewLesson = async (lessonId) => {
    try {
      const response = await fetch(`http://localhost:8000/lessons/lessons/${lessonId}?username=${username}`);
      
      if (response.ok) {
        const data = await response.json();
        setSelectedLesson(data.lesson);
        setShowDetailModal(true);
      } else {
        setError("Failed to load lesson details");
      }
    } catch (error) {
      console.error("Error fetching lesson details:", error);
      setError("Failed to load lesson details");
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner": return "success";
      case "intermediate": return "warning";
      case "advanced": return "danger";
      default: return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="lessons-page">
        <Container fluid>
          <div className="loading-state">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading lessons...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="lessons-page">
      <Container fluid>
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <BookHalf className="me-3" />
              Lessons
            </h1>
            <p className="page-subtitle">
              Explore admin-curated lessons and your personalized learning paths
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Admin Lessons Section */}
        <div className="lessons-section">
          <div className="section-header">
            <h2 className="section-title">
              <Award className="me-2" />
              Featured Lessons
            </h2>
            <p className="section-description">
              Curated lessons created by our expert instructors
            </p>
          </div>

          {adminLessons.length > 0 ? (
            <Row className="g-4">
              {adminLessons.map((lesson) => (
                <Col lg={4} md={6} key={lesson._id}>
                  <Card className="lesson-card admin-lesson">
                    <Card.Body>
                      <div className="lesson-header">
                        <div className="lesson-badges">
                          <Badge bg="primary" className="featured-badge">
                            <Star size={12} className="me-1" />
                            Featured
                          </Badge>
                          <Badge bg={getDifficultyColor(lesson.difficulty)}>
                            {lesson.difficulty}
                          </Badge>
                        </div>
                      </div>
                      
                      <h5 className="lesson-title">{lesson.title}</h5>
                      <p className="lesson-description">{lesson.description}</p>
                      
                      <div className="lesson-meta">
                        <div className="meta-item">
                          <Clock size={14} />
                          <span>{lesson.duration}</span>
                        </div>
                        <div className="meta-item">
                          <BookHalf size={14} />
                          <span>{lesson.subject}</span>
                        </div>
                        <div className="meta-item">
                          <People size={14} />
                          <span>{lesson.enrollments || 0} enrolled</span>
                        </div>
                      </div>

                      <div className="lesson-tags">
                        {lesson.tags?.slice(0, 3).map((tag, index) => (
                          <Badge key={index} bg="light" text="dark" className="me-1">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="lesson-actions">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => handleViewLesson(lesson._id)}
                        >
                          <Eye size={14} className="me-1" />
                          View Details
                        </Button>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handleEnrollInLesson(lesson._id)}
                        >
                          <PlayCircleFill size={14} className="me-1" />
                          Enroll
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <div className="empty-state">
              <Award size={64} className="empty-icon" />
              <h3>No Featured Lessons</h3>
              <p>Check back later for new featured lessons from our instructors.</p>
            </div>
          )}
        </div>

        {/* User Lessons Section */}
        <div className="lessons-section">
          <div className="section-header">
            <h2 className="section-title">
              <BookHalf className="me-2" />
              My Learning Paths
            </h2>
            <p className="section-description">
              Your personalized AI-generated learning journeys
            </p>
          </div>

          {userLessons.length > 0 ? (
            <Row className="g-4">
              {userLessons.map((lesson) => (
                <Col lg={4} md={6} key={lesson._id}>
                  <Card className="lesson-card user-lesson">
                    <Card.Body>
                      <div className="lesson-header">
                        <div className="lesson-badges">
                          <Badge bg="secondary">
                            Personal
                          </Badge>
                          <Badge bg={getDifficultyColor(lesson.difficulty)}>
                            {lesson.difficulty}
                          </Badge>
                        </div>
                      </div>
                      
                      <h5 className="lesson-title">{lesson.title}</h5>
                      <p className="lesson-description">{lesson.description}</p>
                      
                      <div className="lesson-meta">
                        <div className="meta-item">
                          <Clock size={14} />
                          <span>{lesson.duration}</span>
                        </div>
                        <div className="meta-item">
                          <BookHalf size={14} />
                          <span>{lesson.subject}</span>
                        </div>
                      </div>

                      <div className="progress-section">
                        <div className="progress-header">
                          <span>Progress</span>
                          <span>{Math.round(lesson.progress || 0)}%</span>
                        </div>
                        <ProgressBar 
                          now={lesson.progress || 0} 
                          variant="primary"
                          className="lesson-progress"
                        />
                      </div>

                      <div className="lesson-actions">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => handleViewLesson(lesson._id)}
                        >
                          <Eye size={14} className="me-1" />
                          View Details
                        </Button>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                        >
                          <PlayCircleFill size={14} className="me-1" />
                          Continue
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <div className="empty-state">
              <BookHalf size={64} className="empty-icon" />
              <h3>No Personal Learning Paths</h3>
              <p>Start a conversation with our AI tutor to create your first personalized learning path.</p>
              <Button variant="primary">
                <PlayCircleFill size={16} className="me-2" />
                Start Learning
              </Button>
            </div>
          )}
        </div>

        {/* Lesson Detail Modal */}
        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{selectedLesson?.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedLesson && (
              <div className="lesson-details">
                <div className="lesson-info">
                  <p className="description">{selectedLesson.description}</p>
                  
                  <div className="lesson-stats">
                    <div className="stat-item">
                      <Clock className="stat-icon" />
                      <div>
                        <div className="stat-value">{selectedLesson.duration}</div>
                        <div className="stat-label">Duration</div>
                      </div>
                    </div>
                    <div className="stat-item">
                      <BookHalf className="stat-icon" />
                      <div>
                        <div className="stat-value">{selectedLesson.subject}</div>
                        <div className="stat-label">Subject</div>
                      </div>
                    </div>
                    <div className="stat-item">
                      <Award className="stat-icon" />
                      <div>
                        <div className="stat-value">{selectedLesson.difficulty}</div>
                        <div className="stat-label">Difficulty</div>
                      </div>
                    </div>
                  </div>

                  {selectedLesson.content && (
                    <div className="lesson-content">
                      <h5>Lesson Content</h5>
                      <div className="content-preview">
                        {typeof selectedLesson.content === 'string' ? (
                          <p>{selectedLesson.content}</p>
                        ) : (
                          <p>Interactive lesson content available after enrollment.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedLesson.objectives && selectedLesson.objectives.length > 0 && (
                    <div className="learning-objectives">
                      <h5>Learning Objectives</h5>
                      <ul>
                        {selectedLesson.objectives.map((objective, index) => (
                          <li key={index}>{objective}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedLesson.prerequisites && selectedLesson.prerequisites.length > 0 && (
                    <div className="prerequisites">
                      <h5>Prerequisites</h5>
                      <div className="prereq-tags">
                        {selectedLesson.prerequisites.map((prereq, index) => (
                          <Badge key={index} bg="secondary" className="me-1 mb-1">
                            {prereq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
            {selectedLesson?.type === "admin_lesson" && (
              <Button 
                variant="primary"
                onClick={() => handleEnrollInLesson(selectedLesson._id)}
              >
                <PlayCircleFill size={16} className="me-2" />
                Enroll in Lesson
              </Button>
            )}
            {selectedLesson?.type === "user_lesson" && (
              <Button variant="primary">
                <PlayCircleFill size={16} className="me-2" />
                Continue Learning
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default LessonsPage;