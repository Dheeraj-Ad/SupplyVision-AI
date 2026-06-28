"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  Lock, Mail, AlertCircle, ArrowRight, ChevronDown,
  Zap, ShieldCheck, Activity, MessageSquare, GitBranch,
  BarChart3, Cpu, Truck, Package, Bell, Send, Check,
} from "lucide-react";

/* ── Animated radar canvas ─────────────────────────────────────────────────── */
function Radar({ size = 180 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const cx = size / 2, cy = size / 2, r = size / 2 - 12;
    let angle = 0;
    const blips = [
      { a: 0.8, d: 0.55, sz: 3, c: [245, 158, 11], fade: 0 },
      { a: 2.1, d: 0.72, sz: 2.5, c: [239, 68, 68], fade: 0 },
      { a: 3.9, d: 0.38, sz: 2, c: [14, 165, 233], fade: 0 },
      { a: 5.2, d: 0.60, sz: 3, c: [245, 158, 11], fade: 0 },
      { a: 1.4, d: 0.85, sz: 2, c: [16, 185, 129], fade: 0 },
    ];
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath(); ctx.arc(cx, cy, r * i / 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(14,165,233,0.10)"; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.strokeStyle = "rgba(14,165,233,0.07)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
      for (let i = 0; i < 60; i++) {
        const a = angle - (i / 60) * Math.PI * 0.7;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.strokeStyle = `rgba(14,165,233,${(1 - i / 60) * 0.16})`;
        ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = "rgba(14,165,233,0.7)"; ctx.lineWidth = 1.5; ctx.stroke();
      blips.forEach(b => {
        const norm = ((angle - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (norm < 0.15) b.fade = 1.0;
        b.fade *= 0.97;
        if (b.fade > 0.04) {
          const dx = cx + Math.cos(b.a) * r * b.d;
          const dy = cy + Math.sin(b.a) * r * b.d;
          const [R, G, B] = b.c;
          ctx.beginPath(); ctx.arc(dx, dy, b.sz, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${R},${G},${B},${b.fade})`; ctx.fill();
          ctx.beginPath(); ctx.arc(dx, dy, b.sz * 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${R},${G},${B},${b.fade * 0.25})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      });
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14,165,233,0.7)"; ctx.fill();
      angle = (angle + 0.022) % (Math.PI * 2);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);
  return <canvas ref={ref} width={size} height={size} className="opacity-90" />;
}

/* ── Animated counter ──────────────────────────────────────────────────────── */
function Counter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = target / 60;
      const tick = () => {
        start = Math.min(start + step, target);
        setVal(Math.round(start));
        if (start < target) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ── Live notification ticker ──────────────────────────────────────────────── */
const TICKER_ITEMS = [
  { icon: "📱", text: "WhatsApp alert sent to Ramesh — Risk score 78/100", color: "text-amber-400" },
  { icon: "📧", text: "Email dispatched to 3 managers — Chennai Port disruption", color: "text-sky-400" },
  { icon: "⚡", text: "Recovery plan generated — 3 options ranked by cost", color: "text-emerald-400" },
  { icon: "🔴", text: "High risk detected: Bangalore supplier — Score 82/100", color: "text-red-400" },
  { icon: "✅", text: "Priya approved Recovery Option 1 via WhatsApp reply", color: "text-emerald-400" },
  { icon: "📊", text: "Weekly digest emailed — 5 alerts, 3 resolved this week", color: "text-violet-400" },
];

function LiveTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % TICKER_ITEMS.length);
        setVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const item = TICKER_ITEMS[idx];
  return (
    <div className="flex items-center gap-3 bg-[#0C1929] border border-[#162840] rounded-xl px-4 py-2.5 text-sm max-w-xl mx-auto">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      <span
        className={`font-mono text-xs transition-opacity duration-300 ${item.color} ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {item.icon} {item.text}
      </span>
    </div>
  );
}

/* ── Quick-login shortcuts ─────────────────────────────────────────────────── */
const SHORTCUTS = [
  { label: "Ramesh — Owner", email: "ramesh@tamilknitwear.com", tag: "SME Owner", color: "amber" },
  { label: "Priya — Ops Manager", email: "priya@tamilknitwear.com", tag: "Operations", color: "sky" },
  { label: "Suresh — Warehouse", email: "suresh@tamilknitwear.com", tag: "Warehouse", color: "emerald" },
  { label: "Anjali — Auditor", email: "anjali@ca-associates.in", tag: "Auditor", color: "violet" },
];

const ROLE_DESCRIPTIONS = [
  { role: "SME Owner / CEO", color: "text-amber-400", border: "border-amber-900/30", bg: "bg-amber-950/10", desc: "Full risk overview, ROI analytics, executive WhatsApp alerts & email digests." },
  { role: "Operations Manager", color: "text-sky-400", border: "border-sky-900/30", bg: "bg-sky-950/10", desc: "Live alert center, recovery plan approvals, simulation engine, auto-notifications." },
  { role: "Warehouse Staff", color: "text-emerald-400", border: "border-emerald-900/30", bg: "bg-emerald-950/10", desc: "Inventory signals, inbound shipment status, and stock-level alerts." },
  { role: "External Auditor", color: "text-violet-400", border: "border-violet-900/30", bg: "bg-violet-950/10", desc: "Read-only audit trail, compliance PDF reports, and risk score history." },
  { role: "Platform Admin", color: "text-rose-400", border: "border-rose-900/30", bg: "bg-rose-950/10", desc: "Multi-tenant console: provision orgs, manage plans, monitor system health." },
];

const COLORS: Record<string, string> = {
  amber:  "border-amber-900/40  bg-amber-950/15  text-amber-300  hover:border-amber-600/50",
  sky:    "border-sky-900/40    bg-sky-950/15    text-sky-300    hover:border-sky-600/50",
  emerald:"border-emerald-900/40 bg-emerald-950/15 text-emerald-300 hover:border-emerald-600/50",
  violet: "border-violet-900/40 bg-violet-950/15 text-violet-300 hover:border-violet-600/50",
};

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { isAuthenticated, isLoading, user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(user?.role === "super_admin" ? "/admin" : "/dashboard");
    }
  }, [isAuthenticated, isLoading, user, router]);

  const scrollToLogin = useCallback(() => {
    loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSigningIn(true);
    try { await login(email, password); }
    catch (err: any) { setLoginError(err.message || "Invalid credentials."); }
    finally { setSigningIn(false); }
  };

  const quickLogin = async (e: string) => {
    setLoginError("");
    setSigningIn(true);
    try { await login(e, "password"); }
    catch (err: any) { setLoginError(err.message || "Login failed."); setSigningIn(false); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#040C18]">
      <div className="w-10 h-10 border-t-2 border-sky-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#040C18] text-[#E2EAF4] antialiased overflow-x-hidden">

      {/* ── Ambient background ───────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-sky-900/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/8 blur-[100px]" />
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full bg-emerald-900/5 blur-[80px]" />
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#040C18]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-900/40">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">
              SupplyVision <span className="text-sky-400">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#3A5A7A] hidden sm:block font-mono">Decision Intelligence Platform</span>
            <button onClick={scrollToLogin}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-all shadow-lg shadow-sky-900/30 active:scale-95">
              Sign In <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="relative max-w-6xl mx-auto px-5">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center pt-20 pb-20">
          <Radar size={180} />

          <div className="mt-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-500/20 bg-sky-500/5 text-sky-400 text-[10px] font-mono tracking-[0.2em] uppercase mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Live Risk Intelligence · Auto Alerts · WhatsApp + Email
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight text-balance mb-6">
            Your supply chain<br />
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-sky-300 bg-clip-text text-transparent">
              sees threats first.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[#5A7A94] max-w-2xl leading-relaxed text-balance mb-8">
            SupplyVision AI watches every supplier 24/7, scores risk with live satellite and port data,
            and automatically sends alerts to your <strong className="text-[#8AAAC0]">WhatsApp</strong> and{" "}
            <strong className="text-[#8AAAC0]">email</strong> — before production stops.
          </p>

          <LiveTicker />

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <button onClick={scrollToLogin}
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-xl shadow-sky-900/40 active:scale-95">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={scrollToLogin}
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-[#1A3050] hover:border-sky-800/60 text-[#6B8DAD] hover:text-sky-300 text-sm font-medium transition-all">
              View Demo
            </button>
          </div>

          <button onClick={scrollToLogin} className="mt-10 text-[#2A4060] hover:text-sky-400 transition-colors">
            <ChevronDown className="h-5 w-5 animate-bounce mx-auto" />
          </button>
        </div>

        {/* ── PROBLEM STATS ────────────────────────────────────────────────── */}
        <div className="mb-24">
          <div className="text-center mb-10">
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">The Problem</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              SMEs lose crores from disruptions<br className="hidden sm:block" /> they never saw coming
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { target: 73, suffix: "%", label: "of Indian SMEs faced a major supply disruption in the last 2 years" },
              { target: 11, suffix: " days", label: "average time an SME takes to detect and react to a supply problem" },
              { target: 40, prefix: "₹", suffix: "L avg loss", label: "per SME annually from unplanned supply chain shocks" },
            ].map(({ target, suffix, prefix, label }) => (
              <div key={label} className="bg-[#080F1C] border border-[#162840] rounded-2xl p-8 text-center hover:border-[#1E3A5F] transition-colors">
                <div className="text-4xl font-extrabold text-amber-400 font-mono mb-3 tabular-nums">
                  <Counter target={target} prefix={prefix} suffix={suffix} />
                </div>
                <div className="text-sm text-[#4E6B8A] leading-snug">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TRUST METRICS BANNER ─────────────────────────────────────────────── */}
        <div className="mb-24 bg-gradient-to-r from-[#080F1C] via-[#0C1929] to-[#080F1C] border border-[#162840] rounded-2xl p-8">
          <p className="text-center text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-6">Platform Impact</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { value: "₹2.3Cr", label: "Avg disruption cost prevented per year", color: "text-emerald-400" },
              { value: "15+", label: "Live risk signals monitored per supplier", color: "text-sky-400" },
              { value: "4", label: "AI agents running every hour automatically", color: "text-violet-400" },
              { value: "<2h", label: "Average time from disruption to alert", color: "text-amber-400" },
            ].map(({ value, label, color }) => (
              <div key={label}>
                <div className={`text-3xl sm:text-4xl font-extrabold font-mono ${color} mb-2`}>{value}</div>
                <div className="text-xs text-[#4E6B8A] leading-snug">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AUTO-NOTIFICATIONS SHOWCASE ──────────────────────────────────── */}
        <div className="mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">Automated Alerts</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-4">
                Every alert triggers an<br />
                <span className="text-sky-400">automatic notification</span>
              </h2>
              <p className="text-[#5A7A94] leading-relaxed mb-6">
                When the AI pipeline detects a risk, it doesn't just raise an alert on a dashboard.
                It immediately sends a formatted WhatsApp message and email to your operations team —
                with the risk score, rupees at risk, and the top recovery option ready to approve.
              </p>
              <div className="space-y-3">
                {[
                  { icon: <MessageSquare className="h-4 w-4" />, text: "WhatsApp message with risk details + one-tap approval", color: "text-emerald-400 bg-emerald-950/20 border-emerald-900/30" },
                  { icon: <Send className="h-4 w-4" />, text: "HTML email with recovery plan options to all managers", color: "text-sky-400 bg-sky-950/20 border-sky-900/30" },
                  { icon: <Bell className="h-4 w-4" />, text: "AI chatbot sends you a digest when you ask for it", color: "text-violet-400 bg-violet-950/20 border-violet-900/30" },
                ].map(({ icon, text, color }) => (
                  <div key={text} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color} text-sm font-medium`}>
                    {icon} {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Mock notification preview */}
            <div className="space-y-3">
              {/* WhatsApp mock */}
              <div className="bg-[#0B1E0B] border border-emerald-900/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">W</div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-300">SupplyVision AI</p>
                    <p className="text-[10px] text-emerald-900">WhatsApp · just now</p>
                  </div>
                  <span className="ml-auto text-[9px] font-mono text-emerald-700 bg-emerald-950/40 px-2 py-0.5 rounded">DELIVERED</span>
                </div>
                <p className="text-xs text-emerald-200 leading-relaxed font-mono">
                  🔴 *ALERT: Bangalore Yarn Supplier*{"\n"}
                  Risk Score: *78/100* | At Risk: *Rs. 4,20,000*{"\n\n"}
                  3 recovery plans ready.{"\n"}
                  Reply *approve 1* to activate the top plan.{"\n"}
                  Reply *status* to see full details.
                </p>
              </div>

              {/* Email mock */}
              <div className="bg-[#080F1C] border border-sky-900/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                    <Send className="h-3 w-3 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-sky-300">[HIGH] Supply Risk Alert: Bangalore Supplier</p>
                    <p className="text-[10px] text-[#2A4060]">to: priya@tamilknitwear.com, ramesh@tamilknitwear.com</p>
                  </div>
                  <span className="ml-auto text-[9px] font-mono text-sky-700 bg-sky-950/40 px-2 py-0.5 rounded">SENT</span>
                </div>
                <div className="flex gap-3">
                  <div className="bg-[#040C18] rounded-lg p-3 flex-1 text-center">
                    <div className="text-2xl font-bold text-red-400 tabular-nums">78</div>
                    <div className="text-[9px] font-mono text-[#2A4060] uppercase mt-1">Risk Score</div>
                  </div>
                  <div className="bg-[#040C18] rounded-lg p-3 flex-1 text-center">
                    <div className="text-lg font-bold text-amber-400">₹4.2L</div>
                    <div className="text-[9px] font-mono text-[#2A4060] uppercase mt-1">At Risk</div>
                  </div>
                  <div className="bg-[#040C18] rounded-lg p-3 flex-1 text-center">
                    <div className="text-2xl font-bold text-sky-400 tabular-nums">3</div>
                    <div className="text-[9px] font-mono text-[#2A4060] uppercase mt-1">Options</div>
                  </div>
                </div>
              </div>

              {/* Approval confirmation mock */}
              <div className="bg-[#080F1C] border border-[#162840] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-300">Recovery Plan Activated</p>
                  <p className="text-[10px] text-[#3A5A7A]">Priya replied "approve 1" — Alternative supplier sourced. Alert resolved.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        <div className="mb-24">
          <div className="text-center mb-12">
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              4 AI agents. Running every hour. Fully automatic.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: "01", icon: <Cpu />, tag: "Intelligence", title: "Pull live signals", desc: "Weather, port congestion, GDACS disasters, news — tagged to your supply chain in real time." },
              { n: "02", icon: <BarChart3 />, tag: "Risk Analysis", title: "Score every node", desc: "Composite risk 0–100: weather × 40% + dependency × 25% + ports × 20% + inventory × 15%." },
              { n: "03", icon: <Activity />, tag: "Impact", title: "Map the blast radius", desc: "Which production lines are affected, which orders are at risk, delay in days." },
              { n: "04", icon: <GitBranch />, tag: "Recovery", title: "Notify + recover", desc: "3 ranked plans generated. Email + WhatsApp sent. One reply to approve and close the loop." },
            ].map(({ n, icon, tag, title, desc }) => (
              <div key={n} className="bg-[#080F1C] border border-[#162840] hover:border-sky-900/50 hover:scale-[1.02] hover:-translate-y-0.5 rounded-2xl p-5 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono text-[#2A4060]">{n}</span>
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 [&>svg]:h-4 [&>svg]:w-4 group-hover:bg-sky-500/20 transition-colors">
                    {icon}
                  </div>
                </div>
                <p className="text-[9px] font-mono tracking-wider uppercase text-sky-500 mb-1.5">{tag}</p>
                <h3 className="font-bold text-sm mb-2 text-[#C8DFF0]">{title}</h3>
                <p className="text-xs text-[#3A5A7A] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 7 CAPABILITIES ───────────────────────────────────────────────── */}
        <div className="mb-24">
          <div className="text-center mb-10">
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">Everything that makes it work</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Zap />, n: "01", title: "Gemini AI — Always On", desc: "Google Gemini 2.5 Flash primary. OpenAI GPT-4o fallback. Rule-based backup. Never goes dark." },
              { icon: <GitBranch />, n: "02", title: "4-Agent AI Pipeline", desc: "LangGraph agents run every hour — intelligence, risk scoring, blast-radius mapping, and recovery." },
              { icon: <BarChart3 />, n: "03", title: "Live Risk Scores", desc: "Real signals, not manual entry. Composite 0–100 score with plain-English AI explanation." },
              { icon: <Truck />, n: "04", title: "Port Congestion Model", desc: "Seasonal model for JNPT, Chennai, Mundra — strike conditions and monsoon spikes included." },
              { icon: <MessageSquare />, n: "05", title: "WhatsApp Approvals", desc: "Alerts to your phone. Reply 'approve 1' to activate a recovery plan — no app needed." },
              { icon: <ShieldCheck />, n: "06", title: "Multi-Tenant Platform", desc: "Isolated orgs, role-based access, plan-based supplier limits. Enterprise-ready from day one." },
              { icon: <Package />, n: "07", title: "Scenario Simulation", desc: "Simulate floods, port strikes, supplier failures. Real risk engine scores every what-if." },
              { icon: <Send />, n: "08", title: "Auto-Notification Hub", desc: "Every alert triggers email + WhatsApp instantly. No manual monitoring needed." },
            ].map(({ icon, n, title, desc }) => (
              <div key={title} className="bg-[#080F1C] border border-[#162840] hover:border-sky-900/50 hover:scale-[1.02] hover:-translate-y-0.5 rounded-2xl p-5 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 [&>svg]:h-3.5 [&>svg]:w-3.5 group-hover:bg-sky-500/20 transition-colors">
                    {icon}
                  </div>
                  <span className="text-[9px] font-mono text-[#2A4060]">{n}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1.5 text-[#C8DFF0]">{title}</h3>
                <p className="text-xs text-[#3A5A7A] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── BUILT FOR ─────────────────────────────────────────────────────── */}
        <div className="mb-24">
          <div className="text-center mb-10">
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">Built For</p>
            <h2 className="text-3xl font-bold tracking-tight text-balance">India's manufacturing SMEs</h2>
            <p className="text-[#4E6B8A] mt-3 max-w-xl mx-auto">
              Companies that power Indian manufacturing but can't afford SAP or a dedicated supply chain team.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { e: "🧵", name: "Textiles", desc: "Yarn & dye suppliers, fabric exporters across Tamil Nadu & Gujarat" },
              { e: "⚙️", name: "Auto Components", desc: "Tier-2/3 suppliers feeding Maruti, Tata, Bajaj across Maharashtra" },
              { e: "💊", name: "Pharma Packaging", desc: "API handlers and packaging companies in Hyderabad & Ahmedabad" },
            ].map(({ e, name, desc }) => (
              <div key={name} className="bg-[#080F1C] border border-[#162840] hover:border-[#1E3A5F] rounded-2xl p-7 text-center transition-colors">
                <div className="text-4xl mb-4">{e}</div>
                <div className="font-bold text-sm mb-2">{name}</div>
                <div className="text-xs text-[#4E6B8A] leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PRICING ───────────────────────────────────────────────────────── */}
        <div id="pricing" className="scroll-mt-24 mb-24">
          <div className="text-center mb-12">
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-[#4E6B8A] text-sm max-w-lg mx-auto">
              Start free. Scale as your supply chain grows. No hidden fees, no SAP-sized bills.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
            {/* Basic */}
            <div className="bg-[#080F1C] border border-[#162840] rounded-2xl p-7 flex flex-col">
              <div className="mb-5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Basic</div>
                <div className="text-4xl font-extrabold text-white">Free</div>
                <div className="text-xs text-[#4E6B8A] mt-1">Forever free · No credit card needed</div>
              </div>
              <ul className="space-y-2.5 flex-1 mb-7">
                {[
                  "Up to 25 suppliers monitored",
                  "AI risk scoring & briefings",
                  "Digital twin visualisation",
                  "Email disruption alerts",
                  "Simulation lab access",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#4E6B8A]">
                    <Check className="h-3.5 w-3.5 text-sky-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#login"
                className="block text-center py-2.5 rounded-xl border border-[#1E3A5F] hover:border-sky-700/60 text-sky-400 hover:text-sky-300 text-sm font-semibold transition-colors">
                Get Started Free
              </a>
            </div>

            {/* Premium — highlighted */}
            <div className="relative bg-gradient-to-b from-sky-950/40 to-[#080F1C] border border-sky-700/50 rounded-2xl p-7 flex flex-col shadow-lg shadow-sky-900/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full font-mono tracking-wider uppercase shadow">
                  Most Popular
                </span>
              </div>
              <div className="mb-5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-sky-400 mb-2">Premium</div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-extrabold text-white">₹1,000</span>
                  <span className="text-sm text-[#4E6B8A] mb-1">/ month</span>
                </div>
                <div className="text-xs text-[#4E6B8A] mt-1">$11 USD · Billed monthly</div>
              </div>
              <ul className="space-y-2.5 flex-1 mb-7">
                {[
                  "Up to 100 suppliers monitored",
                  "Everything in Basic",
                  "WhatsApp disruption alerts",
                  "ROI analytics dashboard",
                  "Recovery plan approvals",
                  "Multi-user team access",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#8BACC8]">
                    <Check className="h-3.5 w-3.5 text-sky-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#login"
                className="block text-center py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold transition-all shadow-md shadow-sky-900/40">
                Start Premium
              </a>
            </div>

            {/* Ultra */}
            <div className="bg-gradient-to-b from-amber-950/20 to-[#080F1C] border border-amber-800/40 rounded-2xl p-7 flex flex-col">
              <div className="mb-5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 mb-2">Ultra</div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-extrabold text-white">₹4,999</span>
                  <span className="text-sm text-[#4E6B8A] mb-1">/ month</span>
                </div>
                <div className="text-xs text-[#4E6B8A] mt-1">$59 USD · Unlimited everything</div>
              </div>
              <ul className="space-y-2.5 flex-1 mb-7">
                {[
                  "Unlimited suppliers",
                  "Unlimited AI usage",
                  "Everything in Premium",
                  "Priority signal ingestion",
                  "Custom onboarding session",
                  "Dedicated support channel",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#4E6B8A]">
                    <Check className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#login"
                className="block text-center py-2.5 rounded-xl border border-amber-700/40 hover:border-amber-600/60 text-amber-300 hover:text-amber-200 text-sm font-semibold transition-colors">
                Contact Sales
              </a>
            </div>
          </div>
        </div>

        {/* ── LOGIN ─────────────────────────────────────────────────────────── */}
        <div ref={loginRef} id="login" className="scroll-mt-24 mb-24">
          <div className="text-center mb-10">
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-sky-400 mb-3">Secure Access</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-3">
              Sign in to your workspace
            </h2>
            <p className="text-[#4E6B8A] text-sm">
              One login. Your dashboard, alerts, and notifications adapt to your role automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

            {/* Role descriptions */}
            <div className="lg:col-span-2 space-y-2.5">
              <p className="text-[10px] font-mono text-[#2A4060] uppercase tracking-wider mb-4">Your view is based on your role</p>
              {ROLE_DESCRIPTIONS.map(({ role, color, border, bg, desc }) => (
                <div key={role} className={`flex gap-3 items-start border ${border} ${bg} rounded-xl p-3.5`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-current ${color}`} />
                  <div>
                    <div className={`text-xs font-semibold mb-0.5 ${color}`}>{role}</div>
                    <div className="text-xs text-[#3A5A7A] leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Login form */}
            <div className="lg:col-span-3 bg-[#080F1C] border border-[#162840] rounded-2xl p-7 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-sky-500/50 via-blue-400/20 to-transparent" />

              {loginError && (
                <div className="flex items-center gap-2 text-red-400 bg-red-950/20 border border-red-900/40 p-3 rounded-xl text-xs mb-5">
                  <AlertCircle className="h-4 w-4 shrink-0" /> <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#3A5A7A] mb-2">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2A4060]" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-[#040C18] border border-[#1A3050] focus:border-sky-500/60 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#1A3050] outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#3A5A7A] mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2A4060]" />
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#040C18] border border-[#1A3050] focus:border-sky-500/60 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#1A3050] outline-none transition-colors" />
                  </div>
                </div>
                <button type="submit" disabled={signingIn}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all active:scale-[0.98] shadow-lg shadow-sky-900/30">
                  {signingIn ? "Signing in…" : "Sign In →"}
                </button>
              </form>

              <div className="border-t border-[#0D1E30] pt-5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#2A4060] mb-3 text-center">
                  Demo accounts — password: <span className="text-sky-500">password</span>
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {SHORTCUTS.map(({ label, email: e, tag, color }) => (
                    <button key={e} type="button" onClick={() => quickLogin(e)} disabled={signingIn}
                      className={`text-left px-3 py-2.5 rounded-xl border text-[11px] font-mono transition-all disabled:opacity-40 ${COLORS[color]}`}>
                      <span className="block font-semibold">{label}</span>
                      <span className="opacity-60">{tag}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => quickLogin("admin@supplyvision.ai")} disabled={signingIn}
                  className="w-full px-3 py-2.5 rounded-xl border border-rose-900/40 bg-rose-950/15 text-rose-300 hover:border-rose-700/50 text-[11px] font-mono transition-all disabled:opacity-40">
                  Platform Super Admin (Root Access)
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 text-center">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-bold text-[#2A4060] text-sm">SupplyVision AI</span>
          </div>
          <p className="text-xs text-[#1A3050] font-mono">
            Decision Intelligence for Indian Manufacturing SMEs · Textiles · Auto · Pharma
          </p>
          <p className="text-[10px] text-[#0D1E30] font-mono mt-2">
            © 2025 SupplyVision AI. Built for Bharat.
          </p>
        </div>
      </footer>

    </div>
  );
}
