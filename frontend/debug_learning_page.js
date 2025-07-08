/**
 * COMPREHENSIVE FRONTEND DEBUG SCRIPT FOR LEARNING PAGE
 * 
 * Instructions:
 * 1. Navigate to the Learning page in your browser
 * 2. Open the browser console (F12)
 * 3. Paste this entire script and press Enter
 * 4. It will run automated tests and provide detailed debugging information
 * 
 * This script will help identify why saved learning paths are not showing up in the UI
 */

(function() {
    console.log('🔍 LEARNING PAGE DEBUG SCRIPT STARTED');
    console.log('====================================');
    
    // Test 1: Check if we're on the correct page
    console.log('\n📍 TEST 1: Page Location Check');
    console.log('Current URL:', window.location.href);
    console.log('Expected path contains: /learning');
    console.log('✅ On Learning page:', window.location.pathname.includes('/learning'));
    
    // Test 2: Check authentication state
    console.log('\n🔐 TEST 2: Authentication Check');
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    console.log('Username:', username);
    console.log('Token exists:', !!token);
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'None');
    
    // Test 3: Check if Learning React component is mounted
    console.log('\n⚛️ TEST 3: React Component Check');
    const learningPage = document.querySelector('.learning-page');
    console.log('Learning page element found:', !!learningPage);
    
    const learningTabs = document.querySelector('.learning-tabs');
    console.log('Learning tabs found:', !!learningTabs);
    
    const myLearningButton = document.querySelector('.learning-tabs button');
    console.log('My Learning button found:', !!myLearningButton);
    
    if (myLearningButton) {
        console.log('My Learning button text:', myLearningButton.textContent);
    }
    
    // Test 4: Check for learning path cards
    console.log('\n📚 TEST 4: Learning Path Cards Check');
    const learningCards = document.querySelectorAll('.my-learning-card');
    console.log('Number of learning path cards found:', learningCards.length);
    
    const emptyState = document.querySelector('.empty-state');
    console.log('Empty state displayed:', !!emptyState);
    
    if (emptyState) {
        console.log('Empty state text:', emptyState.textContent);
    }
    
    // Test 5: Check browser console for errors
    console.log('\n❌ TEST 5: Console Error Check');
    console.log('Note: Check the console above for any red error messages');
    
    // Test 6: Test API functions directly
    console.log('\n🔌 TEST 6: API Function Test');
    
    // Check if API functions are available
    console.log('getAllLearningGoals function available:', typeof getAllLearningGoals !== 'undefined');
    console.log('getAllLearningPaths function available:', typeof getAllLearningPaths !== 'undefined');
    
    // Test 7: Manual API call
    console.log('\n📞 TEST 7: Manual API Call');
    
    const testAPI = async () => {
        try {
            // First, try to fetch the API functions from the module
            const apiModule = await import('./api.js');
            console.log('API module loaded successfully');
            
            // Test getAllLearningGoals
            console.log('\n🎯 Testing getAllLearningGoals...');
            const learningGoals = await apiModule.getAllLearningGoals();
            console.log('✅ getAllLearningGoals result:', learningGoals);
            console.log('Number of learning goals:', learningGoals?.length || 0);
            
            if (learningGoals && learningGoals.length > 0) {
                console.log('First learning goal:', learningGoals[0]);
            }
            
            // Test getAllLearningPaths  
            console.log('\n🎯 Testing getAllLearningPaths...');
            const learningPaths = await apiModule.getAllLearningPaths();
            console.log('✅ getAllLearningPaths result:', learningPaths);
            console.log('Number of learning paths:', learningPaths?.length || 0);
            
            if (learningPaths && learningPaths.length > 0) {
                console.log('First learning path:', learningPaths[0]);
            }
            
        } catch (error) {
            console.error('❌ API test failed:', error);
            
            // Fallback: Direct fetch test
            console.log('\n🔄 Fallback: Direct fetch test');
            try {
                const response = await fetch(`http://localhost:8000/chat/get-all-goals?username=${encodeURIComponent(username)}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Direct fetch response status:', response.status);
                console.log('Direct fetch response ok:', response.ok);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Direct fetch result:', data);
                    console.log('Learning goals from direct fetch:', data.learning_goals?.length || 0);
                } else {
                    console.error('❌ Direct fetch failed:', response.statusText);
                }
            } catch (fetchError) {
                console.error('❌ Direct fetch error:', fetchError);
            }
        }
    };
    
    // Test 8: Check React state
    console.log('\n⚛️ TEST 8: React State Check');
    
    // Try to access React component instance
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactInternalInstance) {
        console.log('React internal instance found');
    } else {
        console.log('React internal instance not accessible (normal in production)');
    }
    
    // Test 9: Network requests monitoring
    console.log('\n🌐 TEST 9: Network Monitoring Setup');
    
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        console.log('🔗 Fetch request:', args[0]);
        return originalFetch.apply(this, args).then(response => {
            console.log('📡 Fetch response:', response.status, response.statusText);
            return response;
        });
    };
    console.log('✅ Network monitoring enabled');
    
    // Test 10: Local storage check
    console.log('\n💾 TEST 10: Local Storage Check');
    console.log('All localStorage items:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        console.log(`  ${key}:`, value?.length > 50 ? value.substring(0, 50) + '...' : value);
    }
    
    // Test 11: Event listener check
    console.log('\n🎧 TEST 11: Event Listener Check');
    
    // Test if custom events are being fired
    document.addEventListener('learningPathSaved', function(event) {
        console.log('🎉 learningPathSaved event received:', event.detail);
    });
    
    console.log('✅ learningPathSaved event listener added');
    
    // Test 12: Component refresh simulation
    console.log('\n🔄 TEST 12: Component Refresh Test');
    
    // Simulate page focus event
    window.dispatchEvent(new Event('focus'));
    console.log('✅ Focus event dispatched');
    
    // Simulate storage event
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'learningPathUpdate',
        newValue: Date.now().toString(),
        storageArea: localStorage
    }));
    console.log('✅ Storage event dispatched');
    
    // Test 13: Force component update
    console.log('\n🔄 TEST 13: Force Component Update');
    
    const forceUpdate = () => {
        // Try to trigger a re-render by dispatching a custom event
        const updateEvent = new CustomEvent('learningPathUpdate', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(updateEvent);
        console.log('✅ Custom update event dispatched');
    };
    
    forceUpdate();
    
    // Run API test
    testAPI();
    
    // Test 14: Summary and recommendations
    console.log('\n📋 TEST 14: Summary and Recommendations');
    
    setTimeout(() => {
        console.log('\n🎯 DEBUG SUMMARY:');
        console.log('1. Check the console above for any red errors');
        console.log('2. Look for the API test results');
        console.log('3. Check if learning goals/paths are being fetched');
        console.log('4. Verify authentication tokens are valid');
        console.log('5. Check if React component is receiving the data');
        
        console.log('\n💡 NEXT STEPS:');
        console.log('1. If API calls return data but UI shows empty, check React state updates');
        console.log('2. If API calls fail, check backend server is running');
        console.log('3. If authentication fails, try logging out and back in');
        console.log('4. Check browser network tab for failed requests');
        console.log('5. Look for JavaScript errors in console');
        
        console.log('\n🔍 LEARNING PAGE DEBUG SCRIPT COMPLETED');
        console.log('=======================================');
    }, 2000);
    
})();
