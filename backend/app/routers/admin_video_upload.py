
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
    Depends,
)

from app.routers.auth import get_current_admin


router = APIRouter(
    prefix="/admin/videos",
    tags=["Admin Video Upload"],
)


# ==========================================
# VIDEO UPLOAD DIRECTORY
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent

VIDEO_DIR = BASE_DIR / "uploads" / "videos"

VIDEO_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ==========================================
# VIDEO SETTINGS
# ==========================================

MAX_FILE_SIZE = 200 * 1024 * 1024  # 200 MB
CHUNK_SIZE = 1024 * 1024  # 1 MB


# ==========================================
# UPLOAD MP4 VIDEO
# ==========================================

@router.post("/upload", status_code=201)
async def upload_video(
    file: UploadFile = File(...),
    current_admin=Depends(get_current_admin),
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No video file selected",
        )

    extension = Path(file.filename).suffix.lower()

    if extension != ".mp4":
        raise HTTPException(
            status_code=400,
            detail="Only MP4 videos are allowed",
        )

    filename = f"{uuid.uuid4().hex}.mp4"
    file_path = VIDEO_DIR / filename

    total_size = 0
    first_chunk = True

    try:
        with file_path.open("wb") as buffer:

            while True:
                chunk = await file.read(CHUNK_SIZE)

                if not chunk:
                    break

                # Check MP4 file signature (ftyp box)
                if first_chunk:
                    first_chunk = False

                    if len(chunk) < 8 or chunk[4:8] != b"ftyp":
                        raise HTTPException(
                            status_code=400,
                            detail="Invalid MP4 video file",
                        )

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Video size must be below 200 MB",
                    )

                buffer.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded video is empty",
            )

    except Exception:
        if file_path.exists():
            file_path.unlink()
        raise

    finally:
        await file.close()

    return {
        "message": "Video uploaded successfully",
        "filename": filename,
        "video_url": f"/uploads/videos/{filename}",
    }
