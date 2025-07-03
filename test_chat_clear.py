#!/usr/bin/env python3
"""
Quick verification script for chat clear functionality
Run this after making changes to verify everything is working correctly.
"""

import asyncio
import sys
from datetime import datetime
from services.chat_service import chat_service
from models.schemas import MessageType

async def test_chat_clear_functionality():
    """Test both regular clear and clear-all functionality"""
    
    print("🧪 Chat Clear Functionality Test")
    print("=" * 50)
    
    # Test user
    test_username = "test_user_clear_verification"
    session_id = f"test_session_{int(datetime.now().timestamp() * 1000)}"
    
    try:
        # Step 1: Clean up any existing test data
        print("1. Cleaning up existing test data...")
        await chat_service.clear_all_messages(test_username)
        
        # Step 2: Add test messages of different types
        print("2. Adding test messages...")
        
        test_messages = [
            # Regular content messages
            {"role": "user", "content": "Hello", "type": MessageType.CONTENT},
            {"role": "assistant", "content": "Hi there!", "type": MessageType.CONTENT},
            {"role": "user", "content": "How are you?", "type": MessageType.CONTENT},
            {"role": "assistant", "content": "I'm doing well!", "type": MessageType.CONTENT},
            
            # Quiz message
            {"role": "user", "content": "Create a quiz", "type": MessageType.CONTENT},
            {"role": "assistant", "content": {"type": "quiz", "topic": "Python"}, "type": MessageType.QUIZ},
            
            # Learning path message  
            {"role": "user", "content": "Create learning path", "type": MessageType.CONTENT},
            {"role": "assistant", "content": {"type": "learning_path", "name": "Python Basics"}, "type": MessageType.LEARNING_PATH},
        ]
        
        for msg in test_messages:
            result = await chat_service.store_message(
                username=test_username,
                session_id=session_id,
                role=msg["role"],
                content=msg["content"],
                message_type=msg["type"]
            )
            if not result.success:
                print(f"❌ Failed to store message: {result.message}")
                return False
        
        print(f"   ✅ Added {len(test_messages)} test messages")
        
        # Step 3: Verify initial state
        print("3. Verifying initial state...")
        
        initial_result = await chat_service.get_chat_history(test_username, limit=50)
        if not initial_result.success:
            print(f"❌ Failed to get initial messages: {initial_result.message}")
            return False
            
        initial_messages = initial_result.data["messages"]
        initial_content = sum(1 for msg in initial_messages if msg.get("message_type") == "content")
        initial_quiz = sum(1 for msg in initial_messages if msg.get("message_type") == "quiz")
        initial_learning = sum(1 for msg in initial_messages if msg.get("message_type") == "learning_path")
        
        print(f"   📊 Total: {len(initial_messages)} ({initial_content} content, {initial_quiz} quiz, {initial_learning} learning_path)")
        
        # Step 4: Test regular clear (preserves quiz and learning path)
        print("4. Testing regular clear (preserves quiz and learning path)...")
        
        clear_result = await chat_service.clear_chat_history(test_username)
        if not clear_result.success:
            print(f"❌ Regular clear failed: {clear_result.message}")
            return False
            
        print(f"   📝 {clear_result.message}")
        
        # Verify regular clear results
        after_clear_result = await chat_service.get_chat_history(test_username, limit=50)
        if not after_clear_result.success:
            print(f"❌ Failed to get messages after clear: {after_clear_result.message}")
            return False
            
        after_clear_messages = after_clear_result.data["messages"]
        after_content = sum(1 for msg in after_clear_messages if msg.get("message_type") == "content")
        after_quiz = sum(1 for msg in after_clear_messages if msg.get("message_type") == "quiz")
        after_learning = sum(1 for msg in after_clear_messages if msg.get("message_type") == "learning_path")
        
        print(f"   📊 After clear: {len(after_clear_messages)} ({after_content} content, {after_quiz} quiz, {after_learning} learning_path)")
        
        # Validate regular clear
        if after_content == 0 and after_quiz == initial_quiz and after_learning == initial_learning:
            print("   ✅ Regular clear working correctly - content cleared, special messages preserved")
        else:
            print("   ❌ Regular clear not working as expected")
            return False
            
        # Step 5: Test clear-all (removes everything)
        print("5. Testing clear-all (removes everything)...")
        
        clear_all_result = await chat_service.clear_all_messages(test_username)
        if not clear_all_result.success:
            print(f"❌ Clear-all failed: {clear_all_result.message}")
            return False
            
        print(f"   📝 {clear_all_result.message}")
        
        # Verify clear-all results
        final_result = await chat_service.get_chat_history(test_username, limit=50)
        if not final_result.success:
            print(f"❌ Failed to get messages after clear-all: {final_result.message}")
            return False
            
        final_messages = final_result.data["messages"]
        print(f"   📊 After clear-all: {len(final_messages)} messages")
        
        # Validate clear-all
        if len(final_messages) == 0:
            print("   ✅ Clear-all working correctly - everything removed")
        else:
            print("   ❌ Clear-all not working as expected - some messages remain")
            return False
            
        print("\n🎉 ALL TESTS PASSED! Chat clear functionality is working correctly.")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Clean up test data
        try:
            await chat_service.clear_all_messages(test_username)
            print(f"🧹 Cleaned up test data for {test_username}")
        except:
            pass

def main():
    """Run the test"""
    print("Starting chat clear functionality verification...\n")
    
    try:
        success = asyncio.run(test_chat_clear_functionality())
        
        if success:
            print("\n✅ All tests passed! Chat clear functionality is working correctly.")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed! Please check the output above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
