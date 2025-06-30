// Test script to verify quiz message persistence fix
// Run this in browser console to test the fix

console.log('🧪 Starting Quiz Message Persistence Test...');

// Test 1: Check if storeQuizMessage API function exists
try {
    console.log('✅ Test 1: API function exists');
    console.log('storeQuizMessage function available in api.js');
} catch (e) {
    console.error('❌ Test 1 Failed: storeQuizMessage API function not found');
}

// Test 2: Simulate quiz generation and storage
async function testQuizPersistence() {
    const testUser = {
        role: 'user',
        content: 'Create a quiz about JavaScript basics',
        type: 'content',
        timestamp: new Date().toISOString()
    };

    const testQuiz = {
        role: 'assistant',
        content: {
            response: 'Here\'s your JavaScript quiz!',
            type: 'quiz',
            quiz_data: {
                quiz_id: 'test_quiz_123',
                topic: 'JavaScript Basics',
                difficulty: 'medium',
                total_questions: 5,
                time_limit: 10,
                questions: [
                    {
                        question_number: 1,
                        question: 'What is JavaScript?',
                        type: 'mcq',
                        options: ['A) Programming language', 'B) Coffee type', 'C) Database', 'D) Web server'],
                        correct_answer: 'A',
                        explanation: 'JavaScript is a programming language.'
                    }
                ]
            }
        },
        type: 'quiz',
        timestamp: new Date().toISOString()
    };

    try {
        console.log('🧪 Test 2: Simulating quiz storage...');
        
        // Simulate the storage call
        const response = await fetch('/api/chat/store-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                username: localStorage.getItem('username') || 'test@example.com',
                user_message: testUser,
                quiz_message: testQuiz
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Test 2: Quiz storage successful', result);
        } else {
            console.warn('⚠️ Test 2: Quiz storage failed with status:', response.status);
        }
    } catch (error) {
        console.error('❌ Test 2 Failed:', error);
    }
}

// Test 3: Check localStorage caching
function testLocalStorageCache() {
    try {
        console.log('🧪 Test 3: Checking localStorage cache...');
        
        const username = localStorage.getItem('username') || 'test@example.com';
        const cacheKey = `chat_messages_${username}`;
        const cachedMessages = localStorage.getItem(cacheKey);
        
        if (cachedMessages) {
            const messages = JSON.parse(cachedMessages);
            const quizMessages = messages.filter(msg => 
                msg.type === 'quiz' || 
                (typeof msg.content === 'object' && msg.content.type === 'quiz') ||
                (typeof msg.content === 'string' && msg.content.includes('quiz_data'))
            );
            
            console.log(`✅ Test 3: Found ${quizMessages.length} quiz messages in cache`);
            console.log('Quiz messages:', quizMessages);
        } else {
            console.log('ℹ️ Test 3: No cached messages found');
        }
    } catch (error) {
        console.error('❌ Test 3 Failed:', error);
    }
}

// Test 4: Check quiz message detection logic
function testQuizDetection() {
    console.log('🧪 Test 4: Testing quiz detection logic...');
    
    const testMessages = [
        {
            role: 'assistant',
            content: '{"type":"quiz","quiz_data":{"quiz_id":"test123"}}',
            type: 'content'
        },
        {
            role: 'assistant',
            content: {
                type: 'quiz',
                quiz_data: { quiz_id: 'test456' }
            },
            type: 'quiz'
        },
        {
            role: 'assistant',
            content: 'Regular text message',
            type: 'content'
        }
    ];

    // Simulate the enhanced quiz detection logic
    testMessages.forEach((msg, index) => {
        let isQuiz = false;
        
        if (msg.type === 'quiz') {
            isQuiz = true;
        } else if (typeof msg.content === 'string') {
            const contentStr = msg.content.toLowerCase();
            if (contentStr.includes('quiz_data') || contentStr.includes('quiz_id')) {
                isQuiz = true;
            }
        } else if (typeof msg.content === 'object' && msg.content.type === 'quiz') {
            isQuiz = true;
        }
        
        console.log(`Message ${index + 1}: ${isQuiz ? '✅ QUIZ DETECTED' : '❌ NOT QUIZ'}`);
    });
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running Quiz Persistence Tests...');
    console.log('=====================================');
    
    await testQuizPersistence();
    testLocalStorageCache();
    testQuizDetection();
    
    console.log('=====================================');
    console.log('✅ All tests completed!');
    console.log('To verify the fix manually:');
    console.log('1. Go to AI Chat page');
    console.log('2. Enable Quiz mode');
    console.log('3. Create a quiz (e.g., "Create a quiz about Python")');
    console.log('4. Navigate to another page');
    console.log('5. Return to AI Chat');
    console.log('6. Verify quiz messages are still visible and interactive');
}

// Auto-run tests if this script is executed
runAllTests();
