import React from 'react';
import { formatRelativeTime } from '../../utils/dateUtils';
import './UserMessage.scss';

const UserMessage = ({ message }) => {
  const { content, timestamp } = message;
  const timeAgo = formatRelativeTime(timestamp);

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