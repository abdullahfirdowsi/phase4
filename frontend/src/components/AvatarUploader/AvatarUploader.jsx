import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, ProgressBar, Spinner } from 'react-bootstrap';
import { Upload, Check, X, Plus } from 'react-bootstrap-icons';
import { uploadImage, generateAvatar, getAvatarStatus } from '../../api';
import AvatarCreator from '../AvatarCreator/AvatarCreator';
import './AvatarUploader.scss';

const AvatarUploader = ({ lessonId, onComplete }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(null);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);

  useEffect(() => {
    // Check if avatar already exists for this lesson
    const checkExistingAvatar = async () => {
      try {
        const status = await getAvatarStatus(lessonId);
        
        if (status.status === 'completed' && status.avatar_video_url) {
          setAvatarVideoUrl(status.avatar_video_url);
          setGenerationStatus('completed');
          
          // Notify parent component
          if (onComplete) {
            onComplete(status.avatar_video_url);
          }
        }
      } catch (error) {
        console.error('Error checking avatar status:', error);
      }
    };
    
    checkExistingAvatar();
  }, [lessonId, onComplete]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }
    
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an image file first');
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 20;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Upload image to S3
      const result = await uploadImage(file);
      
      clearInterval(progressInterval);
      
      if (result.success) {
        setUploadProgress(100);
        setUploadedImageUrl(result.url);
        setSuccess('Image uploaded successfully');
      } else {
        setError(result.error || 'Failed to upload image');
      }
    } catch (error) {
      setError(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!uploadedImageUrl) {
      setError('Please upload an image first');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);
      
      // Generate avatar video
      const result = await generateAvatar(
        lessonId, 
        uploadedImageUrl, 
        'en', // Default language
        selectedVoiceId // Voice ID (if selected)
      );
      
      if (result.success) {
        setGenerationStatus('pending');
        setSuccess('Avatar generation started. This may take a few minutes.');
        
        // Poll for status
        pollGenerationStatus();
      } else {
        setError(result.error || 'Failed to start avatar generation');
      }
    } catch (error) {
      setError(error.message || 'Failed to generate avatar');
      setGenerating(false);
    }
  };

  const pollGenerationStatus = async () => {
    try {
      // Check status every 5 seconds
      const statusInterval = setInterval(async () => {
        const status = await getAvatarStatus(lessonId);
        
        if (status.status === 'completed') {
          clearInterval(statusInterval);
          setGenerationStatus('completed');
          setAvatarVideoUrl(status.avatar_video_url);
          setSuccess('Avatar video generated successfully');
          setGenerating(false);
          
          // Notify parent component
          if (onComplete) {
            onComplete(status.avatar_video_url);
          }
        }
      }, 5000);
      
      // Stop polling after 5 minutes (timeout)
      setTimeout(() => {
        clearInterval(statusInterval);
        if (generationStatus !== 'completed') {
          setGenerationStatus('timeout');
          setGenerating(false);
          setError('Avatar generation is taking longer than expected. Please check back later.');
        }
      }, 5 * 60 * 1000);
    } catch (error) {
      setError(error.message || 'Failed to check generation status');
      setGenerating(false);
    }
  };

  const resetUploader = () => {
    setFile(null);
    setPreviewUrl(null);
    setUploadedImageUrl(null);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);
  };

  const handleAvatarCreated = (avatarData) => {
    console.log('Avatar created:', avatarData);
    
    // Set the uploaded image URL
    setUploadedImageUrl(avatarData.imageUrl);
    
    // Set voice ID if provided
    if (avatarData.voiceId) {
      setSelectedVoiceId(avatarData.voiceId);
    }
    
    setSuccess('Avatar configured successfully. Ready to generate video.');
  };

  return (
    <Card className="avatar-uploader">
      <Card.Header>
        <h5 className="mb-0">Create AI Tutor Avatar</h5>
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
        
        {!avatarVideoUrl ? (
          <>
            <div className="avatar-options mb-4">
              <Button 
                variant="primary" 
                className="w-100 py-3"
                onClick={() => setShowAvatarCreator(true)}
              >
                <Plus size={20} className="me-2" />
                Create Your AI Tutor Avatar
              </Button>
              
              <div className="text-center mt-3">
                <small className="text-muted">
                  Create a personalized avatar for your AI tutor using your own image or select from predefined options
                </small>
              </div>
            </div>
            
            {uploadedImageUrl && (
              <div className="selected-avatar mb-4">
                <h6>Selected Avatar</h6>
                <div className="avatar-preview">
                  <img 
                    src={uploadedImageUrl} 
                    alt="Selected Avatar" 
                    className="avatar-image" 
                  />
                  {selectedVoiceId && (
                    <div className="voice-badge">
                      <span>Custom Voice</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="action-buttons mt-4">
              {uploadedImageUrl && (
                <Button 
                  variant="success" 
                  onClick={handleGenerateAvatar}
                  disabled={generating}
                  className="w-100"
                >
                  {generating ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Generating Avatar...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="me-2" />
                      Generate Avatar Video
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {generationStatus === 'pending' && (
              <div className="generation-status mt-4">
                <div className="d-flex align-items-center mb-2">
                  <Spinner size="sm" animation="border" className="me-2" />
                  <span>Generating avatar video...</span>
                </div>
                <ProgressBar animated now={100} className="generation-progress" />
                <small className="text-muted d-block mt-2">
                  This process may take several minutes. You can close this window and check back later.
                </small>
              </div>
            )}
          </>
        ) : (
          <div className="video-preview">
            <h6>Generated Avatar Video:</h6>
            <video 
              src={avatarVideoUrl} 
              controls 
              className="w-100 mt-2"
              style={{ borderRadius: '8px' }}
            />
            <div className="text-center mt-3">
              <small className="text-success">
                <Check size={16} className="me-1" />
                Avatar video generated successfully
              </small>
            </div>
          </div>
        )}
      </Card.Body>
      
      {/* Avatar Creator Modal */}
      <AvatarCreator 
        show={showAvatarCreator}
        onHide={() => setShowAvatarCreator(false)}
        onAvatarCreated={handleAvatarCreated}
      />
    </Card>
  );
};

export default AvatarUploader;