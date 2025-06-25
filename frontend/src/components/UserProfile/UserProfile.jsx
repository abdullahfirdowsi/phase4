import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Card, Form, Button, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { Person } from 'react-bootstrap-icons';
import { getUserProfile, updateUserProfile } from '../../api';
import LanguageSettings from '../LanguageSettings/LanguageSettings';
import './UserProfile.scss';

const UserProfile = ({ show, onHide }) => {
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
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (show) {
      fetchUserProfile();
    }
  }, [show]);

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

  if (loading) {
    return (
      <Modal show={show} onHide={onHide} size="xl" centered className="profile-modal">
        <Modal.Header closeButton>
          <Modal.Title>User Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading profile...</p>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered className="profile-modal">
      <Modal.Header closeButton>
        <Modal.Title>User Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <div className="user-profile">
          <Row className="m-0">
            <Col lg={3} md={4} className="p-0">
              <Card className="profile-sidebar h-100 border-0 rounded-0">
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
                        Change
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
                    <div className="admin-badge">
                      Admin
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={9} md={8} className="p-0">
              <Card className="profile-content h-100 border-0 rounded-0">
                <Card.Header className="border-bottom-0">
                  <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    className="profile-tabs"
                  >
                    <Tab eventKey="personal" title="Personal Information" />
                    <Tab eventKey="language" title="Language" />
                    <Tab eventKey="security" title="Security" />
                  </Tabs>
                </Card.Header>
                
                <Card.Body>
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
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default UserProfile;