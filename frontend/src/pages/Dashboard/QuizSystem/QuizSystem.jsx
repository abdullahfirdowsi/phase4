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

// Function to generate unique quiz titles
const generateUniqueQuizTitle = (topic, difficulty = 'medium', source = '') => {
  // Properly capitalize the topic (Title Case)
  const capitalizedTopic = topic
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Creative title templates based on difficulty and topic
  const titleTemplates = {
    easy: [
      `${capitalizedTopic} Fundamentals`,
      `Introduction to ${capitalizedTopic}`,
      `${capitalizedTopic} Basics`,
      `Getting Started with ${capitalizedTopic}`,
      `${capitalizedTopic} Essentials`
    ],
    medium: [
      `${capitalizedTopic} Challenge`,
      `${capitalizedTopic} Mastery Test`,
      `Exploring ${capitalizedTopic}`,
      `${capitalizedTopic} Deep Dive`,
      `${capitalizedTopic} Assessment`,
      `${capitalizedTopic} Knowledge Check`
    ],
    hard: [
      `Advanced ${capitalizedTopic}`,
      `${capitalizedTopic} Expert Challenge`,
      `${capitalizedTopic} Mastery`,
      `${capitalizedTopic} Pro Test`,
      `Ultimate ${capitalizedTopic} Challenge`,
      `${capitalizedTopic} Expert Level`
    ]
  };
  
  // Add source-specific prefixes
  const sourcePrefix = source === 'AI' ? 'AI-Generated ' : '';
  
  // Get appropriate templates based on difficulty
  const templates = titleTemplates[difficulty] || titleTemplates.medium;
  
  // Use timestamp to ensure uniqueness and select template
  const templateIndex = Math.floor(Date.now() / 1000) % templates.length;
  const selectedTemplate = templates[templateIndex];
  
  return sourcePrefix + selectedTemplate;
};

