// Test script to debug the learning path save 500 error
import fetch from 'node-fetch';

const testSaveWithAuth = async () => {
  console.log('🧪 Testing Learning Path Save with Auth...\n');
  
  const testPath = {
    name: "Debug Test Learning Path",
    description: "A test learning path for debugging",
    difficulty: "intermediate",
    duration: "2 weeks",
    prerequisites: [],
    topics: [
      {
        name: "Introduction",
        description: "Getting started",
        time_required: "1 hour",
        completed: false
      }
    ],
    tags: ["test", "debug"]
  };
  
  // Test with auth headers (simulating actual frontend request)
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-token', // Mock token for testing
    'Accept': 'application/json'
  };
  
  try {
    console.log('📡 Testing with auth headers...');
    const response = await fetch('http://localhost:8000/learning-paths/create', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        username: '717821i102@kce.ac.in',
        path_data: testPath
      })
    });
    
    const responseText = await response.text();
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    console.log('📊 Response Body:', responseText);
    
    if (response.ok) {
      console.log('✅ Save endpoint working with auth');
    } else {
      console.log('❌ Save endpoint failed with auth');
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        console.log('❌ Error details:', errorData);
      } catch (e) {
        console.log('❌ Raw error response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
};

const testSaveWithoutAuth = async () => {
  console.log('\n🧪 Testing Learning Path Save without Auth...\n');
  
  const testPath = {
    name: "Debug Test Learning Path No Auth",
    description: "A test learning path for debugging without auth",
    difficulty: "intermediate",
    duration: "2 weeks",
    prerequisites: [],
    topics: [
      {
        name: "Introduction",
        description: "Getting started",
        time_required: "1 hour",
        completed: false
      }
    ],
    tags: ["test", "debug"]
  };
  
  try {
    console.log('📡 Testing without auth headers...');
    const response = await fetch('http://localhost:8000/learning-paths/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: '717821i102@kce.ac.in',
        path_data: testPath
      })
    });
    
    const responseText = await response.text();
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Body:', responseText);
    
    if (response.ok) {
      console.log('✅ Save endpoint working without auth');
    } else {
      console.log('❌ Save endpoint failed without auth');
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        console.log('❌ Error details:', errorData);
      } catch (e) {
        console.log('❌ Raw error response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
};

const testHealthCheck = async () => {
  console.log('\n🧪 Testing Health Check...\n');
  
  try {
    const response = await fetch('http://localhost:8000/health');
    const data = await response.json();
    
    console.log('📊 Health Status:', response.status);
    console.log('📊 Health Data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Server is healthy');
    } else {
      console.log('❌ Server health check failed');
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
};

// Run all tests
const runTests = async () => {
  console.log('🚀 Starting Learning Path Save Debug Tests...\n');
  
  await testHealthCheck();
  await testSaveWithoutAuth();
  await testSaveWithAuth();
  
  console.log('\n✅ All debug tests completed!');
};

runTests();
