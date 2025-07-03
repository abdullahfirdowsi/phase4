import React from 'react';
import { Alert, Container, Button } from 'react-bootstrap';
import { debugLogger } from '../utils/debugUtils';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    debugLogger.error('ErrorBoundary', error, { errorInfo, props: this.props });
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Try to recover from common state issues
    this.attemptStateRecovery();
  }

  attemptStateRecovery = () => {
    try {
      // Clear potentially corrupted localStorage data
      const username = localStorage.getItem('username');
      if (username) {
        const chatKey = `chat_messages_${username}`;
        const corruptedData = localStorage.getItem(chatKey);
        
        if (corruptedData) {
          try {
            JSON.parse(corruptedData);
          } catch (e) {
            console.warn('🧹 Removing corrupted chat data');
            localStorage.removeItem(chatKey);
          }
        }
      }
      
      // Clear session storage that might cause issues
      sessionStorage.removeItem('initialQuestion');
      sessionStorage.removeItem('initialMode');
      
      debugLogger.log('Recovery', 'Attempted state recovery');
    } catch (recoveryError) {
      debugLogger.error('Recovery', recoveryError);
    }
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };
  
  handleClearData = () => {
    // Clear all potentially problematic data
    const username = localStorage.getItem('username');
    if (username) {
      localStorage.removeItem(`chat_messages_${username}`);
    }
    sessionStorage.clear();
    
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container className="mt-5">
          <Alert variant="danger">
            <Alert.Heading>Something went wrong!</Alert.Heading>
            <p>
              The component encountered an error and couldn't render properly. This might be due to corrupted data or a state inconsistency.
            </p>
            <hr />
            {this.state.error && (
              <details style={{ whiteSpace: 'pre-wrap' }}>
                <summary>Error Details (click to expand)</summary>
                <p><strong>Error:</strong> {this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <p><strong>Component Stack:</strong> {this.state.errorInfo.componentStack}</p>
                )}
              </details>
            )}
            <div className="mt-3">
              <Button variant="outline-danger" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button 
                variant="warning" 
                className="ms-2"
                onClick={this.handleClearData}
              >
                Clear Data & Restart
              </Button>
              <Button 
                variant="primary" 
                className="ms-2"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
