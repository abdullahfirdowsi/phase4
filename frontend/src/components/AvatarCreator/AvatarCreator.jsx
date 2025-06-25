import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Tabs, Tab, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Image, Upload, Mic, VolumeUp, Check, X } from 'react-bootstrap-icons';
import { uploadImage, uploadAudio, getPredefinedAvatars, getAvailableVoices, createVoiceClone, getVoiceStatus } from '../../api';
import './AvatarCreator.scss';

const AvatarCreator = ({ show, onHide, onAvatarCreated }) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [predefinedAvatars, setPredefinedAvatars] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [selectedPredefined, setSelectedPredefined] = useState(null);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [voiceName, setVoiceName] = useState('');
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [voiceId, setVoiceId] = useState(null);
  
  // Available voices
  const [availableVoices, setAvailableVoices] = useState({});
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  
  // Media recorder
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingInterval, setRecordingInterval] = useState(null);

  useEffect(() => {
    // Fetch predefined avatars when component mounts
    const fetchPredefinedAvatars = async () => {
      try {
        setLoadingAvatars(true);
        const data = await getPredefinedAvatars();
        setPredefinedAvatars(data.avatars || []);
      } catch (error) {
        console.error('Error fetching predefined avatars:', error);
        setError('Failed to load predefined avatars');
      } finally {
        setLoadingAvatars(false);
      }
    };
    
    // Fetch available voices
    const fetchAvailableVoices = async () => {
      try {
        setLoadingVoices(true);
        const data = await getAvailableVoices();
        if (data.success) {
          setAvailableVoices(data.voices || {});
        }
      } catch (error) {
        console.error('Error fetching available voices:', error);
      } finally {
        setLoadingVoices(false);
      }
    };
    
    if (show) {
      fetchPredefinedAvatars();
      fetchAvailableVoices();
    }
    
    // Clean up on unmount
    return () => {
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [show]);

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

  const handleSelectPredefined = (avatar) => {
    setSelectedPredefined(avatar);
    setUploadedImageUrl(avatar.image_url);
    setSuccess(`Selected ${avatar.name} as your avatar`);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];
      
      recorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });
      
      recorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        setIsRecording(false);
      });
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      
      // Start timer
      let seconds = 0;
      const interval = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
        
        // Auto-stop after 30 seconds
        if (seconds >= 30) {
          stopRecording();
        }
      }, 1000);
      
      setRecordingInterval(interval);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone. Please check your browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      
      // Stop all audio tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      // Clear interval
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadVoiceSample = async () => {
    if (!audioBlob) {
      setError('Please record a voice sample first');
      return;
    }
    
    if (!voiceName.trim()) {
      setError('Please enter a name for your voice');
      return;
    }
    
    try {
      setUploadingVoice(true);
      setError(null);
      
      // Create file from blob
      const file = new File([audioBlob], 'voice_sample.wav', { type: 'audio/wav' });
      
      // Upload audio to S3
      const result = await uploadAudio(file);
      
      if (result.success) {
        // Create voice clone
        const cloneResult = await createVoiceClone(result.url, voiceName);
        
        if (cloneResult.success) {
          setVoiceId(cloneResult.voice_id);
          setSuccess('Voice sample uploaded and processing started');
          
          // Poll for voice status
          pollVoiceStatus(cloneResult.voice_id);
        } else {
          setError(cloneResult.error || 'Failed to create voice clone');
        }
      } else {
        setError(result.error || 'Failed to upload voice sample');
      }
    } catch (error) {
      setError(error.message || 'Failed to upload voice sample');
    } finally {
      setUploadingVoice(false);
    }
  };

  const pollVoiceStatus = async (voiceId) => {
    try {
      // Check status every 5 seconds
      const statusInterval = setInterval(async () => {
        const data = await getVoiceStatus(voiceId);
        
        if (data.success && data.ready) {
          clearInterval(statusInterval);
          setSuccess('Voice clone is ready to use');
        }
      }, 5000);
      
      // Stop polling after 5 minutes (timeout)
      setTimeout(() => {
        clearInterval(statusInterval);
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error('Error polling voice status:', error);
    }
  };

  const handleSelectVoice = (provider, language, voice) => {
    setSelectedVoice({
      provider,
      language,
      ...voice
    });
    setVoiceId(voice.id);
    setSuccess(`Selected voice: ${voice.name}`);
  };

  const handleCreateAvatar = () => {
    if (!uploadedImageUrl && !selectedPredefined) {
      setError('Please upload an image or select a predefined avatar');
      return;
    }
    
    // Call the onAvatarCreated callback with the avatar information
    onAvatarCreated({
      imageUrl: uploadedImageUrl || (selectedPredefined ? selectedPredefined.image_url : null),
      voiceId: voiceId,
      isPredefined: !!selectedPredefined,
      predefinedId: selectedPredefined ? selectedPredefined.id : null
    });
    
    // Close the modal
    onHide();
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered
      className="avatar-creator-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>Create Your AI Tutor Avatar</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
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
        
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
        >
          <Tab eventKey="upload" title="Upload Image">
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
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                        setUploadedImageUrl(null);
                      }}
                      disabled={uploading}
                    >
                      <X size={16} className="me-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="upload-placeholder" onClick={() => document.getElementById('avatar-file-input').click()}>
                  <Image size={32} />
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
                <div className="progress-label d-flex justify-content-between">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="progress">
                  <div 
                    className="progress-bar" 
                    role="progressbar" 
                    style={{ width: `${uploadProgress}%` }} 
                    aria-valuenow={uploadProgress} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>
            )}
            
            <div className="action-buttons mt-4">
              <Button 
                variant="primary" 
                onClick={handleUpload}
                disabled={!file || uploading || uploadedImageUrl}
                className="w-100"
              >
                {uploading ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Uploading...
                  </>
                ) : uploadedImageUrl ? (
                  <>
                    <Check size={16} className="me-2" />
                    Image Uploaded
                  </>
                ) : (
                  <>
                    <Upload size={16} className="me-2" />
                    Upload Image
                  </>
                )}
              </Button>
            </div>
          </Tab>
          
          <Tab eventKey="predefined" title="Predefined Avatars">
            {loadingAvatars ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading predefined avatars...</p>
              </div>
            ) : predefinedAvatars.length > 0 ? (
              <Row className="predefined-avatars">
                {predefinedAvatars.map((avatar) => (
                  <Col md={6} key={avatar.id} className="mb-3">
                    <Card 
                      className={`avatar-card ${selectedPredefined?.id === avatar.id ? 'selected' : ''}`}
                      onClick={() => handleSelectPredefined(avatar)}
                    >
                      <Card.Img 
                        variant="top" 
                        src={avatar.image_url} 
                        alt={avatar.name} 
                      />
                      <Card.Body>
                        <Card.Title>{avatar.name}</Card.Title>
                        <Card.Text>{avatar.description}</Card.Text>
                      </Card.Body>
                      {selectedPredefined?.id === avatar.id && (
                        <div className="selected-overlay">
                          <Check size={32} />
                        </div>
                      )}
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="text-center py-5">
                <p>No predefined avatars available</p>
              </div>
            )}
          </Tab>
          
          <Tab eventKey="voice" title="Voice Selection">
            <div className="voice-container">
              <div className="voice-tabs">
                <Tabs defaultActiveKey="record" className="mb-4 voice-selection-tabs">
                  <Tab eventKey="record" title="Record Your Voice">
                    <div className="voice-info mb-4">
                      <h5>Create Your Custom Voice</h5>
                      <p>Record a voice sample to create a personalized voice for your avatar.</p>
                    </div>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Voice Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter a name for your voice"
                        value={voiceName}
                        onChange={(e) => setVoiceName(e.target.value)}
                        disabled={isRecording || uploadingVoice || voiceId}
                      />
                    </Form.Group>
                    
                    <div className="recording-section mb-4">
                      {!audioUrl ? (
                        <div className="recording-controls">
                          <Button
                            variant={isRecording ? "danger" : "primary"}
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={uploadingVoice || voiceId}
                            className="recording-btn"
                          >
                            {isRecording ? (
                              <>
                                <Spinner size="sm" animation="border" className="me-2" />
                                Stop Recording ({formatTime(recordingTime)})
                              </>
                            ) : (
                              <>
                                <Mic size={16} className="me-2" />
                                Start Recording
                              </>
                            )}
                          </Button>
                          
                          {isRecording && (
                            <div className="recording-indicator">
                              <div className="recording-wave">
                                <div className="wave"></div>
                                <div className="wave"></div>
                                <div className="wave"></div>
                              </div>
                              <p>Recording... Speak clearly for 15-30 seconds</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="audio-preview">
                          <audio src={audioUrl} controls className="w-100 mb-3"></audio>
                          <div className="d-flex justify-content-between">
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                URL.revokeObjectURL(audioUrl);
                                setAudioUrl(null);
                                setAudioBlob(null);
                              }}
                              disabled={uploadingVoice || voiceId}
                            >
                              <X size={16} className="me-1" />
                              Discard
                            </Button>
                            
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={uploadVoiceSample}
                              disabled={uploadingVoice || !voiceName.trim() || voiceId}
                            >
                              {uploadingVoice ? (
                                <>
                                  <Spinner size="sm" animation="border" className="me-2" />
                                  Processing...
                                </>
                              ) : voiceId ? (
                                <>
                                  <Check size={16} className="me-2" />
                                  Voice Uploaded
                                </>
                              ) : (
                                <>
                                  <Upload size={16} className="me-2" />
                                  Upload Voice
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="voice-instructions">
                      <h6>Instructions for best results:</h6>
                      <ul>
                        <li>Record in a quiet environment</li>
                        <li>Speak clearly and at a normal pace</li>
                        <li>Record at least 15 seconds of audio</li>
                        <li>Avoid background noise and interruptions</li>
                      </ul>
                    </div>
                  </Tab>
                  
                  <Tab eventKey="select" title="Select Existing Voice">
                    <div className="voice-info mb-4">
                      <h5>Choose a Pre-made Voice</h5>
                      <p>Select from a variety of professional voice options.</p>
                    </div>
                    
                    {loadingVoices ? (
                      <div className="text-center py-4">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-3">Loading available voices...</p>
                      </div>
                    ) : Object.keys(availableVoices).length > 0 ? (
                      <div className="voice-selection">
                        <Form.Group className="mb-3">
                          <Form.Label>Voice Provider</Form.Label>
                          <Form.Select 
                            className="mb-3"
                            onChange={(e) => setActiveTab(`provider-${e.target.value}`)}
                          >
                            <option value="">Select a provider</option>
                            {Object.keys(availableVoices).map(provider => (
                              <option key={provider} value={provider}>{provider}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                        
                        {Object.keys(availableVoices).map(provider => (
                          <div 
                            key={provider} 
                            className={`provider-voices ${activeTab === `provider-${provider}` ? 'd-block' : 'd-none'}`}
                          >
                            {Object.keys(availableVoices[provider]).map(language => (
                              <div key={language} className="language-group mb-4">
                                <h6>{language}</h6>
                                <Row className="voice-options">
                                  {availableVoices[provider][language].map(voice => (
                                    <Col md={6} key={voice.id} className="mb-2">
                                      <Card 
                                        className={`voice-card ${selectedVoice?.id === voice.id ? 'selected' : ''}`}
                                        onClick={() => handleSelectVoice(provider, language, voice)}
                                      >
                                        <Card.Body className="d-flex align-items-center">
                                          <VolumeUp className="me-3 voice-icon" />
                                          <div>
                                            <div className="voice-name">{voice.name}</div>
                                            <div className="voice-gender">{voice.gender}</div>
                                          </div>
                                          {selectedVoice?.id === voice.id && (
                                            <Check className="ms-auto check-icon" />
                                          )}
                                        </Card.Body>
                                      </Card>
                                    </Col>
                                  ))}
                                </Row>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p>No voices available. Please try again later.</p>
                      </div>
                    )}
                  </Tab>
                </Tabs>
              </div>
            </div>
          </Tab>
        </Tabs>
        
        <div className="avatar-summary mt-4">
          <h6>Avatar Configuration Summary</h6>
          <div className="summary-items">
            <div className="summary-item">
              <span className="label">Image:</span>
              <span className="value">
                {uploadedImageUrl ? (
                  selectedPredefined ? selectedPredefined.name : 'Custom Image'
                ) : 'Not selected'}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Voice:</span>
              <span className="value">
                {voiceId ? (
                  selectedVoice ? selectedVoice.name : voiceName
                ) : 'Default Voice'}
              </span>
            </div>
          </div>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleCreateAvatar}
          disabled={!uploadedImageUrl && !selectedPredefined}
        >
          Create Avatar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AvatarCreator;