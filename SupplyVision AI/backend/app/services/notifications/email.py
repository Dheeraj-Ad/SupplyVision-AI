"""
Email notification service — sends HTML alerts via SMTP (Gmail/Sendgrid compatible).
Falls back to terminal logging when SMTP_USER is not configured.
"""

import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List
from app.core.config import settings

logger = logging.getLogger("email_notifications")


def _smtp_send(to_addresses: List[str], subject: str, html: str, plain: str = "") -> bool:
    """Core SMTP sender. Returns True on success."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info("=" * 72)
        logger.info("EMAIL NOTIFICATION EMULATOR (configure SMTP_USER + SMTP_PASSWORD to go live)")
        logger.info(f"  To      : {', '.join(to_addresses)}")
        logger.info(f"  Subject : {subject}")
        logger.info(f"  Body    : {plain[:300] if plain else '(html only)'}")
        logger.info("=" * 72)
        return True

    try:
        smtp_user = (settings.SMTP_USER or "").strip()
        smtp_pass = (settings.SMTP_PASSWORD or "").strip()
        # Gmail requires FROM = authenticated sender — use SMTP_USER as FROM
        from_addr = smtp_user or settings.EMAIL_FROM

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = ", ".join(to_addresses)

        if plain:
            msg.attach(MIMEText(plain, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_addr, to_addresses, msg.as_string())

        logger.info(f"Email sent: '{subject}' -> {to_addresses}")
        return True

    except Exception as exc:
        logger.error(f"Email send failed: {exc}")
        return False


def _alert_html(node_name: str, risk_score: int, rupees_at_risk: int,
                alert_id: str, options_count: int) -> tuple[str, str]:
    severity_color = "#EF4444" if risk_score >= 75 else "#F59E0B" if risk_score >= 50 else "#10B981"
    severity_label = "CRITICAL" if risk_score >= 75 else "HIGH" if risk_score >= 50 else "MODERATE"
    rupees_fmt = f"Rs. {rupees_at_risk:,.0f}"

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0F1E;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#0C1929;border-radius:16px;overflow:hidden;border:1px solid #162840;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0C1929,#0D2040);padding:28px 32px;border-bottom:1px solid #162840;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="width:10px;height:10px;border-radius:50%;background:{severity_color};box-shadow:0 0 8px {severity_color};"></div>
        <span style="font-size:11px;font-family:monospace;letter-spacing:0.15em;color:{severity_color};text-transform:uppercase;">
          {severity_label} SUPPLY RISK ALERT
        </span>
      </div>
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#E2EAF4;letter-spacing:-0.01em;">
        {node_name}
      </h1>
      <p style="margin:6px 0 0;font-size:13px;color:#4E6B8A;">
        SupplyVision AI has detected a supply chain disruption requiring your attention.
      </p>
    </div>

    <!-- Risk Metrics -->
    <div style="padding:24px 32px;display:flex;gap:16px;border-bottom:1px solid #162840;">
      <div style="flex:1;background:#06101E;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:32px;font-weight:800;color:{severity_color};font-variant-numeric:tabular-nums;">{risk_score}</div>
        <div style="font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:0.12em;color:#4E6B8A;margin-top:4px;">Risk Score / 100</div>
      </div>
      <div style="flex:1;background:#06101E;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:#F59E0B;font-variant-numeric:tabular-nums;">{rupees_fmt}</div>
        <div style="font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:0.12em;color:#4E6B8A;margin-top:4px;">Value at Risk</div>
      </div>
      <div style="flex:1;background:#06101E;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:32px;font-weight:800;color:#0EA5E9;font-variant-numeric:tabular-nums;">{options_count}</div>
        <div style="font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:0.12em;color:#4E6B8A;margin-top:4px;">Recovery Options</div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:24px 32px;">
      <p style="font-size:14px;color:#8BA8C0;line-height:1.7;margin:0 0 20px;">
        The AI pipeline has automatically generated <strong style="color:#E2EAF4;">{options_count} recovery plan options</strong>
        for this disruption, ranked by cost and speed of implementation.
      </p>

      <div style="background:#06101E;border:1px solid #162840;border-radius:10px;padding:16px;margin-bottom:20px;">
        <p style="font-size:12px;font-family:monospace;color:#4E6B8A;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.1em;">
          WhatsApp Quick Action
        </p>
        <p style="font-size:14px;color:#E2EAF4;margin:0;">
          Reply <strong style="color:#10B981;">"approve 1"</strong> on WhatsApp to activate the top-ranked recovery plan immediately.
        </p>
      </div>

      <a href="#"
         style="display:block;text-align:center;background:#0EA5E9;color:#fff;text-decoration:none;
                font-weight:700;font-size:14px;padding:14px;border-radius:12px;letter-spacing:0.02em;">
        View Full Alert &amp; Recovery Plans
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #162840;text-align:center;">
      <p style="font-size:11px;font-family:monospace;color:#2A4060;margin:0;">
        SupplyVision AI &mdash; Automated Supply Chain Intelligence &mdash; Alert ID: {alert_id[:8].upper()}
      </p>
    </div>

  </div>
</body>
</html>"""

    plain = (
        f"SUPPLY RISK ALERT — {severity_label}\n"
        f"Node      : {node_name}\n"
        f"Risk Score: {risk_score}/100\n"
        f"At Risk   : {rupees_fmt}\n"
        f"Options   : {options_count} recovery plans ready\n\n"
        f"Reply 'approve 1' on WhatsApp to activate the top recovery plan.\n"
        f"Alert ID  : {alert_id[:8].upper()}\n"
    )
    return html, plain


