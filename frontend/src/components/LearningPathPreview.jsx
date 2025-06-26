import React from 'react';
import { Button, Card, Badge, ProgressBar } from 'react-bootstrap';
import { 
  BookmarkCheck, 
  Clock, 
  Award, 
  CheckCircle, 
  XCircle,
  PlayCircleFill
} from 'react-bootstrap-icons';
import './LearningPathPreview.scss';

const LearningPathPreview = ({ 
  learningPath, 
  hasLearningPath, 
  topic, 
  sectionsCount, 
  objectivesCount,
  timestamp 
}) => {
  // Extract the actual learning path data from the nested property
  // Use optional chaining to safely access 'learning_path' and fallback if it's not present
  const actualLearningPathData = learningPath?.learning_path || learningPath;

  // Add a check to ensure actualLearningPathData is available before proceeding
  if (!hasLearningPath || !actualLearningPathData) {
    return (
      <div className="learning-path-preview-loading">
        <p>No learning path available. Please generate one first.</p>
      </div>
    );
  }

  // Use optional chaining for all properties to prevent errors
  const sections = actualLearningPathData?.sections || [];
  const objectives = actualLearningPathData?.objectives || [];
  const dailyPlan = actualLearningPathData?.dailyPlan || [];
  const pathTopic = actualLearningPathData?.topic || topic || "Learning Path";
  
  return (
    <div className="learning-path-preview">
      <Card className="preview-card">
        <Card.Header className="preview-header">
          <div className="header-content">
            <h3 className="path-title">{pathTopic}</h3>
            <div className="path-meta">
              <Badge bg="primary" className="sections-badge">
                <BookmarkCheck className="me-1" />
                {sections.length} Sections
              </Badge>
              <Badge bg="info" className="objectives-badge">
                <Award className="me-1" />
                {objectives.length} Objectives
              </Badge>
              {dailyPlan && dailyPlan.length > 0 && (
                <Badge bg="success" className="days-badge">
                  <Clock className="me-1" />
                  {dailyPlan.length} Day Plan
                </Badge>
              )}
            </div>
          </div>
        </Card.Header>
        
        <Card.Body>
          {/* Objectives Section */}
          {objectives && objectives.length > 0 && (
            <div className="objectives-section mb-4">
              <h4 className="section-title">Learning Objectives</h4>
              <ul className="objectives-list">
                {objectives.map((objective, index) => (
                  <li key={index} className="objective-item">
                    <CheckCircle className="objective-icon" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Sections Preview */}
          <div className="sections-preview">
            <h4 className="section-title">Course Sections</h4>
            {sections && sections.map((section, index) => (
              <Card key={index} className="section-card mb-3">
                <Card.Body>
                  <div className="section-header">
                    <h5 className="section-name">
                      <span className="section-number">{index + 1}</span>
                      {section.title}
                    </h5>
                  </div>
                  
                  <p className="section-description">{section.description}</p>
                  
                  {section.resources && section.resources.length > 0 && (
                    <div className="section-resources">
                      <h6 className="resources-title">Resources</h6>
                      <div className="resources-list">
                        {section.resources.map((resource, i) => (
                          <Badge key={i} bg="light" text="dark" className="resource-badge">
                            {resource}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="section-status">
                    <span className={`status-indicator ${section.completed ? 'completed' : 'pending'}`}>
                      {section.completed ? (
                        <>
                          <CheckCircle className="me-1" />
                          Completed
                        </>
                      ) : (
                        <>
                          <XCircle className="me-1" />
                          Pending
                        </>
                      )}
                    </span>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
          
          {/* Daily Plan Preview */}
          {dailyPlan && dailyPlan.length > 0 && (
            <div className="daily-plan-preview mt-4">
              <h4 className="section-title">Daily Study Plan</h4>
              {dailyPlan.map((day, index) => (
                <Card key={index} className="day-card mb-3">
                  <Card.Body>
                    <div className="day-header">
                      <h5 className="day-title">Day {index + 1}</h5>
                      <Badge bg="info" className="time-badge">
                        <Clock className="me-1" />
                        {day.duration || "30 minutes"}
                      </Badge>
                    </div>
                    
                    <p className="day-description">{day.activities}</p>
                    
                    {day.focus && (
                      <div className="day-focus">
                        <h6 className="focus-title">Focus Areas</h6>
                        <p>{day.focus}</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Card.Body>
        
        <Card.Footer className="preview-footer">
          <div className="progress-section">
            <div className="progress-header">
              <span>Overall Progress</span>
              <span>{Math.round(learningPath?.progress || 0)}%</span>
            </div>
            <ProgressBar 
              now={learningPath?.progress || 0} 
              variant="primary"
              className="progress-bar"
            />
          </div>
          
          <div className="action-buttons">
            <Button variant="primary" className="start-btn">
              <PlayCircleFill className="me-2" />
              Start Learning
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default LearningPathPreview;