import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Form, Button } from "react-bootstrap";
import { SendFill } from "react-bootstrap-icons";
import "./DashboardHome.scss";

const DashboardHome = () => {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    // Store the message in sessionStorage to retrieve it in the chat page
    sessionStorage.setItem("initialQuestion", message.trim());
    
    // Navigate to the chat page
    navigate("/dashboard/chat");
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
          <div className="input-container">
            <Form.Control
              type="text"
              placeholder="Send a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="chat-input"
            />
            <Button 
              type="submit" 
              className="send-button"
              disabled={!message.trim()}
            >
              <SendFill />
            </Button>
          </div>
        </Form>
        
        <div className="suggestion-chips">
          <button 
            className="suggestion-chip"
            onClick={() => {
              setMessage("Create a learning path for Python programming");
              setTimeout(() => handleSubmit({ preventDefault: () => {} }), 100);
            }}
          >
            Create a Python learning path
          </button>
          <button 
            className="suggestion-chip"
            onClick={() => {
              setMessage("Generate a quiz about world history");
              setTimeout(() => handleSubmit({ preventDefault: () => {} }), 100);
            }}
          >
            Generate a history quiz
          </button>
          <button 
            className="suggestion-chip"
            onClick={() => {
              setMessage("Explain machine learning concepts");
              setTimeout(() => handleSubmit({ preventDefault: () => {} }), 100);
            }}
          >
            Explain machine learning
          </button>
        </div>
      </Container>
    </div>
  );
};

export default DashboardHome;