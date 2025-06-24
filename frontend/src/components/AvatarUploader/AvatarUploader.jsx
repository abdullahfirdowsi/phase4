import React, { useState } from 'react';
import { Card, Form, Button, Alert, ProgressBar, Spinner } from 'react-bootstrap';
import { Upload, Check, X } from 'react-bootstrap-icons';
import { uploadImage, generateAvatar, getAvatarStatus } from '../../api';
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
      const result = await generateAvatar(lessonId, uploadedImageUrl);
      
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

  return (
    <Card className="avatar-uploader">
      <Card.Header>
        <h5 className="mb-0">Upload Avatar Image</h5>
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
        
        <div className="upload-container">
          {previewUrl ? (
            <div className="preview-container">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="image-preview" 
              />
              <div className="preview-actions">
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={resetUploader}
                  disabled={uploading || generating}
                >
                  <X size={16} className="me-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="upload-placeholder" onClick={() => document.getElementById('avatar-file-input').click()}>
              <Upload size={32} />
              <p>Click to select an image</p>
              <small>JPG, PNG (max 5MB)</small>
            </div>
          )}
          
          <Form.Control
            id="avatar-file-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="d-none"
          />
        </div>
        
        {uploadProgress > 0 && (
          <div className="mt-3">
            <ProgressBar 
              now={uploadProgress} 
              label={`${Math.round(uploadProgress)}%`} 
              variant="primary" 
              animated={uploading}
            />
          </div>
        )}
        
        <div className="action-buttons mt-4">
          {!uploadedImageUrl ? (
            <Button 
              variant="primary" 
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-100"
            >
              {uploading ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} className="me-2" />
                  Upload Image
                </>
              )}
            </Button>
          ) : (
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
        
        {avatarVideoUrl && (
          <div className="video-preview mt-4">
            <h6>Generated Avatar Video:</h6>
            <video 
              src={avatarVideoUrl} 
              controls 
              className="w-100 mt-2"
              style={{ borderRadius: '8px' }}
            />
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AvatarUploader;