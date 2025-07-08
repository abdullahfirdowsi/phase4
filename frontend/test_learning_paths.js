// Test script to verify learning paths are working properly
// Run this in the browser console on the Learning page

console.log("🔍 Testing Learning Paths Frontend...");

// Test 1: Check if user is authenticated
const username = localStorage.getItem("username");
const authToken = localStorage.getItem("authToken");
console.log("👤 User authentication:", { username, hasToken: !!authToken });

// Test 2: Test the API call directly
async function testLearningPathsAPI() {
  try {
    console.log("📡 Testing getAllLearningPaths API call...");
    
    // Import the API function (this works if the API is properly loaded)
    const response = await fetch(`http://localhost:8000/learning-paths/user?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API Response successful:", data);
      console.log(`📊 Found ${data.learningPaths?.length || 0} learning paths`);
      
      if (data.learningPaths && data.learningPaths.length > 0) {
        console.log("📋 Learning paths details:");
        data.learningPaths.forEach((path, index) => {
          console.log(`  ${index + 1}. "${path.name}" (${path.created_at})`);
        });
      }
      
      return data;
    } else {
      console.error("❌ API call failed:", response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error("❌ Error calling API:", error);
    return null;
  }
}

// Test 3: Check React component state
function checkReactState() {
  console.log("⚛️ Checking React component state...");
  
  // Look for the Learning component's state
  const learningCards = document.querySelectorAll('.my-learning-card');
  console.log(`🎯 Found ${learningCards.length} learning path cards in the DOM`);
  
  const emptyState = document.querySelector('.empty-state');
  if (emptyState) {
    console.log("🚫 Empty state is showing:", emptyState.textContent.trim());
  }
  
  // Check if there are any error messages
  const errorAlerts = document.querySelectorAll('.alert-danger');
  if (errorAlerts.length > 0) {
    console.log("⚠️ Error alerts found:");
    errorAlerts.forEach(alert => console.log("  ", alert.textContent.trim()));
  }
  
  // Check tab state
  const tabButtons = document.querySelectorAll('.learning-tabs button');
  tabButtons.forEach(button => {
    if (button.classList.contains('btn-primary')) {
      console.log("📑 Active tab:", button.textContent.trim());
    }
  });
}

// Test 4: Check for console errors
function checkConsoleErrors() {
  console.log("🔍 Checking for console errors...");
  
  // Override console.error temporarily to catch errors
  const originalError = console.error;
  const errors = [];
  
  console.error = function(...args) {
    errors.push(args);
    originalError.apply(console, args);
  };
  
  // Restore after a short delay
  setTimeout(() => {
    console.error = originalError;
    if (errors.length > 0) {
      console.log("❌ Console errors found:", errors);
    } else {
      console.log("✅ No console errors detected");
    }
  }, 1000);
}

// Test 5: Check network requests
function checkNetworkRequests() {
  console.log("🌐 Monitoring network requests...");
  
  // Check if fetch is being called
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log("📡 Network request:", args[0], args[1]?.method || 'GET');
    return originalFetch.apply(this, args);
  };
  
  // Restore after 5 seconds
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log("📡 Network monitoring stopped");
  }, 5000);
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Starting comprehensive frontend test...");
  
  // Test authentication
  if (!username || !authToken) {
    console.error("❌ User not authenticated. Please log in first.");
    return;
  }
  
  // Test API
  const apiData = await testLearningPathsAPI();
  
  // Test React state
  checkReactState();
  
  // Test console errors
  checkConsoleErrors();
  
  // Test network requests
  checkNetworkRequests();
  
  console.log("✅ All tests completed. Check the logs above for results.");
  
  // Return API data for further inspection
  return apiData;
}

// Run the tests
runAllTests().then(result => {
  console.log("🎉 Test completed. Result:", result);
});
