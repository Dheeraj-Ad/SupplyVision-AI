"""
Two-way WhatsApp command interface — Gap 5
==========================================
Twilio sends a POST to this endpoint whenever a manager replies to a
WhatsApp alert.  The webhook parses the command and executes the matching
recovery action, then returns a TwiML XML response that Twilio delivers
back to the sender automatically.

Supported commands
──────────────────
  help / hi / menu   → List available commands
  status             → Most recent open alert for your organisation
  approve <n>        → Approve recovery option n (1-indexed)
  1 / 2 / 3          → Shorthand for approve <n>
  reject             → Mark the latest open alert as a false positive

Twilio webhook URL to configure
────────────────────────────────
  https://<your-domain>/api/v1/whatsapp/webhook   (method: POST)
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Form, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, Organisation, AlertEvent, RecoveryPlan, AuditLog

router = APIRouter()
logger = logging.getLogger("whatsapp_webhook")


# ── helpers ───────────────────────────────────────────────────────────────────

def _twiml(message: str) -> Response:
    """Wrap plain text in a Twilio TwiML <Response><Message> envelope."""
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f"<Response><Message>{message}</Message></Response>"
    )
    return Response(content=xml, media_type="application/xml")


def _strip_prefix(raw: str) -> str:
    """Remove 'whatsapp:' prefix so numbers can be compared as strings."""
    return raw.replace("whatsapp:", "").strip()


def _find_org(db: Session, sender: str) -> Optional[Organisation]:
    """Return the Organisation whose whatsapp_numbers list contains the sender."""
    normalised = _strip_prefix(sender)
    for org in db.query(Organisation).filter_by(is_active=True).all():
        stored = org.whatsapp_numbers or []
        if any(_strip_prefix(n) == normalised for n in stored):
            return org
    return None


def _latest_open_alert(db: Session, org_id: str) -> Optional[AlertEvent]:
    return (
        db.query(AlertEvent)
        .filter(AlertEvent.org_id == org_id, AlertEvent.status == "open")
        .order_by(AlertEvent.created_at.desc())
        .first()
    )


def _plan_for_alert(db: Session, alert_id: str) -> Optional[RecoveryPlan]:
    return (
        db.query(RecoveryPlan)
        .filter(RecoveryPlan.alert_id == alert_id)
        .order_by(RecoveryPlan.created_at.desc())
        .first()
    )


# ── webhook endpoint ──────────────────────────────────────────────────────────

@router.post("/webhook")
async def whatsapp_inbound(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
):
    """
    Twilio inbound WhatsApp webhook.
    Twilio POSTs form-encoded data: From, To, Body, etc.
    Returns TwiML so Twilio sends the reply automatically.
    """
    command = Body.strip().lower()
    db: Session = SessionLocal()

    try:
        org = _find_org(db, From)
        if org is None:
            return _twiml(
                "SupplyVision AI: Your number is not registered with any organisation. "
                "Please ask your administrator to add it in the dashboard."
            )

        # ── help / greeting ────────────────────────────────────────────────
        if command in ("help", "hi", "hello", "menu", "start"):
            return _twiml(
                f"*SupplyVision AI — Commands*\n\n"
                f"  status          See your latest open alert\n"
                f"  approve 1       Approve recovery option 1\n"
                f"  1 / 2 / 3      Shorthand approve\n"
                f"  reject          Mark alert as false positive\n\n"
                f"Org: {org.name}"
            )

        # ── status ─────────────────────────────────────────────────────────
        if command == "status":
            alert = _latest_open_alert(db, org.id)
            if not alert:
                return _twiml(
                    f"*SupplyVision AI* — No open alerts for {org.name}. "
                    "Your supply chain is currently healthy!"
                )
            plan = _plan_for_alert(db, alert.id)
            opts_lines = ""
            if plan and plan.options_json:
                for i, opt in enumerate(plan.options_json[:3], 1):
                    title = opt.get("title", f"Option {i}")
                    savings = opt.get("expected_savings_inr", 0)
                    days = opt.get("lead_time_days", "?")
                    opts_lines += f"\n  {i}. {title} | ₹{savings:,.0f} | {days}d"
            return _twiml(
                f"*SupplyVision AI — Open Alert*\n\n"
                f"Node: {alert.node_id}\n"
                f"Risk Score: {alert.risk_score}/100\n"
                f"Exposure: ₹{alert.rupees_at_risk:,}\n"
                f"\nRecovery Options:{opts_lines or ' None available yet.'}\n\n"
                f"Reply 'approve <n>' to activate a plan, or 'reject' to dismiss."
            )

        # ── approve / numeric shorthand ────────────────────────────────────
        option_idx: Optional[int] = None
        if command.startswith("approve "):
            parts = command.split()
            if len(parts) == 2 and parts[1].isdigit():
                option_idx = int(parts[1]) - 1
        elif command.isdigit():
            option_idx = int(command) - 1

        if option_idx is not None:
            alert = _latest_open_alert(db, org.id)
            if not alert:
                return _twiml(
                    "No open alerts to approve. Your supply chain is currently healthy."
                )
            plan = _plan_for_alert(db, alert.id)
            if not plan or not plan.options_json:
                return _twiml(
                    "No recovery plan is available for the current alert yet. "
                    "Please log in to the dashboard to review."
                )
            total_opts = len(plan.options_json)
            if option_idx < 0 or option_idx >= total_opts:
                return _twiml(
                    f"Option {option_idx + 1} does not exist. "
                    f"Please choose a number between 1 and {total_opts}."
                )

            chosen = plan.options_json[option_idx]
            plan.accepted_option_idx = option_idx
            plan.accepted_at = datetime.now(timezone.utc)
            alert.status = "in_progress"

            db.add(AuditLog(
                org_id=org.id,
                action="approved_recovery_via_whatsapp",
                resource_type="RecoveryPlan",
                resource_id=str(plan.id),
                meta_json={
                    "option_idx": option_idx,
                    "option_title": chosen.get("title"),
                    "sender": From,
                },
            ))
            db.commit()

            return _twiml(
                f"*SupplyVision AI — Plan Approved*\n\n"
                f"Option activated: *{chosen.get('title', 'Recovery Option')}*\n"
                f"Expected Savings: ₹{chosen.get('expected_savings_inr', 0):,.0f}\n"
                f"Lead Time: {chosen.get('lead_time_days', '?')} days\n\n"
                f"Alert status updated to 'In Progress'. "
                f"Your logistics team will be notified."
            )

        # ── reject ─────────────────────────────────────────────────────────
        if command == "reject":
            alert = _latest_open_alert(db, org.id)
            if not alert:
                return _twiml("No open alerts to reject.")
            alert.status = "false_positive"
            alert.resolved_at = datetime.now(timezone.utc)
            db.add(AuditLog(
                org_id=org.id,
                action="rejected_alert_via_whatsapp",
                resource_type="AlertEvent",
                resource_id=str(alert.id),
                meta_json={"sender": From},
            ))
            db.commit()
            return _twiml(
                f"*SupplyVision AI* — Alert for node {alert.node_id} "
                "marked as false positive and dismissed. Reply 'status' to check again."
            )

        # ── unrecognised ───────────────────────────────────────────────────
        return _twiml(
            "SupplyVision AI: Unrecognised command. "
            "Reply *help* to see available commands."
        )

    except Exception as exc:
        db.rollback()
        logger.error(f"WhatsApp webhook error: {exc}", exc_info=True)
        return _twiml(
            "SupplyVision AI: An internal error occurred. "
            "Please try again or log in to the dashboard."
        )
    finally:
        db.close()
