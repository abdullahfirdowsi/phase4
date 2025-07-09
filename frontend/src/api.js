export const getUserSkillLevel = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const response = await fetch(`${API_BASE_URL}/user/skill-level`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.skillLevel;
  } catch (error) {
    console.error("Error fetching user skill level:", error);
    throw error;
  }
};

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

    // Log additional information
    console.error('❌ Request URL:', url);
    console.error('❌ Request Options:', JSON.stringify(defaultOptions, null, 2));
    console.error('❌ Request Error:', error);

    if (error.message.includes('Internal Server Error')) {
      console.error('❌ Possible data issue:', JSON.stringify(defaultOptions.body, null, 2));
    }
    
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
    // Check if this is a Google OAuth user who needs to set a password
    if (error.message === "google_oauth_password_setup_required") {
      // Create a special error object with the username for the UI to handle
      const passwordSetupError = new Error("Password setup required for Google OAuth user");
      passwordSetupError.code = "PASSWORD_SETUP_REQUIRED";
      passwordSetupError.username = username;
      throw passwordSetupError;
    }
    
    throw new Error(error.message || "Login failed");
  }
};

export const signup = async (name, username, password, isAdmin = false) => {
  try {
    // Check if this is the default admin email
    const isDefaultAdmin = username.toLowerCase() === "blackboxgenai@gmail.com";
    
    const requestBody = { 
      name, 
      username: username, // Use the username parameter (which is the email) for the username field
      email: username,    // Explicitly add the email field using the same value
      password, 
      isAdmin: isAdmin || isDefaultAdmin 
    };
    
    console.log('🔍 Signup API - Parameters received:', { name, username, password, isAdmin });
    console.log('🔍 Signup API - Request body:', requestBody);
    
    const data = await apiRequest(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      body: JSON.stringify(requestBody),
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

// Setup password for Google OAuth users
export const setupPasswordForGoogleUser = async (username, newPassword) => {
  try {
    const data = await apiRequest(`${API_BASE_URL}/auth/setup-password`, {
      method: "POST",
      body: JSON.stringify({ 
        username: username, 
        new_password: newPassword 
      }),
    });

    return data;
  } catch (error) {
    throw new Error(error.message || "Password setup failed");
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
  const token = localStorage.getItem("token");
  
  if (!username) {
    console.warn("User not authenticated - missing username");
    throw new Error("Please log in to view chat history");
  }
  
  if (!token) {
    console.warn("User not authenticated - missing token");
    throw new Error("Please log in to view chat history");
  }

  console.log(`📚 Fetching chat history for user: ${username}`);

  try {
    // Use the working legacy endpoint first (this is where messages are actually stored)
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`
    };
    
    const data = await apiRequest(
      `${API_BASE_URL}/chat/history?username=${encodeURIComponent(username)}&limit=100`,
      { 
        method: "GET",
        headers: headers
      }
    );

    console.log('📚 Fetched chat history from working API:', {
      success: true,
      messageCount: data.history?.length || 0,
      data: data
    });
    
    // Process messages to ensure proper structure
    const processedHistory = (data.history || []).map(msg => ({
      ...msg,
      // Ensure proper type mapping
      type: msg.type || msg.message_type || (msg.role === 'user' ? 'content' : 'content'),
      // Ensure ID exists
      id: msg.id || `msg_${Date.now()}_${Math.random()}`
    }));
    
    return processedHistory;
  } catch (error) {
    console.error("Error fetching chat history from working API:", error);
    
    // Handle specific error types
    if (error.message.includes('401') || error.message.includes('authenticated')) {
      throw new Error("Authentication failed. Please log in again.");
    }
    
    // Fallback to new endpoint if legacy fails
    try {
      const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      };
      
      const data = await apiRequest(
        `${API_BASE_URL}/api/chat/history?username=${encodeURIComponent(username)}&limit=100`,
        { 
          method: "GET",
          headers: headers
        }
      );
      
      console.log('📚 Fetched chat history from fallback API:', {
        success: true,
        messageCount: data.history?.length || 0,
        data: data
      });
      
      // Process messages to ensure proper structure
      const processedHistory = (data.history || []).map(msg => ({
        ...msg,
        // Ensure proper type mapping
        type: msg.type || msg.message_type || (msg.role === 'user' ? 'content' : 'content'),
        // Ensure ID exists
        id: msg.id || `msg_${Date.now()}_${Math.random()}`
      }));
      
      return processedHistory;
    } catch (fallbackError) {
      console.error("Fallback chat history fetch also failed:", fallbackError);
      
      // Handle specific error types
      if (fallbackError.message.includes('401') || fallbackError.message.includes('authenticated')) {
        throw new Error("Authentication failed. Please log in again.");
      }
      
      // Return empty array instead of throwing to prevent UI crashes
      console.warn("Returning empty chat history due to API failures");
      return [];
    }
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

// Get All Learning Paths API Call with Complete Data
export const getAllLearningPaths = async (filters = {}) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username) {
    console.error("No username found in localStorage");
    return [];
  }

  try {
    // Build query parameters
    const queryParams = new URLSearchParams({
      username,
      include_topics: 'true', // Request complete data
      ...filters,
      t: Date.now(), // Cache buster
      r: Math.random().toString(36).substring(7), // Additional randomization
      _cb: `${Date.now()}_${Math.random()}` // Extra cache buster
    });

    console.log('🔄 Fetching complete learning paths data:', `${API_BASE_URL}/learning-paths/list?${queryParams}`);
    console.log('🔄 Using username:', username);
    console.log('🔄 Token present:', !!token);

    const response = await fetch(`${API_BASE_URL}/learning-paths/list?${queryParams}`, {
      method: "GET",
      headers: {
        ...(token && { "Authorization": `Bearer ${token}` }),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return [];
    }

    const data = await response.json();
    console.log('✅ Complete learning paths data fetched:', data);
    
    // If the backend doesn't support include_topics, fall back to fetching details individually
    let completePaths = data.learning_paths || [];
    
    if (completePaths.length > 0 && !completePaths[0].topics) {
      console.log('🔄 Backend doesn\'t include topics in list, fetching details individually...');
      
      // Fetch complete data for each path
      const pathsWithDetails = await Promise.all(
        completePaths.map(async (path) => {
          try {
            const detailData = await getLearningPathDetail(path.id);
            if (detailData) {
              // Merge list data with detail data
              return {
                ...path,
                ...detailData,
                topics_count: detailData.topics?.length || path.topics_count || 0
              };
            }
            return path;
          } catch (error) {
            console.warn(`Failed to fetch details for path ${path.id}:`, error);
            return path;
          }
        })
      );
      
      completePaths = pathsWithDetails;
    } else {
      // Ensure topics_count is set correctly
      completePaths = completePaths.map(path => ({
        ...path,
        topics_count: path.topics?.length || path.topics_count || 0
      }));
    }
    
    console.log('📊 Final paths with complete data:', completePaths.length);
    completePaths.forEach((path, index) => {
      console.log(`Path ${index + 1}: "${path.name}" - Topics: ${path.topics?.length || 0}, Count: ${path.topics_count}`);
    });
    
    return completePaths;
  } catch (error) {
    console.error("Error fetching learning paths:", error);
    console.error("Error details:", error.message);
    return [];
  }
};

// Get Learning Path Detail API Call
export const getLearningPathDetail = async (pathId) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username) {
    console.error("No username found in localStorage");
    return null;
  }

  try {
    console.log('🔄 Fetching learning path detail:', pathId);
    
    const response = await fetch(`${API_BASE_URL}/learning-paths/detail/${encodeURIComponent(pathId)}?username=${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        ...(token && { "Authorization": `Bearer ${token}` }),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Learning path detail fetched successfully:', data);
    
    return data.path || null;
  } catch (error) {
    console.error("Error fetching learning path detail:", error);
    console.error("Error details:", error.message);
    return null;
  }
};

// Update Learning Path Progress API Call
export const updateLearningPathProgress = async (pathId, topicIndex, completed) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username) {
    console.error("No username found in localStorage");
    return null;
  }

  try {
    console.log('🔄 Updating learning path progress:', pathId, topicIndex, completed);
    
    const response = await fetch(`${API_BASE_URL}/learning-paths/progress/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` }),
      },
      body: JSON.stringify({
        username,
        path_id: pathId,
        topic_index: topicIndex,
        completed
      }),
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Learning path progress updated successfully:', data);
    
    return data;
  } catch (error) {
    console.error("Error updating learning path progress:", error);
    console.error("Error details:", error.message);
    return null;
  }
};

export const clearChat = async () => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  console.log('🗑️ Starting COMPLETE chat clear process for user:', username);

  try {
    // Use the clear-all endpoint to remove ALL messages (including learning paths and quizzes)
    console.log('🗑️ Clearing ALL chat messages via clear-all endpoint...');
    const data = await apiRequest(
      `${API_BASE_URL}/chat/clear-all?username=${encodeURIComponent(username)}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      }
    );
    
    console.log('✅ All chat messages cleared successfully:', data);
    return { success: true, message: data.message };
    
  } catch (error) {
    console.error("❌ Clear-all endpoint failed, trying regular clear as fallback:", error.message);
    
    // Fallback to regular clear endpoint if clear-all fails
    try {
      console.log('🗑️ Attempting fallback clear via /chat/clear...');
      const fallbackData = await apiRequest(
        `${API_BASE_URL}/chat/clear?username=${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        }
      );
      
      console.log('✅ Chat cleared via fallback (content only):', fallbackData);
      return { success: true, message: fallbackData.message };
      
    } catch (fallbackError) {
      console.error("❌ All clear endpoints failed:", fallbackError.message);
      throw new Error(`Failed to clear chat: ${error.message}. Fallback also failed: ${fallbackError.message}`);
    }
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
export const updateUserProfile = async (userData) => {
  const token = localStorage.getItem("token");

  if (!token) throw new Error("User not authenticated");

  try {
    console.log('📤 updateUserProfile - Sending request:', userData);
    
    const requestBody = {
      username: userData.username,
      name: userData.name,
      profile: userData.profile
    };
    
    const data = await apiRequest(`${API_BASE_URL}/auth/update-profile`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    // Update name in localStorage if it was updated
    if (userData.name) {
      localStorage.setItem("name", userData.name);
    }

    // Update avatar URL in localStorage if it was updated
    if (userData.profile?.avatar_url) {
      localStorage.setItem("avatarUrl", userData.profile.avatar_url);
    }

    return data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Update User Info (including name) API Call
export const updateUserInfo = async (userData) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const requestPayload = { 
      username,
      name: userData.name,
      profile: userData.profile
    };
    
    console.log('📤 updateUserInfo - Sending request:', requestPayload);
    console.log('📤 Profile data type:', typeof userData.profile);
    console.log('📤 Profile data content:', userData.profile);
    
    const data = await apiRequest(`${API_BASE_URL}/auth/update-user-info`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(requestPayload),
    });

    // Update name in localStorage if it was updated
    if (userData.name) {
      localStorage.setItem("name", userData.name);
    }

    // Update avatar URL in localStorage if it was updated
    if (userData.profile?.avatar_url) {
      localStorage.setItem("avatarUrl", userData.profile.avatar_url);
    }

    return data;
  } catch (error) {
    console.error("Error updating user info:", error);
    throw error;
  }
};

// Update User Preferences API Call
export const updateUserPreferences = async (preferencesData) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/auth/update-preferences`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        username, 
        preferences: preferencesData 
      }),
    });

    return data;
  } catch (error) {
    console.error("Error updating user preferences:", error);
    throw error;
  }
};

// Update User Password API Call
export const updatePassword = async (currentPassword, newPassword) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/profile/password`, {
      method: "PATCH",
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

// Update Learning Path Progress API Call (from chat)
export const updateLearningPathProgressFromChat = async (pathId, topicId, completed = true) => {
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

// Store quiz message directly to chat history
export const storeQuizMessage = async (userMessage, quizMessage, sessionId = null) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const data = await apiRequest(`${API_BASE_URL}/chat/store-quiz`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        user_message: userMessage,
        quiz_message: quizMessage,
        session_id: sessionId  // Pass session ID from frontend
      }),
    });

    console.log('✅ Quiz message stored to backend successfully');
    return data;
  } catch (error) {
    console.error("Error storing quiz message:", error);
    throw error;
  }
};

