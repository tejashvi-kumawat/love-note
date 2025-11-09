# Deployment Guide

## Backend Deployment on PythonAnywhere

### Step 1: Upload Your Code
1. Upload your `backend` folder to PythonAnywhere
2. Place it in your home directory or a project folder

### Step 2: Set Up Virtual Environment
```bash
cd ~/backend
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 3: Configure Settings
1. Update `ALLOWED_HOSTS` in `settings.py`:
```python
ALLOWED_HOSTS = ['lovenotes.pythonanywhere.com']
```

2. Set `DEBUG = False` for production

3. Update CORS settings (already done):
```python
CORS_ALLOWED_ORIGINS = [
    "https://love-note-gilt.vercel.app",
    "http://localhost:5173",  # For local testing
]
```

### Step 4: Run Migrations
```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

### Step 5: Configure Web App
1. Go to Web tab in PythonAnywhere dashboard
2. Set source code path: `/home/lovenotes/love-note/backend`
3. Set working directory: `/home/lovenotes/love-note/backend`
4. Set WSGI file: `/var/www/lovenotes_pythonanywhere_com_wsgi.py`
5. Edit WSGI file to point to your Django app

### Step 6: Update WSGI File
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

## Frontend Deployment on Vercel

### Step 1: Environment Variables
In Vercel dashboard, add:
```
VITE_API_BASE_URL=https://lovenotes.pythonanywhere.com
```

### Step 2: Deploy
Connect your GitHub repository and deploy.

## Important Notes

1. **CORS**: Backend CORS is configured to allow requests from `https://love-note-gilt.vercel.app`
2. **API URL**: Frontend uses `VITE_API_BASE_URL` environment variable
3. **Database**: Make sure to set up a proper database (MySQL/PostgreSQL) on PythonAnywhere for production
4. **Static Files**: Run `collectstatic` before deploying
5. **Secret Key**: Change `SECRET_KEY` in production settings

