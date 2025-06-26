import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Alert, Spinner, Modal, Form, Row, Col } from 'react-bootstrap';
import { Clock, BookHalf, Award, PlayCircleFill, CheckCircle, XCircle, Upload, Mic, VolumeUp } from 'react-bootstrap-icons';
import { getLessonDetail, generateAvatar, getAvatarStatus, getAvailableVoices } from '../../../api';
import AvatarUploader from '../../../components/AvatarUploader/AvatarUploader';
import AvatarCreator from '../../../components/AvatarCreator/AvatarCreator';
import './LessonDetail.scss';

const LessonDetail = ({ lessonId, onClose }) => {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [availableVoices, setAvailableVoices] = useState({});
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("default_male");
  const [script, setScript] = useState("");
  const [loadingScript, setLoadingScript] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);

  useEffect(() => {
    fetchLessonDetail();
    fetchAvailableVoices();
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
      } else if (data.lesson.status && data.lesson.status.includes("video_")) {
        // Check status in case generation is in progress
        checkAvatarStatus();
      }
      
      // Fetch script if available
      if (data.lesson.script) {
        setScript(data.lesson.script);
      } else {
        fetchScript();
      }
    } catch (error) {
      console.error('Error fetching lesson detail:', error);
      setError('Failed to load lesson details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableVoices = async () => {
    try {
      setLoadingVoices(true);
      const data = await getAvailableVoices();
      if (data.success) {
        setAvailableVoices(data.voices || {});
      }
    } catch (error) {
      console.error('Error fetching available voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  const fetchScript = async () => {
    try {
      setLoadingScript(true);
      const response = await fetch(`/lessons/${lessonId}/script?username=${localStorage.getItem("username")}`);
      
      if (response.ok) {
        const data = await response.json();
        setScript(data.script);
      } else {
        console.error('Failed to fetch script');
      }
    } catch (error) {
      console.error('Error fetching script:', error);
    } finally {
      setLoadingScript(false);
    }
  };

  const checkAvatarStatus = async () => {
    try {
      setCheckingStatus(true);
      const status = await getAvatarStatus(lessonId);
      
      if (status.status === 'video_ready' && status.video_url) {
        setAvatarVideoUrl(status.video_url);
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

  const handleAvatarCreated = (avatarData) => {
    console.log('Avatar created:', avatarData);
    
    // Start avatar generation with the selected avatar
    startAvatarGeneration(avatarData.imageUrl, avatarData.voiceId, avatarData.voiceUrl);
    
    // Close the avatar creator modal
    setShowAvatarCreator(false);
  };

  const startAvatarGeneration = async (imageUrl, voiceId = null, voiceUrl = null) => {
    try {
      setError(null);
      
      // Generate avatar video
      const result = await generateAvatar(
        lessonId, 
        imageUrl, 
        'en', // Default language
        voiceId, // Voice ID (if selected)
        selectedVoice, // Voice type
        voiceUrl // Voice URL (if uploaded)
      );
      
      if (result.success) {
        setShowAvatarModal(true);
      } else {
        setError(result.error || 'Failed to start avatar generation');
      }
    } catch (error) {
      setError(error.message || 'Failed to start avatar generation');
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

  const renderLearningPath = () => {
    if (!lesson || !lesson.learning_path) return null;
    
    const learningPath = lesson.learning_path;
    
    return (
      <div className="learning-path-section">
        <h5>Learning Path</h5>
        
        {learningPath.topics && learningPath.topics.length > 0 && (
          <div className="topics-list">
            {learningPath.topics.map((topic, index) => (
              <Card key={index} className="topic-card mb-3">
                <Card.Body>
                  <div className="topic-header">
                    <h6 className="topic-title">
                      <span className="topic-number">{index + 1}</span>
                      {topic.name}
                    </h6>
                    {topic.time_required && (
                      <Badge bg="info" className="time-badge">
                        <Clock className="me-1" />
                        {topic.time_required}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="topic-description">{topic.description}</p>
                  
                  <div className="topic-resources">
                    {topic.links && topic.links.length > 0 && (
                      <div className="resource-section">
                        <h6>Reading Materials</h6>
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
                        <h6>Video Resources</h6>
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
                      <h6>Subtopics</h6>
                      <ul className="subtopics-list">
                        {topic.subtopics.map((sub, i) => (
                          <li key={i}>
                            <strong>{sub.name}</strong>
                            {sub.description && <p>{sub.description}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
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
              {lesson.status && (
                <Badge bg={
                  lesson.status === "video_ready" ? "success" :
                  lesson.status.includes("failed") ? "danger" :
                  "warning"
                }>
                  {lesson.status.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </div>
        </Card.Header>
        
        <Card.Body>
          <div className="lesson-meta">
            <div className="meta-item">
              <Clock size={16} />
              <span>{lesson.duration} minutes</span>
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
          
          {avatarVideoUrl ? (
            <div className="avatar-video-section">
              <h5>AI Tutor Video</h5>
              <div className="video-container">
                <video 
                  src={avatarVideoUrl} 
                  controls 
                  className="avatar-video"
                />
              </div>
              <div className="video-actions">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => setShowScriptModal(true)}
                >
                  View Narration Script
                </Button>
              </div>
            </div>
          ) : (
            <div className="avatar-actions">
              <Button 
                variant="primary" 
                onClick={() => setShowAvatarCreator(true)}
                className="create-avatar-btn"
              >
                <PlayCircleFill size={16} className="me-2" />
                Create AI Tutor Avatar
              </Button>
              
              {checkingStatus && (
                <div className="checking-status">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Checking for existing avatar...
                </div>
              )}
            </div>
          )}
          
          {renderLearningPath()}
          
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
        show={showAvatarCreator} 
        onHide={() => setShowAvatarCreator(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create AI Tutor Avatar</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="avatar-creator-content">
            <p className="mb-4">
              Personalize your learning experience by creating an AI tutor avatar. 
              Upload your own image or select from our predefined avatars.
            </p>
            
            <Row>
              <Col md={6}>
                <div className="avatar-upload-section">
                  <h5>1. Choose Avatar Image</h5>
                  <div className="upload-container">
                    <div className="upload-placeholder">
                      <Upload size={32} />
                      <p>Click to upload an image</p>
                      <small>JPG, PNG (max 5MB)</small>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="file-input" 
                      onChange={(e) => console.log(e.target.files[0])}
                    />
                  </div>
                </div>
              </Col>
              
              <Col md={6}>
                <div className="voice-selection-section">
                  <h5>2. Choose Voice</h5>
                  
                  <div className="voice-options">
                    <div className="voice-option">
                      <input 
                        type="radio" 
                        id="default-male" 
                        name="voice-type" 
                        value="default_male"
                        checked={selectedVoice === "default_male"}
                        onChange={() => setSelectedVoice("default_male")}
                      />
                      <label htmlFor="default-male">
                        <VolumeUp size={20} className="me-2" />
                        Default Male Voice
                      </label>
                    </div>
                    
                    <div className="voice-option">
                      <input 
                        type="radio" 
                        id="default-female" 
                        name="voice-type" 
                        value="default_female"
                        checked={selectedVoice === "default_female"}
                        onChange={() => setSelectedVoice("default_female")}
                      />
                      <label htmlFor="default-female">
                        <VolumeUp size={20} className="me-2" />
                        Default Female Voice
                      </label>
                    </div>
                    
                    <div className="voice-option">
                      <input 
                        type="radio" 
                        id="custom-voice" 
                        name="voice-type" 
                        value="custom"
                        checked={selectedVoice === "custom"}
                        onChange={() => setSelectedVoice("custom")}
                      />
                      <label htmlFor="custom-voice">
                        <Mic size={20} className="me-2" />
                        Upload Your Voice
                      </label>
                    </div>
                    
                    {selectedVoice === "custom" && (
                      <div className="voice-upload mt-3">
                        <Button variant="outline-primary" size="sm">
                          <Mic size={16} className="me-2" />
                          Record Voice Sample
                        </Button>
                        <small className="d-block mt-2">
                          Or upload an audio file (MP3, WAV, max 5MB)
                        </small>
                        <input 
                          type="file" 
                          accept="audio/*" 
                          className="mt-2" 
                          onChange={(e) => console.log(e.target.files[0])}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
            
            <div className="script-preview mt-4">
              <h5>3. Narration Script Preview</h5>
              {loadingScript ? (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" />
                  <p className="mt-2">Loading script...</p>
                </div>
              ) : (
                <>
                  <div className="script-content">
                    {script ? (
                      <p>{script.length > 300 ? `${script.substring(0, 300)}...` : script}</p>
                    ) : (
                      <p className="text-muted">No script available. One will be generated automatically.</p>
                    )}
                  </div>
                  {script && (
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => setShowScriptModal(true)}
                    >
                      View Full Script
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAvatarCreator(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary"
            onClick={() => {
              // In a real implementation, this would upload the image and voice,
              // then call the API to generate the avatar video
              setShowAvatarCreator(false);
              setShowAvatarModal(true);
            }}
          >
            Generate Avatar Video
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Avatar Generation Modal */}
      <Modal 
        show={showAvatarModal} 
        onHide={() => setShowAvatarModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>AI Tutor Avatar Generation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AvatarUploader 
            lessonId={lessonId} 
            onComplete={handleAvatarComplete} 
          />
        </Modal.Body>
      </Modal>
      
      {/* Script Modal */}
      <Modal
        show={showScriptModal}
        onHide={() => setShowScriptModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Narration Script</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingScript ? (
            <div className="text-center py-3">
              <Spinner animation="border" />
              <p className="mt-3">Loading script...</p>
            </div>
          ) : (
            <div className="script-full-content">
              {script ? (
                <p style={{ whiteSpace: 'pre-line' }}>{script}</p>
              ) : (
                <p className="text-muted">No script available.</p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowScriptModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default LessonDetail;