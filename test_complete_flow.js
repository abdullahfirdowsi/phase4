// Complete test demonstrating the full learning path save and display flow
import fetch from 'node-fetch';

const testUser = 'test_complete_flow@example.com';

const testCompleteLearningPathFlow = async () => {
  console.log('🚀 Testing Complete Learning Path Flow...\n');
  
  // Step 1: Verify user starts with no learning paths
  console.log('📋 Step 1: Check initial state (should be empty)');
  await checkLearningPaths(testUser);
  
  // Step 2: Save a learning path (simulating user clicking "Save" button)
  console.log('\n💾 Step 2: Save a learning path');
  await saveLearningPath(testUser);
  
  // Step 3: Verify the learning path appears in the list
  console.log('\n📋 Step 3: Check that learning path appears in list');
  await checkLearningPaths(testUser);
  
  // Step 4: Test saving another learning path with different name
  console.log('\n💾 Step 4: Save another learning path');
  await saveAnotherLearningPath(testUser);
  
  // Step 5: Verify both learning paths appear
  console.log('\n📋 Step 5: Check that both learning paths appear');
  await checkLearningPaths(testUser);
  
  // Step 6: Test updating an existing learning path
  console.log('\n🔄 Step 6: Update existing learning path');
  await updateLearningPath(testUser);
  
  // Step 7: Verify the update worked
  console.log('\n📋 Step 7: Check updated learning path');
  await checkLearningPaths(testUser);
  
  console.log('\n✅ Complete Learning Path Flow Test Completed!');
};

const checkLearningPaths = async (username) => {
  try {
    const url = `http://localhost:8000/learning-paths/list?username=${encodeURIComponent(username)}&t=${Date.now()}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      const paths = data.learning_paths || [];
      console.log(`  ✅ Found ${paths.length} learning paths for ${username}`);
      
      paths.forEach((path, i) => {
        console.log(`    ${i + 1}. "${path.name}" (${path.difficulty})`);
        console.log(`       - Topics: ${path.topics_count} | Progress: ${path.progress}%`);
        console.log(`       - Created: ${path.created_at}`);
      });
    } else {
      console.log(`  ❌ Failed to get learning paths: ${response.status}`);
    }
  } catch (error) {
    console.log(`  ❌ Error checking learning paths: ${error.message}`);
  }
};

const saveLearningPath = async (username) => {
  const learningPath = {
    name: "JavaScript Mastery Path",
    description: "Master JavaScript from basics to advanced concepts",
    difficulty: "intermediate",
    duration: "6 weeks",
    prerequisites: ["Basic HTML", "Basic CSS"],
    topics: [
      {
        name: "JavaScript Fundamentals",
        description: "Learn the core concepts of JavaScript",
        time_required: "2 weeks",
        links: ["https://developer.mozilla.org/en-US/docs/Web/JavaScript"],
        videos: ["https://www.youtube.com/watch?v=example1"],
        subtopics: [
          {
            name: "Variables and Data Types",
            description: "Understanding var, let, const and data types"
          },
          {
            name: "Functions",
            description: "Function declarations, expressions, and arrow functions"
          }
        ],
        completed: false
      },
      {
        name: "Advanced JavaScript",
        description: "Advanced concepts and modern features",
        time_required: "2 weeks",
        links: ["https://javascript.info/"],
        videos: ["https://www.youtube.com/watch?v=example2"],
        subtopics: [
          {
            name: "Promises and Async/Await",
            description: "Handling asynchronous operations"
          },
          {
            name: "ES6+ Features",
            description: "Modern JavaScript syntax and features"
          }
        ],
        completed: false
      }
    ],
    tags: ["javascript", "programming", "web-development"]
  };
  
  try {
    const response = await fetch('http://localhost:8000/learning-paths/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        path_data: learningPath
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`  ✅ Successfully saved learning path: "${learningPath.name}"`);
      console.log(`  📋 Goal ID: ${data.goal_id}`);
      console.log(`  📊 Topics: ${data.path.topics_count}`);
    } else {
      console.log(`  ❌ Failed to save learning path: ${response.status}`);
      console.log(`  📋 Error: ${data.detail || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`  ❌ Error saving learning path: ${error.message}`);
  }
};

