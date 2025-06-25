import React, { useState, useEffect, useRef } from 'react';
import './AIChat.scss';
import UserMessage from './UserMessage';
import AIMessage from './AIMessage';
import SearchModal from './SearchModal';
import ConfirmModal from './ConfirmModal';
import AnalyticsModal from './AnalyticsModal';
import LearningPathDisplay from './LearningPathDisplay';
import { 
  fetchChatHistory, 
  askQuestion, 
  clearChat, 
  searchMessages, 
  getChatAnalytics, 
  saveLearningPath 
} from '../../api';

const AIChat = () => {
  console.log('AIChat component rendering...');
  
  // Basic state initialization with error handling
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal states
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  
  // Learning path state
  const [learningPath, setLearningPath] = useState(null);
  const [showLearningPath, setShowLearningPath] = useState(false);
  
  const messagesEndRef = useRef(null);
  
  // Error boundary function
  const handleError = (error, context) => {
    console.error(`Error in ${context}:`, error);
    setError(`Error in ${context}: ${error.message}`);
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  };

  // Load chat history
  useEffect(() => {
    console.log('Loading chat history...');
    const loadChatHistory = async () => {
      try {
        setIsLoading(true);
        const history = await fetchChatHistory();
        console.log('Chat history loaded:', history);
        setMessages(history || []);
      } catch (error) {
        handleError(error, 'loading chat history');
      } finally {
        setIsLoading(false);
      }
    };

    loadChatHistory();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setError(null);

    try {
      // Add user message
      const userMessage = {
        id: Date.now(),
        text: message,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      // Get AI response
      console.log('Sending message to AI:', message);
      const response = await askQuestion(message);
      console.log('AI response received:', response);

      // Add AI message
      const aiMessage = {
        id: Date.now() + 1,
        text: response.answer || 'Sorry, I could not process your request.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        learningPath: response.learningPath || null
      };

      setMessages(prev => [...prev, aiMessage]);

      // Handle learning path if present
      if (response.learningPath) {
        setLearningPath(response.learningPath);
        setShowLearningPath(true);
      }

    } catch (error) {
      handleError(error, 'sending message');
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, there was an error processing your request. Please try again.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle clear chat
  const handleClearChat = async () => {
    try {
      setIsLoading(true);
      await clearChat();
      setMessages([]);
      setLearningPath(null);
      setShowLearningPath(false);
      setIsConfirmModalOpen(false);
      console.log('Chat cleared successfully');
    } catch (error) {
      handleError(error, 'clearing chat');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = async (query) => {
    try {
      console.log('Searching for:', query);
      const results = await searchMessages(query);
      console.log('Search results:', results);
      return results || [];
    } catch (error) {
      handleError(error, 'searching messages');
      return [];
    }
  };

  // Handle analytics
  const handleGetAnalytics = async () => {
    try {
      console.log('Getting analytics...');
      const analytics = await getChatAnalytics();
      console.log('Analytics:', analytics);
      return analytics || {};
    } catch (error) {
      handleError(error, 'getting analytics');
      return {};
    }
  };

  // Handle save learning path
  const handleSaveLearningPath = async (path) => {
    try {
      console.log('Saving learning path:', path);
      await saveLearningPath(path);
      console.log('Learning path saved successfully');
    } catch (error) {
      handleError(error, 'saving learning path');
    }
  };

  console.log('AIChat render - messages:', messages.length, 'isLoading:', isLoading, 'error:', error);

  // Simple error display
  if (error) {
    return (
      <div className="ai-chat-error">
        <h3>AI Chat Error</h3>
        <p>{error}</p>
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    );
  }

  return (
    <div className="ai-chat">
      <div className="ai-chat-header">
        <h3>AI Chat Assistant</h3>
        <div className="ai-chat-actions">
          <button 
            className="btn-secondary"
            onClick={() => setIsSearchModalOpen(true)}
            disabled={isLoading}
          >
            Search
          </button>
          <button 
            className="btn-secondary"
            onClick={() => setIsAnalyticsModalOpen(true)}
            disabled={isLoading}
          >
            Analytics
          </button>
          <button 
            className="btn-danger"
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={isLoading}
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 && !isLoading && (
          <div className="ai-chat-welcome">
            <p>Welcome! Ask me anything about your data or analytics.</p>
          </div>
        )}
        
        {messages.map((message) => (
          message.sender === 'user' ? (
            <UserMessage key={message.id} message={message} />
          ) : (
            <AIMessage key={message.id} message={message} />
          )
        ))}
        
        {isLoading && (
          <div className="ai-chat-loading">
            <div className="loading-spinner"></div>
            <p>Thinking...</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {showLearningPath && learningPath && (
        <LearningPathDisplay
          learningPath={learningPath}
          onSave={handleSaveLearningPath}
          onClose={() => setShowLearningPath(false)}
        />
      )}

      <div className="ai-chat-input">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here..."
          disabled={isLoading}
          rows={3}
        />
        <button 
          onClick={handleSendMessage}
          disabled={isLoading || !inputMessage.trim()}
          className="btn-primary"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Modals */}
      {isSearchModalOpen && (
        <SearchModal
          onSearch={handleSearch}
          onClose={() => setIsSearchModalOpen(false)}
        />
      )}

      {isConfirmModalOpen && (
        <ConfirmModal
          message="Are you sure you want to clear all chat messages?"
          onConfirm={handleClearChat}
          onCancel={() => setIsConfirmModalOpen(false)}
        />
      )}

      {isAnalyticsModalOpen && (
        <AnalyticsModal
          onGetAnalytics={handleGetAnalytics}
          onClose={() => setIsAnalyticsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AIChat;
