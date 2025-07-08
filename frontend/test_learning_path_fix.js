// Test script to verify learning path save and display functionality
console.log('🧪 Testing Learning Path Save & Display Fix');

// Simulate the event dispatch from AI Chat
const testLearningPathSave = () => {
  console.log('1. Testing event dispatch...');
  
  // Create test event data
  const eventDetail = {
    pathName: 'Test Learning Path',
    timestamp: Date.now(),
    pathId: 'test_123',
    username: 'test_user',
    success: true
  };
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('learningPathSaved', {
    detail: eventDetail
  }));
  
  // Also test localStorage communication
  localStorage.setItem('lastSavedLearningPath', JSON.stringify(eventDetail));
  
  console.log('✅ Events dispatched successfully');
};

// Test API endpoint
const testAPIEndpoint = async () => {
  console.log('2. Testing API endpoint...');
  
  try {
    const response = await fetch('http://localhost:8000/learning-paths/list?username=test_user&t=' + Date.now());
    const data = await response.json();
    
    console.log('API Response:', data);
    console.log('Learning paths found:', data.learning_paths?.length || 0);
    
    if (data.learning_paths?.length > 0) {
      console.log('✅ API endpoint working - found learning paths');
      data.learning_paths.forEach((path, i) => {
        console.log(`  ${i + 1}. ${path.name} (${path.created_at})`);
      });
    } else {
      console.log('⚠️  API endpoint working but no learning paths found');
    }
  } catch (error) {
    console.error('❌ API endpoint error:', error);
  }
};

// Test localStorage event
const testStorageEvent = () => {
  console.log('3. Testing storage event...');
  
  // Listen for storage changes
  window.addEventListener('storage', (event) => {
    if (event.key === 'lastSavedLearningPath') {
      console.log('✅ Storage event detected:', event.newValue);
    }
  });
  
  // Trigger storage event
  localStorage.setItem('lastSavedLearningPath', JSON.stringify({
    pathName: 'Storage Test Path',
    timestamp: Date.now()
  }));
};

// Run tests
const runTests = async () => {
  console.log('🚀 Starting Learning Path Fix Tests...\n');
  
  testLearningPathSave();
  await testAPIEndpoint();
  testStorageEvent();
  
  console.log('\n✅ All tests completed!');
  console.log('Now navigate to Learning Paths page to see if it refreshes automatically.');
};

// Export for browser console
window.testLearningPathFix = runTests;

console.log('💡 Run window.testLearningPathFix() in browser console to test');
