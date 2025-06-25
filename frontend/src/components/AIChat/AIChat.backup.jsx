import React, { useState, useEffect, useRef } from 'react';
import { Container, Button, Alert, Spinner } from 'react-bootstrap';
import { FaPaperPlane, FaStop, FaRedo, FaPlus, FaBook, FaQuestionCircle, FaSearch, FaChartBar, FaTrash, FaCheck, FaClock } from 'react-icons/fa';
import { fetchChatHistory, askQuestion, clearChat, saveLearningPath } from '../../api';
import './AIChat.scss';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import SearchModal from './SearchModal';
import AnalyticsModal from './AnalyticsModal';
import ConfirmModal from './ConfirmModal';

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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      type: 'content',
      timestamp: new Date().toISOString()
    };
    
    // Add temporary placeholder for AI response
    const tempAIMessage = {
      role: 'assistant',
      content: '',
      type: isLearningPath ? 'learning_path' : 'content',
      timestamp: new Date().toISOString()
    };
    
    // Update messages with both user message and empty AI message
    setMessages(prevMessages => [...prevMessages, newUserMessage, tempAIMessage]);
    setIsGenerating(true);
    
    try {
      let accumulatedResponse = '';
      
      await askQuestion(
        userMessage,
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
            const updatedMessages = [...prevMessages];
            const lastMessageIndex = updatedMessages.length - 1;
            
            // Create a new message object instead of modifying the existing one
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              content: accumulatedResponse
            };
            
            return updatedMessages;
          });
        },
        () => {
          // On complete
          setIsGenerating(false);
          loadChatHistory(); // Refresh to get server-stored messages
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
              content: accumulatedResponse
            };
            
            return updatedMessages;
          });
        },
        () => {
          // On complete
          setIsGenerating(false);
          loadChatHistory(); // Refresh to get server-stored messages
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

  // Render user message
  const UserMessage = ({ message }) => {
    const { content, timestamp } = message;
    const timeAgo = timestamp
      ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
      : null;

    return (
      <div className="user-message-container">
        <div className="user-message-bubble">
          <div className="message-content">{content}</div>
          {timeAgo && (
            <div className="message-time">{timeAgo}</div>
          )}
        </div>
      </div>
    );
  };

  // Render AI message
  const AIMessage = ({ message }) => {
    const { content, timestamp } = message;
    const timeAgo = timestamp
      ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
      : null;

    if (!content) {
      return null;
    }

    return (
      <div className="ai-message-container">
        <div className="ai-avatar">
          <img src="/icons/aitutor-short-no-bg.png" alt="AI" className="avatar-image" />
        </div>
        
        <div className="ai-message-card">
          <div className="ai-header">
            <span className="ai-label">AI Tutor</span>
            {timeAgo && (
              <small className="message-time">{timeAgo}</small>
            )}
          </div>
          
          <div className="message-content">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom styling for markdown elements
                h1: ({children}) => <h1 className="markdown-h1">{children}</h1>,
                h2: ({children}) => <h2 className="markdown-h2">{children}</h2>,
                h3: ({children}) => <h3 className="markdown-h3">{children}</h3>,
                p: ({children}) => <p className="markdown-p">{children}</p>,
                ul: ({children}) => <ul className="markdown-ul">{children}</ul>,
                ol: ({children}) => <ol className="markdown-ol">{children}</ol>,
                li: ({children}) => <li className="markdown-li">{children}</li>,
                code: ({children, className}) => {
                  const isInline = !className;
                  return isInline ? 
                    <code className="markdown-code-inline">{children}</code> :
                    <code className="markdown-code-block">{children}</code>;
                },
                pre: ({children}) => <pre className="markdown-pre">{children}</pre>,
                blockquote: ({children}) => <blockquote className="markdown-blockquote">{children}</blockquote>,
                a: ({children, href}) => <a className="markdown-link" href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                table: ({children}) => <table className="markdown-table">{children}</table>,
                th: ({children}) => <th className="markdown-th">{children}</th>,
                td: ({children}) => <td className="markdown-td">{children}</td>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  };

  // Render learning path display
  const LearningPathDisplay = ({ content }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSuccess] = useState(null);

    // Log the content type and value for debugging
    console.log("Learning Path Content Type:", typeof content);
    console.log("Learning Path Content Preview:", 
      typeof content === 'string' 
        ? content.substring(0, 100) + '...' 
        : JSON.stringify(content).substring(0, 100) + '...'
    );

    // Handle case where content is a string (not parsed JSON)
    let parsedContent = content;
    if (typeof content === 'string') {
      try {
        // Try to parse the string as JSON
        parsedContent = JSON.parse(content);
        console.log("Successfully parsed string content as JSON");
        
        // If the parsed content has a 'content' property that's a string, it might be a nested response
        if (parsedContent.content && typeof parsedContent.content === 'string') {
          try {
            // Try to parse the nested content
            const nestedContent = JSON.parse(parsedContent.content);
            parsedContent = nestedContent;
            console.log("Successfully parsed nested content as JSON");
          } catch (e) {
            console.error("Failed to parse nested content as JSON:", e);
            // Keep the outer parsed content
          }
        } else if (parsedContent.content && typeof parsedContent.content === 'object') {
          // If content is already an object, use that directly
          parsedContent = parsedContent.content;
          console.log("Using nested content object directly");
        }
      } catch (e) {
        console.error("Failed to parse content as JSON:", e);
        return (
          <div className="learning-path-error">
            <Alert variant="warning">
              Unable to display learning path. The content is not in the expected format.
              <br />
              <small>Error: {e.message}</small>
            </Alert>
          </div>
        );
      }
    }

    // If content is still not valid, return error
    if (!parsedContent || typeof parsedContent !== 'object') {
      console.error("Content is not a valid object:", parsedContent);
      return (
        <div className="learning-path-error">
          <Alert variant="warning">
            Unable to display learning path. The content is not a valid object.
          </Alert>
        </div>
      );
    }

    // Check if the required fields exist
    if (!parsedContent.topics || !Array.isArray(parsedContent.topics)) {
      console.error("Content is missing required 'topics' array:", parsedContent);
      return (
        <div className="learning-path-error">
          <Alert variant="warning">
            Unable to display learning path. The content is missing required data.
            <br />
            <small>Expected a 'topics' array but found: {Object.keys(parsedContent).join(', ')}</small>
          </Alert>
        </div>
      );
    }

    const handleSave = async () => {
      try {
        setIsSaving(true);
        setSaveError(null);
        setSuccess(null);
        
        // Call API to save the learning path
        await saveLearningPath(parsedContent, parsedContent.name);
        
        setIsSaved(true);
        setSuccess("Learning path saved successfully!");
      } catch (error) {
        console.error(error);
        setSaveError("Failed to save learning path. Please try again.");
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="learning-path-container">
        <div className="learning-path-card">
          <div className="learning-path-header">
            <h3 className="path-title">{parsedContent.name || "Learning Path"}</h3>
            <div className="path-meta">
              <span className="duration-badge">
                <FaClock className="me-1" />
                {parsedContent.course_duration || "N/A"}
              </span>
            </div>
          </div>
          
          <div className="learning-path-body">
            {saveError && (
              <Alert variant="danger" dismissible onClose={() => setSaveError(null)}>
                {saveError}
              </Alert>
            )}
            
            {saveSuccess && (
              <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
                {saveSuccess}
              </Alert>
            )}
            
            {parsedContent.description && (
              <div className="path-description">
                <p>{parsedContent.description}</p>
              </div>
            )}
            
            <div className="topics-container">
              <h5 className="topics-heading">Learning Topics</h5>
              {parsedContent.topics.map((topic, index) => (
                <div key={index} className="topic-card">
                  <div className="topic-header">
                    <h5 className="topic-title">
                      <span className="topic-number">{index + 1}</span>
                      {topic.name}
                    </h5>
                    <span className="time-badge">
                      <FaBook className="me-1" />
                      {topic.time_required}
                    </span>
                  </div>
                  
                  <p className="topic-description">{topic.description}</p>
                  
                  <div className="topic-resources">
                    {topic.links && topic.links.length > 0 && (
                      <div className="resource-section">
                        <h6>Reading Materials</h6>
                        <ul className="resource-list">
                          {topic.links.map((link, i) => (
                            <li key={i}>
                              <a href={link} target="_blank" rel="noopener noreferrer">
                                {link.replace(/^https?:\/\//, '').split('/')[0]}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {topic.videos && topic.videos.length > 0 && (
                      <div className="resource-section">
                        <h6>Video Resources</h6>
                        <ul className="resource-list">
                          {topic.videos.map((video, i) => (
                            <li key={i}>
                              <a href={video} target="_blank" rel="noopener noreferrer">
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
                </div>
              ))}
            </div>
          </div>
          
          <div className="learning-path-footer">
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
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
                  message.type === 'learning_path' ? (
                    <LearningPathDisplay content={message.content} />
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
                      setInputMessage("");
                    }}
                  >
                    <span className="icon">🛣️</span>
                    <span className="text">Create study plan</span>
                  </button>
                  
                  <button 
                    className="quick-action-btn"
                    onClick={() => {
                      setIsQuiz(true);
                      setInputMessage("");
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
                  onClick={handleSendMessage}
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