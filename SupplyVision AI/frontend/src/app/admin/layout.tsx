"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import Sidebar from "@/components/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

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
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Panel Content */}
      <main className="flex-1 flex flex-col overflow-y-auto relative bg-[#030712]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-900/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="p-8 max-w-7xl w-full mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
