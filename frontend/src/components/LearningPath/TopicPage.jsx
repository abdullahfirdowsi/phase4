import React, { useState, useEffect } from 'react';
import { Card, Button, ProgressBar, Badge, ListGroup, Alert, Spinner } from 'react-bootstrap';
import { 
  CheckCircle, 
  Circle, 
  BookHalf, 
  PlayCircleFill, 
  FileText,
  BoxArrowUpRight,
  Award,
  Clock,
  Bullseye
} from 'react-bootstrap-icons';
import { markLessonComplete } from '../../api';
import './TopicPage.scss';

const TopicPage = ({ 
  topic, 
  progress, 
  onLessonComplete, 
  isCompleted, 
  quizResult 
}) => {
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [currentLesson, setCurrentLesson] = useState(null);

  useEffect(() => {
    if (progress?.completedLessonIds && Array.isArray(progress.completedLessonIds)) {
      // Use completedLessonIds array if available
      setCompletedLessons(new Set(progress.completedLessonIds));
    } else if (progress?.completedLessons > 0) {
      // Fallback to legacy completedLessons count if no IDs available
      const newCompleted = new Set();
      for (let i = 0; i < progress.completedLessons && i < topic.lessons.length; i++) {
        newCompleted.add(topic.lessons[i].id);
      }
      setCompletedLessons(newCompleted);
    }
  }, [progress?.completedLessonIds, progress?.completedLessons, topic.lessons]);

  const handleLessonToggle = async (lesson) => {
    const isCurrentlyCompleted = completedLessons.has(lesson.id);
    
    if (!isCurrentlyCompleted) {
      try {
        // Mark as completed in backend
        await markLessonComplete(
          topic.learningPathId || 'unknown',
          topic.topicIndex || 0,
          lesson.id
        );
        
        // Update local state
        setCompletedLessons(prev => new Set([...prev, lesson.id]));
        onLessonComplete(lesson.id);
      } catch (error) {
        console.error('Failed to mark lesson as complete:', error);
        // Still update UI even if backend fails
        setCompletedLessons(prev => new Set([...prev, lesson.id]));
        onLessonComplete(lesson.id);
      }
    }
  };

  const toggleLessonExpansion = (lessonId) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const getLessonIcon = (lesson) => {
    if (completedLessons.has(lesson.id)) {
      return <CheckCircle className="text-success" size={20} />;
    }
    return <Circle className="text-muted" size={20} />;
  };

  const getTopicProgressPercentage = () => {
    if (!topic.lessons.length) return 0;
    return (completedLessons.size / topic.lessons.length) * 100;
  };

  const allLessonsCompleted = completedLessons.size >= topic.lessons.length;

  if (!topic) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="warning">
            Topic data is not available.
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="topic-page">
      {/* Topic Header */}
      <Card className="topic-header mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className="flex-grow-1">
              <h3 className="topic-title mb-2">
                <BookHalf className="me-2 text-primary" />
                {topic.name}
              </h3>
              <p className="topic-description text-muted mb-3">
                {topic.description || `Learn about ${topic.name} through structured lessons and practical examples.`}
              </p>
              
              {/* Topic Meta Information */}
              <div className="topic-meta d-flex flex-wrap gap-2 mb-3">
                <Badge bg="outline-primary" className="d-flex align-items-center">
                  <Bullseye size={14} className="me-1" />
                  {topic.lessons.length} Lessons
                </Badge>
                <Badge bg="outline-info" className="d-flex align-items-center">
                  <Clock size={14} className="me-1" />
                  {topic.time_required || 'Est. 1 hour'}
                </Badge>
                {isCompleted && (
                  <Badge bg="success" className="d-flex align-items-center">
                    <Award size={14} className="me-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Completion Status */}
            <div className="completion-status text-end">
              {isCompleted && quizResult && (
                <div className="quiz-result">
                  <Badge bg="success" className="mb-2">
                    Quiz Passed: {quizResult.score}%
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="progress-label">Lesson Progress</span>
              <span className="progress-text">
                {completedLessons.size} of {topic.lessons.length} completed
              </span>
            </div>
            <ProgressBar 
              now={getTopicProgressPercentage()} 
              variant={allLessonsCompleted ? "success" : "primary"}
              className="topic-progress"
            />
          </div>

          {/* Quiz Status */}
          {allLessonsCompleted && (
            <Alert 
              variant={isCompleted ? "success" : "info"} 
              className="mt-3 mb-0"
            >
              <div className="d-flex align-items-center">
                {isCompleted ? (
                  <>
                    <CheckCircle className="me-2" />
                    <span>
                      Great job! You've completed all lessons and passed the quiz with {quizResult?.score ?? 'Unknown'}%.
                    </span>
                  </>
                ) : (
                  <>
                    <Award className="me-2" />
                    <span>
                      All lessons completed! Take the quiz to finish this topic and unlock the next one.
                    </span>
                  </>
                )}
              </div>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Lessons List */}
      <Card className="lessons-card">
        <Card.Header>
          <h5 className="mb-0">
            <FileText className="me-2" />
            Lessons
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {topic.lessons.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <BookHalf size={48} className="mb-3 opacity-50" />
              <p>No specific lessons defined for this topic.</p>
              <p>Review the topic description and resources above, then take the quiz when ready.</p>
            </div>
          ) : (
            <ListGroup variant="flush">
              {topic.lessons.map((lesson, index) => {
                const isExpanded = expandedLessons.has(lesson.id);
                const isCompleted = completedLessons.has(lesson.id);
                
                return (
                  <ListGroup.Item 
                    key={lesson.id} 
                    className={`lesson-item ${isCompleted ? 'completed' : ''}`}
                  >
                    <div className="lesson-content">
                      {/* Lesson Header */}
                      <div 
                        className="lesson-header d-flex align-items-center justify-content-between"
                        onClick={() => toggleLessonExpansion(lesson.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="lesson-main d-flex align-items-center flex-grow-1">
                          <div className="lesson-icon me-3">
                            {getLessonIcon(lesson)}
                          </div>
                          <div className="lesson-info flex-grow-1">
                            <h6 className="lesson-title mb-1">
                              {index + 1}. {lesson.title}
                            </h6>
                            <p className="lesson-description mb-0 text-muted">
                              {lesson.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="lesson-actions d-flex align-items-center">
                          {!isCompleted ? (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLessonToggle(lesson);
                              }}
                              className="me-2"
                            >
                              Mark Complete
                            </Button>
                          ) : (
                            <Badge bg="success" className="me-2 px-2 py-1">
                              <CheckCircle className="me-1" size={14} />
                              Completed
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="expand-btn"
                          >
                            {isExpanded ? '−' : '+'}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="lesson-details mt-3 ps-5">
                          <div className="lesson-content-area">
                            <div className="content-section">
                              <h6>Learning Objectives:</h6>
                              <ul>
                                <li>Understand the key concepts of {lesson.title}</li>
                                <li>Apply knowledge through practical examples</li>
                                <li>Connect concepts to real-world scenarios</li>
                              </ul>
                            </div>
                            
                            {lesson.resources && lesson.resources.length > 0 && (
                              <div className="content-section">
                                <h6>Additional Resources:</h6>
                                <ul>
                                  {lesson.resources.map((resource, idx) => (
                                    <li key={idx}>
                                      <a 
                                        href={resource} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="resource-link"
                                      >
                                        {resource} <BoxArrowUpRight size={14} className="ms-1" />
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="lesson-actions mt-3">
                              {!isCompleted ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleLessonToggle(lesson)}
                                >
                                  <CheckCircle className="me-2" size={16} />
                                  Mark as Complete
                                </Button>
                              ) : (
                                <Badge bg="success" className="px-3 py-2">
                                  <CheckCircle className="me-2" size={16} />
                                  Completed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      {/* Topic Resources */}
      {(topic.links && topic.links.length > 0) || (topic.videos && topic.videos.length > 0) ? (
        <Card className="resources-card mt-4">
          <Card.Header>
            <h5 className="mb-0">
              <BoxArrowUpRight className="me-2" />
              Additional Resources
            </h5>
          </Card.Header>
          <Card.Body>
            {topic.links && topic.links.length > 0 && (
              <div className="resource-section mb-3">
                <h6>Reading Materials:</h6>
                <ul className="resource-list">
                  {topic.links.map((link, index) => (
                    <li key={index}>
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
                        {link.replace(/^https?:\/\//, '').split('/')[0]} 
                        <BoxArrowUpRight size={14} className="ms-2" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {topic.videos && topic.videos.length > 0 && (
              <div className="resource-section">
                <h6>Video Resources:</h6>
                <ul className="resource-list">
                  {topic.videos.map((video, index) => (
                    <li key={index}>
                      <a 
                        href={video} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
                        <PlayCircleFill className="me-2" />
                        {video.includes('youtube') ? 'YouTube Video' : 'Video Resource'}
                        <BoxArrowUpRight size={14} className="ms-2" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card.Body>
        </Card>
      ) : null}
    </div>
  );
};

export default TopicPage;
