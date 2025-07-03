from database import chat_messages_collection, quiz_attempts_collection

def check_db():
    print('Recent chat messages:')
    messages = chat_messages_collection.find({'username': '717821i102@kce.ac.in'}).sort('timestamp', -1).limit(10)
    for msg in messages:
        timestamp = msg.get('timestamp', 'N/A')
        role = msg.get('role', 'N/A')
        session = msg.get('session_id', 'N/A')
        msg_type = msg.get('message_type', 'N/A')
        print(f'  {timestamp}: {role} | session: {session} | type: {msg_type}')
    
    print('\nRecent quiz attempts:')
    quiz_results = quiz_attempts_collection.find({'username': '717821i102@kce.ac.in'}).sort('submitted_at', -1).limit(5)
    for result in quiz_results:
        submitted_at = result.get('submitted_at', 'N/A')
        quiz_id = result.get('quiz_id', 'N/A')
        score = result.get('score_percentage', 0)
        print(f'  {submitted_at}: {quiz_id} | score: {score}%')

check_db()
