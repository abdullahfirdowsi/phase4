import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Robot, StarFill } from 'react-bootstrap-icons';
import { formatRelativeTime } from '../../utils/dateUtils';
import QuizMessage from './QuizMessage';
import './AIMessage.scss';

const AIMessage = memo(({ message }) => {
  const { content, timestamp, type } = message;
  const timeAgo = formatRelativeTime(timestamp);

  if (!content) {
    return null;
  }

  // Simplified quiz detection - check message type and content structure
  const isQuizContent = (content) => {
    try {
      // If content is already an object with quiz structure
      if (typeof content === 'object' && content !== null) {
        return (content.type === 'quiz' || 
                content.quiz_data || 
                (content.questions && Array.isArray(content.questions)));
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  // If this is a quiz message, render with QuizMessage component
  if (type === 'quiz' || isQuizContent(content)) {
    return (
      <div className="ai-message-container">
        <div className="ai-avatar">
          <Robot size={20} />
          <div className="ai-indicator">
            <StarFill size={12} />
          </div>
        </div>
        
        <div className="ai-message-card quiz-message-card">
          <div className="ai-header">
            <span className="ai-label">AI Tutor</span>
            {timeAgo && (
              <small className="message-time">{timeAgo}</small>
            )}
          </div>
          
          <QuizMessage 
            message={message} 
            username={localStorage.getItem('username')}
            onQuizComplete={(result) => {
              console.log('Quiz completed:', result);
              // You can add additional handling here
            }}
          />
        </div>
      </div>
    );
  }

  // Helper function to process content and detect if it should be displayed as JSON
  const processContent = (rawContent) => {
    if (typeof rawContent !== 'string') {
      return JSON.stringify(rawContent, null, 2);
    }

    // Check if content looks like JSON
    if (rawContent.trim().startsWith('{') && rawContent.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(rawContent);
        
        // For JSON objects, check if they have meaningful content to display
        if (parsed.content && typeof parsed.content === 'string') {
          return parsed.content;
        }
        
        // For other JSON, format it nicely
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        // If parsing fails, return original content
        return rawContent;
      }
    }

    return rawContent;
  };

  const processedContent = processContent(content);
  const isJsonContent = (
    processedContent !== content && 
    typeof content === 'string' && 
    content.trim().startsWith('{') &&
    !content.includes('topics') && // Don't show JSON formatting for learning paths
    !content.includes('course_duration') // Additional check
  );

  return (
    <div className="ai-message-container">
      <div className="ai-avatar">
        <Robot size={20} />
        <div className="ai-indicator">
          <StarFill size={12} />
        </div>
      </div>
      
      <div className="ai-message-card">
        <div className="ai-header">
          <span className="ai-label">AI Tutor</span>
          {timeAgo && (
            <small className="message-time">{timeAgo}</small>
          )}
        </div>
        
        <div className="message-content">
          {isJsonContent ? (
            <pre className="json-content" style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '12px',
              fontSize: '0.875rem',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {processedContent}
            </pre>
          ) : (
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
              {processedContent}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
});

export default AIMessage;
