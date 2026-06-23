"use client";

import React, { useEffect, useState } from "react";
import { request, isOfflineFallbackActive } from "@/lib/api";
import { 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  DollarSign, 
  Activity, 
  FileCheck,
  Heart,
  ChevronRight,
  TrendingDown,
  Info,
  RefreshCw,
  PieChart
} from "lucide-react";

interface HealthScoreBreakdown {
  unresolved_alerts_deduction: number;
  single_source_deduction: number;
  active_risk_deduction: number;
}

interface SavingsEvent {
  date: string;
  savings: number;
  cost: number;
  title: string;
}

interface ROIDashboardData {
  total_at_risk: number;
  total_protected: number;
  expected_savings: number;
  total_recovery_costs: number;
  roi_multiple: number;
  business_health_score: number;
  active_alerts_count: number;
  resolved_alerts_count: number;
  single_source_risk_count: number;
  health_score_breakdown: HealthScoreBreakdown;
  savings_history: SavingsEvent[];
}

export default function ROIDashboard() {
  const [data, setData] = useState<ROIDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [refreshes, setRefreshes] = useState<number>(0);

  useEffect(() => {
    async function fetchROI() {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const res = await request("GET", "/roi");
        setData(res);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Failed to load ROI metrics.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchROI();
  }, [refreshes]);

  const formatINR = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    if (score >= 50) return "text-amber-400 border-amber-500/20 bg-amber-500/5";
    return "text-red-400 border-red-500/20 bg-red-500/5";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#030712] text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 text-accent animate-spin" />
          <p className="font-mono text-sm tracking-wider">COMPILING AGGREGATE ROI LEDGER...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-900/40 rounded-2xl text-xs font-mono text-red-400">
        ERROR COMPILING FINANCIAL METRICS: {errorMsg || "Empty data payload returned."}
      </div>
    );
  }

  const isOffline = isOfflineFallbackActive();

  return (
    <div className="space-y-8 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase tracking-widest text-accent">Financial Analysis</span>
            {isOffline && (
              <span className="text-[10px] bg-amber-950/40 border border-amber-900/50 text-amber-400 font-mono px-2 py-0.5 rounded-full uppercase">
                Offline Mode
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ROI & Business Health Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time assessment of protection values, mitigation savings, and single source exposure risk.
          </p>
        </div>

        <button
          onClick={() => setRefreshes(r => r + 1)}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-xl text-xs font-mono text-slate-300 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>RECALCULATE LEDGER</span>
        </button>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Sourced Value Protected */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">Revenue Protected</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatINR(data.total_protected)}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Active orders routed away from disruptions.
            </p>
          </div>
        </div>

        {/* Expected Net Savings */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">Net Savings Generated</span>
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatINR(data.expected_savings)}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Avoided line stoppage & SLA penalties.
            </p>
          </div>
        </div>

        {/* Mitigation Costs */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">Recovery Costs</span>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
              <TrendingDown className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatINR(data.total_recovery_costs)}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Extra freight premiums & setup fees.
            </p>
          </div>
        </div>

        {/* ROI Multiple */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">Mitigation ROI Multiple</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white tracking-tight">
              {data.roi_multiple}x
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Savings yield per Rupee spent on recovery.
            </p>
          </div>
        </div>

      </div>

      {/* Row 2: Health Score & Alert Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Business Health Score Gauge */}
        <div className="lg:col-span-5 bg-[#0b0f19] border border-slate-800 rounded-3xl p-8 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Business Health score</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dynamically derived based on unresolved active alerts, risk exposures, and single source vulnerability.
            </p>
          </div>

          <div className="flex flex-col items-center py-8">
            <div className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center relative ${getHealthColor(data.business_health_score)}`}>
              <span className="text-4xl font-extrabold tracking-tighter">{data.business_health_score}</span>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mt-0.5">HEALTH INDEX</span>
            </div>
          </div>

          <div className="bg-[#070b13] border border-slate-900 rounded-2xl p-4 space-y-3 text-xs font-mono">
            <div className="text-slate-400 font-semibold uppercase border-b border-slate-800/80 pb-1.5 flex items-center space-x-1.5">
              <Heart className="h-3.5 w-3.5 text-red-500" />
              <span>Vulnerability Deductions</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-slate-500">
                <span>Active Alerts Impact:</span>
                <span className={data.health_score_breakdown.unresolved_alerts_deduction > 0 ? "text-amber-400" : "text-slate-400"}>
                  -{data.health_score_breakdown.unresolved_alerts_deduction} pts
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Single Source Reliance:</span>
                <span className={data.health_score_breakdown.single_source_deduction > 0 ? "text-amber-400" : "text-slate-400"}>
                  -{data.health_score_breakdown.single_source_deduction} pts
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Active Nodes Risk Factor:</span>
                <span className={data.health_score_breakdown.active_risk_deduction > 0 ? "text-amber-400" : "text-slate-400"}>
                  -{data.health_score_breakdown.active_risk_deduction} pts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk & Exposure Analytics */}
        <div className="lg:col-span-7 bg-[#0b0f19] border border-slate-800 rounded-3xl p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Disruption Exposure Overview</h3>
            
            <div className="grid grid-cols-3 gap-6">
              
              <div className="bg-[#070b13] border border-slate-800 p-5 rounded-2xl space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase block">Active Alerts</span>
                <span className="text-2xl font-bold text-red-400 block">{data.active_alerts_count}</span>
                <span className="text-[9px] text-slate-500 font-mono block">Needs Resolution</span>
              </div>

              <div className="bg-[#070b13] border border-slate-800 p-5 rounded-2xl space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase block">Resolved Alerts</span>
                <span className="text-2xl font-bold text-emerald-400 block">{data.resolved_alerts_count}</span>
                <span className="text-[9px] text-slate-500 font-mono block">Saved Exposures</span>
              </div>

              <div className="bg-[#070b13] border border-slate-800 p-5 rounded-2xl space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase block">Single Sources</span>
                <span className="text-2xl font-bold text-amber-500 block">{data.single_source_risk_count}</span>
                <span className="text-[9px] text-slate-500 font-mono block">No Alternate</span>
              </div>

            </div>
          </div>

          <div className="bg-[#070b13] border border-slate-800 rounded-2xl p-6 space-y-4 mt-6">
            <div className="flex items-center space-x-2">
              <Info className="h-4.5 w-4.5 text-accent shrink-0" />
              <span className="text-xs font-semibold text-slate-300">Tenant Redundancy Insights</span>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Based on the digital twin audit, your organization has <strong>{data.single_source_risk_count} critical nodes</strong> operating as single sources of supply with no mapped alternate suppliers. Weather disruption in these areas could trigger an estimated loss of <strong>{formatINR(data.total_at_risk)}</strong> due to contract penalties and sourcing gaps.
            </p>
            
            <div className="flex justify-start">
              <a
                href="/dashboard/twin"
                className="text-xs text-accent hover:underline flex items-center space-x-1"
              >
                <span>Assess digital twin graph</span>
                <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: Actionable Savings Logs */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-8 space-y-6">
        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Mitigation Ledger & Savings History</h3>
        
        {data.savings_history.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-2xl">
            NO COMPLETED RECOVERY ACTIONS REGISTERED YET. ACCEPT RECOVERY OPTIONS IN ALERT DETAILS TO SEED DATA.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase">
                  <th className="pb-3 font-semibold">Resolution Date</th>
                  <th className="pb-3 font-semibold">Mitigation Strategy</th>
                  <th className="pb-3 font-semibold text-right">Recovery Cost</th>
                  <th className="pb-3 font-semibold text-right">Net Savings</th>
                  <th className="pb-3 font-semibold text-right">Yield Multiple</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.savings_history.map((event, index) => {
                  const mult = event.cost > 0 ? (event.savings / event.cost).toFixed(1) : "N/A";
                  return (
                    <tr key={index} className="text-slate-300">
                      <td className="py-4 text-slate-500">{event.date}</td>
                      <td className="py-4 text-white font-semibold">{event.title}</td>
                      <td className="py-4 text-right text-red-400 font-semibold">{formatINR(event.cost)}</td>
                      <td className="py-4 text-right text-emerald-400 font-semibold">{formatINR(event.savings)}</td>
                      <td className="py-4 text-right text-blue-400 font-semibold">{mult}x</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
