"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { request } from "@/lib/api";
import { formatRupee, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import {
  BellRing,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Phone,
  BookOpen,
  Cpu
} from "lucide-react";

export default function AlertCenter() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const alertIdParam = searchParams.get("id");

  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [recoveryPlan, setRecoveryPlan] = useState<any | null>(null);
  const [riskDetails, setRiskDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fetchAlerts = async () => {
    try {
      const data = await request("GET", "/alerts");
      setAlerts(data);
      
      // Auto-select first alert or the one from params
      if (data.length > 0) {
        const match = data.find((a: any) => a.id === alertIdParam) || data[0];
        handleSelectAlert(match);
      }
    } catch (e) {
      console.error("Failed to load alerts", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [alertIdParam]);

  const handleSelectAlert = async (alert: any) => {
    setSelectedAlert(alert);
    setRecoveryPlan(null);
    setRiskDetails(null);
    setSuccess("");
    setError("");

    // Fetch AI risk explanation for the alert's node
    try {
      const details = await request("GET", `/risks/scores/${alert.node_id}`);
      setRiskDetails(details);
    } catch (e) {
      console.error("Could not fetch AI risk details", e);
    }

    // Fetch recovery plans for this alert (blocked for WAREHOUSE_STAFF)
    if (user?.role !== "warehouse_staff") {
      try {
        const plan = await request("GET", `/recovery/plans/${alert.id}`);
        setRecoveryPlan(plan);
      } catch (e) {
        console.error("Could not fetch recovery options", e);
      }
    }
  };

  const handleAcceptOption = async (optionIdx: number) => {
    if (!selectedAlert) return;
    setError("");
    setSuccess("");
    try {
      const result = await request("POST", `/recovery/plans/${selectedAlert.id}/accept`, {
        option_idx: optionIdx
      });
      setSuccess(result.message || "Option accepted successfully!");
      fetchAlerts(); // reload
    } catch (err: any) {
      setError(err.message || "Failed to accept recovery option.");
    }
  };

  const handleResolveAlert = async (statusUpdate: string) => {
    if (!selectedAlert) return;
    setError("");
    setSuccess("");
    try {
      await request("POST", `/alerts/${selectedAlert.id}/resolve?status_update=${statusUpdate}`);
      setSuccess(`Alert successfully marked as ${statusUpdate.replace("_", " ")}.`);
      fetchAlerts();
    } catch (err: any) {
      setError(err.message || "Failed to resolve alert.");
    }
  };

  const role = user?.role || "warehouse_staff";
  const hideFinancials = role === "warehouse_staff";
  const canAccept = role === "sc_manager" || role === "sme_owner" || role === "super_admin";

  // Compile mock WhatsApp message representations for the emulator
  const getWhatsAppPayload = () => {
    if (!selectedAlert) return "";
    
    const nodeName = selectedAlert.node_id === "supplier_1" ? "Erode Yarn Mill (S1)" : selectedAlert.node_id;
    const score = selectedAlert.risk_score;
    const value = formatRupee(selectedAlert.rupees_at_risk);
    
    // Ramesh (HI / SME Owner) sees rupees
    if (role === "sme_owner" || user?.preferred_lang === "hi") {
      return `🚨 सप्लाईविजन अलर्ट | तमिल निटवेअर\n\nजोखिम स्रोत: ${nodeName}\nजोखिम स्कोर: ${score}/100\nसंभावित नुकसान: ${value}\n\nसुझाव: alternate supplier (Coimbatore) पर शिफ्ट करें। कुल बचत: ₹10.3L.\n\nविवरण देखें: https://app.supplyvision.ai/alerts/${selectedAlert.id}`;
    }
    
    // Suresh (Warehouse Staff, HI, simple instructions)
    if (role === "warehouse_staff") {
      return `🚨 स्टॉक चेतावनी | वेयरहाउस A\n\nसप्लायर ${nodeName} में जोखिम।\n\nसुरेश जी, वेयरहाउस A में स्टॉक कम हो सकता है। कृपया 200 यूनिट और जोड़ें।`;
    }
    
    // SC Manager / English
    return `🚨 SupplyVision Alert | Tamil Knitwear\n\nRisk Node: ${nodeName}\nRisk Score: ${score}/100\n\nOrders at Risk: ${value} across 12 orders\nSources: IMD (Cyclone Level 4), NewsAPI\n\nRecommended Action:\n1. Switch 40% to Supplier B (Coimbatore) → Saves ₹10.3L\n\nAccept action: https://app.supplyvision.ai/alerts/${selectedAlert.id}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-t-2 border-accent rounded-full animate-spin"></div>
          <p className="font-mono text-sm tracking-widest">LOADING DISRUPTION ALERTS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <BellRing className="h-8 w-8 text-accent" />
          <span>Alert Center</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review real-time early warnings, check explainability contributors, and confirm mitigation plans.
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-400 bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts List (Left Column) */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4 h-fit">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Active Notifications</h3>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">
                NO ACTIVE WARNINGS.
              </div>
            ) : (
              alerts.map((a) => {
                const isSelected = selectedAlert?.id === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelectAlert(a)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-accent/10 border-accent text-white"
                        : "bg-slate-950/30 border-slate-800 hover:border-slate-700 text-slate-400"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm text-white">
                        {a.node_type}: {a.node_id === "supplier_1" ? "Erode Yarn Mill" : a.node_id}
                      </span>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                        a.status === "resolved" 
                          ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/40"
                          : a.status === "in_progress"
                          ? "bg-blue-950/50 text-blue-400 border border-blue-900/40"
                          : "bg-red-950/50 text-red-400 border border-red-900/40"
                      }`}>
                        {a.status.toUpperCase()}
                      </span>
                    </div>
                    
                    {!hideFinancials && (
                      <div className="text-xs text-red-400 mt-2 font-mono font-semibold">
                        Exposure: {formatRupee(a.rupees_at_risk)}
                      </div>
                    )}
                    
                    <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                      <span>Score: {a.risk_score}/100</span>
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detailed Inspector & Recovery (Right Column) */}
        {selectedAlert ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Part 1: Signal Explainability Trace */}
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-red-950/20 border border-red-900/30 text-red-400 px-2 py-0.5 rounded">
                    Risk Assessment Traceability
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2 leading-tight">
                    {selectedAlert.node_type} Disruption Inbound Warning
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500 block uppercase">Composite Score</span>
                  <span className="text-3xl font-extrabold text-red-400 font-mono">{selectedAlert.risk_score}/100</span>
                </div>
              </div>

              {/* Signals contributors */}
              <div className="space-y-3">
                <h4 className="font-semibold text-white text-sm flex items-center gap-1.5">
                  <BookOpen className="h-4.5 w-4.5 text-accent" />
                  <span>External Signal Attribution</span>
                </h4>
                
                <div className="space-y-2">
                  {selectedAlert.signals_json && selectedAlert.signals_json.map((sig: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl flex justify-between items-start text-xs font-mono">
                      <div className="space-y-1">
                        <div className="text-slate-300 font-semibold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          <span>{sig.event}</span>
                        </div>
                        <div className="text-slate-500 text-[10px]">Source: {sig.source} | Intensity: {sig.intensity || 3}/5</div>
                      </div>
                      {sig.distance_km && (
                        <div className="text-right text-slate-400 text-[10px] shrink-0">
                          <div>Proximity: {sig.distance_km}km</div>
                          <div className="mt-0.5">ETA: {sig.eta_hours}h</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rupees exposure list */}
              {!hideFinancials && (
                <div className="bg-[#090d16] border border-slate-850 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-xs font-mono text-slate-500 uppercase block">Procurement Value Exposed</span>
                    <span className="text-2xl font-extrabold text-red-400 mt-1 block">
                      {formatRupee(selectedAlert.rupees_at_risk)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-500 block uppercase">Exposure Limit State</span>
                    <span className="text-xs font-semibold text-red-400 bg-red-950/30 border border-red-900/40 px-2.5 py-0.5 rounded-full inline-block mt-2 uppercase tracking-wide">
                      Breached Threshold
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Part 2: AI Risk Explanation */}
            {riskDetails && (
              <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-violet-400" />
                    <span>AI Risk Analysis</span>
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    riskDetails.ai_powered
                      ? "bg-violet-950/30 text-violet-400 border-violet-900/40"
                      : "bg-slate-950 text-slate-500 border-slate-800"
                  }`}>
                    {riskDetails.ai_powered ? "⚡ CLAUDE AI" : "RULE-BASED"}
                  </span>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {riskDetails.explanation}
                </p>

                {riskDetails.breakdown && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {[
                      { key: "weather_risk",     label: "Weather",    color: "bg-blue-500"    },
                      { key: "dependency_risk",  label: "Dependency", color: "bg-amber-500"   },
                      { key: "port_risk",        label: "Port",       color: "bg-red-500"     },
                      { key: "inventory_risk",   label: "Inventory",  color: "bg-emerald-500" },
                    ].map(({ key, label, color }) => {
                      const val = riskDetails.breakdown[key] ?? 0;
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-500">
                            <span>{label}</span>
                            <span>{val}/100</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-800">
                            <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between text-[10px] font-mono text-slate-600 pt-1 border-t border-slate-800/60">
                  <span>Confidence: {riskDetails.confidence}%</span>
                  <span>Data age: ≤{riskDetails.data_freshness_hours}h</span>
                </div>
              </div>
            )}

            {/* Part 3: WhatsApp notification Emulator */}
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Phone className="h-4.5 w-4.5 text-emerald-400" />
                <span>WhatsApp Notification Emulator</span>
              </h3>
              
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-xs text-slate-400 whitespace-pre-wrap leading-relaxed relative">
                <div className="absolute top-2 right-2 text-[9px] bg-slate-900 border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                  Twilio API Outbox (IST)
                </div>
                {getWhatsAppPayload()}
              </div>
            </div>

            {/* Part 4: Recovery Options Acceptance */}
            {user?.role !== "warehouse_staff" && recoveryPlan && (
              <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-white border-b border-slate-800 pb-2">Contingency Recovery Action</h3>
                
                <div className="space-y-4">
                  {recoveryPlan.options_json.map((opt: any, idx: number) => {
                    const isAccepted = recoveryPlan.accepted_option_idx === idx;
                    
                    return (
                      <div
                        key={idx}
                        className={`p-5 rounded-2xl border transition-all ${
                          isAccepted
                            ? "bg-emerald-950/15 border-emerald-500/50 shadow-md shadow-emerald-500/5"
                            : "bg-slate-950 border-slate-850"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <span className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-accent/20 text-accent text-[10px]">
                                {opt.rank}
                              </span>
                              <span>{opt.title}</span>
                            </div>
                            <p className="text-slate-400 text-xs mt-2 pl-6 leading-relaxed">
                              {opt.description}
                            </p>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono bg-blue-950/50 text-accent border border-blue-900/35 px-2 py-0.5 rounded block text-center uppercase tracking-wide">
                              {opt.confidence_percent}% Confidence
                            </span>
                          </div>
                        </div>

                        {/* Cost & Savings details */}
                        <div className="pl-6 grid grid-cols-2 gap-4 text-xs font-mono pt-3 mt-3 border-t border-slate-800/60">
                          <div>
                            <span className="text-slate-500 block">RECOVERY INVESTMENT</span>
                            <span className="text-slate-300 font-semibold">{formatRupee(opt.recovery_cost_inr)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">MITIGATED LOSS / SAVINGS</span>
                            <span className="text-emerald-400 font-semibold">{formatRupee(opt.expected_savings_inr)}</span>
                          </div>
                        </div>

                        {/* Acceptance action button */}
                        {canAccept && selectedAlert.status === "open" && (
                          <div className="pl-6 pt-4 flex justify-end">
                            <button
                              onClick={() => handleAcceptOption(idx)}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
                            >
                              Approve Option {opt.rank}
                            </button>
                          </div>
                        )}

                        {isAccepted && (
                          <div className="pl-6 pt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                            <ShieldCheck className="h-4.5 w-4.5" />
                            <span>Contingency Active & Signed off by Operations Manager</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Resolving alerts panel */}
                {selectedAlert.status !== "resolved" && canAccept && (
                  <div className="pt-4 border-t border-slate-800/80 flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-500 uppercase">Alert Operational State</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveAlert("resolved")}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-all"
                      >
                        Resolve Alert
                      </button>
                      <button
                        onClick={() => handleResolveAlert("false_positive")}
                        className="px-3.5 py-1.5 bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-950/40 rounded-xl text-xs transition-all"
                      >
                        Flag False Positive
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 p-8 rounded-2xl text-center text-slate-500 font-mono text-xs py-36">
            SELECT A WARNING CARD TO TRAVERSE THE INTEGRATION SCHEMAS AND RECOVERY CONTINGENCIES.
          </div>
        )}
      </div>
    </div>
  );
}