// Store quiz result from AI Chat to be accessible in Quiz System
// Note: The quiz result is already stored when submitQuiz() is called
// This function is now mainly for logging and verification
export const storeAIChatQuizResult = async (quizResult) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    console.log('📤 AI Chat quiz result (already stored via submitQuiz):', {
      quiz_id: quizResult.quiz_id,
      score_percentage: quizResult.score_percentage,
      correct_answers: quizResult.correct_answers,
      total_questions: quizResult.total_questions,
      source: 'ai_chat'
    });

    // The result is already stored in the database via submitQuiz() call
    // The backend automatically stores it in the quiz_history when /quiz/submit is called
    // So we just return success to indicate the AI Chat quiz was completed
    
    console.log('✅ AI Chat quiz result already stored via submitQuiz() - Quiz System integration complete');
    
    return { 
      success: true, 
      message: 'Quiz result stored via submitQuiz endpoint',
      quiz_id: quizResult.quiz_id,
      stored_via: 'quiz_submit_endpoint'
    };
    
  } catch (error) {
    console.error("Error in storeAIChatQuizResult:", error);
    // Don't throw error since the result is already stored via submitQuiz
    console.warn('⚠️ AI Chat quiz result logging failed, but quiz was already submitted successfully');
    return { 
      success: true, 
      message: 'Quiz submitted successfully despite logging error',
      warning: error.message 
    };
  }
};

