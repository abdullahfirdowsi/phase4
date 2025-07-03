import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Form, Button } from "react-bootstrap";
import { SendFill, Book, QuestionCircle, Lightbulb } from "react-bootstrap-icons";
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
    console.log('🎯 Suggestion clicked:', { suggestion, mode });
    
    // Clear any existing storage first to prevent conflicts
    sessionStorage.removeItem("initialQuestion");
    sessionStorage.removeItem("initialMode");
    
    // Store the message and mode in sessionStorage with a small delay
    setTimeout(() => {
      sessionStorage.setItem("initialQuestion", suggestion);
      
      if (mode) {
        sessionStorage.setItem("initialMode", mode);
        console.log('💾 Mode set:', mode);
      }
      
      // Navigate to the chat page after storage is set
      console.log('🚀 Navigating to AI Chat');
      navigate("/dashboard/chat");
    }, 50); // Small delay to ensure storage operations complete
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
            onClick={() => handleSuggestionClick("Create a Python learning path", "learning_path")}
          >
            <Book className="icon" />
            <span>Create a Python learning path</span>
          </button>
          <button 
            className="suggestion-chip"
            onClick={() => handleSuggestionClick("Generate a history quiz", "quiz")}
          >
            <QuestionCircle className="icon" />
            <span>Generate a history quiz</span>
          </button>
          <button 
            className="suggestion-chip"
            onClick={() => handleSuggestionClick("Explain machine learning")}
          >
            <Lightbulb className="icon" />
            <span>Explain machine learning</span>
          </button>
        </div>
      </Container>
    </div>
  );
};

export default DashboardHome;