import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Alert, Spinner, Modal } from 'react-bootstrap';
import { Clock, BookHalf, Award, PlayCircleFill } from 'react-bootstrap-icons';
import { getLessonDetail, generateAvatar, getAvatarStatus } from '../../../api';
import AvatarUploader from '../../../components/AvatarUploader/AvatarUploader';
import './LessonDetail.scss';

const LessonDetail = ({ lessonId, onClose }) => {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    fetchLessonDetail();
  }, [lessonId]);

  const fetchLessonDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getLessonDetail(lessonId);
      setLesson(data.lesson);
      
      // Check if avatar video exists
      if (data.lesson.avatar_video_url) {
        setAvatarVideoUrl(data.lesson.avatar_video_url);
      } else {
        // Check status in case generation is in progress
        checkAvatarStatus();
      }
    } catch (error) {
      console.error('Error fetching lesson detail:', error);
      setError('Failed to load lesson details');
    } finally {
      setLoading(false);
    }
  };

  const checkAvatarStatus = async () => {
    try {
      setCheckingStatus(true);
      const status = await getAvatarStatus(lessonId);
      
      if (status.status === 'completed' && status.avatar_video_url) {
        setAvatarVideoUrl(status.avatar_video_url);
      }
    } catch (error) {
      console.error('Error checking avatar status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleAvatarComplete = (videoUrl) => {
    setAvatarVideoUrl(videoUrl);
    setShowAvatarModal(false);
    // Refresh lesson details to get updated data
    fetchLessonDetail();
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
      <div className="lesson-detail-loading">
        <Spinner animation="border" variant="primary" />
        <p>Loading lesson details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }

  if (!lesson) {
    return (
      <Alert variant="warning">
        Lesson not found
      </Alert>
    );
  }

  return (
    <div className="lesson-detail">
      <Card className="lesson-card">
        <Card.Header>
          <div className="lesson-header">
            <h4 className="lesson-title">{lesson.title}</h4>
            <div className="lesson-badges">
              <Badge bg={getDifficultyColor(lesson.difficulty)}>
                {lesson.difficulty}
              </Badge>
              <Badge bg="secondary">
                {lesson.subject}
              </Badge>
            </div>
          </div>
        </Card.Header>
        
        <Card.Body>
          <div className="lesson-meta">
            <div className="meta-item">
              <Clock size={16} />
              <span>{lesson.duration}</span>
            </div>
            <div className="meta-item">
              <BookHalf size={16} />
              <span>{lesson.subject}</span>
            </div>
            <div className="meta-item">
              <Award size={16} />
              <span>{lesson.difficulty}</span>
            </div>
          </div>
          
          <div className="lesson-description">
            <h5>Description</h5>
            <p>{lesson.description}</p>
          </div>
          
          {lesson.content && (
            <div className="lesson-content">
              <h5>Lesson Content</h5>
              <div className="content-text">
                {typeof lesson.content === 'string' ? (
                  <p>{lesson.content}</p>
                ) : (
                  <p>Interactive lesson content available</p>
                )}
              </div>
            </div>
          )}
          
          {avatarVideoUrl ? (
            <div className="avatar-video-section">
              <h5>Lesson Video</h5>
              <div className="video-container">
                <video 
                  src={avatarVideoUrl} 
                  controls 
                  className="avatar-video"
                />
              </div>
            </div>
          ) : (
            <div className="avatar-actions">
              <Button 
                variant="outline-primary" 
                onClick={() => setShowAvatarModal(true)}
                className="create-avatar-btn"
              >
                <PlayCircleFill size={16} className="me-2" />
                Create Avatar Video
              </Button>
              
              {checkingStatus && (
                <div className="checking-status">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Checking for existing avatar...
                </div>
              )}
            </div>
          )}
          
          {lesson.objectives && lesson.objectives.length > 0 && (
            <div className="lesson-objectives">
              <h5>Learning Objectives</h5>
              <ul>
                {lesson.objectives.map((objective, index) => (
                  <li key={index}>{objective}</li>
                ))}
              </ul>
            </div>
          )}
          
          {lesson.prerequisites && lesson.prerequisites.length > 0 && (
            <div className="lesson-prerequisites">
              <h5>Prerequisites</h5>
              <div className="prerequisites-list">
                {lesson.prerequisites.map((prereq, index) => (
                  <Badge key={index} bg="light" text="dark" className="prereq-badge">
                    {prereq}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card.Body>
        
        <Card.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary">
            <PlayCircleFill size={16} className="me-2" />
            Start Lesson
          </Button>
        </Card.Footer>
      </Card>
      
      {/* Avatar Creation Modal */}
      <Modal 
        show={showAvatarModal} 
        onHide={() => setShowAvatarModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Avatar Video</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AvatarUploader 
            lessonId={lessonId} 
            onComplete={handleAvatarComplete} 
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default LessonDetail;