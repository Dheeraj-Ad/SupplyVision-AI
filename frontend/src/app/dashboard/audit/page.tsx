"use client";

import React, { useEffect, useState } from "react";
import { request } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { FolderLock, ShieldAlert, FileCode } from "lucide-react";

export default function SecurityAuditTrail() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await request("GET", "/audit");
        setLogs(data);
      } catch (e) {
        console.error("Failed to load audit logs", e);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Guard page entry based on role
    const role = user?.role;
    if (role === "sme_owner" || role === "auditor" || role === "super_admin") {
      fetchLogs();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const role = user?.role;
  const isAuthorized = role === "sme_owner" || role === "auditor" || role === "super_admin";

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-red-400 bg-red-950/10 border border-red-900/30 p-8 rounded-2xl max-w-xl mx-auto space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-white">Access Violation</h2>
        <p className="text-sm text-center text-slate-400 leading-relaxed">
          Security policy dictates that only SME Owners, CA Auditors, and System Administrators are permitted to inspect the immutable audit logs.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-t-2 border-accent rounded-full animate-spin"></div>
          <p className="font-mono text-sm tracking-widest">LOADING IMMUTABLE SECURITY LEDGERS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <FolderLock className="h-8 w-8 text-accent" />
          <span>Security Audit Trail</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review chronological, cryptographically immutable operational records (Retained for 3 years).
        </p>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs font-mono uppercase tracking-wider bg-[#090d16]/30">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">User Operator</th>
                <th className="py-4 px-6">Action Verb</th>
                <th className="py-4 px-6">Affected Resource</th>
                <th className="py-4 px-6">Meta Context Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 font-mono text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    NO OPERATIONAL RECORDS FOUND.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/15 transition-all">
                    <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-4 px-6 text-slate-200 font-sans font-semibold">
                      {log.user_name}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] uppercase font-bold text-accent bg-blue-950/20 border border-blue-900/30 px-2 py-0.5 rounded">
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {log.resource_type ? `${log.resource_type} (${log.resource_id.substring(0, 8)})` : "N/A"}
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-xs overflow-hidden truncate" title={JSON.stringify(log.meta_json)}>
                        {JSON.stringify(log.meta_json)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
