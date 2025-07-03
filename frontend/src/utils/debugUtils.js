// Debug utility to help track state changes and UI inconsistencies

export const debugLogger = {
  enabled: process.env.NODE_ENV === 'development',
  
  log: (category, message, data = null) => {
    if (!debugLogger.enabled) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${category}]`;
    
    if (data) {
      console.group(`🔍 ${prefix} ${message}`);
      console.log('Data:', data);
      console.groupEnd();
    } else {
      console.log(`🔍 ${prefix} ${message}`);
    }
  },
  
  stateChange: (component, oldState, newState) => {
    if (!debugLogger.enabled) return;
    
    const timestamp = new Date().toLocaleTimeString();
    console.group(`🔄 [${timestamp}] [${component}] State Change`);
    console.log('Old State:', oldState);
    console.log('New State:', newState);
    console.log('Changes:', getStateChanges(oldState, newState));
    console.groupEnd();
  },
  
  storageOperation: (operation, key, value = null) => {
    if (!debugLogger.enabled) return;
    
    const timestamp = new Date().toLocaleTimeString();
    console.log(`💾 [${timestamp}] [Storage] ${operation}: ${key}`, value ? { value } : '');
  },
  
  uiRender: (component, props = null) => {
    if (!debugLogger.enabled) return;
    
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎨 [${timestamp}] [Render] ${component}`, props ? { props } : '');
  },
  
  error: (category, error, context = null) => {
    const timestamp = new Date().toLocaleTimeString();
    console.group(`❌ [${timestamp}] [${category}] Error`);
    console.error('Error:', error);
    if (context) console.log('Context:', context);
    console.groupEnd();
  }
};

// Helper function to identify state changes
function getStateChanges(oldState, newState) {
  if (!oldState || !newState) return { added: newState, removed: oldState };
  
  const changes = {};
  
  // Check for changed/added properties
  Object.keys(newState).forEach(key => {
    if (oldState[key] !== newState[key]) {
      changes[key] = {
        old: oldState[key],
        new: newState[key]
      };
    }
  });
  
  // Check for removed properties
  Object.keys(oldState).forEach(key => {
    if (!(key in newState)) {
      changes[key] = {
        old: oldState[key],
        new: undefined,
        removed: true
      };
    }
  });
  
  return changes;
}

// State validation utility
export const validateState = {
  chatMessage: (message) => {
    const errors = [];
    
    if (!message) {
      errors.push('Message is null or undefined');
      return errors;
    }
    
    if (!message.role || !['user', 'assistant'].includes(message.role)) {
      errors.push(`Invalid role: ${message.role}`);
    }
    
    if (message.content === undefined || message.content === null) {
      errors.push('Message content is missing');
    }
    
    if (!message.timestamp) {
      errors.push('Message timestamp is missing');
    } else {
      const date = new Date(message.timestamp);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid timestamp: ${message.timestamp}`);
      }
    }
    
    if (message.type && !['content', 'learning_path', 'quiz', 'streaming'].includes(message.type)) {
      errors.push(`Invalid message type: ${message.type}`);
    }
    
    return errors;
  },
  
  chatHistory: (messages) => {
    if (!Array.isArray(messages)) {
      return ['Chat history is not an array'];
    }
    
    const allErrors = [];
    messages.forEach((message, index) => {
      const errors = validateState.chatMessage(message);
      if (errors.length > 0) {
        allErrors.push(`Message ${index}: ${errors.join(', ')}`);
      }
    });
    
    return allErrors;
  }
};

// Performance monitoring
export const performanceMonitor = {
  marks: new Map(),
  
  start: (label) => {
    if (!debugLogger.enabled) return;
    
    const timestamp = performance.now();
    performanceMonitor.marks.set(label, timestamp);
    console.log(`⏱️ [Performance] Started: ${label}`);
  },
  
  end: (label) => {
    if (!debugLogger.enabled) return;
    
    const startTime = performanceMonitor.marks.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`⏱️ [Performance] ${label}: ${duration.toFixed(2)}ms`);
      performanceMonitor.marks.delete(label);
      return duration;
    } else {
      console.warn(`⏱️ [Performance] No start mark found for: ${label}`);
      return null;
    }
  }
};

export default debugLogger;
