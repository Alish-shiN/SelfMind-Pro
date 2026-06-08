import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.config import settings

ENCRYPTED_PREFIX = "enc:v1:"


def _fernet() -> Fernet:
    secret = settings.DATA_ENCRYPTION_KEY or settings.SECRET_KEY
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())
    return Fernet(key)


def encrypt_text(value: str | None) -> str | None:
    if value is None or value.startswith(ENCRYPTED_PREFIX):
        return value
    token = _fernet().encrypt(value.encode("utf-8")).decode("ascii")
    return f"{ENCRYPTED_PREFIX}{token}"


def decrypt_text(value: str | None) -> str | None:
    if value is None or not value.startswith(ENCRYPTED_PREFIX):
        return value
    try:
        token = value[len(ENCRYPTED_PREFIX) :].encode("ascii")
        return _fernet().decrypt(token).decode("utf-8")
    except (InvalidToken, UnicodeDecodeError, ValueError):
        raise ValueError("Unable to decrypt protected data. Check DATA_ENCRYPTION_KEY.")


class EncryptedText(TypeDecorator):
    """Encrypts values before persistence while preserving normal ORM usage."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt_text(value)

    def process_result_value(self, value, dialect):
        return decrypt_text(value)


class EncryptedJSON(TypeDecorator):
    """Stores JSON structures as encrypted text."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_text(json.dumps(value, separators=(",", ":"), ensure_ascii=False))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return json.loads(decrypt_text(value))
