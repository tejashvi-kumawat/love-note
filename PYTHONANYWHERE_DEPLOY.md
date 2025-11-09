# PythonAnywhere Deployment Commands

## Step-by-Step Deployment Guide

### 1. Upload Your Code

**Option A: Using Git (Recommended)**
```bash
# SSH into PythonAnywhere
cd ~
git clone https://github.com/tejashvi-kumawat/love-note.git
cd love-note/backend
```

**Option B: Using Files Tab**
- Go to Files tab in PythonAnywhere dashboard
- Upload your `backend` folder to `~/backend`

### 2. Set Up Virtual Environment

```bash
cd ~/love-note/backend
# Or if uploaded directly: cd ~/backend

# Create virtual environment (PythonAnywhere uses Python 3.10)
python3.10 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Settings

```bash
# Edit settings.py
nano notetaker/settings.py
```

**Update these settings:**
```python
# Change DEBUG to False
DEBUG = False

# Update ALLOWED_HOSTS (already set to lovenotes.pythonanywhere.com)
ALLOWED_HOSTS = ['lovenotes.pythonanywhere.com']

# CORS is already configured for Vercel frontend
# CORS_ALLOWED_ORIGINS already includes: "https://love-note-gilt.vercel.app"
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### 4. Run Migrations

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Run migrations
python manage.py migrate

# Create superuser (optional, for admin access)
python manage.py createsuperuser
```

### 5. Collect Static Files

```bash
# Collect static files
python manage.py collectstatic --noinput
```

### 6. Configure Web App

1. Go to **Web** tab in PythonAnywhere dashboard
2. Click **Add a new web app**
3. Choose **Manual configuration**
4. Select **Python 3.10**
5. Click **Next** and **Next** again

### 7. Configure Web App Settings

In the Web tab, set:

**Source code:**
```
/home/lovenotes/love-note/backend
```
(Or `/home/lovenotes/backend` if you uploaded directly)

**Working directory:**
```
/home/lovenotes/love-note/backend
```
(Or `/home/lovenotes/backend` if you uploaded directly)

### 8. Edit WSGI File

Click on **WSGI configuration file** link and replace the content with:

```python
import os
import sys

# Add your project directory to the Python path
path = '/home/lovenotes/love-note/backend'
# Or if uploaded directly: path = '/home/lovenotes/backend'

if path not in sys.path:
    sys.path.insert(0, path)

# Set the Django settings module
os.environ['DJANGO_SETTINGS_MODULE'] = 'notetaker.settings'

# Import Django's WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

### 9. Set Environment Variables (Optional but Recommended)

In the Web tab, under **Environment variables**, add:
```
DEBUG=False
ALLOWED_HOSTS=lovenotes.pythonanywhere.com
SECRET_KEY=your-secret-key-here
```

### 10. Reload Web App

Click the green **Reload** button in the Web tab.

### 11. Test Your API

Visit: `https://lovenotes.pythonanywhere.com/api/`

You should see Django REST Framework interface or API response.

### 12. Update Frontend API URL

In Vercel dashboard, update environment variable:
```
VITE_API_BASE_URL=https://lovenotes.pythonanywhere.com
```

## Troubleshooting Commands

### Check Logs
```bash
# Error log
tail -n 50 ~/logs/lovenotes.pythonanywhere.com.error.log

# Server log
tail -n 50 ~/logs/lovenotes.pythonanywhere.com.server.log
```

### Test Django Setup
```bash
cd ~/love-note/backend
source venv/bin/activate
python manage.py check
python manage.py runserver 0.0.0.0:8000
```

### Check Static Files
```bash
ls -la ~/love-note/backend/staticfiles/
```

### Restart Web App
- Go to Web tab
- Click **Reload** button

## Important Notes

1. **Free Tier Limitations:**
   - Web app sleeps after inactivity
   - Limited CPU time
   - Database: SQLite (included) or MySQL (limited)

2. **Database:**
   - SQLite works fine for development
   - For production, consider MySQL (free tier available)

3. **Static Files:**
   - Make sure `collectstatic` ran successfully
   - Static files should be in `staticfiles/` directory

4. **CORS:**
   - Already configured for `https://love-note-gilt.vercel.app`
   - No changes needed unless frontend URL changes

5. **Security:**
   - Change `SECRET_KEY` in production
   - Set `DEBUG = False`
   - Use environment variables for sensitive data

## Quick Command Reference

```bash
# Navigate to project
cd ~/love-note/backend

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create superuser
python manage.py createsuperuser

# Check Django setup
python manage.py check

# View logs
tail -f ~/logs/lovenotes.pythonanywhere.com.error.log
```

