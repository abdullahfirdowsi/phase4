import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import ChatInput from "./ChatInput";
import AIMessage from "./AIMessage";
import { fetchChatHistory, clearChat, searchMessages } from "../../../api";
import { formatDistanceToNow } from "date-fns";
import { Container, Row, Card, Spinner, Button, Modal } from "react-bootstrap";
import {
  setChatHistory,
  setIsGenerating,
  setIsLearningPathQuery,
  setIsQuizQuery,
  addTemporaryMessage
} from "../../../globalSlice";
import "./ChatScreen.scss";
import { Book, List, X, Search, BarChart } from "react-bootstrap-icons";
import SearchWidget from "../../../components/SearchWidget/SearchWidget";
import AnalyticsWidget from "../../../components/AnalyticsWidget/AnalyticsWidget";

const ChatScreen = () => {
  const dispatch = useDispatch();
  const { chatHistory, isGenerating, isLearningPathQuery, isQuizQuery } = useSelector(
    (state) => state.global
  );
  const hasFetched = useRef(false);
  const messagesEndRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSearchWidget, setShowSearchWidget] = useState(false);
  const [showAnalyticsWidget, setShowAnalyticsWidget] = useState(false);

  const handleStudyPlan = () => {
    dispatch(setIsLearningPathQuery(!isLearningPathQuery));
  };

  const handleSelfyQuiz = () => {
    dispatch(setIsQuizQuery(!isQuizQuery));
  };

  const handleExplainConcept = () => {
    const conceptPrompt = "I need help understanding a concept. Please explain it in simple terms with examples.";
    handleQuickAction(conceptPrompt);
  };

  const handleHomeworkHelp = () => {
    const homeworkPrompt = "I need help with my homework. Can you guide me through the problem step by step?";
    handleQuickAction(homeworkPrompt);
  };

  const handleQuickAction = async (prompt) => {
    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: prompt, type: "content" },
      { role: "assistant", content: "", type: "streaming" }
    ];
    
    dispatch(setChatHistory(updatedHistory));
    dispatch(setIsGenerating(true));
    
    try {
      const { askQuestion } = await import("../../../api");
      await askQuestion(
        prompt,
        (partialResponse) => {
          dispatch(setStreamChat(partialResponse));
        },
        () => {
          refreshChat(); 
          dispatch(setIsGenerating(false));
        },
        false, 
        false
      );
    } catch (error) {
      console.error("Error sending quick action:", error);
      dispatch(setIsGenerating(false));
    }
  };

  const handleClearChat = () => {
    setShowConfirmModal(true);
  };

  const confirmClearChat = async () => {
    try {
      await clearChat();
      dispatch(setChatHistory([]));
    } catch (error) {
      console.error("Error clearing chat history:", error.message);
    }
    setShowConfirmModal(false);
  };

  const handleToggleSearch = () => {
    setShowSearchWidget(!showSearchWidget);
  };

  const handleToggleAnalytics = () => {
    setShowAnalyticsWidget(!showAnalyticsWidget);
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await fetchChatHistory();
      dispatch(setChatHistory(history));
    } catch (error) {
      console.error("Error fetching chat history:", error.message);
    }
  };

  const refreshChat = (message) => {
    if (message) {
      dispatch(addTemporaryMessage(message));
    } else {
      loadChatHistory();
    }
    dispatch(setIsGenerating(false));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div className="chatgpt-chat-screen">
      <Container fluid className="chat-container">
        {/* Chat Messages */}
        <div className="chat-messages">
          {chatHistory.length > 0 ? (
            chatHistory.map((message, index) => (
              <div
                key={index}
                className={`message-row ${
                  message.role === "user" ? "user-message" : "ai-message"
                }`}
              >
                {message.role === "user" ? (
                  <div className="user-message-bubble">
                    <div className="message-content">{message.content}</div>
                    {message.timestamp && (
                      <div className="message-time">
                        {formatDistanceToNow(new Date(message.timestamp), {
                          addSuffix: true,
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <AIMessage
                    content={message.content}
                    type={message.type}
                    timestamp={message.timestamp}
                    refreshChat={refreshChat}
                  />
                )}
              </div>
            ))
          ) : (
            <div className="welcome-message">
              <div className="welcome-content">
                <img 
                  src="/icons/aitutor-short-no-bg.png" 
                  alt="AI Tutor" 
                  className="welcome-logo"
                />
                <h2 className="welcome-title">How can I help you today?</h2>
                
                {/* Optimized Action Options - Single Horizontal Row */}
                <div className="action-options">
                  <button 
                    className="action-option"
                    onClick={handleStudyPlan}
                  >
                    Create a study plan
                  </button>
                  <span className="separator">|</span>
                  <button 
                    className="action-option"
                    onClick={handleSelfyQuiz}
                  >
                    Generate a quiz
                  </button>
                  <span className="separator">|</span>
                  <button 
                    className="action-option"
                    onClick={handleExplainConcept}
                  >
                    📚 Explain a concept
                  </button>
                  <span className="separator">|</span>
                  <button 
                    className="action-option"
                    onClick={handleHomeworkHelp}
                  >
                    💡 Get homework help
                  </button>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        {isGenerating && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
            <span>AI Tutor is thinking...</span>
          </div>
        )}

        {/* Action Buttons - Only show when there's chat history */}
        {chatHistory.length > 0 && (
          <div className="chat-actions-section">
            <div className="action-buttons-group">
              <Button
                variant={isLearningPathQuery ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={handleStudyPlan}
                className="action-btn"
              >
                <Book size={16} className="me-2" />
                Study Plan
              </Button>
              <Button
                variant={isQuizQuery ? "primary" : "outline-primary"}
                size="sm"
                onClick={handleSelfyQuiz}
                className="action-btn"
              >
                <List size={16} className="me-2" />
                Quiz
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleToggleSearch}
                className="action-btn"
              >
                <Search size={16} className="me-2" />
                Search
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleToggleAnalytics}
                className="action-btn"
              >
                <BarChart size={16} className="me-2" />
                Analytics
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleClearChat}
                className="action-btn"
              >
                <X size={16} className="me-2" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Chat Input */}
        <div className="chat-input-section">
          <ChatInput refreshChat={refreshChat} />
        </div>
      </Container>

      {/* Clear Chat Confirmation Modal */}
      <Modal show={showConfirmModal} centered onHide={() => setShowConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Clear Chat History</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to clear the chat history? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmClearChat}>
            Clear Chat
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Search Widget */}
      {showSearchWidget && (
        <SearchWidget onClose={() => setShowSearchWidget(false)} />
      )}

      {/* Analytics Widget */}
      {showAnalyticsWidget && (
        <div className="analytics-overlay" onClick={() => setShowAnalyticsWidget(false)}>
          <div className="analytics-container" onClick={e => e.stopPropagation()}>
            <AnalyticsWidget />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatScreen;