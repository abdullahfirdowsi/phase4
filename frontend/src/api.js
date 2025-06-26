// Enhanced API configuration with better error handling and CORS support
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"; // Use environment variable if available

// Enhanced fetch wrapper with better error handling
const apiRequest = async (url, options = {}) => {
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log(`🔗 API Request: ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, defaultOptions);
    
    // Log response status for debugging
    console.log(`📡 API Response: ${response.status} ${response.statusText}`);
    
    // Handle different response types
    const contentType = response.headers.get("content-type");
    let data;
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = data?.detail || data?.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error(`❌ API Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error(`🚨 API Request Failed: ${error.message}`);
    
    // Handle specific error types
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check if the backend is running on http://localhost:8000');
    }
    
    if (error.message.includes('CORS')) {
      throw new Error('CORS error: Please check server configuration');
    }
    
    throw error;
  }
};

export const login = async (username, password) => {
  try {
    const data = await apiRequest(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      localStorage.setItem("isAdmin", data.isAdmin || false);
      if (data.name) {
        localStorage.setItem("name", data.name);
      }
      if (data.avatarUrl) {
        localStorage.setItem("avatarUrl", data.avatarUrl);
      }
      
      // Log admin status for debugging
      if (data.isAdmin) {
        console.log(`🛡️ Admin privileges granted to ${username}`);
      }
    }

    return data;
  } catch (error) {
    throw new Error(error.message || "Login failed");
  }
};

export const signup = async (name, username, password, isAdmin = false) => {
  try {
    // Check if this is the default admin email
    const isDefaultAdmin = username.toLowerCase() === "blackboxgenai@gmail.com";
    
    const data = await apiRequest(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      body: JSON.stringify({ 
        name, 
        username: username, // Use the username parameter (which is the email) for the username field
        email: username,    // Explicitly add the email field using the same value
        password, 
        isAdmin: isAdmin || isDefaultAdmin 
      }),
    });

    // Log admin status for debugging
    if (data.isAdmin) {
      console.log(`🛡️ Admin account created for ${username}`);
    }

    return data;
  } catch (error) {
    throw new Error(error.message || "Signup failed");
  }
};

// Google login function
export const googleLogin = async (credential) => {
  try {
    console.log(`Sending Google credential to backend (length: ${credential.length})`);
    
    const data = await apiRequest(`${API_BASE_URL}/auth/google-login`, {
      method: "POST",
      body: JSON.stringify({ credential }),
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("isAdmin", data.isAdmin || false);
      if (data.name) {
        localStorage.setItem("name", data.name);
      }
      if (data.avatarUrl) {
        localStorage.setItem("avatarUrl", data.avatarUrl);
      }
      
      // Log admin status for debugging
      if (data.isAdmin) {
        console.log(`🛡️ Admin privileges granted to ${data.username}`);
      }
      
      // Log avatar URL if present
      if (data.avatarUrl) {
        console.log(`🖼️ Avatar URL set: ${data.avatarUrl}`);
      }
    }

    return data;
  } catch (error) {
    throw new Error(error.message || "Google login failed");
  }
};

// Logout function
export const logout = async () => {
  try {
    // Clear all authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("name");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("preferences");
    localStorage.removeItem("avatarUrl");
    sessionStorage.clear();
    
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw new Error("Logout failed");
  }
};

// Check admin status
export const checkAdminStatus = async () => {
  const username = localStorage.getItem("username");
  if (!username) return { isAdmin: false };

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/auth/check-admin?username=${encodeURIComponent(username)}`
    );
    
    // Update local storage
    localStorage.setItem("isAdmin", data.isAdmin);
    
    // Log admin status changes
    if (data.isAdmin) {
      console.log(`🛡️ Admin status confirmed for ${username}`);
    }
    
    return data;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return { isAdmin: false };
  }
};

// Get admin configuration info
export const getAdminInfo = async () => {
  try {
    const data = await apiRequest(`${API_BASE_URL}/auth/admin-info`);
    return data;
  } catch (error) {
    console.error("Error fetching admin info:", error);
    return null;
  }
};

export const fetchChatHistory = async () => {
  const username = localStorage.getItem("username");
  if (!username) throw new Error("No username found. Please log in.");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/chat/history?username=${encodeURIComponent(username)}`,
      { method: "GET" }
    );

    return data.history || [];
  } catch (error) {
    console.error("Error fetching chat history:", error);
    throw new Error(error.message || "Failed to fetch chat history");
  }
};

