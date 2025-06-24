"""
Server startup script - Use this to start the server properly
"""
import uvicorn
import os
from dotenv import load_dotenv

def check_environment():
    """Check if environment is properly configured"""
    load_dotenv()
    
    required_vars = ["MONGO_URI", "API_KEY", "JWT_SECRET"]
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value or value.startswith("your_"):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n💡 Please update your .env file with the correct values")
        print("   Copy .env.example to .env and fill in your credentials")
        return False
    
    # Check optional S3 configuration
    s3_vars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET_NAME"]
    s3_configured = all(
        os.getenv(var) and not os.getenv(var).startswith("your_") 
        for var in s3_vars
    )
    
    if s3_configured:
        print("✅ AWS S3 configured - file upload features enabled")
    else:
        print("ℹ️ AWS S3 not configured - file upload features disabled")
    
    return True

if __name__ == "__main__":
    print("🚀 Starting AI Tutor Enhanced Backend v5.0...")
    print("📊 MongoDB Collections: users, chat_messages, learning_goals, quizzes, quiz_attempts, lessons, user_enrollments, user_sessions")
    print("🔗 Server will be available at: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🛡️ Enhanced Security & Performance")
    print("📈 Real-time Analytics & Search")
    print("🗄️ AWS S3 File Storage Integration")
    print("🎬 Avatar Video Generation")
    print()
    
    # Check environment configuration
    if not check_environment():
        print("\n❌ Server startup aborted due to missing configuration")
        exit(1)
    
    print("✅ Environment configuration validated")
    print()
    
    try:
        uvicorn.run(
            "main_enhanced:app", 
            host="0.0.0.0", 
            port=8000, 
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server startup failed: {e}")
        exit(1)