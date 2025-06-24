import React, { useState } from 'react';
import { Card, Form, Button, InputGroup } from 'react-bootstrap';
import { X, Send, ChatSquare } from 'react-bootstrap-icons';
import './ChatWidget.scss';

const ChatWidget = ({ onClose }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your AI tutor. How can I help you today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setMessage('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        text: "I understand you need help with that. Let me assist you!",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="chat-widget">
      <Card.Header className="chat-widget-header">
        <div className="d-flex align-items-center">
          <ChatSquare size={20} className="me-2" />
          <span className="fw-semibold">AI Tutor</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="close-btn">
          <X size={18} />
        </Button>
      </Card.Header>
      
      <Card.Body className="chat-widget-body">
        <div className="messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              <div className="message-bubble">
                {msg.text}
              </div>
              <div className="message-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </Card.Body>
      
      <Card.Footer className="chat-widget-footer">
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Ask me anything..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="message-input"
          />
          <Button variant="primary" onClick={handleSendMessage} className="send-btn">
            <Send size={16} />
          </Button>
        </InputGroup>
      </Card.Footer>
    </Card>
  );
};

export default ChatWidget;