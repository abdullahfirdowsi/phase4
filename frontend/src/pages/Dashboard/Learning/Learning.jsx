import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, ProgressBar, Modal, Alert, Spinner, Tabs, Tab } from "react-bootstrap";
import { 
  BookHalf, 
  Plus, 
  Clock, 
  Star, 
  PlayCircleFill, 
  Award,
  GraphUp,
  People,
  Eye
} from "react-bootstrap-icons";
import { getAllLearningGoals } from "../../../api";
import "./Learning.scss";

const Learning = () => {
  const [loading, setLoading] = useState(true);
  const [featuredLessons, setFeaturedLessons] = useState([]);
  const [myLearningPaths, setMyLearningPaths] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("my-learning");

  const username = localStorage.getItem("username");

  useEffect(() => {
    fetchLearningContent();
  }, []);

  const fetchLearningContent = async () => {
    try {
      setLoading(true);
      
      // Fetch user's learning paths
      const learningGoals = await getAllLearningGoals();
      setMyLearningPaths(learningGoals || []);
      
      // Fetch featured lessons (if available)
      try {
        const response = await fetch(`http://localhost:8000/lessons/lessons?username=${username}`);
        if (response.ok) {
          const lessonsData = await response.json();
          setFeaturedLessons(lessonsData.adminLessons || []);
        }
      } catch (error) {
        console.log("Featured lessons not available");
        setFeaturedLessons([]);
      }
      
    } catch (error) {
      console.error("Error fetching learning content:", error);
      setError("Failed to load learning content");
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
        fetchLearningContent();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to enroll in lesson");
      }
    } catch (error) {
      console.error("Error enrolling in lesson:", error);
      setError("Failed to enroll in lesson");
    }
  };

  const handleViewContent = async (contentId, contentType) => {
    try {
      if (contentType === "learning_path") {
        // Handle learning path details
        const pathData = myLearningPaths.find(path => path.name === contentId);
        if (pathData) {
          setSelectedContent({
            id: contentId,
            title: pathData.name,
            description: "Personalized learning path",
            content: pathData.study_plans,
            progress: pathData.progress,
            type: "learning_path"
          });
          setShowDetailModal(true);
          return;
        }
      } else if (contentType === "lesson") {
        // Handle lesson details
        const response = await fetch(`http://localhost:8000/lessons/lessons/${contentId}?username=${username}`);
        if (response.ok) {
          const data = await response.json();
          setSelectedContent(data.lesson);
          setShowDetailModal(true);
          return;
        }
      }
      
      setError("Failed to load content details");
    } catch (error) {
      console.error("Error fetching content details:", error);
      setError("Failed to load content details");
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
      <div className="learning-page">
        <Container fluid>
          <div className="loading-state">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading your learning content...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="learning-page">
      <Container fluid>
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <BookHalf className="me-3" />
              Learning
            </h1>
            <p className="page-subtitle">
              Your personalized learning journey and featured content
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

        {/* Tabbed Content */}
        <Tabs 
          activeKey={activeTab} 
          onSelect={(k) => setActiveTab(k)} 
          className="learning-tabs mb-4"
        >
          <Tab eventKey="my-learning" title={`My Learning (${myLearningPaths.length})`}>
            <div className="learning-content">
              {myLearningPaths.length > 0 ? (
                <Row className="g-4">
                  {myLearningPaths.map((path, index) => (
                    <Col lg={4} md={6} key={index}>
                      <Card className="learning-card my-learning-card">
                        <Card.Body>
                          <div className="content-header">
                            <h5 className="content-title">{path.name}</h5>
                            <Badge bg="primary">Personal</Badge>
                          </div>
                          
                          <div className="content-meta">
                            <div className="meta-item">
                              <Clock size={14} />
                              <span>{path.duration}</span>
                            </div>
                            <div className="meta-item">
                              <BookHalf size={14} />
                              <span>{path.study_plans?.length || 0} modules</span>
                            </div>
                          </div>

                          <div className="progress-section">
                            <div className="progress-header">
                              <span>Progress</span>
                              <span>{Math.round(path.progress || 0)}%</span>
                            </div>
                            <ProgressBar 
                              now={path.progress || 0} 
                              variant="primary"
                              className="content-progress"
                            />
                          </div>

                          <div className="content-actions">
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => handleViewContent(path.name, "learning_path")}
                              className="w-100"
                            >
                              <PlayCircleFill size={14} className="me-1" />
                              Continue Learning
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
                  <Button 
                    variant="primary"
                    onClick={() => window.location.href = '/dashboard/chat'}
                  >
                    <Plus size={16} className="me-2" />
                    Start Learning
                  </Button>
                </div>
              )}
            </div>
          </Tab>

          <Tab eventKey="featured" title={`Featured Content (${featuredLessons.length})`}>
            <div className="learning-content">
              {featuredLessons.length > 0 ? (
                <Row className="g-4">
                  {featuredLessons.map((lesson) => (
                    <Col lg={4} md={6} key={lesson._id}>
                      <Card className="learning-card featured-card">
                        <Card.Body>
                          <div className="content-header">
                            <div className="content-badges">
                              <Badge bg="warning" className="featured-badge">
                                <Star size={12} className="me-1" />
                                Featured
                              </Badge>
                              <Badge bg={getDifficultyColor(lesson.difficulty)}>
                                {lesson.difficulty}
                              </Badge>
                            </div>
                          </div>
                          
                          <h5 className="content-title">{lesson.title}</h5>
                          <p className="content-description">{lesson.description}</p>
                          
                          <div className="content-meta">
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

                          <div className="content-tags">
                            {lesson.tags?.slice(0, 3).map((tag, index) => (
                              <Badge key={index} bg="light" text="dark" className="me-1">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="content-actions">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => handleViewContent(lesson._id, "lesson")}
                              className="me-2"
                            >
                              <Eye size={14} className="me-1" />
                              View
                            </Button>
                            <Button 
                              variant="primary" 
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
                  <h3>No Featured Content</h3>
                  <p>Check back later for new featured lessons from our instructors.</p>
                </div>
              )}
            </div>
          </Tab>
        </Tabs>

        {/* Content Detail Modal */}
        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{selectedContent?.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedContent && (
              <div className="content-details">
                <div className="content-info">
                  <p className="description">{selectedContent.description}</p>
                  
                  {selectedContent.type === "learning_path" && (
                    <div className="learning-path-content">
                      <h5>Learning Modules</h5>
                      {selectedContent.content?.map((plan, index) => (
                        <Card key={index} className="module-card">
                          <Card.Body>
                            <h6>{plan.name || `Module ${index + 1}`}</h6>
                            <p>{plan.description}</p>
                            {plan.topics && (
                              <div className="topics-list">
                                <strong>Topics:</strong>
                                <ul>
                                  {plan.topics.slice(0, 3).map((topic, topicIndex) => (
                                    <li key={topicIndex}>{topic.name}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  )}

                  {selectedContent.type !== "learning_path" && selectedContent.content && (
                    <div className="lesson-content">
                      <h5>Lesson Content</h5>
                      <div className="content-preview">
                        {typeof selectedContent.content === 'string' ? (
                          <p>{selectedContent.content}</p>
                        ) : (
                          <p>Interactive lesson content available after enrollment.</p>
                        )}
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
            <Button variant="primary">
              <PlayCircleFill size={16} className="me-2" />
              {selectedContent?.type === "learning_path" ? "Continue Learning" : "Start Lesson"}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default Learning;