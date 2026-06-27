"""
In-app chatbot endpoint — accessible to every authenticated role.

POST /api/v1/chat/message
  Body: { "message": str, "history": [{"role": "user"|"assistant", "content": str}] }
  Returns: { "reply": str, "ai_powered": bool }

The system prompt is enriched with live org context (open alerts,
supplier count, graph node count) so the AI can give specific answers
without exposing raw data to the model.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.core.database import get_db, AlertEvent, User
from app.models.rbac import require_role, Role
from app.services.graph import graph_service
from app.services.ai_service import ai_service
from app.services.notifications.email import send_chatbot_digest_email

router = APIRouter()


class ChatMessageItem(BaseModel):
    role: str      # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessageItem] = []


class ChatResponse(BaseModel):
    reply: str
    ai_powered: bool


@router.post("/message", response_model=ChatResponse)
def chat_message(
    request: ChatRequest,
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
    db: Session = Depends(get_db),
):
    """
    Multi-turn conversational AI endpoint for the in-app chatbot.
    Works for all roles; each response is scoped to the user's organisation.
    """
    org_id = current_user.get("org_id", "")
    role = current_user.get("role", "user")
    full_name = current_user.get("full_name", "User")

    # Gather live org context for the system prompt
    open_alerts = 0
    supplier_count = 0
    node_count = 0
    try:
        open_alerts = (
            db.query(AlertEvent)
            .filter(AlertEvent.org_id == org_id, AlertEvent.status == "open")
            .count()
        )
        supplier_count = len(graph_service.get_suppliers(org_id))
        node_count = len(graph_service.get_graph_data(org_id).get("nodes", []))
    except Exception:
        pass

    system_prompt = (
        "You are SupplyVision AI, an intelligent supply chain risk assistant "
        "for Indian SMEs in textiles, auto parts, and pharma sectors.\n\n"
        f"Current user: {full_name} (role: {role})\n"
        f"Organisation context:\n"
        f"  - {supplier_count} supplier(s) configured in the digital twin\n"
        f"  - {open_alerts} open disruption alert(s) requiring attention\n"
        f"  - {node_count} total supply chain nodes (suppliers, warehouses, routes)\n\n"
        "Guidelines:\n"
        "- Be concise: 2-3 sentences per response unless the user asks for detail.\n"
        "- Use rupees (INR / ₹) for all financial figures.\n"
        "- Reference real dashboard pages: Alert Center, Simulation Lab, Suppliers, Digital Twin.\n"
        "- For warehouse_staff role, focus only on stock and warehouse topics.\n"
        "- Never make up specific rupee values or supplier names not given to you.\n"
        "- If a question is outside supply chain, politely redirect to the dashboard."
    )

    # Build message list (last 12 exchanges to stay within context)
    messages = [
        {"role": m.role, "content": m.content}
        for m in request.history[-12:]
    ]
    messages.append({"role": "user", "content": request.message})

    reply = ai_service.chat_completion(system_prompt, messages)

    # If the user asked for an email digest, trigger it automatically
    trigger_words = ["email me", "send me", "mail me", "send report", "email report", "send this"]
    if any(t in request.message.lower() for t in trigger_words):
        try:
            user_row = db.query(User).filter(User.id == current_user.get("user_id")).first()
            if user_row:
                history_text = " | ".join(
                    f"{m.role}: {m.content[:80]}" for m in request.history[-6:]
                )
                send_chatbot_digest_email(
                    to_address=user_row.email,
                    user_name=full_name,
                    conversation_summary=history_text or request.message,
                    key_insights=[
                        f"{open_alerts} open alert(s) in your supply chain",
                        f"{supplier_count} supplier(s) monitored in the digital twin",
                        "Reply 'approve 1' on WhatsApp to activate the top recovery plan",
                    ],
                )
        except Exception:
            pass  # Non-fatal — chat still works

    return ChatResponse(reply=reply, ai_powered=ai_service.available)
