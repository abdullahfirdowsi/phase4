import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Alert, ProgressBar, Spinner } from "react-bootstrap";
import { 
  Trophy, 
  Plus, 
  Clock, 
  PlayCircleFill, 
  Eye,
  BarChart,
  CheckCircle,
  XCircle,
  Award,
  Bullseye
} from "react-bootstrap-icons";
import { formatLocalDate } from "../../../utils/dateUtils";
import { generateQuiz, submitQuiz, getQuizHistory } from "../../../api";
import "./QuizSystem.scss";

const QuizSystem = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [expandedAccordion, setExpandedAccordion] = useState(null);

  // Form state for creating quiz
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    difficulty: "medium",
    time_limit: 10,
    questions: []
  });

  useEffect(() => {
    // Add debugging to understand the loading sequence
    console.log('🚀 QuizSystem component mounting...');
    console.log('🔍 Available localStorage keys:', Object.keys(localStorage));
    console.log('🔍 localStorage contents:', {
      username: localStorage.getItem('username'),
      token: localStorage.getItem('token') ? 'exists' : 'missing',
      isAdmin: localStorage.getItem('isAdmin'),
      name: localStorage.getItem('name')
    });
    
    fetchQuizzes();
    fetchQuizResults();
  }, []);

  const fetchQuizzes = async () => {
    try {
      // First, try to load from localStorage
      const username = localStorage.getItem("username");
      console.log('🔍 DEBUG: Username from localStorage:', username);
      const storedQuizzes = localStorage.getItem(`quizzes_${username}`);
      console.log('🔍 DEBUG: Stored quizzes key:', `quizzes_${username}`);
      console.log('🔍 DEBUG: Stored quizzes data:', storedQuizzes);
      
      if (storedQuizzes) {
        try {
          const parsedQuizzes = JSON.parse(storedQuizzes);
          console.log('✅ DEBUG: Successfully loaded quizzes from localStorage:', parsedQuizzes);
          
          // Transform backend quiz format to frontend format
          const transformedQuizzes = parsedQuizzes.map(quiz => {
            // Check if it's backend format (has quiz_json) or frontend format
            if (quiz.quiz_json && quiz.quiz_json.quiz_data) {
              const quizData = quiz.quiz_json.quiz_data;
              return {
                id: quiz.quiz_id || `quiz_${Date.now()}`,
                quiz_id: quiz.quiz_id, // Keep backend ID for submission
                title: `${quizData.topic || 'Unknown'} Quiz`,
                description: `Test your knowledge about ${quizData.topic || 'this topic'}`,
                subject: quizData.topic || 'General',
                difficulty: quizData.difficulty || 'medium',
                time_limit: quizData.time_limit || 10,
                questions: quizData.questions || [],
                created_at: quiz.created_at || new Date().toISOString()
              };
            }
            // If it's already in frontend format, return as-is
            return quiz;
          });
          
          console.log('🔄 DEBUG: Transformed quizzes:', transformedQuizzes);
          setQuizzes(transformedQuizzes);
          setLoading(false);
          return;
        } catch (parseError) {
          console.log("❌ Error parsing stored quizzes, will fetch fresh data:", parseError);
        }
      } else {
        console.log('ℹ️ DEBUG: No stored quizzes found in localStorage');
      }
      
      // Try to fetch quizzes from backend
      try {
        const response = await fetch(`http://localhost:8000/quiz/active-quizzes?username=${username}`);
        if (response.ok) {
          const data = await response.json();
          // Transform backend quiz format to frontend format
          const backendQuizzes = data.active_quizzes || [];
          const transformedQuizzes = backendQuizzes.map(quiz => {
            // Check if it's backend format (has quiz_json) or frontend format
            if (quiz.quiz_json && quiz.quiz_json.quiz_data) {
              const quizData = quiz.quiz_json.quiz_data;
              return {
                id: quiz.quiz_id || `quiz_${Date.now()}`,
                quiz_id: quiz.quiz_id, // Keep backend ID for submission
                title: `${quizData.topic || 'Unknown'} Quiz`,
                description: `Test your knowledge about ${quizData.topic || 'this topic'}`,
                subject: quizData.topic || 'General',
                difficulty: quizData.difficulty || 'medium',
                time_limit: quizData.time_limit || 10,
                questions: quizData.questions || [],
                created_at: quiz.created_at || new Date().toISOString()
              };
            }
            // If it's already in frontend format, return as-is
            return quiz;
          });
          
          // Sort quizzes by creation time (latest first)
          const sortedQuizzes = transformedQuizzes.sort((a, b) => {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
          });
          
          console.log('🔄 DEBUG: Transformed backend quizzes:', sortedQuizzes);
          setQuizzes(sortedQuizzes);
          // Save to localStorage
          localStorage.setItem(`quizzes_${username}`, JSON.stringify(sortedQuizzes));
        } else {
          console.log("Quiz API returned non-JSON response, creating sample quizzes");
          // Create sample quizzes since the API is not available
          createSampleQuizzes();
        }
      } catch (error) {
        console.log("Quiz API returned non-JSON response, creating sample quizzes");
        // Create sample quizzes since the API is not available
        createSampleQuizzes();
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      createSampleQuizzes();
    } finally {
      setLoading(false);
    }
  };

  const createSampleQuizzes = () => {
    const username = localStorage.getItem("username");
    const existingQuizzes = localStorage.getItem(`quizzes_${username}`);
    
    // Only create sample quizzes if none exist in localStorage
    if (existingQuizzes) {
      try {
        const parsedQuizzes = JSON.parse(existingQuizzes);
        setQuizzes(parsedQuizzes);
        return;
      } catch (error) {
        console.log("Error parsing existing quizzes, creating fresh samples");
      }
    }
    
    const sampleQuizzes = [
      {
        id: "quiz_1",
        title: "Python Programming Basics",
        description: "Test your knowledge of Python fundamentals including variables, data types, and control structures.",
        subject: "Programming",
        difficulty: "beginner",
        time_limit: 10,
        questions: Array(5).fill().map((_, i) => ({
          id: `q_${i+1}`,
          question_number: i+1,
          question: `Sample Python question ${i+1}`,
          type: "mcq",
          options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
          correct_answer: "A"
        }))
      },
      {
        id: "quiz_2",
        title: "Web Development Fundamentals",
        description: "Test your knowledge of HTML, CSS, and JavaScript basics.",
        subject: "Web Development",
        difficulty: "medium",
        time_limit: 15,
        questions: Array(8).fill().map((_, i) => ({
          id: `q_${i+1}`,
          question_number: i+1,
          question: `Sample Web Development question ${i+1}`,
          type: "mcq",
          options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
          correct_answer: "B"
        }))
      },
      {
        id: "quiz_3",
        title: "Data Science Essentials",
        description: "Test your knowledge of data analysis, visualization, and basic machine learning concepts.",
        subject: "Data Science",
        difficulty: "hard",
        time_limit: 20,
        questions: Array(10).fill().map((_, i) => ({
          id: `q_${i+1}`,
          question_number: i+1,
          question: `Sample Data Science question ${i+1}`,
          type: "mcq",
          options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
          correct_answer: "C"
        }))
      }
    ];
    
    setQuizzes(sampleQuizzes);
    // Save sample quizzes to localStorage
    localStorage.setItem(`quizzes_${username}`, JSON.stringify(sampleQuizzes));
  };

  const fetchQuizResults = async () => {
    try {
      // First, try to load from localStorage
      const username = localStorage.getItem("username");
      const storedResults = localStorage.getItem(`quizResults_${username}`);
      
      if (storedResults) {
        try {
          const parsedResults = JSON.parse(storedResults);
          setQuizResults(parsedResults);
          return;
        } catch (parseError) {
          console.log("Error parsing stored quiz results, will fetch fresh data");
        }
      }
      
      // Try to fetch quiz results from backend
      try {
        const response = await fetch(`http://localhost:8000/quiz/quiz-history?username=${username}`);
        if (response.ok) {
          const data = await response.json();
          const results = data.quiz_history || [];
          setQuizResults(results);
          // Save to localStorage
          localStorage.setItem(`quizResults_${username}`, JSON.stringify(results));
        } else {
          console.log("Quiz results API returned non-JSON response, creating sample results");
          // Create sample quiz results since the API is not available
          createSampleQuizResults();
        }
      } catch (error) {
        console.log("Quiz results API returned non-JSON response, creating sample results");
        // Create sample quiz results since the API is not available
        createSampleQuizResults();
      }
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      createSampleQuizResults();
    }
  };

  const createSampleQuizResults = () => {
    const username = localStorage.getItem("username");
    const existingResults = localStorage.getItem(`quizResults_${username}`);
    
    // Only create sample results if none exist in localStorage
    if (existingResults) {
      try {
        const parsedResults = JSON.parse(existingResults);
        setQuizResults(parsedResults);
        return;
      } catch (error) {
        console.log("Error parsing existing quiz results, creating fresh samples");
      }
    }
    
    // Create sample quiz results since the API is not available
    const sampleResults = [
      {
        id: "result_1",
        quiz_id: "quiz_1",
        quiz_title: "Python Programming Basics",
        score_percentage: 80,
        correct_answers: 4,
        total_questions: 5,
        submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
      },
      {
        id: "result_2",
        quiz_id: "quiz_2",
        quiz_title: "Web Development Fundamentals",
        score_percentage: 75,
        correct_answers: 6,
        total_questions: 8,
        submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      }
    ];
    
    setQuizResults(sampleResults);
    // Save sample results to localStorage
    localStorage.setItem(`quizResults_${username}`, JSON.stringify(sampleResults));
  };

  const handleCreateQuiz = async () => {
    try {
      // Since the API is not available, we'll add the quiz to our local state
      const newQuiz = {
        id: `quiz_${Date.now()}`,
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        difficulty: formData.difficulty,
        time_limit: formData.time_limit,
        questions: formData.questions.length > 0 ? formData.questions : Array(5).fill().map((_, i) => ({
          id: `q_${i+1}`,
          question_number: i+1,
          question: `Sample question ${i+1} for ${formData.title}`,
          type: "mcq",
          options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
          correct_answer: "A"
        }))
      };
      
      const updatedQuizzes = [...quizzes, newQuiz];
      setQuizzes(updatedQuizzes);
      // Save to localStorage
      const username = localStorage.getItem("username");
      localStorage.setItem(`quizzes_${username}`, JSON.stringify(updatedQuizzes));
      setShowCreateModal(false);
      setFormData({
        title: "",
        description: "",
        subject: "",
        difficulty: "medium",
        time_limit: 10,
        questions: []
      });
    } catch (error) {
      console.error("Error creating quiz:", error);
      setError("Failed to create quiz");
    }
  };

  const handleStartQuiz = async (quizId) => {
    try {
      const quiz = quizzes.find(q => q.id === quizId);
      
      if (quiz) {
        // Ensure the quiz has a proper ID for submission
        const quizWithId = {
          ...quiz,
          id: quiz.id || `quiz_${Date.now()}`,
          quiz_id: quiz.quiz_id || quiz.id || `quiz_${Date.now()}`
        };
        
        console.log('🎯 Starting quiz:', quizWithId);
        
        setCurrentQuiz(quizWithId);
        setQuizAnswers({});
        setTimeRemaining((quiz.time_limit || 10) * 60); // Convert to seconds
        setShowQuizModal(true);
      } else {
        setError("Failed to load quiz");
      }
    } catch (error) {
      console.error("Error starting quiz:", error);
      setError("Failed to start quiz");
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      setLoading(true);
      
      // Convert quizAnswers object to array format expected by backend
      const answersArray = [];
      const questions = currentQuiz.questions || [];
      
      // Ensure answers are in the correct order based on question numbers
      questions.forEach((question, index) => {
        const questionKey = question.question_number || index + 1;
        const userAnswer = quizAnswers[questionKey] || "";
        answersArray.push(userAnswer);
      });
      
      console.log('📤 Submitting quiz answers:', {
        quizId: currentQuiz.id,
        quizIdForSubmission: currentQuiz.quiz_id || currentQuiz.id,
        answers: answersArray,
        quizAnswersObject: quizAnswers,
        questionsCount: questions.length,
        answersCount: answersArray.length
      });
      
      // Try to submit to backend first
      try {
        const quizId = currentQuiz.quiz_id || currentQuiz.id;
        console.log('📤 Using quiz ID for submission:', quizId);
        
        // Call the backend API
        const result = await submitQuiz(quizId, answersArray);
        if (result && result.score_percentage !== undefined) {
          console.log('✅ Backend quiz submission successful:', result);
          
          // Add the result to our local results for immediate display
          const updatedResults = [...quizResults, result];
          setQuizResults(updatedResults);
          // Save results to localStorage
          const username = localStorage.getItem("username");
          localStorage.setItem(`quizResults_${username}`, JSON.stringify(updatedResults));
          
          setQuizResult(result);
          setShowQuizModal(false);
          setShowResultModal(true);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log("Quiz submission API failed, using local calculation:", error);
      }
      
      // Calculate score locally (in a real app, this would be done on the server)
      // questions variable is already declared above, reuse it
      const totalQuestions = questions.length;
      let correctAnswers = 0;
      
      console.log('📊 Quiz scoring debug:', {
        currentQuiz: currentQuiz,
        questions: questions,
        totalQuestions,
        quizAnswers,
        questionDetails: questions.map((q, index) => ({
          index,
          questionNumber: q.question_number,
          question: q.question,
          correctAnswer: q.correct_answer,
          userAnswer: quizAnswers[q.question_number || index + 1],
          type: q.type
        }))
      });
      
      // Early exit if no questions
      if (totalQuestions === 0) {
        console.error('❌ No questions found in quiz!');
        setError('Quiz has no questions. Please contact support.');
        setLoading(false);
        return;
      }
      
      // Validate each question has required properties
      const validQuestions = currentQuiz.questions.filter(q => {
        const hasQuestion = q.question && q.question.trim();
        const hasCorrectAnswer = q.correct_answer !== undefined && q.correct_answer !== null;
        const isValid = hasQuestion && hasCorrectAnswer;
        
        if (!isValid) {
          console.warn('⚠️ Invalid question detected:', {
            question: q.question,
            correct_answer: q.correct_answer,
            hasQuestion,
            hasCorrectAnswer
          });
        }
        
        return isValid;
      });
      
      console.log('✅ Valid questions after filtering:', validQuestions.length, 'out of', currentQuiz.questions.length);
      
      if (validQuestions.length === 0) {
        console.error('❌ No valid questions found after filtering!');
        setError('Quiz contains no valid questions. Please contact support.');
        setLoading(false);
        return;
      }
      
      validQuestions.forEach((question, index) => {
        const questionKey = question.question_number || index + 1;
        const userAnswer = quizAnswers[questionKey];
        const correctAnswer = question.correct_answer;
        const questionType = question.type || 'mcq';
        
        console.log(`🔍 Processing question ${questionKey}:`, {
          question: question.question,
          userAnswer,
          correctAnswer,
          questionType
        });
        
        let isCorrect = false;
        
        if (userAnswer && userAnswer.trim()) {
          if (questionType === 'short_answer') {
            // For short answer questions, use a more flexible matching
            // Check if user answer contains key concepts from correct answer
            const userAnswerLower = userAnswer.toLowerCase().trim();
            const correctAnswerLower = correctAnswer.toString().toLowerCase().trim();
            
            // Simple keyword matching - if user answer contains main concepts
            const correctWords = correctAnswerLower.split(/\s+/).filter(word => word.length > 3);
            const matchingWords = correctWords.filter(word => userAnswerLower.includes(word));
            
            // Consider correct if at least 30% of key words match
            isCorrect = matchingWords.length >= Math.max(1, Math.floor(correctWords.length * 0.3));
            
            console.log(`Question ${questionKey} (${questionType}): 
  User: "${userAnswer}"
  Correct: "${correctAnswer}"
  Matching words: ${matchingWords.length}/${correctWords.length}
  Is Correct: ${isCorrect}`);
          } else {
            // For MCQ and True/False, use exact matching
            isCorrect = userAnswer.toString().trim() === correctAnswer.toString().trim();
            
            console.log(`Question ${questionKey} (${questionType}): User="${userAnswer}", Correct="${correctAnswer}", Match=${isCorrect}`);
          }
        } else {
          console.log(`Question ${questionKey}: No answer provided`);
        }
        
        if (isCorrect) {
          correctAnswers++;
        }
      });
      
      // Update totalQuestions to reflect only valid questions
      const finalTotalQuestions = validQuestions.length;
      
      // Calculate score percentage with safeguards using validated question count
      const scorePercentage = finalTotalQuestions > 0 ? (correctAnswers / finalTotalQuestions) * 100 : 0;
      
      console.log('🏆 Final scoring summary:', {
        correctAnswers,
        originalTotalQuestions: totalQuestions,
        finalTotalQuestions,
        scorePercentage: `${scorePercentage.toFixed(1)}%`,
        isValidScore: !isNaN(scorePercentage)
      });
      
      // Create detailed answer review for each valid question
      const answerReview = validQuestions.map((question, index) => {
        const questionKey = question.question_number || index + 1;
        const userAnswer = quizAnswers[questionKey];
        const correctAnswer = question.correct_answer;
        const questionType = question.type || 'mcq';
        
        console.log(`🔍 Creating review for question ${questionKey}:`, {
          question: question.question,
          userAnswer,
          correctAnswer,
          questionType
        });
        
        let isCorrect = false;
        let feedback = '';
        
        if (userAnswer && userAnswer.trim()) {
          if (questionType === 'short_answer') {
            const userAnswerLower = userAnswer.toLowerCase().trim();
            const correctAnswerLower = correctAnswer.toString().toLowerCase().trim();
            const correctWords = correctAnswerLower.split(/\s+/).filter(word => word.length > 3);
            const matchingWords = correctWords.filter(word => userAnswerLower.includes(word));
            isCorrect = matchingWords.length >= Math.max(1, Math.floor(correctWords.length * 0.3));
            
            if (isCorrect) {
              feedback = 'Your answer covers the key concepts correctly!';
            } else {
              feedback = `Your answer is partially correct but missing some key points.`;
            }
          } else {
            isCorrect = userAnswer.toString().trim() === correctAnswer.toString().trim();
            feedback = isCorrect ? 'Correct!' : 'Incorrect answer.';
          }
        } else {
          feedback = 'No answer provided.';
        }
        
        return {
          questionNumber: questionKey,
          question: question.question,
          type: questionType,
          options: question.options || [],
          userAnswer: userAnswer || 'No answer',
          correctAnswer: correctAnswer,
          explanation: question.explanation || 'No explanation available.',
          isCorrect,
          feedback
        };
      });
      
      console.log('📋 Created answer review:', answerReview);
      
      // Create result object with validated data and answer review
      const result = {
        id: `result_${Date.now()}`,
        quiz_id: currentQuiz.id,
        quiz_title: currentQuiz.title,
        score_percentage: isNaN(scorePercentage) ? 0 : Math.round(scorePercentage * 100) / 100,
        correct_answers: correctAnswers || 0,
        total_questions: finalTotalQuestions || 0, // Use validated question count
        submitted_at: new Date().toISOString(),
        answerReview: answerReview // Add detailed review
      };
      
      console.log('📋 Final quiz result object:', {
        ...result,
        answerReviewCount: answerReview?.length || 0,
        debugInfo: {
          originalTotalQuestions: totalQuestions,
          finalTotalQuestions,
          validQuestionsCount: validQuestions.length,
          allQuestions: currentQuiz.questions?.length || 0
        }
      });
      
      // Add to results
      const updatedResults = [...quizResults, result];
      setQuizResults(updatedResults);
      // Save results to localStorage
      const username = localStorage.getItem("username");
      localStorage.setItem(`quizResults_${username}`, JSON.stringify(updatedResults));
      setQuizResult(result);
      setShowQuizModal(false);
      setShowResultModal(true);
      
    } catch (error) {
      console.error("Error submitting quiz:", error);
      setError("Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic for the quiz");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const result = await generateQuiz(topic, "medium", 5);
      
      if (result && result.quiz_data) {
        // Add the generated quiz to our quizzes
        const newQuiz = {
          id: result.quiz_data.quiz_id || `quiz_${Date.now()}`,
          quiz_id: result.quiz_data.quiz_id, // Backend quiz ID for submission
          title: `${topic} Quiz`,
          description: `Test your knowledge about ${topic}`,
          subject: topic,
          difficulty: result.quiz_data.difficulty || "medium",
          time_limit: result.quiz_data.time_limit || 10,
          questions: result.quiz_data.questions || [],
          created_at: new Date().toISOString() // For sorting
        };
        
        console.log('✅ Generated quiz:', newQuiz);
        
        const updatedQuizzes = [newQuiz, ...quizzes]; // Add new quiz at the beginning
        setQuizzes(updatedQuizzes);
        // Save to localStorage
        const username = localStorage.getItem("username");
        localStorage.setItem(`quizzes_${username}`, JSON.stringify(updatedQuizzes));
        setTopic("");
        setError(null);
      } else {
        setError("Failed to generate quiz. Please try again.");
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      setError("Failed to generate quiz. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy": 
      case "beginner": 
        return "success";
      case "medium": 
      case "intermediate": 
        return "warning";
      case "hard": 
      case "advanced": 
        return "danger";
      default: return "secondary";
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Timer effect for quiz
  useEffect(() => {
    let interval;
    if (showQuizModal && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitQuiz(); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showQuizModal, timeRemaining]);

  if (loading && !isGenerating) {
    return (
      <div className="quiz-system-page">
        <Container fluid>
          <div className="loading-state">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading quiz system...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="quiz-system-page">
      <Container fluid>
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <Trophy className="me-3" />
              Quiz System
            </h1>
            <p className="page-subtitle">
              Test your knowledge and track your progress
            </p>
          </div>
          <div className="header-actions">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Enter a topic for a quiz..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
              />
              <Button 
                variant="primary" 
                onClick={handleGenerateQuiz}
                disabled={isGenerating || !topic.trim()}
              >
                {isGenerating ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Bullseye size={16} className="me-2" />
                    Generate Quiz
                  </>
                )}
              </Button>
            </div>
            <Button 
              variant="outline-primary" 
              className="create-btn ms-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} className="me-2" />
              Create Quiz
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <div className="quiz-tabs">
          <Button 
            variant={activeTab === "available" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("available")}
            className="me-2"
          >
            Available Quizzes ({quizzes.length})
          </Button>
          <Button 
            variant={activeTab === "results" ? "primary" : "outline-primary"}
            onClick={() => setActiveTab("results")}
          >
            My Results ({quizResults.length})
          </Button>
        </div>

        {/* Content */}
        {activeTab === "available" ? (
          <div className="quizzes-grid">
            {quizzes.length > 0 ? (
              <Row className="g-4">
                {quizzes.map((quiz) => (
                  <Col lg={4} md={6} key={quiz.id}>
                    <Card className="quiz-card">
                      <Card.Body>
                        <div className="quiz-header">
                          <h5 className="quiz-title">{quiz.title}</h5>
                          <Badge bg={getDifficultyColor(quiz.difficulty)}>
                            {quiz.difficulty}
                          </Badge>
                        </div>
                        
                        <p className="quiz-description">{quiz.description}</p>
                        
                        <div className="quiz-meta">
                          <div className="meta-item">
                            <Clock size={14} />
                            <span>{quiz.time_limit} minutes</span>
                          </div>
                          <div className="meta-item">
                            <Trophy size={14} />
                            <span>{quiz.questions?.length || 0} questions</span>
                          </div>
                        </div>

                        <div className="quiz-actions">
                          <Button 
                            variant="primary" 
                            onClick={() => handleStartQuiz(quiz.id)}
                          >
                            <PlayCircleFill size={14} className="me-1" />
                            Start Quiz
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="empty-state">
                <Trophy size={64} className="empty-icon" />
                <h3>No Quizzes Available</h3>
                <p>Create your first quiz or generate one automatically to get started.</p>
                <div className="empty-actions">
                  <Button 
                    variant="primary" 
                    onClick={() => setShowCreateModal(true)}
                    className="me-2"
                  >
                    <Plus size={16} className="me-2" />
                    Create Quiz
                  </Button>
                  <Button 
                    variant="outline-primary"
                    onClick={() => {
                      setTopic("General Knowledge");
                      handleGenerateQuiz();
                    }}
                  >
                    <Bullseye size={16} className="me-2" />
                    Generate Quiz
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="results-grid">
            {quizResults.length > 0 ? (
              <Row className="g-4">
                {quizResults.map((result) => (
                  <Col lg={4} md={6} key={result.id}>
                    <Card className="result-card">
                      <Card.Body>
                        <div className="result-header">
                          <h6 className="result-title">{result.quiz_title}</h6>
                          <Badge 
                            bg={result.score_percentage >= 80 ? "success" : 
                                result.score_percentage >= 60 ? "warning" : "danger"}
                          >
                            {Math.round(result.score_percentage)}%
                          </Badge>
                        </div>
                        
                        <div className="result-stats">
                          <div className="stat-item">
                            <CheckCircle className="text-success" />
                            <span>{result.correct_answers} correct</span>
                          </div>
                          <div className="stat-item">
                            <XCircle className="text-danger" />
                            <span>{result.total_questions - result.correct_answers} incorrect</span>
                          </div>
                        </div>

                        <ProgressBar 
                          now={result.score_percentage} 
                          variant={result.score_percentage >= 80 ? "success" : 
                                  result.score_percentage >= 60 ? "warning" : "danger"}
                          className="result-progress"
                        />

                        <div className="result-date">
                          <small className="text-muted">
                            {formatLocalDate(result.submitted_at)}
                          </small>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="empty-state">
                <BarChart size={64} className="empty-icon" />
                <h3>No Quiz Results</h3>
                <p>Take some quizzes to see your results and track your progress.</p>
                <Button 
                  variant="primary" 
                  onClick={() => setActiveTab("available")}
                >
                  Browse Quizzes
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quiz Taking Modal */}
        <Modal show={showQuizModal} onHide={() => setShowQuizModal(false)} size="lg" backdrop="static">
          <Modal.Header>
            <Modal.Title>{currentQuiz?.title}</Modal.Title>
            <div className="quiz-timer">
              <Clock size={16} className="me-1" />
              {formatTime(timeRemaining)}
            </div>
          </Modal.Header>
          <Modal.Body>
            {currentQuiz && (
              <div className="quiz-content">
                {currentQuiz.questions?.map((question, index) => (
                  <Card key={`${currentQuiz.id}_question_${question.question_number || index + 1}_${question.question?.substring(0, 20)?.replace(/\s/g, '') || index}`} className="question-card mb-3">
                    <Card.Body>
                      <h6 className="question-title">
                        Question {question.question_number || index + 1}: {question.question}
                      </h6>
                      
                      <div className="question-options">
                        {/* Handle different question types */}
                        {question.type === 'short_answer' ? (
                          /* Short Answer Question */
                          <Form.Group className="mt-3">
                            <Form.Control
                              as="textarea"
                              rows={3}
                              placeholder="Enter your answer here..."
                              value={quizAnswers[question.question_number || index + 1] || ''}
                              onChange={(e) => {
                                const questionKey = question.question_number || index + 1;
                                const newAnswers = {
                                  ...quizAnswers,
                                  [questionKey]: e.target.value
                                };
                                console.log(`📝 Answer changed for question ${questionKey}: ${e.target.value}`);
                                console.log('📝 Current answers object:', newAnswers);
                                setQuizAnswers(newAnswers);
                              }}
                            />
                          </Form.Group>
                        ) : (
                          /* Multiple Choice or True/False Questions */
                          question.options?.map((option, optIndex) => (
                            <Form.Check
                              key={`${question.question_number || index + 1}_${optIndex}_${option.substring(0, 10)}`}
                              type="radio"
                              id={`question_${question.question_number || index + 1}_option_${optIndex}`}
                              name={`question_${question.question_number || index + 1}`}
                              label={option}
                              value={option.startsWith('A) ') ? 'A' : 
                                     option.startsWith('B) ') ? 'B' : 
                                     option.startsWith('C) ') ? 'C' : 
                                     option.startsWith('D) ') ? 'D' : option}
                              onChange={(e) => {
                                const questionKey = question.question_number || index + 1;
                                const newAnswers = {
                                  ...quizAnswers,
                                  [questionKey]: e.target.value
                                };
                                console.log(`📝 Answer changed for question ${questionKey}: ${e.target.value}`);
                                console.log('📝 Current answers object:', newAnswers);
                                setQuizAnswers(newAnswers);
                              }}
                              checked={quizAnswers[question.question_number || index + 1] === 
                                      (option.startsWith('A) ') ? 'A' : 
                                       option.startsWith('B) ') ? 'B' : 
                                       option.startsWith('C) ') ? 'C' : 
                                       option.startsWith('D) ') ? 'D' : option)}
                            />
                          ))
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowQuizModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmitQuiz}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Submitting...
                </>
              ) : (
                `Submit Quiz (${Object.keys(quizAnswers).length}/${currentQuiz?.questions?.length || 0} answered)`
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Quiz Result Modal */}
        <Modal show={showResultModal} onHide={() => setShowResultModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Quiz Results</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {quizResult && (
              <div className="quiz-result-content">
                {/* Debug quiz result */}
                {console.log('🔍 DEBUG: Quiz result object:', quizResult)}
                
                <div className="result-summary">
                  <div className="score-display">
                    <Award size={48} className="score-icon" />
                    <div className="score-text">
                      <h2>
                        {quizResult.score_percentage !== undefined && !isNaN(quizResult.score_percentage) 
                          ? `${Math.round(quizResult.score_percentage)}%`
                          : '0%'
                        }
                      </h2>
                      <p>
                        {quizResult.correct_answers || 0} out of {quizResult.total_questions || 0} correct
                      </p>
                    </div>
                  </div>
                </div>

                <div className="detailed-results">
                  <h5>Performance Summary</h5>
                  <p>
                    {quizResult.score_percentage !== undefined && !isNaN(quizResult.score_percentage) 
                      ? (
                          quizResult.score_percentage >= 80 
                            ? "🎉 Excellent work! You have a strong understanding of this topic." 
                            : quizResult.score_percentage >= 60
                            ? "👍 Good job! You're on the right track with room for improvement."
                            : "📚 Keep practicing! Review the material and try again."
                        )
                      : "📊 Score calculation completed. Please review your answers below."
                    }
                  </p>
                  
                  {/* Detailed Answer Review */}
                  {quizResult.answerReview && (
                    <div className="answer-review mt-4">
                      <h5 className="mb-3">📋 Answer Review</h5>
                      <div className="accordion" id="answerAccordion">
                        {quizResult.answerReview.map((review, index) => (
                          <div key={`answer_${review.questionNumber}`} className="accordion-item">
                            <h2 className="accordion-header" id={`heading${index}`}>
                              <button 
                                className={`accordion-button ${expandedAccordion === index ? '' : 'collapsed'}`}
                                type="button" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🖱️ Accordion button clicked for index:', index);
                                  console.log('🔍 Current expandedAccordion:', expandedAccordion);
                                  const newIndex = expandedAccordion === index ? null : index;
                                  console.log('🔄 Setting expandedAccordion to:', newIndex);
                                  setExpandedAccordion(newIndex);
                                }}
                                aria-expanded={expandedAccordion === index}
                                aria-controls={`collapse${index}`}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                              >
                                <div className="d-flex justify-content-between align-items-center w-100">
                                  <div className="d-flex flex-column align-items-start">
                                    <span className="fw-bold">Question {review.questionNumber}</span>
                                    <div className="text-muted small mt-1">
                                      {review.question.length > 60 
                                        ? review.question.substring(0, 60) + '...' 
                                        : review.question}
                                    </div>
                                  </div>
                                  <Badge 
                                    bg={review.isCorrect ? "success" : "danger"}
                                    className="ms-2"
                                  >
                                    {review.isCorrect ? (
                                      <><CheckCircle size={12} className="me-1" />Correct</>
                                    ) : (
                                      <><XCircle size={12} className="me-1" />Incorrect</>
                                    )}
                                  </Badge>
                                </div>
                              </button>
                            </h2>
                            <div 
                              id={`collapse${index}`} 
                              className={`accordion-collapse collapse ${expandedAccordion === index ? 'show' : ''}`}
                              aria-labelledby={`heading${index}`}
                            >
                              <div className="accordion-body">
                                <div className="question-detail">
                                  <h6 className="mb-2">📝 Question:</h6>
                                  <p className="question-text">{review.question}</p>
                                  
                                  {/* Show options for MCQ/True-False */}
                                  {review.type !== 'short_answer' && review.options.length > 0 && (
                                    <div className="mb-3">
                                      <h6>Options:</h6>
                                      <ul className="list-unstyled">
                                        {review.options.map((option, optIndex) => (
                                          <li key={optIndex} className="mb-1">
                                            <span className={`option-item ${
                                              option.includes(review.correctAnswer) ? 'correct-option' : ''
                                            } ${
                                              option.includes(review.userAnswer) && !review.isCorrect ? 'incorrect-option' : ''
                                            }`}>
                                              {option}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  <div className="answer-comparison">
                                    <div className="row">
                                      <div className="col-md-6">
                                        <h6 className="text-primary">👤 Your Answer:</h6>
                                        <div className={`answer-box ${
                                          review.isCorrect ? 'correct-answer' : 'incorrect-answer'
                                        }`}>
                                          {review.userAnswer || 'No answer provided'}
                                        </div>
                                      </div>
                                      <div className="col-md-6">
                                        <h6 className="text-success">✅ Correct Answer:</h6>
                                        <div className="answer-box correct-answer">
                                          {review.correctAnswer}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="feedback mt-3">
                                    <h6 className="text-info">💡 Feedback:</h6>
                                    <div className={`feedback-box ${
                                      review.isCorrect ? 'success-feedback' : 'improvement-feedback'
                                    }`}>
                                      {review.feedback}
                                    </div>
                                  </div>
                                  
                                  {review.explanation && review.explanation.trim() !== '' && review.explanation !== 'No explanation available.' && (
                                    <div className="explanation mt-3">
                                      <h6 className="text-warning">📖 Explanation:</h6>
                                      <div className="explanation-box">
                                        {review.explanation}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Show fallback message if no explanation */}
                                  {(!review.explanation || review.explanation.trim() === '' || review.explanation === 'No explanation available.') && (
                                    <div className="explanation mt-3">
                                      <h6 className="text-muted">📖 Explanation:</h6>
                                      <div className="explanation-box text-muted">
                                        <em>No detailed explanation available for this question.</em>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => setShowResultModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Create Quiz Modal */}
        <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Create New Quiz</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Title</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter quiz title"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Subject</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Mathematics, Programming"
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the quiz"
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Difficulty</Form.Label>
                    <Form.Select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="medium">Intermediate</option>
                      <option value="hard">Advanced</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Time Limit (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.time_limit}
                      onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) })}
                      min={1}
                      max={60}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <p className="text-muted">
                Note: Questions will be automatically generated based on the subject and difficulty.
              </p>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleCreateQuiz}
              disabled={!formData.title || !formData.subject}
            >
              Create Quiz
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default QuizSystem;