// Quiz System API Calls
export const generateQuiz = async (topic, difficulty = "medium", questionCount = 5) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  if (!username || !token) throw new Error("User not authenticated");

  try {
    const requestBody = {
      username,
      topic,
      difficulty,
      question_count: questionCount,
      time_limit: Math.max(questionCount * 2, 10) // 2 minutes per question, minimum 10
    };
    
    console.log('📤 Sending quiz generation request:', requestBody);
    
    // Try AI quiz generator endpoint first
    try {
      const data = await apiRequest(`${API_BASE_URL}/quiz/generate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('✅ AI Quiz generated successfully:', data);
      return data;
    } catch (aiError) {
      console.log('⚠️ AI quiz generation failed, trying fallback...', aiError.message);
      
      // Fallback to manual quiz generation if AI fails
      const fallbackData = {
        response: `Here's your ${topic} quiz! Let's test your knowledge.`,
        type: "quiz",
        quiz_data: {
          quiz_id: `quiz_${Date.now()}`,
          topic: topic,
          difficulty: difficulty,
          total_questions: questionCount,
          time_limit: Math.max(questionCount * 2, 10),
          questions: Array.from({length: questionCount}, (_, i) => ({
            question_number: i + 1,
            question: `Sample ${topic} question ${i + 1}?`,
            type: "mcq",
            options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
            correct_answer: "A",
            explanation: `This is the explanation for question ${i + 1} about ${topic}.`
          }))
        }
      };
      
      console.log('🔄 Using fallback quiz data:', fallbackData);
      return fallbackData;
    }
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
        "Content-Type": "application/json",
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
