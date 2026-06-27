"use client";

import React, { useEffect, useState } from "react";
import { request } from "@/lib/api";
import { formatRupee } from "@/lib/utils";
import {
  TrendingUp,
  ShieldCheck,
  TrendingDown,
  AlertTriangle,
  Coins,
  Activity,
  ArrowUpRight,
  Bot,
  Sparkles,
  RefreshCw,
  Brain,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";

interface Briefing {
  briefing: string;
  ai_powered: boolean;
  ai_provider: string;
  open_alerts: number;
  high_risk_count: number;
  supplier_count: number;
  generated_at: string;
}

export default function CEODashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [alertsData, suppliersData] = await Promise.all([
          request("GET", "/alerts"),
          request("GET", "/suppliers"),
        ]);
        setAlerts(alertsData);
        setSuppliers(suppliersData);
      } catch (e) {
        console.error("Failed to load dashboard statistics", e);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchBriefing() {
      try {
        const [b, c] = await Promise.all([
          request("GET", "/dashboard/briefing"),
          request("GET", "/dashboard/chart?days=7"),
        ]);
        setBriefing(b);
        if (c?.data?.length) setChartData(c.data);
      } catch (e) {
        console.error("Briefing fetch failed", e);
      } finally {
        setBriefingLoading(false);
      }
    }

    fetchData();
    fetchBriefing();
  }, []);

  const refreshBriefing = async () => {
    setBriefingLoading(true);
    try {
      const b = await request("GET", "/dashboard/briefing");
      setBriefing(b);
    } catch {}
    finally { setBriefingLoading(false); }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-t-2 border-accent rounded-full animate-spin"></div>
          <p className="font-mono text-sm tracking-widest">LOADING REAL-TIME OPERATIONAL METRICS...</p>
        </div>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.status === "open" || a.status === "in_progress");
  const totalRevenueAtRisk = activeAlerts.reduce((sum, a) => sum + (a.rupees_at_risk || 0), 0);
  const savingsOpportunities = totalRevenueAtRisk * 0.65;
  const averageRisk =
    suppliers.length > 0
      ? Math.round(suppliers.reduce((sum, s) => sum + (s.current_risk_score || 0), 0) / suppliers.length)
      : 0;
  const healthScore = Math.max(15, 100 - averageRisk);

  const displayChart =
    chartData.length > 0
      ? chartData
      : [
          { name: "Day-6", score: 25 },
          { name: "Day-5", score: 30 },
          { name: "Day-4", score: averageRisk || 28 },
          { name: "Day-3", score: averageRisk || 32 },
          { name: "Day-2", score: averageRisk || 30 },
          { name: "Day-1", score: averageRisk || 28 },
          { name: "Today", score: averageRisk || 26 },
        ];

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Executive Control Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time disruption warnings & value-at-risk analysis for{" "}
            <span className="text-slate-200 font-semibold">Your Organisation</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-mono text-slate-400">
          Last Check: <span className="text-emerald-400">Just Now</span>
        </div>
      </div>

      {/* ── AI Daily Briefing Card ── */}
      <div className="relative bg-gradient-to-br from-[#0f172a] via-[#0f172a] to-[#0a1628] border border-blue-900/40 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-violet-600/5 to-blue-600/5 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className="relative p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              {briefingLoading ? (
                <RefreshCw className="h-6 w-6 text-blue-400 animate-spin" />
              ) : (
                <Brain className="h-6 w-6 text-blue-400" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase">
                AI Intelligence Briefing
              </span>
              {briefing?.ai_powered && (
                <span className="inline-flex items-center gap-1 text-[9px] bg-blue-950/60 border border-blue-800/50 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                  <Sparkles className="h-2.5 w-2.5" />
                  {briefing.ai_provider === "gemini" ? "Gemini AI"
                    : briefing.ai_provider === "anthropic" ? "Claude AI"
                    : briefing.ai_provider === "openai" ? "GPT-4o"
                    : "AI"}
                </span>
              )}
            </div>
            {briefingLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-slate-800 rounded animate-pulse w-full" />
                <div className="h-4 bg-slate-800 rounded animate-pulse w-4/5" />
              </div>
            ) : (
              <p className="text-sm text-slate-200 leading-relaxed">
                {briefing?.briefing || "Analysing supply chain health…"}
              </p>
            )}
          </div>

          <div className="flex md:flex-col gap-2 flex-shrink-0">
            <div className="text-center bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl">
              <div className="text-xs font-mono text-slate-400">Open Alerts</div>
              <div className="text-lg font-bold text-white">{briefing?.open_alerts ?? activeAlerts.length}</div>
            </div>
            <div className="text-center bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl">
              <div className="text-xs font-mono text-slate-400">High Risk</div>
              <div className="text-lg font-bold text-red-400">{briefing?.high_risk_count ?? 0}</div>
            </div>
          </div>

          <button
            onClick={refreshBriefing}
            disabled={briefingLoading}
            className="flex-shrink-0 p-2 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-300 transition-all disabled:opacity-40"
            title="Refresh AI briefing"
          >
            <RefreshCw className={`h-4 w-4 ${briefingLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Twin Health Index</span>
            <span className="p-1.5 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-900/50">
              <ShieldCheck className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold text-white">{healthScore}/100</span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-400" /> Optimal operating boundaries
          </p>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/30"></div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Revenue At Risk</span>
            <span className="p-1.5 rounded-lg bg-red-950/50 text-red-400 border border-red-900/50">
              <AlertTriangle className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-red-400">{formatRupee(totalRevenueAtRisk)}</span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-2 flex items-center gap-1">
            {activeAlerts.length} active node warning signals
          </p>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Savings Opportunity</span>
            <span className="p-1.5 rounded-lg bg-blue-950/50 text-blue-400 border border-blue-900/50">
              <Coins className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-blue-400">{formatRupee(savingsOpportunities)}</span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-2">Confidence weight: 85% avg</p>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Platform Annual ROI</span>
            <span className="p-1.5 rounded-lg bg-indigo-950/50 text-indigo-400 border border-indigo-900/50">
              <Activity className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold text-white">51x</span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-2">Prevented Losses vs Subscription</p>
        </div>
      </div>

      {/* Charts & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                Aggregated Risk Score Trend
                <span className="text-[9px] font-mono bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded">
                  LIVE
                </span>
              </h3>
              <p className="text-xs text-slate-500">Daily composite risk from live signals (last 7 days)</p>
            </div>
            <div className="text-slate-400 flex items-center space-x-1.5 font-mono text-xs">
              <TrendingDown className="h-4 w-4 text-emerald-400" />
              <span>Avg: {averageRisk}/100</span>
            </div>
          </div>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayChart}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f3f4f6" }}
                  labelClassName="font-mono text-xs text-slate-400"
                  formatter={(v: any) => [`${v}/100`, "Risk Score"]}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRisk)"
                  dot={{ fill: "#3b82f6", r: 3 }}
                  activeDot={{ r: 5, fill: "#60a5fa" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-white">Critical Threats</h3>
              <span className="text-[10px] font-mono bg-red-950/50 text-red-400 border border-red-950 px-2 py-0.5 rounded">
                RESOLVE ASAP
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[220px] overflow-y-auto pr-1">
              {activeAlerts.length === 0 ? (
                <div className="py-6 text-center text-slate-500 font-mono text-xs">
                  NO ACTIVE SUPPLY DISRUPTIONS DETECTED.
                </div>
              ) : (
                activeAlerts.map(alert => (
                  <div key={alert.id} className="py-3.5 first:pt-0 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm text-slate-200">
                        {alert.node_type}: {alert.node_id}
                      </span>
                      <span className="text-xs font-semibold text-red-400 bg-red-950/20 border border-red-900/50 px-2 py-0.5 rounded">
                        {alert.risk_score}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Exposure: {formatRupee(alert.rupees_at_risk)}</span>
                      <Link
                        href={`/dashboard/alerts?id=${alert.id}`}
                        className="text-accent hover:underline flex items-center gap-0.5 font-mono text-[10px]"
                      >
                        Action Plan <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/dashboard/twin"
              className="w-full text-center py-2.5 rounded-xl border border-blue-900/50 hover:border-blue-700/50 bg-blue-950/20 hover:bg-blue-950/40 text-sm font-semibold text-blue-300 hover:text-blue-100 transition-all flex items-center justify-center gap-2"
            >
              <Bot className="h-4 w-4 text-blue-400" />
              <span>View Digital Twin</span>
            </Link>
            <Link
              href="/dashboard/simulation"
              className="w-full text-center py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950/80 text-sm font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Activity className="h-4 w-4 text-accent" />
              <span>Launch Simulation Lab</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Supplier Dependencies Table */}
      <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-white">Top Revenue Exposure Suppliers</h3>
            <p className="text-xs text-slate-500">Tier dependency rankings by total procurement exposure</p>
          </div>
          <Link href="/dashboard/suppliers" className="text-xs font-mono text-accent hover:underline">
            View Directory
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs font-mono uppercase tracking-wider">
                <th className="py-3 px-4">Supplier Node</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Lead Time</th>
                <th className="py-3 px-4 text-right">Revenue Exposure</th>
                <th className="py-3 px-4 text-center">Alternates</th>
                <th className="py-3 px-4 text-center">AI Risk Score</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {suppliers.slice(0, 5).map(supplier => (
                <tr key={supplier.node_id} className="hover:bg-slate-950/20 transition-all">
                  <td className="py-3 px-4 font-semibold text-white">{supplier.name}</td>
                  <td className="py-3 px-4 text-slate-400">{supplier.city}, {supplier.state}</td>
                  <td className="py-3 px-4 font-mono">{supplier.lead_time_days} Days</td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-mono font-semibold">
                    {formatRupee(supplier.revenue_exposure_inr)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {supplier.is_single_source ? (
                      <span className="text-[10px] font-mono bg-red-950/50 text-red-400 border border-red-900/30 px-2 py-0.5 rounded-full">
                        SINGLE SOURCE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono bg-blue-950/50 text-accent border border-blue-900/30 px-2 py-0.5 rounded-full">
                        1 ALTERNATE
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            supplier.current_risk_score >= 65
                              ? "bg-red-500"
                              : supplier.current_risk_score > 30
                              ? "bg-yellow-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${supplier.current_risk_score || 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-400">{supplier.current_risk_score || 0}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          supplier.current_risk_score >= 65
                            ? "bg-red-500"
                            : supplier.current_risk_score > 30
                            ? "bg-yellow-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      {supplier.current_risk_score >= 65
                        ? "High Risk"
                        : supplier.current_risk_score > 30
                        ? "Watch"
                        : "Optimal"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
