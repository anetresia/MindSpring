
import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()


def send_otp_email(receiver_email: str, otp: str):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    expiry_minutes = int(
        os.getenv("OTP_EXPIRE_MINUTES", "1")
    )

    if not smtp_email or not smtp_password:
        raise RuntimeError(
            "SMTP email configuration is missing."
        )

    message = EmailMessage()

    message["Subject"] = "MindSpring - Email Verification OTP"
    message["From"] = smtp_email
    message["To"] = receiver_email

    message.set_content(
        f"""
Hello!

Welcome to MindSpring.

Your email verification OTP is:

{otp}

This OTP is valid for {expiry_minutes} minute.

Please do not share this code with anyone.

If you did not request this code, please ignore this email.

Regards,
MindSpring Team
"""
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        server.starttls()
        server.login(smtp_email, smtp_password)
        server.send_message(message)

