import urllib.request
import urllib.parse
import base64
import json
import logging
from app.core.config import settings

logger = logging.getLogger("whatsapp_notifications")

def send_whatsapp_message(to_number: str, message: str) -> bool:
    """Send a WhatsApp message via Twilio API or log it in fallback emulator mode."""
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    from_number = settings.TWILIO_NUMBER or "whatsapp:+14155238886"
    
    # Format recipient number
    if not to_number.startswith("whatsapp:"):
        to_number = f"whatsapp:{to_number}"
        
    if not account_sid or not auth_token:
        # High fidelity terminal emulator logging
        logger.info("------------------------------------------------------------------------")
        logger.info(f"📱 WHATSAPP NOTIFICATION EMULATOR")
        logger.info(f"   To  : {to_number}")
        logger.info(f"   From: {from_number}")
        logger.info(f"   Body: \n\n{message}\n")
        logger.info("------------------------------------------------------------------------")
        return True
        
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    
    # Form encode post body
    data = {
        "To": to_number,
        "From": from_number,
        "Body": message
    }
    encoded_data = urllib.parse.urlencode(data).encode("utf-8")
    
    # Build authorization header (Basic Auth)
    auth_str = f"{account_sid}:{auth_token}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    
    try:
        req = urllib.request.Request(
            url,
            data=encoded_data,
            headers={
                "Authorization": f"Basic {auth_b64}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = json.loads(response.read().decode())
            logger.info(f"WhatsApp message successfully sent via Twilio. Message SID: {res_body.get('sid')}")
            return True
    except Exception as e:
        logger.error(f"Failed to send WhatsApp message via Twilio API: {e}")
        return False

# Custom Template Triggers

def send_risk_alert_whatsapp(to_number: str, node_name: str, risk_score: int, severity: int, rupees_at_risk: float) -> bool:
    """Send immediate risk disruption alert."""
    severity_stars = "🔴" * severity + "⚪" * (5 - severity)
    message = (
        f"⚠️ *SUPPLYVISION AI - CRITICAL RISK ALERT*\n\n"
        f"Disruption detected at node: *{node_name}*\n"
        f"Severity: {severity_stars} ({severity}/5)\n"
        f"Risk Score: *{risk_score}/100*\n"
        f"Estimated Revenue Exposure: *₹{rupees_at_risk:,.2f}*\n\n"
        f"Action Required: Please log in to the dashboard to review and approve the recommended recovery route."
    )
    return send_whatsapp_message(to_number, message)

def send_recovery_recommendation_whatsapp(to_number: str, node_name: str, alternative_supplier: str, expected_savings: float, lead_time_days: int) -> bool:
    """Send alternate supplier recovery recommendations."""
    message = (
        f"💡 *SUPPLYVISION AI - RECOVERY ACTION RECOMMENDATION*\n\n"
        f"To mitigate disruption at: *{node_name}*\n"
        f"We recommend switching to alternate source: *{alternative_supplier}*\n"
        f"Expected Savings: *₹{expected_savings:,.2f}*\n"
        f"Lead Time Offset: *{lead_time_days} days*\n\n"
        f"Click 'Approve Plan' in the Alert Center to update logistics and automatically dispatch purchase orders."
    )
    return send_whatsapp_message(to_number, message)

def send_executive_summary_whatsapp(to_number: str, health_score: int, total_exposed_value: float, protected_value: float) -> bool:
    """Send executive summaries to organization administrators."""
    message = (
        f"📊 *SUPPLYVISION AI - EXECUTIVE SUMMARY*\n\n"
        f"Current Supply Chain Health Score: *{health_score}/100*\n"
        f"Total Revenue Exposed: *₹{total_exposed_value:,.2f}*\n"
        f"Total Protected/Mitigated Value: *₹{protected_value:,.2f}*\n\n"
        f"Report compiled on: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    )
    return send_whatsapp_message(to_number, message)

def send_weekly_report_whatsapp(to_number: str, org_name: str, new_alerts_count: int, active_disruptions: int, roi_multiple: float) -> bool:
    """Send weekly digests to SME owners."""
    message = (
        f"📈 *SUPPLYVISION AI - WEEKLY STATUS UPDATE*\n\n"
        f"Organization: *{org_name}*\n"
        f"New threats flagged this week: *{new_alerts_count}*\n"
        f"Active resolved plans: *{active_disruptions}*\n"
        f"Current ROI Multiple on Mitigation: *{roi_multiple}x*\n\n"
        f"All supply Twin updates are active. Have a resilient week!"
    )
    return send_whatsapp_message(to_number, message)
