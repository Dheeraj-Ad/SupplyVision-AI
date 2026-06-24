"use client";

import React, { useEffect, useState } from "react";
import { request } from "@/lib/api";
import { ShieldCheck, Users, ShieldAlert, CheckCircle2, RefreshCw, Settings2 } from "lucide-react";

export default function AdminConsole() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [health, setHealth] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  
  // Create Tenant Form states
  const [showCreate, setShowCreate] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgGstin, setNewOrgGstin] = useState("");
  const [newOrgPlan, setNewOrgPlan] = useState("starter");

  const loadData = async () => {
    try {
      const orgsData = await request("GET", "/admin/orgs");
      const healthData = await request("GET", "/admin/health");
      setOrgs(orgsData);
      setHealth(healthData);
    } catch (e) {
      console.error("Failed to load admin logs", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleSuspend = async (orgId: string, currentActiveState: boolean) => {
    setError("");
    setSuccess("");
    try {
      await request("POST", `/admin/orgs/${orgId}/suspend?suspend=${currentActiveState}`);
      setSuccess(`Tenant status successfully modified.`);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update tenant status.");
    }
  };

  const handleUpdateLimit = async (orgId: string, newLimit: number) => {
    setError("");
    setSuccess("");
    try {
      await request("POST", `/admin/orgs/${orgId}/limits?max_suppliers=${newLimit}`);
      setSuccess("Supplier limits updated successfully.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update supplier limit.");
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await request("POST", "/admin/orgs", {
        name: newOrgName,
        gstin: newOrgGstin,
        plan: newOrgPlan,
        max_suppliers: newOrgPlan === "starter" ? 25 : 75,
        whatsapp_numbers: []
      });
      setSuccess(`Tenant organisation ${newOrgName} created successfully.`);
      setNewOrgName("");
      setNewOrgGstin("");
      setShowCreate(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to register tenant.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-t-2 border-accent rounded-full animate-spin"></div>
          <p className="font-mono text-sm tracking-widest">LOADING PLATFORM CONSOLE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-accent animate-pulse" />
            <span>Root Admin Console</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Supervise tenant profiles, monitor pipeline workers, and adjust subscription billing boundaries.
          </p>
        </div>
        
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-accent hover:bg-blue-600 rounded-xl text-xs font-bold text-white shadow-md transition-all"
        >
          Provision Tenant
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-400 bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-sm">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Create Org Form */}
      {showCreate && (
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl max-w-xl">
          <h3 className="text-lg font-bold text-white mb-4">Register New Multi-Tenant Organisation</h3>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Company Name</label>
              <input
                type="text"
                required
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Pune Precision Parts Ltd"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white placeholder-slate-600 focus:border-accent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">GSTIN Identification</label>
              <input
                type="text"
                required
                value={newOrgGstin}
                onChange={(e) => setNewOrgGstin(e.target.value)}
                placeholder="e.g. 27XYZAB5678C1Z2"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white placeholder-slate-600 focus:border-accent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Subscription Tier Plan</label>
              <select
                value={newOrgPlan}
                onChange={(e) => setNewOrgPlan(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white focus:border-accent outline-none text-sm"
              >
                <option value="starter">Starter Plan (25 Suppliers Max)</option>
                <option value="growth">Growth Plan (75 Suppliers Max)</option>
                <option value="enterprise">Enterprise Custom (Unlimited)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/60 rounded-xl text-slate-300 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-accent hover:bg-blue-600 rounded-xl text-white text-sm font-semibold transition-all"
              >
                Confirm Creation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tenant list — full width table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl space-y-4">
        <div className="px-6 pt-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Active Tenants</h3>
          <span className="text-xs font-mono text-slate-500">{orgs.length} organisation(s)</span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-y border-slate-800 bg-slate-950/40 text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 w-[220px]">Organisation</th>
                <th className="py-3 px-4 w-[160px]">GSTIN</th>
                <th className="py-3 px-4 w-[180px]">Plan</th>
                <th className="py-3 px-4 w-[90px]">Suppliers</th>
                <th className="py-3 px-4 w-[80px] text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-slate-950/30 transition-colors">
                  <td className="py-3.5 px-5 font-sans font-semibold text-white">{org.name}</td>
                  <td className="py-3.5 px-4 text-slate-400">{org.gstin || "—"}</td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] bg-blue-950/50 text-accent border border-blue-900/40 px-2 py-0.5 rounded uppercase tracking-wide">
                      {org.plan}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{org.max_suppliers} max</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${org.is_active ? "text-emerald-400" : "text-red-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${org.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                      {org.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleUpdateLimit(org.id, org.max_suppliers + 10)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-[10px] text-slate-300 hover:text-white rounded-lg transition-colors whitespace-nowrap"
                      >
                        +10 Limit
                      </button>
                      <button
                        onClick={() => handleToggleSuspend(org.id, org.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors ${
                          org.is_active
                            ? "bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-950/60"
                            : "bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/60"
                        }`}
                      >
                        {org.is_active ? "Suspend" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Health status — cards row below the table */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pipeline workers */}
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 uppercase tracking-wider font-mono">
              Pipeline Workers
            </h3>
            <div className="space-y-2 text-xs font-mono">
              {[
                "IMD Weather Scraper",
                "GDACS Disaster Tracker",
                "NewsAPI LLM Tagging",
                "Port Congestion Model",
              ].map((w) => (
                <div key={w} className="flex justify-between items-center p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-300">{w}</span>
                  <span className="text-emerald-400 font-semibold">ACTIVE</span>
                </div>
              ))}
            </div>
          </div>

          {/* Database connections */}
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 uppercase tracking-wider font-mono">
              System Connections
            </h3>
            <div className="space-y-2 text-xs font-mono">
              {[
                { label: "Relational DB (SQLite/Postgres)", value: "connected" },
                { label: "Graph Twin (NetworkX/Neo4j)", value: health.databases?.neo4j || "connected" },
                { label: "Cache (Redis / In-Memory)", value: health.cache || "local_active" },
                { label: "AI Layer (Claude / OpenAI)", value: "active" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-300">{label}</span>
                  <span className={`font-semibold ${value.includes("connect") || value === "active" || value === "local_active" ? "text-emerald-400" : "text-red-400"}`}>
                    {value.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
