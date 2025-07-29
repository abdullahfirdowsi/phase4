import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Button, ProgressBar, Badge, Alert } from 'react-bootstrap';
import { 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  CheckCircle, 
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
  
  // Debug: Log the learningPath.id to see what we're getting
  console.log('🔍 LearningPathStepper received learningPath ID:', learningPath?.id);
  console.log('🔍 LearningPathStepper received learningPath name:', learningPath?.name);
  
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
        learningPathId: learningPath.id,
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
          const initialQuizResults = {};
          let resumeTopicIndex = 0;
          
          processedTopics.forEach((topic, index) => {
            const isCompleted = completedTopicsSet.has(index);
            const topicProgressData = progressData.topicProgress?.[index] || {};
            const quizScore = topicProgressData.quiz_score || 0;
            
            // Use the actual length of completedLessonIds array as the source of truth
            const completedLessonIds = topicProgressData.completedLessonIds || [];
            const actualCompletedCount = completedLessonIds.length;
            
            initialProgress[index] = {
              totalLessons: topic.lessons.length,
              completedLessons: actualCompletedCount, // Use actual count from IDs array
              completedLessonIds: completedLessonIds,
              quizPassed: isCompleted,
              quizScore: quizScore,
              quizAttempted: isCompleted || quizScore > 0 // Mark as attempted if topic completed or has a score
            };
            
            // Populate quiz results if quiz was completed
            if (isCompleted && quizScore > 0) {
              initialQuizResults[index] = {
                score: quizScore,
                passed: quizScore >= 80,
                details: [] // We don't have detailed results from backend, but that's okay
              };
            }
            
            if (isCompleted) {
              resumeTopicIndex = Math.max(resumeTopicIndex, index + 1);
            }
          });
          
          // Resume from the correct topic (last completed + 1, or 0 if none completed)
          setCurrentTopicIndex(Math.min(resumeTopicIndex, processedTopics.length - 1));
          setTopicProgress(initialProgress);
          setQuizResults(initialQuizResults);
          setCompletedTopics(completedTopicsSet);
          
          console.log('📊 Progress loaded from backend:', {
            completedTopics: completedTopicsSet.size,
            resumeFrom: resumeTopicIndex,
            totalTopics: processedTopics.length,
            quizResults: initialQuizResults,
            progressData: progressData,
            initialProgress: initialProgress
          });
          
          // Debug each topic's progress in detail
          processedTopics.forEach((topic, index) => {
            const progress = initialProgress[index];
            console.log(`🔍 Topic ${index} (${topic.name}) progress:`, {
              totalLessons: progress.totalLessons,
              completedLessons: progress.completedLessons,
              completedLessonIds: progress.completedLessonIds,
              quizPassed: progress.quizPassed,
              quizScore: progress.quizScore
            });
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
        const initialQuizResults = {};
        let resumeTopicIndex = 0;
        let completedTopicsSet = new Set();
        
        processedTopics.forEach((topic, index) => {
          const isCompleted = topic.quiz_passed && topic.quiz_score >= 80;
          const quizScore = topic.quiz_score || 0;
          
          // Generate completed lesson IDs based on count (fallback)
          const completedLessonIds = [];
          for (let i = 0; i < (topic.completed_lessons || 0) && i < topic.lessons.length; i++) {
            completedLessonIds.push(topic.lessons[i].id);
          }
          
          initialProgress[index] = {
            totalLessons: topic.lessons.length,
            completedLessons: topic.completed_lessons || 0,
            completedLessonIds: completedLessonIds,
            quizPassed: isCompleted,
            quizScore: quizScore
          };
          
          // Populate quiz results if quiz was completed
          if (isCompleted && quizScore > 0) {
            initialQuizResults[index] = {
              score: quizScore,
              passed: quizScore >= 80,
              details: []
            };
          }
          
          if (isCompleted) {
            completedTopicsSet.add(index);
            resumeTopicIndex = Math.max(resumeTopicIndex, index + 1);
          }
        });
        
        // Resume from the correct topic (last completed + 1, or 0 if none completed)
        setCurrentTopicIndex(Math.min(resumeTopicIndex, processedTopics.length - 1));
        setTopicProgress(initialProgress);
        setQuizResults(initialQuizResults);
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

  // Handle lesson completion
  const handleLessonComplete = useCallback((lessonId) => {
    console.log('📝 LearningPathStepper: Handling lesson completion', {
      lessonId,
      currentTopicIndex,
      topicName: currentTopic?.name
    });
    
    setTopicProgress(prev => {
      const updated = { ...prev };
      const currentProgress = updated[currentTopicIndex] || {
        totalLessons: currentTopic?.lessons?.length || 0,
        completedLessons: 0,
        completedLessonIds: [],
        quizPassed: false,
        quizScore: 0
      };
      const currentCompletedIds = currentProgress.completedLessonIds || [];
      
      // Add lesson ID to completed list if not already there
      const newCompletedIds = currentCompletedIds.includes(lessonId) 
        ? currentCompletedIds 
        : [...currentCompletedIds, lessonId];
      
      // Update both count and IDs
      updated[currentTopicIndex] = {
        ...currentProgress,
        completedLessons: newCompletedIds.length,
        completedLessonIds: newCompletedIds,
        totalLessons: currentTopic?.lessons?.length || 0
      };
      
      console.log('📊 Updated topic progress:', {
        topicIndex: currentTopicIndex,
        newProgress: updated[currentTopicIndex],
        allProgress: updated
      });
      
      return updated;
    });

    // Auto-trigger quiz for first-time completion, manual for retries
    setTimeout(() => {
      const updatedProgress = topicProgress[currentTopicIndex];
      const totalLessons = currentTopic?.lessons?.length || 0;
      const completedCount = (updatedProgress?.completedLessonIds || []).length;
      const hasAttemptedQuiz = updatedProgress?.quizAttempted;
      
      console.log('🔍 Checking if quiz should auto-trigger:', {
        completedCount,
        totalLessons,
        hasAttemptedQuiz,
        shouldAutoTrigger: completedCount >= totalLessons && totalLessons > 0 && !hasAttemptedQuiz
      });
      
      // Auto-trigger quiz only if:
      // 1. All lessons are completed
      // 2. Topic has lessons
      // 3. Quiz has never been attempted (first time)
      if (completedCount >= totalLessons && totalLessons > 0 && !hasAttemptedQuiz) {
        console.log('🚀 Auto-triggering quiz for first-time completion');
        handleTopicComplete();
      }
    }, 100);
  }, [currentTopicIndex, currentTopic, topicProgress, handleTopicComplete]);

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
          quizScore: score,
          quizAttempted: true // Track that quiz was attempted
        }
      }));

      if (passed) {
        // Mark topic as completed
        setCompletedTopics(prev => new Set([...prev, currentTopicIndex]));
        
        // Send completion to backend with the actual quiz score
        await markTopicComplete(currentTopic.topicIndex, score);
        
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
  const markTopicComplete = async (topicIndex, quizScore = 0) => {
    try {
      const result = await markTopicCompleteAPI(
        learningPath.id || learningPath.name,
        topicIndex,
        quizScore
      );
      
      console.log('✅ Topic marked as complete in backend:', result);
    } catch (error) {
      console.warn('Failed to save topic completion to backend:', error);
      // Don't throw - allow UI to continue working
    }
  };

  // Calculate final score
  const calculateFinalScore = useCallback(() => {
    const validScores = Object.values(quizResults)
      .filter(result => result && typeof result.score === 'number' && result.score > 0)
      .map(result => result.score);
    return validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
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
    if (isCurrentTopicComplete() || topicProgress[currentTopicIndex]?.quizAttempted) {
      // Pass the learning path ID and topic index to the quiz
      const topicWithContext = {
        ...currentTopic,
        learningPathId: learningPath.id || learningPath.name,
        topicIndex: currentTopicIndex
      };
      
      setCurrentQuizTopic(topicWithContext);
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
            <div className="mb-3">
              <h4 className="mb-1">{learningPath.name}</h4>
              <p className="text-muted mb-0">{learningPath.description}</p>
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

        {/* Quiz Status Alert - Unified for errors and retry opportunities */}
        {error && (
          <Alert variant="warning" dismissible onClose={() => setError(null)} className="mb-4">
            <div className="d-flex justify-content-between align-items-center">
              <span>{error}</span>
              {(isCurrentTopicComplete() || topicProgress[currentTopicIndex]?.quizAttempted) && !canProceedToNext() && (
                <Button variant="outline-warning" size="sm" onClick={handleRetryQuiz}>
                  Retry Quiz
                </Button>
              )}
            </div>
          </Alert>
        )}
        
        {/* Quiz Available - Show when all lessons are completed */}
        {(() => {
          const currentProgress = topicProgress[currentTopicIndex];
          const allLessonsComplete = currentProgress && currentProgress.completedLessons >= currentProgress.totalLessons && currentProgress.totalLessons > 0;
          const quizNotPassed = !currentProgress?.quizPassed;
          const shouldShowQuiz = !error && allLessonsComplete && quizNotPassed;
          
          // Debug logging
          console.log('🔍 Quiz availability check:', {
            currentTopicIndex,
            topicName: currentTopic?.name,
            currentProgress,
            allLessonsComplete,
            quizNotPassed,
            shouldShowQuiz,
            error: !!error
          });
          
          return shouldShowQuiz ? (
            <Alert variant="info" className="mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Ready for Quiz!</strong>
                  <div className="small text-muted">
                    {currentProgress?.quizAttempted 
                      ? `Previous score: ${currentProgress?.quizScore || 0}% • Need 80% to proceed`
                      : 'Complete the quiz to proceed to the next topic • Need 80% to pass'
                    }
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={handleTopicComplete}>
                  {currentProgress?.quizAttempted ? 'Retry Quiz' : 'Take Quiz'}
                </Button>
              </div>
            </Alert>
          ) : null;
        })()}

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
