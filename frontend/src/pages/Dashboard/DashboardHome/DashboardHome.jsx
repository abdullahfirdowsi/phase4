import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, ProgressBar, Badge, Spinner, Alert } from "react-bootstrap";
import { 
  TrophyFill, 
  BookHalf, 
  ClockHistory, 
  Bullseye,
  PlayCircleFill,
  StarFill,
  ArrowRight,
  Plus,
  Fire,
  ChatSquare,
  Calendar
} from "react-bootstrap-icons";
import { getUserStats, getAllLearningGoals } from "../../../api";
import "./DashboardHome.scss";

const DashboardHome = () => {
  const [userStats, setUserStats] = useState(null);
  const [learningGoals, setLearningGoals] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMyCoursesOnly, setShowMyCoursesOnly] = useState(false);
  const [currentGreeting, setCurrentGreeting] = useState("");

  useEffect(() => {
    fetchDashboardData();
    updateGreeting();
    
    // Update greeting every minute
    const greetingInterval = setInterval(updateGreeting, 60000);
    return () => clearInterval(greetingInterval);
  }, []);

  const updateGreeting = () => {
    const currentHour = new Date().getHours();
    let greeting;
    
    if (currentHour >= 5 && currentHour < 12) {
      greeting = "Good Morning";
    } else if (currentHour >= 12 && currentHour < 17) {
      greeting = "Good Afternoon";
    } else if (currentHour >= 17 && currentHour < 21) {
      greeting = "Good Evening";
    } else {
      greeting = "Good Night";
    }
    
    setCurrentGreeting(greeting);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard stats using the proper API function
      const stats = await getUserStats();
      
      // Fetch learning goals
      const goals = await getAllLearningGoals();
      
      // For now, set empty activity array (no backend endpoint exists yet)
      const activity = [];
      
      setUserStats(stats);
      setLearningGoals(goals);
      setRecentActivity(activity);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
      
      // Set default values on error
      setUserStats({
        totalGoals: 0,
        completedGoals: 0,
        totalQuizzes: 0,
        averageScore: 0,
        streakDays: 0,
        totalStudyTime: 0
      });
      setLearningGoals([]);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const userName = localStorage.getItem("name") || "Student";

  const progressCards = [
    {
      title: "Learning Goals",
      value: userStats?.totalGoals || 0,
      subtitle: `${userStats?.completedGoals || 0} completed`,
      icon: <Bullseye size={24} />,
      color: "primary",
      progress: userStats?.totalGoals > 0 ? (userStats.completedGoals / userStats.totalGoals) * 100 : 0
    },
    {
      title: "Study Streak",
      value: `${userStats?.streakDays || 0} days`,
      subtitle: "Keep it up!",
      icon: <Fire size={24} />,
      color: "warning",
      progress: Math.min((userStats?.streakDays || 0) * 10, 100)
    },
    {
      title: "Quizzes Taken",
      value: userStats?.totalQuizzes || 0,
      subtitle: "Practice makes perfect",
      icon: <TrophyFill size={24} />,
      color: "success",
      progress: Math.min((userStats?.totalQuizzes || 0) * 5, 100)
    },
    {
      title: "Study Time",
      value: `${userStats?.totalStudyTime || 0}h`,
      subtitle: "Total hours",
      icon: <ClockHistory size={24} />,
      color: "info",
      progress: Math.min((userStats?.totalStudyTime || 0) * 2, 100)
    }
  ];

  // Sample courses for demonstration
  const allCourses = [
    ...learningGoals.slice(0, 6).map(goal => ({
      id: goal.name,
      title: goal.name,
      progress: goal.progress || 0,
      duration: goal.duration,
      lastAccessed: "2 hours ago",
      difficulty: "Intermediate",
      isUserCourse: true
    })),
    // Add sample courses if user has no goals
    ...(learningGoals.length === 0 ? [
      {
        id: "sample-1",
        title: "Introduction to Python Programming",
        progress: 0,
        duration: "4 weeks",
        lastAccessed: "Never",
        difficulty: "Beginner",
        isUserCourse: false
      },
      {
        id: "sample-2", 
        title: "Web Development Fundamentals",
        progress: 0,
        duration: "6 weeks",
        lastAccessed: "Never",
        difficulty: "Beginner",
        isUserCourse: false
      },
      {
        id: "sample-3",
        title: "Data Science Basics",
        progress: 0,
        duration: "8 weeks", 
        lastAccessed: "Never",
        difficulty: "Intermediate",
        isUserCourse: false
      }
    ] : [])
  ];

  const displayedCourses = showMyCoursesOnly 
    ? allCourses.filter(course => course.isUserCourse)
    : allCourses;

  if (loading) {
    return (
      <div className="enhanced-dashboard-home">
        <Container fluid className="dashboard-container">
          <div className="loading-state">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p className="text-muted">Loading your dashboard...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="enhanced-dashboard-home">
      <Container fluid className="dashboard-container">
        {/* Error Alert */}
        {error && (
          <Alert variant="warning" dismissible onClose={() => setError(null)} className="mb-4">
            {error}
          </Alert>
        )}

        {/* Enhanced Welcome Section with Dynamic Greeting */}
        <div className="welcome-section">
          <div className="welcome-content">
            <div className="greeting-badge">
              <Calendar size={16} className="me-2" />
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <h1 className="welcome-title">
              {currentGreeting}, {userName}! 👋
            </h1>
            <p className="welcome-subtitle">
              Ready to continue your learning journey? Let's make today productive!
            </p>
            <div className="quick-actions">
              <Button variant="primary" className="action-btn">
                <ChatSquare size={16} className="me-2" />
                Start Learning
              </Button>
              <Button variant="outline-primary" className="action-btn">
                <Plus size={16} className="me-2" />
                Set Goal
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Progress Cards */}
        <div className="progress-section">
          <Row className="g-4">
            {progressCards.map((card, index) => (
              <Col lg={3} md={6} key={index}>
                <Card className="enhanced-progress-card">
                  <Card.Body>
                    <div className="card-header-content">
                      <div className={`progress-icon bg-${card.color}`}>
                        {card.icon}
                      </div>
                      <div className="progress-values">
                        <h3 className="progress-value">{card.value}</h3>
                        <small className="progress-subtitle">{card.subtitle}</small>
                      </div>
                    </div>
                    <div className="progress-bar-section">
                      <ProgressBar 
                        now={card.progress} 
                        variant={card.color}
                        className="enhanced-progress"
                      />
                      <small className="progress-text">{Math.round(card.progress)}% progress</small>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Enhanced My Courses Section with Toggle */}
        <div className="courses-section">
          <div className="section-header">
            <div className="section-title-group">
              <h2 className="section-title">
                <BookHalf className="me-2" />
                {showMyCoursesOnly ? "My Courses" : "All Courses"}
              </h2>
              <p className="section-description">
                {showMyCoursesOnly 
                  ? "Your enrolled learning paths" 
                  : "Discover and explore learning opportunities"}
              </p>
            </div>
            <div className="course-controls">
              <Button 
                variant={showMyCoursesOnly ? "primary" : "outline-primary"}
                size="sm" 
                className="toggle-btn"
                onClick={() => setShowMyCoursesOnly(!showMyCoursesOnly)}
              >
                {showMyCoursesOnly ? "Show All Courses" : "My Courses Only"}
              </Button>
              {displayedCourses.length > 0 && (
                <Button variant="outline-primary" size="sm" className="view-all-btn">
                  View All <ArrowRight size={16} />
                </Button>
              )}
            </div>
          </div>

          {displayedCourses.length > 0 ? (
            <div className="courses-transition-container">
              <Row className="g-4">
                {displayedCourses.map((course, index) => (
                  <Col lg={4} md={6} key={course.id}>
                    <Card className="enhanced-course-card">
                      <Card.Body>
                        <div className="course-header">
                          <h6 className="course-title">{course.title}</h6>
                          <Badge 
                            bg={course.isUserCourse ? "primary" : "secondary"} 
                            className="course-badge"
                          >
                            {course.isUserCourse ? "Enrolled" : "Available"}
                          </Badge>
                        </div>
                        <div className="course-meta">
                          <small className="text-muted">
                            <ClockHistory size={14} className="me-1" />
                            {course.duration}
                          </small>
                          <small className="text-muted">
                            Last accessed: {course.lastAccessed}
                          </small>
                        </div>
                        <div className="progress-section">
                          <ProgressBar 
                            now={course.progress} 
                            className="course-progress"
                            variant="primary"
                          />
                          <div className="progress-info">
                            <small className="text-muted">{course.progress}% complete</small>
                            <small className="text-muted">{course.difficulty}</small>
                          </div>
                        </div>
                        <div className="course-actions">
                          <Button 
                            variant={course.isUserCourse ? "primary" : "outline-primary"} 
                            size="sm" 
                            className="action-btn"
                          >
                            <PlayCircleFill size={14} className="me-1" />
                            {course.isUserCourse ? "Continue Learning" : "Start Course"}
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-content">
                <BookHalf size={64} className="empty-icon" />
                <h5 className="empty-title">
                  {showMyCoursesOnly ? "No enrolled courses yet" : "No courses available"}
                </h5>
                <p className="empty-description">
                  {showMyCoursesOnly 
                    ? "Start your learning journey by creating your first personalized study plan!"
                    : "Check back later for new learning opportunities."}
                </p>
                <div className="empty-actions">
                  <Button variant="primary" className="create-btn">
                    <Plus size={16} className="me-2" />
                    Create Learning Goal
                  </Button>
                  {showMyCoursesOnly && (
                    <Button 
                      variant="outline-primary" 
                      className="explore-btn"
                      onClick={() => setShowMyCoursesOnly(false)}
                    >
                      <StarFill size={16} className="me-2" />
                      Explore All Courses
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Summary */}
        {displayedCourses.length > 0 && (
          <div className="stats-summary">
            <Card className="summary-card">
              <Card.Body>
                <Row className="text-center">
                  <Col md={3}>
                    <div className="stat-item">
                      <h4 className="stat-number">{userStats?.totalGoals || 0}</h4>
                      <p className="stat-label">Active Goals</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="stat-item">
                      <h4 className="stat-number">{userStats?.completedGoals || 0}</h4>
                      <p className="stat-label">Completed</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="stat-item">
                      <h4 className="stat-number">{userStats?.totalQuizzes || 0}</h4>
                      <p className="stat-label">Quizzes Taken</p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="stat-item">
                      <h4 className="stat-number">{userStats?.streakDays || 0}</h4>
                      <p className="stat-label">Day Streak</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </div>
        )}
      </Container>
    </div>
  );
};

export default DashboardHome;