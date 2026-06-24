"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import Sidebar from "@/components/sidebar";
import { Menu } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role !== "super_admin") {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030712] text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-t-2 border-accent rounded-full animate-spin"></div>
          <p className="font-mono text-sm tracking-widest">CONNECTING TO PLATFORM KERNEL...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "super_admin") return null;

  return (
    <div className="flex h-screen bg-[#030712] overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col overflow-y-auto relative bg-[#030712] min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-slate-800 bg-[#0f172a] shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-white text-sm">Admin Panel</span>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-900/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="p-4 lg:p-8 max-w-7xl w-full mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
