import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card, Spinner, Row, Col } from 'react-bootstrap';
import { FaUser, FaUserGraduate, FaClock, FaGlobe, FaCheck, FaChartLine } from 'react-icons/fa';
import { getUserProfile, updateUserPreferences, updateUserProfile } from '../../api';
import './PreferencesSettings.scss';

const PreferencesSettings = () => {
  const [preferences, setPreferences] = useState({
    language: 'en',
    user_role: 'student',
    age_group: '5-12',
    time_value: 30,
    skill_level: 'beginner'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Static English only for Phase 1 - Multi-language support in future phases
  const languageOptions = [
    { value: 'en', label: 'English', flag: '🇺🇸' }
  ];

  const userRoleOptions = [
    { value: 'student', label: 'Student', icon: '🎓', description: 'Learning new topics and concepts' },
    { value: 'parent', label: 'Parent', icon: '👨‍👩‍👧‍👦', description: 'Supporting my child\'s education' },
    { value: 'teacher', label: 'Teacher', icon: '👩‍🏫', description: 'Creating educational content' }
    // Admin role managed separately via dedicated admin email login
  ];

  const ageGroupOptions = [
    { value: '5-12', label: '5-12 years', description: 'Elementary' },
    { value: '13-18', label: '13-18 years', description: 'High school' },
    { value: '18+', label: '18+ years', description: 'Adult' }
  ];

  const skillLevelOptions = [
    { value: 'beginner', label: 'Beginner', icon: '🌱', description: 'Just starting out' },
    { value: 'intermediate', label: 'Intermediate', icon: '🌿', description: 'Some experience' },
    { value: 'advanced', label: 'Advanced', icon: '🌳', description: 'Highly experienced' },
    { value: 'expert', label: 'Expert', icon: '🏆', description: 'Professional level' },
    { value: 'senior', label: 'Senior', icon: '👑', description: 'Senior professional/educator' }
  ];

  const timeValueOptions = [
    { value: 15, label: '15 minutes', description: 'Quick sessions' },
    { value: 30, label: '30 minutes', description: 'Standard sessions' },
    { value: 45, label: '45 minutes', description: 'Extended sessions' },
    { value: 60, label: '1 hour', description: 'Long sessions' },
    { value: 90, label: '1.5 hours', description: 'Extended learning' }
  ];

  useEffect(() => {
    loadCurrentPreferences();
  }, []);

  const loadCurrentPreferences = async () => {
    setLoading(true);
    try {
      const profile = await getUserProfile();
      const currentPrefs = {
        language: profile.preferences?.language || 'en',
        user_role: profile.preferences?.user_role || 'student',
        age_group: profile.preferences?.age_group || '5-12',
        time_value: profile.preferences?.time_value || 30,
        skill_level: profile.profile?.skill_level || 'beginner'
      };
      setPreferences(currentPrefs);
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError('Failed to load current preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      // Separate profile and preferences data
      const { skill_level, ...prefData } = preferences;
      
      console.log('🔧 Updating preferences:', prefData);
      console.log('🔧 Updating skill level:', skill_level);
      
      // Save preferences
      await updateUserPreferences(prefData);
      console.log('✅ Preferences updated successfully');
      
      // Update profile with skill level
      if (skill_level) {
        const profileData = {
          username: localStorage.getItem('username'),
          name: null, // Don't update name
          profile: { skill_level: skill_level }
        };
        console.log('🔧 Updating profile with skill level:', profileData);
        await updateUserProfile(profileData);
        console.log('✅ Skill level updated successfully');
      }

      setMessage('Preferences updated successfully! Your learning experience has been personalized.');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setMessage(null);
      }, 5000);

    } catch (err) {
      console.error('❌ Error updating preferences:', err);
      console.error('❌ Error details:', err.message);
      setError(`Failed to update preferences: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="preferences-settings-card">
        <Card.Body className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 mb-0">Loading preferences...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="preferences-settings">
      <Card className="preferences-settings-card">
        <Card.Header>
          <div className="d-flex align-items-center">
            <FaUser className="me-2 text-primary" />
            <h5 className="mb-0">Learning Preferences</h5>
          </div>
        </Card.Header>
        
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {message && (
            <Alert variant="success" dismissible onClose={() => setMessage(null)}>
              <FaCheck className="me-2" />
              {message}
            </Alert>
          )}

          <Row>
            {/* Language Preference */}
            <Col md={6} className="mb-4">
              <Card className="preference-card">
                <Card.Header className="d-flex align-items-center">
                  <FaGlobe className="me-2" />
                  <span>Language</span>
                </Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Label>Preferred language for AI responses:</Form.Label>
                    <div className="preference-options">
                      {languageOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`preference-option ${preferences.language === option.value ? 'active' : ''}`}
                          onClick={() => handlePreferenceChange('language', option.value)}
                        >
                          <span className="option-icon">{option.flag}</span>
                          <span className="option-label">{option.label}</span>
                          {preferences.language === option.value && (
                            <FaCheck className="check-icon" />
                          )}
                        </button>
                      ))}
                    </div>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>

            {/* User Role */}
            <Col md={6} className="mb-4">
              <Card className="preference-card">
                <Card.Header className="d-flex align-items-center">
                  <FaUserGraduate className="me-2" />
                  <span>Role</span>
                </Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Label>I am a:</Form.Label>
                    <div className="preference-options">
                      {userRoleOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`preference-option ${preferences.user_role === option.value ? 'active' : ''}`}
                          onClick={() => handlePreferenceChange('user_role', option.value)}
                        >
                          <span className="option-icon">{option.icon}</span>
                          <div className="option-content">
                            <span className="option-label">{option.label}</span>
                            <small className="option-description">{option.description}</small>
                          </div>
                          {preferences.user_role === option.value && (
                            <FaCheck className="check-icon" />
                          )}
                        </button>
                      ))}
                    </div>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>

            {/* Age Group */}
            <Col md={6} className="mb-4">
              <Card className="preference-card">
                <Card.Header className="d-flex align-items-center">
                  <FaUser className="me-2" />
                  <span>Age Group</span>
                </Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Label>Age range:</Form.Label>
                    <div className="preference-options">
                      {ageGroupOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`preference-option ${preferences.age_group === option.value ? 'active' : ''}`}
                          onClick={() => handlePreferenceChange('age_group', option.value)}
                        >
                          <div className="option-content">
                            <span className="option-label">{option.label}</span>
                            <small className="option-description">{option.description}</small>
                          </div>
                          {preferences.age_group === option.value && (
                            <FaCheck className="check-icon" />
                          )}
                        </button>
                      ))}
                    </div>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>

            {/* Skill Level */}
            <Col md={6} className="mb-4">
              <Card className="preference-card">
                <Card.Header className="d-flex align-items-center">
                  <FaChartLine className="me-2" />
                  <span>Skill Level</span>
                </Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Label>My current skill level:</Form.Label>
                    <div className="preference-options">
                      {skillLevelOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`preference-option ${preferences.skill_level === option.value ? 'active' : ''}`}
                          onClick={() => handlePreferenceChange('skill_level', option.value)}
                        >
                          <span className="option-icon">{option.icon}</span>
                          <div className="option-content">
                            <span className="option-label">{option.label}</span>
                            <small className="option-description">{option.description}</small>
                          </div>
                          {preferences.skill_level === option.value && (
                            <FaCheck className="check-icon" />
                          )}
                        </button>
                      ))}
                    </div>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>

            {/* Session Duration */}
            <Col md={12} className="mb-4">
              <Card className="preference-card">
                <Card.Header className="d-flex align-items-center">
                  <FaClock className="me-2" />
                  <span>Session Duration</span>
                </Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Label>Preferred session length:</Form.Label>
                    <div className="preference-options horizontal">
                      {timeValueOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`preference-option ${preferences.time_value === option.value ? 'active' : ''}`}
                          onClick={() => handlePreferenceChange('time_value', option.value)}
                        >
                          <div className="option-content">
                            <span className="option-label">{option.label}</span>
                            <small className="option-description">{option.description}</small>
                          </div>
                          {preferences.time_value === option.value && (
                            <FaCheck className="check-icon" />
                          )}
                        </button>
                      ))}
                    </div>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <div className="save-section">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSavePreferences}
              disabled={saving}
              className="save-preferences-btn"
            >
              {saving ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Saving Preferences...
                </>
              ) : (
                <>
                  <FaCheck className="me-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>

          <div className="preferences-info mt-3">
            <small className="text-info">
              <strong>Note:</strong> These preferences will personalize your learning experience. 
              You can change them anytime to adjust the difficulty and style of content.
            </small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PreferencesSettings;
