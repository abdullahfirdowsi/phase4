import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { Robot, StarFill } from "react-bootstrap-icons";
import LearningPath from "./LearningPath";
import "./AIMessage.scss";

const AIMessage = ({ content, type, timestamp }) => {
  const timeAgo = timestamp
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    : null;

  if (content == null) {
    return <></>;
  }

  if (type === "learning_path") {
    return <LearningPath content={content} />;
  }

  if (content) {
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
              <small className="message-time">
                {timeAgo}
                {type === "learning_path" && " (Learning Path)"}
              </small>
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
  }

  return <></>;
};

export default AIMessage;