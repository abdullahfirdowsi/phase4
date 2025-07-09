import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Modal, Badge, Alert, Spinner } from 'react-bootstrap';
import { FaPaperPlane, FaStop, FaBook, FaQuestionCircle, FaSearch, FaChartBar, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// Import API functions
import { 
  fetchChatHistory, 
  askQuestion, 
  clearChat,
  generateQuiz,
  storeQuizMessage
} from '../../api';

// Import components
import AIMessage from './AIMessage';
import UserMessage from './UserMessage';
import QuizMessage from './QuizMessage';
import LearningPathDisplay from './LearningPathDisplay';
import SearchModal from './SearchModal';
import AnalyticsModal from './AnalyticsModal';
import ConfirmModal from './ConfirmModal';

// Import styles
import './AIChat.scss';

const AIChat = () => {
  const navigate = useNavigate();
  
  // Core state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Mode state
  const [activeMode, setActiveMode] = useState('none'); // 'none', 'quiz', 'learning_path'
  
  // UI state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Initialize persistent session ID for conversation continuity
  useEffect(() => {
    if (!sessionIdRef.current) {
      const username = localStorage.getItem('username');
      
      // Try to get existing session ID from localStorage
      const existingSessionId = localStorage.getItem(`chat_session_${username}`);
      
      if (existingSessionId) {
        // Use existing session ID for conversation continuity
        sessionIdRef.current = existingSessionId;
        console.log('🔄 Restored existing session ID:', sessionIdRef.current);
      } else {
        // Create new session ID only if none exists
        sessionIdRef.current = `chat_session_${username}_${Date.now()}`;
        localStorage.setItem(`chat_session_${username}`, sessionIdRef.current);
        console.log('🆔 Created new session ID:', sessionIdRef.current);
      }
    }
  }, []);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Handle initial question and mode from sessionStorage (from Home page navigation)
  useEffect(() => {
    const handleInitialData = () => {
      const initialQuestion = sessionStorage.getItem("initialQuestion");
      const initialMode = sessionStorage.getItem("initialMode");
      
      console.log('🏠 Checking for initial data from Home page:', { initialQuestion, initialMode });
      
      if (initialQuestion) {
        console.log('📝 Setting initial question:', initialQuestion);
        setInputMessage(initialQuestion);
        
        // Clear from sessionStorage to prevent re-processing
        sessionStorage.removeItem("initialQuestion");
        
        // Set mode if provided
        if (initialMode) {
          console.log('🎯 Setting initial mode:', initialMode);
          setActiveMode(initialMode);
          sessionStorage.removeItem("initialMode");
        }
        
        // Auto-send the message after a short delay to ensure all state is set
        setTimeout(() => {
          console.log('🚀 Auto-sending initial message from Home page');
          handleSendMessage();
        }, 500);
      }
    };
    
    // Only run this once when component mounts
    handleInitialData();
  }, []); // Empty dependency array to run only once

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll when new messages are being generated
  useEffect(() => {
    if (isGenerating) {
      scrollToBottom();
    }
  }, [isGenerating]);

  // Load chat history from backend
  const loadChatHistory = async () => {
    try {
      setError(null);
      console.log('📚 Loading chat history from MongoDB...');
      
      // Check authentication first
      const username = localStorage.getItem('username');
      const token = localStorage.getItem('token');
      
      if (!username || !token) {
        console.warn('⚠️ User not authenticated, skipping chat history load');
        return;
      }
      
      const history = await fetchChatHistory();
      
      if (Array.isArray(history)) {
        // Process and filter messages
        const processedHistory = history
          .filter(msg => msg && msg.role && msg.content)
          .map(msg => ({
            id: msg.id || `msg_${Date.now()}_${Math.random()}`,
            role: msg.role,
            content: msg.content,
            // Fix: Map message_type to type for proper rendering
            type: msg.type || msg.message_type || (msg.role === 'user' ? 'content' : 'content'),
            timestamp: msg.timestamp || new Date().toISOString()
          }))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        setMessages(processedHistory);
        console.log('✅ Chat history loaded:', processedHistory.length, 'messages');
        
        // Ensure scroll to bottom after loading history
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error loading chat history:', error);
      
      // Handle specific authentication errors
      if (error.message.includes('authenticated') || error.message.includes('401')) {
        setError('Please log in to view your chat history.');
      } else {
        setError('Failed to load chat history. Please try again.');
      }
    }
  };

  // Enhanced scroll to bottom function with multiple fallback methods
  const scrollToBottom = useCallback(() => {
    // Method 1: Use the ref to scroll into view
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      } catch (error) {
        console.warn('ScrollIntoView failed, trying alternative method:', error);
        
        // Method 2: Direct scroll on the messages container
        const messagesContainer = messagesEndRef.current.closest('.chat-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
    }
    
    // Method 3: Fallback - find and scroll the messages container directly
    const messagesContainer = document.querySelector('.chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Smart mode detection
  const detectMode = (message) => {
    const msgLower = message.toLowerCase();
    
    // Detect quiz requests
    if (msgLower.includes('quiz') || msgLower.includes('test') || 
        msgLower.includes('mcq') || msgLower.includes('questions') || 
        msgLower.includes('exam')) {
      return 'quiz';
    }
    
    // Detect learning path requests
    if (msgLower.includes('learning path') || msgLower.includes('roadmap') || 
        msgLower.includes('curriculum') || msgLower.includes('course structure')) {
      return 'learning_path';
    }
    
    return 'content';
  };

  // Main message sending function
  const handleSendMessage = async () => {
    const messageToSend = inputMessage.trim();
    if (!messageToSend || isGenerating) return;

    // Detect mode if not explicitly set
    const detectedMode = activeMode !== 'none' ? activeMode : detectMode(messageToSend);
    
    console.log('🚀 Sending message:', {
      message: messageToSend,
      activeMode,
      detectedMode,
      sessionId: sessionIdRef.current
    });

    // Clear input and reset textarea
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Create user message
    const userMessage = {
      id: `user_${Date.now()}_${Math.random()}`,
      role: 'user',
      content: messageToSend,
      type: 'content',
      timestamp: new Date().toISOString()
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);
    setError(null);
    
    // Scroll to bottom after adding user message
    setTimeout(() => {
      scrollToBottom();
    }, 10);

    try {
      if (detectedMode === 'quiz') {
        await handleQuizGeneration(messageToSend, userMessage);
      } else if (detectedMode === 'learning_path') {
        await handleLearningPathGeneration(messageToSend, userMessage);
      } else {
        await handleNormalChat(messageToSend, userMessage);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setError('Failed to send message. Please try again.');
      
      // Remove user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsGenerating(false);
      
      // Reset mode if it was auto-detected
      if (activeMode !== detectedMode) {
        setActiveMode('none');
      }
    }
  };

  // Handle quiz generation
  const handleQuizGeneration = async (message, userMessage) => {
    console.log('🎯 Generating quiz for:', message);
    
    // Extract quiz parameters
    const topic = extractTopic(message);
    const difficulty = extractDifficulty(message);
    const questionCount = extractQuestionCount(message);

    console.log('📊 Quiz parameters:', { topic, difficulty, questionCount });

    // Generate quiz using API
    const result = await generateQuiz(topic, difficulty, questionCount);
    
    if (result && result.quiz_data) {
      // Create AI message with quiz content
      const aiMessage = {
        id: `ai_${Date.now()}_${Math.random()}`,
        role: 'assistant',
        content: result,
        type: 'quiz',
        timestamp: new Date().toISOString()
      };

      // Add AI message to UI
      setMessages(prev => [...prev, aiMessage]);
      
      // Scroll to bottom after adding AI message
      setTimeout(() => {
        scrollToBottom();
      }, 10);

      // Store quiz messages to backend (single API call)
      try {
        await storeQuizMessage(userMessage, aiMessage, sessionIdRef.current);
        console.log('✅ Quiz messages stored to backend');
      } catch (storeError) {
        console.warn('⚠️ Failed to store quiz messages:', storeError);
      }
    } else {
      throw new Error('Failed to generate quiz');
    }
  };

  // Handle learning path generation
  const handleLearningPathGeneration = async (message, userMessage) => {
    console.log('📚 Generating learning path for:', message);
    
    // Create temporary AI message
    const tempAiMessage = {
      id: `ai_${Date.now()}_${Math.random()}`,
      role: 'assistant',
      content: '',
      type: 'learning_path',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempAiMessage]);
    
    // Scroll to bottom after adding temporary AI message
    setTimeout(() => {
      scrollToBottom();
    }, 10);

    let accumulatedResponse = '';

    await askQuestion(
      message,
      (partialResponse) => {
        // Handle learning path response
        if (typeof partialResponse === 'object' && partialResponse.content) {
          accumulatedResponse = partialResponse.content;
        } else {
          accumulatedResponse = partialResponse;
        }

      // Update the temporary message
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: accumulatedResponse
        };
        return updated;
      });
      
      // Scroll to bottom after updating message content
      setTimeout(() => {
        scrollToBottom();
      }, 10);
      },
      () => {
        console.log('✅ Learning path generation completed');
      },
      false,
      true // isLearningPath
    );
  };

  // Handle normal chat
  const handleNormalChat = async (message, userMessage) => {
    console.log('💬 Normal chat message:', message);
    
    // Create temporary AI message
    const tempAiMessage = {
      id: `ai_${Date.now()}_${Math.random()}`,
      role: 'assistant',
      content: '',
      type: 'content',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempAiMessage]);
    
    // Scroll to bottom after adding temporary AI message
    setTimeout(() => {
      scrollToBottom();
    }, 10);

    let accumulatedResponse = '';

    await askQuestion(
      message,
      (partialResponse) => {
        accumulatedResponse = partialResponse;

      // Update the temporary message
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: accumulatedResponse
        };
        return updated;
      });
      
      // Scroll to bottom after updating message content
      setTimeout(() => {
        scrollToBottom();
      }, 10);
      },
      () => {
        console.log('✅ Normal chat completed');
      },
      false,
      false
    );
  };

  // Helper functions for quiz parameter extraction
  const extractTopic = (message) => {
    let topic = message.trim();
    
    // Remove common quiz-related phrases
    topic = topic.replace(/(?:create|generate|make|build)\s+(?:a\s+|an\s+)?(?:quiz|test)\s+(?:about|on|for)?\s*/gi, '');
    topic = topic.replace(/(?:quiz|test)\s+(?:about|on|for)\s*/gi, '');
    topic = topic.replace(/\b\d+\s+(?:questions?|quiz|mcq|q)\b/gi, '');
    topic = topic.replace(/\b(?:easy|medium|hard|difficult|advanced|beginner|basic|simple|expert|challenging)\b/gi, '');
    topic = topic.replace(/\b(?:with|for|about)\s+/gi, '');
    topic = topic.trim();
    
    return topic || 'General Knowledge';
  };

  const extractDifficulty = (message) => {
    const msgLower = message.toLowerCase();
    
    if (msgLower.includes('easy') || msgLower.includes('beginner') || msgLower.includes('basic') || msgLower.includes('simple')) {
      return 'easy';
    } else if (msgLower.includes('hard') || msgLower.includes('difficult') || msgLower.includes('advanced') || msgLower.includes('expert')) {
      return 'hard';
    }
    return 'medium';
  };

  const extractQuestionCount = (message) => {
    const patterns = [
      /(\d+)\s+(?:questions?|quiz|mcq|q)/i,
      /(?:with|for|about)\s+(\d+)\s+(?:questions?|quiz|mcq|q)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const count = parseInt(match[1]);
        if (count >= 1 && count <= 50) {
          return count;
        }
      }
    }
    return 10; // Default
  };

  // Clear chat
  const handleClearChat = async () => {
    setShowConfirmModal(false);
    
    try {
      console.log('🗑️ Starting chat clear process...');
      
      // Step 1: Clear chat from database
      const clearResult = await clearChat();
      console.log('✅ Clear API result:', clearResult);
      
      // Step 2: Clear local UI immediately
      setMessages([]);
      setError(null);
      
      // Step 3: Reset session ID for fresh conversation
      const username = localStorage.getItem('username');
      sessionIdRef.current = `chat_session_${username}_${Date.now()}`;
      localStorage.setItem(`chat_session_${username}`, sessionIdRef.current);
      console.log('🔄 Created new session ID for fresh conversation:', sessionIdRef.current);
      
      // Step 3: Verify clear by fetching fresh data from the new API
      console.log('🔍 Verifying clear by fetching fresh chat history...');
      setTimeout(async () => {
        try {
          // Use the new chat history endpoint that works with the current database structure
          const username = localStorage.getItem('username');
          const token = localStorage.getItem('token');
          
          const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
          };
          
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
          
          const response = await fetch(
            `http://localhost:8000/chat/history?username=${encodeURIComponent(username)}`,
            { 
              method: "GET",
              headers: headers
            }
          );
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          const freshHistory = data.history || [];
          
          if (Array.isArray(freshHistory) && freshHistory.length > 0) {
            console.warn('⚠️ Warning: Fresh history still contains messages after clear:', freshHistory.length);
            console.warn('📋 Remaining messages:', freshHistory);
            
            // Show warning to user
            setError(`Warning: Chat may not have been completely cleared. Found ${freshHistory.length} remaining messages.`);
            
            // Still set the fresh messages to show what's actually in DB
            setMessages(freshHistory.map(msg => ({
              id: msg.id || `msg_${Date.now()}_${Math.random()}`,
              role: msg.role,
              content: msg.content,
              // Fix: Map message_type to type for proper rendering
              type: msg.type || msg.message_type || (msg.role === 'user' ? 'content' : 'content'),
              timestamp: msg.timestamp || new Date().toISOString()
            })));
          } else {
            console.log('✅ Verification successful: No messages found in database after clear');
            setMessages([]);
          }
        } catch (verifyError) {
          console.error('❌ Error during verification:', verifyError);
          setError('Chat cleared, but verification failed. Please refresh to confirm.');
        }
      }, 1000); // Wait 1 second for backend to process
      
    } catch (error) {
      console.error('❌ Error clearing chat:', error);
      setError(`Failed to clear chat: ${error.message}. Please check console for details.`);
    }
  };

  // Toggle modes
  const handleToggleQuiz = () => {
    setActiveMode(prev => prev === 'quiz' ? 'none' : 'quiz');
  };

  const handleToggleLearningPath = () => {
    setActiveMode(prev => prev === 'learning_path' ? 'none' : 'learning_path');
  };

  // Quick actions
  const handleQuickAction = async (prompt) => {
    if (isGenerating) return;
    
    setInputMessage(prompt);
    // Use a timeout to ensure the input is set before sending
    setTimeout(() => handleSendMessage(), 100);
  };

  // Render message based on type
  const renderMessage = (msg, index) => {
    const key = msg.id || `msg_${index}_${msg.timestamp}`;
    
    if (msg.role === 'user') {
      return (
        <UserMessage 
          key={key} 
          message={msg} 
          username={localStorage.getItem('username')} 
        />
      );
    } else if (msg.type === 'quiz') {
      return (
        <QuizMessage 
          key={key} 
          message={msg} 
          username={localStorage.getItem('username')}
        />
      );
    } else if (msg.type === 'learning_path') {
      return (
        <LearningPathDisplay 
          key={key} 
          message={msg} 
        />
      );
    } else {
      return (
        <AIMessage 
          key={key} 
          message={msg} 
        />
      );
    }
  };

  return (
    <div className="ai-chat">
      <Container fluid className="chat-container">
        {/* Chat Messages */}
        <div className="chat-messages">
          {messages.length > 0 ? (
            messages.map((message, index) => {
              // Create a stable unique key for each message
              const messageKey = message.id || `${message.role}-${message.timestamp || index}-${typeof message.content === 'string' ? message.content.substring(0, 50).replace(/\s/g, '') : String(message.content || '').substring(0, 50).replace(/\s/g, '')}`; 
              
              return (
                <div key={messageKey} className="message-wrapper">
                  {renderMessage(message, index)}
                </div>
              );
            })
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
                      setActiveMode('learning_path');
                      setInputMessage("Create a learning path for Python programming");
                    }}
                  >
                    <span className="icon">🛣️</span>
                    <span className="text">Create study plan</span>
                  </button>
                  
                  <button 
                    className="quick-action-btn"
                    onClick={() => {
                      setActiveMode('quiz');
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
              <span>AI is thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Action Buttons */}
        {messages.length > 0 && (
          <div className="chat-actions">
            <Button
              variant={activeMode === 'learning_path' ? 'primary' : 'outline-primary'}
              className="action-btn"
              onClick={handleToggleLearningPath}
              disabled={isGenerating}
            >
              <FaBook className="icon" />
              <span className="text">Study Plan</span>
            </Button>
            
            <Button
              variant={activeMode === 'quiz' ? 'primary' : 'outline-primary'}
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
                activeMode === 'learning_path'
                  ? "Tell me what you want to learn..." 
                  : activeMode === 'quiz'
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
                  onClick={() => setIsGenerating(false)}
                >
                  <FaStop />
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  className={`send-btn ${!inputMessage.trim() ? 'disabled' : ''}`}
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                >
                  <FaPaperPlane />
                </Button>
              )}
            </div>
          </div>
          
          {activeMode === 'learning_path' && (
            <div className="mode-indicator learning-path">
              📚 Learning Path Mode - I'll create a personalized study plan for you
            </div>
          )}
          
          {activeMode === 'quiz' && (
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
        message="Are you sure you want to clear ALL chat messages? This will remove everything including learning paths and quizzes from your chat history. This action cannot be undone."
        confirmText="Clear All Messages"
      />
    </div>
  );
};

export default AIChat;
