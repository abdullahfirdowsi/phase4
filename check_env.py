"""
Environment Configuration Checker
"""
import os
from dotenv import load_dotenv

def check_environment():
    """Check environment configuration"""
    load_dotenv()
    
    print("🔍 Checking environment configuration...\n")
    
    # Required variables
    required_vars = {
        "MONGO_URI": "MongoDB connection string",
        "API_KEY": "Groq API key for AI model",
        "JWT_SECRET": "JWT secret for authentication"
    }
    
    # Optional variables
    optional_vars = {
        "AWS_ACCESS_KEY_ID": "AWS access key for S3",
        "AWS_SECRET_ACCESS_KEY": "AWS secret key for S3", 
        "AWS_S3_BUCKET_NAME": "S3 bucket name",
        "AWS_REGION": "AWS region (defaults to us-east-1)"
    }
    
    print("📋 Required Configuration:")
    all_required_ok = True
    
    for var, description in required_vars.items():
        value = os.getenv(var)
        if not value or value.startswith("your_"):
            print(f"   ❌ {var}: Missing or placeholder value")
            print(f"      Description: {description}")
            all_required_ok = False
        else:
            # Mask sensitive values
            if "SECRET" in var or "KEY" in var:
                masked_value = value[:8] + "..." if len(value) > 8 else "***"
                print(f"   ✅ {var}: {masked_value}")
            else:
                print(f"   ✅ {var}: {value}")
    
    print("\n📋 Optional Configuration (AWS S3):")
    s3_configured = True
    
    for var, description in optional_vars.items():
        value = os.getenv(var)
        if not value or value.startswith("your_"):
            print(f"   ⚠️ {var}: Not configured")
            if var != "AWS_REGION":  # AWS_REGION has a default
                s3_configured = False
        else:
            # Mask sensitive values
            if "SECRET" in var or "KEY" in var:
                masked_value = value[:8] + "..." if len(value) > 8 else "***"
                print(f"   ✅ {var}: {masked_value}")
            else:
                print(f"   ✅ {var}: {value}")
    
    print("\n📊 Summary:")
    if all_required_ok:
        print("   ✅ All required configuration is present")
        print("   ✅ Server can start successfully")
    else:
        print("   ❌ Missing required configuration")
        print("   ❌ Server will fail to start")
    
    if s3_configured:
        print("   ✅ AWS S3 is configured - file upload features enabled")
    else:
        print("   ⚠️ AWS S3 not configured - file upload features disabled")
    
    print("\n💡 Next Steps:")
    if not all_required_ok:
        print("   1. Copy .env.example to .env")
        print("   2. Fill in the required values in .env")
        print("   3. Run this check again")
    else:
        print("   1. Run: python start_server.py")
        print("   2. Visit: http://localhost:8000")
    
    if not s3_configured:
        print("   3. (Optional) Configure AWS S3 for file uploads")
    
    return all_required_ok

if __name__ == "__main__":
    check_environment()