"""
Optimized Server startup script - Faster startup with minimal checks
"""
import uvicorn
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_critical_environment():
    """Check only critical environment variables"""
    load_dotenv()
    
    # Only check the most critical variables
    critical_vars = ["MONGO_URI", "API_KEY"]
    missing_vars = []
    
    for var in critical_vars:
        value = os.getenv(var)
        if not value or value.startswith("your_"):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error("❌ Missing critical environment variables:")
        for var in missing_vars:
            logger.error(f"   - {var}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Starting AI Tutor Backend...")
    
    # Quick check for critical environment variables only
    if not check_critical_environment():
        print("\n❌ Server startup aborted due to missing critical configuration")
        print("   Copy .env.example to .env and fill in the required values")
        exit(1)
    
    try:
        # Start server with minimal checks
        uvicorn.run(
            "main:app", 
            host="0.0.0.0", 
            port=8000, 
            reload=True,
            log_level="info",
            reload_excludes=["*.pyc", "*.pyo", "__pycache__/*"],  # Exclude cache files from reload
            workers=1  # Use single worker for development
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server startup failed: {e}")
        exit(1)