const QuizSystem = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showDetailedResultModal, setShowDetailedResultModal] = useState(false);
  const [detailedResult, setDetailedResult] = useState(null);
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
    question_count: 10, // Default to 10 questions
    question_types: ["mcq", "true_false", "short_answer"], // Mix of question types
    questions: []
  });

  // Quick generate state
  const [quickGenerate, setQuickGenerate] = useState({
    topic: "",
    difficulty: "medium",
    question_count: 10,
    question_types: ["mcq", "true_false"]
  });

  useEffect(() => {
    // Add debugging to understand the loading sequence
    console.log('🚀 QuizSystem component mounting...');
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    
    if (!username || !token) {
      console.log('❌ No authentication found. Please log in.');
      setError('Please log in to access quiz system.');
      setLoading(false);
      return;
    }
    
    // Check URL parameters for tab navigation
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      console.log('🔗 Navigation: Setting tab from URL parameter:', tabParam);
      if (tabParam === 'results') {
        setActiveTab('results');
      } else if (tabParam === 'available') {
        setActiveTab('available');
      }
      // Clean up URL after setting tab
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    fetchQuizzes();
    fetchQuizResults();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const username = localStorage.getItem("username");
      const token = localStorage.getItem("token");
      console.log('🔍 Fetching quizzes for username:', username);
      
      if (!username || !token) {
        console.log('❌ No credentials found. Please log in.');
        setError('Please log in to access quizzes.');
        setLoading(false);
        return;
      }
      
      // Use token in API calls to ensure proper authentication
      const headers = { "Authorization": `Bearer ${token}` };
      const [activeQuizzesResponse, chatHistoryResponse] = await Promise.all([
        fetch(`http://localhost:8000/quiz/active-quizzes?username=${username}`, { headers }),
        fetch(`http://localhost:8000/chat/history?username=${username}`, { headers })
      ]);

      console.log('🔍 Fetch responses:', {
        activeQuizzesStatus: activeQuizzesResponse.status,
        chatHistoryStatus: chatHistoryResponse.status
      });

      let transformedQuizzes = [];

      if (activeQuizzesResponse.ok) {
        const activeData = await activeQuizzesResponse.json();
        const backendQuizzes = activeData.active_quizzes || [];

        console.log('📊 Fetched quizzes:', backendQuizzes);

        transformedQuizzes = backendQuizzes.map(quiz => ({
          id: quiz.id || quiz.quiz_id || `quiz_${Date.now()}`,
          quiz_id: quiz.quiz_id || quiz.id,
          title: quiz.title || 'Untitled Quiz',
          description: quiz.description || 'No description available',
          subject: quiz.subject || 'General',
          difficulty: quiz.difficulty || 'medium',
          time_limit: quiz.time_limit || 10,
          questions: quiz.questions || [],
          created_at: quiz.created_at || new Date().toISOString(),
          source: quiz.source || 'unknown',
          status: quiz.status || 'active'
        }));

        console.log('✅ Transformed quizzes:', transformedQuizzes);
      } else {
        console.error('❌ Issue with active quizzes response:', activeQuizzesResponse.status);
        setError('Failed to load quizzes. Please try again later.');
      }

      if (chatHistoryResponse.ok) {
        const chatData = await chatHistoryResponse.json();
        const messages = chatData.history || [];

        const chatQuizzes = messages
          .filter(msg => msg.type === 'quiz' && msg.role === 'assistant' && msg.content)
          .map(msg => {
            const quizContent = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
            if (quizContent && quizContent.quiz_data) {
              const quizData = quizContent.quiz_data;
              return {
                id: quizData.quiz_id || `ai_chat_quiz_${Date.now()}`,
                quiz_id: quizData.quiz_id,
                title: quizData.quiz_title || 'AI Quiz',
                description: `AI-generated quiz about ${quizData.topic}`,
                subject: quizData.topic || 'General',
                difficulty: quizData.difficulty || 'medium',
                time_limit: quizData.time_limit || 10,
                questions: quizData.questions || [],
                created_at: msg.timestamp || new Date().toISOString(),
                source: 'ai_chat'
              };
            }
            return null;
          }).filter(Boolean);

        transformedQuizzes = transformedQuizzes.concat(chatQuizzes);
        console.log('✅ Quizzes from chat:', chatQuizzes);
      } else {
        console.warn('⚠️ Issue with chat history response:', chatHistoryResponse.status);
      }
      
      // No mock data - display empty state instead
      if (transformedQuizzes.length === 0) {
        console.log('🔧 No active quizzes found, will display empty state.');
      }

      setQuizzes(transformedQuizzes);
      setError(null);
    } catch (e) {
      console.error('Error fetching quizzes:', e);
      setError('Failed to load quizzes. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };


  const fetchQuizResults = async () => {
    try {
      const username = localStorage.getItem("username");
      console.log('🔍 DEBUG: Fetching quiz results directly from MongoDB for username:', username);
      
      if (!username) {
        console.log('❌ No username found. Please log in.');
        setError('Please log in to access quiz results.');
        return;
      }
      
      // Try to fetch quiz results from multiple sources
      try {
        // Fetch from both quiz history API and chat history (for AI Chat quizzes)
        const [quizHistoryResponse, chatHistoryResponse] = await Promise.all([
          fetch(`http://localhost:8000/quiz/quiz-history?username=${username}`),
          fetch(`http://localhost:8000/chat/history?username=${username}`)
        ]);
        
        let allResults = [];
        
        // Get regular quiz results (including AI Chat quiz results via submitQuiz)
        if (quizHistoryResponse.ok) {
          const quizData = await quizHistoryResponse.json();
          const quizResults = quizData.quiz_history || [];
          
          console.log('🔍 DETAILED Quiz History Debug:');
          console.log('  - Raw API Response:', quizData);
          console.log('  - Quiz Results Array:', quizResults);
          console.log(`  - Total Results Count: ${quizResults.length}`);
          
          // Check if any results contain AI Chat quiz IDs from the logs
          const aiChatQuizIds = ['quiz_1751532395']; // From backend logs
          const matchingResults = quizResults.filter(result => 
            aiChatQuizIds.includes(result.quiz_id)
          );
          console.log(`  - AI Chat Quiz Results Found: ${matchingResults.length}`);
          if (matchingResults.length > 0) {
            console.log('  - Matching AI Chat Results:', matchingResults);
          }
          
          // Log each result for analysis
          quizResults.forEach((result, index) => {
            console.log(`  - Result ${index + 1}:`, {
              id: result.id,
              quiz_id: result.quiz_id,
              quiz_title: result.quiz_title,
              score_percentage: result.score_percentage,
              submitted_at: result.submitted_at,
              source: result.source || 'unknown'
            });
          });
          
          allResults = [...allResults, ...quizResults];
          console.log(`✅ Found ${quizResults.length} quiz results from quiz history API`);
        } else {
          console.warn('⚠️ Quiz history API failed:', quizHistoryResponse.status, quizHistoryResponse.statusText);
          const errorText = await quizHistoryResponse.text();
          console.warn('  - Error details:', errorText);
        }
        
        // Get AI Chat quiz results from submitted quiz answers in chat history
        if (chatHistoryResponse.ok) {
          const chatData = await chatHistoryResponse.json();
          const messages = chatData.history || [];
          
          // Look for quiz submission results in chat messages
          const chatQuizResults = messages
            .filter(msg => {
              // Look for messages that contain quiz results or submissions
              return msg.role === 'user' && msg.content && 
                     (msg.content.includes('quiz') || msg.content.includes('Quiz')) &&
                     msg.quiz_result; // Look for quiz_result field
            })
            .map(msg => {
              // Extract quiz result from chat message
              try {
                if (msg.quiz_result) {
                  return {
                    ...msg.quiz_result,
                    id: msg.quiz_result.id || `chat_result_${Date.now()}`,
                    source: 'ai_chat',
                    submitted_at: msg.timestamp || new Date().toISOString()
                  };
                }
              } catch (e) {
                console.error('Error parsing chat quiz result:', e);
              }
              return null;
            })
            .filter(result => result !== null);
          
          allResults = [...allResults, ...chatQuizResults];
          console.log(`✅ Found ${chatQuizResults.length} AI Chat quiz results from chat history`);
        }
        
        // Also try the getQuizHistory API function (uses newer endpoint)
        try {
          const apiQuizHistory = await getQuizHistory();
          if (Array.isArray(apiQuizHistory) && apiQuizHistory.length > 0) {
            // Merge with existing results, removing duplicates
            const existingIds = new Set(allResults.map(r => r.id || r.quiz_id));
            const newResults = apiQuizHistory.filter(r => !existingIds.has(r.id || r.quiz_id));
            allResults = [...allResults, ...newResults];
            console.log(`✅ Found ${newResults.length} additional quiz results from getQuizHistory API`);
          }
        } catch (apiError) {
          console.log('📍 getQuizHistory API not available:', apiError.message);
        }
        
        // Remove duplicates based on quiz_id and submitted_at
        const uniqueResults = allResults.filter((result, index, self) => {
          const key = `${result.quiz_id}_${result.submitted_at}`;
          return index === self.findIndex(r => `${r.quiz_id}_${r.submitted_at}` === key);
        });
        
        // Sort results by submission date (newest first)
        const sortedResults = uniqueResults.sort((a, b) => {
          const dateA = new Date(a.submitted_at || 0);
          const dateB = new Date(b.submitted_at || 0);
          return dateB - dateA; // Descending order (newest first)
        });
        
        console.log(`🏆 Total unique quiz results found: ${sortedResults.length}`);
        setQuizResults(sortedResults);
        // NO localStorage caching - data loaded directly from MongoDB
        
      } catch (error) {
        console.log("Quiz results APIs failed:", error.message);
        // No mock data - will show empty state
        setQuizResults([]);
      }
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      setQuizResults([]);
    }
  };


  const handleCreateQuiz = async () => {
    if (!formData.title.trim() || !formData.subject.trim()) {
      setError("Please fill in all required fields");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      console.log('🚀 Creating quiz with AI generation:', formData);
      
      // Use AI to generate real questions based on the subject and difficulty
      const result = await generateQuiz(
        formData.subject, 
        formData.difficulty, 
        formData.question_count // Use dynamic question count from form
      );
      
      if (result && result.quiz_data) {
        // Create new quiz with form data and AI-generated questions
        const newQuiz = {
          id: result.quiz_data.quiz_id || `quiz_${Date.now()}`,
          quiz_id: result.quiz_data.quiz_id, // Backend quiz ID for submission
          title: formData.title,
          description: formData.description,
          subject: formData.subject,
          difficulty: formData.difficulty,
          time_limit: formData.time_limit,
          questions: result.quiz_data.questions || [],
          created_at: new Date().toISOString()
        };
        
        console.log('✅ Created quiz with AI questions:', newQuiz);
        
        const updatedQuizzes = [newQuiz, ...quizzes]; // Add new quiz at the beginning
        setQuizzes(updatedQuizzes);
        // NO localStorage caching - quizzes are stored directly in MongoDB
        
        // Reset form and close modal
        setShowCreateModal(false);
        setFormData({
          title: "",
          description: "",
          subject: "",
          difficulty: "medium",
          time_limit: 10,
          question_count: 10, // Reset to default
          question_types: ["mcq", "true_false", "short_answer"],
          questions: []
        });
        
        setError(null);
      } else {
        setError("Failed to generate quiz questions. Please try again.");
      }
    } catch (error) {
      console.error("Error creating quiz:", error);
      setError("Failed to create quiz. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
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
          const updatedResults = [result, ...quizResults]; // Add new result at the beginning
          setQuizResults(updatedResults);
          // NO localStorage caching - results are stored directly in MongoDB
          
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
      
      // Add to results (newest first)
      const updatedResults = [result, ...quizResults]; // Add new result at the beginning
      setQuizResults(updatedResults);
      // NO localStorage caching - quiz results are stored directly in MongoDB
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

  const handleViewDetailedResult = (result) => {
    console.log('👁️ Viewing detailed result:', result);
    setDetailedResult(result);
    setShowDetailedResultModal(true);
  };

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic for the quiz");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Use dynamic values from quickGenerate state
      const result = await generateQuiz(
        topic, 
        quickGenerate.difficulty, 
        quickGenerate.question_count
      );
      
      if (result && result.quiz_data) {
        // Add the generated quiz to our quizzes
        const newQuiz = {
          id: result.quiz_data.quiz_id || `quiz_${Date.now()}`,
          quiz_id: result.quiz_data.quiz_id, // Backend quiz ID for submission
          title: result.quiz_data.quiz_title || generateUniqueQuizTitle(topic, result.quiz_data.difficulty),
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
        // NO localStorage caching - quizzes are stored directly in MongoDB
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
            <div className="quick-generate-section">
              <div className="input-group mb-2">
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
              
              {/* Quick Generate Options */}
              <div className="quick-options d-flex gap-2 align-items-center flex-wrap">
                <div className="option-group">
                  <label className="form-label small mb-1">Questions:</label>
                  <select 
                    className="form-select form-select-sm" 
                    style={{width: 'auto', minWidth: '80px'}}
                    value={quickGenerate.question_count}
                    onChange={(e) => setQuickGenerate({...quickGenerate, question_count: parseInt(e.target.value)})}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={25}>25</option>
                    <option value={30}>30</option>
                  </select>
                </div>
                
                <div className="option-group">
                  <label className="form-label small mb-1">Difficulty:</label>
                  <select 
                    className="form-select form-select-sm" 
                    style={{width: 'auto', minWidth: '120px'}}
                    value={quickGenerate.difficulty}
                    onChange={(e) => setQuickGenerate({...quickGenerate, difficulty: e.target.value})}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="medium">Intermediate</option>
                    <option value="hard">Advanced</option>
                  </select>
                </div>
                
                <div className="option-group">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    className="ms-2"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus size={14} className="me-1" />
                    Create Custom
                  </Button>
                </div>
              </div>
            </div>
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
                        
                        <div className="result-actions mt-3">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => handleViewDetailedResult(result)}
                          >
                            <Eye size={14} className="me-1" />
                            View Details
                          </Button>
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
                <Col md={4}>
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
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Number of Questions</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.question_count}
                      onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) || 5 })}
                      min={1}
                      max={50}
                      placeholder="5-50 questions"
                    />
                    <Form.Text className="text-muted">
                      Choose between 1-50 questions
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Time Limit (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.time_limit}
                      onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) || 10 })}
                      min={1}
                      max={120}
                      placeholder="1-120 minutes"
                    />
                    <Form.Text className="text-muted">
                      Recommended: {Math.ceil(formData.question_count * 1.5)} min
                    </Form.Text>
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

        {/* Detailed Result Modal */}
        <Modal 
          show={showDetailedResultModal} 
          onHide={() => setShowDetailedResultModal(false)} 
          size="xl"
          scrollable
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <BarChart className="me-2" />
              Quiz Results - {detailedResult?.quiz_title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {detailedResult && (
              <div className="detailed-result-content">
                {/* Score Summary */}
                <div className="score-summary-card mb-4">
                  <Row className="align-items-center">
                    <Col md={4} className="text-center">
                      <div className="score-circle">
                        <h1 className="score-percentage">
                          {Math.round(detailedResult.score_percentage || 0)}%
                        </h1>
                        <p className="score-label">Final Score</p>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="score-stats">
                        <div className="stat-item">
                          <CheckCircle className="text-success me-2" size={20} />
                          <span className="stat-label">Correct:</span>
                          <span className="stat-value">{detailedResult.correct_answers || 0}</span>
                        </div>
                        <div className="stat-item">
                          <XCircle className="text-danger me-2" size={20} />
                          <span className="stat-label">Incorrect:</span>
                          <span className="stat-value">
                            {(detailedResult.total_questions || 0) - (detailedResult.correct_answers || 0)}
                          </span>
                        </div>
                        <div className="stat-item">
                          <Trophy className="text-warning me-2" size={20} />
                          <span className="stat-label">Total:</span>
                          <span className="stat-value">{detailedResult.total_questions || 0}</span>
                        </div>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="performance-badge">
                        <Badge 
                          bg={detailedResult.score_percentage >= 80 ? "success" : 
                              detailedResult.score_percentage >= 60 ? "warning" : "danger"}
                          className="performance-badge"
                        >
                          {detailedResult.score_percentage >= 80 ? "🏆 Excellent" : 
                           detailedResult.score_percentage >= 60 ? "👍 Good" : "📚 Needs Practice"}
                        </Badge>
                        <div className="quiz-date mt-2">
                          <small className="text-muted">
                            Completed: {formatLocalDate(detailedResult.submitted_at)}
                          </small>
                        </div>
                      </div>
                    </Col>
                  </Row>
                  
                  <div className="progress-section mt-3">
                    <ProgressBar 
                      now={detailedResult.score_percentage || 0}
                      variant={detailedResult.score_percentage >= 80 ? "success" : 
                              detailedResult.score_percentage >= 60 ? "warning" : "danger"}
                      height={8}
                      className="score-progress"
                    />
                  </div>
                </div>

                {/* Question-by-Question Review */}
                {detailedResult.answerReview && detailedResult.answerReview.length > 0 ? (
                  <div className="question-review-section">
                    <h5 className="section-title mb-3">
                      <Award className="me-2" />
                      Question-by-Question Review
                    </h5>
                    
                    <div className="questions-list">
                      {detailedResult.answerReview.map((review, index) => (
                        <Card key={`detailed_${review.questionNumber}`} className="question-review-card mb-3">
                          <Card.Header className={`question-header ${
                            review.isCorrect ? 'correct-header' : 'incorrect-header'
                          }`}>
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="question-info">
                                <h6 className="question-number mb-1">
                                  Question {review.questionNumber}
                                </h6>
                                <Badge 
                                  bg={review.isCorrect ? "success" : "danger"}
                                  className="result-badge"
                                >
                                  {review.isCorrect ? (
                                    <><CheckCircle size={12} className="me-1" />Correct</>
                                  ) : (
                                    <><XCircle size={12} className="me-1" />Incorrect</>
                                  )}
                                </Badge>
                              </div>
                              <div className="question-type">
                                <Badge variant="secondary">
                                  {review.type === 'mcq' ? 'Multiple Choice' : 
                                   review.type === 'true_false' ? 'True/False' :
                                   review.type === 'short_answer' ? 'Short Answer' : 'Question'}
                                </Badge>
                              </div>
                            </div>
                          </Card.Header>
                          
                          <Card.Body>
                            <div className="question-content">
                              <h6 className="question-text mb-3">{review.question}</h6>
                              
                              {/* Show options for MCQ/True-False */}
                              {review.type !== 'short_answer' && review.options && review.options.length > 0 && (
                                <div className="options-section mb-3">
                                  <p className="options-label"><strong>Options:</strong></p>
                                  <div className="options-list">
                                    {review.options.map((option, optIndex) => (
                                      <div 
                                        key={optIndex} 
                                        className={`option-item ${
                                          option.includes(review.correctAnswer) ? 'correct-option' : ''
                                        } ${
                                          option.includes(review.userAnswer) && !review.isCorrect ? 'user-incorrect-option' : ''
                                        } ${
                                          option.includes(review.userAnswer) && review.isCorrect ? 'user-correct-option' : ''
                                        }`}
                                      >
                                        {option}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Answer Comparison */}
                              <Row className="answer-comparison">
                                <Col md={6}>
                                  <div className="answer-section user-answer">
                                    <h6 className="answer-label">
                                      <span className="answer-icon">👤</span>
                                      Your Answer:
                                    </h6>
                                    <div className={`answer-box ${
                                      review.isCorrect ? 'correct-answer' : 'incorrect-answer'
                                    }`}>
                                      {review.userAnswer || 'No answer provided'}
                                    </div>
                                  </div>
                                </Col>
                                <Col md={6}>
                                  <div className="answer-section correct-answer">
                                    <h6 className="answer-label">
                                      <span className="answer-icon">✅</span>
                                      Correct Answer:
                                    </h6>
                                    <div className="answer-box correct-answer">
                                      {review.correctAnswer}
                                    </div>
                                  </div>
                                </Col>
                              </Row>
                              
                              {/* Feedback */}
                              <div className="feedback-section mt-3">
                                <h6 className="feedback-label">
                                  <span className="feedback-icon">💡</span>
                                  Feedback:
                                </h6>
                                <div className={`feedback-box ${
                                  review.isCorrect ? 'success-feedback' : 'improvement-feedback'
                                }`}>
                                  {review.feedback || 'No feedback available.'}
                                </div>
                              </div>
                              
                              {/* Explanation */}
                              {review.explanation && review.explanation.trim() !== '' && 
                               review.explanation !== 'No explanation available.' && (
                                <div className="explanation-section mt-3">
                                  <h6 className="explanation-label">
                                    <span className="explanation-icon">📖</span>
                                    Explanation:
                                  </h6>
                                  <div className="explanation-box">
                                    {review.explanation}
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="no-review-available">
                    <Alert variant="info">
                      <Award className="me-2" />
                      <strong>Detailed review not available for this quiz.</strong>
                      <br />This might be an older quiz result. Future quizzes will include detailed question-by-question reviews.
                    </Alert>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowDetailedResultModal(false)}
            >
              Close
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                // Navigate back to available quizzes to retake
                setShowDetailedResultModal(false);
                setActiveTab('available');
              }}
            >
              <Trophy className="me-1" size={14} />
              Take More Quizzes
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default QuizSystem;
