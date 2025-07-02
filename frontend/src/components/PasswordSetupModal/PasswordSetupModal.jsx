import React, { useState } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaGoogle, FaLock, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import { setupPasswordForGoogleUser } from '../../api';

const PasswordSetupModal = ({ show, onHide, username, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');

  const validatePassword = (pwd) => {
    if (pwd.length < 6) {
      return { strength: 'weak', message: 'Password must be at least 6 characters long' };
    }
    if (pwd.length < 8) {
      return { strength: 'fair', message: 'Password is fair - consider making it longer' };
    }
    if (pwd.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)) {
      return { strength: 'strong', message: 'Strong password!' };
    }
    if (pwd.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
      return { strength: 'good', message: 'Good password - consider adding special characters' };
    }
    return { strength: 'fair', message: 'Fair password - consider adding uppercase, numbers, or special characters' };
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    if (newPassword) {
      const validation = validatePassword(newPassword);
      setPasswordStrength(validation);
    } else {
      setPasswordStrength('');
    }
  };

  const handleSetupPassword = async () => {
    setError('');
    
    // Validation
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await setupPasswordForGoogleUser(username, password);
      
      if (response.success) {
        // Success - call the onSuccess callback
        onSuccess();
      } else {
        setError(response.message || 'Failed to setup password');
      }
    } catch (error) {
      setError(error.message || 'Failed to setup password');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (strength) => {
    switch (strength?.strength) {
      case 'weak': return 'danger';
      case 'fair': return 'warning';
      case 'good': return 'info';
      case 'strong': return 'success';
      default: return 'secondary';
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setPasswordStrength('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="md" backdrop="static">
      <Modal.Header className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center w-100">
          <div className="d-flex align-items-center">
            <FaGoogle className="text-danger me-2" />
            <span>Setup Password for Manual Login</span>
          </div>
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="pt-2">
        <Alert variant="info" className="mb-4">
          <div className="d-flex align-items-start">
            <FaLock className="me-2 mt-1" />
            <div>
              <strong>You're logged in with Google OAuth!</strong>
              <p className="mb-0 mt-1">
                To also login with email/password, please set up a password for your account.
                This will allow you to login using both methods.
              </p>
            </div>
          </div>
        </Alert>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Email Account</Form.Label>
            <Form.Control
              type="email"
              value={username}
              disabled
              className="bg-light"
            />
            <Form.Text className="text-muted">
              Setting up password for this Google account
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>New Password</Form.Label>
            <div className="position-relative">
              <Form.Control
                type={showPassword ? "text" : "password"}
                placeholder="Enter your new password"
                value={password}
                onChange={handlePasswordChange}
                className="pe-5"
              />
              <Button
                variant="link"
                className="position-absolute end-0 top-50 translate-middle-y border-0 text-muted"
                style={{ zIndex: 10 }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </Button>
            </div>
            {passwordStrength && (
              <div className="mt-1">
                <small className={`text-${getStrengthColor(passwordStrength)}`}>
                  <FaCheckCircle className="me-1" />
                  {passwordStrength.message}
                </small>
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Confirm Password</Form.Label>
            <div className="position-relative">
              <Form.Control
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pe-5"
              />
              <Button
                variant="link"
                className="position-absolute end-0 top-50 translate-middle-y border-0 text-muted"
                style={{ zIndex: 10 }}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </Button>
            </div>
          </Form.Group>

          <div className="d-grid gap-2">
            <Button
              variant="primary"
              onClick={handleSetupPassword}
              disabled={loading || !password || !confirmPassword}
              size="lg"
            >
              {loading ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Setting up password...
                </>
              ) : (
                <>
                  <FaLock className="me-2" />
                  Setup Password
                </>
              )}
            </Button>
            
            <Button
              variant="outline-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Skip for now
            </Button>
          </div>
        </Form>

        <div className="mt-3 p-3 bg-light rounded">
          <h6 className="mb-2">After setting up password, you can login with:</h6>
          <ul className="mb-0 small">
            <li><FaGoogle className="text-danger me-1" /> Google OAuth (continue as before)</li>
            <li><FaLock className="text-primary me-1" /> Email and password (new option)</li>
          </ul>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default PasswordSetupModal;
