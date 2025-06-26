import React, { useState, useEffect, memo, useMemo } from 'react';
import { Card, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { FaExternalLinkAlt, FaVideo, FaBook, FaClock, FaSave, FaCheck } from 'react-icons/fa';
import { saveLearningPath } from '../../api';
import './LearningPathDisplay.scss';

const LearningPathDisplay = memo(({ message }) => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parsedContent, setParsedContent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 LearningPathDisplay rendering with message:', message);
  }

  // Extract content from the message with memoization
  const content = useMemo(() => {
    return message?.content || message;
  }, [message]);

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
          // If parsing fails, try to see if it's malformed but recoverable
          try {
            // Sometimes the JSON might be slightly malformed, try to clean it
            const cleanedContent = content.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
            if (cleanedContent.startsWith('{') && cleanedContent.endsWith('}')) {
              processedContent = JSON.parse(cleanedContent);
            } else {
              return;
            }
          } catch (e2) {
            return;
          }
        }
      } else if (typeof content === 'object') {
        processedContent = content;
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
      } else {
        // If we have content but it's not a valid learning path, show an error
        if (processedContent && typeof processedContent === 'object') {
          setError('Content does not appear to be a valid learning path format.');
          setIsLoading(false);
        }
        // Otherwise keep loading (no error)
      }
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

  // Save learning path function
  const handleSaveLearningPath = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      console.log('📊 Parsed Content Structure:', parsedContent);
      
      // Transform the parsed content to match the expected API format
      const pathData = {
        name: parsedContent.name || parsedContent.topic || "Learning Path",
        description: parsedContent.description || "",
        difficulty: parsedContent.difficulty || "Intermediate",
        duration: parsedContent.course_duration || parsedContent.duration || "4-6 weeks",
        prerequisites: parsedContent.prerequisites || [],
        topics: (parsedContent.topics || []).map((topic, index) => ({
          name: topic.name || topic.title || `Topic ${index + 1}`,
          description: topic.description || "",
          time_required: topic.time_required || topic.duration || "1 hour",
          links: topic.links || [],
          videos: topic.videos || [],
          subtopics: topic.subtopics || [],
          completed: false
        })),
        tags: parsedContent.tags || []
      };
      
      console.log('📝 Sending Path Data:', pathData);
      
      await saveLearningPath(pathData);
      setIsSaved(true);
      
      // Show success message briefly
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving learning path:', error);
      setError('Failed to save learning path. Please try again.');
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
                  {parsedContent.course_duration || 
                   parsedContent.duration || 
                   (parsedContent.topics ? 
                     parsedContent.topics.reduce((total, topic) => {
                       const hours = parseInt(topic.time_required) || 0;
                       return total + hours;
                     }, 0) + " hours total" : "N/A")}
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
                            {typeof sub === 'string' ? (
                              <span>{sub}</span>
                            ) : (
                              <>
                                <strong>{sub.name}</strong>
                                {sub.description && <p>{sub.description}</p>}
                              </>
                            )}
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
          <div className="d-flex justify-content-between align-items-center">
            <div className="path-stats">
              <Badge bg="outline-secondary">
                {parsedContent.topics.length} Topics
              </Badge>
            </div>
            <div className="path-actions">
              {isSaved ? (
                <Button variant="success" disabled>
                  <FaCheck className="me-2" />
                  Saved!
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  onClick={handleSaveLearningPath}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      Save to My Learning Paths
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card.Footer>
        
      </Card>
    </div>
  );
});

export default LearningPathDisplay;
