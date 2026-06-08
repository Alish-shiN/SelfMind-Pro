import json
import logging
from pathlib import Path

from app.core.config import settings

try:
    import firebase_admin
    from firebase_admin import auth, credentials
except Exception:
    firebase_admin = None
    auth = None
    credentials = None

logger = logging.getLogger(__name__)


class FirebaseAuthService:
    def __init__(self) -> None:
        self.project_id = settings.FIREBASE_PROJECT_ID

    def _initialize(self) -> None:
        if firebase_admin is None:
            raise RuntimeError("firebase-admin is not installed")

        if firebase_admin._apps:
            return

        cred_json = settings.FIREBASE_CREDENTIALS_JSON
        cred_path = settings.FIREBASE_CREDENTIALS_PATH

        if cred_json:
            try:
                cert_payload = json.loads(cred_json)
            except json.JSONDecodeError as exc:
                raise RuntimeError("FIREBASE_CREDENTIALS_JSON is not valid JSON") from exc
            cred = credentials.Certificate(cert_payload)
        elif cred_path:
            path = Path(cred_path)
            if not path.is_absolute():
                path = Path.cwd() / path
            path = path.resolve()
            if not path.exists():
                raise RuntimeError(f"Firebase credentials file does not exist: {path}")
            cred = credentials.Certificate(str(path))
        else:
            raise RuntimeError(
                "Firebase credentials are not configured. Set FIREBASE_CREDENTIALS_JSON or FIREBASE_CREDENTIALS_PATH"
            )

        options = {"projectId": self.project_id} if self.project_id else None
        firebase_admin.initialize_app(cred, options)

    def verify_id_token(self, id_token: str) -> dict:
        if not id_token:
            raise ValueError("Firebase ID token is empty")

        self._initialize()
        try:
            return auth.verify_id_token(id_token)
        except Exception as exc:
            logger.exception(
                "Firebase token verification failed (%s): %s",
                exc.__class__.__name__,
                str(exc),
            )
            raise