import React from 'react';
import { Alert, Card, Button } from 'react-bootstrap';
import { ShieldCheck, ChatDots, Signpost } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import './AdminOnlyNotice.scss';

const AdminOnlyNotice = ({ 
  feature = "lesson creation", 
  showAlternatives = true 
}) => {
  const navigate = useNavigate();

  return (
    <div className="admin-only-notice">
      <Card className="notice-card">
        <Card.Body className="text-center">
          <div className="notice-icon">
            <ShieldCheck size={64} className="text-warning" />
          </div>
          
          <h3 className="notice-title">Admin Access Required</h3>
          
          <Alert variant="info" className="notice-alert">
            <p className="mb-2">
              <strong>{feature}</strong> is restricted to administrators only.
            </p>
            <p className="mb-0">
              This helps maintain the quality and consistency of educational content on our platform.
            </p>
          </Alert>

          {showAlternatives && (
            <div className="alternatives-section">
              <h5>What you can do instead:</h5>
              
              <div className="alternative-actions">
                <Button 
                  variant="primary" 
                  className="alternative-btn"
                  onClick={() => navigate('/dashboard/chat')}
                >
                  <ChatDots size={16} className="me-2" />
                  Create Learning Paths with AI
                </Button>
                
                <Button 
                  variant="outline-primary" 
                  className="alternative-btn"
                  onClick={() => navigate('/dashboard/learning-paths')}
                >
                  <Signpost size={16} className="me-2" />
                  Explore Featured Content
                </Button>
              </div>
              
              <p className="alternatives-note">
                Use our AI chat to generate personalized learning paths, or explore featured lessons created by our expert instructors.
              </p>
            </div>
          )}
          
          <div className="contact-info">
            <small className="text-muted">
              Need to become an instructor? Contact our team for more information.
            </small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminOnlyNotice;
