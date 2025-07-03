import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Modal, Badge, Alert, Spinner } from 'react-bootstrap';
import { 
  Send, 
  Trash, 
  Search, 
  BarChart,
  PlayCircleFill,
  StopCircleFill,
  Book,
  QuestionCircle,
  ChatDots,
  Lightbulb,
  Code,
  Calculator
} from 'react-bootstrap-icons';
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

  // Initialize session ID once
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
      console.log('🆔 Initialized session ID:', sessionIdRef.current);
    }
  }, []);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history from backend
  const loadChatHistory = async () => {
    try {
      setError(null);
      console.log('📚 Loading chat history from MongoDB...');
      
      const history = await fetchChatHistory();
      
      if (Array.isArray(history)) {
        // Process and filter messages
        const processedHistory = history
          .filter(msg => msg && msg.role && msg.content)
          .map(msg => ({
            id: msg.id || `msg_${Date.now()}_${Math.random()}`,
            role: msg.role,
            content: msg.content,
            type: msg.type || (msg.role === 'user' ? 'content' : 'content'),
            timestamp: msg.timestamp || new Date().toISOString()
          }))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        setMessages(processedHistory);
        console.log('✅ Chat history loaded:', processedHistory.length, 'messages');
      }
    } catch (error) {
      console.error('❌ Error loading chat history:', error);
      setError('Failed to load chat history. Please try again.');
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

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

      // Store quiz messages to backend (single API call)
      try {
        await storeQuizMessage(userMessage, aiMessage);
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
      await clearChat();
      setMessages([]);
      setError(null);
      console.log('✅ Chat cleared from database');
    } catch (error) {
      console.error('❌ Error clearing chat:', error);
      setError('Failed to clear chat. Please try again.');
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
    <Container fluid className="ai-chat-container h-100">
      <Row className="h-100">
        <Col className="d-flex flex-column h-100">
          <Card className="flex-grow-1 d-flex flex-column">
            {/* Header */}
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <ChatDots className="me-2" size={20} />
                <h5 className="mb-0">AI Tutor Chat</h5>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant={activeMode === 'quiz' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={handleToggleQuiz}
                  className="d-flex align-items-center"
                >
                  <QuestionCircle className="me-1" size={16} />
                  Quiz Mode
                </Button>
                <Button
                  variant={activeMode === 'learning_path' ? 'success' : 'outline-success'}
                  size="sm"
                  onClick={handleToggleLearningPath}
                  className="d-flex align-items-center"
                >
                  <Book className="me-1" size={16} />
                  Learning Path
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setShowSearchModal(true)}
                >
                  <Search size={16} />
                </Button>
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={() => setShowAnalyticsModal(true)}
                >
                  <BarChart size={16} />
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => setShowConfirmModal(true)}
                >
                  <Trash size={16} />
                </Button>
              </div>
            </Card.Header>

            {/* Messages Area */}
            <Card.Body className="flex-grow-1 p-0 d-flex flex-column">
              <div className="chat-messages flex-grow-1 p-3 overflow-auto">
                {error && (
                  <Alert variant="danger" className="mb-3">
                    {error}
                  </Alert>
                )}

                {messages.length === 0 && !isGenerating && (
                  <div className="text-center text-muted my-5">
                    <ChatDots size={48} className="mb-3 opacity-50" />
                    <h6>Welcome to AI Tutor!</h6>
                    <p>Start a conversation, ask for a quiz, or request a learning path.</p>
                    
                    {/* Quick Actions */}
                    <div className="mt-4">
                      <h6 className="text-muted mb-3">Quick Actions:</h6>
                      <div className="d-flex flex-wrap gap-2 justify-content-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleQuickAction('Explain machine learning basics')}
                          className="d-flex align-items-center"
                        >
                          <Lightbulb className="me-1" size={14} />
                          Learn ML Basics
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleQuickAction('Create a Python quiz with 10 questions')}
                          className="d-flex align-items-center"
                        >
                          <Code className="me-1" size={14} />
                          Python Quiz
                        </Button>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => handleQuickAction('Generate a learning path for web development')}
                          className="d-flex align-items-center"
                        >
                          <Book className="me-1" size={14} />
                          Web Dev Path
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((msg, index) => renderMessage(msg, index))}

                {isGenerating && (
                  <div className="d-flex justify-content-center my-3">
                    <div className="d-flex align-items-center text-muted">
                      <Spinner animation="border" size="sm" className="me-2" />
                      AI is thinking...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-top p-3">
                {activeMode !== 'none' && (
                  <div className="mb-2">
                    <Badge 
                      bg={activeMode === 'quiz' ? 'primary' : 'success'}
                      className="me-2"
                    >
                      {activeMode === 'quiz' ? '🎯 Quiz Mode' : '📚 Learning Path Mode'}
                    </Badge>
                    <small className="text-muted">
                      {activeMode === 'quiz' 
                        ? 'Your next message will generate a quiz'
                        : 'Your next message will create a learning path'
                      }
                    </small>
                  </div>
                )}

                <Form.Group>
                  <div className="d-flex gap-2">
                    <Form.Control
                      ref={textareaRef}
                      as="textarea"
                      rows={1}
                      value={inputMessage}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        activeMode === 'quiz' 
                          ? 'Enter topic for quiz (e.g., "Python basics with 10 questions")'
                          : activeMode === 'learning_path'
                          ? 'Enter topic for learning path (e.g., "Web development roadmap")'
                          : 'Type your message here...'
                      }
                      disabled={isGenerating}
                      className="flex-grow-1"
                      style={{ 
                        resize: 'none', 
                        minHeight: '38px',
                        maxHeight: '200px'
                      }}
                    />
                    <Button
                      variant="primary"
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isGenerating}
                      className="d-flex align-items-center"
                    >
                      {isGenerating ? (
                        <StopCircleFill size={16} />
                      ) : (
                        <Send size={16} />
                      )}
                    </Button>
                  </div>
                </Form.Group>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
        message="Are you sure you want to clear all chat messages? This action cannot be undone."
      />
    </Container>
  );
};

export default AIChat;
