import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import './UserMessage.scss';

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

export default UserMessage;