from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, journal, analytics, analysis, dashboard

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(journal.router)
api_router.include_router(analytics.router)
api_router.include_router(analysis.router)
api_router.include_router(dashboard.router)