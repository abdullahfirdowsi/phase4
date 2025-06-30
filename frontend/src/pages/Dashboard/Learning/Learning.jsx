import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, ProgressBar, Modal, Alert, Spinner } from "react-bootstrap";
import { 
  BookHalf, 
  Plus, 
  Clock, 
  Star, 
  PlayCircleFill, 
  Award,
  GraphUp,
  People,
  Eye,
  CheckCircle,
  XCircle
} from "react-bootstrap-icons";
import { getAllLearningGoals, updateLearningPathProgress } from "../../../api";
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
      
      // Sort learning paths by created_at date (newest first)
      const sortedLearningPaths = (learningGoals || []).sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime(); // newest first
      });
      
      console.log('📋 Learning paths in Learning component (sorted newest first):');
      sortedLearningPaths.forEach((p, i) => {
        console.log(`  ${i + 1}. "${p.name}" - ${p.created_at}`);
      });
      
      setMyLearningPaths(sortedLearningPaths);
      
      // Try to fetch lessons from backend
      try {
        const response = await fetch(`http://localhost:8000/lessons/lessons?username=${username}`);
        if (response.ok) {
          const data = await response.json();
          setFeaturedLessons(data.adminLessons || []);
        } else {
          console.log("Lessons API endpoint not found, using empty lessons list");
          // Create sample featured lessons since the endpoint is not available
          createSampleLessons();
        }
      } catch (error) {
        console.log("Lessons API endpoint not found, using empty lessons list");
        // Create sample featured lessons since the endpoint is not available
        createSampleLessons();
      }
      
    } catch (error) {
      console.error("Error fetching learning content:", error);
      setError("Failed to load learning content");
      createSampleLessons();
    } finally {
      setLoading(false);
    }
  };

  const createSampleLessons = () => {
    const sampleLessons = [
      {
        _id: "sample_lesson_1",
        title: "Introduction to Python Programming",
        description: "Learn the basics of Python programming language including variables, data types, and control structures.",
        subject: "Programming",
        difficulty: "Beginner",
        duration: "2 hours",
        tags: ["Python", "Programming", "Beginner"],
        enrollments: 1250,
        createdAt: new Date().toISOString()
      },
      {
        _id: "sample_lesson_2",
        title: "Web Development Fundamentals",
        description: "Understand the core concepts of web development including HTML, CSS, and JavaScript.",
        subject: "Web Development",
        difficulty: "Intermediate",
        duration: "4 hours",
        tags: ["HTML", "CSS", "JavaScript"],
        enrollments: 980,
        createdAt: new Date().toISOString()
      },
      {
        _id: "sample_lesson_3",
        title: "Data Science Essentials",
        description: "Explore the fundamentals of data science including data analysis, visualization, and basic machine learning.",
        subject: "Data Science",
        difficulty: "Advanced",
        duration: "6 hours",
        tags: ["Data Science", "Machine Learning", "Python"],
        enrollments: 750,
        createdAt: new Date().toISOString()
      }
    ];
    
    setFeaturedLessons(sampleLessons);
  };

  const handleEnrollInLesson = async (lessonId) => {
    try {
      // Try to call the actual API first
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
          return;
        }
      } catch (error) {
        console.log("Enrollment API not available, using local state update");
      }
      
      // Fallback to local state update if API fails
      setSuccess("Successfully enrolled in lesson!");
      
      // Update featured lessons to show enrollment
      setFeaturedLessons(prevLessons => 
        prevLessons.map(lesson => 
          lesson._id === lessonId 
            ? {...lesson, enrollments: lesson.enrollments + 1} 
            : lesson
        )
      );
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
          // Process topics to ensure they have completed property
          const processedTopics = pathData.study_plans && pathData.study_plans[0] && 
            pathData.study_plans[0].topics ? 
            pathData.study_plans[0].topics.map(topic => ({
              ...topic,
              completed: topic.completed || false
            })) : [];
          
          setSelectedContent({
            id: contentId,
            title: pathData.name,
            description: pathData.description || "Personalized learning path",
            content: pathData.study_plans,
            progress: pathData.progress,
            type: "learning_path",
            topics: processedTopics
          });
          setShowDetailModal(true);
          return;
        }
      } else if (contentType === "lesson") {
        // Handle lesson details - using sample data since API is not available
        const lessonData = featuredLessons.find(lesson => lesson._id === contentId);
        if (lessonData) {
          setSelectedContent({
            id: contentId,
            title: lessonData.title,
            description: lessonData.description,
            subject: lessonData.subject,
            difficulty: lessonData.difficulty,
            duration: lessonData.duration,
            tags: lessonData.tags,
            content: "This is sample lesson content. In a real implementation, this would be fetched from the backend.",
            type: "lesson"
          });
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

  const handleMarkTopicCompleted = async (topicIndex, completed) => {
    if (!selectedContent || selectedContent.type !== "learning_path") return;
    
    // Update the selected content
    setSelectedContent(prevContent => {
      const updatedTopics = [...(prevContent.topics || [])];
      if (updatedTopics[topicIndex]) {
        updatedTopics[topicIndex] = {
          ...updatedTopics[topicIndex],
          completed: completed
        };
      }
      
      // Calculate new progress
      const totalTopics = updatedTopics.length;
      const completedTopics = updatedTopics.filter(topic => topic.completed).length;
      const newProgress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
      
      return {
        ...prevContent,
        topics: updatedTopics,
        progress: newProgress
      };
    });
    
    // Update the learning paths list
    setMyLearningPaths(prevPaths => {
      return prevPaths.map(path => {
        if (path.name === selectedContent.title) {
          // Find the study plan
          const updatedStudyPlans = path.study_plans.map(plan => {
            const updatedTopics = [...(plan.topics || [])];
            if (updatedTopics[topicIndex]) {
              updatedTopics[topicIndex] = {
                ...updatedTopics[topicIndex],
                completed: completed
              };
            }
            return {
              ...plan,
              topics: updatedTopics
            };
          });
          
          // Calculate new progress
          const totalTopics = path.study_plans[0]?.topics?.length || 0;
          const completedTopics = path.study_plans[0]?.topics?.filter(topic => topic.completed).length || 0;
          const newProgress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
          
          return {
            ...path,
            study_plans: updatedStudyPlans,
            progress: newProgress
          };
        }
        return path;
      });
    });
    
    // Try to update on the backend
    try {
      await updateLearningPathProgress(selectedContent.id, topicIndex, completed);
    } catch (error) {
      console.error("Error updating progress:", error);
      // Continue with local state updates even if backend fails
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
        <div className="learning-tabs mb-4">
          <Button 
            variant={activeTab === "my-learning" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("my-learning")}
            className="me-2"
          >
            My Learning Paths ({myLearningPaths.length})
          </Button>
          <Button 
            variant={activeTab === "featured" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("featured")}
          >
            Featured Content ({featuredLessons.length})
          </Button>
        </div>

        <div className="learning-content">
          {activeTab === "my-learning" ? (
            myLearningPaths.length > 0 ? (
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
            )
          ) : (
            featuredLessons.length > 0 ? (
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
            )
          )}
        </div>

        {/* Content Detail Modal */}
        <Modal 
          show={showDetailModal} 
          onHide={() => setShowDetailModal(false)} 
          size="lg"
          className="learning-detail-modal"
        >
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
                      <div className="path-stats">
                        <div className="stat-item">
                          <GraphUp className="stat-icon" />
                          <div>
                            <div className="stat-value">{Math.round(selectedContent.progress || 0)}%</div>
                            <div className="stat-label">Progress</div>
                          </div>
                        </div>
                        {selectedContent.content && selectedContent.content[0]?.duration && (
                          <div className="stat-item">
                            <Clock className="stat-icon" />
                            <div>
                              <div className="stat-value">{selectedContent.content[0].duration}</div>
                              <div className="stat-label">Duration</div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <h5 className="section-title">Learning Modules</h5>
                      {selectedContent.topics && selectedContent.topics.length > 0 ? (
                        <div className="topics-list">
                          {selectedContent.topics.map((topic, topicIndex) => (
                            <Card key={topicIndex} className="topic-card mb-3">
                              <Card.Body>
                                <div className="topic-header">
                                  <div className="topic-title-wrapper">
                                    <span className="topic-number">{topicIndex + 1}</span>
                                    <h6 className="topic-title">{topic.name}</h6>
                                  </div>
                                  <div className="topic-actions">
                                    <div className="completion-toggle">
                                      <Button
                                        variant={topic.completed ? "success" : "outline-secondary"}
                                        size="sm"
                                        className="completion-btn"
                                        onClick={() => handleMarkTopicCompleted(topicIndex, !topic.completed)}
                                      >
                                        {topic.completed ? (
                                          <>
                                            <CheckCircle size={14} className="me-1" />
                                            Completed
                                          </>
                                        ) : (
                                          <>
                                            <XCircle size={14} className="me-1" />
                                            Mark Complete
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                
                                <p className="topic-description">{topic.description}</p>
                                
                                {topic.time_required && (
                                  <div className="topic-meta">
                                    <Clock size={14} className="me-1" />
                                    <span>{topic.time_required}</span>
                                  </div>
                                )}
                                
                                <div className="topic-resources">
                                  {topic.links && topic.links.length > 0 && (
                                    <div className="resource-section">
                                      <h6 className="resource-title">Reading Materials</h6>
                                      <ul className="resource-list">
                                        {topic.links.map((link, i) => (
                                          <li key={i}>
                                            <a href={link} target="_blank" rel="noopener noreferrer">
                                              {link.replace(/^https?:\/\//, '').split('/')[0]}
                                            </a>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {topic.videos && topic.videos.length > 0 && (
                                    <div className="resource-section">
                                      <h6 className="resource-title">Video Resources</h6>
                                      <ul className="resource-list">
                                        {topic.videos.map((video, i) => (
                                          <li key={i}>
                                            <a href={video} target="_blank" rel="noopener noreferrer">
                                              {video.includes('youtube') ? 'YouTube Video' : 'Video Resource'}
                                            </a>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                                
                                {topic.subtopics && topic.subtopics.length > 0 && (
                                  <div className="subtopics-section">
                                    <h6 className="subtopics-title">Subtopics</h6>
                                    <ul className="subtopics-list">
                                      {topic.subtopics.map((subtopic, i) => (
                                        <li key={i} className="subtopic-item">
                                          <strong>{subtopic.name}</strong>
                                          {subtopic.description && <p>{subtopic.description}</p>}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </Card.Body>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="no-topics">
                          <p>No learning modules found for this path.</p>
                        </div>
                      )}
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