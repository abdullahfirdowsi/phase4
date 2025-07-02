import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatDotsFill } from 'react-bootstrap-icons';
import './FloatingActionButton.scss';

const FloatingActionButton = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/dashboard/chat');
  };

  return (
    <button 
      className="floating-action-button" 
      onClick={handleClick}
      aria-label="Open AI Chat"
    >
      <ChatDotsFill size={24} />
    </button>
  );
};

export default FloatingActionButton;