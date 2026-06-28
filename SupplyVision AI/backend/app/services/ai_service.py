import logging
from typing import Dict, List, Any

logger = logging.getLogger("ai_service")


class AIService:
    """
    Wrapper around Anthropic Claude (preferred) or OpenAI GPT-4o.
    Falls back to deterministic rule-based text when no API key is configured.
    """

    def __init__(self):
        self._client = None
        self._provider = None
        self._init_client()

    def _init_client(self):
        from app.core.config import settings

        if settings.GEMINI_API_KEY:
            try:
                from google import genai as google_genai
                self._client = google_genai.Client(api_key=settings.GEMINI_API_KEY)
                self._provider = "gemini"
                logger.info("AI service: Google Gemini 2.5 Flash client ready.")
            except ImportError:
                logger.warning("AI service: google-genai not installed — pip install google-genai")
            except Exception as exc:
                logger.warning(f"AI service: Gemini init failed: {exc}")

        if not self._client and settings.ANTHROPIC_API_KEY:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
                self._provider = "anthropic"
                logger.info("AI service: Anthropic Claude client ready.")
            except ImportError:
                logger.warning("AI service: anthropic package not installed — pip install anthropic")

        if not self._client and settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
                self._provider = "openai"
                logger.info("AI service: OpenAI client ready.")
            except ImportError:
                logger.warning("AI service: openai package not installed.")

        if not self._client:
            logger.info("AI service: no LLM key found — using rule-based fallback.")

    @property
    def available(self) -> bool:
        return self._client is not None

    @property
    def provider(self) -> str:
        """Return the active provider name: 'gemini', 'anthropic', 'openai', or 'rule-based'."""
        return self._provider or "rule-based"

    # ── Public methods ────────────────────────────────────────────────────────

    def explain_risk(
        self,
        node_name: str,
        risk_score: int,
        breakdown: Dict[str, Any],
        signals: List[Dict[str, Any]],
    ) -> str:
        """
        Return a 2–3 sentence plain-English explanation of why this node
        has its current risk score.  Uses Claude / GPT-4o when available,
        falls back to rule-based text otherwise.
        """
        if not self.available:
            return _rule_based_explain_risk(node_name, risk_score, breakdown, signals)

        prompt = (
            "You are a supply chain risk analyst advising Indian SME business owners.\n\n"
            f"Node: {node_name}\n"
            f"Risk Score: {risk_score}/100\n"
            f"Score Breakdown:\n"
            f"  - Weather Risk:     {breakdown.get('weather_risk', 0)}/100  (weight 40%)\n"
            f"  - Dependency Risk:  {breakdown.get('dependency_risk', 0)}/100  (weight 25%)\n"
            f"  - Port Risk:        {breakdown.get('port_risk', 0)}/100  (weight 20%)\n"
            f"  - Inventory Risk:   {breakdown.get('inventory_risk', 0)}/100  (weight 15%)\n\n"
            f"Active Signals ({len(signals)} detected):\n"
        )
        for s in signals[:5]:
            prompt += f"  • [{s.get('source', '?')}] {s.get('event', s.get('location', ''))} — severity {s.get('severity', s.get('intensity', '?'))}\n"

        prompt += (
            "\nWrite exactly 2–3 sentences explaining why this node has this risk score. "
            "Be specific: name the signals, mention rupee impact if material, use plain language "
            "suitable for a small-business owner. Do not use bullet points."
        )

        try:
            if self._provider == "gemini":
                resp = self._client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                return resp.text.strip()
            elif self._provider == "anthropic":
                msg = self._client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=220,
                    messages=[{"role": "user", "content": prompt}],
                )
                return msg.content[0].text.strip()
            else:
                resp = self._client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=220,
                    messages=[{"role": "user", "content": prompt}],
                )
                return resp.choices[0].message.content.strip()
        except Exception as exc:
            logger.error(f"AI explain_risk failed: {exc}")
            return _rule_based_explain_risk(node_name, risk_score, breakdown, signals)

    def enhance_recovery_description(
        self,
        option: Dict[str, Any],
        node_name: str,
        rupees_at_risk: int,
        total_units: int,
    ) -> str:
        """
        Return a single sharp sentence describing the recovery option and
        its key benefit.  Falls back to the option's existing description.
        """
        if not self.available:
            return option.get("description", "")

        prompt = (
            "You are a supply chain manager at an Indian textile company.\n\n"
            f"Disrupted node: {node_name}\n"
            f"Rupees at risk: ₹{rupees_at_risk:,}\n"
            f"Total units affected: {total_units:,}\n"
            f"Recovery option: {option.get('title')}\n"
            f"Expected savings: ₹{option.get('expected_savings_inr', 0):,}\n"
            f"Confidence: {option.get('confidence_percent', 0)}%\n\n"
            "Write exactly one sentence (max 30 words) describing what this recovery action "
            "does and its single most important benefit. Be specific, no filler words."
        )

        try:
            if self._provider == "gemini":
                resp = self._client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                return resp.text.strip()
            elif self._provider == "anthropic":
                msg = self._client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=80,
                    messages=[{"role": "user", "content": prompt}],
                )
                return msg.content[0].text.strip()
            else:
                resp = self._client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=80,
                    messages=[{"role": "user", "content": prompt}],
                )
                return resp.choices[0].message.content.strip()
        except Exception as exc:
            logger.error(f"AI enhance_recovery failed: {exc}")
            return option.get("description", "")

    def chat_completion(
        self,
        system: str,
        messages: List[Dict[str, Any]],
        fallback_context: Dict[str, Any] = None,
    ) -> str:
        """
        Multi-turn chat completion for the in-app chatbot.
        messages is a list of {"role": "user"|"assistant", "content": str}.
        Falls back to rule-based responses when no AI key is available.
        """
        if not self.available:
            last_msg = messages[-1]["content"] if messages else ""
            return _rule_based_chat(last_msg, fallback_context)

        try:
            if self._provider == "gemini":
                try:
                    from google.genai import types as genai_types
                    gen_config = genai_types.GenerateContentConfig(
                        temperature=0.85,
                        max_output_tokens=800,
                        top_p=0.95,
                    )
                except Exception:
                    gen_config = None

                full_prompt = f"{system}\n\n"
                for m in messages:
                    role_label = "User" if m["role"] == "user" else "Assistant"
                    full_prompt += f"{role_label}: {m['content']}\n"
                full_prompt += "Assistant:"

                kwargs: Dict[str, Any] = {"model": "gemini-2.5-flash", "contents": full_prompt}
                if gen_config:
                    kwargs["config"] = gen_config
                resp = self._client.models.generate_content(**kwargs)
                return resp.text.strip()
            elif self._provider == "anthropic":
                resp = self._client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=600,
                    system=system,
                    messages=messages,
                )
                return resp.content[0].text.strip()
            else:
                full = [{"role": "system", "content": system}] + messages
                resp = self._client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=600,
                    temperature=0.85,
                    messages=full,
                )
                return resp.choices[0].message.content.strip()
        except Exception as exc:
            logger.error(f"chat_completion failed: {exc}")
            last_msg = messages[-1]["content"] if messages else ""
            return _rule_based_chat(last_msg, fallback_context)

    def summarise_pipeline_run(self, log: List[str], alerts_created: int) -> str:
        """
        Return a one-paragraph executive summary of a completed pipeline run.
        Used in system health / admin logs.
        """
        if not self.available or not log:
            lines = "\n".join(log)
            return f"Pipeline completed: {alerts_created} alert(s) created.\n{lines}"

        prompt = (
            "You are an AI supply chain assistant. Summarise the following pipeline run "
            "log in one short paragraph for an executive dashboard. "
            "Highlight alerts created and the most significant risks found.\n\n"
            + "\n".join(log)
        )
        try:
            if self._provider == "gemini":
                resp = self._client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
                return resp.text.strip()
            elif self._provider == "anthropic":
                msg = self._client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=150,
                    messages=[{"role": "user", "content": prompt}],
                )
                return msg.content[0].text.strip()
            else:
                resp = self._client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=150,
                    messages=[{"role": "user", "content": prompt}],
                )
                return resp.choices[0].message.content.strip()
        except Exception as exc:
            logger.error(f"AI summarise_pipeline failed: {exc}")
            return f"Pipeline completed: {alerts_created} alert(s) created."


