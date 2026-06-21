"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { 
  Sparkles, 
  Settings, 
  ArrowRight, 
  Database, 
  Network, 
  CheckCircle2, 
  Loader2,
  Cpu,
  Activity,
  Layers
} from "lucide-react";

const TEMPLATE_DETAILS: Record<string, any> = {
  textile: {
    title: "Textile Export SME",
    description: "Ideal for apparel manufacturers and yarn mills.",
    nodes: ["Coimbatore Cotton Yarn Mills (Tier-1)", "Tirupur Dyeing & Weaving Co (Tier-1 - Single Source)", "Tirupur Logistics Depot (Warehouse)", "Chennai Port Trust (Maritime Port)"],
    metrics: "Focuses on cotton price volatility, logistics delays along NH-44, and port congestions at Chennai."
  },
  pharma: {
    title: "Pharmaceutical Formulation SME",
    description: "Designed for drug formulation labs and API procurers.",
    nodes: ["Hyderabad API Laboratories (Tier-1 - Single Source)", "Baddi Packaging Solutions (Tier-2)", "Baddi Formulation Warehouse (Warehouse)", "JNPT Port Mumbai (Export/Import Port)"],
    metrics: "Tracks API active chemical delays, temperature-controlled transit, and Baddi industrial area safety stock."
  },
  auto: {
    title: "Auto Components Supplier",
    description: "Perfect for tier-1 pressings and casting suppliers.",
    nodes: ["Chennai Castings & Forgings (Tier-1 - Single Source)", "Pune Precision Pressings (Tier-2)", "Gurugram Assembly Depot (Warehouse)", "JNPT Port Mumbai (Export Port)"],
    metrics: "Calculates OEM line stoppage penalties, steel index costs, and rail freight transit reliability."
  },
  electronics: {
    title: "Electronics Assembler",
    description: "Optimized for smart device and PCB assembly operations.",
    nodes: ["Shenzhen PCB Fab (Tier-1 - Single Source Import)", "Noida Assembling Components (Tier-2)", "Noida Electronics Depot (Warehouse)", "JNPT Port Mumbai (Import Port)"],
    metrics: "Monitors semiconductor/PCB lead times (12+ days), air-freight premium alternatives, and Noida assembly burn rates."
  }
};

