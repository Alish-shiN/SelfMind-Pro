from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.direct_conversation import DirectConversation
from app.models.direct_message import DirectMessage
from app.models.user import User

router = APIRouter(prefix="/dm", tags=["dm"])


class DirectConversationResponse(BaseModel):
    id: int
    other_user_id: int
    other_username: str
    created_at: datetime
    updated_at: datetime


class DirectMessagePayload(BaseModel):
    content: str


class DirectMessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_user_id: int
    content: str
    created_at: datetime


@router.post("/conversations/{target_user_id}", response_model=DirectConversationResponse, status_code=status.HTTP_201_CREATED)
def create_or_get_conversation(target_user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    a, b = sorted([current_user.id, target_user_id])
    conv = db.query(DirectConversation).filter(and_(DirectConversation.user_a_id == a, DirectConversation.user_b_id == b)).first()
    if not conv:
        conv = DirectConversation(user_a_id=a, user_b_id=b)
        db.add(conv)
        db.commit()
        db.refresh(conv)
    return {"id": conv.id, "other_user_id": target.id, "other_username": target.username, "created_at": conv.created_at, "updated_at": conv.updated_at}


@router.get("/conversations", response_model=list[DirectConversationResponse])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = db.query(DirectConversation).filter(or_(DirectConversation.user_a_id == current_user.id, DirectConversation.user_b_id == current_user.id)).order_by(DirectConversation.updated_at.desc()).all()
    out = []
    for conv in rows:
        other_id = conv.user_b_id if conv.user_a_id == current_user.id else conv.user_a_id
        other = db.query(User).filter(User.id == other_id).first()
        out.append({"id": conv.id, "other_user_id": other_id, "other_username": other.username if other else "User", "created_at": conv.created_at, "updated_at": conv.updated_at})
    return out


@router.get("/conversations/{conversation_id}/messages", response_model=list[DirectMessageResponse])
def list_messages(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(DirectConversation).filter(DirectConversation.id == conversation_id).first()
    if not conv or current_user.id not in {conv.user_a_id, conv.user_b_id}:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return db.query(DirectMessage).filter(DirectMessage.conversation_id == conversation_id).order_by(DirectMessage.created_at.asc()).all()


@router.post("/conversations/{conversation_id}/messages", response_model=DirectMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(conversation_id: int, payload: DirectMessagePayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(DirectConversation).filter(DirectConversation.id == conversation_id).first()
    if not conv or current_user.id not in {conv.user_a_id, conv.user_b_id}:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msg = DirectMessage(conversation_id=conversation_id, sender_user_id=current_user.id, content=payload.content.strip())
    db.add(msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    return msg
