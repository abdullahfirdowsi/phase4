import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, Alert, Spinner, ProgressBar, Tabs, Tab } from "react-bootstrap";
import { 
  PeopleFill, 
  BookHalf, 
  ClipboardData, 
  Eye,
  PencilSquare,
  Trash,
  CheckCircle,
  XCircle,
  GearFill,
  GraphUp,
  ShieldCheck,
  ExclamationTriangle,
  StarFill
} from "react-bootstrap-icons";
import { formatLocalDate } from "../../../utils/dateUtils";
import { 
  getUsers, 
  updateUserStatus, 
  deleteUser, 
  getContentForModeration, 
  moderateContent,
  getAdminAnalytics,
  getSystemConfig,
  updateSystemConfig,
  getPopularContent,
  featureContent
} from "../../../api";
import "./AdminDashboard.scss";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [contentForModeration, setContentForModeration] = useState({
    recent_lessons: [],
    reported_content: []
  });
  const [analytics, setAnalytics] = useState({});
  const [systemConfig, setSystemConfig] = useState({});
  const [popularContent, setPopularContent] = useState({
    popular_lessons: [],
    featured_content: []
  });
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [moderationAction, setModerationAction] = useState("approve");
  const [moderationReason, setModerationReason] = useState("");
  const [userStatus, setUserStatus] = useState("active");
  const [configData, setConfigData] = useState({});

  const username = localStorage.getItem("username");

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch data based on active tab
      if (activeTab === "users" || activeTab === "dashboard") {
        const usersData = await getUsers();
        setUsers(usersData.users || []);
      }
      
      if (activeTab === "moderation" || activeTab === "dashboard") {
        const moderationData = await getContentForModeration();
        setContentForModeration(moderationData);
      }
      
      if (activeTab === "analytics" || activeTab === "dashboard") {
        const analyticsData = await getAdminAnalytics();
        setAnalytics(analyticsData);
      }
      
      if (activeTab === "config") {
        const configData = await getSystemConfig();
        setSystemConfig(configData);
        setConfigData(configData);
      }
      
      if (activeTab === "popular") {
        const popularData = await getPopularContent();
        setPopularContent(popularData);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      setError("Failed to load admin dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserStatus = async () => {
    try {
      if (!selectedUser) return;
      
      await updateUserStatus(selectedUser.username, userStatus);
      setSuccess(`User status updated to ${userStatus}`);
      setShowUserModal(false);
      
      // Refresh users list
      const usersData = await getUsers();
      setUsers(usersData.users || []);
    } catch (error) {
      console.error("Error updating user status:", error);
      setError("Failed to update user status");
    }
  };

  const handleDeleteUser = async () => {
    try {
      if (!selectedUser) return;
      
      await deleteUser(selectedUser.username);
      setSuccess("User deleted successfully");
      setShowUserModal(false);
      
      // Refresh users list
      const usersData = await getUsers();
      setUsers(usersData.users || []);
    } catch (error) {
      console.error("Error deleting user:", error);
      setError("Failed to delete user");
    }
  };

  const handleModerateContent = async () => {
    try {
      if (!selectedContent) return;
      
      await moderateContent(
        selectedContent.lesson_id, 
        moderationAction, 
        moderationReason
      );
      
      setSuccess(`Content ${moderationAction}ed successfully`);
      setShowContentModal(false);
      
      // Refresh moderation content
      const moderationData = await getContentForModeration();
      setContentForModeration(moderationData);
    } catch (error) {
      console.error("Error moderating content:", error);
      setError("Failed to moderate content");
    }
  };

  const handleUpdateConfig = async () => {
    try {
      await updateSystemConfig(configData);
      setSuccess("System configuration updated successfully");
      setShowConfigModal(false);
      
      // Refresh config
      const newConfigData = await getSystemConfig();
      setSystemConfig(newConfigData);
    } catch (error) {
      console.error("Error updating system config:", error);
      setError("Failed to update system configuration");
    }
  };

  const handleFeatureContent = async (contentId, featured) => {
    try {
      await featureContent(contentId, featured);
      setSuccess(`Content ${featured ? 'featured' : 'unfeatured'} successfully`);
      
      // Refresh popular content
      const popularData = await getPopularContent();
      setPopularContent(popularData);
    } catch (error) {
      console.error("Error featuring content:", error);
      setError("Failed to update content feature status");
    }
  };

  const renderDashboard = () => {
    return (
      <>
        {/* Stats Cards */}
        <Row className="stats-section mb-4">
          <Col lg={3} md={6}>
            <Card className="stat-card">
              <Card.Body>
                <div className="stat-content">
                  <div className="stat-icon bg-primary">
                    <PeopleFill size={24} />
                  </div>
                  <div className="stat-details">
                    <h3>{analytics.total_users || 0}</h3>
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
                    <h3>{analytics.total_lessons || 0}</h3>
                    <p>Total Lessons</p>
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
                    <ClipboardData size={24} />
                  </div>
                  <div className="stat-details">
                    <h3>{analytics.published_lessons || 0}</h3>
                    <p>Published Lessons</p>
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
                    <h3>{analytics.total_views || 0}</h3>
                    <p>Total Views</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recent Activity */}
        <Row className="mb-4">
          <Col lg={6}>
            <Card className="recent-activity-card">
              <Card.Header>
                <h5 className="mb-0">Recent Activity</h5>
              </Card.Header>
              <Card.Body>
                {analytics.recent_activity && analytics.recent_activity.length > 0 ? (
                  <div className="activity-list">
                    {analytics.recent_activity.map((activity, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-icon">
                          {activity.type === "user_registration" ? (
                            <PeopleFill size={16} />
                          ) : (
                            <BookHalf size={16} />
                          )}
                        </div>
                        <div className="activity-details">
                          <div className="activity-text">
                            {activity.type === "user_registration" 
                              ? `New user registered: ${activity.username}` 
                              : `New lesson created: ${activity.lesson_title} by ${activity.created_by}`}
                          </div>
                          <div className="activity-time">
                            {formatLocalDate(activity.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center">No recent activity</p>
                )}
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={6}>
            <Card className="moderation-card">
              <Card.Header>
                <h5 className="mb-0">Pending Moderation</h5>
              </Card.Header>
              <Card.Body>
                {contentForModeration.recent_lessons && contentForModeration.recent_lessons.length > 0 ? (
                  <div className="moderation-list">
                    {contentForModeration.recent_lessons.slice(0, 5).map((content, index) => (
                      <div key={index} className="moderation-item">
                        <div className="content-info">
                          <h6>{content.title}</h6>
                          <div className="content-meta">
                            <span>By: {content.created_by}</span>
                            <span>Created: {formatLocalDate(content.created_at)}</span>
                          </div>
                        </div>
                        <div className="content-actions">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => {
                              setSelectedContent(content);
                              setShowContentModal(true);
                            }}
                          >
                            <Eye size={14} className="me-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center">No content pending moderation</p>
                )}
                
                {contentForModeration.recent_lessons && contentForModeration.recent_lessons.length > 5 && (
                  <div className="text-center mt-3">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => setActiveTab("moderation")}
                    >
                      View All ({contentForModeration.recent_lessons.length})
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Top Content and Users */}
        <Row>
          <Col lg={6}>
            <Card className="top-content-card">
              <Card.Header>
                <h5 className="mb-0">Top Lessons</h5>
              </Card.Header>
              <Card.Body>
                {analytics.top_lessons && analytics.top_lessons.length > 0 ? (
                  <div className="top-content-list">
                    {analytics.top_lessons.map((lesson, index) => (
                      <div key={index} className="top-content-item">
                        <div className="rank">{index + 1}</div>
                        <div className="content-info">
                          <h6>{lesson.title}</h6>
                          <div className="content-meta">
                            <span>By: {lesson.created_by}</span>
                            <span>Views: {lesson.views || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center">No lessons found</p>
                )}
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={6}>
            <Card className="top-users-card">
              <Card.Header>
                <h5 className="mb-0">Top Content Creators</h5>
              </Card.Header>
              <Card.Body>
                {analytics.top_users && analytics.top_users.length > 0 ? (
                  <div className="top-users-list">
                    {analytics.top_users.map((user, index) => (
                      <div key={index} className="top-user-item">
                        <div className="rank">{index + 1}</div>
                        <div className="user-info">
                          <h6>{user.name}</h6>
                          <div className="user-meta">
                            <span>{user.username}</span>
                            <span>Lessons: {user.lesson_count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center">No top users found</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  };

  const renderUsersTab = () => {
    return (
      <Card className="users-card">
        <Card.Header>
          <h5 className="mb-0">User Management</h5>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table striped hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={index}>
                    <td>{user.name || "N/A"}</td>
                    <td>{user.username}</td>
                    <td>
                      <Badge bg={
                        user.status === "active" ? "success" :
                        user.status === "suspended" ? "warning" : "danger"
                      }>
                        {user.status || "active"}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={user.is_admin ? "danger" : "secondary"}>
                        {user.is_admin ? "Admin" : "User"}
                      </Badge>
                    </td>
                    <td>{formatLocalDate(user.created_at)}</td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        className="me-2"
                        onClick={() => {
                          setSelectedUser(user);
                          setUserStatus(user.status || "active");
                          setShowUserModal(true);
                        }}
                      >
                        <PencilSquare size={14} className="me-1" />
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderModerationTab = () => {
    return (
      <>
        <Card className="moderation-card mb-4">
          <Card.Header>
            <h5 className="mb-0">Content Moderation</h5>
          </Card.Header>
          <Card.Body>
            <Tabs defaultActiveKey="pending" className="mb-4">
              <Tab eventKey="pending" title={`Pending Review (${contentForModeration.recent_lessons?.length || 0})`}>
                {contentForModeration.recent_lessons && contentForModeration.recent_lessons.length > 0 ? (
                  <div className="moderation-list">
                    {contentForModeration.recent_lessons.map((content, index) => (
                      <div key={index} className="moderation-item">
                        <div className="content-info">
                          <h6>{content.title}</h6>
                          <p className="content-description">{content.description}</p>
                          <div className="content-meta">
                            <span>By: {content.created_by}</span>
                            <span>Created: {formatLocalDate(content.created_at)}</span>
                            <Badge bg={
                              content.difficulty === "Beginner" ? "success" :
                              content.difficulty === "Intermediate" ? "warning" : "danger"
                            }>
                              {content.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <div className="content-actions">
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            className="me-2"
                            onClick={() => {
                              setSelectedContent(content);
                              setModerationAction("approve");
                              setModerationReason("");
                              setShowContentModal(true);
                            }}
                          >
                            <CheckCircle size={14} className="me-1" />
                            Approve
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => {
                              setSelectedContent(content);
                              setModerationAction("reject");
                              setModerationReason("");
                              setShowContentModal(true);
                            }}
                          >
                            <XCircle size={14} className="me-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center">No content pending moderation</p>
                )}
              </Tab>
              
              <Tab eventKey="reported" title={`Reported (${contentForModeration.reported_content?.length || 0})`}>
                {contentForModeration.reported_content && contentForModeration.reported_content.length > 0 ? (
                  <div className="moderation-list">
                    {contentForModeration.reported_content.map((content, index) => (
                      <div key={index} className="moderation-item reported">
                        <div className="content-info">
                          <h6>{content.title}</h6>
                          <p className="content-description">{content.description}</p>
                          <div className="content-meta">
                            <span>By: {content.created_by}</span>
                            <span>Created: {formatLocalDate(content.created_at)}</span>
                          </div>
                          <div className="report-details">
                            <h6 className="report-heading">Report Details:</h6>
                            {content.reports && content.reports.map((report, i) => (
                              <div key={i} className="report">
                                <p><strong>Reported by:</strong> {report.reported_by}</p>
                                <p><strong>Reason:</strong> {report.reason}</p>
                                {report.details && <p><strong>Details:</strong> {report.details}</p>}
                                <p><strong>Reported at:</strong> {formatLocalDate(report.reported_at)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="content-actions">
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            className="me-2"
                            onClick={() => {
                              setSelectedContent(content);
                              setModerationAction("approve");
                              setModerationReason("");
                              setShowContentModal(true);
                            }}
                          >
                            <CheckCircle size={14} className="me-1" />
                            Approve
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            className="me-2"
                            onClick={() => {
                              setSelectedContent(content);
                              setModerationAction("reject");
                              setModerationReason("");
                              setShowContentModal(true);
                            }}
                          >
                            <XCircle size={14} className="me-1" />
                            Reject
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => {
                              setSelectedContent(content);
                              setModerationAction("delete");
                              setModerationReason("");
                              setShowContentModal(true);
                            }}
                          >
                            <Trash size={14} className="me-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center">No reported content</p>
                )}
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </>
    );
  };

  const renderAnalyticsTab = () => {
    return (
      <Card className="analytics-card">
        <Card.Header>
          <h5 className="mb-0">System Analytics</h5>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={6}>
              <Card className="inner-card">
                <Card.Header>
                  <h6 className="mb-0">User Statistics</h6>
                </Card.Header>
                <Card.Body>
                  <div className="stat-item">
                    <div className="stat-label">Total Users</div>
                    <div className="stat-value">{analytics.total_users || 0}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Active Users</div>
                    <div className="stat-value">{users.filter(u => u.status === "active" || !u.status).length}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Admin Users</div>
                    <div className="stat-value">{users.filter(u => u.is_admin).length}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="inner-card">
                <Card.Header>
                  <h6 className="mb-0">Content Statistics</h6>
                </Card.Header>
                <Card.Body>
                  <div className="stat-item">
                    <div className="stat-label">Total Lessons</div>
                    <div className="stat-value">{analytics.total_lessons || 0}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Published Lessons</div>
                    <div className="stat-value">{analytics.published_lessons || 0}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Total Views</div>
                    <div className="stat-value">{analytics.total_views || 0}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row>
            <Col md={12}>
              <Card className="inner-card">
                <Card.Header>
                  <h6 className="mb-0">Top Content Creators</h6>
                </Card.Header>
                <Card.Body>
                  {analytics.top_users && analytics.top_users.length > 0 ? (
                    <Table striped hover>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Name</th>
                          <th>Username</th>
                          <th>Lessons</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.top_users.map((user, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{user.name}</td>
                            <td>{user.username}</td>
                            <td>{user.lesson_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <p className="text-muted text-center">No data available</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  const renderConfigTab = () => {
    return (
      <Card className="config-card">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">System Configuration</h5>
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setShowConfigModal(true)}
            >
              <PencilSquare size={14} className="me-1" />
              Edit Configuration
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Card className="inner-card">
                <Card.Header>
                  <h6 className="mb-0">Content Moderation Settings</h6>
                </Card.Header>
                <Card.Body>
                  <div className="config-item">
                    <div className="config-label">Moderation Enabled</div>
                    <div className="config-value">
                      <Badge bg={systemConfig.content_moderation?.enabled ? "success" : "danger"}>
                        {systemConfig.content_moderation?.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                  <div className="config-item">
                    <div className="config-label">Auto-Approve Content</div>
                    <div className="config-value">
                      <Badge bg={systemConfig.content_moderation?.auto_approve ? "success" : "danger"}>
                        {systemConfig.content_moderation?.auto_approve ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                  <div className="config-item">
                    <div className="config-label">Profanity Filter</div>
                    <div className="config-value">
                      <Badge bg={systemConfig.content_moderation?.profanity_filter ? "success" : "danger"}>
                        {systemConfig.content_moderation?.profanity_filter ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="inner-card">
                <Card.Header>
                  <h6 className="mb-0">User Limits</h6>
                </Card.Header>
                <Card.Body>
                  <div className="config-item">
                    <div className="config-label">Max Lessons Per Day</div>
                    <div className="config-value">{systemConfig.user_limits?.max_lessons_per_day || "N/A"}</div>
                  </div>
                  <div className="config-item">
                    <div className="config-label">Max File Size (MB)</div>
                    <div className="config-value">{systemConfig.user_limits?.max_file_size_mb || "N/A"}</div>
                  </div>
                  <div className="config-item">
                    <div className="config-label">Max Video Duration (min)</div>
                    <div className="config-value">{systemConfig.user_limits?.max_video_duration_minutes || "N/A"}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row className="mt-4">
            <Col md={12}>
              <Card className="inner-card">
                <Card.Header>
                  <h6 className="mb-0">Feature Flags</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <div className="config-item">
                        <div className="config-label">Comments</div>
                        <div className="config-value">
                          <Badge bg={systemConfig.feature_flags?.comments_enabled ? "success" : "danger"}>
                            {systemConfig.feature_flags?.comments_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="config-item">
                        <div className="config-label">Ratings</div>
                        <div className="config-value">
                          <Badge bg={systemConfig.feature_flags?.ratings_enabled ? "success" : "danger"}>
                            {systemConfig.feature_flags?.ratings_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="config-item">
                        <div className="config-label">Sharing</div>
                        <div className="config-value">
                          <Badge bg={systemConfig.feature_flags?.sharing_enabled ? "success" : "danger"}>
                            {systemConfig.feature_flags?.sharing_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  const renderPopularContentTab = () => {
    return (
      <Card className="popular-content-card">
        <Card.Header>
          <h5 className="mb-0">Popular Content Management</h5>
        </Card.Header>
        <Card.Body>
          <Tabs defaultActiveKey="popular" className="mb-4">
            <Tab eventKey="popular" title="Popular Lessons">
              {popularContent.popular_lessons && popularContent.popular_lessons.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Creator</th>
                        <th>Views</th>
                        <th>Likes</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {popularContent.popular_lessons.map((lesson, index) => (
                        <tr key={index}>
                          <td>{lesson.title}</td>
                          <td>{lesson.created_by}</td>
                          <td>{lesson.views || 0}</td>
                          <td>{lesson.likes || 0}</td>
                          <td>
                            <Badge bg={lesson.featured ? "warning" : "secondary"}>
                              {lesson.featured ? "Featured" : "Regular"}
                            </Badge>
                          </td>
                          <td>
                            <Button 
                              variant={lesson.featured ? "outline-warning" : "outline-primary"} 
                              size="sm"
                              onClick={() => handleFeatureContent(lesson.lesson_id, !lesson.featured)}
                            >
                              {lesson.featured ? (
                                <>
                                  <StarFill size={14} className="me-1" />
                                  Unfeature
                                </>
                              ) : (
                                <>
                                  <StarFill size={14} className="me-1" />
                                  Feature
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted text-center">No popular lessons found</p>
              )}
            </Tab>
            
            <Tab eventKey="featured" title="Featured Content">
              {popularContent.featured_content && popularContent.featured_content.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Creator</th>
                        <th>Featured By</th>
                        <th>Featured At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {popularContent.featured_content.map((content, index) => (
                        <tr key={index}>
                          <td>{content.title}</td>
                          <td>{content.created_by}</td>
                          <td>{content.featured_by}</td>
                          <td>{formatLocalDate(content.featured_at)}</td>
                          <td>
                            <Button 
                              variant="outline-warning" 
                              size="sm"
                              onClick={() => handleFeatureContent(content.lesson_id, false)}
                            >
                              <StarFill size={14} className="me-1" />
                              Unfeature
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted text-center">No featured content found</p>
              )}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    );
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
              <ShieldCheck className="me-3" />
              Admin Dashboard
            </h1>
            <p className="admin-subtitle">
              Manage users, content, and system settings
            </p>
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

        {/* Admin Tabs */}
        <div className="admin-tabs mb-4">
          <Button 
            variant={activeTab === "dashboard" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("dashboard")}
            className="tab-btn"
          >
            Dashboard
          </Button>
          <Button 
            variant={activeTab === "users" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("users")}
            className="tab-btn"
          >
            Users
          </Button>
          <Button 
            variant={activeTab === "moderation" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("moderation")}
            className="tab-btn"
          >
            Moderation
            {contentForModeration.recent_lessons && contentForModeration.recent_lessons.length > 0 && (
              <Badge bg="danger" className="ms-2">
                {contentForModeration.recent_lessons.length}
              </Badge>
            )}
          </Button>
          <Button 
            variant={activeTab === "analytics" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("analytics")}
            className="tab-btn"
          >
            Analytics
          </Button>
          <Button 
            variant={activeTab === "config" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("config")}
            className="tab-btn"
          >
            Configuration
          </Button>
          <Button 
            variant={activeTab === "popular" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("popular")}
            className="tab-btn"
          >
            Popular Content
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "users" && renderUsersTab()}
        {activeTab === "moderation" && renderModerationTab()}
        {activeTab === "analytics" && renderAnalyticsTab()}
        {activeTab === "config" && renderConfigTab()}
        {activeTab === "popular" && renderPopularContentTab()}

        {/* User Management Modal */}
        <Modal show={showUserModal} onHide={() => setShowUserModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Manage User: {selectedUser?.name || selectedUser?.username}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedUser && (
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>User Status</Form.Label>
                  <Form.Select
                    value={userStatus}
                    onChange={(e) => setUserStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="blocked">Blocked</option>
                  </Form.Select>
                </Form.Group>
                
                <div className="user-info mb-4">
                  <h6>User Information</h6>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{selectedUser.username}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Role:</span>
                    <span className="info-value">{selectedUser.is_admin ? "Admin" : "User"}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Joined:</span>
                    <span className="info-value">{formatLocalDate(selectedUser.created_at)}</span>
                  </div>
                </div>
                
                <div className="danger-zone">
                  <h6 className="text-danger">Danger Zone</h6>
                  <p className="text-muted">Deleting a user will remove all their data and cannot be undone.</p>
                  <Button 
                    variant="danger" 
                    onClick={handleDeleteUser}
                    disabled={selectedUser.is_admin && selectedUser.username !== username}
                  >
                    <Trash className="me-2" />
                    Delete User
                  </Button>
                </div>
              </Form>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowUserModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleUpdateUserStatus}
              disabled={selectedUser?.is_admin && selectedUser?.username !== username}
            >
              Update Status
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Content Moderation Modal */}
        <Modal show={showContentModal} onHide={() => setShowContentModal(false)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>
              {moderationAction === "approve" ? "Approve Content" : 
               moderationAction === "reject" ? "Reject Content" : "Delete Content"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedContent && (
              <>
                <div className="content-preview mb-4">
                  <h5>{selectedContent.title}</h5>
                  <p>{selectedContent.description}</p>
                  
                  <div className="content-meta mb-3">
                    <div className="meta-item">
                      <span className="meta-label">Created By:</span>
                      <span className="meta-value">{selectedContent.created_by}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Created At:</span>
                      <span className="meta-value">{formatLocalDate(selectedContent.created_at)}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Difficulty:</span>
                      <span className="meta-value">{selectedContent.difficulty}</span>
                    </div>
                  </div>
                  
                  {selectedContent.avatarUrl && (
                    <div className="content-image mb-3">
                      <img src={selectedContent.avatarUrl} alt={selectedContent.title} className="img-fluid" />
                    </div>
                  )}
                  
                  <div className="content-html">
                    <h6>Content Preview:</h6>
                    <div 
                      className="html-preview"
                      dangerouslySetInnerHTML={{ __html: selectedContent.content }}
                    />
                  </div>
                </div>
                
                {(moderationAction === "reject" || moderationAction === "delete") && (
                  <Form.Group className="mb-3">
                    <Form.Label>Reason for {moderationAction === "reject" ? "rejection" : "deletion"}</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={moderationReason}
                      onChange={(e) => setModerationReason(e.target.value)}
                      placeholder={`Please provide a reason for ${moderationAction === "reject" ? "rejecting" : "deleting"} this content`}
                      required
                    />
                  </Form.Group>
                )}
                
                <div className="moderation-actions">
                  <div className="action-buttons">
                    <Button 
                      variant={moderationAction === "approve" ? "success" : "outline-success"}
                      onClick={() => setModerationAction("approve")}
                      className="me-2"
                    >
                      <CheckCircle className="me-1" />
                      Approve
                    </Button>
                    <Button 
                      variant={moderationAction === "reject" ? "warning" : "outline-warning"}
                      onClick={() => setModerationAction("reject")}
                      className="me-2"
                    >
                      <XCircle className="me-1" />
                      Reject
                    </Button>
                    <Button 
                      variant={moderationAction === "delete" ? "danger" : "outline-danger"}
                      onClick={() => setModerationAction("delete")}
                    >
                      <Trash className="me-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowContentModal(false)}>
              Cancel
            </Button>
            <Button 
              variant={
                moderationAction === "approve" ? "success" :
                moderationAction === "reject" ? "warning" : "danger"
              } 
              onClick={handleModerateContent}
              disabled={(moderationAction === "reject" || moderationAction === "delete") && !moderationReason}
            >
              {moderationAction === "approve" ? "Approve Content" :
               moderationAction === "reject" ? "Reject Content" : "Delete Content"}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* System Config Modal */}
        <Modal show={showConfigModal} onHide={() => setShowConfigModal(false)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Edit System Configuration</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <h5 className="mb-3">Content Moderation Settings</h5>
              <Row className="mb-4">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Check 
                      type="switch"
                      id="moderation-enabled"
                      label="Enable Moderation"
                      checked={configData.content_moderation?.enabled}
                      onChange={(e) => setConfigData({
                        ...configData,
                        content_moderation: {
                          ...configData.content_moderation,
                          enabled: e.target.checked
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Check 
                      type="switch"
                      id="auto-approve"
                      label="Auto-Approve Content"
                      checked={configData.content_moderation?.auto_approve}
                      onChange={(e) => setConfigData({
                        ...configData,
                        content_moderation: {
                          ...configData.content_moderation,
                          auto_approve: e.target.checked
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Check 
                      type="switch"
                      id="profanity-filter"
                      label="Profanity Filter"
                      checked={configData.content_moderation?.profanity_filter}
                      onChange={(e) => setConfigData({
                        ...configData,
                        content_moderation: {
                          ...configData.content_moderation,
                          profanity_filter: e.target.checked
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <h5 className="mb-3">User Limits</h5>
              <Row className="mb-4">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Max Lessons Per Day</Form.Label>
                    <Form.Control
                      type="number"
                      value={configData.user_limits?.max_lessons_per_day || 5}
                      onChange={(e) => setConfigData({
                        ...configData,
                        user_limits: {
                          ...configData.user_limits,
                          max_lessons_per_day: parseInt(e.target.value)
                        }
                      })}
                      min={1}
                      max={100}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Max File Size (MB)</Form.Label>
                    <Form.Control
                      type="number"
                      value={configData.user_limits?.max_file_size_mb || 100}
                      onChange={(e) => setConfigData({
                        ...configData,
                        user_limits: {
                          ...configData.user_limits,
                          max_file_size_mb: parseInt(e.target.value)
                        }
                      })}
                      min={1}
                      max={500}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Max Video Duration (min)</Form.Label>
                    <Form.Control
                      type="number"
                      value={configData.user_limits?.max_video_duration_minutes || 30}
                      onChange={(e) => setConfigData({
                        ...configData,
                        user_limits: {
                          ...configData.user_limits,
                          max_video_duration_minutes: parseInt(e.target.value)
                        }
                      })}
                      min={1}
                      max={120}
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <h5 className="mb-3">Feature Flags</h5>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Check 
                      type="switch"
                      id="comments-enabled"
                      label="Enable Comments"
                      checked={configData.feature_flags?.comments_enabled}
                      onChange={(e) => setConfigData({
                        ...configData,
                        feature_flags: {
                          ...configData.feature_flags,
                          comments_enabled: e.target.checked
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Check 
                      type="switch"
                      id="ratings-enabled"
                      label="Enable Ratings"
                      checked={configData.feature_flags?.ratings_enabled}
                      onChange={(e) => setConfigData({
                        ...configData,
                        feature_flags: {
                          ...configData.feature_flags,
                          ratings_enabled: e.target.checked
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Check 
                      type="switch"
                      id="sharing-enabled"
                      label="Enable Sharing"
                      checked={configData.feature_flags?.sharing_enabled}
                      onChange={(e) => setConfigData({
                        ...configData,
                        feature_flags: {
                          ...configData.feature_flags,
                          sharing_enabled: e.target.checked
                        }
                      })}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfigModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateConfig}>
              Save Configuration
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default AdminDashboard;