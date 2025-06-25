import React from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { BookHalf, Award, Mortarboard } from "react-bootstrap-icons";
import "./DashboardHome.scss";

const DashboardHome = () => {
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <div className="clean-dashboard-home">
      <Container fluid>
        {/* Hero Section */}
        <section className="hero-section">
          <Row className="align-items-center">
            <Col lg={6} md={12}>
              <div className="hero-content">
                <h1 className="hero-title">Welcome to AI Tutor</h1>
                <p className="hero-subtitle">
                  Your personalized learning platform powered by artificial intelligence.
                  Master new skills with customized learning paths and interactive lessons.
                </p>
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="cta-button"
                  onClick={() => handleNavigate('/dashboard/learning-paths')}
                >
                  Start Learning
                </Button>
              </div>
            </Col>
            <Col lg={6} md={12} className="d-flex justify-content-center">
              <div className="hero-image">
                <img 
                  src="/icons/aitutor-short-no-bg.png" 
                  alt="AI Tutor" 
                  className="img-fluid"
                />
              </div>
            </Col>
          </Row>
        </section>

        {/* Core Offerings Section */}
        <section className="offerings-section">
          <h2 className="section-title">Our Learning Solutions</h2>
          <Row>
            <Col lg={4} md={6} className="mb-4">
              <Card className="offering-card">
                <Card.Body>
                  <div className="offering-icon">
                    <BookHalf />
                  </div>
                  <Card.Title>Personalized Learning Paths</Card.Title>
                  <Card.Text>
                    Custom study plans tailored to your learning style, pace, and goals.
                  </Card.Text>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => handleNavigate('/dashboard/learning-paths')}
                  >
                    Explore Paths
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} md={6} className="mb-4">
              <Card className="offering-card">
                <Card.Body>
                  <div className="offering-icon">
                    <Award />
                  </div>
                  <Card.Title>Interactive Quizzes</Card.Title>
                  <Card.Text>
                    Test your knowledge with AI-generated quizzes on any subject.
                  </Card.Text>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => handleNavigate('/dashboard/quiz-system')}
                  >
                    Take a Quiz
                  </Button>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} md={6} className="mb-4">
              <Card className="offering-card">
                <Card.Body>
                  <div className="offering-icon">
                    <Mortarboard />
                  </div>
                  <Card.Title>Expert Lessons</Card.Title>
                  <Card.Text>
                    Access curated educational content from subject matter experts.
                  </Card.Text>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => handleNavigate('/dashboard/learning')}
                  >
                    View Lessons
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </section>

        {/* Key Benefits Section */}
        <section className="benefits-section">
          <h2 className="section-title">Why Choose AI Tutor</h2>
          <Row>
            <Col md={4} className="benefit-item">
              <h3>Personalized Learning</h3>
              <p>AI-powered education tailored to your unique learning style and pace.</p>
            </Col>
            <Col md={4} className="benefit-item">
              <h3>Learn Anywhere</h3>
              <p>Access your courses and materials from any device, anytime.</p>
            </Col>
            <Col md={4} className="benefit-item">
              <h3>Track Progress</h3>
              <p>Monitor your learning journey with detailed insights and analytics.</p>
            </Col>
          </Row>
          <div className="text-center mt-4">
            <Button 
              variant="primary" 
              size="lg" 
              className="main-cta"
              onClick={() => handleNavigate('/dashboard/learning-paths')}
            >
              Get Started Now
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          <div className="footer-links">
            <a href="/dashboard">Home</a>
            <a href="/dashboard/learning-paths">Learning Paths</a>
            <a href="/dashboard/quiz-system">Quizzes</a>
            <a href="/dashboard/learning">Lessons</a>
          </div>
          <p className="copyright">© 2025 AI Tutor. All rights reserved.</p>
        </footer>
      </Container>
    </div>
  );
};

export default DashboardHome;