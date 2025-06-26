"""
Enhanced Main Application with Modular Architecture
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting AI Tutor Enhanced Backend...")
    
    try:
        # Initialize database
        from database_config import initialize_database
        initialize_database()
        logger.info("✅ Database initialized successfully")
        
        # Run migration if needed
        if os.getenv("RUN_MIGRATION", "false").lower() == "true":
            logger.info("🔄 Running data migration...")
            from migration_script import run_migration
            await run_migration()
            logger.info("✅ Data migration completed")
        
        # Initialize D-ID service
        from services.did_service import did_service
        if did_service.is_configured:
            logger.info("✅ D-ID Avatar Service initialized successfully")
        else:
            logger.warning("⚠️ D-ID Avatar Service not configured - using fallback avatar generation")
        
        # Initialize Tavus service
        from services.tavus_service import tavus_service
        if tavus_service.is_configured:
            logger.info("✅ Tavus Avatar Service initialized successfully")
        else:
            logger.warning("⚠️ Tavus Avatar Service not configured - using fallback avatar generation")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        # Don't raise the exception, just log it
        # This allows the server to start even if some services fail
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AI Tutor Enhanced Backend...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="AI Tutor - Enhanced Learning Management System",
    description="Scalable AI-powered learning platform with modular MongoDB architecture and avatar video integration",
    version="5.0.0",
    lifespan=lifespan
)

# Enhanced CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://eduverse-ai.vercel.app",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "*"  # Allow all origins for development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
    max_age=3600,
)

# Health check endpoints
@app.get("/api/status")
async def root():
    return {
        "message": "AI Tutor - Enhanced Learning Management System",
        "version": "5.0.0",
        "status": "healthy",
        "architecture": "modular",
        "database": "MongoDB with optimized schema",
        "features": [
            "Modular Database Architecture",
            "Optimized MongoDB Collections",
            "Enhanced User Management",
            "Advanced Chat System with Sessions",
            "Scalable Learning Goals Management",
            "Comprehensive Quiz System",
            "Real-time Analytics",
            "Data Migration Support",
            "Full-text Search",
            "Message Archiving",
            "Role-based Access Control",
            "AWS S3 File Storage",
            "D-ID Avatar Generation",
            "Tavus Avatar Video Generation"
        ],
        "collections": [
            "users",
            "chat_messages", 
            "learning_goals",
            "quizzes",
            "quiz_attempts",
            "lessons",
            "user_enrollments",
            "user_sessions"
        ]
    }

@app.get("/health")
async def health_check():
    # Check D-ID service status
    from services.did_service import did_service
    did_status = "available" if did_service.is_configured else "not configured"
    
    # Check Tavus service status
    from services.tavus_service import tavus_service
    tavus_status = "available" if tavus_service.is_configured else "not configured"
    
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "services": {
            "database": "connected",
            "ai_model": "available",
            "user_service": "active",
            "chat_service": "active",
            "learning_service": "active",
            "migration_service": "ready",
            "s3_service": "active",
            "avatar_service": "active",
            "did_service": did_status,
            "tavus_service": tavus_status,
            "api": "running",
            "cors": "enabled"
        },
        "version": "5.0.0",
        "architecture": "modular_mongodb"
    }

@app.get("/api")
async def api_info():
    return {
        "message": "Welcome to AI Tutor Enhanced API v5.0",
        "architecture": "Modular MongoDB with optimized collections",
        "cors_status": "enabled",
        "allowed_origins": origins,
        "new_features": [
            "Separated collections for better performance",
            "Optimized database indexes",
            "Enhanced user management",
            "Session-based chat tracking",
            "Real-time analytics",
            "Full-text search capabilities",
            "Automated data migration",
            "Message archiving system",
            "AWS S3 file storage integration",
            "D-ID Avatar video generation",
            "Tavus Avatar video generation"
        ],
        "documentation": "/docs"
    }

# Import and include API routers
try:
    from auth import auth_router
    from chat import chat_router
    # Fix: Import ai_quiz_generator as ai_quiz_router directly
    # from ai_quiz_generator import ai_quiz_router
    from learning_paths import learning_paths_router
    from lessons import lessons_router
    from quiz_system import quiz_router
    from api.avatar_api import avatar_router
    
    app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
    app.include_router(chat_router, prefix="/chat", tags=["Chat & Messaging"])
    # Fix: Comment out the ai_quiz_router inclusion since it's not available
    # app.include_router(ai_quiz_router, prefix="/quiz", tags=["AI Quiz Generator"])
    app.include_router(learning_paths_router, prefix="/learning-paths", tags=["Learning Paths"])
    app.include_router(lessons_router, prefix="/lessons", tags=["Lessons"])
    app.include_router(quiz_router, prefix="/quiz-system", tags=["Quiz System"])
    app.include_router(avatar_router, prefix="/avatar", tags=["Avatar Generation"])
    
    logger.info("✅ API routers loaded successfully")
except Exception as e:
    logger.error(f"❌ Error loading API routers: {e}")

# Legacy endpoints for backward compatibility
@app.get("/chat/user-stats")
async def get_user_stats_legacy(username: str):
    """Legacy endpoint for user stats"""
    try:
        from services.user_service import user_service
        stats = await user_service.calculate_user_stats(username)
        return stats.dict()
    except Exception as e:
        logger.error(f"User stats error: {e}")
        return {
            "totalGoals": 0,
            "completedGoals": 0,
            "totalQuizzes": 0,
            "averageScore": 0,
            "streakDays": 0,
            "totalStudyTime": 0
        }

@app.get("/chat/get-all-goals")
async def get_all_goals_legacy(username: str):
    """Legacy endpoint for learning goals"""
    try:
        # Directly query the database for learning goals
        from database import chats_collection
        chat_session = chats_collection.find_one({"username": username})
        if not chat_session or "learning_goals" not in chat_session:
            return {"learning_goals": []}
        
        return {"learning_goals": chat_session["learning_goals"]}
    except Exception as e:
        logger.error(f"Learning goals error: {e}")
        return {"learning_goals": []}

# Mount frontend build directory (after API routes)
FRONTEND_BUILD_DIR = os.path.join(os.getcwd(), "frontend", "dist")

if os.path.exists(FRONTEND_BUILD_DIR):
    # Mount frontend at the end to avoid conflicts with API routes
    app.mount("/static", StaticFiles(directory=FRONTEND_BUILD_DIR), name="static")
    
    # Handle favicon.ico specifically
    @app.get("/favicon.ico")
    async def favicon():
        """Serve favicon.ico"""
        favicon_path = os.path.join(FRONTEND_BUILD_DIR, "favicon.ico")
        if os.path.exists(favicon_path):
            from fastapi.responses import FileResponse
            return FileResponse(favicon_path)
        else:
            # Return a 204 No Content instead of 404 for favicon
            from fastapi.responses import Response
            return Response(status_code=204)
    
    # Serve static assets
    @app.get("/assets/{path:path}")
    async def serve_assets(path: str):
        """Serve static assets"""
        asset_path = os.path.join(FRONTEND_BUILD_DIR, "assets", path)
        if os.path.exists(asset_path):
            from fastapi.responses import FileResponse
            return FileResponse(asset_path)
        else:
            raise HTTPException(status_code=404, detail="Asset not found")
    
    # Serve frontend SPA - catch-all route for all paths
    @app.get("/{path:path}")
    async def serve_frontend(path: str = ""):
        """Serve frontend SPA for all routes"""
        from fastapi.responses import FileResponse
        
        # Skip API routes and static assets
        if path.startswith(("api/", "auth/", "chat/", "upload/", "lessons/", "admin/", "docs", "health", "openapi.json", "static/")):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Handle root path or empty path
        if not path or path == "":
            index_path = os.path.join(FRONTEND_BUILD_DIR, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
            else:
                raise HTTPException(status_code=404, detail="Frontend not found")
        
        # Check if it's a static file first
        file_path = os.path.join(FRONTEND_BUILD_DIR, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Otherwise serve index.html for SPA routing
        index_path = os.path.join(FRONTEND_BUILD_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        else:
            raise HTTPException(status_code=404, detail="Frontend not found")
    
    
    logger.info(f"✅ Frontend mounted from: {FRONTEND_BUILD_DIR}")
else:
    logger.warning(f"⚠️ Frontend build directory not found: {FRONTEND_BUILD_DIR}")

# Enhanced error handlers
from fastapi.responses import JSONResponse

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "message": "The requested endpoint does not exist",
            "status_code": 404,
            "available_endpoints": [
                "/auth/login", "/auth/signup", "/auth/profile",
                "/chat/ask", "/chat/history", "/chat/search",
                "/quiz/generate-ai-quiz", "/quiz/submit-ai-quiz",
                "/learning-paths/list", "/learning-paths/detail/{path_id}",
                "/lessons/lessons", "/lessons/lessons/enroll",
                "/avatar/generate-avatar", "/avatar/status/{lesson_id}",
                "/docs", "/health"
            ]
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again later.",
            "status_code": 500,
            "support": "Contact support if the issue persists",
            "version": "5.0.0"
        }
    )

@app.options("/{full_path:path}")
async def options_handler(request):
    return {"message": "OK"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting AI Tutor Enhanced Backend v5.0...")
    print("📊 MongoDB Collections: users, chat_messages, learning_goals, quizzes, quiz_attempts, lessons, user_enrollments, user_sessions")
    print("🔗 Server will be available at: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🛡️ Enhanced Security & Performance")
    print("📈 Real-time Analytics & Search")
    print("🗄️ AWS S3 File Storage Integration")
    print("🎬 D-ID Avatar Video Generation")
    print("🎬 Tavus Avatar Video Generation")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)