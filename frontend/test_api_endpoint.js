// Node.js compatible test for Learning Path API endpoint
import fetch from 'node-fetch';

const testAPIEndpoint = async () => {
  console.log('🧪 Testing Learning Path API Endpoint...\n');
  
  try {
    const url = `http://localhost:8000/learning-paths/list?username=test_user&t=${Date.now()}`;
    console.log('📡 Fetching:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📊 API Response Data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      const paths = data.learning_paths || [];
      console.log(`\n✅ API endpoint working - found ${paths.length} learning paths`);
      
      if (paths.length > 0) {
        console.log('\n📋 Learning Paths:');
        paths.forEach((path, i) => {
          console.log(`  ${i + 1}. "${path.name}" (${path.created_at})`);
          console.log(`     - ID: ${path.id}`);
          console.log(`     - Difficulty: ${path.difficulty}`);
          console.log(`     - Topics: ${path.topics_count}`);
          console.log(`     - Progress: ${path.progress}%`);
          console.log('');
        });
      } else {
        console.log('⚠️  No learning paths found in database');
      }
    } else {
      console.log('❌ API endpoint failed:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ API endpoint error:', error.message);
    
    // Check if backend is running
    try {
      const healthCheck = await fetch('http://localhost:8000/');
      console.log('🔍 Backend health check:', healthCheck.status);
    } catch (healthError) {
      console.log('🔍 Backend appears to be down. Please start the backend server.');
    }
  }
};

// Test save endpoint as well
const testSaveEndpoint = async () => {
  console.log('\n🧪 Testing Learning Path Save Endpoint...\n');
  
  const testPath = {
    name: "Test Learning Path from API",
    description: "A test learning path created via API",
    difficulty: "intermediate",
    duration: "2 weeks",
    topics: [
      {
        name: "Introduction",
        description: "Getting started",
        time_required: "1 hour",
        completed: false
      },
      {
        name: "Advanced Concepts",
        description: "Deep dive into advanced topics",
        time_required: "2 hours",
        completed: false
      }
    ],
    tags: ["test", "api", "learning"]
  };
  
  try {
    const response = await fetch('http://localhost:8000/learning-paths/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'test_user',
        path_data: testPath
      })
    });
    
    const data = await response.json();
    
    console.log('📊 Save Response Status:', response.status);
    console.log('📊 Save Response Data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Save endpoint working - path saved successfully');
      console.log('📋 Saved path ID:', data.goal_id || data.id);
    } else {
      console.log('❌ Save endpoint failed:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Save endpoint error:', error.message);
  }
};

// Run all tests
const runTests = async () => {
  console.log('🚀 Starting Learning Path API Tests...\n');
  
  await testAPIEndpoint();
  await testSaveEndpoint();
  
  console.log('\n✅ All API tests completed!');
  console.log('\n💡 Next steps:');
  console.log('1. Open browser and navigate to http://localhost:5173');
  console.log('2. Go to AI Chat and generate a learning path');
  console.log('3. Click "Save to My Learning Paths"');
  console.log('4. Navigate to Learning Paths page to verify it appears');
};

runTests();
