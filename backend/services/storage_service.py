import base64
import uuid
import boto3
from botocore.config import Config
from typing import Optional, Dict, Any
from config import settings

_s3_client = None

def get_r2_client():
    global _s3_client
    if _s3_client:
        return _s3_client
    if not (settings.CLOUDFLARE_R2_ACCOUNT_ID and settings.CLOUDFLARE_R2_ACCESS_KEY_ID and settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY):
        return None

    endpoint_url = f"https://{settings.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    _s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.CLOUDFLARE_R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    return _s3_client

async def upload_base64_to_r2(
    image_base64: str,
    mime_type: str = "image/jpeg",
    user_id: str = "guest_user",
    prefix: str = "slips",
) -> Optional[str]:
    """
    Decodes base64 file data and uploads directly to Cloudflare R2 Bucket.
    Returns the public or direct object URL.
    """
    client = get_r2_client()
    if not client:
        return None

    try:
        file_bytes = base64.b64decode(image_base64)
        ext = "pdf" if "pdf" in mime_type else "png" if "png" in mime_type else "jpg"
        file_key = f"{prefix}/{user_id}/{uuid.uuid4().hex[:16]}.{ext}"

        client.put_object(
            Bucket=settings.CLOUDFLARE_R2_BUCKET_NAME,
            Key=file_key,
            Body=file_bytes,
            ContentType=mime_type,
        )

        if settings.CLOUDFLARE_R2_PUBLIC_DOMAIN:
            domain = settings.CLOUDFLARE_R2_PUBLIC_DOMAIN.rstrip("/")
            return f"{domain}/{file_key}"
        else:
            # Fallback presigned GET url valid for 7 days
            return client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.CLOUDFLARE_R2_BUCKET_NAME, "Key": file_key},
                ExpiresIn=604800,
            )
    except Exception as e:
        print(f"[Storage] Warning: Failed to upload to Cloudflare R2: {e}")
        return None

def generate_presigned_upload_url(
    file_name: str,
    mime_type: str,
    user_id: str = "guest_user",
) -> Optional[Dict[str, str]]:
    """Generates a Presigned PUT URL for client-side direct upload to R2."""
    client = get_r2_client()
    if not client:
        return None

    try:
        file_key = f"uploads/{user_id}/{uuid.uuid4().hex[:12]}_{file_name}"
        upload_url = client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.CLOUDFLARE_R2_BUCKET_NAME,
                "Key": file_key,
                "ContentType": mime_type,
            },
            ExpiresIn=3600,
        )
        
        public_url = ""
        if settings.CLOUDFLARE_R2_PUBLIC_DOMAIN:
            public_url = f"{settings.CLOUDFLARE_R2_PUBLIC_DOMAIN.rstrip('/')}/{file_key}"

        return {
            "upload_url": upload_url,
            "public_url": public_url,
            "file_key": file_key,
        }
    except Exception as e:
        print(f"[Storage] Error generating presigned upload url: {e}")
        return None
