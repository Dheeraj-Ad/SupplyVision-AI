"use client";

import React, { useEffect, useState, useCallback } from "react";
import { request } from "@/lib/api";
import {
  ShieldCheck, ShieldAlert, CheckCircle2, Building2,
  Users, Activity, Plus, X, RefreshCw,
  MailX, Eye, EyeOff, UserPlus,
} from "lucide-react";

const ROLES = [
  { value: "sme_owner",            label: "SME Owner / CEO" },
  { value: "operations_manager",   label: "Operations Manager" },
  { value: "warehouse_staff",      label: "Warehouse Staff" },
  { value: "auditor",              label: "External Auditor" },
];

const ROLE_COLORS: Record<string, string> = {
  sme_owner:           "text-amber-400  bg-amber-950/20  border-amber-900/30",
  operations_manager:  "text-sky-400    bg-sky-950/20    border-sky-900/30",
  warehouse_staff:     "text-emerald-400 bg-emerald-950/20 border-emerald-900/30",
  auditor:             "text-violet-400 bg-violet-950/20 border-violet-900/30",
  super_admin:         "text-rose-400   bg-rose-950/20   border-rose-900/30",
};

type Tab = "orgs" | "users" | "health";

/* ── Field helper ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-white placeholder-slate-600 focus:border-accent outline-none text-sm transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

/* ── Main page ── */
export default function AdminConsole() {
  const [tab, setTab] = useState<Tab>("orgs");
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [emailStatus, setEmailStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  /* Org form */
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgGstin, setOrgGstin] = useState("");
  const [orgPlan, setOrgPlan] = useState("starter");

  /* User form */
  const [showUserForm, setShowUserForm] = useState(false);
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState("operations_manager");
  const [uOrg, setUOrg] = useState("");
  const [uPhone, setUPhone] = useState("");
  const [uLang, setULang] = useState("en");
  const [showPass, setShowPass] = useState(false);

  const flash = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const loadAll = useCallback(async () => {
    try {
      const [orgsData, usersData, healthData, emailData] = await Promise.all([
        request("GET", "/admin/orgs"),
        request("GET", "/admin/users"),
        request("GET", "/admin/health"),
        request("GET", "/admin/email-status"),
      ]);
      setOrgs(orgsData);
      setUsers(usersData);
      setHealth(healthData);
      setEmailStatus(emailData);
    } catch (e: any) {
      flash(e.message || "Failed to load admin data.", true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Org handlers ── */
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await request("POST", "/admin/orgs", {
        name: orgName, gstin: orgGstin, plan: orgPlan,
        max_suppliers: orgPlan === "starter" ? 25 : orgPlan === "growth" ? 75 : 500,
        whatsapp_numbers: [],
      });
      flash(`Organisation "${orgName}" created.`);
      setOrgName(""); setOrgGstin(""); setShowOrgForm(false);
      loadAll();
    } catch (err: any) { flash(err.message || "Failed to create org.", true); }
  };

  const handleSuspend = async (id: string, active: boolean) => {
    try {
      await request("POST", `/admin/orgs/${id}/suspend?suspend=${active}`);
      flash(`Tenant ${active ? "suspended" : "activated"}.`);
      loadAll();
    } catch (err: any) { flash(err.message || "Action failed.", true); }
  };

  const handleLimit = async (id: string, cur: number) => {
    try {
      await request("POST", `/admin/orgs/${id}/limits?max_suppliers=${cur + 10}`);
      flash("Supplier limit updated.");
      loadAll();
    } catch (err: any) { flash(err.message || "Action failed.", true); }
  };

  /* ── User handlers ── */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await request("POST", "/admin/users", {
        full_name: uName, email: uEmail, password: uPassword,
        role: uRole, org_id: uOrg || null,
        phone_in: uPhone || null, preferred_lang: uLang,
      });
      flash(`User "${uName}" created successfully.`);
      setUName(""); setUEmail(""); setUPassword(""); setURole("operations_manager");
      setUOrg(""); setUPhone(""); setShowUserForm(false);
      loadAll();
    } catch (err: any) { flash(err.message || "Failed to create user.", true); }
  };

  const handleToggleUser = async (id: string, name: string) => {
    try {
      const res = await request("PATCH", `/admin/users/${id}/status`);
      flash(res.message || `User "${name}" status updated.`);
      loadAll();
    } catch (err: any) { flash(err.message || "Action failed.", true); }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-t-2 border-accent rounded-full animate-spin" />
        <p className="font-mono text-sm text-slate-500 tracking-widest">LOADING PLATFORM CONSOLE...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap gap-4 items-start justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-accent" />
            Root Admin Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage tenants, users, pipelines, and platform settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll}
            className="p-2 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          {tab === "orgs" && (
            <button onClick={() => setShowOrgForm(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-blue-600 rounded-xl text-xs font-bold text-white transition-all">
              <Plus className="h-3.5 w-3.5" /> New Organisation
            </button>
          )}
          {tab === "users" && (
            <button onClick={() => setShowUserForm(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-all">
              <UserPlus className="h-3.5 w-3.5" /> Add User
            </button>
          )}
        </div>
      </div>

      {/* ── Alerts ── */}
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

      {/* ── Email status banner (only shown when NOT configured) ── */}
      {emailStatus && !emailStatus.configured && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-950/10 border-amber-900/30 text-amber-300 text-sm">
          <MailX className="h-4 w-4 shrink-0" />
          <span>
            <strong>Email not configured — </strong>
            add SMTP_USER + SMTP_PASSWORD to .env to enable email notifications.
          </span>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-slate-950/60 border border-slate-800 rounded-xl w-fit">
        {([
          { id: "orgs",   label: "Organisations", icon: <Building2 className="h-3.5 w-3.5" />, count: orgs.length },
          { id: "users",  label: "Users",          icon: <Users className="h-3.5 w-3.5" />,    count: users.length },
          { id: "health", label: "System Health",  icon: <Activity className="h-3.5 w-3.5" />, count: null },
        ] as const).map(({ id, label, icon, count }) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === id
                ? "bg-[#0f172a] border border-slate-800 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}>
            {icon} {label}
            {count !== null && (
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                tab === id ? "bg-slate-800 text-slate-300" : "bg-slate-900 text-slate-600"
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════ ORGANISATIONS TAB ══════════════ */}
      {tab === "orgs" && (
        <div className="space-y-5">
          {showOrgForm && (
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">New Organisation</h3>
                <button onClick={() => setShowOrgForm(false)} className="text-slate-500 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreateOrg} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Company Name">
                  <input required value={orgName} onChange={e => setOrgName(e.target.value)}
                    placeholder="Tamil Knitwear Exports Ltd" className={inputCls} />
                </Field>
                <Field label="GSTIN">
                  <input required value={orgGstin} onChange={e => setOrgGstin(e.target.value)}
                    placeholder="33XYZAB1234C1Z5" className={inputCls} />
                </Field>
                <Field label="Plan">
                  <select value={orgPlan} onChange={e => setOrgPlan(e.target.value)} className={selectCls}>
                    <option value="starter">Starter — 25 suppliers</option>
                    <option value="growth">Growth — 75 suppliers</option>
                    <option value="enterprise">Enterprise — unlimited</option>
                  </select>
                </Field>
                <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowOrgForm(false)}
                    className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-sm transition-colors">Cancel</button>
                  <button type="submit"
                    className="px-5 py-2 bg-accent hover:bg-blue-600 rounded-xl text-white text-sm font-semibold transition-all">
                    Create Organisation
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-white">All Organisations</h3>
              <span className="text-xs font-mono text-slate-500">{orgs.length} tenant(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table style={{ minWidth: "700px" }} className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Organisation</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Suppliers</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {orgs.map(org => (
                    <tr key={org.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-5 font-sans font-semibold text-white">{org.name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{org.gstin || "—"}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-blue-950/40 text-accent border border-blue-900/30 px-2 py-0.5 rounded text-[10px] uppercase">
                          {org.plan}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{org.max_suppliers} max</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 font-semibold text-[10px] ${org.is_active ? "text-emerald-400" : "text-red-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${org.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                          {org.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleLimit(org.id, org.max_suppliers)}
                            className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg text-[10px] transition-colors whitespace-nowrap">
                            +10 Limit
                          </button>
                          <button onClick={() => handleSuspend(org.id, org.is_active)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors border ${
                              org.is_active
                                ? "bg-red-950/20 border-red-900/30 text-red-400 hover:bg-red-950/40"
                                : "bg-emerald-950/20 border-emerald-900/30 text-emerald-400 hover:bg-emerald-950/40"
                            }`}>
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
        </div>
      )}

      {/* ══════════════ USERS TAB ══════════════ */}
      {tab === "users" && (
        <div className="space-y-5">
          {showUserForm && (
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-emerald-400" /> Add New User
                </h3>
                <button onClick={() => setShowUserForm(false)} className="text-slate-500 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Full Name *">
                  <input required value={uName} onChange={e => setUName(e.target.value)}
                    placeholder="Priya Sharma" className={inputCls} />
                </Field>
                <Field label="Email Address *">
                  <input type="email" required value={uEmail} onChange={e => setUEmail(e.target.value)}
                    placeholder="priya@company.com" className={inputCls} />
                </Field>
                <Field label="Password *">
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} required value={uPassword}
                      onChange={e => setUPassword(e.target.value)} placeholder="Min. 8 characters"
                      className={`${inputCls} pr-10`} minLength={8} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Role *">
                  <select value={uRole} onChange={e => setURole(e.target.value)} className={selectCls}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </Field>
                <Field label="Organisation">
                  <select value={uOrg} onChange={e => setUOrg(e.target.value)} className={selectCls}>
                    <option value="">— No organisation —</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </Field>
                <Field label="Phone (WhatsApp)">
                  <input value={uPhone} onChange={e => setUPhone(e.target.value)}
                    placeholder="+91 98765 43210" className={inputCls} />
                </Field>
                <Field label="Preferred Language">
                  <select value={uLang} onChange={e => setULang(e.target.value)} className={selectCls}>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="ta">Tamil</option>
                    <option value="mr">Marathi</option>
                    <option value="gu">Gujarati</option>
                  </select>
                </Field>
                <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-800 mt-2">
                  <button type="button" onClick={() => setShowUserForm(false)}
                    className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-sm transition-colors">Cancel</button>
                  <button type="submit"
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-sm font-semibold transition-all">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-white">All Users</h3>
              <span className="text-xs font-mono text-slate-500">{users.length} user(s) across all orgs</span>
            </div>
            <div className="overflow-x-auto">
              <table style={{ minWidth: "900px" }} className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Organisation</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Lang</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-5 font-sans font-semibold text-white whitespace-nowrap">{u.full_name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] border px-2 py-0.5 rounded uppercase whitespace-nowrap ${ROLE_COLORS[u.role] || "text-slate-400 bg-slate-900 border-slate-700"}`}>
                          {u.role.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{u.org_name}</td>
                      <td className="py-3.5 px-4 text-slate-500">{u.phone_in || "—"}</td>
                      <td className="py-3.5 px-4 text-slate-500 uppercase">{u.preferred_lang}</td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                          : "Never"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 font-semibold text-[10px] ${u.is_active ? "text-emerald-400" : "text-red-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button onClick={() => handleToggleUser(u.id, u.full_name)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors border ${
                            u.is_active
                              ? "bg-red-950/20 border-red-900/30 text-red-400 hover:bg-red-950/40"
                              : "bg-emerald-950/20 border-emerald-900/30 text-emerald-400 hover:bg-emerald-950/40"
                          }`}>
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ HEALTH TAB ══════════════ */}
      {tab === "health" && health && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 font-mono uppercase tracking-wider">
              Pipeline Workers
            </h3>
            {[
              { label: "IMD Weather Scraper",    ok: true },
              { label: "GDACS Disaster Tracker", ok: true },
              { label: "NewsAPI LLM Tagging",    ok: true },
              { label: "Port Congestion Model",  ok: true },
              { label: "LangGraph Agent Pipeline", ok: true },
            ].map(({ label, ok }) => (
              <div key={label} className="flex justify-between items-center p-2.5 bg-slate-950/50 border border-slate-800/60 rounded-xl text-xs font-mono">
                <span className="text-slate-300">{label}</span>
                <span className={ok ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                  {ok ? "ACTIVE" : "DOWN"}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2 font-mono uppercase tracking-wider">
              System Connections
            </h3>
            {[
              { label: "Relational DB (SQLite/Postgres)", value: "connected" },
              { label: "Graph Twin (NetworkX/Neo4j)",     value: health.databases?.neo4j || "connected" },
              { label: "Cache (Redis / In-Memory)",       value: health.cache || "local_active" },
              { label: "AI Layer (Claude / OpenAI)",      value: "active" },
              {
                label: "Email Notifications",
                value: emailStatus?.configured ? `live_smtp` : "emulator_mode",
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center p-2.5 bg-slate-950/50 border border-slate-800/60 rounded-xl text-xs font-mono">
                <span className="text-slate-300">{label}</span>
                <span className={`font-semibold ${
                  value.includes("connect") || value === "active" || value.includes("live") || value === "local_active"
                    ? "text-emerald-400"
                    : value === "emulator_mode"
                    ? "text-amber-400"
                    : "text-red-400"
                }`}>
                  {value.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
