# Mailer Configuration Guide

The backend uses [Flask-Mail](https://pythonhosted.org/Flask-Mail/) to deliver account notifications and password-reset codes. Configure the environment variables listed below (see `server/.env.example` for a ready-made template).

## Required settings

| Variable | Description |
| --- | --- |
| `MAIL_SERVER` | SMTP hostname or IP address. |
| `MAIL_PORT` | Connection port. Use `587` for TLS or `465` for implicit SSL. |
| `MAIL_USERNAME` | SMTP account username/email. |
| `MAIL_PASSWORD` | SMTP password or app-specific password. |
| `MAIL_DEFAULT_SENDER` | Default *From* header (e.g., `"Koronadal City Library <no-reply@koronadal-library.site>"`). |
| `APP_BASE_URL` | Public URL of the frontend (used to build password reset links). |

## Optional settings

| Variable | Default | Description |
| --- | --- | --- |
| `MAIL_USE_TLS` | `true` | Enable STARTTLS. Disable if your provider requires SSL on port 465. |
| `MAIL_USE_SSL` | `false` | Enable only when using implicit SSL (mutually exclusive with TLS). |
| `MAIL_SUPPRESS_SEND` | `false` | Set to `true` in development to log emails without sending. |
| `MAIL_MAX_EMAILS` | *(unset)* | Limit how many emails can be sent in a single connection. |
| `MAIL_ASCII_ATTACHMENTS` | `false` | Force ASCII encoding for attachments, if required by the server. |

## Setup steps

1. Copy `server/.env.example` to `server/.env`.
2. Fill in your SMTP provider's host, credentials, and default sender.
3. Set `APP_BASE_URL` to your deployed frontend URL (or `http://localhost:5173` during local development).
4. Restart the Flask server so the new environment variables are loaded.

When `MAIL_SUPPRESS_SEND=true`, the mailer logs attempts but does not hand them to the SMTP server. This is useful for local testing without sending real emails.

## Smoke test

Use the helper script `server/mail_smoke_test.py` to verify your SMTP credentials:

```powershell
cd server
python mail_smoke_test.py --to your.address@example.com
```

Set the recipient once via an environment variable if you prefer:

```powershell
$env:MAIL_SMOKE_RECIPIENT = "your.address@example.com"
python mail_smoke_test.py
```

The script loads the Flask app configuration, attempts to send a single email, and reports whether it was queued successfully. Check your inbox (or SMTP provider dashboard) to confirm delivery.
