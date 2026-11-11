from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# OCR Item Schema
class ExtractedItem(BaseModel):
    ten: Optional[str] = Field(None, description="Tên / mã sản phẩm")
    soOSPO: Optional[str] = Field(None, description="Số O.S/PO")
    donViTinh: Optional[str] = Field(None, description="Đơn vị tính")
    soLuongChungTu: Optional[str] = Field(None, description="Số lượng theo chứng từ")
    soLuongThucNhap: Optional[str] = Field(None, description="Số lượng thực nhập")
    soPallet: Optional[str] = Field(None, description="Số Pallet")
    ghiChu: Optional[str] = Field(None, description="Ghi chú")

    class Config:
        populate_by_name = True

# OCR Scan Request
class ScanRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded string of the image or PDF")
    mime_type: str = Field("image/jpeg", description="MIME type (image/jpeg, image/png, application/pdf)")
    selected_columns: Optional[List[str]] = Field(default_factory=lambda: ["ten", "soOSPO", "donViTinh", "soLuongChungTu", "soLuongThucNhap", "soPallet", "ghiChu"])
    custom_field_prompts: Optional[Dict[str, str]] = None
    save_to_db: bool = Field(True, description="Whether to automatically save extracted slip to database")
    upload_to_r2: bool = Field(True, description="Whether to save the image/PDF file to Cloudflare R2")

# OCR Scan Response
class ScanResponse(BaseModel):
    success: bool
    so_phieu: Optional[str] = ""
    items: List[Dict[str, Any]] = []
    engine_used: str = "gemini-3.6-flash"
    image_url: Optional[str] = None
    slip_id: Optional[str] = None
    duration_ms: float = 0.0
    message: Optional[str] = None

# Slip Item DTOs
class SlipItemBase(BaseModel):
    stt: int = 1
    ten_hang: Optional[str] = None
    so_os_po: Optional[str] = None
    don_vi_tinh: Optional[str] = None
    sl_chung_tu: Optional[str] = None
    sl_thuc_nhap: Optional[str] = None
    so_pallet: Optional[str] = None
    ghi_chu: Optional[str] = None

class SlipItemResponse(SlipItemBase):
    id: str
    slip_id: str

    class Config:
        from_attributes = True

# Slip DTOs
class SlipCreate(BaseModel):
    so_phieu: Optional[str] = None
    image_url: Optional[str] = None
    mime_type: str = "image/jpeg"
    engine_used: str = "gemini-3.6-flash"
    columns: Optional[List[str]] = None
    items: List[Dict[str, Any]] = []

class SlipUpdate(BaseModel):
    so_phieu: Optional[str] = None
    columns: Optional[List[str]] = None
    items: Optional[List[Dict[str, Any]]] = None

class SlipResponse(BaseModel):
    id: str
    user_id: str
    so_phieu: Optional[str] = None
    image_url: Optional[str] = None
    mime_type: str
    engine_used: str
    columns_json: Optional[List[str]] = None
    items: List[SlipItemResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# User DTOs
class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Storage DTOs
class PresignedUrlResponse(BaseModel):
    upload_url: str
    public_url: str
    file_key: str
