from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import init_db
from routers import scan, slips, storage

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB schema in Neon PostgreSQL if configured
    try:
        await init_db()
        print("[Database] Initialized tables successfully or skipped if unconfigured.")
    except Exception as e:
        print(f"[Database] Warning during startup table creation: {e}")
    yield
    # Shutdown: Cleanup if needed

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API phục vụ OCR Gemini Vision, Neon PostgreSQL DB và Cloudflare R2 Storage",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(scan.router)
app.include_router(slips.router)
app.include_router(storage.router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "database_configured": bool(settings.DATABASE_URL),
        "r2_configured": bool(settings.CLOUDFLARE_R2_ACCOUNT_ID),
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "clerk_configured": bool(settings.CLERK_ISSUER or settings.CLERK_SECRET_KEY),
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Scan Pro Max Backend API is running",
        "docs": "/docs",
        "health": "/health",
    }
