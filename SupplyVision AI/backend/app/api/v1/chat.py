"""
In-app chatbot endpoint — accessible to every authenticated role.

POST /api/v1/chat/message
  Body: { "message": str, "history": [{"role": "user"|"assistant", "content": str}] }
  Returns: { "reply": str, "ai_powered": bool, "ai_provider": str }

The system prompt is enriched with live org context (open alerts, supplier count,
top 3 risky suppliers, graph node count) so the AI can give specific answers.
Special commands:
  - "weather in [city]" / "weather at [city]" → fetches live weather
  - "test email" / "send test email"            → sends SMTP test email to the user
  - "email me" / "send report" / etc.           → sends conversation digest email
"""

import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db, AlertEvent, User
from app.models.rbac import require_role, Role
from app.services.graph import graph_service
from app.services.ai_service import ai_service
from app.services.notifications.email import send_chatbot_digest_email, send_test_email
from app.services.ingestion.weather import fetch_openweather_data

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
    ai_provider: str = "rule-based"


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
    msg_lower = request.message.lower()

    # ── Gather live org context ──────────────────────────────────────────────
    open_alerts = 0
    supplier_count = 0
    node_count = 0
    top_risky_suppliers: list = []
    try:
        open_alerts = (
            db.query(AlertEvent)
            .filter(AlertEvent.org_id == org_id, AlertEvent.status == "open")
            .count()
        )
        all_suppliers = graph_service.get_suppliers(org_id)
        supplier_count = len(all_suppliers)
        node_count = len(graph_service.get_graph_data(org_id).get("nodes", []))
        # Pull top 3 highest-risk suppliers for rich AI context
        sorted_sups = sorted(
            all_suppliers,
            key=lambda s: s.get("current_risk_score", 0),
            reverse=True,
        )[:3]
        top_risky_suppliers = [
            {
                "name": s.get("name") or s.get("code") or s.get("id", "Unknown"),
                "score": s.get("current_risk_score", 0),
                "city": s.get("city", ""),
                "single_source": s.get("is_single_source", False),
            }
            for s in sorted_sups
        ]
    except Exception:
        pass

    # Format top-risk supplier context text
    if top_risky_suppliers:
        sup_lines = "\n".join(
            f"    {i+1}. {s['name']} — risk {s['score']}/100"
            + (f", {s['city']}" if s["city"] else "")
            + (" [single-source ⚠]" if s["single_source"] else "")
            for i, s in enumerate(top_risky_suppliers)
        )
        supplier_context = f"  Top risky suppliers:\n{sup_lines}"
    else:
        supplier_context = f"  {supplier_count} supplier(s) configured"

    # ── Weather command detection ────────────────────────────────────────────
    weather_data: Optional[dict] = None
    weather_match = re.search(
        r"weather\s+(?:in|at|for|near)?\s+([A-Za-z\s]{2,30})",
        request.message,
        re.IGNORECASE,
    )
    if weather_match:
        city = weather_match.group(1).strip().rstrip("?!.,")
        try:
            weather_data = fetch_openweather_data(city)
        except Exception:
            weather_data = None

    # ── Test email command ───────────────────────────────────────────────────
    test_email_triggers = ["test email", "send test email", "check email", "test smtp", "verify email"]
    if any(t in msg_lower for t in test_email_triggers):
        try:
            user_row = db.query(User).filter(User.id == current_user.get("user_id")).first()
            if user_row:
                ok = send_test_email(to_address=user_row.email, user_name=full_name)
                reply = (
                    f"✅ Test email sent to **{user_row.email}**! Check your inbox to confirm SMTP is working.\n\n"
                    f"If you don't receive it within a minute, check your spam folder or verify the SMTP settings in .env."
                ) if ok else (
                    "❌ Test email failed to send. Please check your SMTP_USER and SMTP_PASSWORD in .env and restart the backend."
                )
                return ChatResponse(reply=reply, ai_powered=False, ai_provider="email-service")
        except Exception:
            pass

    # ── Digest email command ─────────────────────────────────────────────────
    digest_triggers = ["email me", "send me", "mail me", "send report", "email report", "send this", "send summary"]
    if any(t in msg_lower for t in digest_triggers):
        try:
            user_row = db.query(User).filter(User.id == current_user.get("user_id")).first()
            if user_row:
                history_text = " | ".join(
                    f"{m.role}: {m.content[:80]}" for m in request.history[-6:]
                )
                insights = [f"{open_alerts} open alert(s) in your supply chain"]
                if top_risky_suppliers:
                    insights.append(
                        f"Highest-risk supplier: {top_risky_suppliers[0]['name']} (score {top_risky_suppliers[0]['score']}/100)"
                    )
                insights.append(f"{supplier_count} supplier(s) monitored in the digital twin")
                insights.append("Reply 'approve 1' on WhatsApp to activate the top recovery plan")
                send_chatbot_digest_email(
                    to_address=user_row.email,
                    user_name=full_name,
                    conversation_summary=history_text or request.message,
                    key_insights=insights,
                )
        except Exception:
            pass

    # ── Build enriched system prompt ─────────────────────────────────────────
    weather_section = ""
    if weather_data and "error" not in weather_data:
        sev = weather_data.get("severity", 1)
        weather_section = (
            f"\n\n[LIVE WEATHER DATA]\n"
            f"  Location: {weather_data.get('location', 'N/A')}\n"
            f"  Conditions: {weather_data.get('weather', 'N/A')}\n"
            f"  Temperature: {weather_data.get('temp', 'N/A')}°C\n"
            f"  Risk Severity: {sev}/5 {'(⚠️ DISRUPTION RISK)' if sev >= 3 else '(LOW RISK)'}\n"
            f"  Data Confidence: {weather_data.get('confidence', 0)}%"
        )

    system_prompt = (
        "You are SupplyVision AI, an expert supply chain risk assistant for Indian SMEs "
        "in textiles, auto parts, and pharma. You are conversational, proactive, and insightful.\n\n"
        f"Current user: {full_name} (role: {role})\n"
        f"Organisation live context:\n"
        f"  - {open_alerts} open disruption alert(s) requiring attention\n"
        f"  - {node_count} total supply chain nodes (suppliers, ports, warehouses, routes)\n"
        f"{supplier_context}"
        f"{weather_section}\n\n"
        "Behaviour guidelines:\n"
        "- Give specific, actionable answers. Reference real dashboard pages when helpful:\n"
        "  Alert Center, Simulation Lab, Suppliers Directory, Digital Twin, ROI Analytics.\n"
        "- Use bullet points and line breaks for multi-step advice.\n"
        "- Use ₹ (INR) for all financial figures.\n"
        "- For weather queries, explain the supply chain impact, not just the weather.\n"
        "- For risk score questions, explain what drives the score (weather, port, dependencies, inventory).\n"
        "- For warehouse_staff role, focus only on stock, warehouse, and inventory topics.\n"
        "- Never invent supplier names or rupee values not given to you.\n"
        "- If asked about a page you know, give a direct navigation hint.\n"
        "- Keep responses focused: 2-4 sentences for simple questions, up to 8 lines for complex ones.\n"
        "- Use ** for bold emphasis on important numbers or actions."
    )

    # Build message list (last 12 exchanges)
    messages = [
        {"role": m.role, "content": m.content}
        for m in request.history[-12:]
    ]
    # Augment user message with weather data if fetched
    user_content = request.message
    if weather_section:
        user_content += f"\n\n[Context: I fetched live weather for you]{weather_section}"
    messages.append({"role": "user", "content": user_content})

    reply = ai_service.chat_completion(system_prompt, messages)

    return ChatResponse(
        reply=reply,
        ai_powered=ai_service.available,
        ai_provider=ai_service.provider,
    )
