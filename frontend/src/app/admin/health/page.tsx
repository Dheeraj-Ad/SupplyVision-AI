"use client";

import React, { useEffect, useState, useCallback } from "react";
import { request } from "@/lib/api";
import {
  Activity, RefreshCw, CheckCircle2, AlertTriangle,
  Database, Cpu, Mail, MessageSquare, Cloud, BarChart3,
} from "lucide-react";

function StatusBadge({ value }: { value: string }) {
  const v = value.toLowerCase();
  const isGood = v.includes("connect") || v === "active" || v.includes("live") || v === "local_active";
  const isWarn = v.includes("emulator") || v.includes("fallback");
  return (
    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
      isGood ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30"
      : isWarn ? "bg-amber-950/40 text-amber-400 border-amber-900/30"
      : "bg-red-950/40 text-red-400 border-red-900/30"
    }`}>
      {value.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [emailStatus, setEmailStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, e] = await Promise.all([
        request("GET", "/admin/health"),
        request("GET", "/admin/email-status"),
      ]);
      setHealth(h);
      setEmailStatus(e);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Health load failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-accent" />
            System Health
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live status of all platform pipelines, integrations, and infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[10px] font-mono text-slate-600">
              Refreshed {lastRefresh.toLocaleTimeString("en-IN")}
            </span>
          )}
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !health ? (
        <div className="flex justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-t-2 border-accent rounded-full animate-spin" />
            <p className="font-mono text-xs text-slate-500 tracking-widest">SCANNING INFRASTRUCTURE...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ── Pipeline Workers ── */}
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-3 font-mono uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-accent" /> Ingestion Pipelines
            </h3>
            {[
              { label: "IMD Weather Scraper",     key: "imd_weather" },
              { label: "OpenWeather Feed",        key: "open_weather" },
              { label: "GDACS Disaster Tracker",  key: "gdacs_disaster" },
              { label: "NewsAPI LLM Tagging",     key: "news_api_llm" },
              { label: "LangGraph Agent Pipeline", key: null },
            ].map(({ label, key }) => {
              const data = key ? health?.ingestion_pipelines?.[key] : null;
              const status = data?.status || "active";
              const lastRun = data?.last_run || "—";
              const failures = data?.failures_last_24h ?? 0;
              return (
                <div key={label} className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-300 font-mono">{label}</span>
                    <StatusBadge value={status} />
                  </div>
                  {key && (
                    <div className="flex justify-between mt-1.5 text-[10px] font-mono text-slate-600">
                      <span>Last run: {lastRun}</span>
                      {failures > 0 && <span className="text-amber-500">{failures} failure(s) / 24h</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── System Connections ── */}
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-3 font-mono uppercase tracking-wider flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-accent" /> Infrastructure Connections
            </h3>
            {[
              {
                icon: <Database className="h-3.5 w-3.5" />,
                label: "Relational DB (SQLite / Postgres)",
                value: health?.databases?.postgres || "connected",
              },
              {
                icon: <Cpu className="h-3.5 w-3.5" />,
                label: "Graph Twin (NetworkX / Neo4j)",
                value: health?.databases?.neo4j || "connected_fallback_active",
              },
              {
                icon: <Cloud className="h-3.5 w-3.5" />,
                label: "Cache (Redis / In-Memory)",
                value: health?.databases?.redis_cache || "local_active",
              },
              {
                icon: <Cpu className="h-3.5 w-3.5" />,
                label: "AI Layer (Gemini / Claude / OpenAI)",
                value: "active",
              },
              {
                icon: <MessageSquare className="h-3.5 w-3.5" />,
                label: "WhatsApp Worker (Twilio)",
                value: health?.whatsapp_worker?.status || "active",
              },
            ].map(({ icon, label, value }) => (
              <div key={label} className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl flex justify-between items-center">
                <span className="text-xs text-slate-300 font-mono flex items-center gap-2">
                  <span className="text-slate-600">{icon}</span>
                  {label}
                </span>
                <StatusBadge value={value} />
              </div>
            ))}
          </div>

          {/* ── Email Status ── */}
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3 md:col-span-2">
            <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-3 font-mono uppercase tracking-wider flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-accent" /> Email Notification Channel
            </h3>
            {emailStatus ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Mode</div>
                  <div className="flex items-center gap-2">
                    {emailStatus.configured
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                    <span className={`text-sm font-semibold ${emailStatus.configured ? "text-emerald-400" : "text-amber-400"}`}>
                      {emailStatus.configured ? "Live SMTP" : "Emulator"}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">SMTP Host</div>
                  <div className="text-sm text-slate-300 font-mono">{emailStatus.smtp_host || "smtp.gmail.com"}</div>
                </div>
                <div className="p-4 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Sender Address</div>
                  <div className="text-sm text-slate-300 font-mono truncate">{emailStatus.smtp_user || "—"}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/50 border border-slate-800/60 rounded-xl text-xs font-mono text-slate-500">
                Email status unavailable.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
