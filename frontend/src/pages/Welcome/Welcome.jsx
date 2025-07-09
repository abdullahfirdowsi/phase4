import React, { useState, useEffect } from "react";
import { Tab, Tabs, Button, Form, Modal, Alert, Spinner, Container, Row, Col, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { login, signup } from "../../api";
import "./Welcome.scss";
import { FaBrain, FaRocket, FaGraduationCap, FaPlay, FaCheck, FaCode, FaBook, FaCalculator, FaLightbulb, FaChartLine, FaUsers, FaStar, FaArrowRight } from "react-icons/fa";
import GoogleLoginButton from "../../components/GoogleLoginButton/GoogleLoginButton";
import PasswordSetupModal from "../../components/PasswordSetupModal/PasswordSetupModal";

const Welcome = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [googleUserData, setGoogleUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleQuickStart = (query) => {
    localStorage.setItem("initialQuestion", query);
    navigate("/dashboard");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (activeTab === "login") {
        await login(formData.username, formData.password);
        navigate("/dashboard");
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        await signup(formData.username, formData.password, formData.name, formData.email);
        navigate("/dashboard");
      }
    } catch (error) {
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (userData) => {
    if (userData.needsPassword) {
      setGoogleUserData(userData);
      setShowPasswordModal(true);
    } else {
      navigate("/dashboard");
    }
  };

  const handleGoogleError = (error) => {
    setError(error.message || "Google authentication failed");
  };

  const handlePasswordSetup = async (password) => {
    try {
      await login(googleUserData.email, password);
      navigate("/dashboard");
    } catch (error) {
      setError(error.message || "Password setup failed");
    }
  };

  // Set up modal trigger for auth
  useEffect(() => {
    const authTriggers = document.querySelectorAll('.auth-modal-trigger');
    const handleAuthModalOpen = () => {
      setShowModal(true);
    };

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
      description: "Get personalized help and explanations from our advanced AI tutor.",
      color: "primary"
    },
    {
      icon: <FaRocket />,
      title: "Instant Support",
      description: "Ask questions anytime and get immediate, intelligent responses.",
      color: "success"
    },
    {
      icon: <FaGraduationCap />,
      title: "Custom Learning Paths",
      description: "Create personalized study plans tailored to your goals and pace.",
      color: "info"
    },
    {
      icon: <FaChartLine />,
      title: "Progress Tracking",
      description: "Monitor your learning journey with detailed analytics and insights.",
      color: "warning"
    }
  ];

  const quickStartExamples = [
    {
      icon: <FaCode />,
      title: "Programming",
      description: "Learn Python, JavaScript, and more",
      query: "Create a learning path for Python programming"
    },
    {
      icon: <FaCalculator />,
      title: "Mathematics",
      description: "Master calculus, algebra, and statistics",
      query: "Help me understand calculus concepts"
    },
    {
      icon: <FaBook />,
      title: "Science",
      description: "Explore physics, chemistry, and biology",
      query: "Explain quantum physics basics"
    },
    {
      icon: <FaLightbulb />,
      title: "Study Skills",
      description: "Improve your learning techniques",
      query: "What are effective study techniques?"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Computer Science Student",
      content: "AI Tutor helped me understand complex algorithms in ways my textbooks never could. The personalized explanations are incredible!",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "High School Student",
      content: "Getting help with calculus at 2 AM? No problem! AI Tutor is always there when I need it most.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Medical Student",
      content: "The custom study plans helped me organize my learning and stay on track. It's like having a personal tutor 24/7.",
      rating: 5
    }
  ];

  return (
    <div className="welcome-page">
      {/* Hero Section */}
      <section className="hero-section">
        <Container>
          <Row className="align-items-center min-vh-100">
            <Col lg={6} className="hero-content">
              <div className="brand-section">
                <div className="brand-logo">
                  <img
                    src="/icons/aitutor-short-no-bg.png"
                    alt="AI Tutor"
                    className="logo-image"
                  />
                </div>
                <div className="brand-text">
                  <h1 className="brand-title">
                    <span className="ai-text">AI</span>
                    <span className="tutor-text">Tutor</span>
                  </h1>
                  <p className="brand-subtitle">powered by VizTalk AI</p>
                </div>
              </div>

              <div className="hero-message">
                <h2 className="hero-title">
                  Transform Your Learning with AI
                </h2>
                <p className="hero-description">
                  Experience personalized education powered by artificial intelligence. 
                  Get instant help, create custom study plans, and achieve your learning goals faster.
                </p>
              </div>

              <div className="hero-actions">
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="primary-cta"
                  onClick={() => handleQuickStart("What can you help me learn?")}
                >
                  <FaPlay className="me-2" />
                  Start Learning Now
                </Button>
                <Button 
                  variant="outline-primary" 
                  size="lg" 
                  className="secondary-cta"
                  onClick={() => setShowModal(true)}
                >
                  <FaUsers className="me-2" />
                  Sign In
                </Button>
              </div>
            </Col>
            
            <Col lg={6} className="hero-visual">
              <div className="quick-start-grid">
                <h3 className="quick-start-title">What can AI Tutor help you with?</h3>
                <div className="example-cards">
                  {quickStartExamples.map((example, index) => (
                    <div
                      key={index}
                      className="example-card"
                      onClick={() => handleQuickStart(example.query)}
                    >
                      <div className="example-icon">{example.icon}</div>
                      <h4 className="example-title">{example.title}</h4>
                      <p className="example-description">{example.description}</p>
                      <div className="example-arrow">
                        <FaArrowRight />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <Container>
          <Row>
            <Col lg={12} className="text-center">
              <div className="section-header">
                <h2 className="section-title">Why Choose AI Tutor?</h2>
                <p className="section-subtitle">
                  Experience the future of personalized learning with our advanced AI technology
                </p>
              </div>
            </Col>
          </Row>
          <Row className="g-4">
            {features.map((feature, index) => (
              <Col lg={3} md={6} key={index}>
                <Card className="feature-card h-100">
                  <Card.Body className="text-center">
                    <div className={`feature-icon ${feature.color}`}>
                      {feature.icon}
                    </div>
                    <h5 className="feature-title">{feature.title}</h5>
                    <p className="feature-description">{feature.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <Container>
          <Row>
            <Col lg={12} className="text-center">
              <div className="section-header">
                <h2 className="section-title">What Students Say</h2>
                <p className="section-subtitle">
                  Join thousands of learners who are already succeeding with AI Tutor
                </p>
              </div>
            </Col>
          </Row>
          <Row className="g-4">
            {testimonials.map((testimonial, index) => (
              <Col lg={4} md={6} key={index}>
                <Card className="testimonial-card h-100">
                  <Card.Body>
                    <div className="testimonial-rating">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <FaStar key={i} className="star-icon" />
                      ))}
                    </div>
                    <p className="testimonial-content">"{testimonial.content}"</p>
                    <div className="testimonial-author">
                      <strong>{testimonial.name}</strong>
                      <span className="author-role">{testimonial.role}</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <Container>
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <div className="cta-content">
                <h2 className="cta-title">Ready to Transform Your Learning?</h2>
                <p className="cta-subtitle">
                  Join thousands of students who are already learning smarter with AI Tutor
                </p>
                <div className="cta-buttons">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="primary-cta"
                    onClick={() => handleQuickStart("What can you help me learn?")}
                  >
                    <FaPlay className="me-2" />
                    Get Started Free
                  </Button>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Authentication Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" className="auth-modal">
        <Modal.Header closeButton className="auth-modal-header">
          <Modal.Title className="d-flex align-items-center">
            <img
              src="/icons/aitutor-short-no-bg.png"
              alt="AI Tutor"
              width="32"
              height="32"
              className="me-2"
            />
            Welcome to AI Tutor
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="auth-modal-body">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="enhanced-tabs"
          >
            <Tab eventKey="login" title="Sign In" className="auth-tab">
              <Form onSubmit={handleSubmit} className="auth-form">
                <Form.Group className="mb-3">
                  <Form.Label>Username or Email</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter your username or email"
                    required
                    className="enhanced-input"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                    className="enhanced-input"
                  />
                </Form.Group>
                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 enhanced-button"
                  disabled={loading}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : "Sign In"}
                </Button>
              </Form>
            </Tab>
            <Tab eventKey="signup" title="Sign Up" className="auth-tab">
              <Form onSubmit={handleSubmit} className="auth-form">
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                    className="enhanced-input"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                    className="enhanced-input"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Choose a username"
                    required
                    className="enhanced-input"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
                    required
                    className="enhanced-input"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    required
                    className="enhanced-input"
                  />
                </Form.Group>
                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 enhanced-button"
                  disabled={loading}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : "Sign Up"}
                </Button>
              </Form>
            </Tab>
          </Tabs>

          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}

          <div className="separator">
            <span>or</span>
          </div>

          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
        </Modal.Body>
      </Modal>

      {/* Password Setup Modal */}
      <PasswordSetupModal
        show={showPasswordModal}
        onHide={() => setShowPasswordModal(false)}
        onPasswordSetup={handlePasswordSetup}
        userData={googleUserData}
      />
    </div>
  );
};

export default Welcome;
