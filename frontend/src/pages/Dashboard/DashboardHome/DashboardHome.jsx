import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Form, Button } from "react-bootstrap";
import { SendFill, Book, QuestionCircle } from "react-bootstrap-icons";
import "./DashboardHome.scss";

const DashboardHome = () => {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!message.trim()) return;
    
    // Store the message in sessionStorage to retrieve it in the chat page
    sessionStorage.setItem("initialQuestion", message.trim());
    
    // Navigate to the chat page
    navigate("/dashboard/chat");
  };

  const handleSuggestionClick = (suggestion, mode) => {
    setMessage(suggestion);
    
    // Store the message and mode in sessionStorage
    sessionStorage.setItem("initialQuestion", suggestion);
    
    if (mode) {
      sessionStorage.setItem("initialMode", mode);
    }
    
    // Navigate to the chat page after a short delay
    setTimeout(() => navigate("/dashboard/chat"), 100);
  };

  return (
    <div className="minimalist-home">
      <Container className="chat-container">
        <div className="welcome-section">
          <img 
            src="/icons/aitutor-short-no-bg.png" 
            alt="AI Tutor" 
            className="brand-logo"
          />
          <h1 className="welcome-message">How can I help you today?</h1>
        </div>
        
        <Form className="chat-form" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <textarea
              placeholder="Message AI Tutor..."
              className="chat-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={1}
            />
            
            <div className="input-actions">
              <Button 
                type="submit" 
                className={`send-btn ${!message.trim() ? 'disabled' : ''}`}
                disabled={!message.trim()}
              >
                <SendFill />
              </Button>
            </div>
          </div>
        </Form>
        
        <div className="suggestion-chips">
          <button 
            className="suggestion-chip"
            onClick={() => handleSuggestionClick("Create a learning path for Python programming", "learning_path")}
          >
            <Book className="icon" />
            <span>Create a Python learning path</span>
          </button>
          <button 
            className="suggestion-chip"
            onClick={() => handleSuggestionClick("Generate a quiz about world history", "quiz")}
          >
            <QuestionCircle className="icon" />
            <span>Generate a history quiz</span>
          </button>
          <button 
            className="suggestion-chip"
            onClick={() => handleSuggestionClick("Explain machine learning concepts")}
          >
            <span>Explain machine learning</span>
          </button>
        </div>
      </Container>
    </div>
  );
};

export default DashboardHome;