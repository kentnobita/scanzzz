import os
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Scan Pro Max Backend API"
    ENVIRONMENT: str = "production"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://scanzzz.vercel.app,https://*.vercel.app"

    # Gemini AI OCR Settings
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"

    # Neon PostgreSQL Database Settings
    DATABASE_URL: Optional[str] = None

    # Cloudflare R2 Object Storage Settings
    CLOUDFLARE_R2_ACCOUNT_ID: Optional[str] = None
    CLOUDFLARE_R2_ACCESS_KEY_ID: Optional[str] = None
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: Optional[str] = None
    CLOUDFLARE_R2_BUCKET_NAME: str = "scan-phieu"
    CLOUDFLARE_R2_PUBLIC_DOMAIN: Optional[str] = None

    # Clerk Auth Settings
    CLERK_SECRET_KEY: Optional[str] = None
    CLERK_ISSUER: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def async_database_url(self) -> Optional[str]:
        if not self.DATABASE_URL:
            return None
        # Convert postgresql:// or postgres:// to postgresql+asyncpg://
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        # Strip sslmode query param if needed for asyncpg
        if "sslmode=require" in url:
            url = url.replace("?sslmode=require", "").replace("&sslmode=require", "")
        return url

settings = Settings()