export const askQuestion = async (
  user_prompt,
  onMessageReceived,
  onComplete, 
  isQuiz, 
  isLearningPathQuery
) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const url = `${API_BASE_URL}/chat/ask`;
    console.log(`🔗 Chat Request: ${url}`);

    if (!isLearningPathQuery) {
      // Streaming API Call (For non-learning-path queries)
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "text/plain",
        },
        body: JSON.stringify({
          user_prompt,
          username,
          isQuiz: isQuiz || false,
          isLearningPath: isLearningPathQuery || false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedMessage = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedMessage += chunk;
        onMessageReceived(accumulatedMessage);
      }

      onComplete();
    } else {
      // Standard API Call (For learning path queries - Non-streaming)
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          user_prompt,
          username,
          isQuiz: isQuiz || false,
          isLearningPath: isLearningPathQuery || false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // For learning path requests, we expect JSON response
      const contentType = response.headers.get("content-type");
      let responseData;
      
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
        console.log("📊 Learning Path API Response:", responseData);
        
        // Pass the entire response object to the message handler
        onMessageReceived(responseData);
      } else {
        // Fallback to text if not JSON
        responseData = await response.text();
        console.log("📊 Learning Path Text Response:", responseData);
        onMessageReceived(responseData);
      }
      
      onComplete();
    }
  } catch (error) {
    console.error("❌ Chat Error:", error);
    throw error;
  }
};

// Get All Learning Goals API Call
export const getAllLearningGoals = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/chat/get-all-goals?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data.learning_goals || [];
  } catch (error) {
    console.error("Error fetching learning goals:", error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

export const clearChat = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/chat/clear?username=${encodeURIComponent(username)}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error clearing chat history:", error);
    throw error;
  }
};

export const savePreferencesAPI = async (preferences) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/chat/save-preferences`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ username, preferences }),
    });

    return data;
  } catch (error) {
    console.error("Error saving preferences:", error);
    throw error;
  }
};

// Get User Profile API Call
export const getUserProfile = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/auth/profile?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    // Update local admin status if it changed
    if (data.isAdmin !== undefined) {
      localStorage.setItem("isAdmin", data.isAdmin);
    }
    
    // Update avatar URL if it exists
    if (data.avatarUrl || data.profile?.avatar_url) {
      const avatarUrl = data.avatarUrl || data.profile?.avatar_url;
      localStorage.setItem("avatarUrl", avatarUrl);
    }

    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    // Return default data if API fails
    return {
      name: localStorage.getItem("name") || "User",
      username: username,
      isAdmin: localStorage.getItem("isAdmin") === "true",
      preferences: {
        timeValue: 15,
        ageGroup: "Above 18",
        language: "English",
        userRole: "Student",
      },
      avatarUrl: localStorage.getItem("avatarUrl")
    };
  }
};

// Update User Profile API Call
export const updateUserProfile = async (profileData) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/auth/update-profile`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        username, 
        profile: profileData 
      }),
    });

    // Update avatar URL in localStorage if it was updated
    if (profileData.avatar_url) {
      localStorage.setItem("avatarUrl", profileData.avatar_url);
    }

    return data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Update User Password API Call
export const updateUserPassword = async (currentPassword, newPassword) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/auth/update-password`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        username, 
        current_password: currentPassword,
        new_password: newPassword
      }),
    });

    return data;
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
};

// Get User Statistics API Call
export const getUserStats = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/chat/user-stats?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching user stats:", error);
    // Return default stats if API fails
    return {
      totalGoals: 0,
      completedGoals: 0,
      totalQuizzes: 0,
      averageScore: 0,
      streakDays: 0,
      totalStudyTime: 0
    };
  }
};

// Get Assessments API Call
export const getAssessments = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/chat/assessments?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data.assessments || [];
  } catch (error) {
    console.error("Error fetching assessments:", error);
    return [];
  }
};

// Delete Learning Goal API Call
export const deleteLearningGoal = async (goalName) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/chat/delete-goal`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ username, goal_name: goalName }),
    });

    return data;
  } catch (error) {
    console.error("Error deleting learning goal:", error);
    throw error;
  }
};

