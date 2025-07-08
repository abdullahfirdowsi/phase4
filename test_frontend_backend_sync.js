// Test to debug the frontend-backend communication issue
import fetch from 'node-fetch';

// Test with different users to see if there's a user-specific issue
const testUsersFromLogs = [
  '717821i102@kce.ac.in',
  'test5@xyz.com',
  'test_complete_flow@example.com'
];

const testUserData = async (username) => {
  console.log(`\n🔍 Testing user: ${username}`);
  
  try {
    const url = `http://localhost:8000/learning-paths/list?username=${encodeURIComponent(username)}&t=${Date.now()}`;
    console.log(`📡 Fetching: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    
    if (response.ok) {
      const paths = data.learning_paths || [];
      console.log(`✅ Found ${paths.length} learning paths for ${username}`);
      
      if (paths.length > 0) {
        console.log(`📋 Learning Paths:`);
        paths.forEach((path, i) => {
          console.log(`  ${i + 1}. "${path.name}"`);
          console.log(`     - ID: ${path.id}`);
          console.log(`     - Created: ${path.created_at}`);
          console.log(`     - Source: ${path.source}`);
          console.log(`     - Topics: ${path.topics_count}`);
          console.log('');
        });
      } else {
        console.log('⚠️  No learning paths found for this user');
      }
    } else {
      console.log(`❌ Failed to fetch: ${response.status}`);
      console.log(`📋 Error: ${data.detail || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error(`❌ Error for ${username}:`, error.message);
  }
};

const testFrontendAPICall = async () => {
  console.log('\n🧪 Testing Frontend API Call Simulation...\n');
  
  // Simulate the exact API call that frontend would make
  const testUsername = '717821i102@kce.ac.in'; // The user from the logs
  
  try {
    // Build query parameters like the frontend does
    const queryParams = new URLSearchParams({
      username: testUsername,
      t: Date.now(),
      r: Math.random().toString(36).substring(7)
    });
    
    const url = `http://localhost:8000/learning-paths/list?${queryParams}`;
    console.log(`📡 Simulating frontend API call: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    const data = await response.json();
    
    console.log(`📊 Frontend API Response:`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Data: ${JSON.stringify(data, null, 2)}`);
    
    if (response.ok) {
      const paths = data.learning_paths || [];
      console.log(`\n✅ Frontend would receive ${paths.length} learning paths`);
      
      if (paths.length > 0) {
        console.log(`📋 Paths that frontend should display:`);
        paths.forEach((path, i) => {
          console.log(`  ${i + 1}. "${path.name}" (${path.difficulty})`);
          console.log(`     - Created: ${path.created_at}`);
          console.log(`     - Updated: ${path.updated_at || 'N/A'}`);
        });
      } else {
        console.log('⚠️  Frontend would show "No learning paths found"');
        console.log('🔍 This means the user has no saved learning paths in the database');
      }
    } else {
      console.log(`❌ Frontend would show an error: ${data.detail || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Frontend API simulation failed:', error.message);
  }
};

const checkDatabaseDirectly = async () => {
  console.log('\n🔍 Checking database for any learning paths...\n');
  
  // Check if there are any learning paths at all in the database
  try {
    const response = await fetch('http://localhost:8000/learning-paths/list?username=test_complete_flow@example.com');
    const data = await response.json();
    
    if (response.ok && data.learning_paths && data.learning_paths.length > 0) {
      console.log(`✅ Database contains ${data.learning_paths.length} learning paths for test_complete_flow@example.com`);
      console.log('🔍 This confirms the backend is working correctly');
    } else {
      console.log('❌ No learning paths found in database');
    }
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  }
};

// Run all tests
const runTests = async () => {
  console.log('🚀 Starting Frontend-Backend Sync Debug Tests...\n');
  
  // Test each user from the logs
  for (const username of testUsersFromLogs) {
    await testUserData(username);
  }
  
  await testFrontendAPICall();
  await checkDatabaseDirectly();
  
  console.log('\n📋 Summary:');
  console.log('1. If any user has learning paths, the backend is working');
  console.log('2. If the logged-in user has no paths, they need to save some first');
  console.log('3. The frontend should refresh automatically when paths are saved');
  console.log('4. Check browser console for any frontend errors');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Check what user is logged in the frontend');
  console.log('2. Save a learning path from AI Chat');
  console.log('3. Check if it appears in Learning Paths page');
  console.log('4. Check browser console for event dispatching');
};

runTests();
