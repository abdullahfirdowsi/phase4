import React, { useState } from 'react';
import { Card, Badge, Button, Alert } from 'react-bootstrap';
import { FaPlus, FaRedo, FaCheck, FaExternalLinkAlt, FaVideo, FaBook, FaClock } from 'react-icons/fa';
import { saveLearningPath } from '../../api';
import './LearningPathDisplay.scss';

const LearningPathDisplay = ({ content }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Log the content type and value for debugging
  console.log("Learning Path Content Type:", typeof content);
  console.log("Learning Path Content Preview:", 
    typeof content === 'string' 
      ? content.substring(0, 100) + '...' 
      : JSON.stringify(content).substring(0, 100) + '...'
  );

  // Handle case where content is a string (not parsed JSON)
  let parsedContent = content;
  if (typeof content === 'string') {
    try {
      // Check if the string is empty or just whitespace
      if (!content.trim()) {
        throw new Error("Content is empty");
      }
      
      // Try to parse the string as JSON
      parsedContent = JSON.parse(content);
      console.log("Successfully parsed string content as JSON");
      
      // If the parsed content has a 'content' property that's a string, it might be a nested response
      if (parsedContent.content && typeof parsedContent.content === 'string') {
        try {
          // Check if nested content is not empty
          if (parsedContent.content.trim()) {
            const nestedContent = JSON.parse(parsedContent.content);
            parsedContent = nestedContent;
            console.log("Successfully parsed nested content as JSON");
          }
        } catch (e) {
          console.error("Failed to parse nested content as JSON:", e);
          // Keep the outer parsed content
        }
      } else if (parsedContent.content && typeof parsedContent.content === 'object') {
        // If content is already an object, use that directly
        parsedContent = parsedContent.content;
        console.log("Using nested content object directly");
      }
    } catch (e) {
      console.error("Failed to parse content as JSON:", e);
      return (
        <div className="learning-path-error">
          <Alert variant="warning">
            Unable to display learning path. The content is not in the expected format.
            <br />
            <small>Error: {e.message}</small>
            <br />
            <small>Content preview: {typeof content === 'string' ? content.substring(0, 100) : 'Not a string'}</small>
          </Alert>
        </div>
      );
    }
  }

  // If content is still not valid, return error
  if (!parsedContent || typeof parsedContent !== 'object') {
    console.error("Content is not a valid object:", parsedContent);
    return (
      <div className="learning-path-error">
        <Alert variant="warning">
          Unable to display learning path. The content is not a valid object.
        </Alert>
      </div>
    );
  }

  // Check if the required fields exist
  if (!parsedContent.topics || !Array.isArray(parsedContent.topics)) {
    console.error("Content is missing required 'topics' array:", parsedContent);
    return (
      <div className="learning-path-error">
        <Alert variant="warning">
          Unable to display learning path. The content is missing required data.
          <br />
          <small>Expected a 'topics' array but found: {Object.keys(parsedContent).join(', ')}</small>
        </Alert>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      // Call API to save the learning path
      await saveLearningPath(parsedContent, parsedContent.name);
      
      setIsSaved(true);
      setSuccess("Learning path saved successfully!");
    } catch (error) {
      console.error(error);
      setError("Failed to save learning path. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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
          
          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
              {success}
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
          {isSaved ? (
            <div className="saved-indicator">
              <FaCheck className="me-2" />
              <span>Study Plan Saved</span>
            </div>
          ) : (
            <div className="action-buttons">
              <Button
                variant="primary"
                className="save-btn"
                onClick={handleSave}
                disabled={isSaving}
              >
                <FaPlus className="me-2"/>
                {isSaving ? 'Saving...' : 'Save Study Plan'}
              </Button>
              <Button
                variant="outline-primary"
                className="regenerate-btn"
              >
                <FaRedo className="me-2"/>
                Regenerate
              </Button>
            </div>
          )}
        </Card.Footer>
      </Card>
    </div>
  );
};

export default LearningPathDisplay;