export default function OnboardingWizard() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("textile");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [resultData, setResultData] = useState<any>(null);
  
  const { user } = useAuth();
  const router = useRouter();

  const handleOnboard = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const data = await request("POST", "/admin/onboard", {
        industry: selectedIndustry
      });
      setResultData(data);
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during onboarding.");
      setStatus("error");
    }
  };

  if (status === "success" && resultData) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 text-slate-100">
        <div className="max-w-xl w-full bg-[#0b0f19] border border-emerald-500/20 rounded-3xl p-8 relative shadow-[0_0_50px_rgba(16,185,129,0.05)] overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl"></div>
          
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Digital Twin Synthesized</h2>
              <p className="text-sm text-slate-400 font-mono">
                ORGANISATION ID: {user?.org_id || "Tamil Knitwear Exports"}
              </p>
            </div>

            <div className="w-full bg-[#0d1321] border border-slate-800 rounded-2xl p-6 text-left space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-accent border-b border-slate-800 pb-2">
                Initialized Graph Topology
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                <div>
                  <span className="text-slate-500 block text-xs">SUPPLIER NODES</span>
                  <span className="text-white font-semibold">{resultData.counts?.suppliers || 0} Nodes</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">WAREHOUSES</span>
                  <span className="text-white font-semibold">{resultData.counts?.warehouses || 0} Depot</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">SHIPPING ROUTES</span>
                  <span className="text-white font-semibold">{resultData.counts?.routes || 0} Routes</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">GLOBAL PORTS</span>
                  <span className="text-white font-semibold">{resultData.counts?.ports || 0} Connected</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic mt-2">
                * Relational tables populated. Seeding active purchase order logs and safety margins...
              </p>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3.5 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2 text-sm shadow-[0_4px_20px_rgba(59,130,246,0.25)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.35)]"
            >
              <span>Access Control Console</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 text-slate-100 relative overflow-hidden">
      {/* Background Soft Blooms */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-hover/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch relative z-10">
        
        {/* Left Column: Information Card */}
        <div className="md:col-span-5 bg-[#0b0f19] border border-slate-800 rounded-3xl p-8 flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-center text-accent">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h1 className="font-bold text-white tracking-tight">SupplyVision AI</h1>
                <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase block">
                  Tenant Engine
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
                Synthesize Your Supply Chain Digital Twin
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Initialize a pre-configured supply chain network optimized for Indian SME topologies.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800/60 text-xs font-mono text-slate-400">
              <div className="flex items-start space-x-3">
                <Database className="h-4.5 w-4.5 text-accent shrink-0 mt-0.5" />
                <span>Installs local SQLite schemas & seed tables.</span>
              </div>
              <div className="flex items-start space-x-3">
                <Network className="h-4.5 w-4.5 text-accent shrink-0 mt-0.5" />
                <span>Maps coordinates, suppliers, ports, & warehouses.</span>
              </div>
              <div className="flex items-start space-x-3">
                <Settings className="h-4.5 w-4.5 text-accent shrink-0 mt-0.5" />
                <span>Enforces secure separation of tenant network nodes.</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            Secure Onboarding Session &bull; V1.0.0
          </div>
        </div>

        {/* Right Column: Template Picker & Initialize */}
        <div className="md:col-span-7 bg-[#0b0f19] border border-slate-800 rounded-3xl p-8 flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">Select Industry Template</h3>
              <p className="text-xs text-slate-400">Select standard network dependencies below:</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(TEMPLATE_DETAILS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setSelectedIndustry(key)}
                  disabled={status === "loading"}
                  className={`p-4 rounded-2xl text-left border transition-all duration-300 flex flex-col justify-between space-y-3 ${
                    selectedIndustry === key
                      ? "bg-accent/10 border-accent text-white shadow-lg shadow-accent/5"
                      : "bg-[#0d1321] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold tracking-tight block uppercase">
                      {key} Template
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono leading-tight block">
                      {value.description}
                    </span>
                  </div>
                  
                  <span className="text-[10px] font-mono bg-[#070b13] px-2 py-0.5 rounded border border-slate-800 text-slate-400 self-start">
                    {key === "textile" ? "Yarn/Dyeing" : key === "pharma" ? "API/Packaging" : key === "auto" ? "OEM/Steel" : "PCB Import"}
                  </span>
                </button>
              ))}
            </div>

            {/* Selection Node Details Preview */}
            <div className="bg-[#070b13] border border-slate-800 rounded-2xl p-5 space-y-3 text-xs font-mono">
              <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2">
                <Cpu className="h-4 w-4 text-accent" />
                <span className="text-slate-300 font-semibold uppercase">
                  {TEMPLATE_DETAILS[selectedIndustry].title} Preview
                </span>
              </div>
              
              <div className="space-y-1.5 text-slate-400">
                <span className="text-slate-500 block uppercase text-[10px] tracking-wider">Topology Nodes:</span>
                <ul className="list-disc pl-4 space-y-1">
                  {TEMPLATE_DETAILS[selectedIndustry].nodes.map((node: string, index: number) => (
                    <li key={index}>{node}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-800/50">
                <span className="text-slate-500 block uppercase text-[10px] tracking-wider">Disruption Feeds:</span>
                <p className="text-slate-400 leading-relaxed">
                  {TEMPLATE_DETAILS[selectedIndustry].metrics}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl text-xs font-mono text-red-400">
                ERROR: {errorMsg}
              </div>
            )}
          </div>

          <button
            onClick={handleOnboard}
            disabled={status === "loading"}
            className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3.5 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2 text-sm shadow-[0_4px_20px_rgba(59,130,246,0.25)] disabled:opacity-50"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                <span>Building Digital Twin Graph...</span>
              </>
            ) : (
              <>
                <span>Generate SME Topology</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
