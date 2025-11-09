# Quick PythonAnywhere Deployment Guide

## Python Version to Choose: **Python 3.10**

PythonAnywhere free tier uses **Python 3.10**, so choose this when creating your web app.

---

## Complete Bash Commands (Copy-Paste Ready)

### Step 1: Navigate and Clone Repository

```bash
cd ~
git clone https://github.com/tejashvi-kumawat/love-note.git
cd love-note/backend
```

### Step 2: Create Virtual Environment

```bash
python3.10 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Update Settings for Production

```bash
# Edit settings.py
nano notetaker/settings.py
```

**Change these lines:**
- Line 20: `DEBUG = False` (change from `True`)
- Line 22: Already set to `lovenotes.pythonanywhere.com` ✓

**Save:** `Ctrl+X`, then `Y`, then `Enter`

### Step 5: Run Migrations

```bash
python manage.py migrate
```

### Step 6: Collect Static Files

```bash
python manage.py collectstatic --noinput
```

### Step 7: Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

### Step 8: Verify Setup

```bash
python manage.py check
```

---

## Web App Configuration (PythonAnywhere Dashboard)

### 1. Go to **Web** Tab
### 2. Click **Add a new web app** (or edit existing)
### 3. Choose **Python 3.10** ⭐ (Important!)
### 4. Choose **Manual configuration**
### 5. Click **Next** → **Next**

### 6. Configure Settings:

**Source code:**
```
/home/lovenotes/love-note/backend
```

**Working directory:**
```
/home/lovenotes/love-note/backend
```

### 7. Edit WSGI File

Click on **WSGI configuration file** link and **replace all content** with:

```python
import os
import sys

path = '/home/lovenotes/love-note/backend'
if path not in sys.path:
    sys.path.insert(0, path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'notetaker.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

**Save** the WSGI file.

### 8. Set Environment Variables (Optional but Recommended)

In Web tab, scroll to **Environment variables** section, add:

```
DEBUG=False
ALLOWED_HOSTS=lovenotes.pythonanywhere.com
```

### 9. Reload Web App

Click the green **Reload** button.

### 10. Test Your API

Visit: `https://lovenotes.pythonanywhere.com/api/`

You should see Django REST Framework interface.

---

## Troubleshooting Commands

### Check Error Logs
```bash
tail -n 50 ~/logs/lovenotes.pythonanywhere.com.error.log
```

### Check Server Logs
```bash
tail -n 50 ~/logs/lovenotes.pythonanywhere.com.server.log
```

### Test Django Setup
```bash
cd ~/love-note/backend
source venv/bin/activate
python manage.py check
```

### View Real-time Logs
```bash
tail -f ~/logs/lovenotes.pythonanywhere.com.error.log
```

### Restart Web App
- Go to Web tab → Click **Reload** button

---

## One-Line Quick Deploy (If you want to run everything at once)

```bash
cd ~ && git clone https://github.com/tejashvi-kumawat/love-note.git && cd love-note/backend && python3.10 -m venv venv && source venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput && echo "Deployment complete! Now configure Web app in dashboard."
```

---

## Important Notes

1. **Python Version**: Always choose **Python 3.10** in Web app configuration
2. **DEBUG**: Must be `False` in production
3. **ALLOWED_HOSTS**: Already set to `lovenotes.pythonanywhere.com`
4. **CORS**: Already configured for Vercel frontend
5. **Static Files**: Must run `collectstatic` before deploying
6. **Reload**: Always reload web app after making changes

---

## After Deployment

1. Update Vercel environment variable:
   ```
   VITE_API_BASE_URL=https://lovenotes.pythonanywhere.com
   ```

2. Test your frontend - it should connect to the backend!

