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
      let errorMessage;
      if (typeof data === 'object' && data !== null) {
        // Handle validation errors (array of error objects)
        if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map(err => {
            if (typeof err === 'object') {
              return `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg || 'Validation error'}`;
            }
            return err;
          }).join(', ');
        } else {
          errorMessage = data?.detail || data?.message || JSON.stringify(data);
        }
      } else {
        errorMessage = data || `HTTP ${response.status}: ${response.statusText}`;
      }
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

// User Lessons API Calls
export const getUserLessons = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/lessons/user?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching user lessons:", error);
    // Return empty array to prevent UI crashes
    return { lessons: [] };
  }
};

export const createUserLesson = async (lessonData) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/lessons/user`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,
        lesson_data: lessonData
      }),
    });

    return data;
  } catch (error) {
    console.error("Error creating lesson:", error);
    throw error;
  }
};

export const updateLesson = async (lessonId, lessonData) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/lessons/user/${lessonId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,
        lesson_data: lessonData
      }),
    });

    return data;
  } catch (error) {
    console.error("Error updating lesson:", error);
    throw error;
  }
};

export const getLessonDetail = async (lessonId) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/lessons/user/${lessonId}?username=${encodeURIComponent(username)}`,
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

export const deleteUserLesson = async (lessonId) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/lessons/user/${lessonId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ username }),
    });

    return data;
  } catch (error) {
    console.error("Error deleting lesson:", error);
    throw error;
  }
};

export const updateLessonProgress = async (lessonId, progress, completed = false) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/lessons/user/${lessonId}/progress`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,
        progress,
        completed
      }),
    });

    return data;
  } catch (error) {
    console.error("Error updating lesson progress:", error);
    throw error;
  }
};

export const saveLesson = async (lessonId, save = true) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/lessons/user/${lessonId}/save`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,
        save
      }),
    });

    return data;
  } catch (error) {
    console.error("Error saving lesson:", error);
    throw error;
  }
};

// Admin User Management API Calls
export const getUsers = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/admin/users?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const updateUserStatus = async (targetUsername, status) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/admin/users/${targetUsername}/status`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        admin_username: username,
        status
      }),
    });

    return data;
  } catch (error) {
    console.error("Error updating user status:", error);
    throw error;
  }
};

export const deleteUser = async (targetUsername) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/admin/users/${targetUsername}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        admin_username: username
      }),
    });

    return data;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Admin Content Moderation API Calls
export const getContentForModeration = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/admin/moderation?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching content for moderation:", error);
    throw error;
  }
};

export const moderateContent = async (contentId, action, reason = null) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/admin/moderation/${contentId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        admin_username: username,
        action,
        reason
      }),
    });

    return data;
  } catch (error) {
    console.error("Error moderating content:", error);
    throw error;
  }
};

// Admin Analytics API Calls
export const getAdminAnalytics = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/admin/analytics?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    throw error;
  }
};

// Admin System Configuration API Calls
export const getSystemConfig = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/admin/config?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching system config:", error);
    throw error;
  }
};

export const updateSystemConfig = async (configData) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/admin/config`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        admin_username: username,
        config: configData
      }),
    });

    return data;
  } catch (error) {
    console.error("Error updating system config:", error);
    throw error;
  }
};

// Admin Popular Content API Calls
export const getPopularContent = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/admin/popular-content?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching popular content:", error);
    throw error;
  }
};

export const featureContent = async (contentId, featured = true) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/admin/popular-content/${contentId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        admin_username: username,
        featured
      }),
    });

    return data;
  } catch (error) {
    console.error("Error featuring content:", error);
    throw error;
  }
};

// Save Learning Path API Call
export const saveLearningPath = async (learningPathData) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const requestBody = {
      username: username,
      path_data: learningPathData
    };
    
    console.log('📤 Sending learning path request:', requestBody);
    
    const data = await apiRequest(`${API_BASE_URL}/learning-paths/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    return data;
  } catch (error) {
    console.error("Error saving learning path:", error);
    throw error;
  }
};

// Update Learning Path Progress API Call
export const updateLearningPathProgress = async (pathId, topicId, completed = true) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/chat/update-learning-path-progress`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,
        path_id: pathId,
        topic_id: topicId,
        completed
      }),
    });

    return data;
  } catch (error) {
    console.error("Error updating learning path progress:", error);
    throw error;
  }
};

// Quiz System API Calls
export const generateQuiz = async (topic, difficulty = "medium", questionCount = 5) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/quiz/generate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,
        topic,
        difficulty,
        question_count: questionCount
      }),
    });

    return data;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};

export const submitQuiz = async (quizId, answers) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/quiz/submit`, {
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

export const getQuizHistory = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(
      `${API_BASE_URL}/quiz/history?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    return data.history || [];
  } catch (error) {
    console.error("Error fetching quiz history:", error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

// Search Messages API Call
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
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

// Get Chat Analytics API Call
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
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};