const saveAnotherLearningPath = async (username) => {
  const learningPath = {
    name: "React Development Path",
    description: "Learn React from basics to advanced",
    difficulty: "advanced",
    duration: "8 weeks",
    prerequisites: ["JavaScript", "HTML", "CSS"],
    topics: [
      {
        name: "React Basics",
        description: "Components, JSX, and props",
        time_required: "3 weeks",
        links: ["https://reactjs.org/docs/getting-started.html"],
        videos: ["https://www.youtube.com/watch?v=react-example"],
        subtopics: [
          {
            name: "Components",
            description: "Creating and using React components"
          }
        ],
        completed: false
      }
    ],
    tags: ["react", "javascript", "frontend"]
  };
  
  try {
    const response = await fetch('http://localhost:8000/learning-paths/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        path_data: learningPath
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`  ✅ Successfully saved another learning path: "${learningPath.name}"`);
      console.log(`  📋 Goal ID: ${data.goal_id}`);
    } else {
      console.log(`  ❌ Failed to save another learning path: ${response.status}`);
      console.log(`  📋 Error: ${data.detail || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`  ❌ Error saving another learning path: ${error.message}`);
  }
};

const updateLearningPath = async (username) => {
  const updatedLearningPath = {
    name: "JavaScript Mastery Path",  // Same name will trigger update
    description: "Updated: Master JavaScript from basics to advanced concepts with new content",
    difficulty: "advanced",  // Changed from intermediate
    duration: "8 weeks",     // Changed from 6 weeks
    prerequisites: ["Basic HTML", "Basic CSS", "Programming Logic"],
    topics: [
      {
        name: "JavaScript Fundamentals",
        description: "Learn the core concepts of JavaScript",
        time_required: "2 weeks",
        links: ["https://developer.mozilla.org/en-US/docs/Web/JavaScript"],
        videos: ["https://www.youtube.com/watch?v=example1"],
        subtopics: [
          {
            name: "Variables and Data Types",
            description: "Understanding var, let, const and data types"
          }
        ],
        completed: false
      },
      {
        name: "Advanced JavaScript",
        description: "Advanced concepts and modern features",
        time_required: "3 weeks",  // Changed from 2 weeks
        links: ["https://javascript.info/"],
        videos: ["https://www.youtube.com/watch?v=example2"],
        subtopics: [
          {
            name: "Promises and Async/Await",
            description: "Handling asynchronous operations"
          }
        ],
        completed: false
      },
      {
        name: "Testing and Debugging",  // New topic
        description: "Learn to test and debug JavaScript code",
        time_required: "3 weeks",
        links: ["https://jestjs.io/"],
        videos: ["https://www.youtube.com/watch?v=testing-example"],
        subtopics: [
          {
            name: "Unit Testing",
            description: "Writing unit tests with Jest"
          }
        ],
        completed: false
      }
    ],
    tags: ["javascript", "programming", "web-development", "testing"]
  };
  
  try {
    const response = await fetch('http://localhost:8000/learning-paths/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        path_data: updatedLearningPath
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`  ✅ Successfully updated learning path: "${updatedLearningPath.name}"`);
      console.log(`  📋 Updated: ${data.updated ? 'Yes' : 'No'}`);
      console.log(`  📊 New topics count: ${data.path.topics_count}`);
      console.log(`  📊 New difficulty: ${data.path.difficulty}`);
    } else {
      console.log(`  ❌ Failed to update learning path: ${response.status}`);
      console.log(`  📋 Error: ${data.detail || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`  ❌ Error updating learning path: ${error.message}`);
  }
};

// Run the complete test
testCompleteLearningPathFlow();
