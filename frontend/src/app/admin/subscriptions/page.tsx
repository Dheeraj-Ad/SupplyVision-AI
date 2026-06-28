"use client";

import React, { useEffect, useState, useCallback } from "react";
import { request } from "@/lib/api";
import { CreditCard, RefreshCw, CheckCircle2, ShieldAlert, Zap, Crown, Star } from "lucide-react";

const PLANS = [
  {
    key: "basic",
    label: "Basic",
    price: "Free",
    priceDetail: "Forever free",
    maxSuppliers: 25,
    color: "text-slate-300",
    border: "border-slate-700",
    bg: "bg-slate-900/40",
    badge: "bg-slate-800 text-slate-300 border-slate-700",
    icon: <Star className="h-4 w-4" />,
    features: ["Up to 25 suppliers", "AI risk scoring", "Email alerts", "Digital twin viewer"],
  },
  {
    key: "premium",
    label: "Premium",
    price: "₹1,000",
    priceDetail: "$11 / month",
    maxSuppliers: 100,
    color: "text-blue-300",
    border: "border-blue-800/50",
    bg: "bg-blue-950/20",
    badge: "bg-blue-950/60 text-blue-300 border-blue-800/50",
    icon: <Zap className="h-4 w-4" />,
    features: ["Up to 100 suppliers", "Advanced AI briefings", "WhatsApp alerts", "Simulation lab", "ROI analytics"],
  },
  {
    key: "ultra",
    label: "Ultra",
    price: "₹4,999",
    priceDetail: "$59 / month",
    maxSuppliers: null,
    color: "text-amber-300",
    border: "border-amber-700/50",
    bg: "bg-amber-950/15",
    badge: "bg-amber-950/60 text-amber-300 border-amber-700/50",
    icon: <Crown className="h-4 w-4" />,
    features: ["Unlimited suppliers", "Unlimited AI usage", "Priority ingestion", "Custom onboarding", "Dedicated support"],
  },
];

// Normalise legacy plan names to canonical keys
function normalisePlan(plan: string): string {
  if (!plan) return "basic";
  const p = plan.toLowerCase();
  if (p === "starter") return "basic";
  if (p === "growth") return "premium";
  if (p === "enterprise") return "ultra";
  return p;
}

function PlanBadge({ plan }: { plan: string }) {
  const key = normalisePlan(plan);
  const cfg = PLANS.find(p => p.key === key) || PLANS[0];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${cfg.badge}`}>
      {cfg.icon} {cfg.label.toUpperCase()}
    </span>
  );
}

export default function SubscriptionsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orgsData, usersData] = await Promise.all([
        request("GET", "/admin/orgs"),
        request("GET", "/admin/users"),
      ]);
      setOrgs(orgsData);
      setUsers(usersData);
    } catch (e: any) {
      setError(e.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const changePlan = async (orgId: string, plan: string) => {
    setUpdating(orgId);
    try {
      await request("POST", `/admin/orgs/${orgId}/plan?plan=${plan}`);
      flash(`Plan updated to ${plan}.`);
      load();
    } catch (e: any) {
      flash(e.message || "Failed to update plan.", true);
    } finally {
      setUpdating(null);
    }
  };

  const getUserCount = (orgId: string) => users.filter(u => u.org_id === orgId).length;

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-t-2 border-accent rounded-full animate-spin" />
        <p className="font-mono text-xs text-slate-500 tracking-widest">LOADING SUBSCRIPTIONS...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CreditCard className="h-6 w-6 text-accent" />
            Subscriptions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View and manage each organisation's subscription plan.
          </p>
        </div>
        <button onClick={load}
          className="p-2 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-950/20 border border-red-900/40 p-3.5 rounded-xl text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 p-3.5 rounded-xl text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {/* Plan Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map(plan => (
          <div key={plan.key} className={`${plan.bg} border ${plan.border} rounded-2xl p-5 space-y-4`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 font-bold text-sm ${plan.color}`}>
                {plan.icon} {plan.label}
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${plan.badge}`}>
                {orgs.filter(o => normalisePlan(o.plan) === plan.key).length} org(s)
              </span>
            </div>
            <div>
              <div className={`text-2xl font-extrabold ${plan.color}`}>{plan.price}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">{plan.priceDetail}</div>
            </div>
            <ul className="space-y-1.5">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span className={`w-1 h-1 rounded-full flex-shrink-0 bg-current ${plan.color}`} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Org Subscription Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white">Organisation Plans</h3>
          <span className="text-xs font-mono text-slate-500">{orgs.length} organisation(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table style={{ minWidth: "700px" }} className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950/50 text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Organisation</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4">Current Plan</th>
                <th className="py-3 px-4 text-center">Users</th>
                <th className="py-3 px-4 text-center">Supplier Limit</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Change Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {orgs.map(org => {
                const currentKey = normalisePlan(org.plan);
                const userCount = getUserCount(org.id);
                return (
                  <tr key={org.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-5 font-sans font-semibold text-white">{org.name}</td>
                    <td className="py-4 px-4 text-slate-500">{org.gstin || "—"}</td>
                    <td className="py-4 px-4">
                      <PlanBadge plan={org.plan} />
                    </td>
                    <td className="py-4 px-4 text-center text-slate-300">{userCount}</td>
                    <td className="py-4 px-4 text-center text-slate-300">
                      {org.max_suppliers >= 99999 ? "Unlimited" : org.max_suppliers}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${org.is_active ? "text-emerald-400" : "text-red-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${org.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                        {org.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {PLANS.filter(p => p.key !== currentKey).map(p => (
                          <button key={p.key}
                            onClick={() => changePlan(org.id, p.key)}
                            disabled={updating === org.id}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors border whitespace-nowrap ${p.badge} hover:opacity-80 disabled:opacity-40`}>
                            {updating === org.id ? "..." : `→ ${p.label}`}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
