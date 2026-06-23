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

        if settings.ANTHROPIC_API_KEY:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
                self._provider = "anthropic"
                logger.info("AI service: Anthropic Claude client ready.")
            except ImportError:
                logger.warning("AI service: anthropic package not installed — pip install anthropic")
        elif settings.OPENAI_API_KEY:
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
            if self._provider == "anthropic":
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
            if self._provider == "anthropic":
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
            if self._provider == "anthropic":
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


# ── Rule-based fallback ───────────────────────────────────────────────────────

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
