
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)

from app.models.user import User
from app.routers.auth import get_current_admin


router = APIRouter(
    prefix="/admin/quizzes",
    tags=["Admin Quiz Image Upload"],
)


# ==========================================
# IMAGE UPLOAD DIRECTORY
# ==========================================

APP_DIR = Path(__file__).resolve().parents[1]

QUESTION_UPLOAD_DIR = APP_DIR / "uploads" / "questions"

QUESTION_UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ==========================================
# IMAGE SETTINGS
# ==========================================

MAX_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
}


# ==========================================
# UPLOAD QUESTION IMAGE
# ==========================================

@router.post("/upload-question-image")
async def upload_question_image(
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin),
):

    # Check file extension
    original_extension = Path(file.filename or "").suffix.lower()

    if original_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PNG, JPG and JPEG images are allowed.",
        )

    # Read image content
    image_data = await file.read(MAX_FILE_SIZE + 1)

    # Check file size
    if len(image_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image size must not exceed 5 MB.",
        )

    # Check actual image file signature
    is_png = image_data.startswith(b"\x89PNG\r\n\x1a\n")
    is_jpeg = image_data.startswith(b"\xff\xd8\xff")

    if not (is_png or is_jpeg):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a valid PNG or JPEG image.",
        )

    # Match extension with actual image type
    if is_png and original_extension != ".png":
        raise HTTPException(
            status_code=400,
            detail="Image extension does not match its file type.",
        )

    if is_jpeg and original_extension not in {".jpg", ".jpeg"}:
        raise HTTPException(
            status_code=400,
            detail="Image extension does not match its file type.",
        )

    # Generate a unique filename
    filename = f"{uuid4().hex}{original_extension}"

    file_path = QUESTION_UPLOAD_DIR / filename

    # Save image
    try:
        file_path.write_bytes(image_data)
    except OSError:
        raise HTTPException(
            status_code=500,
            detail="Unable to save question image.",
        )

    # Return saved image URL
    return {
        "message": "Question image uploaded successfully.",
        "image_url": f"/uploads/questions/{filename}",
        "filename": filename,
    }
