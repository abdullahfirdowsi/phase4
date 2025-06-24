import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner } from "react-bootstrap";
import { 
  Shield, 
  People, 
  BookHalf, 
  Plus, 
  Trash, 
  Eye,
  BarChart,
  Award,
  Clock,
  GraphUp
} from "react-bootstrap-icons";
import "./AdminDashboard.scss";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState({});
  const [adminLessons, setAdminLessons] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state for creating lessons
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    subject: "",
    difficulty: "Beginner",
    duration: "30 minutes",
    tags: "",
    prerequisites: "",
    objectives: ""
  });

  const username = localStorage.getItem("username");

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAdminStats(),
        fetchAdminLessons(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      setError("Failed to load admin dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const response = await fetch(`http://localhost:8000/lessons/admin/dashboard?username=${username}`);
      if (response.ok) {
        const data = await response.json();
        setAdminStats(data);
      }
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    }
  };

  const fetchAdminLessons = async () => {
    try {
      const response = await fetch(`http://localhost:8000/lessons/admin/lessons?username=${username}`);
      if (response.ok) {
        const data = await response.json();
        setAdminLessons(data.lessons || []);
      }
    } catch (error) {
      console.error("Error fetching admin lessons:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`http://localhost:8000/lessons/admin/users?username=${username}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateLesson = async () => {
    try {
      const lessonData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        prerequisites: formData.prerequisites.split(',').map(req => req.trim()).filter(req => req),
        objectives: formData.objectives.split(',').map(obj => obj.trim()).filter(obj => obj)
      };

      const response = await fetch("http://localhost:8000/lessons/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          lesson_data: lessonData
        })
      });

      if (response.ok) {
        setSuccess("Lesson created successfully!");
        setShowCreateModal(false);
        setFormData({
          title: "",
          description: "",
          content: "",
          subject: "",
          difficulty: "Beginner",
          duration: "30 minutes",
          tags: "",
          prerequisites: "",
          objectives: ""
        });
        fetchAdminLessons();
        fetchAdminStats();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to create lesson");
      }
    } catch (error) {
      console.error("Error creating lesson:", error);
      setError("Failed to create lesson");
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;

    try {
      const response = await fetch(`http://localhost:8000/lessons/admin/lessons/${lessonId}?username=${username}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setSuccess("Lesson deleted successfully!");
        fetchAdminLessons();
        fetchAdminStats();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to delete lesson");
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      setError("Failed to delete lesson");
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner": return "success";
      case "intermediate": return "warning";
      case "advanced": return "danger";
      default: return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <Container fluid>
          <div className="loading-state">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading admin dashboard...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <Container fluid>
        {/* Header */}
        <div className="admin-header">
          <div className="header-content">
            <h1 className="admin-title">
              <Shield className="me-3" />
              Admin Dashboard
            </h1>
            <p className="admin-subtitle">
              Manage lessons, users, and platform analytics
            </p>
          </div>
          <div className="header-actions">
            <Button 
              variant="outline-primary" 
              className="me-2"
              onClick={() => setShowUsersModal(true)}
            >
              <People size={16} className="me-2" />
              View Users
            </Button>
            <Button 
              variant="primary" 
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} className="me-2" />
              Create Lesson
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Stats Cards */}
        <Row className="stats-section mb-4">
          <Col lg={3} md={6}>
            <Card className="stat-card">
              <Card.Body>
                <div className="stat-content">
                  <div className="stat-icon bg-primary">
                    <People size={24} />
                  </div>
                  <div className="stat-details">
                    <h3>{adminStats.total_users || 0}</h3>
                    <p>Total Users</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6}>
            <Card className="stat-card">
              <Card.Body>
                <div className="stat-content">
                  <div className="stat-icon bg-success">
                    <BookHalf size={24} />
                  </div>
                  <div className="stat-details">
                    <h3>{adminStats.total_admin_lessons || 0}</h3>
                    <p>Admin Lessons</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6}>
            <Card className="stat-card">
              <Card.Body>
                <div className="stat-content">
                  <div className="stat-icon bg-warning">
                    <Award size={24} />
                  </div>
                  <div className="stat-details">
                    <h3>{adminStats.total_user_lessons || 0}</h3>
                    <p>User Lessons</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={3} md={6}>
            <Card className="stat-card">
              <Card.Body>
                <div className="stat-content">
                  <div className="stat-icon bg-info">
                    <GraphUp size={24} />
                  </div>
                  <div className="stat-details">
                    <h3>{adminStats.recent_users || 0}</h3>
                    <p>New This Week</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Admin Lessons */}
        <Card className="lessons-section">
          <Card.Header>
            <h5 className="mb-0">
              <BookHalf className="me-2" />
              Admin Lessons ({adminLessons.length})
            </h5>
          </Card.Header>
          <Card.Body>
            {adminLessons.length > 0 ? (
              <div className="lessons-grid">
                <Row>
                  {adminLessons.map((lesson) => (
                    <Col lg={4} md={6} key={lesson._id} className="mb-3">
                      <Card className="lesson-card">
                        <Card.Body>
                          <div className="lesson-header">
                            <h6 className="lesson-title">{lesson.title}</h6>
                            <Badge bg={getDifficultyColor(lesson.difficulty)}>
                              {lesson.difficulty}
                            </Badge>
                          </div>
                          <p className="lesson-description">{lesson.description}</p>
                          <div className="lesson-meta">
                            <small className="text-muted">
                              <Clock size={12} className="me-1" />
                              {lesson.duration}
                            </small>
                            <small className="text-muted">
                              Subject: {lesson.subject}
                            </small>
                          </div>
                          <div className="lesson-stats">
                            <small>Enrollments: {lesson.enrollments || 0}</small>
                            <small>Completions: {lesson.completions || 0}</small>
                          </div>
                          <div className="lesson-actions">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              className="me-2"
                            >
                              <Eye size={14} className="me-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleDeleteLesson(lesson._id)}
                            >
                              <Trash size={14} className="me-1" />
                              Delete
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
                <BookHalf size={48} className="text-muted mb-3" />
                <h6>No Admin Lessons</h6>
                <p className="text-muted">Create your first admin lesson to get started.</p>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  <Plus size={16} className="me-2" />
                  Create First Lesson
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Create Lesson Modal */}
        <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Create New Admin Lesson</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Title</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter lesson title"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Subject</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Mathematics, Programming"
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the lesson"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Content</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Detailed lesson content (supports markdown)"
                />
              </Form.Group>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Difficulty</Form.Label>
                    <Form.Select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Duration</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="e.g., 30 minutes, 1 hour"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Tags</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="comma, separated, tags"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Prerequisites</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.prerequisites}
                      onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                      placeholder="comma, separated, prerequisites"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Learning Objectives</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.objectives}
                      onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                      placeholder="comma, separated, objectives"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateLesson}>
              Create Lesson
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Users Modal */}
        <Modal show={showUsersModal} onHide={() => setShowUsersModal(false)} size="xl">
          <Modal.Header closeButton>
            <Modal.Title>Users Overview</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Table responsive striped>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Lessons</th>
                  <th>Completed</th>
                  <th>Study Time</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={index}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.lesson_count}</td>
                    <td>{user.completed_lessons}</td>
                    <td>{user.total_study_time}h</td>
                    <td>
                      <Badge bg={user.is_admin ? "danger" : "secondary"}>
                        {user.is_admin ? "Admin" : "User"}
                      </Badge>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUsersModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default AdminDashboard;