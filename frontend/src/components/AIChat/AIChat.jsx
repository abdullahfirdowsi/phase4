import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import { FaPaperPlane, FaStop, FaBook, FaQuestionCircle, FaSearch, FaChartBar, FaTrash } from 'react-icons/fa';
import { fetchChatHistory, askQuestion, clearChat } from '../../api';
import './AIChat.scss';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import SearchModal from './SearchModal';
import AnalyticsModal from './AnalyticsModal';
import ConfirmModal from './ConfirmModal';
import UserMessage from './UserMessage';
import AIMessage from './AIMessage';
import LearningPathDisplayComponent from './LearningPathDisplay';

const AIChat = () => {
  console.log('🚀 AIChat component is rendering...');
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLearningPath, setIsLearningPath] = useState(false);
  const [isQuiz, setIsQuiz] = useState(false);
  const [error, setError] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const hasFetched = useRef(false);
  
  // Helper function to detect if content is a learning path
  const isLearningPathContent = (content) => {
    if (!content) return false;
    
    // If content is a string, try to parse it
    let parsedContent = content;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        return false;
      }
    }
    
    // Check if it has learning path structure
    if (typeof parsedContent === 'object' && parsedContent !== null) {
      // Check for common learning path properties
      return (
        parsedContent.hasOwnProperty('topics') &&
        Array.isArray(parsedContent.topics) &&
        (
          parsedContent.hasOwnProperty('name') ||
          parsedContent.hasOwnProperty('course_duration') ||
          parsedContent.hasOwnProperty('description')
        )
      );
    }
    
    return false;
  };
  
  console.log('💬 AIChat current state:', {
    messagesCount: messages.length,
    isGenerating,
    isLearningPath,
    isQuiz,
    error
  });

  // Fetch chat history on component mount
  useEffect(() => {
    if (!hasFetched.current) {
      loadChatHistory();
      hasFetched.current = true;
    }
  }, []);

  // Check for initial question from home page
  useEffect(() => {
    const initialQuestion = sessionStorage.getItem("initialQuestion");
    if (initialQuestion) {
      console.log("Found initial question:", initialQuestion);
      // Clear it from session storage to prevent reuse
      sessionStorage.removeItem("initialQuestion");
      // Submit the question automatically after a short delay
      setTimeout(() => {
        handleSendMessage(initialQuestion);
      }, 300);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      setError(null);
      const history = await fetchChatHistory();
      setMessages(history || []);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history. Please try again.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async (overrideMessage = null) => {
    const messageToSend = overrideMessage || inputMessage;
    
    if (!messageToSend.trim() || isGenerating) return;

    setInputMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: messageToSend.trim(),
      type: 'content',
      timestamp: new Date().toISOString()
    };
    
    // For learning paths, don't create temporary AI message as backend handles it
    // For regular messages, add temporary placeholder for AI response
    if (!isLearningPath) {
      const tempAIMessage = {
        role: 'assistant',
        content: '',
        type: 'content',
        timestamp: new Date().toISOString()
      };
      
      // Update messages with both user message and empty AI message
      setMessages(prevMessages => [...prevMessages, newUserMessage, tempAIMessage]);
    } else {
      // For learning paths, only add user message
      setMessages(prevMessages => [...prevMessages, newUserMessage]);
    }
    setIsGenerating(true);
    
    try {
      let accumulatedResponse = '';
      
        await askQuestion(
          messageToSend.trim(),
          (partialResponse) => {
            // Update the AI message with the accumulated response
            // For learning paths, the partialResponse will be the full API response object
            if (isLearningPath && typeof partialResponse === 'object' && partialResponse.content) {
              // Extract the content from the API response for learning paths
              accumulatedResponse = partialResponse.content;
              console.log('📚 Learning Path Content:', accumulatedResponse);
            } else {
              // For regular messages, it's the accumulated text
              accumulatedResponse = partialResponse;
            }
            
            setMessages(prevMessages => {
              if (isLearningPath) {
                // For learning paths, don't add message locally since backend stores it
                // We'll reload chat history after completion to get the stored message
                return prevMessages;
              } else {
                // For regular messages, update the last (temp) AI message
                const updatedMessages = [...prevMessages];
                const lastMessageIndex = updatedMessages.length - 1;
                
                // Create a new message object instead of modifying the existing one
                updatedMessages[lastMessageIndex] = {
                  ...updatedMessages[lastMessageIndex],
                  content: accumulatedResponse,
                  type: 'content'
                };
                
                return updatedMessages;
              }
            });
          },
          () => {
            // On complete
            setIsGenerating(false);
            // For learning paths, reload chat history to get the message stored by backend
            if (isLearningPath) {
              loadChatHistory();
            }
          },
          isQuiz,
          isLearningPath
        );
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setIsGenerating(false);
      
      // Remove the temporary AI message
      setMessages(prevMessages => prevMessages.slice(0, -1));
    }
  };

  const handleStopGeneration = () => {
    setIsGenerating(false);
  };

  const handleClearChat = async () => {
    setShowConfirmModal(false);
    
    try {
      await clearChat();
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('Error clearing chat:', err);
      setError('Failed to clear chat history. Please try again.');
    }
  };

  const handleToggleLearningPath = () => {
    setIsLearningPath(prev => !prev);
    setIsQuiz(false);
  };

  const handleToggleQuiz = () => {
    setIsQuiz(prev => !prev);
    setIsLearningPath(false);
  };

  const handleQuickAction = async (prompt) => {
    if (isGenerating) return;
    
    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: prompt,
      type: 'content',
      timestamp: new Date().toISOString()
    };
    
    // Add temporary placeholder for AI response
    const tempAIMessage = {
      role: 'assistant',
      content: '',
      type: 'content',
      timestamp: new Date().toISOString()
    };
    
    // Update messages with both user message and empty AI message
    setMessages(prevMessages => [...prevMessages, newUserMessage, tempAIMessage]);
    setIsGenerating(true);
    
    try {
      let accumulatedResponse = '';
      
      await askQuestion(
        prompt,
        (partialResponse) => {
          // Update the AI message with the accumulated response
          // For quick actions, they are typically not learning paths
          accumulatedResponse = partialResponse;
          
          setMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const lastMessageIndex = updatedMessages.length - 1;
            
            // Create a new message object instead of modifying the existing one
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              content: accumulatedResponse,
              type: 'content' // Quick actions are always content type
            };
            
            return updatedMessages;
          });
        },
        () => {
          // On complete - Don't refresh chat history to preserve timestamps
          setIsGenerating(false);
          // Note: Removed loadChatHistory() to prevent timestamp inconsistency
        },
        false,
        false
      );
    } catch (err) {
      console.error('Error sending quick action:', err);
      setError('Failed to send message. Please try again.');
      setIsGenerating(false);
      
      // Remove the temporary AI message
      setMessages(prevMessages => prevMessages.slice(0, -1));
    }
  };

  // Memoize the learning path content check
  const memoizedIsLearningPathContent = useCallback((content) => {
    if (!content) return false;
    
    // If content is a string, try to parse it
    let parsedContent = content;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        return false;
      }
    }
    
    // Check if it has learning path structure
    if (typeof parsedContent === 'object' && parsedContent !== null) {
      // Check for common learning path properties
      return (
        parsedContent.hasOwnProperty('topics') &&
        Array.isArray(parsedContent.topics) &&
        (
          parsedContent.hasOwnProperty('name') ||
          parsedContent.hasOwnProperty('course_duration') ||
          parsedContent.hasOwnProperty('description')
        )
      );
    }
    
    return false;
  }, []);

  // Memoize the messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);


  return (
    <div className="ai-chat">
      <Container fluid className="chat-container">
        {/* Chat Messages */}
        <div className="chat-messages">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <div key={index} className="message-wrapper">
                {message.role === 'user' ? (
                  <UserMessage message={message} />
                ) : (
                  // Check if it's a learning path by type or by content structure
                  (message.type === 'learning_path' || isLearningPathContent(message.content)) ? (
                    <LearningPathDisplayComponent 
                      message={message.content} 
                    />
                  ) : (
                    <AIMessage message={message} />
                  )
                )}
              </div>
            ))
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <img 
                  src="/icons/aitutor-short-no-bg.png" 
                  alt="AI Tutor" 
                  className="welcome-logo"
                />
                <h2 className="welcome-title">How can I help you today?</h2>
                
                <div className="quick-actions">
                  <button 
                    className="quick-action-btn"
                    onClick={() => {
                      setIsLearningPath(true);
                      setInputMessage("Create a learning path for Python programming");
                    }}
                  >
                    <span className="icon">🛣️</span>
                    <span className="text">Create study plan</span>
                  </button>
                  
                  <button 
                    className="quick-action-btn"
                    onClick={() => {
                      setIsQuiz(true);
                      setInputMessage("Generate a quiz about world history");
                    }}
                  >
                    <span className="icon">📝</span>
                    <span className="text">Generate a quiz</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Alert */}
          {error && (
            <div className="error-alert">
              <Alert 
                variant="danger" 
                dismissible 
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            </div>
          )}
          
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
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Action Buttons */}
        {messages.length > 0 && (
          <div className="chat-actions">
            <Button
              variant={isLearningPath ? 'primary' : 'outline-primary'}
              className="action-btn"
              onClick={handleToggleLearningPath}
              disabled={isGenerating}
            >
              <FaBook className="icon" />
              <span className="text">Study Plan</span>
            </Button>
            
            <Button
              variant={isQuiz ? 'primary' : 'outline-primary'}
              className="action-btn"
              onClick={handleToggleQuiz}
              disabled={isGenerating}
            >
              <FaQuestionCircle className="icon" />
              <span className="text">Quiz</span>
            </Button>
            
            <Button
              variant="outline-secondary"
              className="action-btn"
              onClick={() => setShowSearchModal(true)}
              disabled={isGenerating}
            >
              <FaSearch className="icon" />
              <span className="text">Search</span>
            </Button>
            
            <Button
              variant="outline-secondary"
              className="action-btn"
              onClick={() => setShowAnalyticsModal(true)}
              disabled={isGenerating}
            >
              <FaChartBar className="icon" />
              <span className="text">Analytics</span>
            </Button>
            
            <Button
              variant="outline-danger"
              className="action-btn"
              onClick={() => setShowConfirmModal(true)}
              disabled={isGenerating}
            >
              <FaTrash className="icon" />
              <span className="text">Clear</span>
            </Button>
          </div>
        )}
        
        {/* Chat Input */}
        <div className="chat-input-container">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              placeholder={
                isLearningPath 
                  ? "Tell me what you want to learn..." 
                  : isQuiz
                  ? "Ask me to create a quiz..."
                  : "Message AI Tutor..."
              }
              className="chat-textarea"
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              disabled={isGenerating}
              rows={1}
            />
            
            <div className="input-actions">
              {isGenerating ? (
                <Button 
                  variant="outline-danger" 
                  className="stop-btn"
                  onClick={handleStopGeneration}
                >
                  <FaStop />
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  className={`send-btn ${!inputMessage.trim() ? 'disabled' : ''}`}
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim()}
                >
                  <FaPaperPlane />
                </Button>
              )}
            </div>
          </div>
          
          {isLearningPath && (
            <div className="mode-indicator learning-path">
              📚 Learning Path Mode - I'll create a personalized study plan for you
            </div>
          )}
          
          {isQuiz && (
            <div className="mode-indicator quiz">
              📝 Quiz Mode - I'll create interactive quizzes to test your knowledge
            </div>
          )}
        </div>
      </Container>
      
      {/* Modals */}
      <SearchModal 
        show={showSearchModal} 
        onHide={() => setShowSearchModal(false)} 
      />
      
      <AnalyticsModal 
        show={showAnalyticsModal} 
        onHide={() => setShowAnalyticsModal(false)} 
      />
      
      <ConfirmModal 
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        onConfirm={handleClearChat}
        title="Clear Chat History"
        message="Are you sure you want to clear the chat history? This action cannot be undone."
        confirmText="Clear Chat"
      />
    </div>
  );
};

export default AIChat;