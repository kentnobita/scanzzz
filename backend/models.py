import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(128), primary_key=True)  # Clerk User ID (e.g. user_2xyz...)
    email = Column(String(255), nullable=True, index=True)
    full_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    slips = relationship("Slip", back_populates="user", cascade="all, delete-orphan")
    api_logs = relationship("ApiLog", back_populates="user", cascade="all, delete-orphan")


class Slip(Base):
    __tablename__ = "slips"

    id = Column(String(64), primary_key=True, default=lambda: f"slip_{uuid.uuid4().hex[:12]}")
    user_id = Column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    so_phieu = Column(String(128), nullable=True, index=True)
    image_url = Column(Text, nullable=True)  # Cloudflare R2 URL
    mime_type = Column(String(64), default="image/jpeg")
    engine_used = Column(String(64), default="gemini-3.6-flash")
    columns_json = Column(JSON, nullable=True)  # List of active columns
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="slips")
    items = relationship("SlipItem", back_populates="slip", cascade="all, delete-orphan", order_by="SlipItem.stt")


class SlipItem(Base):
    __tablename__ = "slip_items"

    id = Column(String(64), primary_key=True, default=lambda: f"item_{uuid.uuid4().hex[:12]}")
    slip_id = Column(String(64), ForeignKey("slips.id", ondelete="CASCADE"), nullable=False, index=True)
    stt = Column(Integer, default=1)
    
    # 7 standard fields
    ten_hang = Column(Text, nullable=True)
    so_os_po = Column(String(128), nullable=True)
    don_vi_tinh = Column(String(64), nullable=True)
    sl_chung_tu = Column(String(64), nullable=True)
    sl_thuc_nhap = Column(String(64), nullable=True)
    so_pallet = Column(String(64), nullable=True)
    ghi_chu = Column(Text, nullable=True)

    slip = relationship("Slip", back_populates="items")


class ApiLog(Base):
    __tablename__ = "api_logs"

    id = Column(String(64), primary_key=True, default=lambda: f"log_{uuid.uuid4().hex[:12]}")
    user_id = Column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    endpoint = Column(String(128), nullable=False)
    engine = Column(String(64), default="gemini-3.6-flash")
    status = Column(String(32), default="success")  # success, limit, error
    duration_ms = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="api_logs")
