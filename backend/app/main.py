
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


# ==========================================
# DATABASE
# ==========================================

from app.database import Base, engine


# ==========================================
# DATABASE MODELS
# ==========================================

from app.models.user import User
from app.models.contact_message import ContactMessage
from app.models.otp_verification import OTPVerification
from app.models.password_reset_otp import PasswordResetOTP
from app.models.child import Child
from app.models.lesson import Lesson
from app.models.life_skill_category import LifeSkillCategory
from app.models.life_skill_topic import LifeSkillTopic
from app.models.child_selected_topic import ChildSelectedTopic
from app.models.quiz import Question, ActivityResponse
from app.models.reward_transaction import RewardTransaction


# ==========================================
# ROUTERS
# ==========================================

from app.routers.auth import router as auth_router
from app.routers.contact import router as contact_router
from app.routers.parent import router as parent_router
from app.routers.lesson import router as lesson_router

# Admin Quiz Router
from app.routers.quiz import router as quiz_router

# Child Quiz Router
from app.routers.quiz import child_router as child_quiz_router

from app.routers.question_image_upload import (
    router as question_image_upload_router
)

from app.routers import life_skill_category
from app.routers import life_skill_topic
from app.routers import admin_video_upload

from app.routers.child_selected_topic import (
    router as child_selected_topic_router
)

from app.routers.parent_life_skill_topic import (
    router as parent_life_skill_topic_router
)

from app.routers.parent_rewards import router as parent_rewards_router


# ==========================================
# CREATE DATABASE TABLES
# ==========================================

Base.metadata.create_all(bind=engine)


# ==========================================
# INITIALIZE FASTAPI
# ==========================================

app = FastAPI(
    title="MindSpring API",
    description="MindSpring Backend API",
    version="1.0.0",
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# UPLOAD DIRECTORIES
# ==========================================

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"

VIDEO_UPLOAD_DIR = UPLOAD_DIR / "videos"

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

VIDEO_UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ==========================================
# SERVE UPLOADED FILES
# ==========================================

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads",
)


# ==========================================
# REGISTER ROUTERS
# ==========================================

# Authentication
app.include_router(auth_router)

# Contact
app.include_router(contact_router)

# Parent
app.include_router(parent_router)

# Admin Life Skill Categories
app.include_router(life_skill_category.router)

# Admin Life Skill Topics
app.include_router(life_skill_topic.router)

# Admin Lessons
app.include_router(lesson_router)

# Admin Quiz Management
app.include_router(quiz_router)

# Child Quiz Questions
app.include_router(child_quiz_router)

# Admin Question Image Upload
app.include_router(question_image_upload_router)

# Admin Video Upload
app.include_router(admin_video_upload.router)

# Parent Selected Topics
app.include_router(child_selected_topic_router)

# Parent Life Skill Topics
app.include_router(parent_life_skill_topic_router)

app.include_router(parent_rewards_router)


# ==========================================
# ROOT ENDPOINT
# ==========================================

@app.get("/")
def home():
    return {
        "message": "MindSpring API is running"
    }
