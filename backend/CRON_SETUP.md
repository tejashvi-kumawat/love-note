# Journal Reminder Cron Job Setup

## Overview
The journal reminder system uses a backend cron job to send push notifications at the scheduled time, even when the app is closed.

## Setup on PythonAnywhere

### 1. Open PythonAnywhere Console
- Go to Dashboard → Consoles tab
- Click "Bash console"

### 2. Set up Cron Job
Run this command to edit crontab:
```bash
crontab -e
```

### 3. Add Cron Job Entry
Add this line to run the command every minute:
```bash
* * * * * cd /home/lovenotes/love-note/backend && /home/lovenotes/love-note/backend/venv/bin/python manage.py send_journal_reminders >> /home/lovenotes/logs/user/journal_reminders.log 2>&1
```

**Note:** Replace `/home/lovenotes` with your actual PythonAnywhere username if different.

### 4. Verify Cron Job
Check if cron job is running:
```bash
crontab -l
```

### 5. Test the Command Manually
Test the command to make sure it works:
```bash
cd ~/love-note/backend
source venv/bin/activate
python manage.py send_journal_reminders
```

### 6. Check Logs
View the reminder logs:
```bash
tail -f ~/logs/user/journal_reminders.log
```

## How It Works

1. **Every minute**, the cron job runs `send_journal_reminders` command
2. The command checks all users who have:
   - `notifications_enabled = True`
   - `notify_journal_reminder = True`
   - `journal_reminder_time` matches current time (within 1 minute)
3. For matching users, it sends push notifications to all their registered devices
4. Works even when the app is closed (uses Web Push API)

## Frontend Fallback

The frontend also schedules reminders when the app is open:
- Works when app is active
- Reschedules when app comes back into focus
- This is a fallback - backend cron is the primary method

## Troubleshooting

### Reminders not working?
1. Check if cron job is running: `crontab -l`
2. Check logs: `tail -f ~/logs/user/journal_reminders.log`
3. Verify user has:
   - Notifications enabled in profile
   - Journal reminder enabled
   - Push subscription exists (check database)
4. Test command manually: `python manage.py send_journal_reminders`

### Check user's reminder time
```python
python manage.py shell
>>> from api.models import UserProfile
>>> profile = UserProfile.objects.get(user__username='USERNAME')
>>> print(f"Reminder enabled: {profile.notify_journal_reminder}")
>>> print(f"Reminder time: {profile.journal_reminder_time}")
```

