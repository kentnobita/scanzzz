from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from database import get_db
from models import Slip, SlipItem
from schemas import SlipResponse, SlipCreate, SlipUpdate
from services.auth_service import get_current_user_id

router = APIRouter(prefix="/api/slips", tags=["Slips History"])

@router.get("", response_model=List[SlipResponse])
async def list_slips(
    limit: int = 50,
    offset: int = 0,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db),
):
    """Lists recent slips for the current authenticated user from Neon DB."""
    if not db:
        return []

    stmt = (
        select(Slip)
        .where(Slip.user_id == user_id)
        .options(selectinload(Slip.items))
        .order_by(desc(Slip.created_at))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    slips = result.scalars().all()
    return slips

@router.get("/{slip_id}", response_model=SlipResponse)
async def get_slip_detail(
    slip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db),
):
    """Retrieves a single slip with all items."""
    if not db:
        raise HTTPException(status_code=503, detail="Database is not connected")

    stmt = select(Slip).where(Slip.id == slip_id, Slip.user_id == user_id).options(selectinload(Slip.items))
    result = await db.execute(stmt)
    slip = result.scalar_one_or_none()
    if not slip:
        raise HTTPException(status_code=404, detail="Phiếu không tồn tại hoặc không có quyền xem")
    return slip

@router.post("", response_model=SlipResponse, status_code=status.HTTP_201_CREATED)
async def create_slip(
    payload: SlipCreate,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db),
):
    """Manually creates or saves a slip into Neon DB."""
    if not db:
        raise HTTPException(status_code=503, detail="Database is not connected")

    slip = Slip(
        user_id=user_id,
        so_phieu=payload.so_phieu,
        image_url=payload.image_url,
        mime_type=payload.mime_type,
        engine_used=payload.engine_used,
        columns_json=payload.columns,
    )
    db.add(slip)
    await db.flush()

    for idx, item in enumerate(payload.items):
        slip_item = SlipItem(
            slip_id=slip.id,
            stt=idx + 1,
            ten_hang=item.get("ten") or item.get("ten_hang"),
            so_os_po=item.get("soOSPO") or item.get("so_os_po"),
            don_vi_tinh=item.get("donViTinh") or item.get("don_vi_tinh"),
            sl_chung_tu=item.get("soLuongChungTu") or item.get("sl_chung_tu"),
            sl_thuc_nhap=item.get("soLuongThucNhap") or item.get("sl_thuc_nhap"),
            so_pallet=item.get("soPallet") or item.get("so_pallet"),
            ghi_chu=item.get("ghiChu") or item.get("ghi_chu"),
        )
        db.add(slip_item)

    await db.commit()
    
    # Reload with items
    stmt = select(Slip).where(Slip.id == slip.id).options(selectinload(Slip.items))
    res = await db.execute(stmt)
    return res.scalar_one()

@router.put("/{slip_id}", response_model=SlipResponse)
async def update_slip(
    slip_id: str,
    payload: SlipUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db),
):
    """Updates slip details and item list in Neon DB."""
    if not db:
        raise HTTPException(status_code=503, detail="Database is not connected")

    stmt = select(Slip).where(Slip.id == slip_id, Slip.user_id == user_id).options(selectinload(Slip.items))
    result = await db.execute(stmt)
    slip = result.scalar_one_or_none()
    if not slip:
        raise HTTPException(status_code=404, detail="Phiếu không tồn tại")

    if payload.so_phieu is not None:
        slip.so_phieu = payload.so_phieu
    if payload.columns is not None:
        slip.columns_json = payload.columns

    if payload.items is not None:
        # Remove old items
        for old_item in slip.items:
            await db.delete(old_item)
        await db.flush()

        # Add updated items
        for idx, item in enumerate(payload.items):
            slip_item = SlipItem(
                slip_id=slip.id,
                stt=idx + 1,
                ten_hang=item.get("ten") or item.get("ten_hang"),
                so_os_po=item.get("soOSPO") or item.get("so_os_po"),
                don_vi_tinh=item.get("donViTinh") or item.get("don_vi_tinh"),
                sl_chung_tu=item.get("soLuongChungTu") or item.get("sl_chung_tu"),
                sl_thuc_nhap=item.get("soLuongThucNhap") or item.get("sl_thuc_nhap"),
                so_pallet=item.get("soPallet") or item.get("so_pallet"),
                ghi_chu=item.get("ghiChu") or item.get("ghi_chu"),
            )
            db.add(slip_item)

    await db.commit()
    
    # Reload
    stmt = select(Slip).where(Slip.id == slip.id).options(selectinload(Slip.items))
    res = await db.execute(stmt)
    return res.scalar_one()

@router.delete("/{slip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_slip(
    slip_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Optional[AsyncSession] = Depends(get_db),
):
    """Deletes a slip and all its items from Neon DB."""
    if not db:
        raise HTTPException(status_code=503, detail="Database is not connected")

    stmt = select(Slip).where(Slip.id == slip_id, Slip.user_id == user_id)
    result = await db.execute(stmt)
    slip = result.scalar_one_or_none()
    if not slip:
        raise HTTPException(status_code=404, detail="Phiếu không tồn tại")

    await db.delete(slip)
    await db.commit()
    return None
