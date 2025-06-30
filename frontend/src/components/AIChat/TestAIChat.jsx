import React, { useState, useEffect } from 'react';
import { Container, Alert, Button, Form } from 'react-bootstrap';

const TestAIChat = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [testUsername, setTestUsername] = useState('test@example.com');

  useEffect(() => {
    console.log('🧪 TestAIChat component mounted successfully');
  }, []);

  const testAPI = async (endpoint, method = 'GET') => {
    setLoading(true);
    setResult('');
    
    try {
      const url = `http://localhost:8000${endpoint}`;
      console.log(`Testing: ${method} ${url}`);
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      if (method === 'POST') {
        options.body = JSON.stringify({
          user_prompt: 'Hello, this is a test message',
          username: testUsername,
          isQuiz: false,
          isLearningPath: false
        });
      }
      
      const response = await fetch(url, options);
      const data = await response.text();
      
      setResult(`Status: ${response.status}\n\nResponse:\n${data}`);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testChatHistory = async () => {
    await testAPI(`/api/chat/history?username=${encodeURIComponent(testUsername)}&limit=10`);
  };

  const testHealthCheck = async () => {
    await testAPI('/health');
  };

  const testSendMessage = async () => {
    await testAPI('/chat/ask', 'POST');
  };

  const setAuthForTest = () => {
    localStorage.setItem('username', testUsername);
    localStorage.setItem('token', 'test-token');
    setResult('Authentication set for testing');
  };

  const clearAuth = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    setResult('Authentication cleared');
  };

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Container>
        <h2>AI Chat API Test</h2>
        
        <Form.Group className="mb-3">
          <Form.Label>Test Username:</Form.Label>
          <Form.Control 
            type="text" 
            value={testUsername} 
            onChange={(e) => setTestUsername(e.target.value)}
          />
        </Form.Group>
        
        <div className="mb-3">
          <Button onClick={setAuthForTest} className="me-2">Set Test Auth</Button>
          <Button onClick={clearAuth} variant="secondary" className="me-2">Clear Auth</Button>
        </div>
        
        <div className="mb-3">
          <Button onClick={testHealthCheck} disabled={loading} className="me-2">
            Test Health Check
          </Button>
          <Button onClick={testChatHistory} disabled={loading} className="me-2">
            Test Chat History
          </Button>
          <Button onClick={testSendMessage} disabled={loading} className="me-2">
            Test Send Message
          </Button>
        </div>
        
        {loading && <Alert variant="info">Testing...</Alert>}
        
        {result && (
          <Alert variant="secondary">
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{result}</pre>
          </Alert>
        )}
        
        <div className="mt-4">
          <h5>Current Authentication:</h5>
          <p><strong>Username:</strong> {localStorage.getItem('username') || 'Not set'}</p>
          <p><strong>Token:</strong> {localStorage.getItem('token') ? 'Set' : 'Not set'}</p>
        </div>
      </Container>
    </div>
  );
};

export default TestAIChat;
