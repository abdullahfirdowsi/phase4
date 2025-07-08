// Frontend debugging script to help identify the UI issue
// Run this in the browser console while on the Learning Paths page

console.log('🔍 Frontend Learning Path Debug Script Started');

// Check if the user is logged in
const username = localStorage.getItem('username');
const token = localStorage.getItem('token');

console.log('👤 User Authentication:', {
  username: username,
  hasToken: !!token,
  tokenLength: token ? token.length : 0
});

// Check if the getAllLearningPaths function exists
if (typeof getAllLearningPaths === 'function') {
  console.log('✅ getAllLearningPaths function is available');
  
  // Test the function directly
  getAllLearningPaths().then(paths => {
    console.log('📊 getAllLearningPaths returned:', paths.length, 'paths');
    paths.forEach((path, i) => {
      console.log(`  ${i + 1}. "${path.name}" (${path.difficulty}) - ${path.created_at}`);
    });
  }).catch(error => {
    console.error('❌ getAllLearningPaths error:', error);
  });
} else {
  console.log('❌ getAllLearningPaths function not found');
}

// Check if React components are mounted
const reactElements = document.querySelectorAll('[data-reactroot], [data-react-root]');
console.log('⚛️ React elements found:', reactElements.length);

// Check for learning path elements in the DOM
const learningPathElements = document.querySelectorAll('[class*="learning"], [class*="path"], [class*="card"]');
console.log('📋 Learning path related elements:', learningPathElements.length);

// Check for error messages in the DOM
const errorElements = document.querySelectorAll('[class*="error"], [class*="alert"]');
console.log('⚠️ Error elements:', errorElements.length);

// Test the API directly from browser
console.log('🌐 Testing API directly from browser...');
fetch(`http://localhost:8000/learning-paths/list?username=${encodeURIComponent(username)}&t=${Date.now()}`)
  .then(response => response.json())
  .then(data => {
    console.log('✅ Direct API call successful:', data.learning_paths.length, 'paths');
    console.log('📋 Paths from direct API call:');
    data.learning_paths.forEach((path, i) => {
      console.log(`  ${i + 1}. "${path.name}" (${path.difficulty})`);
    });
  })
  .catch(error => {
    console.error('❌ Direct API call failed:', error);
  });

// Check localStorage for any saved learning path events
const lastSavedPath = localStorage.getItem('lastSavedLearningPath');
console.log('💾 Last saved learning path event:', lastSavedPath);

// Listen for learning path events
console.log('📢 Setting up event listeners...');
window.addEventListener('learningPathSaved', (event) => {
  console.log('📢 learningPathSaved event received:', event.detail);
});

window.addEventListener('storage', (event) => {
  if (event.key === 'lastSavedLearningPath') {
    console.log('💾 Storage event received:', event.newValue);
  }
});

// Test event dispatching
console.log('🧪 Testing event dispatching...');
window.dispatchEvent(new CustomEvent('learningPathSaved', {
  detail: {
    pathName: 'Test Path',
    timestamp: Date.now(),
    pathId: 'test_123',
    username: username,
    success: true
  }
}));

// Instructions for user
console.log(`
🎯 Next Steps for Debugging:

1. Check if you see any learning paths displayed on the page
2. Look for any error messages in the UI
3. Try refreshing the page
4. Check the Network tab in DevTools for API requests
5. Look for any console errors in the browser

If the API is returning ${11} paths but the UI shows 0 or fewer paths, 
the issue is likely in:
- React component state management
- Error handling in the getAllLearningPaths function
- Authentication token issues
- Component mounting/unmounting issues

Run this script again after making changes to see if the issue is resolved.
`);

console.log('🔍 Frontend Debug Script Completed');
