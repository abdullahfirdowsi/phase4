import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Button, ProgressBar, Badge, Alert } from 'react-bootstrap';
import { 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  CheckCircle, 
  BookOpen, 
  Award,
  TrophyFill,
  Clock
} from 'react-bootstrap-icons';
import TopicPage from './TopicPage';
import QuizModal from './QuizModal';
import { getLearningPathProgress, markTopicComplete as markTopicCompleteAPI } from '../../api';
import './LearningPathStepper.scss';

const LearningPathStepper = ({ learningPath, onComplete, onExit }) => {
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [topicProgress, setTopicProgress] = useState({});
  const [completedTopics, setCompletedTopics] = useState(new Set());
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentQuizTopic, setCurrentQuizTopic] = useState(null);
  const [quizResults, setQuizResults] = useState({});
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const username = localStorage.getItem('username');
  
  // Memoized topics array with subtopics flattened into lessons
  const processedTopics = useMemo(() => {
    if (!learningPath?.topics) return [];
    
    return learningPath.topics.map((topic, index) => {
      // Convert subtopics to lessons with proper structure
      const lessons = [];
      
      // Handle different subtopic formats
      if (topic.subtopics && Array.isArray(topic.subtopics)) {
        topic.subtopics.forEach((subtopic, subIndex) => {
          let lesson;
          
          if (typeof subtopic === 'string') {
            // Simple string subtopic
            lesson = {
              id: `${index}-${subIndex}`,
              title: subtopic,
              description: `Learn about ${subtopic}`,
              completed: false,
              type: 'lesson'
            };
          } else if (typeof subtopic === 'object' && subtopic !== null) {
            // Object subtopic with name and description
            lesson = {
              id: `${index}-${subIndex}`,
              title: subtopic.name || subtopic.title || `Lesson ${subIndex + 1}`,
              description: subtopic.description || `Learn about ${subtopic.name || 'this topic'}`,
              completed: false,
              type: 'lesson',
              resources: subtopic.resources || [],
              time_required: subtopic.time_required || '30 minutes'
            };
          }
          
          if (lesson) {
            lessons.push(lesson);
          }
        });
      }
      
      // If no subtopics, create a default lesson
      if (lessons.length === 0) {
        lessons.push({
          id: `${index}-0`,
          title: `${topic.name} Overview`,
          description: topic.description || `Study the fundamentals of ${topic.name}`,
          completed: false,
          type: 'lesson'
        });
      }
      
      return {
        ...topic,
        topicIndex: index,
        lessons,
        // Standardize completion tracking
        quiz_passed: topic.quiz_passed || false,
        quiz_score: topic.quiz_score || 0,
        completed_lessons: topic.completed_lessons || 0,
        // Maintain backward compatibility
        completed: topic.completed || topic.quiz_passed || false
      };
    });
  }, [learningPath]);

  // Load progress from backend on component mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!learningPath?.id || !username) return;
      
      try {
        const progressData = await getLearningPathProgress(learningPath.id);
        
        if (progressData && progressData.completedTopics) {
          const completedTopicsSet = new Set(progressData.completedTopics);
          const initialProgress = {};
          let resumeTopicIndex = 0;
          
          processedTopics.forEach((topic, index) => {
            const isCompleted = completedTopicsSet.has(index);
            const topicProgressData = progressData.topicProgress?.[index] || {};
            
            initialProgress[index] = {
              totalLessons: topic.lessons.length,
              completedLessons: topicProgressData.completedLessons || 0,
              quizPassed: isCompleted,
              quizScore: topicProgressData.quizScore || 0
            };
            
            if (isCompleted) {
              resumeTopicIndex = Math.max(resumeTopicIndex, index + 1);
            }
          });
          
          // Resume from the correct topic (last completed + 1, or 0 if none completed)
          setCurrentTopicIndex(Math.min(resumeTopicIndex, processedTopics.length - 1));
          setTopicProgress(initialProgress);
          setCompletedTopics(completedTopicsSet);
          
          console.log('📊 Progress loaded from backend:', {
            completedTopics: completedTopicsSet.size,
            resumeFrom: resumeTopicIndex,
            totalTopics: processedTopics.length
          });
        }
      } catch (error) {
        console.warn('Failed to load progress from backend:', error);
        // Fall back to local initialization
        initializeLocalProgress();
      }
    };
    
    const initializeLocalProgress = () => {
      if (processedTopics.length > 0) {
        const initialProgress = {};
        let resumeTopicIndex = 0;
        let completedTopicsSet = new Set();
        
        processedTopics.forEach((topic, index) => {
          const isCompleted = topic.quiz_passed && topic.quiz_score >= 80;
          initialProgress[index] = {
            totalLessons: topic.lessons.length,
            completedLessons: topic.completed_lessons || 0,
            quizPassed: isCompleted,
            quizScore: topic.quiz_score || 0
          };
          
          if (isCompleted) {
            completedTopicsSet.add(index);
            resumeTopicIndex = Math.max(resumeTopicIndex, index + 1);
          }
        });
        
        // Resume from the correct topic (last completed + 1, or 0 if none completed)
        setCurrentTopicIndex(Math.min(resumeTopicIndex, processedTopics.length - 1));
        setTopicProgress(initialProgress);
        setCompletedTopics(completedTopicsSet);
      }
    };
    
    if (processedTopics.length > 0) {
      loadProgress();
    }
  }, [processedTopics, learningPath?.id, username]);

  const currentTopic = processedTopics[currentTopicIndex];
  const totalTopics = processedTopics.length;

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (totalTopics === 0) return 0;
    return (completedTopics.size / totalTopics) * 100;
  }, [completedTopics.size, totalTopics]);

  // Check if current topic is completed (all lessons done)
  const isCurrentTopicComplete = useCallback(() => {
    if (!currentTopic) return false;
    const progress = topicProgress[currentTopicIndex];
    return progress && progress.completedLessons >= progress.totalLessons;
  }, [currentTopic, topicProgress, currentTopicIndex]);

  // Check if user can proceed to next topic
  const canProceedToNext = useCallback(() => {
    const progress = topicProgress[currentTopicIndex];
    return progress && progress.quizPassed;
  }, [topicProgress, currentTopicIndex]);

  // Handle lesson completion
  const handleLessonComplete = useCallback((lessonId) => {
    setTopicProgress(prev => {
      const updated = { ...prev };
      const currentProgress = updated[currentTopicIndex] || {};
      
      // Mark lesson as completed and increment counter
      const newCompletedCount = Math.min(
        (currentProgress.completedLessons || 0) + 1,
        currentTopic?.lessons.length || 0
      );
      
      updated[currentTopicIndex] = {
        ...currentProgress,
        completedLessons: newCompletedCount
      };
      
      return updated;
    });

    // If all lessons are completed, trigger quiz
    const progress = topicProgress[currentTopicIndex];
    if (progress && (progress.completedLessons + 1) >= (currentTopic?.lessons.length || 0)) {
      setTimeout(() => {
        handleTopicComplete();
      }, 500);
    }
  }, [currentTopicIndex, currentTopic, topicProgress]);

  // Handle topic completion - trigger quiz
  const handleTopicComplete = useCallback(() => {
    if (!currentTopic) return;
    
    // Pass the learning path ID and topic index to the quiz
    const topicWithContext = {
      ...currentTopic,
      learningPathId: learningPath.id || learningPath.name,
      topicIndex: currentTopicIndex
    };
    
    setCurrentQuizTopic(topicWithContext);
    setShowQuizModal(true);
  }, [currentTopic, learningPath, currentTopicIndex]);

  // Handle quiz completion
  const handleQuizComplete = useCallback(async (quizResult) => {
    setIsProcessing(true);
    setError(null);

    try {
      const { score, passed } = quizResult;
      
      // Update quiz results
      setQuizResults(prev => ({
        ...prev,
        [currentTopicIndex]: quizResult
      }));

      // Update topic progress
      setTopicProgress(prev => ({
        ...prev,
        [currentTopicIndex]: {
          ...prev[currentTopicIndex],
          quizPassed: passed,
          quizScore: score
        }
      }));

      if (passed) {
        // Mark topic as completed
        setCompletedTopics(prev => new Set([...prev, currentTopicIndex]));
        
        // Send completion to backend
        await markTopicComplete(currentTopic.topicIndex);
        
        setShowQuizModal(false);
        
        // Auto-advance to next topic if available
        if (currentTopicIndex < totalTopics - 1) {
          setTimeout(() => {
            setCurrentTopicIndex(prev => prev + 1);
          }, 1000);
        } else {
          // Learning path completed!
          onComplete?.({
            totalTopics,
            completedTopics: completedTopics.size + 1,
            finalScore: calculateFinalScore()
          });
        }
      } else {
        setShowQuizModal(false);
        setError(`Quiz score: ${score}%. You need at least 80% to proceed. Please review the lessons and try again.`);
      }
    } catch (error) {
      console.error('Error handling quiz completion:', error);
      setError('Failed to save quiz result. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [currentTopicIndex, currentTopic, totalTopics, completedTopics.size, onComplete]);

  // Mark topic as complete in backend
  const markTopicComplete = async (topicIndex) => {
    try {
      const result = await markTopicCompleteAPI(
        learningPath.id || learningPath.name,
        topicIndex,
        quizResults[topicIndex]?.score || 0
      );
      
      console.log('✅ Topic marked as complete in backend:', result);
    } catch (error) {
      console.warn('Failed to save topic completion to backend:', error);
      // Don't throw - allow UI to continue working
    }
  };

  // Calculate final score
  const calculateFinalScore = useCallback(() => {
    const scores = Object.values(quizResults).map(result => result.score || 0);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }, [quizResults]);

  // Navigation handlers
  const handlePrevious = () => {
    if (currentTopicIndex > 0) {
      setCurrentTopicIndex(prev => prev - 1);
      setError(null);
    }
  };

  const handleNext = () => {
    if (canProceedToNext() && currentTopicIndex < totalTopics - 1) {
      setCurrentTopicIndex(prev => prev + 1);
      setError(null);
    }
  };

  // Retry quiz handler
  const handleRetryQuiz = () => {
    if (isCurrentTopicComplete()) {
      setCurrentQuizTopic(currentTopic);
      setShowQuizModal(true);
      setError(null);
    }
  };

  if (!learningPath || !currentTopic) {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          Learning path data is not available. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <div className="learning-path-stepper">
      <Container fluid className="px-0">
        {/* Header with progress */}
        <Card className="stepper-header mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h4 className="mb-1">{learningPath.name}</h4>
                <p className="text-muted mb-0">{learningPath.description}</p>
              </div>
              <Button variant="outline-secondary" size="sm" onClick={onExit}>
                Exit Learning Path
              </Button>
            </div>
            
            {/* Overall Progress */}
            <div className="progress-section">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Overall Progress</span>
                <span className="fw-bold">{Math.round(overallProgress)}%</span>
              </div>
              <ProgressBar 
                now={overallProgress} 
                variant="success"
                className="mb-2"
              />
              <div className="d-flex justify-content-between text-sm text-muted">
                <span>{completedTopics.size} of {totalTopics} topics completed</span>
                <span>
                  <Clock className="me-1" size={14} />
                  Est. {learningPath.duration || 'Unknown duration'}
                </span>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Topic Stepper Navigation */}
        <Card className="stepper-nav mb-4">
          <Card.Body>
            <div className="topic-stepper">
              {processedTopics.map((topic, index) => (
                <div key={index} className={`stepper-item ${index === currentTopicIndex ? 'active' : ''}`}>
                  <div className="stepper-marker">
                    {completedTopics.has(index) ? (
                      <CheckCircle className="text-success" size={24} />
                    ) : index === currentTopicIndex ? (
                      <div className="current-marker">{index + 1}</div>
                    ) : index < currentTopicIndex ? (
                      <div className="past-marker">{index + 1}</div>
                    ) : (
                      <Lock className="text-muted" size={20} />
                    )}
                  </div>
                  <div className="stepper-content">
                    <div className="stepper-title">{topic.name}</div>
                    <div className="stepper-meta">
                      {topic.lessons.length} lessons
                      {completedTopics.has(index) && (
                        <Badge bg="success" className="ms-2">
                          <TrophyFill size={12} className="me-1" />
                          Quiz Passed
                        </Badge>
                      )}
                    </div>
                  </div>
                  {index < processedTopics.length - 1 && (
                    <div className={`stepper-connector ${completedTopics.has(index) ? 'completed' : ''}`} />
                  )}
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="warning" dismissible onClose={() => setError(null)} className="mb-4">
            <div className="d-flex justify-content-between align-items-center">
              <span>{error}</span>
              {isCurrentTopicComplete() && !canProceedToNext() && (
                <Button variant="outline-warning" size="sm" onClick={handleRetryQuiz}>
                  Retry Quiz
                </Button>
              )}
            </div>
          </Alert>
        )}

        {/* Current Topic Content */}
        <TopicPage
          topic={currentTopic}
          progress={topicProgress[currentTopicIndex]}
          onLessonComplete={handleLessonComplete}
          isCompleted={completedTopics.has(currentTopicIndex)}
          quizResult={quizResults[currentTopicIndex]}
        />

        {/* Navigation Controls */}
        <Card className="stepper-controls mt-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <Button
                variant="outline-secondary"
                onClick={handlePrevious}
                disabled={currentTopicIndex === 0}
              >
                <ChevronLeft className="me-2" />
                Previous Topic
              </Button>
              
              <div className="topic-counter">
                Topic {currentTopicIndex + 1} of {totalTopics}
              </div>
              
              {currentTopicIndex < totalTopics - 1 ? (
                <Button
                  variant={canProceedToNext() ? "primary" : "outline-secondary"}
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                >
                  Next Topic
                  <ChevronRight className="ms-2" />
                  {!canProceedToNext() && (
                    <Lock className="ms-2" size={16} />
                  )}
                </Button>
              ) : (
                <Button
                  variant={canProceedToNext() ? "success" : "outline-secondary"}
                  onClick={() => onComplete?.({
                    totalTopics,
                    completedTopics: completedTopics.size,
                    finalScore: calculateFinalScore()
                  })}
                  disabled={!canProceedToNext()}
                >
                  <Award className="me-2" />
                  Complete Learning Path
                </Button>
              )}
            </div>
            
            {!canProceedToNext() && currentTopicIndex < totalTopics - 1 && (
              <div className="text-center mt-3 text-muted">
                <Lock size={16} className="me-2" />
                Complete all lessons and pass the quiz to unlock the next topic
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Quiz Modal */}
        <QuizModal
          show={showQuizModal}
          topic={currentQuizTopic}
          onClose={() => setShowQuizModal(false)}
          onComplete={handleQuizComplete}
          isProcessing={isProcessing}
        />
      </Container>
    </div>
  );
};

export default LearningPathStepper;
