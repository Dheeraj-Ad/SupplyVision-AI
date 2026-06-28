"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import dynamic from "next/dynamic";
import Sidebar from "@/components/sidebar";
import { Menu } from "lucide-react";

const Chatbot = dynamic(() => import("@/components/chatbot"), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030712] text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-t-2 border-accent rounded-full animate-spin"></div>
          <p className="font-mono text-sm tracking-widest">LOADING SECURE USER SPACE...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Panel Content */}
      <main className="flex-1 flex flex-col overflow-y-auto relative bg-[#030712] min-w-0">
        {/* Mobile top bar — only shown on small screens */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-slate-800 bg-[#0f172a] shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-bold text-white text-sm tracking-tight">SupplyVision AI</span>
          </div>
        </div>

        {/* Soft bloom backdrop shadows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-900/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-900/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="p-4 lg:p-8 max-w-7xl w-full mx-auto relative z-10">
          {children}
        </div>
      </main>

      {/* AI chatbot — floats over all dashboard pages */}
      <Chatbot />
    </div>
  );
}
