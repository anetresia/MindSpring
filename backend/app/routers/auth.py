import os
import secrets
import uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    File,
    UploadFile,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from google.auth.exceptions import GoogleAuthError
from pwdlib import PasswordHash
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.otp_verification import OTPVerification
from app.models.password_reset_otp import PasswordResetOTP

from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    OTPVerify,
    UserProfileUpdate,
)

from app.services.email_service import send_otp_email


load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])

password_hash = PasswordHash.recommended()
security = HTTPBearer()


# ==========================================
# JWT CONFIGURATION
# ==========================================

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is missing from .env")


# ==========================================
# GOOGLE OAUTH CONFIGURATION
# ==========================================

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

if not GOOGLE_CLIENT_ID:
    raise RuntimeError("GOOGLE_CLIENT_ID is missing from .env")


# ==========================================
# OTP CONFIGURATION
# ==========================================

OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "1"))

OTP_RESEND_COOLDOWN_SECONDS = int(
    os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60")
)

OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "3"))


# Password Reset Configuration
RESET_OTP_EXPIRE_MINUTES = 5
RESET_TOKEN_EXPIRE_MINUTES = 10


# ==========================================
# REQUEST SCHEMAS
# ==========================================

class GoogleAuthRequest(BaseModel):
    credential: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyResetOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
    )


class ResetPasswordRequest(BaseModel):
    reset_token: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


# ==========================================
# COMMON FUNCTIONS
# ==========================================

def get_current_time():
    return datetime.now(timezone.utc).replace(tzinfo=None)


# Create JWT Access Token
def create_access_token(user: User):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user.user_id),
        "email": user.email,
        "role": user.role,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


# ==========================================
# VERIFY JWT AND GET CURRENT USER
# ==========================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            )

        user_id = int(user_id)

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login session has expired. Please login again.",
        )

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    user = db.query(User).filter(
        User.user_id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return user


# ==========================================
# VERIFY ADMIN USER
# ==========================================

def get_current_admin(
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin account required.",
        )

    return current_user


# ==========================================
# VERIFY PARENT USER
# ==========================================

def get_current_parent(
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "Parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Parent account required.",
        )

    return current_user


# ==========================================
# PARENT REGISTRATION - SEND OTP
# ==========================================

@router.post("/send-otp")
def send_registration_otp(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    email = str(user_data.email).lower().strip()

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    current_time = get_current_time()

    existing_otp = db.query(OTPVerification).filter(
        OTPVerification.email == email
    ).first()

    if existing_otp:
        elapsed = (
            current_time - existing_otp.last_sent_at
        ).total_seconds()

        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            remaining = OTP_RESEND_COOLDOWN_SECONDS - int(elapsed)

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another OTP.",
            )

        db.delete(existing_otp)
        db.commit()

    otp = f"{secrets.randbelow(1000000):06d}"

    new_otp = OTPVerification(
        email=email,
        pending_name=user_data.name.strip(),
        pending_password_hash=password_hash.hash(user_data.password),
        otp_hash=password_hash.hash(otp),
        expires_at=current_time + timedelta(
            minutes=OTP_EXPIRE_MINUTES
        ),
        last_sent_at=current_time,
        attempts=0,
    )

    db.add(new_otp)
    db.commit()

    try:
        send_otp_email(email, otp)

    except Exception:
        db.delete(new_otp)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send OTP email. Please try again later.",
        )

    return {
        "message": "OTP sent successfully. Please check your email.",
        "email": email,
        "expires_in": OTP_EXPIRE_MINUTES * 60,
        "resend_after": OTP_RESEND_COOLDOWN_SECONDS,
    }


# ==========================================
# VERIFY REGISTRATION OTP AND CREATE ACCOUNT
# ==========================================

@router.post("/verify-otp", response_model=UserResponse)
def verify_registration_otp(
    otp_data: OTPVerify,
    db: Session = Depends(get_db),
):
    email = str(otp_data.email).lower().strip()

    otp_record = db.query(OTPVerification).filter(
        OTPVerification.email == email
    ).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OTP request not found. Please request a new OTP.",
        )

    current_time = get_current_time()

    if current_time > otp_record.expires_at:
        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new OTP.",
        )

    if otp_record.attempts >= OTP_MAX_ATTEMPTS:
        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum OTP attempts reached. Please request a new OTP.",
        )

    if not password_hash.verify(
        otp_data.otp,
        otp_record.otp_hash,
    ):
        otp_record.attempts += 1
        db.commit()

        remaining = OTP_MAX_ATTEMPTS - otp_record.attempts

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP. {remaining} attempts remaining.",
        )

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered.",
        )

    new_user = User(
        name=otp_record.pending_name,
        email=email,
        password_hash=otp_record.pending_password_hash,
        role="Parent",
    )

    db.add(new_user)
    db.delete(otp_record)
    db.commit()
    db.refresh(new_user)

    return new_user


