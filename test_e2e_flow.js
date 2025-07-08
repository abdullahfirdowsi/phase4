// End-to-end test for the complete learning path flow
import fetch from 'node-fetch';

const testUser = '717821i102@kce.ac.in'; // The actual user from logs

const testEndToEndFlow = async () => {
  console.log('🚀 Starting End-to-End Learning Path Flow Test...\n');
  
  // Step 1: Check current learning paths
  console.log('📋 Step 1: Check current learning paths');
  const initialPaths = await fetchLearningPaths();
  console.log(`  Found ${initialPaths.length} existing paths`);
  
  // Step 2: Save a new learning path
  console.log('\n💾 Step 2: Save a new learning path');
  const newPathData = {
    name: `E2E Test Path ${Date.now()}`,
    description: "End-to-end test learning path",
    difficulty: "intermediate",
    duration: "3 weeks",
    prerequisites: ["Basic knowledge"],
    topics: [
      {
        name: "Introduction to E2E Testing",
        description: "Learn the basics of end-to-end testing",
        time_required: "2 hours",
        links: ["https://example.com/e2e-testing"],
        videos: ["https://www.youtube.com/watch?v=e2e-test"],
        subtopics: [
          {
            name: "What is E2E Testing?",
            description: "Understanding the concept of end-to-end testing"
          },
          {
            name: "E2E Testing Tools",
            description: "Overview of popular E2E testing frameworks"
          }
        ],
        completed: false
      },
      {
        name: "Advanced E2E Concepts",
        description: "Deep dive into advanced testing concepts",
        time_required: "3 hours",
        links: ["https://example.com/advanced-e2e"],
        videos: ["https://www.youtube.com/watch?v=advanced-e2e"],
        subtopics: [
          {
            name: "Test Automation",
            description: "Automating end-to-end tests"
          }
        ],
        completed: false
      }
    ],
    tags: ["testing", "e2e", "automation"]
  };
  
  const saveResult = await saveLearningPath(newPathData);
  
  if (saveResult.success) {
    console.log(`  ✅ Successfully saved: "${newPathData.name}"`);
    console.log(`  📋 Goal ID: ${saveResult.goal_id}`);
  } else {
    console.log(`  ❌ Failed to save: ${saveResult.error}`);
    return;
  }
  
  // Step 3: Verify the path appears in the list
  console.log('\n📋 Step 3: Verify the path appears in the list');
  const updatedPaths = await fetchLearningPaths();
  const newPath = updatedPaths.find(p => p.name === newPathData.name);
  
  if (newPath) {
    console.log(`  ✅ New path found in list: "${newPath.name}"`);
    console.log(`  📊 Topics: ${newPath.topics_count} | Progress: ${newPath.progress}%`);
    console.log(`  🕐 Created: ${newPath.created_at}`);
  } else {
    console.log(`  ❌ New path NOT found in list`);
    console.log(`  📋 Available paths:`, updatedPaths.map(p => p.name));
  }
  
  // Step 4: Test the frontend API call simulation
  console.log('\n🌐 Step 4: Test frontend API call simulation');
  await simulateFrontendAPICall();
  
  // Step 5: Test event dispatching
  console.log('\n📢 Step 5: Test event dispatching');
  await testEventDispatching();
  
  console.log('\n✅ End-to-End Flow Test Completed!');
  console.log('\n📊 Summary:');
  console.log(`- Initial paths: ${initialPaths.length}`);
  console.log(`- Updated paths: ${updatedPaths.length}`);
  console.log(`- New path created: ${newPath ? 'Yes' : 'No'}`);
  console.log(`- Frontend should show: ${updatedPaths.length} paths`);
};

const fetchLearningPaths = async () => {
  try {
    const url = `http://localhost:8000/learning-paths/list?username=${encodeURIComponent(testUser)}&t=${Date.now()}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      return data.learning_paths || [];
    } else {
      console.error('Failed to fetch learning paths:', data.detail);
      return [];
    }
  } catch (error) {
    console.error('Error fetching learning paths:', error.message);
    return [];
  }
};

const saveLearningPath = async (pathData) => {
  try {
    const response = await fetch('http://localhost:8000/learning-paths/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: testUser,
        path_data: pathData
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        goal_id: data.goal_id,
        path: data.path,
        updated: data.updated
      };
    } else {
      return {
        success: false,
        error: data.detail || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

const simulateFrontendAPICall = async () => {
  try {
    // Simulate exactly what the frontend getAllLearningPaths function does
    const queryParams = new URLSearchParams({
      username: testUser,
      t: Date.now(),
      r: Math.random().toString(36).substring(7)
    });
    
    const url = `http://localhost:8000/learning-paths/list?${queryParams}`;
    console.log(`  📡 Frontend API URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`  ✅ Frontend API would receive ${data.learning_paths.length} paths`);
      console.log(`  📋 Latest 3 paths:`);
      data.learning_paths.slice(0, 3).forEach((path, i) => {
        console.log(`    ${i + 1}. "${path.name}" (${path.difficulty})`);
      });
    } else {
      console.log(`  ❌ Frontend API would fail: ${data.detail}`);
    }
  } catch (error) {
    console.log(`  ❌ Frontend API simulation error: ${error.message}`);
  }
};

const testEventDispatching = async () => {
  console.log('  🧪 Testing event dispatching...');
  
  // Test the custom event that should be dispatched when saving
  const eventData = {
    pathName: 'Test Event Path',
    timestamp: Date.now(),
    pathId: 'test_123',
    username: testUser,
    success: true
  };
  
  try {
    // Listen for the event
    const eventReceived = new Promise((resolve) => {
      const handler = (event) => {
        console.log('  📢 Event received:', event.detail);
        resolve(true);
        window.removeEventListener('learningPathSaved', handler);
      };
      
      if (typeof window !== 'undefined') {
        window.addEventListener('learningPathSaved', handler);
        
        // Timeout after 1 second
        setTimeout(() => {
          resolve(false);
          window.removeEventListener('learningPathSaved', handler);
        }, 1000);
      } else {
        resolve(false);
      }
    });
    
    // Dispatch the event (simulate what happens in the frontend)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('learningPathSaved', {
        detail: eventData
      }));
    }
    
    const received = await eventReceived;
    console.log(`  📢 Event dispatching: ${received ? 'Working' : 'Not working (Node.js environment)'}`);
    
    // Test localStorage event
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lastSavedLearningPath', JSON.stringify(eventData));
      console.log('  💾 localStorage event: Dispatched');
    } else {
      console.log('  💾 localStorage event: Not available (Node.js environment)');
    }
    
  } catch (error) {
    console.log(`  ❌ Event testing error: ${error.message}`);
  }
};

// Run the test
testEndToEndFlow();
