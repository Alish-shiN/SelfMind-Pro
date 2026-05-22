from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class DirectConversation(TimestampMixin, Base):
    __tablename__ = "direct_conversations"
    __table_args__ = (UniqueConstraint("user_a_id", "user_b_id", name="uq_direct_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_a_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    user_b_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
