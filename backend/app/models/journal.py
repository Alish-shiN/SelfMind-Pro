from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.core.encryption import EncryptedJSON, EncryptedText


class JournalEntry(TimestampMixin, Base):
    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    title: Mapped[str] = mapped_column(EncryptedText(), nullable=False)
    content: Mapped[str] = mapped_column(EncryptedText(), nullable=False)
    mood_score: Mapped[int] = mapped_column(Integer, nullable=False)
    tags: Mapped[list[str] | None] = mapped_column(EncryptedJSON(), nullable=True)
    is_private: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    push_notification_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notification_title: Mapped[str | None] = mapped_column(EncryptedText(), nullable=True)
    notification_time: Mapped[str | None] = mapped_column(String(5), nullable=True)

    user = relationship("User", back_populates="journal_entries")
    analysis = relationship(
        "JournalAnalysis",
        back_populates="journal_entry",
        uselist=False,
        cascade="all, delete-orphan",
    )
