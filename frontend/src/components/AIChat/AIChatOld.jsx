import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Button, Alert, Spinner } from 'react-bootstrap';
import { FaPaperPlane, FaStop, FaBook, FaQuestionCircle, FaSearch, FaChartBar, FaTrash } from 'react-icons/fa';
import { fetchChatHistory, askQuestion, clearChat, generateQuiz, storeQuizMessage } from '../../api';
import './AIChat.scss';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { debugLogger, validateState } from '../../utils/debugUtils';
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
  const [stateVersion, setStateVersion] = useState(0); // Force re-renders when needed
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
    debugLogger.log('Mount', 'AIChat component mounted');
    return () => {
      console.log('🧹 AIChat component unmounted, cleaning up...');
      componentMounted.current = false;
      // Clear any pending timeouts and force a final state sync
      syncUIState();
    };
  }, []);
  
  // Remove storage synchronization as we're using direct MongoDB access
  const cleanupStorageConflicts = useCallback(() => {
    // No longer needed - we fetch directly from MongoDB
    console.log('🗑️ Storage conflicts cleanup disabled - using direct MongoDB access');
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
  
  // Centralized state synchronization function to prevent inconsistencies
  const syncUIState = useCallback(() => {
    setStateVersion(prev => prev + 1);
  }, []);
  
  // Sync state whenever activeMode changes
  useEffect(() => {
    console.log('🔄 Active mode changed:', activeMode);
    syncUIState();
  }, [activeMode, syncUIState]);

  // Fetch chat history on component mount and when returning to page
  useEffect(() => {
    console.log('🔄 AIChat component mounted, loading chat history...');
    
  // Ensure user is authenticated - no localStorage fallback
    const currentUsername = localStorage.getItem('username');
    const currentToken = localStorage.getItem('token');
    
    if (!currentUsername || !currentToken) {
      console.log('❌ No authentication found. Please log in.');
      setError('Please log in to access chat.');
      return;
    }
    
    // Clean up any storage conflicts before loading
    cleanupStorageConflicts();
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

  // Check for initial question from home page
  useEffect(() => {
    const initialQuestion = sessionStorage.getItem("initialQuestion");
    const initialMode = sessionStorage.getItem("initialMode");
    
    if (initialQuestion) {
      console.log('✅ Auto-submitting from Home page:', { question: initialQuestion, mode: initialMode });
      
      // Clear from session storage to prevent reuse
      sessionStorage.removeItem("initialQuestion");
      sessionStorage.removeItem("initialMode");
      
      // Check if there's an initial mode set and apply it
      if (initialMode) {
        console.log('💾 Setting mode and auto-submitting with mode:', initialMode);
        setActiveMode(initialMode);
        
        // Submit with mode parameter to override state timing issues
        setTimeout(() => {
          console.log('🚀 Auto-submitting with forced mode:', { question: initialQuestion, mode: initialMode });
          handleSendMessageWithMode(initialQuestion, initialMode);
        }, 500);
      } else {
        console.log('🚀 Auto-submitting without mode');
        // Submit without mode for simple responses
        setTimeout(() => {
          console.log('🚀 Auto-submitting:', initialQuestion);
          handleSendMessage(initialQuestion);
        }, 500);
      }
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
        console.warn('⚠️ No username found. Please log in.');
        setError('Please log in to view chat history.');
        return;
      }
      
      console.log('📚 Loading chat history directly from MongoDB Atlas for username:', username);
      
      // Fetch directly from MongoDB Atlas - NO localStorage involvement
      try {
        const history = await fetchChatHistory();
        console.log('📡 Fetched chat history from MongoDB Atlas:', history);
        
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
              // IMPORTANT: Only include quizzes that were generated through AI Chat conversations
              // Exclude quizzes that were manually created in the Quiz System
              const hasQuizStructure = (
                // Check for AI-generated quiz properties (not manual quiz system)
                (contentStr.includes('"quiz_data"') || contentStr.includes('quiz_data')) &&
                // Make sure this is from an AI Chat interaction, not manual quiz creation
                msg.type === 'quiz' && // Must have quiz type set by AI Chat
                (
                  (contentStr.includes('"questions"') && contentStr.includes('"correct_answer"')) ||
                  (contentStr.includes('"question_number"') && contentStr.includes('"options"')) ||
                  (contentStr.includes('"quiz_id"') && contentStr.includes('"topic"')) ||
                  (contentStr.includes('"time_limit"') && contentStr.includes('"difficulty"')) ||
                  // Check for more AI-generated quiz patterns
                  (contentStr.includes('"total_questions"') && contentStr.includes('"difficulty"')) ||
                  (contentStr.includes('"correct_answer"') && contentStr.includes('"explanation"')) ||
                  // Check if it's already parsed as an AI-generated quiz object
                  (typeof msg.content === 'object' && (
                    msg.content.type === 'quiz' ||
                    msg.content.quiz_data ||
                    (msg.content.questions && Array.isArray(msg.content.questions)) ||
                    (msg.content.quiz_id && msg.content.topic && msg.content.questions) ||
                    (msg.content.response && msg.content.quiz_data)
                  ))
                )
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
            
            // Debug and fix timestamp processing
            let processedTimestamp = msg.timestamp;
            console.log('🕐 Processing timestamp for message:', {
              originalTimestamp: msg.timestamp,
              timestampType: typeof msg.timestamp,
              messageRole: msg.role,
              messageContent: typeof msg.content === 'string' ? msg.content.substring(0, 50) + '...' : typeof msg.content
            });
            
            if (!processedTimestamp) {
              processedTimestamp = new Date().toISOString();
              console.log('🕐 No timestamp found, using current time:', processedTimestamp);
            } else if (typeof processedTimestamp === 'string') {
              // Ensure timestamp is in ISO format for consistent parsing
              try {
                // If timestamp doesn't end with Z and has T, assume it's UTC and add Z
                if (processedTimestamp.includes('T') && !processedTimestamp.endsWith('Z')) {
                  const originalTimestamp = processedTimestamp;
                  processedTimestamp = processedTimestamp + 'Z';
                  console.log('🕐 Added Z to timestamp:', { original: originalTimestamp, processed: processedTimestamp });
                }
                // Validate by creating a Date object
                const testDate = new Date(processedTimestamp);
                if (isNaN(testDate.getTime())) {
                  console.warn('🕐 Invalid timestamp detected, using current time:', processedTimestamp);
                  processedTimestamp = new Date().toISOString();
                } else {
                  console.log('🕐 Timestamp validation successful:', {
                    processed: processedTimestamp,
                    asDate: testDate,
                    localTime: testDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                  });
                }
              } catch (e) {
                console.warn('🕐 Error processing timestamp, using current time:', e);
                processedTimestamp = new Date().toISOString();
              }
            } else {
              // If timestamp is not a string, convert to ISO string
              const originalTimestamp = processedTimestamp;
              processedTimestamp = new Date(processedTimestamp).toISOString();
              console.log('🕐 Converted non-string timestamp:', { original: originalTimestamp, processed: processedTimestamp });
            }
            
            return {
              ...msg,
              id: msg.id || msg._id || `${processedTimestamp}-${index}`,
              type: messageType,
              timestamp: processedTimestamp,
              // Enhanced content hash that includes message type to prevent learning path deduplication
              contentHash: `${msg.role}_${messageType}_${String(msg.content || '').substring(0, 50)}`
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
        
        // Validate chat history before setting
        const validationErrors = validateState.chatHistory(processedHistory);
        if (validationErrors.length > 0) {
          console.warn('⚠️ Chat history validation failed:', validationErrors);
          debugLogger.error('ChatHistory', 'Validation failed', validationErrors);
        }
        
        setMessages(processedHistory);
        
        // NO localStorage caching - data comes directly from MongoDB Atlas
        console.log('✅ Messages loaded directly from MongoDB Atlas without localStorage caching');
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

  // Function to handle sending messages with a specific mode override
  const handleSendMessageWithMode = async (message, mode) => {
    if (!message.trim() || isGenerating) return;

    // Temporarily override the mode for this specific message
    const wasQuiz = (mode === 'quiz');
    const wasLearningPath = (mode === 'learning_path');
    
    console.log('🔍 SEND MESSAGE WITH MODE DEBUG:', {
      message: message.trim(),
      mode,
      wasQuiz,
      wasLearningPath
    });

    setInputMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message to chat with proper timestamp
    const currentTimestamp = new Date().toISOString();
    console.log('🕗 Creating user message with timestamp:', {
      timestamp: currentTimestamp,
      localTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      utcTime: new Date().toUTCString()
    });
    
    const newUserMessage = {
      role: 'user',
      content: message.trim(),
      type: 'content',
      timestamp: currentTimestamp
    };
    
    // Update messages with user message
    const updatedMessagesWithUser = [...messages, newUserMessage];
    setMessages(updatedMessagesWithUser);
    
    // NO localStorage caching - messages are stored directly in MongoDB via API calls
    console.log('📡 User message added - will be persisted to MongoDB via API calls');
    
    setIsGenerating(true);
    
    try {
      // Handle quiz mode differently - use proper quiz generation API
      if (wasQuiz) {
        console.log('🎯 Quiz mode detected with override, using generateQuiz API');
        console.log('📞 About to call generateQuiz with topic:', message.trim());
        
        // Extract number of questions from user message
        const extractQuestionCount = (msg) => {
          const msgLower = msg.toLowerCase();
          
          // Look for patterns like "15 questions", "10 quiz", "5 MCQ", etc.
          const patterns = [
            /(?:with|for|about|generate|create)\s+(?:a\s+)?(?:quiz\s+(?:with\s+)?)?(?:of\s+)?(?:total\s+)?(?:exactly\s+)?(\d+)\s+(?:questions?|quiz|mcq|q)/i,
            /(\d+)\s+(?:questions?|quiz|mcq|q)/i,
            /(?:questions?)\s*[=:]?\s*(\d+)/i,
            /\b(\d+)\s*[\-–—]?\s*(?:questions?|quiz|mcq|q)/i
          ];
          
          for (const pattern of patterns) {
            const match = msgLower.match(pattern);
            if (match) {
              const count = parseInt(match[1]);
              if (count >= 1 && count <= 50) { // Reasonable range
                console.log(`📈 Extracted ${count} questions from: "${msg}"`);
                return count;
              }
            }
          }
          
          // Default to 10 questions if not specified
          console.log('📈 No question count specified, defaulting to 10 questions');
          return 10;
        };
        
        // Extract difficulty from user message
        const extractDifficulty = (msg) => {
          const msgLower = msg.toLowerCase();
          
          if (msgLower.includes('easy') || msgLower.includes('beginner') || msgLower.includes('basic') || msgLower.includes('simple')) {
            return 'easy';
          } else if (msgLower.includes('hard') || msgLower.includes('difficult') || msgLower.includes('advanced') || msgLower.includes('expert') || msgLower.includes('challenging')) {
            return 'hard';
          } else {
            return 'medium';
          }
        };
        
        // Extract topic from user message (remove question count and difficulty modifiers)
        const extractTopic = (msg) => {
          let topic = msg.trim();
          
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
          
          console.log(`🎯 Extracted topic: "${topic}" from: "${msg}"`);
          return topic;
        };
        
        const questionCount = extractQuestionCount(message);
        const difficulty = extractDifficulty(message);
        const topic = extractTopic(message);
        
        console.log(`📈 Quiz parameters: topic="${topic}", difficulty="${difficulty}", questions=${questionCount}`);
        
        const result = await generateQuiz(topic, difficulty, questionCount);
        
        if (result && result.quiz_data) {
          // Create a proper quiz message with debugging
          const quizTimestamp = new Date().toISOString();
          console.log('🕗 Creating quiz message with timestamp:', {
            timestamp: quizTimestamp,
            localTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            utcTime: new Date().toUTCString()
          });
          
          const quizMessage = {
            role: 'assistant',
            content: result,
            type: 'quiz',
            timestamp: quizTimestamp
          };
          
          setMessages(prevMessages => [...prevMessages, quizMessage]);
          console.log('✅ Quiz generated successfully:', result);
          
          // Store quiz messages to backend database for persistence
          try {
            console.log('💾 Storing quiz messages to backend database...');
            await storeQuizMessage(newUserMessage, quizMessage);
            console.log('✅ Quiz messages successfully stored to backend database');
          } catch (storeError) {
            console.warn('⚠️ Failed to store quiz to backend database:', storeError);
          }
          
          // NO localStorage caching - quiz messages are stored directly in MongoDB
          console.log('📡 Quiz messages stored directly in MongoDB via storeQuizMessage API');
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
        type: wasLearningPath ? 'learning_path' : 'content',
        timestamp: new Date().toISOString()
      };
      
      // Update messages with temp AI message
      setMessages(prevMessages => [...prevMessages, tempAIMessage]);
      
      let accumulatedResponse = '';
      
        await askQuestion(
          message.trim(),
          (partialResponse) => {
            // Update the AI message with the accumulated response
            // For learning paths, the partialResponse will be the full API response object
            if (wasLearningPath && typeof partialResponse === 'object' && partialResponse.content) {
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
              let messageType = wasLearningPath ? 'learning_path' : 'content';
              
              // Additional runtime detection for learning path content
              if (!wasLearningPath && typeof accumulatedResponse === 'string') {
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
            
            // NO localStorage caching - messages are persisted to MongoDB via API calls
            console.log('📡 Completed messages will be persisted to MongoDB via API calls');
          },
          false, // Don't pass isQuiz to askQuestion since we handle it separately
          wasLearningPath
        );
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setIsGenerating(false);
      
      // Remove the temporary AI message
      setMessages(prevMessages => prevMessages.slice(0, -1));
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

    // Add user message to chat with proper timestamp
    const currentTimestamp = new Date().toISOString();
    console.log('🕐 Creating user message with timestamp:', {
      timestamp: currentTimestamp,
      localTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      utcTime: new Date().toUTCString()
    });
    
    const newUserMessage = {
      role: 'user',
      content: messageToSend.trim(),
      type: 'content',
      timestamp: currentTimestamp
    };
    
    // Update messages with user message
    const updatedMessagesWithUser = [...messages, newUserMessage];
    setMessages(updatedMessagesWithUser);
    
    // NO localStorage caching - user message will be persisted to MongoDB via API calls
    console.log('📡 User message added - will be persisted to MongoDB via API calls');
    
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
          // Create a proper quiz message with debugging
          const quizTimestamp = new Date().toISOString();
          console.log('🕐 Creating quiz message with timestamp:', {
            timestamp: quizTimestamp,
            localTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            utcTime: new Date().toUTCString()
          });
          
          const quizMessage = {
            role: 'assistant',
            content: result,
            type: 'quiz',
            timestamp: quizTimestamp
          };
          
          setMessages(prevMessages => [...prevMessages, quizMessage]);
          console.log('✅ Quiz generated successfully:', result);
          
          // IMPORTANT: Store quiz messages to backend database for persistence
          try {
            console.log('💾 Storing quiz messages to backend database...');
            await storeQuizMessage(newUserMessage, quizMessage);
            console.log('✅ Quiz messages successfully stored to backend database');
          } catch (storeError) {
            console.warn('⚠️ Failed to store quiz to backend database:', storeError);
            // Don't throw error as quiz is already generated and shown to user
          }
          
          // NO localStorage caching - quiz messages are stored directly in MongoDB
          console.log('📡 Quiz messages stored directly in MongoDB via storeQuizMessage API');
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
            
            // NO localStorage caching - messages are persisted to MongoDB via API calls
            console.log('📡 Completed messages will be persisted to MongoDB via API calls');
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
      
      // NO localStorage cache to clear - data is managed directly in MongoDB
      console.log('📡 Chat cleared directly from MongoDB Atlas database');
    } catch (err) {
      console.error('Error clearing chat:', err);
      setError('Failed to clear chat history. Please try again.');
    }
  };

  const handleToggleLearningPath = () => {
    // Toggle learning path mode - if already active, deactivate; otherwise activate
    setActiveMode(prev => {
      const newMode = prev === 'learning_path' ? 'none' : 'learning_path';
      debugLogger.stateChange('AIChat', { activeMode: prev }, { activeMode: newMode });
      return newMode;
    });
  };

  const handleToggleQuiz = () => {
    // Toggle quiz mode - if already active, deactivate; otherwise activate
    setActiveMode(prev => {
      const newMode = prev === 'quiz' ? 'none' : 'quiz';
      debugLogger.stateChange('AIChat', { activeMode: prev }, { activeMode: newMode });
      return newMode;
    });
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


  debugLogger.uiRender('AIChat', { activeMode, isGenerating, messagesCount: messages.length });
  
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
                          message={message} 
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
        message="Are you sure you want to clear the chat history? This will remove regular chat messages but preserve your learning paths and quizzes. This action cannot be undone."
        confirmText="Clear Chat"
      />
    </div>
  );
};

export default AIChat;