# ==========================================
# REGISTRATION - RESEND OTP
# ==========================================

@router.post("/resend-otp")
def resend_registration_otp(
    email: str,
    db: Session = Depends(get_db),
):
    try:
        email = str(
            EmailStr._validate(email)
        ).lower().strip()

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide a valid email address.",
        )

    otp_record = db.query(OTPVerification).filter(
        OTPVerification.email == email
    ).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OTP request not found. Please register again.",
        )

    current_time = get_current_time()

    elapsed = (
        current_time - otp_record.last_sent_at
    ).total_seconds()

    if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
        remaining = OTP_RESEND_COOLDOWN_SECONDS - int(elapsed)

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining} seconds before resending OTP.",
        )

    if otp_record.attempts >= OTP_MAX_ATTEMPTS:
        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum OTP attempts reached. Please register again.",
        )

    otp = f"{secrets.randbelow(1000000):06d}"

    otp_record.otp_hash = password_hash.hash(otp)
    otp_record.expires_at = current_time + timedelta(
        minutes=OTP_EXPIRE_MINUTES
    )
    otp_record.last_sent_at = current_time
    otp_record.attempts = 0

    db.commit()

    try:
        send_otp_email(email, otp)

    except Exception:
        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to resend OTP email. Please try again.",
        )

    return {
        "message": "A new OTP has been sent to your email.",
        "expires_in": OTP_EXPIRE_MINUTES * 60,
        "resend_after": OTP_RESEND_COOLDOWN_SECONDS,
    }


# ==========================================
# FORGOT PASSWORD - SEND OTP
# ==========================================

@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = str(request.email).lower().strip()

    user = db.query(User).filter(
        User.email == email
    ).first()

    # Do not reveal whether an account exists
    if not user:
        return {
            "message": "If the email is registered, a reset OTP will be sent."
        }

    current_time = get_current_time()

    existing_otp = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.email == email
    ).first()

    if existing_otp:
        elapsed = (
            current_time - existing_otp.last_sent_at
        ).total_seconds()

        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            remaining = OTP_RESEND_COOLDOWN_SECONDS - int(elapsed)

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another OTP.",
            )

        db.delete(existing_otp)
        db.commit()

    otp = f"{secrets.randbelow(1000000):06d}"

    new_otp = PasswordResetOTP(
        email=email,
        otp_hash=password_hash.hash(otp),
        expires_at=current_time + timedelta(
            minutes=RESET_OTP_EXPIRE_MINUTES
        ),
        last_sent_at=current_time,
        attempts=0,
    )

    db.add(new_otp)
    db.commit()

    try:
        send_otp_email(email, otp)

    except Exception:
        db.delete(new_otp)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send reset OTP. Please try again later.",
        )

    return {
        "message": "If the email is registered, a reset OTP will be sent.",
        "expires_in": RESET_OTP_EXPIRE_MINUTES * 60,
        "resend_after": OTP_RESEND_COOLDOWN_SECONDS,
    }


# ==========================================
# FORGOT PASSWORD - VERIFY OTP
# ==========================================

@router.post("/verify-reset-otp")
def verify_reset_otp(
    request: VerifyResetOTPRequest,
    db: Session = Depends(get_db),
):
    email = str(request.email).lower().strip()

    otp_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.email == email
    ).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reset OTP request not found. Please request a new OTP.",
        )

    current_time = get_current_time()

    if current_time > otp_record.expires_at:
        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset OTP has expired. Please request a new OTP.",
        )

    if otp_record.attempts >= OTP_MAX_ATTEMPTS:
        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum OTP attempts reached. Please request a new OTP.",
        )

    if not password_hash.verify(
        request.otp,
        otp_record.otp_hash,
    ):
        otp_record.attempts += 1
        db.commit()

        remaining = OTP_MAX_ATTEMPTS - otp_record.attempts

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP. {remaining} attempts remaining.",
        )

    # Generate short-lived reset token
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=RESET_TOKEN_EXPIRE_MINUTES
    )

    reset_token = jwt.encode(
        {
            "email": email,
            "purpose": "password_reset",
            "otp_id": otp_record.id,
            "exp": expire,
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    return {
        "message": "OTP verified successfully.",
        "reset_token": reset_token,
    }


# ==========================================
# FORGOT PASSWORD - RESET PASSWORD
# ==========================================

@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    password = request.new_password

    # Password strength validation
    if not (
        any(char.isupper() for char in password)
        and any(char.islower() for char in password)
        and any(char.isdigit() for char in password)
        and any(not char.isalnum() for char in password)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain uppercase, lowercase, number and special character.",
        )

    # Verify reset token
    try:
        payload = jwt.decode(
            request.reset_token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

        if payload.get("purpose") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password reset token.",
            )

        email = payload.get("email")
        otp_id = payload.get("otp_id")

        if not email or not otp_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password reset token.",
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password reset session expired. Please verify OTP again.",
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password reset token.",
        )

    # Verify OTP record still exists
    otp_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.id == otp_id,
        PasswordResetOTP.email == email,
    ).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password reset session is invalid or already used.",
        )

    # Find user
    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    # Update password
    user.password_hash = password_hash.hash(password)

    # Remove OTP record to prevent reuse
    db.delete(otp_record)
    db.commit()

    return {
        "message": "Password reset successfully. Please login with your new password."
    }