// Update Learning Goal API Call
export const updateLearningGoal = async (goalName, updatedGoal) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/chat/update-goal`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        username, 
        goal_name: goalName, 
        updated_goal: updatedGoal 
      }),
    });

    return data;
  } catch (error) {
    console.error("Error updating learning goal:", error);
    throw error;
  }
};

// Test API connectivity
export const testConnection = async () => {
  try {
    const data = await apiRequest(`${API_BASE_URL}/health`);
    console.log("✅ Backend connection successful:", data);
    return data;
  } catch (error) {
    console.error("❌ Backend connection failed:", error);
    throw error;
  }
};

// Search messages
export const searchMessages = async (query) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/chat/search?username=${encodeURIComponent(username)}&query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data.messages || [];
  } catch (error) {
    console.error("Error searching messages:", error);
    return [];
  }
};

// Get chat analytics
export const getChatAnalytics = async (days = 30) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/chat/analytics?username=${encodeURIComponent(username)}&days=${days}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data.analytics || [];
  } catch (error) {
    console.error("Error fetching chat analytics:", error);
    return [];
  }
};

// Generate quiz from AI
export const generateQuiz = async (topic, difficulty = "medium", numQuestions = 5) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    // First try the dedicated quiz API endpoint
    try {
      const data = await apiRequest(`${API_BASE_URL}/quiz/generate-ai-quiz`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          topic,
          difficulty,
          num_questions: numQuestions,
          time_limit: numQuestions * 2 // 2 minutes per question
        }),
      });

      return data;
    } catch (error) {
      // If the dedicated endpoint fails, fall back to the chat API
      console.error("Error generating quiz:", error);
      console.log("Falling back to chat API for quiz generation");
      
      let quizData = null;
      await askQuestion(
        `Create a quiz about ${topic} with ${numQuestions} questions at ${difficulty} difficulty level.`,
        (response) => {
          if (typeof response === 'object') {
            quizData = response;
          }
        },
        () => {},
        true,
        false
      );
      
      return quizData;
    }
  } catch (error) {
    console.error("Error generating quiz (all methods failed):", error);
    throw error;
  }
};

// Submit quiz answers
export const submitQuiz = async (quizId, answers) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    // First try the dedicated quiz API endpoint
    try {
      const data = await apiRequest(`${API_BASE_URL}/quiz/submit-ai-quiz`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          quiz_id: quizId,
          answers
        }),
      });

      return data;
    } catch (error) {
      // If the dedicated endpoint fails, fall back to the chat API
      console.error("Error submitting quiz:", error);
      console.log("Falling back to chat API for quiz submission");
      
      // Create a string with the questions and answers
      const answersText = Object.entries(answers).map(([id, answer]) => {
        return `Q${id}: Answer: ${answer}`;
      }).join('\n');
      
      let resultData = null;
      await askQuestion(
        `Please grade my quiz answers:\n\n${answersText}`,
        (response) => {
          if (typeof response === 'object') {
            resultData = response;
          }
        },
        () => {},
        true,
        false
      );
      
      return resultData;
    }
  } catch (error) {
    console.error("Error submitting quiz (all methods failed):", error);
    throw error;
  }
};

// Get quiz history
export const getQuizHistory = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/quiz/quiz-history?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data.quiz_history || [];
  } catch (error) {
    console.error("Error fetching quiz history:", error);
    return [];
  }
};

// Get active quizzes
export const getActiveQuizzes = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/quiz/active-quizzes?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data.active_quizzes || [];
  } catch (error) {
    console.error("Error fetching active quizzes:", error);
    return [];
  }
};

// Update learning path progress
export const updateLearningPathProgress = async (pathId, topicIndex, completed) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    // Try the learning paths API first
    try {
      const data = await apiRequest(`${API_BASE_URL}/learning-paths/progress/update`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          path_id: pathId,
          topic_index: topicIndex,
          completed
        }),
      });
      return data;
    } catch (error) {
      // If that fails, try the chat API
      console.error("Learning paths API error:", error);
      console.log("Falling back to chat API for progress update");
      
      const data = await apiRequest(`${API_BASE_URL}/chat/update-goal`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          goal_name: pathId,
          updated_goal: {
            // We don't have the full goal structure here, so this is a best effort
            progress: completed ? 100 : 0
          }
        }),
      });
      return data;
    }
  } catch (error) {
    console.error("Error updating learning path progress (all methods failed):", error);
    // Return a default response instead of throwing
    return { success: false, message: "Failed to update progress" };
  }
};

// Get learning path details
export const getLearningPathDetails = async (pathId) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    // Try the learning paths API first
    try {
      const data = await apiRequest(
        `${API_BASE_URL}/learning-paths/detail/${pathId}?username=${encodeURIComponent(username)}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      return data.path;
    } catch (error) {
      // If that fails, return null and let the UI handle it
      console.error("Learning paths API error:", error);
      return null;
    }
  } catch (error) {
    console.error("Error getting learning path details:", error);
    return null;
  }
};

