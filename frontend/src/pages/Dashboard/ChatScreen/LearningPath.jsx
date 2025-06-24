import React, { useEffect, useState } from "react";
import { Card, Container, Button, Alert } from "react-bootstrap";
import { saveLearningPath, getAllLearningGoals, askQuestion } from "../../../api";
import { useSelector, useDispatch } from "react-redux";
import { setChatHistory, setIsGenerating, setIsLearningPathQuery, setLearningGoals, setStreamChat } from "../../../globalSlice";
import { FaPlus, FaRedo, FaCheck } from "react-icons/fa";

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
    <Container className="mt-3">
      <Card className="p-3 mb-4 bg-light text-dark">
        <Card.Body>
          <Card.Title className="h4">{content.name || "Learning Path"}</Card.Title>
          <Card.Subtitle className="mb-2 text-muted">
            Duration: {content.course_duration || "N/A"}
          </Card.Subtitle>
          
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
        </Card.Body>
      </Card>

      <div className="d-flex flex-column" style={{ maxWidth: "700px" }}>
        {content.topics.map((topic, index) => (
          <Card key={index} className="mb-3 bg-light w-100">
            <Card.Body>
              <h3>{topic.name}</h3>
              <h5>{topic.description}</h5>
              <p><strong>Time Required:</strong> {topic.time_required}</p>

              {/* Links Section */}
              {topic.links && topic.links.length > 0 && (
                <div>
                  <h6>Resources:</h6>
                  <ul>
                    {topic.links.map((link, i) => (
                      <li key={i}><a href={link} target="_blank" rel="noopener noreferrer">{link}</a></li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Videos Section */}
              {topic.videos && topic.videos.length > 0 && (
                <div>
                  <h6>Videos:</h6>
                  <ul>
                    {topic.videos.map((video, i) => (
                      <li key={i}><a href={video} target="_blank" rel="noopener noreferrer">{video}</a></li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subtopics Section */}
              {topic.subtopics && topic.subtopics.length > 0 && (
                <div>
                  <h6>Subtopics:</h6>
                  <ul>
                    {topic.subtopics.map((sub, i) => (
                      <li key={i}>{sub.name} - {sub.description}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      {isSaved ? (
        <div className="mx-2 mb-4">
          <div className="d-flex align-items-center text-success">
            <FaCheck className="me-2" />
            <span style={{fontSize: "0.85rem"}}>Study Plan Saved</span>
          </div>
        </div>
      ) : (
        <Card className="bg-white p-3 mb-4 border-0 d-flex flex-row">
          <Button
            variant="outline-primary"
            className="me-2 rounded-pill"
            style={{ 
              height: '38px', 
              fontSize: "0.875rem", 
              borderWidth: "2px"
            }}
            onClick={handleSave}
            disabled={isSaving}
          >
            <FaPlus size={14} className="me-2"/>
            {isSaving ? 'Saving...' : 'Save Study Plan'}
          </Button>
          <Button
            variant="outline-primary"
            className="rounded-pill"
            style={{ 
              height: '38px', 
              fontSize: "0.875rem", 
              borderWidth: "2px"
            }}
            onClick={handleRegenerate}
          >
            <FaRedo size={14} className="me-2"/>
            Regenerate
          </Button>
        </Card>
      )}
    </Container>
  );
};

export default LearningPath;