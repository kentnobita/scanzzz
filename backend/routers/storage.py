from fastapi import APIRouter, Depends, HTTPException, Query
from schemas import PresignedUrlResponse
from services.auth_service import get_current_user_id
from services.storage_service import generate_presigned_upload_url

router = APIRouter(prefix="/api/storage", tags=["Storage R2"])

@router.post("/presigned-url", response_model=PresignedUrlResponse)
async def get_presigned_url(
    file_name: str = Query(..., description="Tên file gốc"),
    mime_type: str = Query("image/jpeg", description="MIME type"),
    user_id: str = Depends(get_current_user_id),
):
    """Generates a Presigned PUT URL for direct client-to-R2 upload."""
    result = generate_presigned_upload_url(
        file_name=file_name,
        mime_type=mime_type,
        user_id=user_id,
    )
    if not result:
        raise HTTPException(
            status_code=503,
            detail="Cloudflare R2 chưa được cấu hình biến môi trường trên server.",
        )
    return result
