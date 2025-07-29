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
  XCircle,
  ArrowLeft,
  Compass,
  Circle
} from "react-bootstrap-icons";
import { getAllLearningPaths, updateLearningPathProgress, fetchUserProgress } from "../../../api";
import { LearningPathStepper } from "../../../components/LearningPath";
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
  const [stepperMode, setStepperMode] = useState(false);
  const [currentLearningPath, setCurrentLearningPath] = useState(null);

  const username = localStorage.getItem("username");

  useEffect(() => {
    fetchLearningContent();
  }, []);

const fetchLearningContent = async () => {
    try {
      setLoading(true);
      
      // Fetch both learning paths and user progress data
      const [learningPaths, fetchedProgress] = await Promise.all([
        getAllLearningPaths(),
        fetchUserProgress(username)
      ]);
      
      console.log('📊 Fetched progress data:', fetchedProgress);
      console.log('📚 Fetched learning paths:', learningPaths);
      
      // Sort and map learning paths to include backend progress data
      const sortedLearningPaths = (learningPaths || []).sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime(); // newest first
      }).map(path => {
          // Find progress data for this specific learning path
          const progressData = fetchedProgress.find(p => p.learningPathId === path.id) || {};
          
          // Merge backend progress data with topics
          const enrichedTopics = (path.topics || []).map((topic, index) => {
            // Look for progress data for this topic
            const topicProgress = progressData.topicProgress?.[index] || {};
            const isCompleted = progressData.completedTopics?.includes(index) || false;
            
            return {
              ...topic,
              completed: isCompleted || topic.completed || false,
              quiz_passed: topicProgress.quiz_passed || topic.quiz_passed || false,
              quiz_score: topicProgress.quiz_score || topic.quiz_score || 0,
              completed_lessons: topicProgress.completed_lessons || topic.completed_lessons || 0,
              started: topicProgress.started || topic.started || false
            };
          });
          
          return {
            ...path,
            topics: enrichedTopics,
            progress: calculateProgressWithBackendData(enrichedTopics, progressData),
            lastTopicIndex: progressData.lastTopicIndex || 0,
            backendProgress: progressData // Keep reference to original backend data
          };
      });

      console.log('📋 Learning paths with enriched progress data:');
      sortedLearningPaths.forEach((p, i) => {
        console.log(`  ${i + 1}. "${p.name}" - Progress: ${Math.round(p.progress)}% - Backend data:`, p.backendProgress);
      });
      
      setMyLearningPaths(sortedLearningPaths);
      
      // Try to fetch lessons from backend
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE_URL}/lessons/user?username=${encodeURIComponent(username)}`);
        if (response.ok) {
          const data = await response.json();
          setFeaturedLessons(data.lessons || []);
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

  const calculateProgress = (topics) => {
    const totalTopics = (topics || []).length;
    
    // Standardized progress calculation:
    // A topic is considered complete if:
    // 1. quiz_passed is true AND quiz_score >= 80, OR
    // 2. For backward compatibility, completed is true (fallback)
    const completedTopics = (topics || []).filter(topic => {
      // Primary check: quiz-based completion
      if (topic.quiz_passed && topic.quiz_score >= 80) {
        return true;
      }
      
      // Fallback check: old completion flag
      if (topic.completed && !topic.hasOwnProperty('quiz_passed')) {
        return true;
      }
      
      return false;
    }).length;
    
    return totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
  };

  const calculateProgressWithBackendData = (enrichedTopics, progressData) => {
    // If backend provides an overall progress percentage, use it
    if (progressData.overallProgress !== undefined) {
      return progressData.overallProgress;
    }
    
    // If backend provides a completion percentage, use it
    if (progressData.completionPercentage !== undefined) {
      return progressData.completionPercentage;
    }
    
    // Otherwise, calculate from enriched topics (which now include backend data)
    return calculateProgress(enrichedTopics);
  };

  const calculateTopicProgress = (topic) => {
    if (!topic.lessons || topic.lessons.length === 0) return 0;
    const completedLessons = topic.completed_lessons || 0;
    return (completedLessons / topic.lessons.length) * 100;
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
        const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE_URL}/lessons/user/${lessonId}/progress`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            progress: 0,
            completed: false
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
          setSelectedContent({
            id: contentId,
            title: pathData.name,
            description: pathData.description || "A personalized learning path to help you master new skills.",
            topics: pathData.topics.map(topic => ({
              ...topic,
              completed: topic.completed || false
            })),
            progress: calculateProgress(pathData.topics),
            type: "learning_path"
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
          // Update topics directly (new data structure)
          const updatedTopics = [...(path.topics || [])];
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
            ...path,
            topics: updatedTopics,
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

  // Stepper mode handlers
  const handleEnterStepperMode = (learningPath) => {
    console.log('🎯 Entering stepper mode for:', learningPath.name);
    setCurrentLearningPath(learningPath);
    setStepperMode(true);
  };

  const handleExitStepperMode = () => {
    console.log('🔙 Exiting stepper mode');
    setStepperMode(false);
    setCurrentLearningPath(null);
    // Refresh learning paths to get updated progress
    fetchLearningContent();
  };

  const handleStepperComplete = (completionData) => {
    console.log('🎉 Learning path completed!', completionData);
    setSuccess(`Congratulations! You've completed the learning path with ${Math.round(completionData.finalScore || 0)}% average score.`);
    handleExitStepperMode();
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

  // Render stepper mode if active
  if (stepperMode && currentLearningPath) {
    return (
      <div className="learning-page stepper-mode">
        <Container fluid>
          {/* Stepper Header */}
          <div className="stepper-header mb-3">
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={handleExitStepperMode}
              className="back-button"
            >
              <ArrowLeft className="me-2" size={16} />
              Back to Learning
            </Button>
          </div>
          
          {/* LearningPathStepper Component */}
          <LearningPathStepper
            learningPath={currentLearningPath}
            onComplete={handleStepperComplete}
            onExit={handleExitStepperMode}
          />
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
                            <span>{path.topics_count || path.topics?.length || 0} modules</span>
                          </div>
                        </div>

                        <div className="progress-section">
                          <div className="progress-header">
                            <span>Progress</span>
                            <span className="progress-percentage">{Math.round(path.progress || 0)}%</span>
                          </div>
                          <ProgressBar 
                            now={path.progress || 0} 
                            variant={path.progress >= 100 ? "success" : "primary"}
                            className="content-progress"
                          />
                        </div>

                        <div className="content-actions">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => handleViewContent(path.name, "learning_path")}
                            className="me-2"
                          >
                            <Eye size={14} className="me-1" />
                            View Details
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleEnterStepperMode(path)}
                          >
                            <Compass size={14} className="me-1" />
                            Start Learning
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
                      <div className="section-header mb-4">
                        <h4 className="section-title mb-2">
                          <BookHalf className="me-2 text-primary" size={20} />
                          Learning Modules
                        </h4>
                        <p className="text-muted mb-0">
                          Complete these modules to master the subject. Each module contains curated resources and subtopics.
                        </p>
                      </div>
                      
                      {selectedContent.topics && selectedContent.topics.length > 0 ? (
                        <div className="topics-container">
                          {selectedContent.topics.map((topic, topicIndex) => (
                            <div key={topicIndex} className="topic-module mb-4">
                              {/* Module Header */}
                              <div className="module-header d-flex align-items-center mb-3">
                                <div className="module-number me-3">
                                  <span className="badge bg-primary rounded-pill px-3 py-2">
                                    {topicIndex + 1}
                                  </span>
                                </div>
                                <div className="module-info flex-grow-1">
                                  <h5 className="module-title mb-1">{topic.name}</h5>
                                  {topic.time_required && (
                                    <div className="module-duration text-muted">
                                      <Clock size={14} className="me-1" />
                                      <small>{topic.time_required}</small>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Module Content */}
                              <div className="module-content ps-4 border-start border-2 border-light">
                                <p className="module-description mb-3 text-secondary">
                                  {topic.description}
                                </p>
                                
                                {/* Resources Section */}
                                {(topic.links?.length > 0 || topic.videos?.length > 0) && (
                                  <div className="resources-section mb-3">
                                    <div className="row g-3">
                                      {/* Reading Materials */}
                                      {topic.links && topic.links.length > 0 && (
                                        <div className="col-md-6">
                                          <div className="resource-card h-100">
                                            <div className="resource-header d-flex align-items-center mb-2">
                                              <BookHalf size={16} className="text-success me-2" />
                                              <h6 className="mb-0 text-success">Reading Materials</h6>
                                            </div>
                                            <div className="resource-links">
                                              {topic.links.map((link, i) => (
                                                <a 
                                                  key={i}
                                                  href={link} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="d-block text-decoration-none mb-1 p-2 rounded bg-light-hover small"
                                                >
                                                  <i className="bi bi-link-45deg me-1"></i>
                                                  {link.replace(/^https?:\/\//, '').split('/')[0]}
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Video Resources */}
                                      {topic.videos && topic.videos.length > 0 && (
                                        <div className="col-md-6">
                                          <div className="resource-card h-100">
                                            <div className="resource-header d-flex align-items-center mb-2">
                                              <PlayCircleFill size={16} className="text-danger me-2" />
                                              <h6 className="mb-0 text-danger">Video Resources</h6>
                                            </div>
                                            <div className="resource-links">
                                              {topic.videos.map((video, i) => (
                                                <a 
                                                  key={i}
                                                  href={video} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="d-block text-decoration-none mb-1 p-2 rounded bg-light-hover small"
                                                >
                                                  <PlayCircleFill size={12} className="me-1" />
                                                  {video.includes('youtube') ? 'YouTube Video' : 'Video Resource'}
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Subtopics Section */}
                                {topic.subtopics && topic.subtopics.length > 0 && (
                                  <div className="subtopics-section">
                                    <div className="subtopics-header d-flex align-items-center mb-2">
                                      <Award size={16} className="text-warning me-2" />
                                      <h6 className="mb-0 text-warning">Key Topics Covered</h6>
                                    </div>
                                    <div className="subtopics-grid">
                                      {topic.subtopics.map((subtopic, i) => (
                                        <div key={i} className="subtopic-card mb-2">
                                          <div className="card border-0 bg-light">
                                            <div className="card-body p-3">
                                              <h6 className="card-title mb-1 text-dark">{subtopic.name}</h6>
                                              {subtopic.description && (
                                                <p className="card-text small text-muted mb-0">
                                                  {subtopic.description}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Divider between modules */}
                              {topicIndex < selectedContent.topics.length - 1 && (
                                <hr className="my-4 border-2" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-topics text-center py-5">
                          <BookHalf size={48} className="text-muted mb-3" />
                          <h5 className="text-muted">No Modules Available</h5>
                          <p className="text-muted">No learning modules found for this path.</p>
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
                      {selectedContent?.type === "learning_path" ? (
                        <Button 
                          variant="primary"
                          onClick={() => {
                            setShowDetailModal(false);
                            const learningPath = myLearningPaths.find(p => p.name === selectedContent.title);
                            if (learningPath) {
                              handleEnterStepperMode(learningPath);
                            }
                          }}
                        >
                          <Compass size={16} className="me-2" />
                          Continue Learning
                        </Button>
                      ) : (
                        <Button variant="primary">
                          <PlayCircleFill size={16} className="me-2" />
                          Start Lesson
                        </Button>
                      )}
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default Learning;