# ── Rule-based fallbacks ─────────────────────────────────────────────────────

def _rule_based_chat(message: str, context: Dict[str, Any] = None) -> str:
    ctx = context or {}
    open_alerts = ctx.get("open_alerts", 0)
    supplier_count = ctx.get("supplier_count", 0)
    top_suppliers = ctx.get("top_risky_suppliers", [])
    weather = ctx.get("weather_data")
    msg = message.lower()
    if any(w in msg for w in ["risk", "score", "danger", "critical", "highest"]):
        if top_suppliers:
            sup_lines = "\n".join(
                f"• **{s['name']}** — score {s['score']}/100"
                + (" 🔴 CRITICAL" if s['score'] >= 65 else " 🟡 ELEVATED" if s['score'] >= 30 else " 🟢")
                + (f", {s['city']}" if s.get('city') else "")
                + (" [single-source ⚠]" if s.get('single_source') else "")
                for s in top_suppliers
            )
            return (
                f"Your highest-risk suppliers right now:\n{sup_lines}\n\n"
                "Risk scores come from 4 live signals:\n"
                "• **Weather** 40% · **Dependency** 25% · **Port Congestion** 20% · **Inventory** 15%\n\n"
                "Scores > 65 are Critical — go to the **Alert Center** immediately."
            )
        return (
            "Risk scores are computed from 4 live signals:\n"
            "• **Weather** (40%) — cyclone, flood, monsoon from OpenWeatherMap & IMD\n"
            "• **Supplier Dependency** (25%) — single-source exposure and lead time\n"
            "• **Port Congestion** (20%) — JNPT, Chennai, Mundra utilisation\n"
            "• **Inventory** (15%) — days-to-zero burn rate at warehouses\n\n"
            "Scores above **65 = Critical**, 30–65 = Elevated, below 30 = Optimal."
        )
    if any(w in msg for w in ["supplier", "vendor", "source"]):
        base = (
            f"You have **{supplier_count} supplier(s)** configured in your digital twin.\n\n"
            if supplier_count else ""
        )
        return (
            base +
            "Each supplier card shows live risk score, city, lead time, and ₹ revenue exposure.\n\n"
            "• **Green** = low risk (< 30)\n"
            "• **Yellow** = elevated risk (30–65)\n"
            "• **Red** = critical (> 65) — act immediately\n\n"
            "Use the **Simulation Lab** to model what happens if any supplier goes offline."
        )
    if any(w in msg for w in ["alert", "disruption", "warning", "open"]):
        if open_alerts > 0:
            return (
                f"You have **{open_alerts} open alert(s)** requiring attention right now.\n\n"
                "Each alert in the **Alert Center** shows:\n"
                "• Composite risk score with full factor breakdown\n"
                "• ₹ value of orders at risk\n"
                "• 2–3 ranked AI-generated recovery options\n\n"
                "Go to the Alert Center to review and approve a recovery plan, "
                "or reply **'approve 1'** on WhatsApp."
            )
        return (
            "Good news — no open alerts right now. Your supply chain looks healthy.\n\n"
            "The Alert Center monitors:\n"
            "• Supplier risk scores crossing thresholds\n"
            "• Port congestion spikes\n"
            "• Extreme weather events\n"
            "• Inventory running critically low\n\n"
            "You'll be notified automatically by email and WhatsApp when risks emerge."
        )
    if any(w in msg for w in ["recover", "plan", "option", "mitigat", "action"]):
        return (
            "Recovery plans are auto-generated for every alert with ranked options:\n"
            "• **Option 1** — fastest to implement (switch to alternate supplier)\n"
            "• **Option 2** — cost-optimised (pre-order buffer stock)\n"
            "• **Option 3** — long-term resilience (dual-sourcing contract)\n\n"
            "Each option shows expected savings in ₹ and implementation lead time.\n"
            "Approve in the Alert Center or send 'approve 1' on WhatsApp."
        )
    if any(w in msg for w in ["simulat", "what if", "scenario", "cyclone", "flood", "strike"]):
        return (
            "The **Simulation Lab** lets you model disruption scenarios at severity 1–5:\n"
            "• **Cyclone / Flood** — weather-driven disruption at any supplier or port\n"
            "• **Port Strike** — congestion spike at JNPT, Chennai, or Mundra\n"
            "• **Supplier Failure** — complete loss of a node\n\n"
            "The real risk engine scores the impact and generates recovery options.\n"
            "You can also **inject** the simulation as a live alert to test your team's response."
        )
    if any(w in msg for w in ["weather", "rain", "flood", "cyclone", "temperature"]):
        return (
            "SupplyVision AI pulls live weather from **OpenWeatherMap** every hour for key cities.\n\n"
            "Severity mapping:\n"
            "• Severity 1 = Clear / Light cloud (no impact)\n"
            "• Severity 2 = Moderate rain (watch)\n"
            "• Severity 3 = Heavy rain / Thunderstorm (elevated risk)\n"
            "• Severity 4 = Cyclone / Flood warning (critical — act now)\n\n"
            "Open the **Digital Twin** and click any node to see live weather for that city."
        )
    if any(w in msg for w in ["whatsapp", "sms", "message", "notify", "phone"]):
        return (
            "SupplyVision AI sends **WhatsApp alerts** automatically when risk scores cross thresholds.\n\n"
            "Your team can reply directly from WhatsApp:\n"
            "• **'approve 1'** — activate recovery option 1\n"
            "• **'status'** — get current supply chain status\n"
            "• **'reject'** — dismiss the alert\n\n"
            "No need to log in — manage supply chain disruptions from your phone."
        )
    if any(w in msg for w in ["port", "jnpt", "mundra", "congestion", "shipping"]):
        return (
            "Port congestion is monitored for **JNPT, Chennai, and Mundra** ports every hour.\n\n"
            "Thresholds:\n"
            "• < 65% utilisation = Normal\n"
            "• 65–80% = Elevated congestion risk\n"
            "• > 80% = Critical — delays likely, routes affected\n\n"
            "Strike conditions during monsoon season trigger **Severity 5** flags.\n"
            "Check the Digital Twin Port nodes for real-time congestion status."
        )
    if any(w in msg for w in ["inventory", "stock", "warehouse", "burn"]):
        return (
            "Inventory risk is calculated from:\n"
            "• **Current stock** (units on hand at your warehouses)\n"
            "• **Daily burn rate** (units consumed per day)\n"
            "• **Days-to-zero** = stock ÷ burn rate\n\n"
            "Warning thresholds:\n"
            "• < 8 days → Critical (red)\n"
            "• 8–15 days → Elevated (yellow)\n"
            "• > 15 days → Safe (green)\n\n"
            "Update stock levels in the **Inventory** page or Digital Twin."
        )
    if any(w in msg for w in ["roi", "revenue", "profit", "saving", "cost", "rupee", "₹"]):
        return (
            "The **ROI Analytics** page shows your supply chain financial exposure:\n\n"
            "• Total ₹ at risk across all open alerts\n"
            "• Projected savings from approved recovery plans\n"
            "• Historical disruption cost timeline\n"
            "• Return on AI investment vs manual monitoring\n\n"
            "SupplyVision AI typically identifies 15–30% cost reduction opportunities."
        )
    if any(w in msg for w in ["hello", "hi", "hey", "help", "start", "what can", "how"]):
        return (
            "I'm **SupplyVision AI** — your intelligent supply chain co-pilot for Indian SMEs.\n\n"
            "I can help you with:\n"
            "• Risk scores and what's driving them\n"
            "• Open alerts and recovery options\n"
            "• Weather impact on your supply chain\n"
            "• Supplier analysis and simulation scenarios\n"
            "• Email digests and WhatsApp alerts\n\n"
            "Type **'test email'** to verify your email setup, or ask me anything!"
        )
    if any(w in msg for w in ["twin", "graph", "network", "node", "map"]):
        return (
            "The **Digital Twin** is a live graph of your entire supply chain:\n\n"
            "• 🏭 **Suppliers** — coloured by risk score\n"
            "• ⚓ **Ports** — showing congestion level\n"
            "• 📦 **Warehouses** — with stock levels and burn rate\n"
            "• 👤 **Customers** — downstream demand nodes\n\n"
            "Click any node to see AI risk analysis, live weather, and stock data.\n"
            "Drag nodes to rearrange the layout."
        )
    return (
        "I can help with supply chain risks, alerts, suppliers, weather impact, and recovery plans.\n\n"
        "Try asking:\n"
        "• 'What are my highest risk suppliers?'\n"
        "• 'Check weather in Chennai'\n"
        "• 'How do I read risk scores?'\n"
        "• 'Send test email'\n"
        "• 'How does the simulation work?'"
    )


def _rule_based_explain_risk(
    node_name: str,
    risk_score: int,
    breakdown: Dict[str, Any],
    signals: List[Dict[str, Any]],
) -> str:
    w = breakdown.get("weather_risk", 0) * 0.40
    d = breakdown.get("dependency_risk", 0) * 0.25
    p = breakdown.get("port_risk", 0) * 0.20
    i = breakdown.get("inventory_risk", 0) * 0.15

    drivers = sorted(
        [("weather events", w), ("supply dependency", d), ("port congestion", p), ("inventory levels", i)],
        key=lambda x: x[1],
        reverse=True,
    )
    top = [name for name, score in drivers if score > 4][:2]

    level = "critically high" if risk_score >= 70 else "elevated" if risk_score >= 45 else "moderate"
    sources = list({s.get("source", "") for s in signals if s.get("source")})

    explanation = f"{node_name} carries a {level} disruption risk of {risk_score}/100"
    if top:
        explanation += f", primarily driven by {' and '.join(top)}"
    if sources:
        explanation += f". Signals ingested from: {', '.join(sources[:3])}."
    else:
        explanation += "."

    if risk_score >= 60:
        explanation += " Immediate review recommended."

    return explanation


# Singleton — import this everywhere
ai_service = AIService()
