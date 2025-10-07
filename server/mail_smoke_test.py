"""Quick smoke test for the SMTP configuration.

Usage:
    python mail_smoke_test.py --to someone@example.com

You can also set MAIL_SMOKE_RECIPIENT in the environment and omit --to.
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime

from app import create_app
from app.services.mailer import send_email


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send a one-off mailer smoke test email.")
    parser.add_argument(
        "--to",
        dest="recipient",
        default=os.getenv("MAIL_SMOKE_RECIPIENT"),
        help="Recipient email address. Defaults to the MAIL_SMOKE_RECIPIENT environment variable.",
    )
    parser.add_argument(
        "--subject",
        default="Koronadal City Library mail smoke test",
        help="Subject line for the test email.",
    )
    parser.add_argument(
        "--body",
        default=None,
        help="Optional custom message body. If omitted, a timestamped default is used.",
    )
    parser.add_argument(
        "--sender",
        default=None,
        help="Override the configured MAIL_DEFAULT_SENDER.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.recipient:
        print("ERROR: Provide --to or set MAIL_SMOKE_RECIPIENT.", file=sys.stderr)
        return 1

    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%SZ")
    body = args.body or (
        "Hello,\n\n"
        "This is a Koronadal City Library mail smoke test triggered at {timestamp}.\n"
        "If you are reading this, SMTP is configured correctly.\n\n"
        "Regards,\nKoronadal City Library System"
    ).format(timestamp=timestamp)

    app = create_app()
    with app.app_context():
        success = send_email(
            subject=args.subject,
            recipients=[args.recipient],
            body=body,
            sender=args.sender,
        )

    if success:
        print(f"Mail queued successfully for {args.recipient}.")
        return 0
    else:
        print("ERROR: Failed to queue mail. Check SMTP settings and server logs.", file=sys.stderr)
        return 2


if __name__ == "__main__":  # pragma: no cover - manual utility
    raise SystemExit(main())
