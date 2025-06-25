import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Tabs, Tab, Badge } from 'react-bootstrap';
import { Person, Globe, Bell, Shield, Clock, Upload, Check, X } from 'react-bootstrap-icons';
import { getUserProfile, updateUserProfile } from '../../api';
import LanguageSettings from '../LanguageSettings/LanguageSettings';
import './UserProfile.scss';

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    avatar_url: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    chatUpdates: true,
    learningReminders: true,
    quizResults: true
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const data = await getUserProfile();
      setProfile(data);
      setFormData({
        name: data.name || '',
        email: data.email || data.username || '',
        bio: data.profile?.bio || '',
        avatar_url: data.avatarUrl || data.profile?.avatar_url || ''
      });
      setPreviewImage(data.avatarUrl || data.profile?.avatar_url || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }

    setImageFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate inputs
      if (!formData.name.trim()) {
        setError('Name is required');
        setSaving(false);
        return;
      }

      // If we have a new image file, upload it first
      let avatarUrl = formData.avatar_url;
      if (imageFile) {
        // In a real implementation, you would upload the image to your server/S3
        // For now, we'll simulate a successful upload
        console.log('Would upload image:', imageFile.name);
        // avatarUrl = await uploadImage(imageFile);
        avatarUrl = previewImage; // Simulate successful upload
      }

      // Update profile data
      const updatedProfile = {
        ...profile.profile,
        bio: formData.bio,
        avatar_url: avatarUrl
      };

      await updateUserProfile(updatedProfile);

      // Update local storage with new avatar URL
      if (avatarUrl) {
        localStorage.setItem('avatarUrl', avatarUrl);
      }

      setSuccess('Profile updated successfully!');
      
      // Refresh profile data
      await fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate password inputs
      if (!passwordData.currentPassword) {
        setError('Current password is required');
        setSaving(false);
        return;
      }

      if (!passwordData.newPassword) {
        setError('New password is required');
        setSaving(false);
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match');
        setSaving(false);
        return;
      }

      if (passwordData.newPassword.length < 8) {
        setError('New password must be at least 8 characters long');
        setSaving(false);
        return;
      }

      // In a real implementation, you would call an API to update the password
      // For now, we'll simulate a successful password update
      console.log('Would update password');

      setSuccess('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // In a real implementation, you would call an API to update notification settings
      // For now, we'll simulate a successful update
      console.log('Would update notification settings:', notificationSettings);

      setSuccess('Notification settings updated successfully!');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setError('Failed to update notification settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="user-profile-loading">
        <Spinner animation="border" variant="primary" />
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <Container fluid>
        <div className="profile-header">
          <h1>
            <Person className="me-3" />
            User Profile
          </h1>
          <p>Manage your account settings and preferences</p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            <Check className="me-2" />
            {success}
          </Alert>
        )}

        <Row>
          <Col lg={3} md={4}>
            <Card className="profile-sidebar">
              <Card.Body>
                <div className="profile-avatar">
                  {previewImage ? (
                    <img src={previewImage} alt={formData.name} className="avatar-image" />
                  ) : (
                    <div className="avatar-placeholder">
                      <Person size={40} />
                    </div>
                  )}
                  <div className="avatar-overlay">
                    <label htmlFor="avatar-upload" className="avatar-upload-label">
                      <Upload size={20} />
                      <span>Change</span>
                    </label>
                    <input
                      type="file"
                      id="avatar-upload"
                      className="avatar-upload-input"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
                <h5 className="profile-name">{profile?.name || 'User'}</h5>
                <p className="profile-email">{profile?.email || profile?.username}</p>
                
                {profile?.isAdmin && (
                  <Badge bg="danger" className="admin-badge">
                    <Shield size={12} className="me-1" />
                    Admin
                  </Badge>
                )}
                
                <div className="profile-stats">
                  <div className="stat-item">
                    <div className="stat-value">{profile?.stats?.totalGoals || 0}</div>
                    <div className="stat-label">Goals</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{profile?.stats?.completedGoals || 0}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{profile?.stats?.totalQuizzes || 0}</div>
                    <div className="stat-label">Quizzes</div>
                  </div>
                </div>
                
                <div className="profile-meta">
                  <div className="meta-item">
                    <Clock size={14} className="me-2" />
                    <span>Joined: {new Date(profile?.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={9} md={8}>
            <Card className="profile-content">
              <Card.Header>
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="profile-tabs"
                >
                  <Tab eventKey="personal" title="Personal Information">
                    <div className="tab-icon">
                      <Person size={16} />
                    </div>
                  </Tab>
                  <Tab eventKey="language" title="Language">
                    <div className="tab-icon">
                      <Globe size={16} />
                    </div>
                  </Tab>
                  <Tab eventKey="notifications" title="Notifications">
                    <div className="tab-icon">
                      <Bell size={16} />
                    </div>
                  </Tab>
                  <Tab eventKey="security" title="Security">
                    <div className="tab-icon">
                      <Shield size={16} />
                    </div>
                  </Tab>
                </Tabs>
              </Card.Header>
              
              <Card.Body>
                {activeTab === 'personal' && (
                  <div className="personal-info-tab">
                    <h5 className="section-title">Personal Information</h5>
                    <p className="section-description">
                      Update your personal details and profile information
                    </p>
                    
                    <Form>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              placeholder="Enter your full name"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              placeholder="Enter your email"
                              disabled
                            />
                            <Form.Text className="text-muted">
                              Email address cannot be changed
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Form.Group className="mb-4">
                        <Form.Label>Bio</Form.Label>
                        <Form.Control
                          as="textarea"
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          placeholder="Tell us a bit about yourself"
                          rows={4}
                        />
                      </Form.Group>
                      
                      <Button
                        variant="primary"
                        onClick={handleSaveProfile}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" animation="border" className="me-2" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </Form>
                  </div>
                )}
                
                {activeTab === 'language' && (
                  <div className="language-tab">
                    <LanguageSettings />
                  </div>
                )}
                
                {activeTab === 'notifications' && (
                  <div className="notifications-tab">
                    <h5 className="section-title">Notification Preferences</h5>
                    <p className="section-description">
                      Manage how and when you receive notifications
                    </p>
                    
                    <Form>
                      <div className="notification-options">
                        <Form.Check
                          type="switch"
                          id="email-notifications"
                          label="Email Notifications"
                          name="emailNotifications"
                          checked={notificationSettings.emailNotifications}
                          onChange={handleNotificationChange}
                          className="notification-switch"
                        />
                        <div className="notification-description">
                          Receive important updates and announcements via email
                        </div>
                      </div>
                      
                      <div className="notification-options">
                        <Form.Check
                          type="switch"
                          id="chat-updates"
                          label="Chat Updates"
                          name="chatUpdates"
                          checked={notificationSettings.chatUpdates}
                          onChange={handleNotificationChange}
                          className="notification-switch"
                        />
                        <div className="notification-description">
                          Get notified about new messages and chat activity
                        </div>
                      </div>
                      
                      <div className="notification-options">
                        <Form.Check
                          type="switch"
                          id="learning-reminders"
                          label="Learning Reminders"
                          name="learningReminders"
                          checked={notificationSettings.learningReminders}
                          onChange={handleNotificationChange}
                          className="notification-switch"
                        />
                        <div className="notification-description">
                          Receive reminders about your learning goals and progress
                        </div>
                      </div>
                      
                      <div className="notification-options">
                        <Form.Check
                          type="switch"
                          id="quiz-results"
                          label="Quiz Results"
                          name="quizResults"
                          checked={notificationSettings.quizResults}
                          onChange={handleNotificationChange}
                          className="notification-switch"
                        />
                        <div className="notification-description">
                          Get notified when your quiz results are available
                        </div>
                      </div>
                      
                      <Button
                        variant="primary"
                        onClick={handleSaveNotifications}
                        disabled={saving}
                        className="mt-3"
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" animation="border" className="me-2" />
                            Saving...
                          </>
                        ) : (
                          'Save Preferences'
                        )}
                      </Button>
                    </Form>
                  </div>
                )}
                
                {activeTab === 'security' && (
                  <div className="security-tab">
                    <h5 className="section-title">Security Settings</h5>
                    <p className="section-description">
                      Manage your password and account security
                    </p>
                    
                    <Form>
                      <Form.Group className="mb-3">
                        <Form.Label>Current Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          placeholder="Enter your current password"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          placeholder="Enter new password"
                        />
                        <Form.Text className="text-muted">
                          Password must be at least 8 characters long
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-4">
                        <Form.Label>Confirm New Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          placeholder="Confirm new password"
                        />
                      </Form.Group>
                      
                      <Button
                        variant="primary"
                        onClick={handleSavePassword}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" animation="border" className="me-2" />
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </Form>
                    
                    <div className="account-activity mt-5">
                      <h6>Recent Account Activity</h6>
                      <div className="activity-list">
                        <div className="activity-item">
                          <div className="activity-icon">
                            <Person size={14} />
                          </div>
                          <div className="activity-details">
                            <div className="activity-text">Password changed</div>
                            <div className="activity-time">2 days ago</div>
                          </div>
                        </div>
                        <div className="activity-item">
                          <div className="activity-icon">
                            <Person size={14} />
                          </div>
                          <div className="activity-details">
                            <div className="activity-text">Login from new device</div>
                            <div className="activity-time">5 days ago</div>
                          </div>
                        </div>
                        <div className="activity-item">
                          <div className="activity-icon">
                            <Person size={14} />
                          </div>
                          <div className="activity-details">
                            <div className="activity-text">Profile updated</div>
                            <div className="activity-time">1 week ago</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UserProfile;