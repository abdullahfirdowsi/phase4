import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, ProgressBar, Modal, Form, Alert, Spinner } from "react-bootstrap";
import { 
  BookHalf, 
  Plus, 
  Clock, 
  PlayCircleFill, 
  Award,
  GraphUp,
  CheckCircle,
  ExclamationCircle
} from "react-bootstrap-icons";
import { formatLocalDate } from "../../../utils/dateUtils";
import { getAllLearningPaths, updateLearningPathProgress } from "../../../api";
import "./LearningPaths.scss";

const LearningPaths = () => {
  const [learningPaths, setLearningPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);

  useEffect(() => {
    console.log('🚀 LearningPaths component mounted - fetching complete data');
    fetchLearningPaths();
  }, []);

  const fetchLearningPaths = async () => {
    try {
      setLoading(true);
      setError(null);
      const username = localStorage.getItem("username");
      
      if (!username) {
        setError("Please log in to view your learning paths");
        setLoading(false);
        return;
      }
      
      console.log('📡 Fetching complete learning paths with topics for user:', username);
      
      // Clear any potential cache issues
      if ('caches' in window) {
        caches.keys().then(function(names) {
          names.forEach(function(name) {
            caches.delete(name);
          });
        });
      }
      
      // Get complete data including topics
      const completePaths = await getAllLearningPaths();
      
      console.log('📊 Complete learning paths received:', completePaths);
      console.log('📊 Total paths:', completePaths.length);
      
      // Debug each path
      completePaths.forEach((path, index) => {
        console.log(`\n📋 Path ${index + 1}: "${path.name}"`);
        console.log(`  - ID: ${path.id}`);
        console.log(`  - Topics Count: ${path.topics_count}`);
        console.log(`  - Topics Array Length: ${path.topics?.length || 0}`);
        console.log(`  - Progress: ${path.progress}%`);
        console.log(`  - Has Topics: ${!!path.topics}`);
        
        if (path.topics && path.topics.length > 0) {
          console.log(`  - Topics Preview:`);
          path.topics.slice(0, 2).forEach((topic, tIndex) => {
            console.log(`    ${tIndex + 1}. ${topic.name} (${topic.subtopics?.length || 0} subtopics)`);
          });
        }
      });
      
      // Sort by creation date (newest first)
      const sortedPaths = completePaths.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setLearningPaths(sortedPaths);
      console.log('✅ Learning paths loaded successfully');
      
    } catch (error) {
      console.error("❌ Error fetching learning paths:", error);
      setError("Failed to fetch learning paths. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleViewDetails = (path) => {
    console.log('👁️ Viewing details for path:', path.name);
    console.log('📋 Path topics:', path.topics?.length || 0);
    setSelectedPath(path);
    setShowDetailModal(true);
  };

  const handleUpdateProgress = async (pathId, topicIndex, completed) => {
    try {
      const result = await updateLearningPathProgress(pathId, topicIndex, completed);
      if (result) {
        // Update local state
        setLearningPaths(prev => prev.map(path => {
          if (path.id === pathId) {
            const updatedTopics = [...path.topics];
            updatedTopics[topicIndex].completed = completed;
            
            // Recalculate progress
            const completedCount = updatedTopics.filter(t => t.completed).length;
            const progress = (completedCount / updatedTopics.length) * 100;
            
            return { ...path, topics: updatedTopics, progress };
          }
          return path;
        }));
        
        // Update selected path if modal is open
        if (selectedPath && selectedPath.id === pathId) {
          const updatedTopics = [...selectedPath.topics];
          updatedTopics[topicIndex].completed = completed;
          
          const completedCount = updatedTopics.filter(t => t.completed).length;
          const progress = (completedCount / updatedTopics.length) * 100;
          
          setSelectedPath({ ...selectedPath, topics: updatedTopics, progress });
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

  const isRecentPath = (createdAt) => {
    if (!createdAt) return false;
    
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
      
      // Consider paths created in the last 24 hours as "new"
      return diffHours <= 24;
    } catch (error) {
      return false;
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
            <div className="user-info">
              <Badge bg="info" className="me-2">
                User: {localStorage.getItem('username')}
              </Badge>
              <Badge bg="success" className="me-2">
                {learningPaths.length} paths (sorted newest first)
              </Badge>
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={fetchLearningPaths}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Force Refresh'}
              </Button>
            </div>
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
              {/* Debug: Check order at render time */}
              {(() => {
                console.log('🎨 RENDER TIME - Array order in UI:');
                learningPaths.forEach((p, i) => {
                  console.log(`  UI-${i + 1}. "${p.name}" - ${p.created_at}`);
                });
                return null;
              })()}
              {learningPaths.map((path) => (
                <Col lg={4} md={6} key={path.id}>
                  <Card className="lesson-content-card">
                    <Card.Body>
                      <div className="content-header">
                        <h5 className="content-title">{path.name}</h5>
                        <div className="badges-container">
                          <Badge bg={getDifficultyColor(path.difficulty)}>
                            {path.difficulty}
                          </Badge>
                          {/* Show NEW badge for paths created in the last 24 hours */}
                          {path.created_at && isRecentPath(path.created_at) && (
                            <Badge bg="danger" className="ms-1">
                              NEW
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="content-description">{path.description}</p>
                      
                      <div className="content-meta">
                        <div className="meta-item">
                          <Clock size={14} />
                          <span>{path.duration}</span>
                        </div>
                        <div className="meta-item">
                          <BookHalf size={14} />
                          <span>
                            {(() => {
                              console.log('🔍 RENDER DEBUG - path.topics_count:', path.topics_count);
                              console.log('🔍 RENDER DEBUG - path.topics?.length:', path.topics?.length);
                              console.log('🔍 RENDER DEBUG - path object:', path);
                              return path.topics_count || 0;
                            })()} modules
                          </span>
                        </div>
                        {path.created_at && (
                          <div className="meta-item">
                            <span className="text-muted small">Created: {formatLocalDate(path.created_at)}</span>
                          </div>
                        )}
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
                          onClick={() => handleViewDetails(path)}
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
                        <h5>Learning Modules</h5>
                        {selectedPath.topics && selectedPath.topics.length > 0 ? (
                          selectedPath.topics.map((topic, index) => (
                            <Card key={index} className="topic-card mb-3">
                              <Card.Body>
                                <div className="topic-header">
                                  <h6>{topic.name || `Topic ${index + 1}`}</h6>
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
                                <p className="topic-description">{topic.description || 'No description available'}</p>
                                {topic.time_required && (
                                  <small className="text-muted">
                                    <Clock size={12} className="me-1" />
                                    {topic.time_required}
                                  </small>
                                )}
                                
                                {/* Display subtopics if available */}
                                {topic.subtopics && topic.subtopics.length > 0 && (
                                  <div className="subtopics-section mt-3">
                                    <h6>Subtopics:</h6>
                                    <ul className="subtopics-list">
                                      {topic.subtopics.map((subtopic, subIndex) => (
                                        <li key={subIndex}>
                                          {typeof subtopic === 'string' ? (
                                            <span>{subtopic}</span>
                                          ) : (
                                            <>
                                              <strong>{subtopic.name}</strong>
                                              {subtopic.description && <p className="text-muted small">{subtopic.description}</p>}
                                            </>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Display resource links if available */}
                                {topic.links && topic.links.length > 0 && (
                                  <div className="resource-links mt-3">
                                    <h6>Resource Links:</h6>
                                    <ul className="resource-list">
                                      {topic.links.map((link, linkIndex) => (
                                        <li key={linkIndex}>
                                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary">
                                            {link.replace(/^https?:\/\//, '').split('/')[0]}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Display video resources if available */}
                                {topic.videos && topic.videos.length > 0 && (
                                  <div className="video-resources mt-3">
                                    <h6>Video Resources:</h6>
                                    <ul className="resource-list">
                                      {topic.videos.map((video, videoIndex) => (
                                        <li key={videoIndex}>
                                          <a href={video} target="_blank" rel="noopener noreferrer" className="text-primary">
                                            {video.includes('youtube') ? 'YouTube Video' : 'Video Resource'}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          ))
                        ) : (
                          <div className="alert alert-info">
                            <p>No learning modules found for this path.</p>
                          </div>
                        )}
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
                            <span>{formatLocalDate(selectedPath.created_at)}</span>
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