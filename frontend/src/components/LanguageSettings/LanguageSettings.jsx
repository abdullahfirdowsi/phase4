import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card, Spinner } from 'react-bootstrap';
import { FaGlobe, FaCheck } from 'react-icons/fa';
import { getUserProfile, updateUserProfile } from '../../api';
import './LanguageSettings.scss';

const LanguageSettings = () => {
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const languageOptions = [
    { value: 'English', label: 'English', flag: '🇺🇸' },
    { value: 'Hindi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
    { value: 'Spanish', label: 'Español', flag: '🇪🇸' },
    { value: 'French', label: 'Français', flag: '🇫🇷' },
    { value: 'German', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'Chinese', label: '中文', flag: '🇨🇳' },
    { value: 'Japanese', label: '日本語', flag: '🇯🇵' },
    { value: 'Korean', label: '한국어', flag: '🇰🇷' },
    { value: 'Portuguese', label: 'Português', flag: '🇵🇹' },
    { value: 'Russian', label: 'Русский', flag: '🇷🇺' }
  ];

  useEffect(() => {
    loadCurrentLanguage();
  }, []);

  const loadCurrentLanguage = async () => {
    setLoading(true);
    try {
      const profile = await getUserProfile();
      const currentLang = profile.preferences?.language || 'English';
      setLanguage(currentLang);
    } catch (err) {
      console.error('Error loading language preference:', err);
      setError('Failed to load current language preference');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    if (newLanguage === language) return;
    
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      // Get current profile first
      const currentProfile = await getUserProfile();
      
      // Update the language preference
      const updatedPreferences = {
        ...currentProfile.preferences,
        language: newLanguage
      };

      await updateUserProfile({
        ...currentProfile.profile,
        preferences: updatedPreferences
      });

      setLanguage(newLanguage);
      setMessage(`Language preference updated to ${newLanguage}! AI responses will now be in ${newLanguage}.`);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setMessage(null);
      }, 5000);

    } catch (err) {
      console.error('Error updating language preference:', err);
      setError('Failed to update language preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="language-settings-card">
        <Card.Body className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 mb-0">Loading language settings...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="language-settings-card">
      <Card.Header>
        <div className="d-flex align-items-center">
          <FaGlobe className="me-2 text-primary" />
          <h5 className="mb-0">Language Preferences</h5>
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

        <Form.Group className="mb-3">
          <Form.Label>Choose your preferred language for AI responses:</Form.Label>
          <div className="language-options">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`language-option ${language === option.value ? 'active' : ''}`}
                onClick={() => handleLanguageChange(option.value)}
                disabled={saving}
              >
                <span className="flag">{option.flag}</span>
                <span className="label">{option.label}</span>
                {language === option.value && (
                  <FaCheck className="check-icon" />
                )}
                {saving && language !== option.value && (
                  <Spinner size="sm" animation="border" />
                )}
              </button>
            ))}
          </div>
        </Form.Group>

        <div className="current-selection">
          <small className="text-muted">
            <strong>Current Language:</strong> {languageOptions.find(opt => opt.value === language)?.label || language}
          </small>
        </div>

        <div className="language-info mt-3">
          <small className="text-info">
            <strong>Note:</strong> Changing your language preference will affect all future AI responses. 
            Your chat history will remain in the original language.
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default LanguageSettings;