def send_alert_email(
    to_addresses: List[str],
    node_name: str,
    risk_score: int,
    rupees_at_risk: int,
    alert_id: str,
    options_count: int,
) -> bool:
    severity_label = "CRITICAL" if risk_score >= 75 else "HIGH" if risk_score >= 50 else "MODERATE"
    subject = f"[{severity_label}] Supply Risk Alert: {node_name} — Risk Score {risk_score}/100"
    html, plain = _alert_html(node_name, risk_score, rupees_at_risk, alert_id, options_count)
    return _smtp_send(to_addresses, subject, html, plain)


def send_weekly_digest_email(
    to_addresses: List[str],
    org_name: str,
    total_alerts: int,
    resolved_alerts: int,
    avg_risk_score: float,
    top_risks: List[dict],
) -> bool:
    subject = f"SupplyVision AI — Weekly Supply Chain Report: {org_name}"
    risks_html = "".join(
        f'<li style="padding:6px 0;border-bottom:1px solid #162840;color:#8BA8C0;">'
        f'<strong style="color:#E2EAF4;">{r.get("name","Node")}</strong> — Score {r.get("score",0)}/100</li>'
        for r in top_risks[:5]
    )
    html = f"""
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0F1E;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#0C1929;border-radius:16px;overflow:hidden;border:1px solid #162840;">
  <div style="padding:28px 32px;border-bottom:1px solid #162840;">
    <p style="font-size:11px;font-family:monospace;letter-spacing:0.15em;color:#0EA5E9;text-transform:uppercase;margin:0 0 8px;">
      Weekly Intelligence Digest
    </p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#E2EAF4;">{org_name}</h1>
  </div>
  <div style="padding:24px 32px;display:flex;gap:12px;border-bottom:1px solid #162840;">
    <div style="flex:1;background:#06101E;border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#EF4444;">{total_alerts}</div>
      <div style="font-size:10px;font-family:monospace;color:#4E6B8A;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">Total Alerts</div>
    </div>
    <div style="flex:1;background:#06101E;border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#10B981;">{resolved_alerts}</div>
      <div style="font-size:10px;font-family:monospace;color:#4E6B8A;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">Resolved</div>
    </div>
    <div style="flex:1;background:#06101E;border-radius:10px;padding:14px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#F59E0B;">{avg_risk_score:.0f}</div>
      <div style="font-size:10px;font-family:monospace;color:#4E6B8A;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">Avg Risk Score</div>
    </div>
  </div>
  <div style="padding:24px 32px;">
    <p style="font-size:12px;font-family:monospace;color:#4E6B8A;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Top Risk Nodes This Week</p>
    <ul style="margin:0;padding:0;list-style:none;">{risks_html}</ul>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #162840;text-align:center;">
    <p style="font-size:11px;font-family:monospace;color:#2A4060;margin:0;">SupplyVision AI &mdash; Automated Weekly Intelligence</p>
  </div>
</div>
</body></html>"""

    plain = (
        f"Weekly Supply Chain Report — {org_name}\n"
        f"Total Alerts  : {total_alerts}\n"
        f"Resolved      : {resolved_alerts}\n"
        f"Avg Risk Score: {avg_risk_score:.0f}/100\n"
    )
    return _smtp_send(to_addresses, subject, html, plain)


