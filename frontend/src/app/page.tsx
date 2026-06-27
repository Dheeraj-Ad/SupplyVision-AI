"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  Lock, Mail, AlertCircle, ArrowRight, ChevronDown,
  Zap, ShieldCheck, Activity, MessageSquare, GitBranch,
  BarChart3, Cpu, Truck, Package
} from "lucide-react";

/* ─────────────────── Radar Canvas ─────────────────── */
function Radar({ size = 160 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = size / 2, cy = size / 2, r = size / 2 - 10;
    let angle = 0;
    const dots = [
      { a: 0.8, d: 0.55, size: 3, col: [245, 158, 11] },
      { a: 2.1, d: 0.72, size: 2.5, col: [239, 68, 68] },
      { a: 3.9, d: 0.38, size: 2, col: [14, 165, 233] },
      { a: 5.2, d: 0.60, size: 3, col: [245, 158, 11] },
      { a: 1.4, d: 0.85, size: 2, col: [16, 185, 129] },
    ].map(d => ({ ...d, fade: 0 }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * i / 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(14,165,233,0.1)";
        ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.strokeStyle = "rgba(14,165,233,0.08)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

      for (let i = 0; i < 60; i++) {
        const a = angle - (i / 60) * Math.PI * 0.7;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.strokeStyle = `rgba(14,165,233,${(1 - i / 60) * 0.15})`;
        ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = "rgba(14,165,233,0.65)"; ctx.lineWidth = 1.5; ctx.stroke();

      dots.forEach(dot => {
        const da = angle - dot.a;
        const norm = ((da % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (norm < 0.15) dot.fade = 1.0;
        dot.fade *= 0.97;
        if (dot.fade > 0.04) {
          const dx = cx + Math.cos(dot.a) * r * dot.d;
          const dy = cy + Math.sin(dot.a) * r * dot.d;
          const [red, green, blue] = dot.col;
          ctx.beginPath();
          ctx.arc(dx, dy, dot.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${red},${green},${blue},${dot.fade})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(dx, dy, dot.size * 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${red},${green},${blue},${dot.fade * 0.25})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      });
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14,165,233,0.6)"; ctx.fill();
      angle += 0.022;
      if (angle > Math.PI * 2) angle -= Math.PI * 2;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);
  return <canvas ref={canvasRef} width={size} height={size} />;
}

/* ─────────────────── Role descriptions ─────────────────── */
const ROLES = [
  { label: "Owner / CEO", desc: "Full supply chain overview, ROI analytics, and strategic risk dashboard.", color: "text-amber-400" },
  { label: "Operations Manager", desc: "Live alerts, recovery plan approvals, and simulation engine.", color: "text-sky-400" },
  { label: "Warehouse Staff", desc: "Inventory signals, inbound shipment status, and stock alerts.", color: "text-emerald-400" },
  { label: "External Auditor", desc: "Read-only audit trail, compliance reports, and risk score history.", color: "text-violet-400" },
  { label: "Platform Admin", desc: "Multi-tenant console: provision orgs, manage plans, monitor system health.", color: "text-rose-400" },
];

/* ─────────────────── Quick-login shortcuts ─────────────────── */
const SHORTCUTS = [
  { label: "Ramesh — Owner", email: "ramesh@tamilknitwear.com", role: "sme_owner", color: "amber" },
  { label: "Priya — Ops Manager", email: "priya@tamilknitwear.com", role: "operations_manager", color: "sky" },
  { label: "Suresh — Warehouse", email: "suresh@tamilknitwear.com", role: "warehouse_staff", color: "emerald" },
  { label: "Anjali — Auditor", email: "anjali@ca-associates.in", role: "auditor", color: "violet" },
];

const COLOR_MAP: Record<string, string> = {
  amber: "border-amber-900/40 bg-amber-950/20 text-amber-300 hover:border-amber-700/60",
  sky: "border-sky-900/40 bg-sky-950/20 text-sky-300 hover:border-sky-700/60",
  emerald: "border-emerald-900/40 bg-emerald-950/20 text-emerald-300 hover:border-emerald-700/60",
  violet: "border-violet-900/40 bg-violet-950/20 text-violet-300 hover:border-violet-700/60",
};

/* ─────────────────── Page ─────────────────── */
export default function LandingPage() {
  const { isAuthenticated, isLoading, user, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);

  // Already authenticated → go to their dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(user?.role === "super_admin" ? "/admin" : "/dashboard");
    }
  }, [isAuthenticated, isLoading, user, router]);

  const scrollToLogin = () =>
    loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSigningIn(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setSigningIn(false);
    }
  };

  const quickLogin = async (shortcutEmail: string) => {
    setLoginError("");
    setSigningIn(true);
    try {
      await login(shortcutEmail, "password");
    } catch (err: any) {
      setLoginError(err.message || "Quick login failed.");
      setSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#060F1E]">
        <div className="w-10 h-10 border-t-2 border-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060F1E] text-[#E2EAF4] font-sans antialiased">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 border-b border-[#162840] bg-[#060F1E]/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <span className="font-bold text-white tracking-tight text-sm">SupplyVision <span className="text-sky-400">AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#4E6B8A] hidden sm:block">Decision Intelligence Platform</span>
          <button
            onClick={scrollToLogin}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-colors"
          >
            Sign In <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 pb-24">

        {/* ── HERO ── */}
        <div className="flex flex-col items-center text-center pt-20 pb-16">
          <Radar size={160} />
          <div className="mt-8 inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 border border-sky-500/25 px-4 py-1.5 rounded-full bg-sky-500/5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Live Risk Intelligence for Indian SMEs
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-balance mb-5">
            Your supply chain is blind.<br />
            <span className="text-sky-400">We give it eyes.</span>
          </h1>
          <p className="text-lg text-[#6B8DAD] max-w-2xl leading-relaxed text-balance mb-10">
            SupplyVision AI watches your entire supplier network 24/7, scores every risk with live weather
            and port data, and tells you exactly what to do — delivered to your WhatsApp before production stops.
          </p>
          <button
            onClick={scrollToLogin}
            className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-900/40 active:scale-95"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={scrollToLogin} className="mt-6 text-[#4E6B8A] hover:text-sky-400 transition-colors">
            <ChevronDown className="h-5 w-5 animate-bounce mx-auto" />
          </button>
        </div>

        {/* ── PROBLEM ── */}
        <div className="mb-20">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">The Problem</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance mb-4">
            Indian SMEs lose crores from disruptions they never saw coming
          </h2>
          <p className="text-[#6B8DAD] max-w-2xl leading-relaxed mb-8">
            A flood in Chennai, a port strike in Mumbai, a vendor going bankrupt in Pune —
            companies find out <strong className="text-[#A0BDD4]">days later</strong> when production has already stopped.
            The damage isn't the event. It's the delay in knowing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { stat: "73%", desc: "of Indian SMEs faced a major supply disruption in the last 2 years" },
              { stat: "11 days", desc: "average time to detect and react to a supply problem" },
              { stat: "₹8–40L", desc: "average annual loss per SME from unplanned supply chain shocks" },
            ].map(({ stat, desc }) => (
              <div key={stat} className="bg-[#0C1929] border border-[#162840] rounded-2xl p-6">
                <div className="text-3xl font-extrabold text-amber-400 font-mono mb-2">{stat}</div>
                <div className="text-sm text-[#6B8DAD] leading-snug">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className="mb-20">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">How It Works</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance mb-8">
            Four AI agents. Running every hour. Automatically.
          </h2>
          <div className="space-y-4">
            {[
              {
                n: "01", tag: "Intelligence Agent", icon: <Cpu className="h-4 w-4 text-sky-400" />,
                title: "Pull live signals from the world",
                desc: "Fetches weather alerts, GDACS disaster reports, port congestion data, and news feeds — tagged to cities and industries in your supply chain."
              },
              {
                n: "02", tag: "Risk Analysis Agent", icon: <BarChart3 className="h-4 w-4 text-sky-400" />,
                title: "Score every supplier and route (0–100)",
                desc: "Composite risk = weather × 40% + dependency × 25% + port congestion × 20% + inventory buffer × 15%. Explained in plain English by Claude AI."
              },
              {
                n: "03", tag: "Impact Agent", icon: <Activity className="h-4 w-4 text-sky-400" />,
                title: "Raise an alert with blast radius",
                desc: "When a node crosses the risk threshold, the system maps which production lines are affected, which orders are at risk, and estimates delay in days."
              },
              {
                n: "04", tag: "Recovery Agent", icon: <GitBranch className="h-4 w-4 text-sky-400" />,
                title: "Generate ranked recovery options",
                desc: "Claude generates 3 recovery plans ranked by cost and speed. Manager approves one via dashboard or WhatsApp reply — 'approve 1' is all it takes."
              },
            ].map(({ n, tag, icon, title, desc }) => (
              <div key={n} className="flex gap-4 items-start">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-full border-2 border-sky-500 bg-sky-500/10 flex items-center justify-center text-xs font-bold font-mono text-sky-400">{n}</div>
                  {n !== "04" && <div className="w-px flex-1 min-h-[28px] bg-gradient-to-b from-sky-500/30 to-transparent mt-1" />}
                </div>
                <div className="bg-[#0C1929] border border-[#162840] rounded-2xl p-5 flex-1 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <span className="text-[9px] font-mono tracking-[0.12em] uppercase text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">{tag}</span>
                  </div>
                  <h3 className="font-semibold text-[#D4E4F4] text-sm mb-1.5">{title}</h3>
                  <p className="text-xs text-[#5A7A94] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FEATURES ── */}
        <div className="mb-20">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">7 Core Capabilities</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance mb-8">Everything that makes it work</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Zap />, title: "Claude AI + Fallback", desc: "Primary brain is Anthropic Claude. Falls back to OpenAI, then built-in rules — always works even without API credits." },
              { icon: <GitBranch />, title: "LangGraph Pipeline", desc: "4 agents compiled as a directed graph. Runs sequentially every hour for every active organisation." },
              { icon: <BarChart3 />, title: "Live Risk Scores", desc: "Every supplier scored from real signals — not manual entry. AI explains the score in plain English." },
              { icon: <Truck />, title: "Port Congestion Model", desc: "Seasonal model for JNPT, Chennai, Mundra. Accounts for monsoon, festive season, and live delay data." },
              { icon: <MessageSquare />, title: "WhatsApp Approvals", desc: "Alerts go to your phone. Reply 'approve 1' to activate a recovery plan — no app login needed." },
              { icon: <ShieldCheck />, title: "Supplier Tier Limits", desc: "Plan-based supplier caps enforced automatically. Starter = 25, Growth = 75, Enterprise = unlimited." },
              { icon: <Package />, title: "Simulation Engine", desc: "What-if scenarios run through the real risk engine. Simulate a flood or strike and see true production impact." },
            ].map(({ icon, title, desc }, i) => (
              <div key={title} className="bg-[#0C1929] border border-[#162840] hover:border-sky-900/60 rounded-2xl p-5 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 [&>svg]:h-3.5 [&>svg]:w-3.5">
                    {icon}
                  </div>
                  <span className="text-[9px] font-mono text-sky-400 tracking-wider">GAP {String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
                <p className="text-xs text-[#5A7A94] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── WHO IT'S FOR ── */}
        <div className="mb-20">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">Built For</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance mb-3">India's manufacturing SMEs</h2>
          <p className="text-[#6B8DAD] mb-8 leading-relaxed">
            Textile mills in Tamil Nadu, auto component makers in Pune, pharma packagers in Hyderabad —
            companies that power Indian manufacturing but can't afford SAP or a dedicated supply chain team.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { emoji: "🧵", name: "Textiles", desc: "Yarn & dye suppliers, fabric exporters across Tamil Nadu & Gujarat" },
              { emoji: "⚙️", name: "Auto Components", desc: "Tier-2/3 suppliers feeding Maruti, Tata, Bajaj across Maharashtra" },
              { emoji: "💊", name: "Pharma Packaging", desc: "API handlers and packaging companies in Hyderabad & Ahmedabad" },
            ].map(({ emoji, name, desc }) => (
              <div key={name} className="bg-[#0C1929] border border-[#162840] rounded-2xl p-5 text-center">
                <div className="text-3xl mb-3">{emoji}</div>
                <div className="font-semibold text-sm mb-1">{name}</div>
                <div className="text-xs text-[#5A7A94] leading-snug">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── LOGIN SECTION ── */}
        <div ref={loginRef} id="login" className="scroll-mt-24">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3 text-center">Secure Access</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance mb-2 text-center">
            Sign in to your workspace
          </h2>
          <p className="text-[#6B8DAD] text-center mb-10 text-sm">
            Your dashboard adapts automatically to your role — no separate login screens.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

            {/* Role descriptions */}
            <div className="space-y-3">
              <p className="text-xs font-mono text-[#4E6B8A] uppercase tracking-wider mb-4">What you get based on your role</p>
              {ROLES.map(({ label, desc, color }) => (
                <div key={label} className="flex gap-3 items-start bg-[#0C1929] border border-[#162840] rounded-xl p-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0" style={{ color: "inherit" }} />
                  <div>
                    <div className={`text-xs font-semibold mb-0.5 ${color}`}>{label}</div>
                    <div className="text-xs text-[#5A7A94] leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Login form */}
            <div className="bg-[#0C1929] border border-[#162840] rounded-2xl p-7 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-sky-500/40 via-sky-400/20 to-transparent" />

              {loginError && (
                <div className="flex items-center gap-2 text-red-400 bg-red-950/20 border border-red-900/40 p-3 rounded-xl text-xs mb-5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#4E6B8A] mb-2">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4E6B8A]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-[#06101E] border border-[#1A3050] focus:border-sky-500/60 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#2A4060] outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#4E6B8A] mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4E6B8A]" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#06101E] border border-[#1A3050] focus:border-sky-500/60 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#2A4060] outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all active:scale-[0.98] shadow-lg shadow-sky-900/30"
                >
                  {signingIn ? "Signing in…" : "Sign In"}
                </button>
              </form>

              {/* Quick shortcuts */}
              <div className="border-t border-[#162840] pt-5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#4E6B8A] mb-3 text-center">
                  Demo shortcuts (password: <span className="text-sky-400">password</span>)
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {SHORTCUTS.map(({ label, email: e, color }) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => quickLogin(e)}
                      disabled={signingIn}
                      className={`text-left px-3 py-2.5 rounded-xl border text-[11px] font-mono transition-all disabled:opacity-40 ${COLOR_MAP[color]}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => quickLogin("admin@supplyvision.ai")}
                  disabled={signingIn}
                  className="w-full px-3 py-2.5 rounded-xl border border-rose-900/40 bg-rose-950/20 text-rose-300 hover:border-rose-700/60 text-[11px] font-mono transition-all disabled:opacity-40"
                >
                  Platform Super Admin (Root Access)
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#162840] py-8 text-center">
        <p className="text-xs text-[#2A4060] font-mono">
          SupplyVision AI — Decision Intelligence for Indian Manufacturing SMEs
        </p>
      </footer>

    </div>
  );
}
