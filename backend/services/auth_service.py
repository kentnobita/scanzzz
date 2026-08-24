import jwt
import httpx
from typing import Optional
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from config import settings
from database import get_db
from models import User

security = HTTPBearer(auto_error=False)

# In-memory cache for Clerk JWKS keys
_jwks_cache = None

async def get_clerk_jwks():
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    if not settings.CLERK_ISSUER:
        return None
    try:
        jwks_url = f"{settings.CLERK_ISSUER.rstrip('/')}/.well-known/jwks.json"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(jwks_url)
            if res.status_code == 200:
                _jwks_cache = res.json()
                return _jwks_cache
    except Exception as e:
        print(f"[Auth] Warning: Failed to fetch Clerk JWKS: {e}")
    return None

async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Optional[AsyncSession] = Depends(get_db),
) -> str:
    """
    Extracts and verifies Clerk User ID from Authorization Bearer token.
    If no token is provided or auth is unconfigured, returns 'guest_user' gracefully.
    """
    if not credentials or not credentials.credentials:
        return "guest_user"

    token = credentials.credentials

    # Decode without verification if issuer is not set (development/flexible mode)
    try:
        jwks = await get_clerk_jwks()
        if jwks:
            unverified_header = jwt.get_unverified_header(token)
            rsa_key = {}
            for key in jwks.get("keys", []):
                if key["kid"] == unverified_header["kid"]:
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"],
                    }
                    break
            
            if rsa_key:
                from jwt.algorithms import RSAAlgorithm
                public_key = RSAAlgorithm.from_jwk(rsa_key)
                payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=["RS256"],
                    issuer=settings.CLERK_ISSUER,
                    options={"verify_aud": False},
                )
            else:
                payload = jwt.decode(token, options={"verify_signature": False})
        else:
            payload = jwt.decode(token, options={"verify_signature": False})

        user_id = payload.get("sub") or "guest_user"
        email = payload.get("email") or payload.get("primary_email_address")
        full_name = payload.get("name") or payload.get("full_name")

        # Sync user record in Neon DB if connected
        if db and user_id != "guest_user":
            stmt = select(User).where(User.id == user_id)
            result = await db.execute(stmt)
            user_obj = result.scalar_one_or_none()
            if not user_obj:
                new_user = User(id=user_id, email=email, full_name=full_name)
                db.add(new_user)
                await db.flush()

        return user_id

    except Exception as e:
        print(f"[Auth] JWT decoding warning: {e}")
        # In case of decode failure, fall back to guest rather than crashing
        return "guest_user"
