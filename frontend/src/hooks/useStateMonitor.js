import { useEffect, useRef } from 'react';
import { debugLogger } from '../utils/debugUtils';

/**
 * Custom hook to monitor state changes and help debug inconsistencies
 * @param {string} componentName - Name of the component using this hook
 * @param {Object} state - State object to monitor
 * @param {Array} watchList - Array of state keys to specifically watch
 */
export const useStateMonitor = (componentName, state, watchList = []) => {
  const prevStateRef = useRef(state);
  const mountTimeRef = useRef(Date.now());
  
  useEffect(() => {
    const currentTime = Date.now();
    const timeSinceMount = currentTime - mountTimeRef.current;
    
    // Compare current state with previous state
    const prevState = prevStateRef.current;
    const changes = {};
    let hasChanges = false;
    
    // Check all state keys if no watchList is provided
    const keysToWatch = watchList.length > 0 ? watchList : Object.keys(state);
    
    keysToWatch.forEach(key => {
      if (state[key] !== prevState[key]) {
        changes[key] = {
          from: prevState[key],
          to: state[key],
          type: typeof state[key]
        };
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      debugLogger.stateChange(componentName, 
        { timeSinceMount, prevState: prevState }, 
        { timeSinceMount, currentState: state, changes }
      );
      
      // Check for potentially problematic state changes
      Object.keys(changes).forEach(key => {
        const change = changes[key];
        
        // Detect rapid state oscillation
        if (timeSinceMount < 1000 && typeof change.from === typeof change.to) {
          debugLogger.log('StateMonitor', 
            `⚠️ Rapid state change detected in ${componentName}.${key}`, 
            { change, timeSinceMount }
          );
        }
        
        // Detect unexpected type changes
        if (typeof change.from !== typeof change.to && change.from !== null && change.to !== null) {
          debugLogger.log('StateMonitor', 
            `⚠️ Type change detected in ${componentName}.${key}`, 
            { change }
          );
        }
        
        // Detect null/undefined issues
        if ((change.from !== null && change.to === null) || 
            (change.from !== undefined && change.to === undefined)) {
          debugLogger.log('StateMonitor', 
            `⚠️ Value became null/undefined in ${componentName}.${key}`, 
            { change }
          );
        }
      });
    }
    
    // Update the previous state reference
    prevStateRef.current = { ...state };
  }, [componentName, state, watchList]);
  
  // Return debugging utilities
  return {
    logCurrentState: () => {
      debugLogger.log('StateMonitor', `Current state of ${componentName}`, state);
    },
    
    validateState: (validator) => {
      if (typeof validator === 'function') {
        try {
          const isValid = validator(state);
          if (!isValid) {
            debugLogger.error('StateMonitor', 
              `State validation failed for ${componentName}`, 
              { state }
            );
          }
          return isValid;
        } catch (error) {
          debugLogger.error('StateMonitor', 
            `State validator threw error for ${componentName}`, 
            { error, state }
          );
          return false;
        }
      }
      return true;
    },
    
    getTimeSinceMount: () => Date.now() - mountTimeRef.current
  };
};

/**
 * Hook to monitor specific values and detect inconsistencies
 * @param {string} componentName - Name of the component
 * @param {*} value - Value to monitor
 * @param {string} valueName - Name of the value being monitored
 */
export const useValueMonitor = (componentName, value, valueName) => {
  const prevValueRef = useRef(value);
  const changeCountRef = useRef(0);
  const lastChangeTimeRef = useRef(Date.now());
  
  useEffect(() => {
    const currentTime = Date.now();
    const timeSinceLastChange = currentTime - lastChangeTimeRef.current;
    
    if (value !== prevValueRef.current) {
      changeCountRef.current += 1;
      lastChangeTimeRef.current = currentTime;
      
      debugLogger.log('ValueMonitor', 
        `${componentName}.${valueName} changed`, 
        { 
          from: prevValueRef.current, 
          to: value, 
          changeCount: changeCountRef.current,
          timeSinceLastChange
        }
      );
      
      // Detect rapid changes (potential infinite loops)
      if (timeSinceLastChange < 100 && changeCountRef.current > 5) {
        debugLogger.error('ValueMonitor', 
          `⚠️ Rapid value changes detected in ${componentName}.${valueName}`, 
          { 
            changeCount: changeCountRef.current, 
            timeSinceLastChange,
            currentValue: value 
          }
        );
      }
      
      prevValueRef.current = value;
    }
  }, [componentName, value, valueName]);
  
  return {
    getChangeCount: () => changeCountRef.current,
    getTimeSinceLastChange: () => Date.now() - lastChangeTimeRef.current
  };
};

export default useStateMonitor;
