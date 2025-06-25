// Enhanced API configuration with better error handling and CORS support
const API_BASE_URL = "http://localhost:8000"; // Updated to point to FastAPI backend

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
    throw error;
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
    console.error("Error generating quiz:", error);
    // Fallback to using the chat API for quiz generation
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
};

// Submit quiz answers
export const submitQuiz = async (quizId, answers) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

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
    console.error("Error submitting quiz:", error);
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