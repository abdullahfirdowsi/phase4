import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { FaExternalLinkAlt, FaVideo, FaBook, FaClock } from 'react-icons/fa';
// Removed saveLearningPath import - save functionality has been removed
import './LearningPathDisplay.scss';

const LearningPathDisplay = ({ message }) => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parsedContent, setParsedContent] = useState(null);

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
      }
      // If content is not valid, just keep loading (no error)
    };

    processContent();
  }, [content]);

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

  // Save functionality has been completely removed

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
        
      </Card>
    </div>
  );
};

export default LearningPathDisplay;