import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Button, Alert, Row, Col, 
  Tabs, Tab, ProgressBar, Badge, Spinner 
} from 'react-bootstrap';
import { 
  FileEarmarkPlus, 
  Images, 
  Pencil, 
  Eye, 
  Save, 
  Upload, 
  CheckCircle,
  Trash,
  ArrowUp,
  ArrowDown
} from 'react-bootstrap-icons';
import RichTextEditor from '../RichTextEditor/RichTextEditor';
import { uploadFile } from '../../api';
import './LessonBuilder.scss';

const LessonBuilder = ({ onSave, initialData = null }) => {
  // Check if user is admin
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  
  // Early return if not admin
  if (!isAdmin) {
    return (
      <div className="lesson-builder-unauthorized">
        <Alert variant="danger">
          <h4>Access Denied</h4>
          <p>Only administrators can create and edit lessons.</p>
        </Alert>
      </div>
    );
  }
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    subject: '',
    difficulty: 'Beginner',
    duration: 30,
    tags: '',
    status: 'draft'
  });
  
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [sections, setSections] = useState([]);
  const [currentSection, setCurrentSection] = useState({
    title: '',
    content: ''
  });

  // Load initial data if provided
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        content: initialData.content || '',
        subject: initialData.subject || '',
        difficulty: initialData.difficulty || 'Beginner',
        duration: initialData.duration || 30,
        tags: initialData.tags ? initialData.tags.join(', ') : '',
        status: initialData.status || 'draft'
      });
      
      if (initialData.videoUrl) {
        setVideoPreviewUrl(initialData.videoUrl);
      }
      
      if (initialData.avatarUrl) {
        setAvatarPreviewUrl(initialData.avatarUrl);
      }
      
      if (initialData.sections) {
        setSections(initialData.sections);
      }
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContentChange = (content) => {
    setFormData(prev => ({
      ...prev,
      content
    }));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }
    
    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('Video file size must be less than 100MB');
      return;
    }
    
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB');
      return;
    }
    
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleUploadFiles = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      
      let videoUrl = videoPreviewUrl;
      let avatarUrl = avatarPreviewUrl;
      
      // Upload video if selected
      if (videoFile) {
        setUploadProgress(10);
        const videoResult = await uploadFile(videoFile, 'videos');
        setUploadProgress(50);
        
        if (videoResult.success) {
          videoUrl = videoResult.url;
        } else {
          throw new Error(`Failed to upload video: ${videoResult.error}`);
        }
      }
      
      // Upload avatar if selected
      if (avatarFile) {
        setUploadProgress(60);
        const avatarResult = await uploadFile(avatarFile, 'images');
        setUploadProgress(90);
        
        if (avatarResult.success) {
          avatarUrl = avatarResult.url;
        } else {
          throw new Error(`Failed to upload avatar: ${avatarResult.error}`);
        }
      }
      
      setUploadProgress(100);
      
      // Return the URLs
      return {
        videoUrl,
        avatarUrl
      };
      
    } catch (error) {
      setError(error.message || 'Failed to upload files');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSectionChange = (e) => {
    const { name, value } = e.target;
    setCurrentSection(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSection = () => {
    if (!currentSection.title.trim()) {
      setError('Section title is required');
      return;
    }
    
    setSections(prev => [...prev, { ...currentSection, id: Date.now() }]);
    setCurrentSection({ title: '', content: '' });
  };

  const handleRemoveSection = (index) => {
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveSection = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newSections = [...sections];
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
      setSections(newSections);
    } else if (direction === 'down' && index < sections.length - 1) {
      const newSections = [...sections];
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      setSections(newSections);
    }
  };

  const handleSaveLesson = async (publishStatus = 'draft') => {
    try {
      // Validate required fields
      if (!formData.title.trim()) {
        setError('Lesson title is required');
        return;
      }
      
      if (!formData.description.trim()) {
        setError('Lesson description is required');
        return;
      }
      
      // Upload files
      const uploadResult = await handleUploadFiles();
      if (!uploadResult) return;
      
      // Prepare tags array
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
      
      // Prepare lesson data
      const lessonData = {
        ...formData,
        status: publishStatus,
        videoUrl: uploadResult.videoUrl,
        avatarUrl: uploadResult.avatarUrl,
        tags: tagsArray,
        sections: sections
      };
      
      // Call the save callback
      await onSave(lessonData);
      
      setSuccess(publishStatus === 'published' 
        ? 'Lesson published successfully!' 
        : 'Lesson saved as draft successfully!');
        
      // Reset form if it's a new lesson
      if (!initialData) {
        setFormData({
          title: '',
          description: '',
          content: '',
          subject: '',
          difficulty: 'Beginner',
          duration: 30,
          tags: '',
          status: 'draft'
        });
        setVideoFile(null);
        setVideoPreviewUrl('');
        setAvatarFile(null);
        setAvatarPreviewUrl('');
        setSections([]);
      }
      
    } catch (error) {
      setError(error.message || 'Failed to save lesson');
    }
  };

  const renderPreview = () => {
    // Prepare tags array for preview
    const tagsArray = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
      
    return (
      <div className="lesson-preview">
        <div className="preview-header">
          <h2>{formData.title || 'Untitled Lesson'}</h2>
          <div className="preview-meta">
            <Badge bg="primary">{formData.subject || 'General'}</Badge>
            <Badge bg={
              formData.difficulty === 'Beginner' ? 'success' :
              formData.difficulty === 'Intermediate' ? 'warning' : 'danger'
            }>
              {formData.difficulty}
            </Badge>
            <Badge bg="info">{formData.duration} minutes</Badge>
          </div>
        </div>
        
        {avatarPreviewUrl && (
          <div className="preview-avatar">
            <img src={avatarPreviewUrl} alt="Lesson Avatar" />
          </div>
        )}
        
        <div className="preview-description">
          <h4>Description</h4>
          <p>{formData.description}</p>
        </div>
        
        {videoPreviewUrl && (
          <div className="preview-video">
            <h4>Lesson Video</h4>
            <video src={videoPreviewUrl} controls width="100%" />
          </div>
        )}
        
        <div className="preview-content">
          <h4>Lesson Content</h4>
          <div dangerouslySetInnerHTML={{ __html: formData.content }} />
        </div>
        
        {sections.length > 0 && (
          <div className="preview-sections">
            <h4>Lesson Sections</h4>
            {sections.map((section, index) => (
              <div key={section.id || index} className="preview-section">
                <h5>{index + 1}. {section.title}</h5>
                <p>{section.content}</p>
              </div>
            ))}
          </div>
        )}
        
        {tagsArray.length > 0 && (
          <div className="preview-tags">
            <h4>Tags</h4>
            <div className="tags-container">
              {tagsArray.map((tag, index) => (
                <Badge key={index} bg="secondary" className="tag-badge">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="lesson-builder">
      <Card.Header>
        <div className="builder-header">
          <h3>{initialData ? 'Edit Lesson' : 'Create New Lesson'}</h3>
          <div className="header-actions">
            <Button 
              variant={isPreviewMode ? 'primary' : 'outline-primary'} 
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="preview-toggle"
            >
              {isPreviewMode ? (
                <>
                  <Pencil className="me-2" />
                  Edit Mode
                </>
              ) : (
                <>
                  <Eye className="me-2" />
                  Preview
                </>
              )}
            </Button>
          </div>
        </div>
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
        
        {isPreviewMode ? (
          renderPreview()
        ) : (
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
          >
            <Tab eventKey="details" title="Basic Details">
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Lesson Title*</Form.Label>
                      <Form.Control
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter a descriptive title"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Subject</Form.Label>
                      <Form.Control
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="e.g., Mathematics, Programming, Science"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Description*</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide a brief description of the lesson"
                    required
                  />
                </Form.Group>
                
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Difficulty Level</Form.Label>
                      <Form.Select
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={handleInputChange}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Duration (minutes)</Form.Label>
                      <Form.Control
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        min={1}
                        max={240}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tags (comma-separated)</Form.Label>
                      <Form.Control
                        type="text"
                        name="tags"
                        value={formData.tags}
                        onChange={handleInputChange}
                        placeholder="e.g., beginner, python, programming"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Tab>
            
            <Tab eventKey="content" title="Lesson Content">
              <div className="content-editor mb-4">
                <h5>Lesson Content</h5>
                <RichTextEditor 
                  initialContent={formData.content}
                  onChange={handleContentChange}
                />
              </div>
              
              <div className="sections-editor">
                <h5>Lesson Sections</h5>
                <p className="text-muted">Break your lesson into logical sections for better organization</p>
                
                <div className="sections-list mb-4">
                  {sections.map((section, index) => (
                    <div key={section.id || index} className="section-item">
                      <div className="section-content">
                        <h6>{index + 1}. {section.title}</h6>
                        <p>{section.content}</p>
                      </div>
                      <div className="section-actions">
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => handleMoveSection(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp />
                        </Button>
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => handleMoveSection(index, 'down')}
                          disabled={index === sections.length - 1}
                        >
                          <ArrowDown />
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleRemoveSection(index)}
                        >
                          <Trash />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Form className="add-section-form">
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Section Title</Form.Label>
                        <Form.Control
                          type="text"
                          name="title"
                          value={currentSection.title}
                          onChange={handleSectionChange}
                          placeholder="Enter section title"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Section Content</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          name="content"
                          value={currentSection.content}
                          onChange={handleSectionChange}
                          placeholder="Enter section content"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={2} className="d-flex align-items-end">
                      <Button 
                        variant="primary" 
                        onClick={handleAddSection}
                        className="w-100 mb-3"
                      >
                        Add Section
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </div>
            </Tab>
            
            <Tab eventKey="media" title="Media">
              <Row>
                <Col md={6}>
                  <div className="media-upload-section">
                    <h5>Lesson Video</h5>
                    <p className="text-muted">Upload a video for your lesson (optional)</p>
                    
                    <div className="upload-container">
                      {videoPreviewUrl ? (
                        <div className="video-preview">
                          <video src={videoPreviewUrl} controls width="100%" />
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => {
                              setVideoFile(null);
                              setVideoPreviewUrl('');
                            }}
                            className="remove-btn"
                          >
                            Remove Video
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="upload-placeholder"
                          onClick={() => document.getElementById('video-upload').click()}
                        >
                          <FileEarmarkPlus size={48} />
                          <p>Click to upload video</p>
                          <small>MP4, WebM, MOV (max 100MB)</small>
                        </div>
                      )}
                      <Form.Control
                        id="video-upload"
                        type="file"
                        accept="video/*"
                        onChange={handleVideoChange}
                        className="d-none"
                      />
                    </div>
                  </div>
                </Col>
                
                <Col md={6}>
                  <div className="media-upload-section">
                    <h5>Lesson Avatar/Thumbnail</h5>
                    <p className="text-muted">Upload an image to represent your lesson</p>
                    
                    <div className="upload-container">
                      {avatarPreviewUrl ? (
                        <div className="avatar-preview">
                          <img src={avatarPreviewUrl} alt="Lesson Avatar" />
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => {
                              setAvatarFile(null);
                              setAvatarPreviewUrl('');
                            }}
                            className="remove-btn"
                          >
                            Remove Image
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="upload-placeholder"
                          onClick={() => document.getElementById('avatar-upload').click()}
                        >
                          <Images size={48} />
                          <p>Click to upload image</p>
                          <small>JPG, PNG, WebP (max 5MB)</small>
                        </div>
                      )}
                      <Form.Control
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="d-none"
                      />
                    </div>
                  </div>
                </Col>
              </Row>
              
              {isUploading && (
                <div className="upload-progress mt-4">
                  <p>Uploading files...</p>
                  <ProgressBar 
                    now={uploadProgress} 
                    label={`${Math.round(uploadProgress)}%`} 
                    variant="primary" 
                  />
                </div>
              )}
            </Tab>
          </Tabs>
        )}
      </Card.Body>
      
      <Card.Footer>
        <div className="builder-actions">
          <Button 
            variant="secondary" 
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          
          <div className="action-buttons">
            <Button 
              variant="outline-primary" 
              onClick={() => handleSaveLesson('draft')}
              disabled={isUploading}
            >
              <Save className="me-2" />
              Save as Draft
            </Button>
            <Button 
              variant="primary" 
              onClick={() => handleSaveLesson('published')}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="me-2" />
                  Publish Lesson
                </>
              )}
            </Button>
          </div>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default LessonBuilder;