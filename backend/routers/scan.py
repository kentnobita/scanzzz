import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from database import get_db
from models import Slip, SlipItem, ApiLog
from schemas import ScanRequest, ScanResponse
from services.auth_service import get_current_user_id
from services.ocr_service import process_ocr_with_gemini
from services.storage_service import upload_base64_to_r2

router = APIRouter(prefix="/api/scan", tags=["OCR Scan"])

@router.post("", response_model=ScanResponse)
async def scan_slip(
    request: ScanRequest,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db),
):
    """
    Receives image/PDF base64, runs Gemini 3.6 Flash OCR,
    optionally uploads to Cloudflare R2, and saves records to Neon DB.
    """
    start_time = time.time()
    
    try:
        # 1. OCR with Gemini
        ocr_result = await process_ocr_with_gemini(
            image_base64=request.image_base64,
            mime_type=request.mime_type,
            selected_columns=request.selected_columns,
            custom_prompts=request.custom_field_prompts,
        )

        duration_ms = round((time.time() - start_time) * 1000, 2)
        so_phieu = ocr_result.get("soPhieu", "")
        items = ocr_result.get("items", [])

        # 2. Upload to Cloudflare R2 if requested
        image_url = None
        if request.upload_to_r2:
            image_url = await upload_base64_to_r2(
                image_base64=request.image_base64,
                mime_type=request.mime_type,
                user_id=user_id,
            )

        # 3. Save to Neon DB if connected
        slip_id = None
        if db and request.save_to_db:
            slip = Slip(
                user_id=user_id,
                so_phieu=so_phieu,
                image_url=image_url,
                mime_type=request.mime_type,
                engine_used="gemini-3.6-flash",
                columns_json=request.selected_columns,
            )
            db.add(slip)
            await db.flush()
            slip_id = slip.id

            # Add items
            for idx, item in enumerate(items):
                slip_item = SlipItem(
                    slip_id=slip.id,
                    stt=idx + 1,
                    ten_hang=item.get("ten"),
                    so_os_po=item.get("soOSPO"),
                    don_vi_tinh=item.get("donViTinh"),
                    sl_chung_tu=item.get("soLuongChungTu"),
                    sl_thuc_nhap=item.get("soLuongThucNhap"),
                    so_pallet=item.get("soPallet"),
                    ghi_chu=item.get("ghiChu"),
                )
                db.add(slip_item)

            # Log API attempt
            log = ApiLog(
                user_id=user_id if user_id != "guest_user" else None,
                endpoint="/api/scan",
                engine="gemini-3.6-flash",
                status="success",
                duration_ms=duration_ms,
            )
            db.add(log)
            await db.commit()

        return ScanResponse(
            success=True,
            so_phieu=so_phieu,
            items=items,
            engine_used="gemini-3.6-flash",
            image_url=image_url,
            slip_id=slip_id,
            duration_ms=duration_ms,
            message="Trích xuất dữ liệu thành công.",
        )

    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        if db:
            log = ApiLog(
                user_id=user_id if user_id != "guest_user" else None,
                endpoint="/api/scan",
                engine="gemini-3.6-flash",
                status="error",
                duration_ms=duration_ms,
                error_message=str(e),
            )
            db.add(log)
            await db.commit()
            
        raise HTTPException(status_code=500, detail=str(e))