# ==========================================
# PARENT LOGIN - EMAIL AND PASSWORD
# ==========================================

@router.post("/login")
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    email = str(login_data.email).lower().strip()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if user is None or not password_hash.verify(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    access_token = create_access_token(user)

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


# ==========================================
# GOOGLE LOGIN AND REGISTRATION
# ==========================================

@router.post("/google")
def google_auth(
    google_data: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    try:
        google_user = id_token.verify_oauth2_token(
            google_data.credential,
            GoogleRequest(),
            GOOGLE_CLIENT_ID,
        )

    except (ValueError, GoogleAuthError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google authentication. Please try again.",
        )

    if google_user.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your Google email address is not verified.",
        )

    email = google_user.get("email")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email was not provided.",
        )

    email = email.lower().strip()

    name = google_user.get("name") or email.split("@")[0]
    name = name.strip()[:100]

    user = db.query(User).filter(
        User.email == email
    ).first()

    if user is None:
        user = User(
            name=name,
            email=email,
            password_hash=password_hash.hash(
                secrets.token_urlsafe(32)
            ),
            role="Parent",
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user)

    return {
        "message": "Google authentication successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


# ==========================================
# PARENT LOGOUT
# ==========================================

@router.post("/logout")
def logout_user(
    current_user: User = Depends(get_current_user),
):
    return {
        "message": "Logout successful"
    }


# ==========================================
# GET CURRENT LOGGED-IN PARENT
# ==========================================

@router.get("/me", response_model=UserResponse)
def get_logged_in_parent(
    current_user: User = Depends(get_current_user),
):
    return current_user


# ==========================================
# PARENT PROFILE - UPDATE NAME AND PHONE
# ==========================================

@router.put("/profile", response_model=UserResponse)
def update_parent_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.name = profile_data.name.strip()

    current_user.phone = (
        profile_data.phone.strip()
        if profile_data.phone and profile_data.phone.strip()
        else None
    )

    db.commit()
    db.refresh(current_user)

    return current_user


# ==========================================
# PARENT PROFILE - UPLOAD PROFILE IMAGE
# ==========================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

PROFILE_IMAGE_DIR = (
    BACKEND_DIR / "uploads" / "profile_images"
)

PROFILE_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": (".jpg", "jpeg"),
    "image/png": (".png", "png"),
    "image/webp": (".webp", "webp"),
}


def is_valid_image_file(
    image_bytes: bytes,
    image_format: str,
) -> bool:

    if image_format == "jpeg":
        return image_bytes.startswith(b"\xff\xd8\xff")

    if image_format == "png":
        return image_bytes.startswith(b"\x89PNG\r\n\x1a\n")

    if image_format == "webp":
        return (
            len(image_bytes) >= 12
            and image_bytes.startswith(b"RIFF")
            and image_bytes[8:12] == b"WEBP"
        )

    return False


@router.post(
    "/profile/image",
    response_model=UserResponse,
)
async def upload_parent_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    content_type = (file.content_type or "").lower()

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG and WEBP images are allowed.",
        )

    image_bytes = await file.read(
        MAX_PROFILE_IMAGE_SIZE + 1
    )

    await file.close()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select an image to upload.",
        )

    if len(image_bytes) > MAX_PROFILE_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Profile image must be 5 MB or smaller.",
        )

    extension, image_format = ALLOWED_IMAGE_TYPES[content_type]

    if not is_valid_image_file(image_bytes, image_format):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not a valid image.",
        )

    filename = f"{uuid.uuid4().hex}{extension}"

    destination = PROFILE_IMAGE_DIR / filename

    try:
        with destination.open("wb") as image_file:
            image_file.write(image_bytes)

        old_image_url = current_user.profile_image

        current_user.profile_image = (
            f"/uploads/profile_images/{filename}"
        )

        db.commit()
        db.refresh(current_user)

    except Exception:
        if destination.exists():
            destination.unlink()

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to upload profile image. Please try again.",
        )

    # Delete the previous image only if it belongs to this upload folder.
    if (
        old_image_url
        and old_image_url.startswith("/uploads/profile_images/")
    ):

        old_filename = Path(old_image_url).name

        old_image_path = PROFILE_IMAGE_DIR / old_filename

        if old_image_path.is_file():
            try:
                old_image_path.unlink()
            except OSError:
                pass

    return current_user