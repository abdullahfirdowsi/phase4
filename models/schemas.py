"""
Pydantic Models for Data Validation and Serialization
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from enum import Enum

# Enums for consistent values
class UserRole(str, Enum):
    STUDENT = "student"
    PARENT = "parent"
    TEACHER = "teacher"
    ADMIN = "admin"

class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class ContentType(str, Enum):
    LESSON = "lesson"
    QUIZ = "quiz"
    LEARNING_GOAL = "learning_goal"

class MessageType(str, Enum):
    CONTENT = "content"
    LEARNING_PATH = "learning_path"
    QUIZ = "quiz"
    SYSTEM = "system"

class LessonType(str, Enum):
    VIDEO = "video"
    TEXT = "text"
    QUIZ = "quiz"
    INTERACTIVE = "interactive"

# User Models
class UserPreferences(BaseModel):
    language: str = "en"
    user_role: UserRole = UserRole.STUDENT
    age_group: str = "10-12"
    time_value: int = 30

class UserProfile(BaseModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    skill_level: DifficultyLevel = DifficultyLevel.BEGINNER

class UserStats(BaseModel):
    total_goals: int = 0
    completed_goals: int = 0
    average_score: float = 0.0
    total_study_time: int = 0
    streak_days: int = 0

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_admin: bool = False
    profile: Optional[UserProfile] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    preferences: Optional[UserPreferences] = None
    profile: Optional[UserProfile] = None

class User(BaseModel):
    id: Optional[str] = Field(alias="_id")
    username: str
    email: str
    password_hash: str
    is_admin: bool = False
    preferences: UserPreferences = UserPreferences()
    profile: UserProfile = UserProfile()
    stats: UserStats = UserStats()
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        populate_by_name = True

# Chat Models
class ChatMessageMetadata(BaseModel):
    tokens_used: Optional[int] = None
    model_version: Optional[str] = None
    response_time: Optional[float] = None

class ChatMessage(BaseModel):
    id: Optional[str] = Field(alias="_id")
    username: str
    session_id: str
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    message_type: MessageType = MessageType.CONTENT
    metadata: Optional[ChatMessageMetadata] = None
    timestamp: datetime

    class Config:
        populate_by_name = True

# Learning Goal Models
class StudyPlan(BaseModel):
    name: str
    description: str
    topics: List[Dict[str, Any]] = []
    duration: Optional[str] = None

class LearningGoal(BaseModel):
    id: Optional[str] = Field(alias="_id")
    goal_id: str
    username: str
    name: str
    description: str
    difficulty: DifficultyLevel
    duration: str
    progress: float = 0.0
    status: str = "active"
    prerequisites: List[str] = []
    tags: List[str] = []
    study_plans: List[StudyPlan] = []
    created_at: datetime
    target_completion_date: Optional[datetime] = None

    class Config:
        populate_by_name = True

# Quiz Models
class QuizQuestion(BaseModel):
    question_id: str
    question: str
    question_type: str = Field(..., pattern="^(mcq|true_false|short_answer)$")
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 1

class Quiz(BaseModel):
    id: Optional[str] = Field(alias="_id")
    quiz_id: str
    title: str
    description: str
    subject: str
    difficulty: DifficultyLevel
    time_limit: int  # in minutes
    is_public: bool = True
    created_by: str
    questions: List[QuizQuestion]
    tags: List[str] = []
    created_at: datetime

    class Config:
        populate_by_name = True

class QuizAttempt(BaseModel):
    id: Optional[str] = Field(alias="_id")
    attempt_id: str
    quiz_id: str
    username: str
    answers: Dict[str, str]
    score: float
    total_questions: int
    correct_answers: int
    time_taken: int  # in seconds
    completed: bool = False
    completed_at: Optional[datetime] = None

    class Config:
        populate_by_name = True

# Lesson Models
class Lesson(BaseModel):
    id: Optional[str] = Field(alias="_id")
    lesson_id: str
    title: str
    description: str
    content: str
    lesson_type: LessonType
    subject: str
    difficulty: DifficultyLevel
    duration: int  # in minutes
    is_public: bool = True
    created_by: str
    resources: List[str] = []
    tags: List[str] = []
    created_at: datetime
    avatar_video_url: Optional[str] = None

    class Config:
        populate_by_name = True

# Enrollment Models
class UserEnrollment(BaseModel):
    id: Optional[str] = Field(alias="_id")
    enrollment_id: str
    username: str
    content_type: ContentType
    content_id: str
    progress: float = 0.0
    status: str = "in_progress"
    time_spent: int = 0  # in minutes
    enrolled_at: datetime
    last_accessed: Optional[datetime] = None

    class Config:
        populate_by_name = True

# Session Models
class SessionActivity(BaseModel):
    action: str
    resource_id: Optional[str] = None
    timestamp: datetime

class UserSession(BaseModel):
    id: Optional[str] = Field(alias="_id")
    session_id: str
    username: str
    ip_address: str
    user_agent: str
    login_time: datetime
    logout_time: Optional[datetime] = None
    activities: List[SessionActivity] = []

    class Config:
        populate_by_name = True

# API Response Models
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int

# File Upload Models
class UploadFileResponse(BaseModel):
    success: bool
    message: str
    url: Optional[str] = None
    key: Optional[str] = None
    error: Optional[str] = None

# Avatar Generation Models
class GenerateAvatarRequest(BaseModel):
    lesson_id: str
    avatar_image_url: str
    voice_language: str = "en"
    voice_gender: str = "female"

class GenerateAvatarResponse(BaseModel):
    success: bool
    message: str
    avatar_video_url: Optional[str] = None
    lesson_id: str
    error: Optional[str] = None