import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, 
  Badge, Alert, Spinner, Modal, Form 
} from 'react-bootstrap';
import { 
  BookHalf, 
  Plus, 
  Clock, 
  Eye, 
  Pencil, 
  Trash,
  FileEarmarkCheck,
  FileEarmarkX
} from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { getUserLessons, deleteUserLesson } from '../../../api';
import LessonBuilder from '../../../components/LessonBuilder/LessonBuilder';
import './UserLessons.scss';

const UserLessons = () => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [filter, setFilter] = useState({
    status: 'all',
    search: ''
  });
  
  const navigate = useNavigate();
  
  // Check if user is admin
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  
  // Redirect non-admins to dashboard
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const data = await getUserLessons();
      setLessons(data.lessons || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setError('Failed to load lessons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = async (lessonData) => {
    try {
      // API call to create lesson would go here
      // For now, we'll just close the modal and refresh
      setShowCreateModal(false);
      setSuccess('Lesson created successfully!');
      fetchLessons();
    } catch (error) {
      console.error('Error creating lesson:', error);
      setError('Failed to create lesson. Please try again.');
    }
  };

  const handleEditLesson = (lesson) => {
    navigate(`/dashboard/lessons/edit/${lesson.id}`);
  };

  const handleViewLesson = (lesson) => {
    navigate(`/dashboard/lessons/view/${lesson.id}`);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLesson) return;
    
    try {
      await deleteUserLesson(selectedLesson.id);
      setShowDeleteModal(false);
      setSelectedLesson(null);
      setSuccess('Lesson deleted successfully!');
      fetchLessons();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      setError('Failed to delete lesson. Please try again.');
    }
  };

  const handleSearchChange = (e) => {
    setFilter(prev => ({
      ...prev,
      search: e.target.value
    }));
  };

  const handleStatusFilterChange = (e) => {
    setFilter(prev => ({
      ...prev,
      status: e.target.value
    }));
  };

  // Filter lessons based on search and status
  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = filter.search === '' || 
      lesson.title.toLowerCase().includes(filter.search.toLowerCase()) ||
      lesson.description.toLowerCase().includes(filter.search.toLowerCase());
    
    const matchesStatus = filter.status === 'all' || lesson.status === filter.status;
    
    return matchesSearch && matchesStatus;
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'danger';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="user-lessons-page">
        <Container fluid>
          <div className="loading-state">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading your lessons...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="user-lessons-page">
      <Container fluid>
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <BookHalf className="me-3" />
              My Lessons
            </h1>
            <p className="page-subtitle">
              Create and manage your own educational content
            </p>
          </div>
          <div className="header-actions">
            <Button 
              variant="primary" 
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="me-2" />
              Create New Lesson
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

        {/* Filters */}
        <div className="lessons-filters mb-4">
          <Row>
            <Col md={8}>
              <Form.Control
                type="text"
                placeholder="Search lessons..."
                value={filter.search}
                onChange={handleSearchChange}
                className="search-input"
              />
            </Col>
            <Col md={4}>
              <Form.Select
                value={filter.status}
                onChange={handleStatusFilterChange}
                className="status-filter"
              >
                <option value="all">All Lessons</option>
                <option value="draft">Drafts</option>
                <option value="published">Published</option>
              </Form.Select>
            </Col>
          </Row>
        </div>

        {/* Lessons Grid */}
        {filteredLessons.length > 0 ? (
          <Row className="lessons-grid">
            {filteredLessons.map((lesson) => (
              <Col lg={4} md={6} key={lesson.id} className="mb-4">
                <Card className="lesson-card">
                  {lesson.avatarUrl && (
                    <div className="lesson-thumbnail">
                      <img src={lesson.avatarUrl} alt={lesson.title} />
                      <Badge 
                        bg={lesson.status === 'published' ? 'success' : 'warning'}
                        className="status-badge"
                      >
                        {lesson.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  )}
                  
                  <Card.Body>
                    <div className="lesson-header">
                      <h5 className="lesson-title">{lesson.title}</h5>
                      <Badge bg={getDifficultyColor(lesson.difficulty)}>
                        {lesson.difficulty}
                      </Badge>
                    </div>
                    
                    <p className="lesson-description">{lesson.description}</p>
                    
                    <div className="lesson-meta">
                      <div className="meta-item">
                        <Clock size={14} />
                        <span>{lesson.duration} minutes</span>
                      </div>
                      {lesson.subject && (
                        <div className="meta-item">
                          <BookHalf size={14} />
                          <span>{lesson.subject}</span>
                        </div>
                      )}
                    </div>
                    
                    {lesson.tags && lesson.tags.length > 0 && (
                      <div className="lesson-tags">
                        {lesson.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} bg="light" text="dark" className="tag-badge">
                            {tag}
                          </Badge>
                        ))}
                        {lesson.tags.length > 3 && (
                          <Badge bg="light" text="dark" className="tag-badge">
                            +{lesson.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </Card.Body>
                  
                  <Card.Footer>
                    <div className="lesson-actions">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleViewLesson(lesson)}
                      >
                        <Eye size={14} className="me-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => handleEditLesson(lesson)}
                      >
                        <Pencil size={14} className="me-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => {
                          setSelectedLesson(lesson);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash size={14} className="me-1" />
                        Delete
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <div className="empty-state">
            {filter.search || filter.status !== 'all' ? (
              <>
                <FileEarmarkX size={64} className="mb-3" />
                <h3>No matching lessons found</h3>
                <p>Try adjusting your search or filter criteria</p>
                <Button 
                  variant="outline-primary"
                  onClick={() => setFilter({ status: 'all', search: '' })}
                >
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <FileEarmarkCheck size={64} className="mb-3" />
                <h3>No lessons created yet</h3>
                <p>Create your first lesson to get started</p>
                <Button 
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="me-2" />
                  Create New Lesson
                </Button>
              </>
            )}
          </div>
        )}
      </Container>

      {/* Create Lesson Modal */}
      <Modal 
        show={showCreateModal} 
        onHide={() => setShowCreateModal(false)}
        size="xl"
        backdrop="static"
        className="lesson-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create New Lesson</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <LessonBuilder onSave={handleCreateLesson} />
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onHide={() => {
          setShowDeleteModal(false);
          setSelectedLesson(null);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the lesson "{selectedLesson?.title}"?</p>
          <p className="text-danger">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowDeleteModal(false);
              setSelectedLesson(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteConfirm}
          >
            Delete Lesson
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserLessons;