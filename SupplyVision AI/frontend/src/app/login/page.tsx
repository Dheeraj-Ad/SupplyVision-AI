"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Lock, Mail, AlertCircle, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password"); // default password set to 'password' for easy testing
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    }
  };

  // Helper shortcut for user evaluation
  const handleShortcutLogin = async (shortcutEmail: string) => {
    setError("");
    try {
      await login(shortcutEmail, "password");
    } catch (err: any) {
      setError(err.message || "Failed to login via helper shortcut.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030712] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations for Apple Vision Pro style */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pulse-glow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl pulse-glow" style={{ animationDelay: "1.5s" }}></div>

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/30 mb-4 shadow-lg shadow-blue-500/10">
            <ShieldCheck className="h-10 w-10 text-accent" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            SupplyVision <span className="text-accent">AI</span>
          </h2>
          <p className="mt-2 text-sm text-gray-400 font-mono tracking-wider uppercase">
            Decision Intelligence Platform
          </p>
        </div>

        <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/50 to-emerald-500/50"></div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-950/20 border border-red-900/50 p-3 rounded-xl text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                Corporate Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950/50 pl-10 pr-3 py-3 text-white placeholder-slate-600 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                Secure Account PIN / Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950/50 pl-10 pr-3 py-3 text-white placeholder-slate-600 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-500 hover:to-emerald-500 transition-all duration-300 transform active:scale-[0.98]"
            >
              {isLoading ? "AUTHENTICATING SECURE CLAIMS..." : "CONNECT SECURE SESSION"}
            </button>
          </form>
          
          <div className="mt-8 border-t border-slate-800/80 pt-6">
            <div className="text-center mb-4">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                Developer Evaluation Shortcuts
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleShortcutLogin("ramesh@tamilknitwear.com")}
                className="text-left p-2.5 rounded-lg border border-slate-800/80 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/60 text-slate-300 font-mono transition-all"
              >
                Owner: Ramesh (HI)
              </button>
              <button
                type="button"
                onClick={() => handleShortcutLogin("priya@tamilknitwear.com")}
                className="text-left p-2.5 rounded-lg border border-slate-800/80 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/60 text-slate-300 font-mono transition-all"
              >
                Manager: Priya (EN)
              </button>
              <button
                type="button"
                onClick={() => handleShortcutLogin("suresh@tamilknitwear.com")}
                className="text-left p-2.5 rounded-lg border border-slate-800/80 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/60 text-slate-300 font-mono transition-all"
              >
                Staff: Suresh (HI)
              </button>
              <button
                type="button"
                onClick={() => handleShortcutLogin("anjali@ca-associates.in")}
                className="text-left p-2.5 rounded-lg border border-slate-800/80 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/60 text-slate-300 font-mono transition-all"
              >
                Auditor: Anjali (EN)
              </button>
            </div>
            
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => handleShortcutLogin("admin@supplyvision.ai")}
                className="w-full text-center p-2.5 rounded-lg border border-blue-900/30 hover:border-blue-900/60 bg-blue-950/10 hover:bg-blue-950/20 text-accent font-mono transition-all"
              >
                Platform Super Admin (Root)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
