import React, { useState } from "react";
import { Container, Form, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { ChatDots } from "react-bootstrap-icons";
import "./DashboardHome.scss";

const DashboardHome = () => {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) {
      setError("Please enter a question or topic");
      return;
    }

    setIsLoading(true);
    
    // Store the question in sessionStorage to use in the chat page
    sessionStorage.setItem("initialQuestion", inputValue.trim());
    
    // Navigate to chat page after a brief delay to show loading state
    setTimeout(() => {
      // Use navigate with replace to ensure we can't go back to the input page
      navigate("/dashboard/chat", { replace: true });
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    // Submit the form after a short delay to allow the input to update visually
    setTimeout(() => {
      sessionStorage.setItem("initialQuestion", suggestion.trim());
      setIsLoading(true);
      navigate("/dashboard/chat", { replace: true });
    }, 100);
  };

  return (
    <div className="minimalist-dashboard-home">
      <Container fluid className="dashboard-container">
        <div className="input-container">
          <div className="input-content">
            <h1 className="welcome-title">How can I help you learn today?</h1>
            <p className="welcome-subtitle">
              Ask a question, request a learning path, or generate a quiz
            </p>

            <Form onSubmit={handleSubmit} className="search-form">
              <div className="input-wrapper">
                <Form.Control
                  type="text"
                  placeholder="e.g., 'Create a learning path for Python programming'"
                  value={inputValue}
                  onChange={handleInputChange}
                  className="search-input"
                  disabled={isLoading}
                  autoFocus
                />
                <Button 
                  type="submit" 
                  className="submit-button"
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <>
                      <ChatDots size={18} />
                      <span>Ask</span>
                    </>
                  )}
                </Button>
              </div>
              {error && <div className="error-message">{error}</div>}
            </Form>

            <div className="suggestion-chips">
              <Button 
                variant="outline-primary" 
                className="suggestion-chip"
                onClick={() => handleSuggestionClick("Create a learning path for JavaScript")}
                disabled={isLoading}
              >
                JavaScript learning path
              </Button>
              <Button 
                variant="outline-primary" 
                className="suggestion-chip"
                onClick={() => handleSuggestionClick("Generate a quiz about world history")}
                disabled={isLoading}
              >
                History quiz
              </Button>
              <Button 
                variant="outline-primary" 
                className="suggestion-chip"
                onClick={() => handleSuggestionClick("Explain quantum computing")}
                disabled={isLoading}
              >
                Quantum computing
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default DashboardHome;