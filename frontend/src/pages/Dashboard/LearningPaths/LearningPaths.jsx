import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, ProgressBar, Modal, Form, Alert, Spinner } from "react-bootstrap";
import { 
  BookHalf, 
  Plus, 
  Clock, 
  Star, 
  PlayCircleFill, 
  Pencil, 
  Trash,
  Eye,
  Award,
  GraphUp
} from "react-bootstrap-icons";
import "./LearningPaths.scss";

const LearningPaths = () => {
  const [learningPaths, setLearningPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ difficulty: "", tags: "" });

  // Form state for creating new path
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    difficulty: "Beginner",
    duration: "",
    prerequisites: [],
    topics: [],
    tags: []
  });

  useEffect(() => {
    fetchLearningPaths();
  }, [filter]);

  const fetchLearningPaths = async () => {
    try {
      setLoading(true);
      const username = localStorage.getItem("username");
      const queryParams = new URLSearchParams({
        username,
        ...(filter.difficulty && { difficulty: filter.difficulty }),
        ...(filter.tags && { tags: filter.tags })
      });

      const response = await fetch(`/api/learning-paths/list?${queryParams}`);
      const data = await response.json();
      
      if (response.ok) {
        setLearningPaths(data.learning_paths || []);
      } else {
        setError(data.detail || "Failed to fetch learning paths");
      }
    } catch (error) {
      console.error("Error fetching learning paths:", error);
      setError("Failed to fetch learning paths");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePath = async () => {
    try {
      const username = localStorage.getItem("username");
      const response = await fetch("/api/learning-paths/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, path_data: formData })
      });

      const data = await response.json();
      
      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          name: "",
          description: "",
          difficulty: "Beginner",
          duration: "",
          prerequisites: [],
          topics: [],
          tags: []
        });
        fetchLearningPaths();
      } else {
        setError(data.detail || "Failed to create learning path");
      }
    } catch (error) {
      console.error("Error creating learning path:", error);
      setError("Failed to create learning path");
    }
  };

  const handleViewDetails = async (pathId) => {
    try {
      const username = localStorage.getItem("username");
      const response = await fetch(`/api/learning-paths/detail/${pathId}?username=${username}`);
      const data = await response.json();
      
      if (response.ok) {
        setSelectedPath(data.path);
        setShowDetailModal(true);
      } else {
        setError(data.detail || "Failed to fetch path details");
      }
    } catch (error) {
      console.error("Error fetching path details:", error);
      setError("Failed to fetch path details");
    }
  };

  const handleUpdateProgress = async (pathId, topicIndex, completed) => {
    try {
      const username = localStorage.getItem("username");
      const response = await fetch("/api/learning-paths/progress/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          path_id: pathId,
          topic_index: topicIndex,
          completed
        })
      });

      if (response.ok) {
        fetchLearningPaths();
        if (selectedPath && selectedPath.id === pathId) {
          handleViewDetails(pathId); // Refresh detail view
        }
      }
    } catch (error) {
      console.error("Error updating progress:", error);
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
      <div className="learning-paths-page">
        <Container fluid>
          <div className="loading-state">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading learning paths...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="learning-paths-page">
      <Container fluid>
        {/* Clean Header - Lesson Content Focus */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <BookHalf className="me-3" />
              My Learning Paths
            </h1>
            <p className="page-subtitle">
              Your personalized learning content and study materials
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Learning Content Grid - Clean Layout */}
        <div className="content-grid">
          {learningPaths.length > 0 ? (
            <Row className="g-4">
              {learningPaths.map((path) => (
                <Col lg={4} md={6} key={path.id}>
                  <Card className="lesson-content-card">
                    <Card.Body>
                      <div className="content-header">
                        <h5 className="content-title">{path.name}</h5>
                        <Badge bg={getDifficultyColor(path.difficulty)}>
                          {path.difficulty}
                        </Badge>
                      </div>
                      
                      <p className="content-description">{path.description}</p>
                      
                      <div className="content-meta">
                        <div className="meta-item">
                          <Clock size={14} />
                          <span>{path.duration}</span>
                        </div>
                        <div className="meta-item">
                          <BookHalf size={14} />
                          <span>{path.topics_count} lessons</span>
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
                          onClick={() => handleViewDetails(path.id)}
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
              <h3>No Learning Content Yet</h3>
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

        {/* Path Detail Modal */}
        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl">
          <Modal.Header closeButton>
            <Modal.Title>{selectedPath?.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedPath && (
              <div className="path-details">
                <Row>
                  <Col md={8}>
                    <div className="path-info">
                      <p className="description">{selectedPath.description}</p>
                      
                      <div className="path-stats">
                        <div className="stat-item">
                          <GraphUp className="stat-icon" />
                          <div>
                            <div className="stat-value">{Math.round(selectedPath.progress || 0)}%</div>
                            <div className="stat-label">Progress</div>
                          </div>
                        </div>
                        <div className="stat-item">
                          <Clock className="stat-icon" />
                          <div>
                            <div className="stat-value">{selectedPath.duration}</div>
                            <div className="stat-label">Duration</div>
                          </div>
                        </div>
                        <div className="stat-item">
                          <Award className="stat-icon" />
                          <div>
                            <div className="stat-value">{selectedPath.difficulty}</div>
                            <div className="stat-label">Difficulty</div>
                          </div>
                        </div>
                      </div>

                      <div className="topics-section">
                        <h5>Lessons</h5>
                        {selectedPath.topics?.map((topic, index) => (
                          <Card key={index} className="topic-card">
                            <Card.Body>
                              <div className="topic-header">
                                <h6>{topic.name}</h6>
                                <Form.Check
                                  type="checkbox"
                                  checked={topic.completed || false}
                                  onChange={(e) => handleUpdateProgress(
                                    selectedPath.id, 
                                    index, 
                                    e.target.checked
                                  )}
                                />
                              </div>
                              <p className="topic-description">{topic.description}</p>
                              {topic.time_required && (
                                <small className="text-muted">
                                  <Clock size={12} className="me-1" />
                                  {topic.time_required}
                                </small>
                              )}
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="path-sidebar">
                      <Card>
                        <Card.Header>
                          <h6>Learning Information</h6>
                        </Card.Header>
                        <Card.Body>
                          <div className="info-item">
                            <strong>Created:</strong>
                            <span>{new Date(selectedPath.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="info-item">
                            <strong>Prerequisites:</strong>
                            <div>
                              {selectedPath.prerequisites?.length > 0 ? (
                                selectedPath.prerequisites.map((prereq, index) => (
                                  <Badge key={index} bg="secondary" className="me-1 mb-1">
                                    {prereq}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted">None</span>
                              )}
                            </div>
                          </div>
                          <div className="info-item">
                            <strong>Topics:</strong>
                            <div>
                              {selectedPath.tags?.map((tag, index) => (
                                <Badge key={index} bg="primary" className="me-1 mb-1">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  </Col>
                </Row>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
            <Button variant="primary">
              <PlayCircleFill size={16} className="me-2" />
              Continue Learning
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default LearningPaths;