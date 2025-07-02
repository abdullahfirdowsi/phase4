"""
Enhanced Server Startup Script
Automatically handles virtual environment creation, activation, and dependency installation
"""
import os
import sys
import subprocess
import platform
from pathlib import Path
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
VENV_NAME = "venv"
REQUIREMENTS_FILE = "requirements.txt"
PROJECT_ROOT = Path(__file__).parent
VENV_PATH = PROJECT_ROOT / VENV_NAME
IS_WINDOWS = platform.system() == "Windows"
PYTHON_EXE = "python" if IS_WINDOWS else "python3"

def run_command(command, shell=True, capture_output=False):
    """Run a command and return the result"""
    try:
        logger.info(f"🔧 Running: {command}")
        result = subprocess.run(
            command, 
            shell=shell, 
            capture_output=capture_output, 
            text=True,
            cwd=PROJECT_ROOT
        )
        return result
    except Exception as e:
        logger.error(f"❌ Command failed: {e}")
        return None

def check_python_installation():
    """Check if Python is installed and accessible"""
    try:
        result = subprocess.run([PYTHON_EXE, "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            python_version = result.stdout.strip()
            logger.info(f"✅ Found {python_version}")
            return True
        else:
            logger.error("❌ Python not found in PATH")
            return False
    except FileNotFoundError:
        logger.error("❌ Python not found. Please install Python 3.8+ and add it to PATH")
        return False

def check_venv_exists():
    """Check if virtual environment exists"""
    if IS_WINDOWS:
        python_exe = VENV_PATH / "Scripts" / "python.exe"
        pip_exe = VENV_PATH / "Scripts" / "pip.exe"
    else:
        python_exe = VENV_PATH / "bin" / "python"
        pip_exe = VENV_PATH / "bin" / "pip"
    
    exists = python_exe.exists() and pip_exe.exists()
    if exists:
        logger.info(f"✅ Virtual environment found at {VENV_PATH}")
    else:
        logger.info(f"📁 Virtual environment not found at {VENV_PATH}")
    
    return exists

def create_virtual_environment():
    """Create a new virtual environment"""
    logger.info(f"🏗️ Creating virtual environment at {VENV_PATH}...")
    
    # Remove existing venv if it exists but is broken
    if VENV_PATH.exists():
        logger.info("🗑️ Removing existing broken virtual environment...")
        import shutil
        shutil.rmtree(VENV_PATH)
    
    # Create new virtual environment
    result = run_command([PYTHON_EXE, "-m", "venv", str(VENV_PATH)])
    
    if result and result.returncode == 0:
        logger.info("✅ Virtual environment created successfully")
        return True
    else:
        logger.error("❌ Failed to create virtual environment")
        return False

def get_venv_python():
    """Get the path to the Python executable in the virtual environment"""
    if IS_WINDOWS:
        return VENV_PATH / "Scripts" / "python.exe"
    else:
        return VENV_PATH / "bin" / "python"

def get_venv_pip():
    """Get the path to the pip executable in the virtual environment"""
    if IS_WINDOWS:
        return VENV_PATH / "Scripts" / "pip.exe"
    else:
        return VENV_PATH / "bin" / "pip"

def install_requirements():
    """Install requirements in the virtual environment"""
    requirements_path = PROJECT_ROOT / REQUIREMENTS_FILE
    
    if not requirements_path.exists():
        logger.warning(f"⚠️ {REQUIREMENTS_FILE} not found, skipping dependency installation")
        return True
    
    logger.info(f"📦 Installing dependencies from {REQUIREMENTS_FILE}...")
    
    pip_exe = get_venv_pip()
    result = run_command([str(pip_exe), "install", "-r", str(requirements_path)])
    
    if result and result.returncode == 0:
        logger.info("✅ Dependencies installed successfully")
        return True
    else:
        logger.error("❌ Failed to install dependencies")
        return False

def check_dependencies():
    """Check if critical dependencies are installed"""
    logger.info("🔍 Checking critical dependencies...")
    
    critical_packages = ["fastapi", "uvicorn", "pymongo", "groq"]
    pip_exe = get_venv_pip()
    
    missing_packages = []
    
    for package in critical_packages:
        result = run_command([str(pip_exe), "show", package], capture_output=True)
        if not result or result.returncode != 0:
            missing_packages.append(package)
    
    if missing_packages:
        logger.warning(f"⚠️ Missing packages: {', '.join(missing_packages)}")
        return False
    else:
        logger.info("✅ All critical dependencies are installed")
        return True

def setup_virtual_environment():
    """Set up virtual environment with all dependencies"""
    logger.info("🔧 Setting up virtual environment...")
    
    # Check if Python is installed
    if not check_python_installation():
        return False
    
    # Check if venv exists
    if not check_venv_exists():
        # Create virtual environment
        if not create_virtual_environment():
            return False
    
    # Check dependencies
    if not check_dependencies():
        logger.info("📦 Installing missing dependencies...")
        if not install_requirements():
            return False
    
    logger.info("✅ Virtual environment setup complete")
    return True

def activate_virtual_environment():
    """Activate virtual environment by modifying sys.path"""
    if IS_WINDOWS:
        site_packages = VENV_PATH / "Lib" / "site-packages"
        scripts_path = VENV_PATH / "Scripts"
    else:
        site_packages = VENV_PATH / "lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages"
        scripts_path = VENV_PATH / "bin"
    
    # Add virtual environment to Python path
    if str(site_packages) not in sys.path:
        sys.path.insert(0, str(site_packages))
    
    # Update PATH environment variable
    current_path = os.environ.get("PATH", "")
    if str(scripts_path) not in current_path:
        os.environ["PATH"] = str(scripts_path) + os.pathsep + current_path
    
    logger.info(f"✅ Virtual environment activated: {VENV_PATH}")

def start_server_in_venv():
    """Start the server using the virtual environment Python"""
    python_exe = get_venv_python()
    
    # Start uvicorn server using the virtual environment Python
    command = [
        str(python_exe), "-m", "uvicorn", 
        "main:app", 
        "--host", "0.0.0.0", 
        "--port", "8000", 
        "--reload",
        "--log-level", "info"
    ]
    
    logger.info("🚀 Starting FastAPI server...")
    try:
        subprocess.run(command, cwd=PROJECT_ROOT)
    except KeyboardInterrupt:
        logger.info("\n🛑 Server stopped by user")
    except Exception as e:
        logger.error(f"\n❌ Server startup failed: {e}")

def check_critical_environment():
    """Check only critical environment variables"""
    load_dotenv()
    
    # Only check the most critical variables
    critical_vars = ["MONGO_URI", "API_KEY"]
    missing_vars = []
    
    for var in critical_vars:
        value = os.getenv(var)
        if not value or value.startswith("your_"):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error("❌ Missing critical environment variables:")
        for var in missing_vars:
            logger.error(f"   - {var}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Starting AI Tutor Backend...")
    print("\n🔧 Setting up virtual environment...")
    
    # Setup virtual environment
    if not setup_virtual_environment():
        print("\n❌ Failed to setup virtual environment")
        exit(1)
    
    # Quick check for critical environment variables only
    if not check_critical_environment():
        print("\n❌ Server startup aborted due to missing critical configuration")
        print("   Copy .env.example to .env and fill in the required values")
        exit(1)
    
    # Start server using virtual environment
    start_server_in_venv()
