from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import FirebaseLoginRequest, Token, UserLogin, UserRegister
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.services.firebase_auth_service import FirebaseAuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    return AuthService(db).register(payload)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    return AuthService(db).login(payload)

@router.post("/firebase-login", response_model=Token)
def firebase_login(payload: FirebaseLoginRequest, db: Session = Depends(get_db)):
    try:
        claims = FirebaseAuthService().verify_id_token(payload.id_token)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase token")

    email = str(claims.get("email") or "").strip().lower()
    verified = bool(claims.get("email_verified"))
    uid = str(claims.get("uid") or claims.get("user_id") or "").strip()
    username = str(payload.username or claims.get("name") or "").strip() or None
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firebase token has no email")
    if not verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email is not verified")
    if not uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firebase token has no uid")

    return AuthService(db).firebase_login(
        email=email,
        firebase_uid=uid,
        email_verified=verified,
        username=username,
    )
