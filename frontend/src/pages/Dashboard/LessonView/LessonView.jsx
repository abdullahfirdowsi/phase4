import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, 
  Badge, Alert, Spinner, ProgressBar 
} from 'react-bootstrap';
import { 
  BookHalf, 
  Clock, 
  Pencil, 
  ArrowLeft,
  Share,
  HandThumbsUp,
  HandThumbsDown,
  ChatDots,
  BookmarkPlus,
  BookmarkCheckFill
} from 'react-bootstrap-icons';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonDetail, updateLessonProgress, saveLesson } from '../../../api';
import './LessonView.scss';

const LessonView = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  useEffect(() => {
    fetchLessonDetail();
  }, [lessonId]);

  const fetchLessonDetail = async () => {
    try {
      setLoading(true);
      const data = await getLessonDetail(lessonId);
      setLesson(data.lesson);
      setProgress(data.lesson.progress || 0);
      setIsSaved(data.lesson.isSaved || false);
    } catch (error) {
      console.error('Error fetching lesson:', error);
      setError('Failed to load lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (newProgress) => {
    try {
      setProgress(newProgress);
      await updateLessonProgress(lessonId, newProgress, newProgress === 100);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleSaveLesson = async () => {
    try {
      await saveLesson(lessonId, !isSaved);
      setIsSaved(!isSaved);
    } catch (error) {
      console.error('Error saving lesson:', error);
    }
  };

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
    } else {
      setIsLiked(true);
      setIsDisliked(false);
    }
  };

  const handleDislike = () => {
    if (isDisliked) {
      setIsDisliked(false);
    } else {
      setIsDisliked(true);
      setIsLiked(false);
    }
  };

  const handleNextSection = () => {
    if (lesson.sections && currentSectionIndex < lesson.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      
      // Calculate new progress
      const newProgress = Math.min(
        Math.round(((currentSectionIndex + 2) / (lesson.sections.length + 1)) * 100),
        100
      );
      
      handleUpdateProgress(newProgress);
    } else {
      // Completed all sections
      handleUpdateProgress(100);
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const handleEditLesson = () => {
    navigate(`/dashboard/lessons/edit/${lessonId}`);
  };

  if (loading) {
    return (
      <div className="lesson-view-page">
        <Container fluid>
          <div className="loading-state">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading lesson...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="lesson-view-page">
        <Container fluid>
          <Alert variant="danger">
            {error || 'Lesson not found'}
          </Alert>
          <Button 
            variant="outline-primary" 
            onClick={() => navigate('/dashboard/lessons')}
          >
            <ArrowLeft className="me-2" />
            Back to Lessons
          </Button>
        </Container>
      </div>
    );
  }

  return (
    <div className="lesson-view-page">
      <Container fluid>
        {/* Navigation */}
        <div className="lesson-navigation">
          <Button 
            variant="outline-primary" 
            onClick={() => navigate('/dashboard/lessons')}
            className="back-btn"
          >
            <ArrowLeft className="me-2" />
            Back to Lessons
          </Button>
          
          {lesson.createdBy === localStorage.getItem('username') && (
            <Button 
              variant="outline-secondary" 
              onClick={handleEditLesson}
              className="edit-btn"
            >
              <Pencil className="me-2" />
              Edit Lesson
            </Button>
          )}
        </div>

        {/* Lesson Header */}
        <Card className="lesson-header-card">
          <Card.Body>
            <Row>
              <Col lg={8}>
                <div className="lesson-header">
                  <h1 className="lesson-title">{lesson.title}</h1>
                  <div className="lesson-badges">
                    <Badge bg={
                      lesson.difficulty === 'Beginner' ? 'success' :
                      lesson.difficulty === 'Intermediate' ? 'warning' : 'danger'
                    }>
                      {lesson.difficulty}
                    </Badge>
                    {lesson.subject && (
                      <Badge bg="secondary">
                        {lesson.subject}
                      </Badge>
                    )}
                    <Badge bg={lesson.status === 'published' ? 'success' : 'warning'}>
                      {lesson.status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  
                  <div className="lesson-meta">
                    <div className="meta-item">
                      <Clock size={16} />
                      <span>{lesson.duration} minutes</span>
                    </div>
                    <div className="meta-item">
                      <BookHalf size={16} />
                      <span>{lesson.sections?.length || 0} sections</span>
                    </div>
                  </div>
                  
                  <p className="lesson-description">{lesson.description}</p>
                </div>
              </Col>
              
              <Col lg={4}>
                <div className="lesson-progress-card">
                  <h5>Your Progress</h5>
                  <ProgressBar 
                    now={progress} 
                    label={`${progress}%`} 
                    variant="primary" 
                    className="mb-3"
                  />
                  
                  <div className="progress-actions">
                    <Button 
                      variant={isSaved ? 'primary' : 'outline-primary'}
                      onClick={handleSaveLesson}
                      className="save-btn"
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheckFill className="me-2" />
                          Saved
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="me-2" />
                          Save
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline-primary" 
                      onClick={() => {
                        // Share functionality would go here
                        alert('Share functionality would be implemented here');
                      }}
                      className="share-btn"
                    >
                      <Share className="me-2" />
                      Share
                    </Button>
                  </div>
                  
                  <div className="feedback-actions">
                    <Button 
                      variant={isLiked ? 'success' : 'outline-success'}
                      onClick={handleLike}
                      className="like-btn"
                    >
                      <HandThumbsUp className="me-2" />
                      Helpful
                    </Button>
                    
                    <Button 
                      variant={isDisliked ? 'danger' : 'outline-danger'}
                      onClick={handleDislike}
                      className="dislike-btn"
                    >
                      <HandThumbsDown className="me-2" />
                      Not Helpful
                    </Button>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Lesson Content */}
        <Row className="lesson-content-row">
          <Col lg={8}>
            <Card className="lesson-content-card">
              <Card.Body>
                {/* Video */}
                {lesson.videoUrl && (
                  <div className="lesson-video mb-4">
                    <video 
                      src={lesson.videoUrl} 
                      controls 
                      width="100%" 
                      poster={lesson.avatarUrl}
                    />
                  </div>
                )}
                
                {/* Main Content */}
                <div className="lesson-main-content">
                  <h3>Lesson Content</h3>
                  <div 
                    className="content-html"
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                  />
                </div>
                
                {/* Sections */}
                {lesson.sections && lesson.sections.length > 0 && (
                  <div className="lesson-sections">
                    <h3>Lesson Sections</h3>
                    
                    <div className="section-navigation">
                      <div className="section-progress">
                        <span>Section {currentSectionIndex + 1} of {lesson.sections.length}</span>
                        <ProgressBar 
                          now={(currentSectionIndex + 1) / lesson.sections.length * 100} 
                          className="section-progress-bar" 
                        />
                      </div>
                      
                      <div className="section-content">
                        <h4>{lesson.sections[currentSectionIndex].title}</h4>
                        <div className="section-body">
                          <p>{lesson.sections[currentSectionIndex].content}</p>
                        </div>
                      </div>
                      
                      <div className="section-actions">
                        <Button 
                          variant="outline-secondary" 
                          onClick={handlePreviousSection}
                          disabled={currentSectionIndex === 0}
                        >
                          Previous
                        </Button>
                        <Button 
                          variant="primary" 
                          onClick={handleNextSection}
                        >
                          {currentSectionIndex === lesson.sections.length - 1 ? 'Complete' : 'Next'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
            
            {/* Comments Section */}
            <Card className="comments-card mt-4">
              <Card.Body>
                <h3 className="comments-title">
                  <ChatDots className="me-2" />
                  Comments
                </h3>
                
                <div className="comments-form mb-4">
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Add a comment..."
                    className="mb-2"
                  />
                  <Button variant="primary">Post Comment</Button>
                </div>
                
                <div className="comments-list">
                  <p className="text-muted text-center">No comments yet. Be the first to comment!</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={4}>
            {/* Lesson Info Card */}
            <Card className="lesson-info-card mb-4">
              <Card.Header>
                <h5>Lesson Information</h5>
              </Card.Header>
              <Card.Body>
                <div className="info-item">
                  <span className="info-label">Created By</span>
                  <span className="info-value">{lesson.createdBy || 'Anonymous'}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Created On</span>
                  <span className="info-value">
                    {new Date(lesson.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Last Updated</span>
                  <span className="info-value">
                    {lesson.updatedAt 
                      ? new Date(lesson.updatedAt).toLocaleDateString() 
                      : 'Not updated'}
                  </span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Views</span>
                  <span className="info-value">{lesson.views || 0}</span>
                </div>
                
                <div className="info-item">
                  <span className="info-label">Likes</span>
                  <span className="info-value">{lesson.likes || 0}</span>
                </div>
              </Card.Body>
            </Card>
            
            {/* Tags Card */}
            {lesson.tags && lesson.tags.length > 0 && (
              <Card className="tags-card mb-4">
                <Card.Header>
                  <h5>Tags</h5>
                </Card.Header>
                <Card.Body>
                  <div className="tags-container">
                    {lesson.tags.map((tag, index) => (
                      <Badge key={index} bg="light" text="dark" className="tag-badge">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}
            
            {/* Related Lessons */}
            <Card className="related-lessons-card">
              <Card.Header>
                <h5>Related Lessons</h5>
              </Card.Header>
              <Card.Body>
                <p className="text-muted text-center">No related lessons found</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LessonView;