import React, { useState, useRef } from "react";
import { Button } from "react-bootstrap";
import { FaPaperPlane, FaStop } from "react-icons/fa";
import { askQuestion } from "../../../api";
import { useDispatch, useSelector } from "react-redux";
import { setChatHistory, setIsGenerating, setIsLearningPathQuery, setStreamChat } from "../../../globalSlice";
import "./ChatInput.scss";

const ChatInput = ({ refreshChat }) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);
  const chatHistory = useSelector((state) => state.global.chatHistory);
  const isGenerating = useSelector((state) => state.global.isGenerating);
  const dispatch = useDispatch();
  const isLearningPathQuery = useSelector((state) => state.global.isLearningPathQuery);
  const isQuizQuery = useSelector((state) => state.global.isQuizQuery);

  const handleSendMessage = async () => {
    if (!message.trim() || isGenerating) return;

    const userMessage = message.trim();
    setMessage(""); // Clear input immediately
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: userMessage, type: "content", isLearningPathQuery },
      { role: "assistant", content: "", type: "streaming" }
    ];
    
    dispatch(setChatHistory(updatedHistory));
    dispatch(setIsGenerating(true));
    
    try {
      await askQuestion(
        userMessage,
        (partialResponse) => {
          dispatch(setStreamChat(partialResponse));
        },
        () => {
          refreshChat(); 
          dispatch(setIsGenerating(false));
          dispatch(setIsLearningPathQuery(false));
        },
        isQuizQuery, 
        isLearningPathQuery
      );
    } catch (error) {
      console.error("Error sending message:", error);
      dispatch(setIsGenerating(false));
    }
  };
  
  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  const handleStopGeneration = () => {
    dispatch(setIsGenerating(false));
  };

  return (
    <div className="chatgpt-input-container">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          placeholder={
            isLearningPathQuery 
              ? "Tell me what you want to learn and I'll create a personalized study plan..." 
              : isQuizQuery
              ? "Ask me to create a quiz on any topic..."
              : "Message AI Tutor..."
          }
          className="chat-textarea"
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          disabled={isGenerating}
          rows={1}
        />
        
        <div className="input-actions">
          {isGenerating ? (
            <Button 
              variant="outline-secondary" 
              className="stop-btn"
              onClick={handleStopGeneration}
              size="sm"
            >
              <FaStop size={14} />
            </Button>
          ) : (
            <Button 
              variant="primary" 
              className={`send-btn ${!message.trim() ? 'disabled' : ''}`}
              onClick={handleSendMessage}
              disabled={!message.trim()}
              size="sm"
            >
              <FaPaperPlane size={14} />
            </Button>
          )}
        </div>
      </div>
      
      {isLearningPathQuery && (
        <div className="mode-indicator learning-path">
          📚 Learning Path Mode - I'll create a personalized study plan for you
        </div>
      )}
      
      {isQuizQuery && (
        <div className="mode-indicator quiz">
          📝 Quiz Mode - I'll create interactive quizzes to test your knowledge
        </div>
      )}
    </div>
  );
};

export default ChatInput;