import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash, verify_password
from app.repo.user_repository import UserRepository
from app.schemas.auth import UserLogin, UserRegister


class AuthService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)

    def register(self, payload: UserRegister):
        email = payload.email.strip().lower()

        if self.user_repo.get_by_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        if self.user_repo.get_by_username(payload.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

        user = self.user_repo.create_user(
            email=email,
            username=payload.username,
            hashed_password=get_password_hash(payload.password),
        )
        return user

    def login(self, payload: UserLogin):
        user = self.user_repo.get_by_email(payload.email.strip().lower())

        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated"
            )

        if not user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email is not verified"
            )

        token = create_access_token(subject=user.id)
        return {"access_token": token, "token_type": "bearer"}


    def firebase_login(
        self,
        email: str,
        firebase_uid: str,
        email_verified: bool,
        username: str | None = None,
    ):
        normalized_email = email.strip().lower()
        normalized_uid = firebase_uid.strip()
        if not normalized_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Firebase token has no email"
            )
        if not normalized_uid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Firebase token has no uid"
            )
        if not email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email is not verified"
            )

        user_by_uid = self.user_repo.get_by_firebase_uid(normalized_uid)
        user_by_email = self.user_repo.get_by_email(normalized_email)

        if user_by_uid and user_by_uid.email != normalized_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Firebase uid is already linked to another email"
            )

        if (
            user_by_email
            and user_by_email.firebase_uid
            and user_by_email.firebase_uid != normalized_uid
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already linked to another Firebase account"
            )

        user = user_by_email or user_by_uid
        if user is None:
            username_candidate = (username or normalized_email.split("@")[0]).strip()[:40] or "user"
            base = username_candidate
            suffix = 1
            while self.user_repo.get_by_username(username_candidate):
                suffix += 1
                username_candidate = f"{base}{suffix}"[:50]
            user = self.user_repo.create_user(
                email=normalized_email,
                username=username_candidate,
                hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated"
            )

        if not user.firebase_uid:
            user.firebase_uid = normalized_uid
        user.email_verified = True
        self.user_repo.db.commit()
        token = create_access_token(subject=user.id)
        return {"access_token": token, "token_type": "bearer"}
