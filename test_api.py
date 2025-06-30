#!/usr/bin/env python3
"""
Test API functionality after sorting fixes
"""
import requests
import json

def test_api():
    """Test the learning paths API"""
    try:
        url = 'http://localhost:8000/learning-paths/list'
        params = {'username': '717821i136@kce.ac.in'}
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            paths = data.get('learning_paths', [])
            print(f'✅ API working - Found {len(paths)} learning paths')
            
            if paths:
                print('First 3 paths (should be newest first):')
                for i, path in enumerate(paths[:3]):
                    name = path.get('name', 'Unknown')
                    created_at = path.get('created_at', 'No date')
                    print(f'  {i+1}. {name} - {created_at}')
        else:
            print(f'❌ API Error: {response.status_code}')
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print('❌ Connection Error: Server not running')
        print('Note: Make sure the backend server is running on localhost:8000')
    except Exception as e:
        print(f'❌ Error: {e}')

if __name__ == "__main__":
    test_api()
