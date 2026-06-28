"use client";

import React, { useState } from "react";
import { formatRupee } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { FileText, Download, ShieldCheck, Database, FileSpreadsheet, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function ReportsCenter() {
  const { user } = useAuth();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = (fileType: string, reportName: string) => {
    setIsGenerating(true);
    setSuccess("");
    setError("");
    
    // Simulate generation latency
    setTimeout(() => {
      setIsGenerating(false);
      setSuccess(`Export successfully compiled! downloaded ${reportName}.${fileType.toLowerCase()} to client space.`);
    }, 1500);
  };

  const role = user?.role || "warehouse_staff";

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <FileText className="h-8 w-8 text-accent" />
          <span>Compliance & Reports</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Export supply chain disruption backtests, audit configurations, and risk records for banking due-diligence and insurance audits.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Reports Available", value: "3", color: "text-sky-400" },
          { label: "Protected Value", value: "₹12.4L", color: "text-emerald-400" },
          { label: "Events Audited", value: "4", color: "text-amber-400" },
          { label: "Export Formats", value: "PDF + CSV", color: "text-violet-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 text-center">
            <div className={`text-xl lg:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 font-mono mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {success && (
        <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {isGenerating && (
        <div className="flex items-center space-x-2 text-slate-400 bg-slate-900 border border-slate-800 p-4 rounded-xl text-sm font-mono animate-pulse">
          <div className="w-4 h-4 border-t-2 border-accent rounded-full animate-spin"></div>
          <span>COMPILING EXPORT OBJECTS, GENERATING BINARIES...</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Compliance details */}
        <div className="bg-[#0f172a] border border-slate-800 p-4 lg:p-6 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Auditor Due-Diligence Summary</h3>
          
          <div className="space-y-4 text-xs font-mono">
            <div className="bg-[#090d16] border border-slate-850 p-4 rounded-xl space-y-2">
              <div className="text-slate-500 uppercase">Tenant Verification</div>
              <div className="text-slate-200">GSTIN: 33ABCDE1234F2Z0</div>
              <div className="text-slate-200">Organisation: Tamil Knitwear Exports</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#090d16] border border-slate-850 p-4 rounded-xl">
                <span className="text-slate-500 block uppercase">Disruption Events Flagged</span>
                <span className="text-xl font-extrabold text-white mt-1 block">4 Events</span>
              </div>
              <div className="bg-[#090d16] border border-slate-850 p-4 rounded-xl">
                <span className="text-slate-500 block uppercase">Estimated Protected Value</span>
                <span className="text-xl font-extrabold text-emerald-400 mt-1 block">₹12.40 Lakhs</span>
              </div>
            </div>
            
            <div className="text-slate-500 leading-relaxed">
              * This summary meets the credit-officer requirements for SIDBI working capital reviews and MSME collateral evaluations.
            </div>
          </div>
        </div>

        {/* Available reports */}
        <div className="bg-[#0f172a] border border-slate-800 p-4 lg:p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Export Actions</h3>

          <div className="space-y-4">
            {/* Report 1: Risk History */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-start gap-3 text-xs hover:border-slate-700 transition-colors">
              <div className="space-y-1">
                <div className="font-semibold text-white">Supply Chain Risk Summary Report</div>
                <div className="text-slate-500">Includes score indices, warning histories, and average threat composites.</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleExport("PDF", "Risk_Summary_Report")}
                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-accent"
                  title="PDF Download"
                >
                  <FileText className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => handleExport("CSV", "Risk_Summary_Report")}
                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-emerald-400"
                  title="CSV Export"
                >
                  <FileSpreadsheet className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Report 2: Supplier Performances */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-start gap-3 text-xs hover:border-slate-700 transition-colors">
              <div className="space-y-1">
                <div className="font-semibold text-white">Supplier Audit & Dependents Register</div>
                <div className="text-slate-500">Lists single-source flags, lead-time counts, and exposure limits.</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleExport("PDF", "Supplier_Directory")}
                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-accent"
                  title="PDF Download"
                >
                  <FileText className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => handleExport("CSV", "Supplier_Directory")}
                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-emerald-400"
                  title="CSV Export"
                >
                  <FileSpreadsheet className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Report 3: Audit Trail logs */}
            {role !== "sc_manager" && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-start gap-3 text-xs hover:border-slate-700 transition-colors">
                <div className="space-y-1">
                  <div className="font-semibold text-white">Immutable Operations Audit Logs</div>
                  <div className="text-slate-500">Security check footprint tracking user role changes and plan approvals.</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleExport("PDF", "Immutable_Audit_Logs")}
                    className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-accent"
                    title="PDF Download"
                  >
                    <FileText className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => handleExport("CSV", "Immutable_Audit_Logs")}
                    className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-emerald-400"
                    title="CSV Export"
                  >
                    <FileSpreadsheet className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
