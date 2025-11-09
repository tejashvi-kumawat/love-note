#!/bin/bash

# PythonAnywhere Backend Deployment Script
# Username: lovenotes
# Python Version: 3.10 (Choose this in Web app configuration)

echo "=========================================="
echo "PythonAnywhere Backend Deployment"
echo "=========================================="
echo ""

# Step 1: Navigate to home directory
echo "Step 1: Navigating to home directory..."
cd ~
pwd

# Step 2: Clone repository (if not already cloned)
echo ""
echo "Step 2: Cloning repository..."
if [ ! -d "love-note" ]; then
    git clone https://github.com/tejashvi-kumawat/love-note.git
    echo "Repository cloned successfully!"
else
    echo "Repository already exists. Updating..."
    cd love-note
    git pull
    cd ~
fi

# Step 3: Navigate to backend directory
echo ""
echo "Step 3: Navigating to backend directory..."
cd ~/love-note/backend
pwd

# Step 4: Create virtual environment
echo ""
echo "Step 4: Creating virtual environment with Python 3.10..."
python3.10 -m venv venv
echo "Virtual environment created!"

# Step 5: Activate virtual environment
echo ""
echo "Step 5: Activating virtual environment..."
source venv/bin/activate
echo "Virtual environment activated!"

# Step 6: Upgrade pip
echo ""
echo "Step 6: Upgrading pip..."
pip install --upgrade pip

# Step 7: Install dependencies
echo ""
echo "Step 7: Installing dependencies..."
pip install -r requirements.txt
echo "Dependencies installed!"

# Step 8: Update settings.py for production
echo ""
echo "Step 8: Updating settings.py for production..."
# Create a backup
cp notetaker/settings.py notetaker/settings.py.backup

# Update DEBUG to False
sed -i "s/DEBUG = os.environ.get('DEBUG', 'True') == 'True'/DEBUG = False/" notetaker/settings.py

# Update ALLOWED_HOSTS (already set in code, but ensure it's correct)
echo "Settings updated!"

# Step 9: Run migrations
echo ""
echo "Step 9: Running database migrations..."
python manage.py migrate
echo "Migrations completed!"

# Step 10: Collect static files
echo ""
echo "Step 10: Collecting static files..."
python manage.py collectstatic --noinput
echo "Static files collected!"

# Step 11: Create superuser (optional - will prompt)
echo ""
echo "Step 11: Creating superuser (optional)..."
echo "Do you want to create a superuser? (y/n)"
read -r create_superuser
if [ "$create_superuser" = "y" ]; then
    python manage.py createsuperuser
fi

# Step 12: Check Django setup
echo ""
echo "Step 12: Checking Django setup..."
python manage.py check
echo "Django check completed!"

echo ""
echo "=========================================="
echo "Backend deployment completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to PythonAnywhere Web tab"
echo "2. Create/Edit web app"
echo "3. Choose Python 3.10"
echo "4. Set source code: /home/lovenotes/love-note/backend"
echo "5. Set working directory: /home/lovenotes/love-note/backend"
echo "6. Edit WSGI file with the configuration"
echo "7. Click Reload"
echo ""
echo "WSGI Configuration:"
echo "-------------------"
echo "import os"
echo "import sys"
echo ""
echo "path = '/home/lovenotes/love-note/backend'"
echo "if path not in sys.path:"
echo "    sys.path.insert(0, path)"
echo ""
echo "os.environ['DJANGO_SETTINGS_MODULE'] = 'notetaker.settings'"
echo ""
echo "from django.core.wsgi import get_wsgi_application"
echo "application = get_wsgi_application()"
echo ""

