from __future__ import annotations

from typing import Iterable, Optional, Tuple, Union

from flask import current_app
from flask_mail import Message

from app.extensions import mail

__all__ = [
    "send_email",
    "send_forgot_password_email",
    "send_account_approved_email",
    "send_account_rejected_email",
]


Recipient = Union[str, Tuple[str, str]]


def _clean_recipients(recipients: Iterable[str | None]) -> list[Recipient]:
    cleaned: list[Recipient] = []
    for addr in recipients or []:
        if not addr:
            continue
        trimmed = addr.strip()
        if trimmed:
            cleaned.append(trimmed)
    return cleaned


def send_email(
    subject: str,
    recipients: Iterable[str | None],
    body: str,
    *,
    html: Optional[str] = None,
    sender: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> bool:
    """Minimal mail sending helper used across the app."""

    recipient_list = _clean_recipients(recipients)
    if not recipient_list:
        return False

    config = current_app.config
    if not config.get("MAIL_SERVER") or config.get("MAIL_SUPPRESS_SEND"):
        return False

    msg = Message(
        subject=subject,
        recipients=recipient_list,
        body=body,
        html=html,
        sender=sender or config.get("MAIL_DEFAULT_SENDER"),
        reply_to=reply_to,
    )

    try:
        mail.send(msg)
    except Exception:  # pragma: no cover - depends on SMTP state
        return False
    return True


def send_forgot_password_email(
    recipient: str,
    code: str,
    *,
    name: Optional[str] = None,
    expires_minutes: int = 30,
    reset_path: str = "/forgot-password/reset",
) -> bool:
    display_name = name or "there"
    subject = "Your Koronadal City Library password reset code"
    base_url = (current_app.config.get("APP_BASE_URL") or "").rstrip("/")
    reset_location = f"{base_url}{reset_path}" if base_url else reset_path
    body = (
        f"Hello {display_name},\n\n"
        "We received a request to reset the password for your Koronadal City Library account.\n"
        "Use the verification code below to continue with the reset.\n\n"
        f"Reset code: {code}\n"
        f"Expires in: ~{expires_minutes} minutes\n"
        f"Reset page: {reset_location}\n\n"
        "If you did not request a reset, you can safely ignore this email or contact support.\n\n"
        "Best regards,\n"
        "Koronadal City Library System"
    )
    return send_email(subject, [recipient], body)


def send_account_approved_email(
    recipient: str,
    *,
    name: Optional[str] = None,
    approved_by: Optional[str] = None,
) -> bool:
    subject = "Your library account has been approved"
    opener = f"Hello {name}," if name else "Hello,"  # Friendly greeting
    approver_line = f"This action was completed by {approved_by}." if approved_by else ""
    body = (
        f"{opener}\n\n"
        "Great news! Your Koronadal City Library account has been approved. "
        "You can now sign in and start exploring our catalog, reserving items, and managing your borrowings online.\n\n"
        f"{approver_line}\n\n"
        "If you have any questions, simply reply to this email.\n\n"
        "Happy reading!\n"
        "Koronadal City Library Team"
    )
    return send_email(subject, [recipient], body)


def send_account_rejected_email(
    recipient: str,
    *,
    name: Optional[str] = None,
    rejected_by: Optional[str] = None,
    reason: Optional[str] = None,
) -> bool:
    subject = "Update on your library account application"
    opener = f"Hello {name}," if name else "Hello,"  # Friendly greeting
    approver_line = (
        f"The decision was made by {rejected_by}.\n\n" if rejected_by else ""
    )
    reason_line = (
        f"Reason provided: {reason}\n\n" if reason else ""
    )
    body = (
        f"{opener}\n\n"
        "Thank you for applying for a Koronadal City Library account. "
        "After reviewing your submission we are not able to approve the account at this time.\n\n"
        f"{approver_line}{reason_line}"
        "You are welcome to reply to this email if you would like more details or to resubmit updated information.\n\n"
        "Kind regards,\n"
        "Koronadal City Library Team"
    )
    return send_email(subject, [recipient], body)
