import React, { memo } from 'react';
import { formatRelativeTime } from '../../utils/dateUtils';
import './UserMessage.scss';

const UserMessage = memo(({ message }) => {
  const { content, timestamp } = message;
  const timeAgo = formatRelativeTime(timestamp);

  return (
    <div className="user-message-container">
      <div className="user-message-bubble">
        <div className="message-content">{content}</div>
        {timeAgo && (
          <div className="message-time" title={`Created: ${new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`}>
            {timeAgo}
          </div>
        )}
      </div>
    </div>
  );
});

export default UserMessage;
