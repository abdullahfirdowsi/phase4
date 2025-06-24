import React, { useEffect, useState } from "react";
import { Card, Container, Button, Alert, Row, Col, Badge } from "react-bootstrap";
import { saveLearningPath, getAllLearningGoals, askQuestion } from "../../../api";
import { useSelector, useDispatch } from "react-redux";
import { setChatHistory, setIsGenerating, setIsLearningPathQuery, setLearningGoals, setStreamChat } from "../../../globalSlice";
import { FaPlus, FaRedo, FaCheck, FaExternalLinkAlt, FaVideo, FaBook, FaClock } from "react-icons/fa";

const LearningPath = ({ content, refreshChat }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const learningGoals = useSelector((state) => state.global.learningGoals);
  const dispatch = useDispatch();
  const isQuizQuery = useSelector((state) => state.global.isQuizQuery);
  const isLearningPathQuery = useSelector((state) => state.global.isLearningPathQuery);
  const chatHistory = useSelector((state) => state.global.chatHistory);

  useEffect(() => {
    const checkSaved = () => {
      if (learningGoals && content && content.name) {
        const goalExists = learningGoals.some((goal) => goal.name === content.name);
        setIsSaved(goalExists);
      }
    };
    checkSaved();
  }, [learningGoals, content]);

  useEffect(() => {
    const fetchLearningGoals = async () => {
      try {
        const goals = await getAllLearningGoals();
        dispatch(setLearningGoals(goals));
      } catch (error) {
        console.error(error);
        setError("Failed to load learning goals. Please try again.");
      }
    };
    fetchLearningGoals();
  }, [dispatch]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      // Store the last message for regeneration if needed
      const lastUserMessage = chatHistory.filter(msg => msg.role === "user").pop();
      if (lastUserMessage) {
        localStorage.setItem("lastMessage", lastUserMessage.content);
      }
      
      // Make sure content is valid
      if (!content || !content.name || !content.topics || !Array.isArray(content.topics)) {
        throw new Error("Invalid learning path data");
      }
      
      await saveLearningPath(content, content.name);
      const goals = await getAllLearningGoals();
      dispatch(setLearningGoals(goals));
      setIsSaved(true);
      setSuccess("Learning path saved successfully!");
    } catch (error) {
      console.error(error);
      setError("Failed to save learning path. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: "Regenerate", type: "content", isLearningPathQuery },
      { role: "assistant", content: "", type: "streaming" }
    ];
    const message = localStorage.getItem("lastMessage") || "Create a learning path";
    dispatch(setChatHistory(updatedHistory));
    dispatch(setIsGenerating(true));
    try {
      await askQuestion(
        message,
        (partialResponse) => {
          dispatch(setStreamChat(partialResponse));
        },
        () => {
          refreshChat(); 
          dispatch(setIsGenerating(false));
          dispatch(setIsLearningPathQuery(false));
        },
        isQuizQuery, 
        true
      );
    } catch (error) {
      console.error("Error sending message:", error);
      dispatch(setIsGenerating(false));
    }
  };

  if (!content || !content.topics) return null;

  return (
    <div className="learning-path-container">
      <Card className="learning-path-card">
        <Card.Header className="learning-path-header">
          <div className="header-content">
            <h3 className="path-title">{content.name || "Learning Path"}</h3>
            <div className="path-meta">
              <Badge bg="primary" className="duration-badge">
                <FaClock className="me-1" />
                {content.course_duration || "N/A"}
              </Badge>
              {content.tags && content.tags.length > 0 && (
                <div className="tags">
                  {content.tags.slice(0, 3).map((tag, i) => (
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
          
          {content.description && (
            <div className="path-description mb-4">
              <p>{content.description}</p>
            </div>
          )}
          
          {content.links && content.links.length > 0 && (
            <div className="path-links mb-4">
              <h5>Recommended Resources</h5>
              <ul className="resource-list">
                {content.links.map((link, index) => (
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
            {content.topics.map((topic, index) => (
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
                onClick={handleRegenerate}
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

export default LearningPath;