// Get lesson detail
export const getLessonDetail = async (lessonId) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/lessons/${lessonId}?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching lesson detail:", error);
    throw error;
  }
};

// Generate avatar video
export const generateAvatar = async (
  lessonId, 
  avatarImageUrl, 
  voiceLanguage = "en", 
  voiceId = null,
  voiceType = "default_male",
  voiceUrl = null
) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/avatar/generate-avatar`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        lesson_id: lessonId,
        avatar_image_url: avatarImageUrl,
        voice_language: voiceLanguage,
        voice_id: voiceId,
        voice_type: voiceType,
        voice_url: voiceUrl
      }),
    });

    return data;
  } catch (error) {
    console.error("Error generating avatar:", error);
    throw error;
  }
};

// Get avatar status
export const getAvatarStatus = async (lessonId) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/avatar/status/${lessonId}?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching avatar status:", error);
    throw error;
  }
};

// Get available voices
export const getAvailableVoices = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/avatar/available-voices`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching available voices:", error);
    throw error;
  }
};

// Create voice clone
export const createVoiceClone = async (audioUrl, voiceName) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/avatar/create-voice-clone`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        voice_name: voiceName
      }),
    });

    return data;
  } catch (error) {
    console.error("Error creating voice clone:", error);
    throw error;
  }
};

// Get voice status
export const getVoiceStatus = async (voiceId) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/avatar/voice-status/${voiceId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching voice status:", error);
    throw error;
  }
};

// Get predefined avatars
export const getPredefinedAvatars = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/avatar/predefined-avatars`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data.avatars || [];
  } catch (error) {
    console.error("Error fetching predefined avatars:", error);
    return [];
  }
};

// Upload file to S3
export const uploadFile = async (file, folder = "uploads") => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    // Create form data
    const formData = new FormData();
    formData.append("file", file);
    
    // Determine endpoint based on file type
    let endpoint = "image";
    if (file.type.startsWith("audio/")) {
      endpoint = "audio";
    } else if (file.type.startsWith("video/")) {
      endpoint = "video";
    }
    
    const response = await fetch(`${API_BASE_URL}/upload/${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

// Generate lesson script
export const generateLessonScript = async (lessonId) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/lessons/${lessonId}/script?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error generating lesson script:", error);
    throw error;
  }
};

// Generate avatar video for lesson
export const generateAvatarVideo = async (lessonId, avatarUrl, voiceUrl = null, voiceType = "default_male") => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/lessons/generate-avatar-video`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        lesson_id: lessonId,
        avatar_url: avatarUrl,
        voice_url: voiceUrl,
        voice_type: voiceType
      }),
    });

    return data;
  } catch (error) {
    console.error("Error generating avatar video:", error);
    throw error;
  }
};

// Get video status
export const getVideoStatus = async (lessonId) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/lessons/${lessonId}/video-status?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching video status:", error);
    throw error;
  }
};