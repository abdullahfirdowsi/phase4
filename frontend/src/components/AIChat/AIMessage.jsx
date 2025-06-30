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

  // Enhanced quiz detection - check message type and content structure
  const isQuizContent = (content) => {
    try {
      // If content is already an object with quiz structure
      if (typeof content === 'object' && content !== null) {
        return (content.type === 'quiz' || 
                content.quiz_data || 
                (content.questions && Array.isArray(content.questions)) ||
                // Also check if it has typical quiz properties
                (content.quiz_id && content.topic && content.questions) ||
                // Check for nested quiz structure
                (content.response && content.quiz_data));
      }
      
      // If content is a string, check if it contains quiz-like JSON
      if (typeof content === 'string') {
        const contentStr = content.toLowerCase();
        return (contentStr.includes('"quiz_data"') || 
                contentStr.includes('quiz_data') ||
                (contentStr.includes('"questions"') && contentStr.includes('"correct_answer"')) ||
                (contentStr.includes('"quiz_id"') && contentStr.includes('"topic"')) ||
                (contentStr.includes('"question_number"') && contentStr.includes('"options"')) ||
                (contentStr.includes('"time_limit"') && contentStr.includes('"difficulty"')));
      }
      
      return false;
    } catch (error) {
      console.warn('Error in quiz content detection:', error);
      return false;
    }
  };

  // Enhanced quiz detection and logging
  const shouldRenderAsQuiz = type === 'quiz' || isQuizContent(content);
  
  // Enhanced debug logging for quiz detection
  if (typeof content === 'string' && (content.includes('quiz') || content.includes('Quiz'))) {
    console.log('🔍 AIMessage Quiz Debug (string content):', {
      messageType: type,
      contentType: typeof content,
      isQuizContent: isQuizContent(content),
      shouldRenderAsQuiz,
      contentPreview: content.substring(0, 300) + '...',
      hasQuizData: content.includes('quiz_data'),
      hasQuestions: content.includes('questions'),
      hasCorrectAnswer: content.includes('correct_answer')
    });
  } else if (typeof content === 'object' && content !== null) {
    const hasQuizProps = content.type === 'quiz' || content.quiz_data || (content.questions && Array.isArray(content.questions));
    if (hasQuizProps) {
      console.log('🔍 AIMessage Quiz Debug (object content):', {
        messageType: type,
        contentType: typeof content,
        isQuizContent: isQuizContent(content),
        shouldRenderAsQuiz,
        contentKeys: Object.keys(content),
        hasType: !!content.type,
        hasQuizData: !!content.quiz_data,
        hasQuestions: !!content.questions,
        typeValue: content.type
      });
    }
  }
  
  // If this is a quiz message, render with QuizMessage component
  if (shouldRenderAsQuiz) {
    console.log('✅ Rendering as quiz component');
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
