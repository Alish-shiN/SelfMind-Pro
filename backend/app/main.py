from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from pathlib import Path

from app.api.v1.api import api_router
from app.core.database import SessionLocal
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials="*" not in settings.BACKEND_CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

BACKEND_ROOT = Path(__file__).resolve().parents[1]
UPLOADS_DIR = BACKEND_ROOT / "uploads"
(UPLOADS_DIR / "avatars").mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "community").mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/")
def root():
    return {"message": "SelfMind Pro API is running"}


@app.get("/health", status_code=status.HTTP_200_OK)
def health():
    return {"status": "ok"}


@app.get("/health/db", status_code=status.HTTP_200_OK)
def database_health():
    try:
        with SessionLocal() as db:
            db.execute(text("select 1"))
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "error", "database": "unavailable"},
        )

    return {"status": "okay", "database": "available"}
