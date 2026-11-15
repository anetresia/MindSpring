
import sys
from pathlib import Path
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv

# ==========================================
# BACKEND PATH
# ==========================================

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

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
# SUBSCRIPTION MODELS
# ==========================================

from app.models.subscription.subscription_plan import SubscriptionPlan
from app.models.subscription.parent_subscription import ParentSubscription
from app.models.subscription.subscription_credit import SubscriptionCredit
from app.models.subscription.subscription_payment import SubscriptionPayment
from app.models.subscription.video_history import VideoHistory
from app.models.subscription.notification import Notification

# ==========================================
# ALEMBIC CONFIGURATION
# ==========================================

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# ==========================================
# OFFLINE MIGRATION
# ==========================================

def run_migrations_offline() -> None:

    context.configure(
        url=engine.url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ==========================================
# ONLINE MIGRATION
# ==========================================

def run_migrations_online() -> None:

    with engine.connect() as connection:

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
