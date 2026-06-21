"use client";

import React, { useEffect, useState } from "react";
import { request } from "@/lib/api";
import { formatRupee } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { Network, Server, MapPin, Anchor, HelpCircle, Info } from "lucide-react";

interface Node {
  id: string;
  label: string;
  name?: string;
  city?: string;
  current_risk_score?: number;
  // coordinate positions for custom visual mapping
  x?: number;
  y?: number;
}

interface Link {
  source: string;
  target: string;
  type: string;
}

export default function DigitalTwin() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGraph() {
      try {
        const data = await request("GET", "/twin/graph");
        
        // Define clean standard geometric positions for the graph nodes to prevent overlap and make it beautiful
        const mappedNodes = data.nodes.map((node: any) => {
          let x = 100;
          let y = 150;
          
          if (node.id === "supplier_1") { x = 150; y = 100; }
          else if (node.id === "supplier_2") { x = 150; y = 300; }
          else if (node.id === "supplier_3") { x = 320; y = 80; }
          else if (node.id === "MAA") { x = 450; y = 120; }
          else if (node.id === "warehouse_1") { x = 450; y = 250; }
          else if (node.id === "customer_1") { x = 650; y = 250; }
          
          return { ...node, x, y };
        });
        
        setNodes(mappedNodes);
        setLinks(data.links);
        
        // Set first supplier as default selected
        if (mappedNodes.length > 0) {
          setSelectedNode(mappedNodes[0]);
        }
      } catch (e) {
        console.error("Failed to fetch graph data", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGraph();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-t-2 border-accent rounded-full animate-spin"></div>
          <p className="font-mono text-sm tracking-widest">PROPAGATING DIGITAL TWIN CYPHERS...</p>
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
            <Network className="h-8 w-8 text-accent animate-pulse" />
            <span>Digital Twin Topology</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time supply chain dependency mapping & risk propagation paths
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Interactive SVG Network Map */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl lg:col-span-3 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 left-4 flex gap-4 text-xs font-mono text-slate-400 z-20">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Stable (Score &lt; 30)</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Warning (30 - 64)</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Critical (&ge; 65)</div>
          </div>

          {/* Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>

          <div className="w-full relative z-10 select-none overflow-x-auto">
            <svg viewBox="0 0 800 400" className="w-full max-w-[800px] h-[400px] mx-auto">
              {/* Draw Connective Routes / Edges */}
              {links.map((link, idx) => {
                const sourceNode = nodes.find(n => n.id === link.source);
                const targetNode = nodes.find(n => n.id === link.target);
                if (!sourceNode || !targetNode) return null;
                
                const isWarningRoute = (sourceNode.current_risk_score || 0) >= 65;

                return (
                  <g key={`link-${idx}`}>
                    {/* Pulsing warning line if source is disrupted */}
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={isWarningRoute ? "#ef4444" : "#1e293b"}
                      strokeWidth={isWarningRoute ? 2.5 : 1.5}
                      strokeDasharray={isWarningRoute ? "6, 4" : "0"}
                      className={isWarningRoute ? "animate-pulse" : ""}
                    />
                    {/* Simple indicator label for routing mode */}
                    <text
                      x={((sourceNode.x || 0) + (targetNode.x || 0)) / 2}
                      y={((sourceNode.y || 0) + (targetNode.y || 0)) / 2 - 5}
                      fill="#64748b"
                      fontSize={9}
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {link.type === "SHIPS_VIA" ? "SHIPS" : link.type === "FULFILS" ? "FULFILS" : "ROUTE"}
                    </text>
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const score = node.current_risk_score || 0;
                
                let borderStroke = "#1e293b";
                let fillGlow = "rgba(30, 41, 59, 0.4)";
                
                if (score >= 65) {
                  borderStroke = "#ef4444";
                  fillGlow = "rgba(239, 68, 68, 0.15)";
                } else if (score > 30) {
                  borderStroke = "#f59e0b";
                  fillGlow = "rgba(245, 158, 11, 0.15)";
                } else if (node.label === "Supplier") {
                  borderStroke = "#10b981";
                  fillGlow = "rgba(16, 185, 129, 0.05)";
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer"
                  >
                    {/* Ring highlight if selected */}
                    {isSelected && (
                      <circle r={28} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="3, 2" className="animate-spin" style={{ animationDuration: "12s" }} />
                    )}

                    {/* Node Base Shadow Circle */}
                    <circle r={20} fill="#090d16" stroke={borderStroke} strokeWidth={2} />
                    <circle r={16} fill={fillGlow} />

                    {/* Node Indicator Symbol */}
                    {node.label === "Supplier" && <Server className="h-4.5 w-4.5 text-slate-300" x={-9} y={-9} />}
                    {node.label === "Port" && <Anchor className="h-4.5 w-4.5 text-slate-300" x={-9} y={-9} />}
                    {node.label === "Warehouse" && <Server className="h-4.5 w-4.5 text-slate-300" x={-9} y={-9} />}
                    {node.label === "Customer" && <MapPin className="h-4.5 w-4.5 text-slate-300" x={-9} y={-9} />}

                    {/* Label name */}
                    <text
                      y={34}
                      fill={isSelected ? "#fff" : "#94a3b8"}
                      fontSize={10}
                      fontWeight={isSelected ? "bold" : "normal"}
                      textAnchor="middle"
                      className="font-sans"
                    >
                      {(node.name || node.id).length > 18 ? `${(node.name || node.id).substring(0, 15)}...` : (node.name || node.id)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Node Metadata Drilldown Sidepanel */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl flex flex-col space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-accent" />
              <span>Node Inspector</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Select graph node to traverse dependencies</p>
          </div>

          {selectedNode ? (
            <div className="space-y-6 flex-1">
              <div>
                <span className="text-[10px] font-mono uppercase bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                  {selectedNode.label} ENTITY
                </span>
                <h4 className="text-xl font-bold text-white mt-2 leading-tight">{selectedNode.name || selectedNode.id}</h4>
                {selectedNode.city && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-mono">
                    <MapPin className="h-3 w-3 text-slate-500" /> {selectedNode.city}
                  </p>
                )}
              </div>

              {/* Risk metrics */}
              <div className="bg-[#090d16] border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>DISRUPTION PROBABILITY</span>
                  <span className={selectedNode.current_risk_score && selectedNode.current_risk_score >= 65 ? "text-red-400" : "text-emerald-400"}>
                    {selectedNode.current_risk_score && selectedNode.current_risk_score >= 65 ? "CRITICAL ALERT" : "OPTIMAL BOUNDARY"}
                  </span>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold text-white">{selectedNode.current_risk_score || 0}</span>
                  <span className="text-xs text-slate-500">/ 100 Risk</span>
                </div>
              </div>

              {/* Specific attribute fields */}
              <div className="space-y-3 text-xs">
                {selectedNode.label === "Supplier" && (
                  <>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500 font-mono">LEAD TIME</span>
                      <span className="text-slate-300 font-semibold">{(selectedNode as any).lead_time_days || "5"} Days</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500 font-mono">SINGLE SOURCE</span>
                      <span className="text-slate-300 font-semibold">{(selectedNode as any).is_single_source ? "YES" : "NO"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500 font-mono">REVENUE EXPOSURE</span>
                      <span className="text-emerald-400 font-mono font-semibold">{formatRupee((selectedNode as any).revenue_exposure_inr || 0)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500 font-mono">RELIABILITY INDEX</span>
                      <span className="text-slate-300 font-semibold">{(selectedNode as any).reliability_score || "95"}%</span>
                    </div>
                  </>
                )}

                {selectedNode.label === "Warehouse" && (
                  <>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500 font-mono">STORAGE CAPACITY</span>
                      <span className="text-slate-300 font-semibold">{(selectedNode as any).capacity_units || "10,000"} Units</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500 font-mono">CURRENT STOCK</span>
                      <span className="text-slate-300 font-semibold">{(selectedNode as any).current_stock_units || "2,400"} Units</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-500 font-mono">BURN RATE</span>
                      <span className="text-slate-300 font-semibold font-mono">{(selectedNode as any).daily_burn_rate || "150"} / Day</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-500 font-mono text-xs">
              NO NODE SELECTED. CLICK ON GRAPH NODE TO INSPECT DETAILS.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
