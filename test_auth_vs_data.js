// Test script to isolate authentication vs data validation issues
import fetch from 'node-fetch';

const testSamePayloadWithoutAuth = async () => {
  console.log('🧪 Testing exact failing payload WITHOUT auth token...\n');
  
  const exactPayload = {
    "username": "717821i102@kce.ac.in",
    "path_data": {
      "name": "Unlocking Mobile Magic: Build Your First React Native App",
      "description": "A personalized learning path to help you master new skills.",
      "difficulty": "Intermediate",
      "duration": "4 weeks",
      "prerequisites": [],
      "topics": [
        {
          "name": "The World of React Native",
          "description": "Dive into the fundamentals of React Native, understand its architecture, and explore the exciting possibilities it offers for building cross-platform mobile applications.",
          "time_required": "5 hours",
          "links": [
            "https://reactnative.dev/",
            "https://reactnative.dev/docs/getting-started"
          ],
          "videos": [
            "https://www.youtube.com/watch?v=abc",
            "https://www.youtube.com/watch?v=def"
          ],
          "subtopics": [
            {
              "name": "What is React Native?",
              "description": "Learn about the history, purpose, and advantages of using React Native for mobile app development."
            },
            {
              "name": "Setting up Your Environment",
              "description": "Get your development environment ready by installing Node.js, React Native CLI, and configuring your project."
            }
          ],
          "completed": false
        }
      ],
      "tags": []
    }
  };
  
  try {
    console.log('📡 Testing without auth token...');
    const response = await fetch('http://localhost:8000/learning-paths/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(exactPayload)
    });
    
    const responseText = await response.text();
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Body:', responseText);
    
    if (!response.ok) {
      console.log('❌ Request failed without auth');
      
      try {
        const errorData = JSON.parse(responseText);
        console.log('❌ Error details:', errorData);
      } catch (e) {
        console.log('❌ Raw error response:', responseText);
      }
    } else {
      console.log('✅ Request succeeded without auth!');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
};

const testWithDifferentAuth = async () => {
  console.log('\n🧪 Testing with fresh auth token...\n');
  
  // First, let's try to login and get a fresh token
  try {
    console.log('📡 Getting fresh auth token...');
    const loginResponse = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: '717821i102@kce.ac.in',
        password: 'test123' // You might need to adjust this
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('📊 Login Status:', loginResponse.status);
    
    if (loginResponse.ok && loginData.token) {
      console.log('✅ Got fresh token, testing with it...');
      
      // Test with fresh token
      const testPayload = {
        "username": "717821i102@kce.ac.in",
        "path_data": {
          "name": "Test with Fresh Token",
          "description": "Testing with fresh auth token",
          "difficulty": "intermediate",
          "duration": "2 weeks",
          "prerequisites": [],
          "topics": [
            {
              "name": "Introduction",
              "description": "Getting started",
              "time_required": "1 hour",
              "links": ["https://reactnative.dev/"],
              "videos": ["https://www.youtube.com/watch?v=test"],
              "subtopics": [],
              "completed": false
            }
          ],
          "tags": []
        }
      };
      
      const testResponse = await fetch('http://localhost:8000/learning-paths/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify(testPayload)
      });
      
      const testResponseText = await testResponse.text();
      console.log('📊 Test Response Status:', testResponse.status);
      console.log('📊 Test Response Body:', testResponseText);
      
      if (testResponse.ok) {
        console.log('✅ Fresh token works!');
      } else {
        console.log('❌ Fresh token also fails');
      }
    } else {
      console.log('❌ Login failed:', loginData);
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
  }
};

// Run all tests
const runTests = async () => {
  console.log('🚀 Starting Auth vs Data Validation Tests...\n');
  
  await testSamePayloadWithoutAuth();
  await testWithDifferentAuth();
  
  console.log('\n✅ All auth tests completed!');
};

runTests();
