"""
AWS S3 Service - Handles file uploads and downloads
"""
import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import uuid
import logging
from typing import Optional, BinaryIO, Dict, Any

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        self.bucket_name = os.getenv("AWS_S3_BUCKET_NAME")
        
        # Check if credentials are configured and not placeholder values
        self.is_configured = all([
            self.aws_access_key_id,
            self.aws_secret_access_key,
            self.bucket_name
        ]) and all([
            self.aws_access_key_id != "your_aws_access_key_id",
            self.aws_secret_access_key != "your_aws_secret_access_key",
            self.bucket_name != "your-bucket-name"
        ])
        
        self.s3_client = None
        
        if self.is_configured:
            try:
                # Initialize S3 client
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.aws_access_key_id,
                    aws_secret_access_key=self.aws_secret_access_key,
                    region_name=self.aws_region
                )
                
                # Test the connection by listing buckets (this will fail if credentials are invalid)
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                logger.info("✅ AWS S3 client initialized and bucket accessible")
                
            except NoCredentialsError:
                logger.warning("⚠️ AWS credentials not found")
                self.is_configured = False
                self.s3_client = None
            except ClientError as e:
                error_code = e.response['Error']['Code']
                if error_code == '403':
                    logger.warning("⚠️ AWS S3 access denied - check your credentials and permissions")
                elif error_code == '404':
                    logger.warning(f"⚠️ AWS S3 bucket '{self.bucket_name}' not found")
                else:
                    logger.warning(f"⚠️ AWS S3 error: {e}")
                self.is_configured = False
                self.s3_client = None
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize S3 client: {e}")
                self.is_configured = False
                self.s3_client = None
        else:
            logger.info("ℹ️ AWS S3 not configured - file upload features disabled")
    
    def upload_file(self, 
                   file_obj: BinaryIO, 
                   filename: Optional[str] = None,
                   content_type: Optional[str] = None,
                   folder: str = "uploads") -> Dict[str, Any]:
        """
        Upload a file to S3 bucket
        
        Args:
            file_obj: File object to upload
            filename: Optional filename (will generate if not provided)
            content_type: Optional content type (MIME type)
            folder: Folder path within bucket
            
        Returns:
            Dict with file URL and key
        """
        try:
            if not self.is_configured or not self.s3_client:
                logger.error("❌ AWS S3 not configured")
                return {
                    "success": False,
                    "error": "AWS S3 not configured. Please set up your AWS credentials in the environment variables.",
                    "url": None,
                    "key": None
                }
            
            # Generate unique filename if not provided
            if not filename:
                ext = ""
                if hasattr(file_obj, 'filename'):
                    _, ext = os.path.splitext(file_obj.filename)
                
                filename = f"{uuid.uuid4()}{ext}"
            
            # Create full S3 key with folder
            s3_key = f"{folder}/{filename}"
            
            # Set extra args for upload
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            # Upload file
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            # Generate public URL
            url = f"https://{self.bucket_name}.s3.{self.aws_region}.amazonaws.com/{s3_key}"
            
            logger.info(f"✅ File uploaded to S3: {s3_key}")
            
            return {
                "success": True,
                "url": url,
                "key": s3_key
            }
            
        except Exception as e:
            logger.error(f"❌ S3 upload error: {e}")
            return {
                "success": False,
                "error": str(e),
                "url": None,
                "key": None
            }
    
    def download_file(self, s3_key: str, local_path: str) -> bool:
        """
        Download a file from S3 bucket
        
        Args:
            s3_key: S3 object key
            local_path: Local file path to save
            
        Returns:
            Boolean indicating success
        """
        try:
            if not self.is_configured or not self.s3_client:
                logger.error("❌ AWS S3 not configured")
                return False
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            # Download file
            self.s3_client.download_file(
                self.bucket_name,
                s3_key,
                local_path
            )
            
            logger.info(f"✅ File downloaded from S3: {s3_key} to {local_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ S3 download error: {e}")
            return False
    
    def get_presigned_url(self, s3_key: str, expiration: int = 3600) -> Optional[str]:
        """
        Generate a presigned URL for an S3 object
        
        Args:
            s3_key: S3 object key
            expiration: URL expiration time in seconds
            
        Returns:
            Presigned URL or None if error
        """
        try:
            if not self.is_configured or not self.s3_client:
                logger.error("❌ AWS S3 not configured")
                return None
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiration
            )
            
            return url
            
        except Exception as e:
            logger.error(f"❌ S3 presigned URL error: {e}")
            return None
    
    def delete_file(self, s3_key: str) -> bool:
        """
        Delete a file from S3 bucket
        
        Args:
            s3_key: S3 object key
            
        Returns:
            Boolean indicating success
        """
        try:
            if not self.is_configured or not self.s3_client:
                logger.error("❌ AWS S3 not configured")
                return False
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            logger.info(f"✅ File deleted from S3: {s3_key}")
            return True
            
        except Exception as e:
            logger.error(f"❌ S3 delete error: {e}")
            return False

# Global service instance
s3_service = S3Service()