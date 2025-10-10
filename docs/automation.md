# Automation Services Overview

The Koronadal City Library System ships with a set of optional background
services that automate recurring operational tasks. Each service is governed by
the settings stored in `server/config/system.json` and can be configured from
the admin interface.

## Auto Backup

- **Purpose:** Creates MySQL backups on the configured schedule.
- **Settings:**
  - `auto_backup_enabled`: Turn the service on or off (default: `false`).
  - `auto_backup_time`: Daily run time in 24-hour format (default: `02:00`).
  - `auto_backup_days`: Days of the week when the service runs.

## Auto Return

- **Purpose:** Automatically marks borrowed items as returned once the due date
  passes and updates inventory accordingly.
- **Settings:**
  - `auto_return_enabled`: Enabled implicitly. Uses the global borrow settings
    and runs continuously every minute.

## Auto Overdue Notifications

- **Purpose:** Detects all approved borrow transactions that are past their due
  date and sends a reminder via the notification subsystem.
- **Settings:**
  - `auto_overdue_enabled`: Enable/disable the scheduler (default: `true`).
  - `auto_overdue_time`: Time of day when the scan executes (default: `08:00`).
  - `auto_overdue_days`: Days of the week when the reminders are sent
    (default: every day).

### How it Works

1. When the Flask app starts, the `auto_overdue` service spins up in the
   background.
2. On each scheduled run, it queries the borrow records with
   `transaction_status = 'Approved'` that have not been returned and are due on
   or before the current date.
3. Each matching record triggers `notify_overdue`, ensuring borrowers receive a
   reminder for overdue items.

The service is resilient against partial configuration updates: invalid values
are sanitized and fall back to sensible defaults. Existing deployments will pick
up the feature automatically after updating the settings file or via the admin
console.
