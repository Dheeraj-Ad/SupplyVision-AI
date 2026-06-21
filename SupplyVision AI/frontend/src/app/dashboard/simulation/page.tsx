"use client";

import React, { useState } from "react";
import { request } from "@/lib/api";
import { formatRupee } from "@/lib/utils";
import { PlayCircle, ShieldAlert, CheckCircle2, TrendingUp, Info, HelpCircle } from "lucide-react";

export default function SimulationLab() {
  const [scenario, setScenario] = useState("cyclone");
  const [locationName, setLocationName] = useState("Supplier S1");
  const [severity, setSeverity] = useState(3);
  
  // Results
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRunSimulation = async (inject: boolean = false) => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await request("POST", `/twin/simulate?inject=${inject}`, {
        scenario,
        location_name: locationName,
        severity
      });
      setResult(data);
      if (inject) {
        setSuccess(`Disruption successfully injected! Active alert created. Open Alert Center to view details.`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process simulation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <PlayCircle className="h-8 w-8 text-accent animate-pulse" />
          <span>Simulation Lab</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Model risk scenarios, inspect value-at-risk propagation, and evaluate alternative paths in safety.
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Simulation Controls Panel */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-6 h-fit">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Simulation Parameters</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Disruption Scenario</label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white focus:border-accent outline-none text-sm"
              >
                <option value="cyclone">IMD Cyclone Alert</option>
                <option value="flood">Regional Heavy Flood</option>
                <option value="port_strike">JNPT / Chennai Port Congestion Strike</option>
                <option value="supplier_failure">Alternative Supplier Asset Failure</option>
                <option value="commodity_spike">Raw Material Price Spike (MCX)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Affected Target Location / Node</label>
              <select
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-white focus:border-accent outline-none text-sm"
              >
                <option value="Supplier S1">Supplier S1 (Erode Yarn Mill)</option>
                <option value="Supplier B">Supplier B (Coimbatore Dyeing)</option>
                <option value="Supplier S3">Supplier S3 (Chennai Cotton Traders)</option>
                <option value="MAA">Chennai Port (MAA)</option>
                <option value="warehouse_1">Warehouse A (Tirupur)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Intensity Severity</label>
              <input
                type="range"
                min="1"
                max="5"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-accent bg-slate-950 rounded-lg cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>1: Minor</span>
                <span>2</span>
                <span>3: Moderate</span>
                <span>4</span>
                <span>5: Extreme</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => handleRunSimulation(false)}
              disabled={isLoading}
              className="w-full py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all shadow-md active:scale-[0.98]"
            >
              {isLoading ? "CALCULATING COMPOSITES..." : "Dry Run Simulation"}
            </button>
            <button
              onClick={() => handleRunSimulation(true)}
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 rounded-xl text-sm font-semibold text-white transition-all shadow-lg active:scale-[0.98]"
            >
              {isLoading ? "COMMITTING ALERT..." : "Inject Live Disruption Alert"}
            </button>
          </div>
        </div>

        {/* Simulation Output Panel */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl lg:col-span-2 min-h-[400px]">
          {result ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-red-950/20 border border-red-900/30 text-red-400 px-2 py-0.5 rounded">
                    SIMULATION COMPLETED
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2 leading-tight">
                    Disruption at {result.location_name}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500 uppercase block">SIMULATED RISK</span>
                  <span className="text-2xl font-extrabold text-red-400">{result.simulated_risk_score}/100</span>
                </div>
              </div>

              {/* Exposure summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#090d16] border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs font-mono text-slate-500 block uppercase">Revenue Exposure</span>
                  <span className="text-2xl font-extrabold text-red-400 mt-1 block">
                    {formatRupee(result.total_exposed_value_inr)}
                  </span>
                </div>
                <div className="bg-[#090d16] border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs font-mono text-slate-500 block uppercase">Affected Node Traverses</span>
                  <span className="text-2xl font-extrabold text-white mt-1 block">
                    {result.affected_nodes.length} Nodes
                  </span>
                </div>
              </div>

              {/* Affected Orders */}
              <div className="space-y-3">
                <h4 className="font-semibold text-white text-sm">Exposed Supply Orders ({result.exposed_orders.length})</h4>
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {result.exposed_orders.map((order: any) => (
                    <div key={order.order_id} className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl flex justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">Order {order.order_id}</div>
                        <div className="text-slate-500 mt-0.5">Required: {order.required_by_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-emerald-400 font-mono">{formatRupee(order.value_inr)}</div>
                        <div className="text-slate-500 mt-0.5">{order.units} Units</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Recovery options */}
              <div className="space-y-3 pt-4 border-t border-slate-800/80">
                <h4 className="font-semibold text-white text-sm flex items-center gap-1.5">
                  <TrendingUp className="h-4.5 w-4.5 text-accent" />
                  <span>Recovery Options Evaluated</span>
                </h4>
                
                <div className="space-y-3">
                  {result.recovery_options.map((opt: any) => (
                    <div key={opt.rank} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-1 px-2.5 bg-blue-950/30 text-accent font-mono text-[9px] uppercase tracking-wider rounded-bl border-l border-b border-blue-900/30">
                        {opt.confidence_percent}% Confidence
                      </div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1">
                        <span className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-accent/20 text-accent text-[10px]">
                          {opt.rank}
                        </span>
                        <span>{opt.title}</span>
                      </div>
                      <p className="text-slate-400 text-xs pl-5 leading-relaxed">{opt.description}</p>
                      
                      <div className="pl-5 flex justify-between text-xs pt-1">
                        <span className="text-slate-500 font-mono">Cost: {formatRupee(opt.recovery_cost_inr)}</span>
                        <span className="text-emerald-400 font-mono font-semibold">Net Savings: {formatRupee(opt.expected_savings_inr)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center py-24 text-slate-500 text-center font-mono">
              <PlayCircle className="h-12 w-12 text-slate-700 mb-3" />
              <p className="text-xs">SIMULATOR READY. CONFIGURE PARAMETERS AND CLICK RUN TO TRAVERSE DOWNSTREAM REVENUE IMPACTS.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
