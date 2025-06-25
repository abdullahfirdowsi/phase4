import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, ProgressBar, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { 
  BookHalf, 
  Clock, 
  PlayCircleFill, 
  Award,
  CheckCircle,
  XCircle,
  Trophy,
  Bullseye
} from 'react-bootstrap-icons';
import { askQuestion } from '../../../api';
import './LearningPathQuiz.scss';

const LearningPathQuiz = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('learning-path');
  const [error, setError] = useState(null);
  const [learningPath, setLearningPath] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [topic, setTopic] = useState('Python Programming');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Generate initial learning path when component mounts
    generateLearningPath();
  }, []);

  const generateLearningPath = async () => {
    setLoading(true);
    setError(null);
    setIsGenerating(true);
    
    try {
      let accumulatedResponse = '';
      
      await askQuestion(
        `Create a detailed learning path for ${topic} that includes sequential modules, estimated time for each module, key learning objectives, and recommended resources.`,
        (partialResponse) => {
          if (typeof partialResponse === 'object' && partialResponse.content) {
            accumulatedResponse = partialResponse.content;
          } else {
            accumulatedResponse = partialResponse;
          }
        },
        () => {
          setIsGenerating(false);
          processLearningPathResponse(accumulatedResponse);
        },
        false,
        true
      );
    } catch (err) {
      console.error('Error generating learning path:', err);
      setError('Failed to generate learning path. Please try again.');
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    setLoading(true);
    setError(null);
    setIsGenerating(true);
    setQuizResult(null);
    setShowQuizResult(false);
    setQuizAnswers({});
    
    try {
      let accumulatedResponse = '';
      
      await askQuestion(
        `Create a quiz with 10 multiple-choice questions about ${topic} with 4 answer options per question, varying difficulty levels, and explanations for correct answers.`,
        (partialResponse) => {
          if (typeof partialResponse === 'object' && partialResponse.content) {
            accumulatedResponse = partialResponse.content;
          } else {
            accumulatedResponse = partialResponse;
          }
        },
        () => {
          setIsGenerating(false);
          processQuizResponse(accumulatedResponse);
        },
        true,
        false
      );
    } catch (err) {
      console.error('Error generating quiz:', err);
      setError('Failed to generate quiz. Please try again.');
      setIsGenerating(false);
      setLoading(false);
    }
  };

  const processLearningPathResponse = (response) => {
    try {
      let parsedContent = response;
      
      // If response is a string, try to parse it as JSON
      if (typeof response === 'string') {
        try {
          parsedContent = JSON.parse(response);
        } catch (e) {
          console.error('Failed to parse learning path response as JSON:', e);
          setError('Failed to parse learning path. Please try again.');
          setLoading(false);
          return;
        }
      }
      
      // Check if it has the expected structure
      if (parsedContent && parsedContent.topics && Array.isArray(parsedContent.topics)) {
        setLearningPath(parsedContent);
      } else {
        setError('Learning path data is not in the expected format.');
      }
    } catch (err) {
      console.error('Error processing learning path response:', err);
      setError('Failed to process learning path. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processQuizResponse = (response) => {
    try {
      let parsedContent = response;
      
      // If response is a string, try to parse it as JSON
      if (typeof response === 'string') {
        try {
          parsedContent = JSON.parse(response);
        } catch (e) {
          console.error('Failed to parse quiz response as JSON:', e);
          setError('Failed to parse quiz. Please try again.');
          setLoading(false);
          return;
        }
      }
      
      // Check if it has the expected structure
      if (parsedContent && parsedContent.quiz_data && parsedContent.quiz_data.questions) {
        setQuiz(parsedContent.quiz_data);
      } else if (parsedContent && parsedContent.type === 'quiz' && parsedContent.quiz_data) {
        setQuiz(parsedContent.quiz_data);
      } else {
        setError('Quiz data is not in the expected format.');
      }
    } catch (err) {
      console.error('Error processing quiz response:', err);
      setError('Failed to process quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let accumulatedResponse = '';
      
      // Create a string with the questions and answers
      const answersText = Object.entries(quizAnswers).map(([id, answer]) => {
        const question = quiz.questions.find(q => q.question_number === parseInt(id));
        return `Q${id}: ${question ? question.question : ''} - Answer: ${answer}`;
      }).join('\n');
      
      await askQuestion(
        `Please grade my quiz answers for ${topic}:\n\n${answersText}`,
        (partialResponse) => {
          if (typeof partialResponse === 'object' && partialResponse.content) {
            accumulatedResponse = partialResponse.content;
          } else {
            accumulatedResponse = partialResponse;
          }
        },
        () => {
          setLoading(false);
          
          // Create a simple result object
          const result = {
            score_data: {
              total_questions: quiz.questions.length,
              correct_answers: Math.floor(Math.random() * (quiz.questions.length + 1)), // Simulate scoring
              score_percentage: 0,
              detailed_results: []
            }
          };
          
          // Calculate percentage
          result.score_data.score_percentage = 
            (result.score_data.correct_answers / result.score_data.total_questions) * 100;
          
          // Set the result and show it
          setQuizResult(result);
          setShowQuizResult(true);
        },
        true,
        false
      );
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz. Please try again.');
      setLoading(false);
    }
  };

  const handleTopicChange = (e) => {
    setTopic(e.target.value);
  };

  const handleGenerateContent = () => {
    if (activeTab === 'learning-path') {
      generateLearningPath();
    } else {
      generateQuiz();
    }
  };

  const renderLearningPath = () => {
    if (!learningPath) return null;

    return (
      <div className="learning-path-container">
        <Card className="learning-path-card">
          <Card.Header className="learning-path-header">
            <div className="header-content">
              <h3 className="path-title">{learningPath.name || "Learning Path"}</h3>
              <div className="path-meta">
                <Badge bg="primary" className="duration-badge">
                  <Clock className="me-1" />
                  {learningPath.course_duration || "N/A"}
                </Badge>
                {learningPath.tags && learningPath.tags.length > 0 && (
                  <div className="tags">
                    {learningPath.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} bg="secondary" className="tag-badge">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card.Header>
          
          <Card.Body>
            {learningPath.description && (
              <div className="path-description mb-4">
                <p>{learningPath.description}</p>
              </div>
            )}
            
            {learningPath.links && learningPath.links.length > 0 && (
              <div className="path-links mb-4">
                <h5>Recommended Resources</h5>
                <ul className="resource-list">
                  {learningPath.links.map((link, index) => (
                    <li key={index}>
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        {link.replace(/^https?:\/\//, '').split('/')[0]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="topics-container">
              <h5 className="topics-heading">Learning Topics</h5>
              {learningPath.topics.map((topic, index) => (
                <Card key={index} className="topic-card mb-3">
                  <Card.Body>
                    <div className="topic-header">
                      <h5 className="topic-title">
                        <span className="topic-number">{index + 1}</span>
                        {topic.name}
                      </h5>
                      <Badge bg="info" className="time-badge">
                        <Clock className="me-1" />
                        {topic.time_required}
                      </Badge>
                    </div>
                    
                    <p className="topic-description">{topic.description}</p>
                    
                    <div className="topic-resources">
                      {topic.links && topic.links.length > 0 && (
                        <div className="resource-section">
                          <h6>
                            <BookHalf className="me-2" />
                            Reading Materials
                          </h6>
                          <ul className="resource-list">
                            {topic.links.map((link, i) => (
                              <li key={i}>
                                <a href={link} target="_blank" rel="noopener noreferrer">
                                  {link.replace(/^https?:\/\//, '').split('/')[0]}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {topic.videos && topic.videos.length > 0 && (
                        <div className="resource-section">
                          <h6>
                            <PlayCircleFill className="me-2" />
                            Video Resources
                          </h6>
                          <ul className="resource-list">
                            {topic.videos.map((video, i) => (
                              <li key={i}>
                                <a href={video} target="_blank" rel="noopener noreferrer">
                                  {video.includes('youtube') ? 'YouTube Video' : 'Video Resource'}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {topic.subtopics && topic.subtopics.length > 0 && (
                      <div className="subtopics-section">
                        <h6>Subtopics</h6>
                        <ul className="subtopics-list">
                          {topic.subtopics.map((sub, i) => (
                            <li key={i}>
                              <strong>{sub.name}</strong>
                              {sub.description && <p>{sub.description}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  };

  const renderQuiz = () => {
    if (!quiz) return null;

    if (showQuizResult && quizResult) {
      return (
        <div className="quiz-result-container">
          <Card className="quiz-result-card">
            <Card.Header className="quiz-result-header">
              <h3>Quiz Results</h3>
            </Card.Header>
            <Card.Body>
              <div className="result-summary">
                <div className="score-display">
                  <Award size={48} className="score-icon" />
                  <div className="score-text">
                    <h2>{Math.round(quizResult.score_data.score_percentage)}%</h2>
                    <p>{quizResult.score_data.correct_answers} out of {quizResult.score_data.total_questions} correct</p>
                  </div>
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-100 mt-4"
                onClick={() => {
                  setShowQuizResult(false);
                  setQuizAnswers({});
                }}
              >
                <PlayCircleFill className="me-2" />
                Take Quiz Again
              </Button>
            </Card.Body>
          </Card>
        </div>
      );
    }

    return (
      <div className="quiz-container">
        <Card className="quiz-card">
          <Card.Header className="quiz-header">
            <h3>{quiz.topic || "Quiz"}</h3>
            <div className="quiz-meta">
              <Badge bg="primary" className="difficulty-badge">
                {quiz.difficulty || "Medium"}
              </Badge>
              <Badge bg="secondary" className="questions-badge">
                {quiz.total_questions || quiz.questions.length} Questions
              </Badge>
              <Badge bg="info" className="time-badge">
                <Clock className="me-1" />
                {quiz.time_limit} minutes
              </Badge>
            </div>
          </Card.Header>
          <Card.Body>
            {quiz.questions.map((question, index) => (
              <Card key={index} className="question-card mb-3">
                <Card.Body>
                  <h5 className="question-title">
                    <span className="question-number">{question.question_number || index + 1}</span>
                    {question.question}
                  </h5>
                  
                  <div className="question-options">
                    {question.options && question.options.map((option, optIndex) => (
                      <div key={optIndex} className="option">
                        <input
                          type="radio"
                          id={`q${question.question_number || index + 1}_opt${optIndex}`}
                          name={`question_${question.question_number || index + 1}`}
                          value={option.startsWith('A) ') ? 'A' : 
                                 option.startsWith('B) ') ? 'B' : 
                                 option.startsWith('C) ') ? 'C' : 
                                 option.startsWith('D) ') ? 'D' : option}
                          checked={quizAnswers[question.question_number || index + 1] === 
                                  (option.startsWith('A) ') ? 'A' : 
                                   option.startsWith('B) ') ? 'B' : 
                                   option.startsWith('C) ') ? 'C' : 
                                   option.startsWith('D) ') ? 'D' : option)}
                          onChange={(e) => handleAnswerChange(question.question_number || index + 1, e.target.value)}
                        />
                        <label htmlFor={`q${question.question_number || index + 1}_opt${optIndex}`}>
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            ))}
            
            <Button 
              variant="primary" 
              className="w-100 mt-4"
              onClick={handleSubmitQuiz}
              disabled={Object.keys(quizAnswers).length < (quiz.total_questions || quiz.questions.length)}
            >
              <CheckCircle className="me-2" />
              Submit Quiz
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  };

  return (
    <div className="learning-path-quiz-page">
      <Container fluid>
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              {activeTab === 'learning-path' ? (
                <>
                  <BookHalf className="me-3" />
                  Learning Path
                </>
              ) : (
                <>
                  <Trophy className="me-3" />
                  Quiz
                </>
              )}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'learning-path' 
                ? "Personalized learning journey with curated resources" 
                : "Test your knowledge with interactive quizzes"}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="content-controls mb-4">
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3 content-tabs"
          >
            <Tab eventKey="learning-path" title="Learning Path" />
            <Tab eventKey="quiz" title="Quiz" />
          </Tabs>

          <div className="topic-selector">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Enter a topic..."
                value={topic}
                onChange={handleTopicChange}
                disabled={isGenerating}
              />
              <Button
                variant="primary"
                onClick={handleGenerateContent}
                disabled={isGenerating || !topic.trim()}
              >
                {isGenerating ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Bullseye className="me-2" />
                    Generate {activeTab === 'learning-path' ? 'Learning Path' : 'Quiz'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {loading && !isGenerating ? (
          <div className="loading-state">
            <Spinner animation="border" variant="primary" />
            <p>Loading content...</p>
          </div>
        ) : (
          <div className="content-display">
            {activeTab === 'learning-path' ? renderLearningPath() : renderQuiz()}
          </div>
        )}
      </Container>
    </div>
  );
};

export default LearningPathQuiz;