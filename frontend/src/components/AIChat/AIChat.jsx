import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Button, Alert, Spinner } from 'react-bootstrap';
import { FaPaperPlane, FaStop, FaBook, FaQuestionCircle, FaSearch, FaChartBar, FaTrash } from 'react-icons/fa';
import { fetchChatHistory, askQuestion, clearChat, generateQuiz } from '../../api';
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
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  // Use a single state to track the active mode - ensures mutual exclusivity
  const [activeMode, setActiveMode] = useState('none'); // 'none', 'learning_path', 'quiz'
  const [error, setError] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const hasFetched = useRef(false);
  const componentMounted = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 AIChat component unmounted, cleaning up...');
      componentMounted.current = false;
    };
  }, []);
  
  // Helper function to detect if content is a learning path
  const isLearningPathContent = (content) => {
    if (!content) return false;
    
    // If content is a string, try to parse it
    let parsedContent = content;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        // If parsing fails, check if it looks like learning path JSON
        const contentStr = content.toLowerCase();
        return contentStr.includes('"topics"') && 
               (contentStr.includes('"course_duration"') || contentStr.includes('"duration"')) && 
               (contentStr.includes('"name"') || contentStr.includes('"description"') || contentStr.includes('programming') || contentStr.includes('learning'));
      }
    }
    
    // Check if it has learning path structure
    if (typeof parsedContent === 'object' && parsedContent !== null) {
      // First check if it's an API response wrapper
      if (parsedContent.content && typeof parsedContent.content === 'string') {
        try {
          const nestedContent = JSON.parse(parsedContent.content);
          parsedContent = nestedContent;
        } catch (e) {
          // If nested parsing fails, use the original content
        }
      }
      
      // Check for common learning path properties
      const hasTopics = parsedContent.hasOwnProperty('topics') && Array.isArray(parsedContent.topics);
      const hasMetadata = parsedContent.hasOwnProperty('name') || 
                         parsedContent.hasOwnProperty('course_duration') || 
                         parsedContent.hasOwnProperty('duration') ||
                         parsedContent.hasOwnProperty('description');
      
      return hasTopics && hasMetadata;
    }
    
    return false;
  };
  
  // Derived states for backward compatibility and cleaner code
  const isLearningPath = activeMode === 'learning_path';
  const isQuiz = activeMode === 'quiz';

  // Fetch chat history on component mount and when returning to page
  useEffect(() => {
    console.log('🔄 AIChat component mounted, loading chat history...');
    
    // Set up test authentication if not exists (for testing purposes)
    const currentUsername = localStorage.getItem('username');
    const currentToken = localStorage.getItem('token');
    
    if (!currentUsername || !currentToken) {
      console.log('🔑 Setting up test authentication...');
      localStorage.setItem('username', 'test@example.com');
      localStorage.setItem('token', 'test-token-123');
      localStorage.setItem('name', 'Test User');
    }
    
    loadChatHistory();
    hasFetched.current = true;
  }, []); // Empty dependency array to run only once

  // Reload chat history when user navigates back or page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 Page became visible, refreshing chat history...');
        setTimeout(() => {
          loadChatHistory();
        }, 500); // Small delay to ensure everything is loaded
      }
    };

    const handleFocus = () => {
      console.log('🎯 Window focused, refreshing chat history...');
      setTimeout(() => {
        loadChatHistory();
      }, 500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // Add event listeners only once

  // Remove problematic useEffect that was causing crashes

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

  // Ensure scroll to bottom after initial load and DOM rendering
  useEffect(() => {
    if (messages.length > 0) {
      // Use setTimeout to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [messages.length > 0]);

  // Add window focus event listener to scroll to bottom when returning to page
  useEffect(() => {
    const handleWindowFocus = () => {
      if (messages.length > 0) {
        // When user returns to the page, scroll to bottom after a short delay
        setTimeout(() => {
          scrollToBottom();
        }, 200);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('visibilitychange', () => {
      if (!document.hidden && messages.length > 0) {
        setTimeout(() => {
          scrollToBottom();
        }, 200);
      }
    });

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('visibilitychange', handleWindowFocus);
    };
  }, [messages.length]);

  const loadChatHistory = async () => {
    try {
      setError(null);
      const username = localStorage.getItem("username");
      
      if (!username) {
        console.warn('⚠️ No username found in localStorage');
        setError('Please log in to view chat history.');
        return;
      }
      
      console.log('📚 Loading chat history for username:', username);
      
      // First, try to load from localStorage for immediate display
      const localStorageKey = `chat_messages_${username}`;
      const cachedMessages = localStorage.getItem(localStorageKey);
      
      if (cachedMessages) {
        try {
          const parsedCachedMessages = JSON.parse(cachedMessages);
          console.log('💾 Loaded cached messages from localStorage:', parsedCachedMessages.length);
          if (parsedCachedMessages.length > 0) {
            setMessages(parsedCachedMessages);
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse cached messages, will fetch from server');
          localStorage.removeItem(localStorageKey); // Clear corrupted cache
        }
      }
      
      // Then fetch from server to get latest data
      try {
        const history = await fetchChatHistory();
        console.log('📡 Fetched chat history from server:', history);
        
        if (!history || !Array.isArray(history)) {
          console.warn('⚠️ Invalid history format received:', history);
          return;
        }
        
        // Process history and ensure proper typing with deduplication
        const seenContentHashes = new Set();
        const processedHistory = history
          .map((msg, index) => {
            // Ensure message has required fields
            if (!msg || !msg.role || msg.content === undefined) {
              console.warn('⚠️ Invalid message format:', msg);
              return null;
            }
            
            let messageType = msg.type || msg.message_type || 'content';
            
            // For assistant messages, check if content is a learning path or quiz
            if (msg.role === 'assistant' && msg.content) {
              // Force check for learning path JSON patterns
              const contentStr = String(msg.content).toLowerCase();
              
              // Check for quiz content first - enhanced detection
              const hasQuizStructure = (
                // Check for quiz-specific properties
                (contentStr.includes('"quiz_data"') || contentStr.includes('quiz_data')) ||
                (contentStr.includes('"questions"') && contentStr.includes('"correct_answer"')) ||
                (contentStr.includes('"question_number"') && contentStr.includes('"options"')) ||
                (contentStr.includes('"type"') && contentStr.includes('"quiz"')) ||
                (contentStr.includes('"quiz_id"') && contentStr.includes('"topic"')) ||
                (contentStr.includes('"time_limit"') && contentStr.includes('"difficulty"')) ||
                // Check if it's already parsed as a quiz object
                (typeof msg.content === 'object' && (
                  msg.content.type === 'quiz' ||
                  msg.content.quiz_data ||
                  (msg.content.questions && Array.isArray(msg.content.questions)) ||
                  (msg.content.quiz_id && msg.content.topic && msg.content.questions)
                ))
              );
              
              // Simplified detection for learning paths - just check for topics array
              const hasLearningPathStructure = (
                contentStr.includes('"topics"') && 
                contentStr.includes('[') &&
                contentStr.includes('{') &&
                (contentStr.includes('"name"') || contentStr.includes('"description"') || 
                 contentStr.includes('programming') || contentStr.includes('learning') || 
                 contentStr.includes('study') || contentStr.includes('python') || 
                 contentStr.includes('time_required'))
              );
              
              // Set message type based on content
              if (hasQuizStructure) {
                messageType = 'quiz';
                console.log('🎯 DETECTED quiz content:', typeof msg.content);
              } else if (hasLearningPathStructure || 
                  (typeof msg.content === 'object' && msg.content.topics && Array.isArray(msg.content.topics))) {
                messageType = 'learning_path';
                console.log('🎯 DETECTED learning path content:', typeof msg.content);
              }
            }
            
            return {
              ...msg,
              id: msg.id || msg._id || `${msg.timestamp || Date.now()}-${index}`,
              type: messageType,
              timestamp: msg.timestamp || new Date().toISOString(),
              contentHash: msg.role + '_' + String(msg.content || '').substring(0, 50)
            };
          })
          .filter(msg => msg !== null) // Remove null messages
          .filter((msg) => {
            // Remove duplicate messages based on content
            if (seenContentHashes.has(msg.contentHash)) {
              console.log('🚫 Removing duplicate message:', msg.contentHash);
              return false;
            }
            seenContentHashes.add(msg.contentHash);
            return true;
          });
        
        console.log('📚 Processed chat history:', processedHistory.length, 'messages');
        setMessages(processedHistory);
        
        // Cache the processed messages in localStorage
        try {
          if (processedHistory.length > 0) {
            localStorage.setItem(localStorageKey, JSON.stringify(processedHistory));
            console.log('💾 Cached messages to localStorage');
          }
        } catch (e) {
          console.warn('⚠️ Failed to cache messages to localStorage:', e);
        }
      } catch (fetchError) {
        console.error('❌ Error fetching from server:', fetchError);
        // Don't set error if we have cached messages
        if (messages.length === 0) {
          setError('Unable to load chat history. Please check your connection.');
        }
      }
    } catch (err) {
      console.error('❌ Error in loadChatHistory:', err);
      setError('Failed to load chat history. Please try again.');
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Try multiple methods to ensure scrolling works
      try {
        // Method 1: scrollIntoView with smooth behavior for better UX
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        });
        
        // Method 2: Also scroll the parent container to bottom as fallback
        const chatMessagesContainer = messagesEndRef.current.closest('.chat-messages');
        if (chatMessagesContainer) {
          chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
      } catch (error) {
        // Fallback method if scrollIntoView fails
        console.warn('ScrollIntoView failed, using fallback:', error);
        const chatMessagesContainer = messagesEndRef.current.closest('.chat-messages');
        if (chatMessagesContainer) {
          chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
      }
    }
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

    // DEBUG: Log current mode state
    console.log('🔍 SEND MESSAGE DEBUG:', {
      isQuiz,
      isLearningPath,
      messageToSend: messageToSend.trim(),
      willUseQuizAPI: isQuiz
    });

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
    
    // Update messages with user message
    const updatedMessagesWithUser = [...messages, newUserMessage];
    setMessages(updatedMessagesWithUser);
    
    // Cache the user message immediately
    const username = localStorage.getItem("username");
    const localStorageKey = `chat_messages_${username}`;
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(updatedMessagesWithUser));
      console.log('💾 Cached user message to localStorage');
    } catch (e) {
      console.warn('⚠️ Failed to cache user message to localStorage:', e);
    }
    
    setIsGenerating(true);
    
    try {
      // Handle quiz mode differently - use proper quiz generation API
      if (isQuiz) {
        console.log('🎯 Quiz mode detected, using generateQuiz API');
        console.log('📞 About to call generateQuiz with topic:', messageToSend.trim());
        
        // Extract number of questions from user message
        const extractQuestionCount = (message) => {
          const msg = message.toLowerCase();
          
          // Look for patterns like "15 questions", "10 quiz", "5 MCQ", etc.
          const patterns = [
            /(?:with|for|about|generate|create)\s+(?:a\s+)?(?:quiz\s+(?:with\s+)?)?(?:of\s+)?(?:total\s+)?(?:exactly\s+)?(\d+)\s+(?:questions?|quiz|mcq|q)/i,
            /(\d+)\s+(?:questions?|quiz|mcq|q)/i,
            /(?:questions?)\s*[=:]?\s*(\d+)/i,
            /\b(\d+)\s*[\-–—]?\s*(?:questions?|quiz|mcq|q)/i
          ];
          
          for (const pattern of patterns) {
            const match = msg.match(pattern);
            if (match) {
              const count = parseInt(match[1]);
              if (count >= 1 && count <= 50) { // Reasonable range
                console.log(`📊 Extracted ${count} questions from: "${message}"`);
                return count;
              }
            }
          }
          
          // Default to 10 questions if not specified
          console.log('📊 No question count specified, defaulting to 10 questions');
          return 10;
        };
        
        // Extract difficulty from user message
        const extractDifficulty = (message) => {
          const msg = message.toLowerCase();
          
          if (msg.includes('easy') || msg.includes('beginner') || msg.includes('basic') || msg.includes('simple')) {
            return 'easy';
          } else if (msg.includes('hard') || msg.includes('difficult') || msg.includes('advanced') || msg.includes('expert') || msg.includes('challenging')) {
            return 'hard';
          } else {
            return 'medium';
          }
        };
        
        // Extract topic from user message (remove question count and difficulty modifiers)
        const extractTopic = (message) => {
          let topic = message.trim();
          
          // Remove common quiz-related phrases
          topic = topic.replace(/(?:create|generate|make|build)\s+(?:a\s+|an\s+)?(?:quiz|test)\s+(?:about|on|for)?\s*/gi, '');
          topic = topic.replace(/(?:quiz|test)\s+(?:about|on|for)\s*/gi, '');
          topic = topic.replace(/\b\d+\s+(?:questions?|quiz|mcq|q)\b/gi, '');
          topic = topic.replace(/\b(?:easy|medium|hard|difficult|advanced|beginner|basic|simple|expert|challenging)\b/gi, '');
          topic = topic.replace(/\b(?:with|for|about)\s+/gi, '');
          topic = topic.trim();
          
          // If topic is empty after cleaning, use a default
          if (!topic) {
            topic = 'General Knowledge';
          }
          
          console.log(`🎯 Extracted topic: "${topic}" from: "${message}"`);
          return topic;
        };
        
        const questionCount = extractQuestionCount(messageToSend);
        const difficulty = extractDifficulty(messageToSend);
        const topic = extractTopic(messageToSend);
        
        console.log(`📊 Quiz parameters: topic="${topic}", difficulty="${difficulty}", questions=${questionCount}`);
        
        const result = await generateQuiz(topic, difficulty, questionCount);
        
        if (result && result.quiz_data) {
          // Create a proper quiz message
          const quizMessage = {
            role: 'assistant',
            content: result,
            type: 'quiz',
            timestamp: new Date().toISOString()
          };
          
          setMessages(prevMessages => [...prevMessages, quizMessage]);
          console.log('✅ Quiz generated successfully:', result);
        } else {
          throw new Error('Failed to generate quiz');
        }
        
        setIsGenerating(false);
        return;
      }
      
      // Always create a temporary AI message placeholder for non-quiz messages
      const tempAIMessage = {
        role: 'assistant',
        content: '',
        type: isLearningPath ? 'learning_path' : 'content',
        timestamp: new Date().toISOString()
      };
      
      // Update messages with temp AI message
      setMessages(prevMessages => [...prevMessages, tempAIMessage]);
      
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
              // Always update the last AI message (which was created as a temp placeholder)
              const updatedMessages = [...prevMessages];
              const lastMessageIndex = updatedMessages.length - 1;
              
              // Detect if the accumulated response looks like a learning path
              let messageType = isLearningPath ? 'learning_path' : 'content';
              
              // Additional runtime detection for learning path content
              if (!isLearningPath && typeof accumulatedResponse === 'string') {
                const contentStr = accumulatedResponse.toLowerCase();
                // Simplified detection - if it has topics array, it's likely a learning path
                if (contentStr.includes('"topics"') && contentStr.includes('[') && contentStr.includes('{')) {
                  messageType = 'learning_path';
                  console.log('🎯 Runtime detection: Found learning path content during streaming!');
                }
              }
              
              // Create a new message object instead of modifying the existing one
              updatedMessages[lastMessageIndex] = {
                ...updatedMessages[lastMessageIndex],
                content: accumulatedResponse,
                type: messageType
              };
              
              return updatedMessages;
            });
          },
          () => {
            // On complete
            setIsGenerating(false);
            
            // Cache the completed messages to localStorage
            const username = localStorage.getItem("username");
            const localStorageKey = `chat_messages_${username}`;
            
            // Get current messages state and cache them
            setTimeout(() => {
              setMessages(currentMessages => {
                try {
                  localStorage.setItem(localStorageKey, JSON.stringify(currentMessages));
                  console.log('💾 Cached completed messages to localStorage');
                } catch (e) {
                  console.warn('⚠️ Failed to cache completed messages to localStorage:', e);
                }
                return currentMessages; // Return unchanged
              });
            }, 100); // Small delay to ensure state is updated
          },
          false, // Don't pass isQuiz to askQuestion since we handle it separately
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
      
      // Also clear localStorage cache
      const username = localStorage.getItem("username");
      const localStorageKey = `chat_messages_${username}`;
      localStorage.removeItem(localStorageKey);
      console.log('💾 Cleared cached messages from localStorage');
    } catch (err) {
      console.error('Error clearing chat:', err);
      setError('Failed to clear chat history. Please try again.');
    }
  };

  const handleToggleLearningPath = () => {
    // Toggle learning path mode - if already active, deactivate; otherwise activate
    setActiveMode(prev => prev === 'learning_path' ? 'none' : 'learning_path');
  };

  const handleToggleQuiz = () => {
    // Toggle quiz mode - if already active, deactivate; otherwise activate
    setActiveMode(prev => prev === 'quiz' ? 'none' : 'quiz');
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
        // If parsing fails, check if it looks like learning path JSON
        const contentStr = content.toLowerCase();
        return contentStr.includes('"topics"') && contentStr.includes('[');
      }
    }
    
    // Check if it has learning path structure
    if (typeof parsedContent === 'object' && parsedContent !== null) {
      // First check if it's an API response wrapper
      if (parsedContent.content && typeof parsedContent.content === 'string') {
        try {
          const nestedContent = JSON.parse(parsedContent.content);
          parsedContent = nestedContent;
        } catch (e) {
          // If nested parsing fails, check the string content
          const contentStr = parsedContent.content.toLowerCase();
          return contentStr.includes('"topics"') && contentStr.includes('[');
        }
      }
      
      // Simple check: if it has a topics array, it's likely a learning path
      return (
        parsedContent.hasOwnProperty('topics') &&
        Array.isArray(parsedContent.topics) &&
        parsedContent.topics.length > 0
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
            messages.map((message, index) => {
              // Create a stable unique key for each message
              const messageKey = message.id || `${message.role}-${message.timestamp || index}-${typeof message.content === 'string' ? message.content.substring(0, 50).replace(/\s/g, '') : String(message.content || '').substring(0, 50).replace(/\s/g, '')}`; 
              
              return (
                <div key={messageKey} className="message-wrapper">
                  {message.role === 'user' ? (
                    <UserMessage message={message} />
                  ) : (
                    // Check if it's a learning path by content structure or type
                    (() => {
                      const isLearningPathType = message.type === 'learning_path';
                      const isLearningPathContent = memoizedIsLearningPathContent(message.content);
                      const shouldShowLearningPath = isLearningPathType || isLearningPathContent;
                      
                      console.log('🔍 Message routing debug:', {
                        messageType: message.type,
                        isLearningPathType,
                        isLearningPathContent,
                        shouldShowLearningPath,
                        contentPreview: typeof message.content === 'string' && message.content.substring ? message.content.substring(0, 100) + '...' : typeof message.content
                      });
                      
                      return shouldShowLearningPath ? (
                        <LearningPathDisplayComponent 
                          message={message.content} 
                        />
                      ) : (
                        <AIMessage message={message} />
                      );
                    })()
                  )}
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