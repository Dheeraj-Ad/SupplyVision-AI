"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { isOfflineFallbackActive } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  Network,
  BellRing,
  Settings,
  ShieldAlert,
  LogOut,
  FolderLock,
  FileBarChart2,
  Box,
  PlayCircle,
  TrendingUp,
  History,
  Sparkles,
  X,
  CreditCard,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  
  if (!user) return null;

  // Compile active routes based on role permissions
  const role = user.role;
  
  const menuItems = [];

  // Super Admin view is isolated
  if (role === "super_admin") {
    menuItems.push(
      { name: "Tenant Center",   path: "/admin",                icon: Users },
      { name: "Subscriptions",   path: "/admin/subscriptions",  icon: CreditCard },
      { name: "System Health",   path: "/admin/health",         icon: ShieldAlert }
    );
  } else {
    // Normal Tenant Roles
    if (role !== "warehouse_staff") {
      menuItems.push({ name: "CEO Dashboard", path: "/dashboard", icon: LayoutDashboard });
      menuItems.push({ name: "ROI Analytics", path: "/dashboard/roi", icon: TrendingUp });
    }
    
    // Suppliers visible to all, but warehouse is read-only directory
    menuItems.push({ name: "Suppliers Directory", path: "/dashboard/suppliers", icon: Users });
    
    if (role !== "warehouse_staff") {
      menuItems.push({ name: "Digital Twin", path: "/dashboard/twin", icon: Network });
    }
    
    menuItems.push({ name: "Alert Center", path: "/dashboard/alerts", icon: BellRing });
    
    if (role === "sc_manager" || role === "sme_owner" || role === "super_admin") {
      menuItems.push({ name: "Simulation Lab", path: "/dashboard/simulation", icon: PlayCircle });
      menuItems.push({ name: "Historical Replay", path: "/dashboard/replay", icon: History });
    }
    
    menuItems.push({ name: "Inventory", path: "/dashboard/inventory", icon: Box });
    menuItems.push({ name: "Reports Center", path: "/dashboard/reports", icon: FileBarChart2 });
    
    if (role === "sme_owner" || role === "auditor") {
      menuItems.push({ name: "Audit Trail", path: "/dashboard/audit", icon: FolderLock });
    }
    
    if (role === "sme_owner") {
      menuItems.push({ name: "Onboarding Wizard", path: "/onboarding", icon: Sparkles });
      menuItems.push({ name: "Settings", path: "/dashboard/settings", icon: Settings });
    }
  }


  const isOffline = isOfflineFallbackActive();

  return (
    <>
      {/* Mobile backdrop overlay — tapping it closes the sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={[
          /* always-on styling */
          "w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col h-screen shrink-0 text-slate-300",
          /* mobile: fixed off-screen; desktop: in normal flow */
          "fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto",
          /* slide animation */
          "transition-transform duration-300 ease-in-out",
          /* mobile hidden/shown; desktop always visible */
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
      {/* Header logo */}
      <div className="p-6 border-b border-slate-800 flex flex-col space-y-1 bg-[#090d16]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
            <span className="font-bold text-white text-lg tracking-tight">SupplyVision AI</span>
          </div>
          {/* Close button — only visible on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Decision Node</span>
      </div>

      {/* User profile card */}
      <div className="p-4 border-b border-slate-800 bg-[#0c1220]/50">
        <div className="flex flex-col space-y-1">
          <div className="text-sm font-semibold text-white truncate">{user.full_name}</div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-mono bg-blue-950/50 text-accent border border-blue-900/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {role.replace("_", " ")}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate mt-1">
            {role === "super_admin" ? "Platform Administrator" : "Tamil Knitwear Exports"}
          </div>
        </div>
      </div>

      {/* Offline simulator status indicator */}
      {isOffline && (
        <div className="m-3 p-2 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-center">
          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block animate-pulse">
            DEMO SIMULATION ACTIVE
          </span>
          <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
            Running standalone client twin
          </span>
        </div>
      )}

      {/* Navigation menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent/15 text-white border border-accent/25 shadow-lg shadow-accent/5"
                  : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? "text-accent" : "text-slate-500"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/80 hover:text-red-400 hover:bg-red-950/10 border border-transparent hover:border-red-950/30 transition-all"
        >
          <LogOut className="h-4.5 w-4.5 text-red-500/70" />
          <span>Exit Session</span>
        </button>
      </div>
    </div>
    </>
  );
}
