# AI Tutor - Enhanced MongoDB Architecture

## 🚀 Overview

This enhanced version of AI Tutor implements a **modular, scalable MongoDB architecture** that replaces the monolithic `chats` collection with dedicated collections for each logical entity. This design ensures better performance, maintainability, and scalability.

## 📊 New Database Schema

### Collections Structure

```
ai_tutor_enhanced/
├── users                 # User authentication, profiles, preferences
├── chat_messages         # AI conversation logs with sessions
├── learning_goals        # Goal-oriented learning plans
├── quizzes              # Quiz templates and configurations
├── quiz_attempts        # User quiz submissions and results
├── lessons              # Educational content (admin/user generated)
├── user_enrollments     # Track progress across all content types
└── user_sessions        # Login sessions and user activity tracking
```

### Key Improvements

✅ **Separated Collections** - Each entity has its own optimized collection
✅ **Optimized Indexes** - Faster queries with proper indexing strategy
✅ **Session Management** - Track user sessions and activities
✅ **Real-time Analytics** - Calculate statistics on-demand
✅ **Full-text Search** - Search across chat messages
✅ **Data Archiving** - Archive old messages for performance
✅ **Modular Services** - Clean separation of business logic

## 🛠 Architecture Components

### Services Layer
- **UserService** - User management, authentication, statistics
- **ChatService** - Message handling, sessions, search, archiving
- **LearningService** - Learning goals, progress tracking, recommendations

### API Layer
- **AuthAPI** - Enhanced authentication with JWT
- **ChatAPI** - Streaming chat with session management
- **LearningAPI** - Learning goals and progress management

### Database Layer
- **DatabaseConfig** - Connection management and indexing
- **Migration Script** - Automated data migration from old schema

## 🔧 Installation & Setup

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env
```

### 2. Install Dependencies
```bash
pip install -r requirements_enhanced.txt
```

### 3. Initialize Database
```bash
# Initialize collections and indexes
python database_config.py

# Run migration (if upgrading from old schema)
python migration_script.py
```

### 4. Start Application
```bash
# Development
python main_enhanced.py

# Production
uvicorn main_enhanced:app --host 0.0.0.0 --port 8000
```

## 📈 Performance Optimizations

### Indexing Strategy
- **Compound Indexes** - Optimized for common query patterns
- **Text Indexes** - Full-text search across messages
- **TTL Indexes** - Automatic cleanup of old sessions

### Query Optimization
- **Aggregation Pipelines** - Efficient data processing
- **Projection** - Return only required fields
- **Pagination** - Handle large datasets efficiently

### Caching Strategy
- **In-memory Stats** - Cache frequently accessed statistics
- **Session Caching** - Reduce database lookups
- **Query Result Caching** - Cache expensive aggregations

## 🔍 API Endpoints

### Authentication
```
POST /auth/signup          # User registration
POST /auth/login           # User login
GET  /auth/profile         # Get user profile
GET  /auth/check-admin     # Check admin status
POST /auth/update-preferences  # Update user preferences
```

### Chat & Messaging
```
POST /chat/ask             # Send message (streaming)
GET  /chat/history         # Get chat history
DELETE /chat/clear         # Clear chat history
GET  /chat/search          # Search messages
GET  /chat/analytics       # Get chat analytics
POST /chat/archive         # Archive old messages
```

### Learning Management
```
POST /learning/goals       # Create learning goal
GET  /learning/goals       # Get user goals
PUT  /learning/goals/{id}  # Update goal progress
DELETE /learning/goals/{id} # Delete goal
GET  /learning/analytics   # Get learning analytics
GET  /learning/recommendations # Get recommended goals
```

### Admin Management
```
POST /admin/migrate        # Trigger data migration
POST /admin/initialize-db  # Initialize database
GET  /admin/users          # Get users overview
GET  /admin/stats          # Get platform statistics
```

## 🔄 Migration Process

The migration script automatically converts data from the old monolithic structure to the new modular schema:

1. **User Data** - Extracts user info, preferences, and statistics
2. **Chat Messages** - Converts messages with session tracking
3. **Learning Goals** - Migrates learning paths and progress
4. **Quiz Data** - Separates quizzes and attempts
5. **Enrollments** - Creates enrollment records for tracking

```bash
# Run migration
python migration_script.py

# Or trigger via API
curl -X POST http://localhost:8000/admin/migrate
```

## 📊 Monitoring & Analytics

### Real-time Statistics
- User engagement metrics
- Learning progress tracking
- Quiz performance analytics
- Chat usage patterns

### Performance Monitoring
- Query execution times
- Database connection health
- Memory usage tracking
- Error rate monitoring

## 🔒 Security Enhancements

### Authentication
- JWT token-based authentication
- Secure password hashing with bcrypt
- Role-based access control
- Session management

### Data Protection
- Input validation with Pydantic
- SQL injection prevention
- Rate limiting (configurable)
- CORS protection

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements_enhanced.txt .
RUN pip install -r requirements_enhanced.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main_enhanced:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables
```bash
# Required
MONGO_URI=mongodb://localhost:27017
DATABASE_NAME=ai_tutor_enhanced
JWT_SECRET=your-secret-key
API_KEY=your-groq-api-key

# Optional
RUN_MIGRATION=false
DEBUG=false
LOG_LEVEL=INFO
```

## 📝 Development Guidelines

### Code Organization
- **Services** - Business logic and data operations
- **Models** - Pydantic schemas for validation
- **API** - FastAPI routers and endpoints
- **Utils** - Helper functions and utilities

### Testing
```bash
# Run tests
pytest tests/

# Run with coverage
pytest --cov=. tests/
```

### Contributing
1. Follow the modular architecture pattern
2. Add proper error handling and logging
3. Include comprehensive tests
4. Update documentation for new features

## 🎯 Future Enhancements

- [ ] Redis caching layer
- [ ] Elasticsearch integration
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] API rate limiting
- [ ] Automated backups
- [ ] Performance monitoring

## 📞 Support

For issues and questions:
- Check the logs: `tail -f logs/app.log`
- Review API docs: `http://localhost:8000/docs`
- Monitor health: `http://localhost:8000/health`

---

**Built with ❤️ for scalable learning**