
from fastapi import FastAPI, HTTPException
from pathlib import Path

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
from app.models.lesson_attempt import LessonAttempt


# ==========================================
# ROUTERS
# ==========================================

from app.routers.auth import router as auth_router
from app.routers.contact import router as contact_router
from app.routers.parent import router as parent_router
from app.routers.lesson import router as lesson_router

from app.routers.quiz import router as quiz_router
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
from app.routers import admin_management

# ==========================================
# UPLOAD DIRECTORIES
# ==========================================

# main.py is inside backend/app/
# Actual uploads folder: backend/app/uploads/

APP_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = APP_DIR / "uploads"

VIDEO_UPLOAD_DIR = UPLOAD_DIR / "videos"

QUESTION_UPLOAD_DIR = UPLOAD_DIR / "questions"

PROFILE_IMAGE_DIR = UPLOAD_DIR / "profile_images"


# Create folders if they do not exist
for folder in [
    UPLOAD_DIR,
    VIDEO_UPLOAD_DIR,
    QUESTION_UPLOAD_DIR,
    PROFILE_IMAGE_DIR,
]:
    folder.mkdir(parents=True, exist_ok=True)


# ==========================================
# DATABASE TABLE CREATION
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
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# SERVE ALL UPLOADED FILES
# ==========================================

# /uploads/videos/ -> backend/app/uploads/videos/
# /uploads/questions/ -> backend/app/uploads/questions/

app.mount(
    "/uploads",
    StaticFiles(
        directory=str(UPLOAD_DIR),
        check_dir=True
    ),
    name="uploads",
)


# ==========================================
# REGISTER ROUTERS
# ==========================================

app.include_router(auth_router)
app.include_router(contact_router)
app.include_router(parent_router)

app.include_router(life_skill_category.router)
app.include_router(life_skill_topic.router)

app.include_router(lesson_router)

app.include_router(quiz_router)
app.include_router(child_quiz_router)

app.include_router(question_image_upload_router)
app.include_router(admin_video_upload.router)

app.include_router(child_selected_topic_router)
app.include_router(parent_life_skill_topic_router)
app.include_router(parent_rewards_router)
app.include_router(admin_management.router)


# ==========================================
# ROOT ENDPOINT
# ==========================================

@app.get("/")
def home():
    return {
        "message": "MindSpring API is running",
        "upload_directory": str(UPLOAD_DIR),
        "video_directory": str(VIDEO_UPLOAD_DIR),
        "question_directory": str(QUESTION_UPLOAD_DIR),
    }


# ==========================================
# VIDEO FILE CHECK
# ==========================================

@app.get("/check-video/{filename}")
def check_video(filename: str):

    if Path(filename).name != filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid filename",
        )

    video_path = VIDEO_UPLOAD_DIR / filename

    if not video_path.is_file():
        raise HTTPException(
            status_code=404,
            detail={
                "message": "Video file not found",
                "expected_path": str(video_path),
                "filename": filename,
            },
        )

    return {
        "success": True,
        "message": "Video file found",
        "video_url": f"/uploads/videos/{filename}",
        "file_size": video_path.stat().st_size,
    }
