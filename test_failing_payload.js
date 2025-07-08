// Test script to debug the specific failing payload
import fetch from 'node-fetch';

const testFailingPayload = async () => {
  console.log('🧪 Testing the exact failing payload...\n');
  
  // This is the exact payload from the browser logs that's failing
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
        },
        {
          "name": "Building Blocks of React Native",
          "description": "Master the essential components of React Native, understand how to structure your app, and learn to interact with the user interface.",
          "time_required": "10 hours",
          "links": [
            "https://reactnative.dev/docs/components-and-apis",
            "https://reactnative.dev/docs/styling"
          ],
          "videos": [
            "https://www.youtube.com/watch?v=ghi",
            "https://www.youtube.com/watch?v=jkl"
          ],
          "subtopics": [
            {
              "name": "React Native Components",
              "description": "Explore common components like Text, View, Image, Button, and learn how to use them to build your UI."
            },
            {
              "name": "Styling with StyleSheet",
              "description": "Discover how to style your React Native components using StyleSheet and create visually appealing layouts."
            }
          ],
          "completed": false
        },
        {
          "name": "Handling User Input",
          "description": "Learn how to capture user interactions, process data, and build dynamic and responsive applications.",
          "time_required": "7 hours",
          "links": [
            "https://reactnative.dev/docs/textinput",
            "https://reactnative.dev/docs/pickers"
          ],
          "videos": [
            "https://www.youtube.com/watch?v=mno",
            "https://www.youtube.com/watch?v=pqr"
          ],
          "subtopics": [
            {
              "name": "Text Inputs",
              "description": "Learn how to create text input fields, validate user input, and capture text values."
            },
            {
              "name": "Buttons and Interactions",
              "description": "Explore different button types, handle button clicks, and implement basic navigation within your app."
            }
          ],
          "completed": false
        },
        {
          "name": "Data Flow and Navigation",
          "description": "Understand how data is passed between components, learn about navigation patterns, and build more complex and structured applications.",
          "time_required": "8 hours",
          "links": [
            "https://reactnative.dev/docs/navigation",
            "https://reactnative.dev/docs/data-flow"
          ],
          "videos": [
            "https://www.youtube.com/watch?v=stu",
            "https://www.youtube.com/watch?v=vwx"
          ],
          "subtopics": [
            {
              "name": "Navigating Between Screens",
              "description": "Explore different navigation libraries like React Navigation and learn how to create navigations between screens."
            },
            {
              "name": "Managing State and Data",
              "description": "Discover state management techniques like Redux or Context API to efficiently handle data flow in your app."
            }
          ],
          "completed": false
        }
      ],
      "tags": []
    }
  };

  // Test with same auth token from browser
  const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MTc4MjFpMTAyQGtjZS5hYy5pbiIsImV4cCI6MTc1MjA1ODYxOH0.9a8nJxy71-qqu__v8cCYuQPzarWBbBC1sht_a1n1mHs";
  
  try {
    console.log('📡 Testing with exact browser payload and auth token...');
    const response = await fetch('http://localhost:8000/learning-paths/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(exactPayload)
    });
    
    const responseText = await response.text();
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    console.log('📊 Response Body:', responseText);
    
    if (!response.ok) {
      console.log('❌ Request failed - debugging...');
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        console.log('❌ Error details:', errorData);
      } catch (e) {
        console.log('❌ Raw error response:', responseText);
      }
    } else {
      console.log('✅ Request succeeded!');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
};

// Also test with simplified payload
const testSimplifiedPayload = async () => {
  console.log('\n🧪 Testing with simplified payload...\n');
  
  const simplifiedPayload = {
    "username": "717821i102@kce.ac.in",
    "path_data": {
      "name": "Test React Native Path",
      "description": "A test learning path",
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
  
  try {
    console.log('📡 Testing with simplified payload...');
    const response = await fetch('http://localhost:8000/learning-paths/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(simplifiedPayload)
    });
    
    const responseText = await response.text();
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Body:', responseText);
    
    if (!response.ok) {
      console.log('❌ Simplified request failed');
      
      try {
        const errorData = JSON.parse(responseText);
        console.log('❌ Error details:', errorData);
      } catch (e) {
        console.log('❌ Raw error response:', responseText);
      }
    } else {
      console.log('✅ Simplified request succeeded!');
    }
    
  } catch (error) {
    console.error('❌ Simplified request failed:', error.message);
  }
};

// Run all tests
const runTests = async () => {
  console.log('🚀 Starting Debug Tests for Failing Payload...\n');
  
  await testFailingPayload();
  await testSimplifiedPayload();
  
  console.log('\n✅ All debug tests completed!');
};

runTests();
