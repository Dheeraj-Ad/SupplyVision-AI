"use client";

import React, { useEffect, useState } from "react";
import { request } from "@/lib/api";
import { formatRupee } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { Plus, Trash2, ShieldAlert, Users, PlusCircle, CheckCircle2 } from "lucide-react";

export default function SuppliersDirectory() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [category, setCategory] = useState("yarn");
  const [leadTime, setLeadTime] = useState(5);
  const [isSingleSource, setIsSingleSource] = useState(false);
  const [tier, setTier] = useState(2);
  const [exposure, setExposure] = useState(500000);

  const fetchSuppliers = async () => {
    try {
      const data = await request("GET", "/suppliers");
      setSuppliers(data);
    } catch (e) {
      console.error("Failed to load suppliers", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    try {
      await request("POST", "/suppliers", {
        name,
        city,
        state,
        location_lat: 11.0, // default dummy geocodes
        location_lng: 77.0,
        category,
        lead_time_days: Number(leadTime),
        is_single_source: isSingleSource,
        tier: Number(tier),
        revenue_exposure_inr: Number(exposure)
      });
      
      setSuccess(`Supplier ${name} registered and digital twin updated.`);
      setName("");
      setCity("");
      setState("");
      setShowAddForm(false);
      fetchSuppliers();
    } catch (err: any) {
      setError(err.message || "Failed to register supplier.");
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm("Are you sure you want to delete this supplier from the digital twin?")) return;
    setError("");
    setSuccess("");
    
    try {
      await request("DELETE", `/suppliers/${supplierId}`);
      setSuccess("Supplier node removed from network topology.");
      fetchSuppliers();
    } catch (err: any) {
      setError(err.message || "Failed to remove supplier.");
    }
  };

  const role = user?.role || "warehouse_staff";
  const canAdd = role === "sc_manager" || role === "sme_owner" || role === "super_admin";
  const canDelete = role === "sme_owner" || role === "super_admin";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-t-2 border-accent rounded-full animate-spin"></div>
          <p className="font-mono text-sm tracking-widest">LOADING SUPPLIER REGISTER...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-accent" />
            <span>Supplier Directory</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and manage node assets and contract dependencies in the digital twin.
          </p>
        </div>

        {canAdd && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Onboard Supplier</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-400 bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-sm">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Supplier Form Modal */}
      {showAddForm && (
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl max-w-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-accent" />
            <span>Register New Supply Node</span>
          </h3>
          <form onSubmit={handleAddSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Supplier Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Coimbatore Dyeing Corp"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white placeholder-slate-600 focus:border-accent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white focus:border-accent outline-none text-sm"
              >
                <option value="yarn">Yarn Manufacturing</option>
                <option value="dyeing">Dyeing & Wet Processing</option>
                <option value="fabric">Fabric Traders</option>
                <option value="accessories">Trims & Buttons</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Coimbatore"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white placeholder-slate-600 focus:border-accent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">State</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Tamil Nadu"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white placeholder-slate-600 focus:border-accent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Lead Time (Days)</label>
              <input
                type="number"
                required
                min={1}
                value={leadTime}
                onChange={(e) => setLeadTime(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white focus:border-accent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Procurement Exposure (INR)</label>
              <input
                type="number"
                required
                min={0}
                value={exposure}
                onChange={(e) => setExposure(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white focus:border-accent outline-none text-sm font-mono text-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Critical Tier Level</label>
              <select
                value={tier}
                onChange={(e) => setTier(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white focus:border-accent outline-none text-sm"
              >
                <option value={1}>Tier 1 - Critical Business Line</option>
                <option value={2}>Tier 2 - Important Core Assets</option>
                <option value={3}>Tier 3 - Standard Alternative</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSingleSource}
                  onChange={(e) => setIsSingleSource(e.target.checked)}
                  className="rounded border-slate-800 text-accent focus:ring-accent bg-slate-950/50 h-4 w-4"
                />
                <span>Is Single Source (High Risk)</span>
              </label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/60 rounded-xl text-slate-300 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-accent hover:bg-blue-600 rounded-xl text-white text-sm font-semibold transition-all shadow-lg"
              >
                Confirm Node
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs font-mono uppercase tracking-wider bg-[#090d16]/30">
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Lead Time</th>
                <th className="py-4 px-6">Exposure Value</th>
                <th className="py-4 px-6">Dependency</th>
                <th className="py-4 px-6">Reliability</th>
                <th className="py-4 px-6 text-center">Disruption Index</th>
                {canDelete && <th className="py-4 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 8 : 7} className="py-12 text-center text-slate-500 font-mono">
                    NO REGISTERED SUPPLIERS FOUND.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.node_id} className="hover:bg-slate-950/15 transition-all">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-white">{supplier.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{supplier.city}, {supplier.state}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] font-mono bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400 uppercase">
                        {supplier.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-200">{supplier.lead_time_days} Days</td>
                    <td className="py-4 px-6 text-emerald-400 font-mono font-semibold">
                      {formatRupee(supplier.revenue_exposure_inr || 0)}
                    </td>
                    <td className="py-4 px-6">
                      {supplier.is_single_source ? (
                        <span className="text-[10px] font-mono text-red-400 bg-red-950/20 border border-red-950/50 px-2 py-0.5 rounded-full uppercase">
                          Single Source
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-blue-400 bg-blue-950/20 border border-blue-950/50 px-2 py-0.5 rounded-full uppercase">
                          Multi Source
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-400">{supplier.reliability_score || "95"}%</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        supplier.current_risk_score >= 65
                          ? "text-red-400 bg-red-950/30 border border-red-900/40"
                          : supplier.current_risk_score > 30
                          ? "text-yellow-400 bg-yellow-950/30 border border-yellow-900/40"
                          : "text-emerald-400 bg-emerald-950/30 border border-emerald-900/40"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          supplier.current_risk_score >= 65 ? "bg-red-500" : supplier.current_risk_score > 30 ? "bg-yellow-500" : "bg-emerald-500"
                        }`}></span>
                        {supplier.current_risk_score || 0} Risk
                      </span>
                    </td>
                    {canDelete && (
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDeleteSupplier(supplier.node_id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-all"
                          title="Remove Node"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    )}
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
