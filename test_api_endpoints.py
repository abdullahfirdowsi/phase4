#!/usr/bin/env python3
"""
Test script for chat clear API endpoints
Run this with the server running to test HTTP endpoints
"""

import requests
import json
import time

def test_endpoints_with_server():
    """Test the clear endpoints with actual HTTP requests"""
    print('🌐 Testing Chat Clear API Endpoints')
    print('=' * 50)
    
    base_url = 'http://localhost:8000'
    test_username = 'api_test_user'
    
    # Test endpoints
    endpoints = [
        f'{base_url}/chat/clear?username={test_username}',
        f'{base_url}/api/chat/clear?username={test_username}', 
        f'{base_url}/chat/clear-all?username={test_username}'
    ]
    
    print('Testing endpoints (assuming server is running)...')
    
    for endpoint in endpoints:
        print(f'\nTesting: {endpoint}')
        try:
            response = requests.delete(endpoint, timeout=5)
            print(f'Status: {response.status_code}')
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    message = result.get('message', 'No message')
                    print(f'Response: {message}')
                    print('✅ Endpoint working correctly')
                except:
                    print(f'Response: {response.text}')
                    print('✅ Endpoint working (text response)')
            else:
                print(f'❌ Failed: {response.text}')
                
        except requests.exceptions.ConnectionError:
            print('⚠️ Server not running - please start server with: python main.py')
            print('   Then test manually with:')
            print(f'   curl -X DELETE "{endpoint}"')
            break
        except Exception as e:
            print(f'❌ Error: {e}')
    
    print('\n📝 Manual testing instructions:')
    print('1. Start server: python main.py')
    print('2. Open frontend: http://localhost:8000')
    print('3. Send some chat messages')
    print('4. Click the Clear button to test regular clear')
    print('5. Use API endpoint for clear-all test')

if __name__ == "__main__":
    test_endpoints_with_server()
