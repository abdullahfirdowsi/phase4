import React, { useState, useEffect } from "react";
import { Tab, Tabs, Button, Form, Modal, Alert, Spinner, Container, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { login, signup } from "../../api";
import "./Welcome.scss";
import { FaUserGraduate, FaRocket, FaChartLine, FaBrain, FaGraduationCap, FaLightbulb, FaPlay, FaCheck } from "react-icons/fa";
import GoogleLoginButton from "../../components/GoogleLoginButton/GoogleLoginButton";
import PasswordSetupModal from "../../components/PasswordSetupModal/PasswordSetupModal";

const Welcome = () => {
  const [showModal, setShowModal] = useState(false);
  const [showPasswordSetupModal, setShowPasswordSetupModal] = useState(false);
  const [passwordSetupUsername, setPasswordSetupUsername] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState("");
  const navigate = useNavigate();

  const clearForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setError(null);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and Password are required!");
      return;
    }
    setLoading(true);
    try {
      const data = await login(email, password);
      localStorage.setItem("username", email);
      
      // If there's an initial question, store it in sessionStorage
      if (initialQuestion.trim()) {
        sessionStorage.setItem("initialQuestion", initialQuestion.trim());
        navigate("/dashboard/chat");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      // Check if this is a Google OAuth user who needs to set a password
      if (err.code === "PASSWORD_SETUP_REQUIRED") {
        setPasswordSetupUsername(email);
        setShowPasswordSetupModal(true);
        setShowModal(false); // Close the login modal
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle successful password setup
  const handlePasswordSetupSuccess = () => {
    setShowPasswordSetupModal(false);
    setError("Password setup successful! Please try logging in again with your new password.");
    setShowModal(true); // Show login modal again
    setPassword(""); // Clear the password field
  };


  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError("All fields are required!");
      return;
    }
    setLoading(true);
    try {
      const data = await signup(name, email, password);
      setActiveTab("login");
      clearForm();
      setError(null);
      
      setTimeout(() => {
        setError("Account created successfully! Please sign in.");
      }, 100);
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginSuccess = (data) => {
    // If there's an initial question, store it in sessionStorage
    if (initialQuestion.trim()) {
      sessionStorage.setItem("initialQuestion", initialQuestion.trim());
      navigate("/dashboard/chat");
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoogleLoginError = (errorMessage) => {
    setError(errorMessage || "Google login failed. Please try again.");
  };

  const handleAuthModalOpen = () => {
    setShowModal(true);
    clearForm();
  };

  const handleQuickStart = (question) => {
    setInitialQuestion(question);
    handleAuthModalOpen();
  };

  useEffect(() => {
    const authTriggers = document.querySelectorAll('.auth-modal-trigger');
    authTriggers.forEach(trigger => {
      trigger.addEventListener('click', handleAuthModalOpen);
    });

    return () => {
      authTriggers.forEach(trigger => {
        trigger.removeEventListener('click', handleAuthModalOpen);
      });
    };
  }, []);

  const features = [
    {
      icon: <FaBrain />,
      title: "AI-Powered Learning",
      description: "Get personalized help and explanations from our AI tutor."
    },
    {
      icon: <FaRocket />,
      title: "Instant Support",
      description: "Ask questions anytime and get immediate responses."
    },
    {
      icon: <FaGraduationCap />,
      title: "Custom Learning Paths",
      description: "Create study plans tailored to your specific goals."
    }
  ];

  const benefits = [
    "AI-powered tutoring",
    "24/7 availability",
    "Personalized learning"
  ];

  return (
    <div className="optimized-welcome">
      {/* Enhanced Hero Section */}
      <section className="enhanced-hero">
        <Container fluid>
          <Row className="align-items-center min-vh-100">
            <Col lg={6} className="hero-content">
              <div className="content-wrapper">
                <div className="hero-badge">
                  <FaBrain className="me-2" />
                  AI-Powered Learning Platform
                </div>
                
                <h1 className="hero-title">
                  Learn Smarter with 
                  <span className="brand-highlight">AI Tutor</span>
                </h1>
                
                <p className="hero-subtitle">
                  Get personalized help with any subject. Ask questions, create study plans, and learn at your own pace.
                </p>

                {/* Quick Start Input */}
                <div className="quick-start-input">
                  <Form.Group className="input-with-button">
                    <Form.Control
                      type="text"
                      placeholder="Ask me anything... (e.g., 'Help me learn Python programming')"
                      value={initialQuestion}
                      onChange={(e) => setInitialQuestion(e.target.value)}
                      className="hero-input"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && initialQuestion.trim()) {
                          handleQuickStart(initialQuestion.trim());
                        }
                      }}
                    />
                    <Button 
                      variant="primary"
                      className="input-button"
                      onClick={() => initialQuestion.trim() && handleQuickStart(initialQuestion.trim())}
                      disabled={!initialQuestion.trim()}
                    >
                      <FaPlay />
                    </Button>
                  </Form.Group>
                  <div className="quick-examples">
                    <span className="examples-label">Try asking:</span>
                    <button 
                      type="button" 
                      className="example-chip"
                      onClick={() => setInitialQuestion("Create a learning path for Python programming")}
                    >
                      Python programming
                    </button>
                    <button 
                      type="button" 
                      className="example-chip"
                      onClick={() => setInitialQuestion("Help me with math calculus")}
                    >
                      Math calculus
                    </button>
                    <button 
                      type="button" 
                      className="example-chip"
                      onClick={() => setInitialQuestion("Explain machine learning basics")}
                    >
                      Machine learning
                    </button>
                  </div>
                </div>

                <div className="benefits-list">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="benefit-item">
                      <FaCheck className="check-icon" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
                
                <div className="hero-actions">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="cta-button"
                    onClick={() => handleQuickStart("What can you help me learn?")}
                  >
                    <FaPlay className="me-2" />
                    Get Started
                  </Button>
                  <Button 
                    variant="outline-light" 
                    size="lg"
                    className="secondary-button"
                    onClick={() => setShowModal(true)}
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            </Col>
            
            <Col lg={6} className="hero-visual">
              <div className="hero-image-container">
                <div className="floating-elements">
                  <div className="floating-card card-1">
                    <FaBrain className="icon" />
                    <span>AI-Powered</span>
                  </div>
                  <div className="floating-card card-2">
                    <FaGraduationCap className="icon" />
                    <span>Personalized</span>
                  </div>
                  <div className="floating-card card-3">
                    <FaLightbulb className="icon" />
                    <span>Interactive</span>
                  </div>
                </div>
                <img
                  src="/icons/aitutor-short-no-bg.png"
                  alt="AI Learning"
                  className="hero-main-image"
                />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Enhanced Features Section */}
      <section className="enhanced-features" id="features">
        <Container>
          <Row>
            <Col lg={12} className="text-center section-header">
              <div className="section-badge">
                <FaRocket className="me-2" />
                Features
              </div>
              <h2 className="section-title">How AI Tutor Helps You</h2>
              <p className="section-subtitle">
                Simple, effective AI-powered learning tools
              </p>
            </Col>
          </Row>
          <Row className="features-grid">
            {features.map((feature, index) => (
              <Col lg={4} md={6} key={index} className="feature-col">
                <div className="enhanced-feature-card">
                  <div className="feature-icon">
                    {feature.icon}
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Enhanced CTA Section */}
      <section className="enhanced-cta">
        <Container>
          <Row>
            <Col lg={8} className="mx-auto text-center">
              <div className="cta-content">
                <h2 className="cta-title">Ready to Start Learning?</h2>
                <p className="cta-subtitle">
                  Begin your personalized learning journey with AI Tutor today
                </p>
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="final-cta-button"
                  onClick={() => handleQuickStart("What can you help me learn?")}
                >
                  <FaPlay className="me-2" />
                  Get Started
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Enhanced Authentication Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" className="auth-modal">
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="d-flex align-items-center">
            <img
              src="/icons/aitutor-short-no-bg.png"
              alt="AI Tutor"
              width="32"
              height="32"
              className="me-2"
            />
            {activeTab === "login" ? "Welcome Back to AI Tutor" : "Join AI Tutor Today"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {error && (
            <Alert variant={error.includes("successfully") ? "success" : "danger"} className="mb-3">
              {error}
            </Alert>
          )}
          
          {initialQuestion && (
            <Alert variant="info" className="mb-3">
              <strong>Ready to get started with:</strong> "{initialQuestion}"
            </Alert>
          )}
          
          <Tabs 
            activeKey={activeTab} 
            onSelect={(k) => { setActiveTab(k); clearForm(); }} 
            className="mb-4 enhanced-tabs"
          >
            <Tab eventKey="login" title="Sign In">
              <div className="auth-form">
                <GoogleLoginButton 
                  onSuccess={handleGoogleLoginSuccess}
                  onError={handleGoogleLoginError}
                />
                
                <div className="separator">
                  <span>or sign in with email</span>
                </div>
                
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="enhanced-input"
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="enhanced-input"
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    className="w-100 mb-3 enhanced-button"
                    onClick={handleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <FaPlay className="me-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </Form>
              </div>
            </Tab>

            <Tab eventKey="signup" title="Sign Up">
              <div className="auth-form">
                <GoogleLoginButton 
                  onSuccess={handleGoogleLoginSuccess}
                  onError={handleGoogleLoginError}
                  buttonText="Sign up with Google"
                />
                
                <div className="separator">
                  <span>or sign up with email</span>
                </div>
                
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="enhanced-input"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="enhanced-input"
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="enhanced-input"
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    className="w-100 mb-3 enhanced-button"
                    onClick={handleSignup}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <FaRocket className="me-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </Form>
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>
      </Modal>

      {/* Password Setup Modal for Google OAuth Users */}
      <PasswordSetupModal
        show={showPasswordSetupModal}
        onHide={() => setShowPasswordSetupModal(false)}
        username={passwordSetupUsername}
        onSuccess={handlePasswordSetupSuccess}
      />
    </div>
  );
};

export default Welcome;