def send_test_email(to_address: str, user_name: str) -> bool:
    """Send a quick SMTP connectivity test email."""
    subject = "SupplyVision AI — SMTP Connection Test"
    html = f"""
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0F1E;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#0C1929;border-radius:16px;overflow:hidden;border:1px solid #162840;">
  <div style="padding:28px 32px;border-bottom:1px solid #162840;">
    <p style="font-size:11px;font-family:monospace;letter-spacing:0.15em;color:#10B981;text-transform:uppercase;margin:0 0 8px;">✅ SMTP Test Successful</p>
    <h1 style="margin:0;font-size:20px;font-weight:800;color:#E2EAF4;">Email configuration is working</h1>
  </div>
  <div style="padding:24px 32px;">
    <p style="font-size:14px;color:#8BA8C0;line-height:1.7;margin:0 0 16px;">
      Hi <strong style="color:#E2EAF4;">{user_name}</strong>, this test confirms your SMTP connection to SupplyVision AI is active.
    </p>
    <p style="font-size:13px;color:#4E6B8A;line-height:1.6;margin:0;">
      You will receive alert digests, risk reports, and AI conversation summaries at this address.
    </p>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #162840;text-align:center;">
    <p style="font-size:11px;font-family:monospace;color:#2A4060;margin:0;">SupplyVision AI &mdash; Your Intelligent Supply Chain Co-pilot</p>
  </div>
</div>
</body></html>"""
    plain = f"SMTP Test — SupplyVision AI\n\nHi {user_name}, your email configuration is working correctly. You will receive alerts at this address."
    return _smtp_send([to_address], subject, html, plain)


def send_chatbot_digest_email(
    to_address: str,
    user_name: str,
    conversation_summary: str,
    key_insights: List[str],
) -> bool:
    subject = f"SupplyVision AI — Your Conversation Summary"
    insights_html = "".join(
        f'<li style="padding:5px 0;color:#8BA8C0;">{insight}</li>'
        for insight in key_insights
    )
    html = f"""
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0F1E;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#0C1929;border-radius:16px;overflow:hidden;border:1px solid #162840;">
  <div style="padding:28px 32px;border-bottom:1px solid #162840;">
    <p style="font-size:11px;font-family:monospace;letter-spacing:0.15em;color:#0EA5E9;text-transform:uppercase;margin:0 0 8px;">AI Assistant Digest</p>
    <h1 style="margin:0;font-size:20px;font-weight:800;color:#E2EAF4;">Hi {user_name}, here's your session summary</h1>
  </div>
  <div style="padding:24px 32px;border-bottom:1px solid #162840;">
    <p style="font-size:12px;font-family:monospace;color:#4E6B8A;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Conversation Summary</p>
    <p style="font-size:14px;color:#8BA8C0;line-height:1.7;margin:0;">{conversation_summary}</p>
  </div>
  <div style="padding:24px 32px;">
    <p style="font-size:12px;font-family:monospace;color:#4E6B8A;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Key Insights</p>
    <ul style="margin:0;padding-left:18px;">{insights_html}</ul>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #162840;text-align:center;">
    <p style="font-size:11px;font-family:monospace;color:#2A4060;margin:0;">SupplyVision AI &mdash; Your Intelligent Supply Chain Co-pilot</p>
  </div>
</div>
</body></html>"""
    return _smtp_send([to_address], subject, html, conversation_summary)
