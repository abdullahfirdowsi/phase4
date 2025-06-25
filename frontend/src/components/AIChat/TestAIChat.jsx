import React, { useState, useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap';

const TestAIChat = () => {
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🧪 TestAIChat component mounted successfully');
  }, []);

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Container>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>AI Chat Test Component</h2>
          <p>If you can see this, the component is rendering properly.</p>
          
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={() => console.log('Test button clicked')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Test Button
            </button>
          </div>

          {error && (
            <Alert variant="danger" style={{ marginTop: '20px' }}>
              {error}
            </Alert>
          )}
        </div>
      </Container>
    </div>
  );
};

export default TestAIChat;
