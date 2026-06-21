"use client";

import React, { useState } from "react";
import { formatRupee } from "@/lib/utils";
import { Settings, ShieldAlert, CheckCircle2, UserPlus, BellRing, Phone } from "lucide-react";

export default function SettingsCenter() {
  const [threshold, setThreshold] = useState(65);
  const [numbers, setNumbers] = useState("+919876543210, +919876543211");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [invitedRole, setInvitedRole] = useState("sc_manager");
  
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("Alert configurations updated. Twilio workers re-routed.");
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitedEmail) return;
    setSuccess(`Invite magic link dispatched via WhatsApp to user ${invitedEmail}.`);
    setInvitedEmail("");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Settings className="h-8 w-8 text-accent" />
          <span>System Settings</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure notification recipient numbers, alter scoring warning thresholds, and provision team members.
        </p>
      </div>

      {success && (
        <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Settings 1: Alert Configurations */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
            <BellRing className="h-5 w-5 text-accent" />
            <span>Alert Preferences</span>
          </h3>

          <form onSubmit={handleSaveThreshold} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                Scoring Alert Threshold
              </label>
              <input
                type="number"
                min="30"
                max="95"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white focus:border-accent outline-none text-sm font-mono"
              />
              <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                Cross-matching weather and port scores will fire Twilio webhooks if composite value exceeds {threshold}.
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                WhatsApp Recipient Numbers
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Phone className="h-4.5 w-4.5" />
                </span>
                <input
                  type="text"
                  value={numbers}
                  onChange={(e) => setNumbers(e.target.value)}
                  placeholder="+919876543210, +919876543211"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/50 pl-10 pr-3 py-2.5 text-white focus:border-accent outline-none text-sm font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                Comma separated mobile phone numbers with international prefix.
              </span>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-accent hover:bg-blue-600 rounded-xl text-xs font-bold text-white transition-all shadow-md"
            >
              Update Preferences
            </button>
          </form>
        </div>

        {/* Settings 2: User invites */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent" />
            <span>Invite Team Member</span>
          </h3>

          <form onSubmit={handleInviteUser} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
              <input
                type="email"
                required
                value={invitedEmail}
                onChange={(e) => setInvitedEmail(e.target.value)}
                placeholder="coworker@tamilknitwear.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white placeholder-slate-600 focus:border-accent outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Access Role</label>
              <select
                value={invitedRole}
                onChange={(e) => setInvitedRole(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white focus:border-accent outline-none text-sm"
              >
                <option value="sc_manager">Supply Chain Manager</option>
                <option value="warehouse_staff">Warehouse Storekeeper</option>
                <option value="auditor">CA Compliance Auditor</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 rounded-xl text-xs font-bold text-white transition-all shadow-md"
            >
              Send Invitation Link
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
