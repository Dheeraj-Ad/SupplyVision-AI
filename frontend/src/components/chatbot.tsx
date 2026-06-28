"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Zap, ChevronDown, Mail, Cloud, AlertTriangle, BarChart2, Network, FlaskConical } from "lucide-react";
import Link from "next/link";
import { request } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

interface Message {
  role: "user" | "assistant";
  content: string;
  ai_powered?: boolean;
  ai_provider?: string;
}

const QUICK_QUESTIONS = [
  { label: "Top risky suppliers", q: "Which suppliers have the highest risk scores right now?", icon: AlertTriangle },
  { label: "Weather check", q: "Check weather in Chennai", icon: Cloud },
  { label: "Open alerts", q: "What open alerts need my attention today?", icon: AlertTriangle },
  { label: "Test email", q: "Send test email", icon: Mail },
  { label: "Risk scores explained", q: "How do I read and understand the risk scores?", icon: BarChart2 },
  { label: "Digital twin", q: "What does the digital twin show me?", icon: Network },
  { label: "Run simulation", q: "How does the simulation lab work?", icon: FlaskConical },
  { label: "Email me summary", q: "Email me a summary of today's supply chain status", icon: Mail },
];

// Action chips: if AI reply mentions these keywords, show a nav link
const ACTION_CHIPS: { match: RegExp; label: string; href: string }[] = [
  { match: /alert center|open alert/i,       label: "→ Alert Center",    href: "/dashboard/alerts" },
  { match: /simulation lab|simulate/i,        label: "→ Simulation Lab",  href: "/dashboard/simulation" },
  { match: /digital twin/i,                   label: "→ Digital Twin",    href: "/dashboard/twin" },
  { match: /supplier/i,                       label: "→ Suppliers",       href: "/dashboard/suppliers" },
  { match: /roi analytic|revenue/i,           label: "→ ROI Analytics",   href: "/dashboard/roi" },
  { match: /inventory|stock/i,                label: "→ Inventory",       href: "/dashboard/inventory" },
  { match: /report/i,                         label: "→ Reports",         href: "/dashboard/reports" },
];

function providerLabel(provider?: string) {
  if (provider === "gemini")    return "Gemini AI";
  if (provider === "anthropic") return "Claude AI";
  if (provider === "openai")    return "GPT-4o";
  if (provider === "email-service") return "Email sent";
  return "Rule-based";
}

function providerColor(provider?: string) {
  if (provider === "gemini")    return "text-blue-400";
  if (provider === "anthropic") return "text-violet-400";
  if (provider === "openai")    return "text-emerald-400";
  if (provider === "email-service") return "text-sky-400";
  return "text-slate-600";
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  // Detect action chips from AI reply
  const chips = isUser ? [] : ACTION_CHIPS.filter(c => c.match.test(msg.content));

  // Render content preserving newlines and bold (**text**)
  function renderContent(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
    return parts.map((part, i) => {
      if (part === "\n") return <br key={i} />;
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isUser
          ? "bg-accent/20 border border-accent/40"
          : "bg-slate-800 border border-slate-700"
      }`}>
        {isUser
          ? <User className="h-3.5 w-3.5 text-accent" />
          : <Bot className="h-3.5 w-3.5 text-slate-400" />
        }
      </div>

      {/* Bubble + chips */}
      <div className={`max-w-[82%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-accent text-white rounded-tr-sm"
            : "bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-sm"
        }`}>
          {renderContent(msg.content)}
        </div>

        {/* AI badge */}
        {!isUser && msg.ai_powered !== undefined && (
          <div className="flex items-center gap-1 px-1">
            <Zap className={`h-2.5 w-2.5 ${msg.ai_powered ? providerColor(msg.ai_provider) : "text-slate-600"}`} />
            <span className={`text-[9px] font-mono ${msg.ai_powered ? providerColor(msg.ai_provider) : "text-slate-600"}`}>
              {msg.ai_powered ? providerLabel(msg.ai_provider) : "rule-based"}
            </span>
          </div>
        )}

        {/* Action chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {chips.map(chip => (
              <Link
                key={chip.href}
                href={chip.href}
                className="text-[10px] font-mono text-accent border border-accent/30 bg-accent/10 hover:bg-accent/20 px-2 py-0.5 rounded-full transition-colors"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chatbot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const role = user?.role || "user";
      const name = user?.full_name?.split(" ")[0] || "there";
      const greet =
        role === "warehouse_staff"
          ? `Hi ${name}! I can help with stock levels, warehouse alerts, and inventory. What do you need?`
          : role === "auditor"
          ? `Hi ${name}! I can explain risk scores, audit trails, and compliance metrics. What do you need?`
          : `Hi ${name}! I'm SupplyVision AI — your supply chain co-pilot. Ask me about risks, weather, suppliers, alerts, or type "test email" to verify SMTP.`;
      setMessages([{ role: "assistant", content: greet }]);
    }
    if (open) {
      setUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const data = await request("POST", "/chat/message", {
        message: text.trim(),
        history: history.slice(0, -1),
      });
      const aiMsg: Message = {
        role: "assistant",
        content: data.reply,
        ai_powered: data.ai_powered,
        ai_provider: data.ai_provider,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (!open) setUnread(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach the AI service. Please try again or check the dashboard directly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent shadow-lg shadow-blue-900/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open AI assistant"
      >
        {open ? (
          <ChevronDown className="h-6 w-6 text-white" />
        ) : (
          <MessageSquare className="h-6 w-6 text-white" />
        )}
        {unread && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#030712]" />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[440px] max-h-[640px] flex flex-col rounded-2xl border border-slate-800 bg-[#0f172a] shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0a0f1e] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none">SupplyVision AI</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Supply chain co-pilot · ask anything</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick questions (show only at start) */}
          {messages.length <= 1 && !loading && (
            <div className="px-3 pb-2 grid grid-cols-2 gap-1.5 shrink-0">
              {QUICK_QUESTIONS.map(({ label, q, icon: Icon }) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 hover:border-slate-600 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors text-left flex items-center gap-1.5 truncate"
                >
                  <Icon className="h-3 w-3 shrink-0 text-slate-500" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3 border-t border-slate-800 shrink-0"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about risks, weather, alerts, email…"
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-accent/60 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-slate-600 outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
