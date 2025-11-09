# Fix Virtual Environment Issue

The problem is that packages are installing to system Python instead of virtual environment.

## Solution: Recreate Virtual Environment with Python 3.10

Run these commands in PythonAnywhere Bash console:

```bash
# Step 1: Navigate to backend directory
cd ~/love-note/backend

# Step 2: Remove old virtual environment
rm -rf venv

# Step 3: Create new virtual environment with Python 3.10 (IMPORTANT!)
python3.10 -m venv venv

# Step 4: Activate virtual environment
source venv/bin/activate

# Step 5: Verify Python version (should show Python 3.10)
python --version

# Step 6: Upgrade pip (this will install in venv now)
pip install --upgrade pip

# Step 7: Install dependencies (will install in venv)
pip install -r requirements.txt

# Step 8: Verify Django is installed in venv
python -c "import django; print(django.get_version())"

# Step 9: Now run migrations
python manage.py migrate
```

## Why This Happened

The virtual environment was created with Python 3.13, but PythonAnywhere uses Python 3.10. Also, the venv's site-packages wasn't writeable, so pip defaulted to user installation.

## After Fixing

Once the venv is recreated with Python 3.10, all commands will work properly!

