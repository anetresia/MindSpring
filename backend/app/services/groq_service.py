
import os

from dotenv import load_dotenv
from groq import Groq
from fastapi import HTTPException

# LOAD ENVIRONMENT VARIABLES
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Please check backend .env file."
    )

# GROQ CLIENT
client = Groq(api_key=GROQ_API_KEY)


# VOICE TO TEXT
def transcribe_child_voice(
    audio_file,
    filename="child-answer.webm",
    content_type="audio/webm",
):
    """
    Transcribe child's Tamil or English speech.
    Preserve the original spoken language.
    """

    try:
        audio_file.seek(0)
        audio_bytes = audio_file.read()

        if not audio_bytes:
            raise ValueError("Uploaded audio file is empty.")

        normalized_content_type = (
            content_type or "audio/webm"
        ).split(";")[0].strip().lower()

        if not filename:
            filename = "child-answer.webm"

        print("Audio filename:", filename)
        print("Audio content type:", normalized_content_type)
        print("Audio size:", len(audio_bytes), "bytes")

        transcription = client.audio.transcriptions.create(
            file=(
                filename,
                audio_bytes,
                normalized_content_type,
            ),
            model="whisper-large-v3",
            response_format="text",
            temperature=0.0,
            prompt=(
                "The speaker may speak Tamil, English, "
                "or a mixture of Tamil and English. "
                "Transcribe exactly what the child says "
                "in the original spoken language. "
                "Do not translate the speech. "
                "Do not change the language."
            ),
        )

        transcript = (
            transcription.strip()
            if isinstance(transcription, str)
            else str(transcription).strip()
        )

        print("Detected transcription:", transcript)

        return transcript

    except HTTPException:
        raise

    except Exception as error:
        print("Groq transcription error:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to convert voice into text. Please try again.",
        )
