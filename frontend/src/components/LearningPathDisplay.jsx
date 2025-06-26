import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { FaBook, FaClock, FaPlay, FaCheck, FaExternalLinkAlt, FaVideo, FaEdit, FaRobot } from 'react-icons/fa';
import { generateAvatarVideo, generateLessonScript } from '../api';
import './LearningPathDisplay.scss';

const LearningPathDisplay = ({ message }) => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parsedContent, setParsedContent] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("default_male");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [voiceUrl, setVoiceUrl] = useState("");
  const [script, setScript] = useState("");
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [isLoadingScript, setIsLoadingScript] = useState(false);

  // Extract content from the message
  const content = message?.content || message;

  // Process content with useEffect to handle async parsing and loading states
  useEffect(() => {
    const processContent = async () => {
      // If no content, keep loading state
      if (!content || (typeof content === 'string' && !content.trim())) {
        return; // Just keep loading, no error
      }

      // Handle case where content is a string (not parsed JSON)
      let processedContent = content;
      if (typeof content === 'string') {
        try {
          // Try to parse the string as JSON
          processedContent = JSON.parse(content);
          
          // If the parsed content has a 'content' property that's a string, it might be a nested response
          if (processedContent.content && typeof processedContent.content === 'string') {
            try {
              // Check if nested content is not empty
              if (processedContent.content.trim()) {
                const nestedContent = JSON.parse(processedContent.content);
                processedContent = nestedContent;
              }
            } catch (e) {
              // Keep the outer parsed content if nested parsing fails
            }
          } else if (processedContent.content && typeof processedContent.content === 'object') {
            // If content is already an object, use that directly
            processedContent = processedContent.content;
          }
        } catch (e) {
          // If parsing fails, just keep loading - no error shown
          return;
        }
      }

      // Only proceed if we have valid content with topics
      if (processedContent && 
          typeof processedContent === 'object' && 
          processedContent.topics && 
          Array.isArray(processedContent.topics)) {
        // Content is valid, set it and stop loading
        setParsedContent(processedContent);
        setIsLoading(false);
        setError(null);
        
        // Check if we have a lesson_id in the response
        if (processedContent.lesson_id) {
          setSelectedLesson(processedContent.lesson_id);
        }
      }
      // If content is not valid, just keep loading (no error)
    };

    processContent();
  }, [content]);

  const handleGenerateVideo = async () => {
    if (!selectedLesson) {
      setError("No lesson selected for video generation");
      return;
    }
    
    if (!avatarUrl) {
      setError("Please select or upload an avatar image");
      return;
    }
    
    setIsGeneratingVideo(true);
    setError(null);
    
    try {
      // First, ensure we have a script
      if (!script) {
        await fetchScript();
      }
      
      // Generate avatar video
      const result = await generateAvatarVideo(
        selectedLesson,
        avatarUrl,
        voiceUrl || null,
        selectedVoice
      );
      
      if (result.success) {
        setShowAvatarModal(false);
        // Show success message or redirect to lesson view
        alert("Avatar video generation started! You can view the status in the lesson details.");
      } else {
        setError(result.error || "Failed to generate avatar video");
      }
    } catch (error) {
      setError(error.message || "Failed to generate avatar video");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const fetchScript = async () => {
    if (!selectedLesson) return;
    
    setIsLoadingScript(true);
    try {
      const result = await generateLessonScript(selectedLesson);
      if (result && result.script) {
        setScript(result.script);
      }
    } catch (error) {
      console.error("Error fetching script:", error);
    } finally {
      setIsLoadingScript(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // In a real implementation, this would upload to S3
    // For now, we'll use a placeholder URL
    setAvatarUrl("https://example.com/avatar.jpg");
  };

  const handleVoiceUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // In a real implementation, this would upload to S3
    // For now, we'll use a placeholder URL
    setVoiceUrl("https://example.com/voice.mp3");
  };

  // Show loading spinner while processing content
  if (isLoading) {
    return (
      <div className="learning-path-container">
        <Card className="learning-path-card">
          <Card.Body className="text-center py-5">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p>Processing learning path...</p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // If no parsed content yet, return null or keep loading
  if (!parsedContent) {
    return null;
  }

  return (
    <div className="learning-path-container">
      <Card className="learning-path-card">
        <Card.Header className="learning-path-header">
          <div className="header-content">
            <h3 className="path-title">{parsedContent.name || "Learning Path"}</h3>
            <div className="path-meta">
              <Badge bg="primary" className="duration-badge">
                <FaClock className="me-1" />
                {parsedContent.course_duration || "N/A"}
              </Badge>
              {parsedContent.tags && parsedContent.tags.length > 0 && (
                <div className="tags">
                  {parsedContent.tags.slice(0, 3).map((tag, i) => (
                    <Badge key={i} bg="secondary" className="tag-badge">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card.Header>
        
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {parsedContent.description && (
            <div className="path-description mb-4">
              <p>{parsedContent.description}</p>
            </div>
          )}
          
          {parsedContent.links && parsedContent.links.length > 0 && (
            <div className="path-links mb-4">
              <h5>Recommended Resources</h5>
              <ul className="resource-list">
                {parsedContent.links.map((link, index) => (
                  <li key={index}>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      <FaExternalLinkAlt className="me-2" />
                      {link.replace(/^https?:\/\//, '').split('/')[0]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="topics-container">
            <h5 className="topics-heading">Learning Topics</h5>
            {parsedContent.topics.map((topic, index) => (
              <Card key={index} className="topic-card mb-3">
                <Card.Body>
                  <div className="topic-header">
                    <h5 className="topic-title">
                      <span className="topic-number">{index + 1}</span>
                      {topic.name}
                    </h5>
                    <Badge bg="info" className="time-badge">
                      <FaClock className="me-1" />
                      {topic.time_required}
                    </Badge>
                  </div>
                  
                  <p className="topic-description">{topic.description}</p>
                  
                  <div className="topic-resources">
                    {topic.links && topic.links.length > 0 && (
                      <div className="resource-section">
                        <h6>
                          <FaBook className="me-2" />
                          Reading Materials
                        </h6>
                        <ul className="resource-list">
                          {topic.links.map((link, i) => (
                            <li key={i}>
                              <a href={link} target="_blank" rel="noopener noreferrer">
                                <FaExternalLinkAlt className="me-2" />
                                {link.replace(/^https?:\/\//, '').split('/')[0]}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {topic.videos && topic.videos.length > 0 && (
                      <div className="resource-section">
                        <h6>
                          <FaVideo className="me-2" />
                          Video Resources
                        </h6>
                        <ul className="resource-list">
                          {topic.videos.map((video, i) => (
                            <li key={i}>
                              <a href={video} target="_blank" rel="noopener noreferrer">
                                <FaExternalLinkAlt className="me-2" />
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
        </Card.Body>
        
        <Card.Footer className="learning-path-footer">
          <div className="action-buttons">
            <Button
              variant="primary"
              className="start-btn"
              onClick={() => window.location.href = `/dashboard/learning`}
            >
              <FaPlay className="me-2"/>
              Start Learning
            </Button>
            
            <Button
              variant="success"
              className="avatar-btn"
              onClick={() => setShowAvatarModal(true)}
            >
              <FaRobot className="me-2"/>
              Create AI Tutor Video
            </Button>
          </div>
        </Card.Footer>
      </Card>
      
      {/* Avatar Creation Modal */}
      <Modal 
        show={showAvatarModal} 
        onHide={() => setShowAvatarModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create AI Tutor Video</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-4">
            Personalize your learning experience by creating an AI tutor video. 
            Choose an avatar and voice to narrate your lesson.
          </p>
          
          <Form>
            <Form.Group className="mb-4">
              <Form.Label>1. Choose Avatar Image</Form.Label>
              <div className="avatar-selection">
                <div className="avatar-upload">
                  <div className="upload-placeholder">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="avatar-preview" />
                    ) : (
                      <>
                        <FaEdit size={32} />
                        <p>Click to upload an image</p>
                      </>
                    )}
                  </div>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="d-none"
                    id="avatar-upload"
                  />
                  <Form.Label htmlFor="avatar-upload" className="upload-btn">
                    Choose Image
                  </Form.Label>
                </div>
                
                <div className="predefined-avatars">
                  <h6>Or select a predefined avatar:</h6>
                  <div className="avatar-grid">
                    {/* Placeholder predefined avatars */}
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i} 
                        className={`avatar-item ${avatarUrl === `avatar-${i}` ? 'selected' : ''}`}
                        onClick={() => setAvatarUrl(`avatar-${i}`)}
                      >
                        <div className="avatar-img">
                          <FaRobot size={24} />
                        </div>
                        <div className="avatar-name">Avatar {i}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label>2. Choose Voice</Form.Label>
              <div className="voice-selection">
                <div className="voice-options">
                  <Form.Check
                    type="radio"
                    id="default-male"
                    name="voice-type"
                    label="Default Male Voice"
                    checked={selectedVoice === "default_male"}
                    onChange={() => setSelectedVoice("default_male")}
                    className="mb-2"
                  />
                  <Form.Check
                    type="radio"
                    id="default-female"
                    name="voice-type"
                    label="Default Female Voice"
                    checked={selectedVoice === "default_female"}
                    onChange={() => setSelectedVoice("default_female")}
                    className="mb-2"
                  />
                  <Form.Check
                    type="radio"
                    id="custom-voice"
                    name="voice-type"
                    label="Upload Your Voice"
                    checked={selectedVoice === "custom"}
                    onChange={() => setSelectedVoice("custom")}
                  />
                  
                  {selectedVoice === "custom" && (
                    <div className="voice-upload mt-3">
                      <Form.Control
                        type="file"
                        accept="audio/*"
                        onChange={handleVoiceUpload}
                        className="mb-2"
                      />
                      <small className="text-muted">
                        Upload a clear voice recording (MP3, WAV) of at least 30 seconds
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label>3. Narration Script</Form.Label>
              <div className="script-preview">
                {isLoadingScript ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" />
                    <p className="mt-2">Generating script...</p>
                  </div>
                ) : (
                  <>
                    <div className="script-content">
                      {script ? (
                        <p>{script.length > 200 ? `${script.substring(0, 200)}...` : script}</p>
                      ) : (
                        <p className="text-muted">
                          A narration script will be automatically generated from your learning path.
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => {
                        fetchScript();
                        setShowScriptModal(true);
                      }}
                    >
                      {script ? "View Full Script" : "Generate Script"}
                    </Button>
                  </>
                )}
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAvatarModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleGenerateVideo}
            disabled={isGeneratingVideo || !avatarUrl}
          >
            {isGeneratingVideo ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Generating...
              </>
            ) : (
              <>
                <FaPlay className="me-2" />
                Generate Video
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Script Modal */}
      <Modal
        show={showScriptModal}
        onHide={() => setShowScriptModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Narration Script</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoadingScript ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Generating narration script...</p>
            </div>
          ) : (
            <div className="script-full-content">
              {script ? (
                <p style={{ whiteSpace: 'pre-line' }}>{script}</p>
              ) : (
                <p className="text-muted">No script available yet. Click "Generate Script" to create one.</p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!script && !isLoadingScript && (
            <Button 
              variant="primary" 
              onClick={fetchScript}
            >
              Generate Script
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowScriptModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default LearningPathDisplay;