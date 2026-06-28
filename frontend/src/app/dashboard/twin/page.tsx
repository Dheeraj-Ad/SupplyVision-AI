"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { request } from "@/lib/api";
import { formatRupee } from "@/lib/utils";
import {
  Network,
  MapPin,
  Info,
  Brain,
  Sparkles,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  AlertTriangle,
  Cloud,
  Thermometer,
  Wind,
} from "lucide-react";
import Link from "next/link";

interface Node {
  id: string;
  label: string;
  name?: string;
  city?: string;
  current_risk_score?: number;
  lead_time_days?: number;
  is_single_source?: boolean;
  revenue_exposure_inr?: number;
  current_stock_units?: number;
  daily_burn_rate?: number;
  capacity_units?: number;
  x: number;
  y: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
}

interface LayoutPos {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function computeForceLayout(
  nodes: { id: string }[],
  links: { source: string; target: string }[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  let rng = 42;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0xffffffff;
  };

  const positions: LayoutPos[] = nodes.map(() => ({
    id: "",
    x: width * 0.1 + rand() * width * 0.8,
    y: height * 0.1 + rand() * height * 0.8,
    vx: 0,
    vy: 0,
  }));
  nodes.forEach((n, i) => { positions[i].id = n.id; });

  const REPULSION = 6000;
  const ATTRACTION = 0.04;
  const IDEAL_LENGTH = 160;
  const DAMPING = 0.82;

  for (let iter = 0; iter < 120; iter++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        positions[i].vx -= fx;
        positions[i].vy -= fy;
        positions[j].vx += fx;
        positions[j].vy += fy;
      }
    }
    for (const link of links) {
      const src = positions.find(p => p.id === link.source);
      const tgt = positions.find(p => p.id === link.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const force = ATTRACTION * (dist - IDEAL_LENGTH);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      src.vx += fx;
      src.vy += fy;
      tgt.vx -= fx;
      tgt.vy -= fy;
    }
    for (const p of positions) {
      p.vx += (width / 2 - p.x) * 0.003;
      p.vy += (height / 2 - p.y) * 0.003;
      p.x += p.vx * DAMPING;
      p.y += p.vy * DAMPING;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x = Math.max(44, Math.min(width - 44, p.x));
      p.y = Math.max(44, Math.min(height - 44, p.y));
    }
  }

  const result = new Map<string, { x: number; y: number }>();
  for (const p of positions) result.set(p.id, { x: p.x, y: p.y });
  return result;
}

function nodeColors(score: number, label: string) {
  if (score >= 65) return { stroke: "#ef4444", glow: "rgba(239,68,68,0.2)", cls: "text-red-400" };
  if (score > 30) return { stroke: "#f59e0b", glow: "rgba(245,158,11,0.15)", cls: "text-yellow-400" };
  if (label === "Port") return { stroke: "#6366f1", glow: "rgba(99,102,241,0.1)", cls: "text-indigo-400" };
  if (label === "Warehouse") return { stroke: "#8b5cf6", glow: "rgba(139,92,246,0.1)", cls: "text-violet-400" };
  return { stroke: "#10b981", glow: "rgba(16,185,129,0.08)", cls: "text-emerald-400" };
}

const SVG_W = 860;
const SVG_H = 430;

export default function DigitalTwin() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragging = useRef<{ id: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);

  useEffect(() => {
    async function fetchGraph() {
      try {
        const data = await request("GET", "/twin/graph");
        const rawNodes: any[] = data.nodes || [];
        const rawLinks: any[] = data.links || [];
        const posMap = computeForceLayout(rawNodes, rawLinks, SVG_W, SVG_H);
        const mapped: Node[] = rawNodes.map((n: any) => {
          const pos = posMap.get(n.id) || { x: SVG_W / 2, y: SVG_H / 2 };
          return { ...n, x: pos.x, y: pos.y };
        });
        setNodes(mapped);
        setLinks(rawLinks);
        if (mapped.length > 0) setSelectedNode(mapped[0]);
      } catch (e) {
        console.error("Graph fetch failed", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGraph();
  }, []);

  const fetchExplanation = useCallback(async (nodeId: string) => {
    setExplainLoading(true);
    setExplanation(null);
    try {
      const res = await request("GET", `/twin/node/${nodeId}/explain`);
      setExplanation(res.explanation);
      setAiPowered(res.ai_powered);
    } catch {
      setExplanation("AI explanation unavailable. Check backend connectivity.");
    } finally {
      setExplainLoading(false);
    }
  }, []);

  const fetchWeather = useCallback(async (city: string) => {
    setWeatherData(null);
    setWeatherLoading(true);
    try {
      const res = await request("GET", `/twin/weather?city=${encodeURIComponent(city)}`);
      setWeatherData(res);
    } catch {
      setWeatherData(null);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    fetchExplanation(node.id);
    if (node.city) fetchWeather(node.city);
    else setWeatherData(null);
  };

  const onSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest(".node-g")) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging.current) {
      const svgEl = e.currentTarget;
      const rect = svgEl.getBoundingClientRect();
      const scaleX = SVG_W / rect.width;
      const scaleY = SVG_H / rect.height;
      const rawX = (e.clientX - rect.left) * scaleX;
      const rawY = (e.clientY - rect.top) * scaleY;
      const newX = Math.max(44, Math.min(SVG_W - 44, (rawX - pan.x) / zoom));
      const newY = Math.max(44, Math.min(SVG_H - 44, (rawY - pan.y) / zoom));
      setNodes(prev => prev.map(n => n.id === dragging.current!.id ? { ...n, x: newX, y: newY } : n));
      return;
    }
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onSvgMouseUp = () => { isPanning.current = false; dragging.current = null; };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-t-2 border-accent rounded-full animate-spin" />
          <p className="font-mono text-sm tracking-widest">PROPAGATING DIGITAL TWIN CYPHERS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Network className="h-8 w-8 text-accent animate-pulse" />
            Digital Twin Topology
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time supply chain dependency mapping &amp; AI risk propagation analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-blue-950/50 text-blue-400 border border-blue-900/40 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Brain className="h-3 w-3" /> AI-Powered Node Inspector
          </span>
          <Link
            href="/dashboard/simulation"
            className="flex items-center gap-1.5 text-xs font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-3 py-1.5 rounded-lg hover:bg-emerald-950/60 transition-all"
          >
            <Play className="h-3 w-3" /> Simulation Lab
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SVG Canvas */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl lg:col-span-3 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-800/60">
            <div className="flex flex-wrap gap-2 sm:gap-4 text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Safe</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Watch</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Critical</div>
              <div className="hidden sm:flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Port</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} className="p-1.5 rounded border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"><ZoomOut className="h-3.5 w-3.5" /></button>
              <span className="text-[10px] font-mono text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-1.5 rounded border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"><ZoomIn className="h-3.5 w-3.5" /></button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="ml-1 p-1.5 rounded border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"><Maximize2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="relative flex-1 select-none" style={{ minHeight: "430px" }}>
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              onMouseDown={onSvgMouseDown}
              onMouseMove={onSvgMouseMove}
              onMouseUp={onSvgMouseUp}
              onMouseLeave={onSvgMouseUp}
            >
              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {/* Edges */}
                {links.map((lnk, i) => {
                  const src = nodes.find(n => n.id === lnk.source);
                  const tgt = nodes.find(n => n.id === lnk.target);
                  if (!src || !tgt) return null;
                  const hi = (src.current_risk_score || 0) >= 65;
                  return (
                    <g key={`e${i}`}>
                      <line
                        x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                        stroke={hi ? "#ef4444" : "#1e3a5f"}
                        strokeWidth={hi ? 2 : 1.5}
                        strokeDasharray={hi ? "6 3" : "0"}
                        opacity={hi ? 0.9 : 0.5}
                        className={hi ? "animate-pulse" : ""}
                      />
                      <text
                        x={(src.x + tgt.x) / 2} y={(src.y + tgt.y) / 2 - 5}
                        fill="#334155" fontSize={8} fontFamily="monospace" textAnchor="middle"
                      >
                        {lnk.type === "SHIPS_VIA" ? "SHIPS" : lnk.type === "FULFILS" ? "FULFILS" : lnk.type || "ROUTE"}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {nodes.map(node => {
                  const score = node.current_risk_score || 0;
                  const isSel = selectedNode?.id === node.id;
                  const c = nodeColors(score, node.label);
                  const displayName = (node.name || node.id).length > 16
                    ? `${(node.name || node.id).substring(0, 13)}…`
                    : (node.name || node.id);

                  return (
                    <g
                      key={node.id}
                      className="node-g cursor-pointer"
                      transform={`translate(${node.x},${node.y})`}
                      onClick={() => handleNodeClick(node)}
                      onMouseDown={e => {
                        e.stopPropagation();
                        dragging.current = { id: node.id, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
                      }}
                    >
                      {isSel && (
                        <circle r={32} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.8}
                          className="animate-spin" style={{ animationDuration: "10s" }} />
                      )}
                      {score >= 30 && <circle r={24} fill={c.glow} />}
                      <circle r={20} fill="#090d16" stroke={c.stroke} strokeWidth={isSel ? 2.5 : 1.5} />
                      {score > 0 && (
                        <circle r={20} fill="none" stroke={c.stroke} strokeWidth={3}
                          strokeDasharray={`${(score / 100) * 125.6} 125.6`}
                          strokeLinecap="round" transform="rotate(-90)" opacity={0.35} />
                      )}
                      {score >= 30 && (
                        <g>
                          <circle cx={15} cy={-15} r={9} fill={score >= 65 ? "#7f1d1d" : "#78350f"} stroke={c.stroke} strokeWidth={1} />
                          <text x={15} y={-11} fill={c.stroke} fontSize={7} fontWeight="bold" textAnchor="middle">{score}</text>
                        </g>
                      )}
                      {/* Node type icon text */}
                      <text y={4} fill="#94a3b8" fontSize={10} textAnchor="middle">
                        {node.label === "Port" ? "⚓" : node.label === "Customer" ? "👤" : node.label === "Warehouse" ? "📦" : "🏭"}
                      </text>
                      <text y={34} fill={isSel ? "#f1f5f9" : "#94a3b8"} fontSize={9}
                        fontWeight={isSel ? "600" : "400"} textAnchor="middle" fontFamily="ui-monospace, monospace">
                        {displayName}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <p className="text-[10px] font-mono text-slate-600 text-center pb-3 pt-1">
            Drag nodes to rearrange · Pan canvas · Click node for AI analysis
          </p>
        </div>

        {/* Inspector Panel */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="h-4 w-4 text-accent" />
              Node Inspector
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Click any graph node to inspect</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedNode ? (
              <>
                <div>
                  <span className="text-[9px] font-mono uppercase bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    {selectedNode.label} ENTITY
                  </span>
                  <h4 className="text-base font-bold text-white mt-2 leading-tight">
                    {selectedNode.name || selectedNode.id}
                  </h4>
                  {selectedNode.city && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                      <MapPin className="h-3 w-3" /> {selectedNode.city}
                    </p>
                  )}
                </div>

                {/* Weather Widget */}
                {selectedNode.city && (
                  <div className="bg-[#060c18] border border-slate-800/60 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Cloud className="h-3.5 w-3.5 text-sky-400" />
                        <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider">Live Weather · {selectedNode.city}</span>
                      </div>
                      <button
                        onClick={() => fetchWeather(selectedNode.city!)}
                        disabled={weatherLoading}
                        className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-40"
                      >
                        <RefreshCw className={`h-3 w-3 ${weatherLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                    {weatherLoading ? (
                      <div className="flex gap-2 items-center">
                        <div className="h-3 bg-slate-800 rounded animate-pulse w-full" />
                      </div>
                    ) : weatherData && !weatherData.error ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-3.5 w-3.5 text-orange-400" />
                          <span className="text-xs font-semibold text-white">{weatherData.temp !== undefined ? `${weatherData.temp}°C` : "N/A"}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{(weatherData.weather || "").split("(")[0].trim()}</span>
                        </div>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                          weatherData.severity >= 4 ? "text-red-400 bg-red-950/30 border-red-900/40" :
                          weatherData.severity >= 3 ? "text-amber-400 bg-amber-950/30 border-amber-900/40" :
                          weatherData.severity >= 2 ? "text-yellow-400 bg-yellow-950/30 border-yellow-900/40" :
                          "text-emerald-400 bg-emerald-950/30 border-emerald-900/40"
                        }`}>
                          {weatherData.severity >= 4 ? "⚠ SEVERE" : weatherData.severity >= 3 ? "⚠ HIGH" : weatherData.severity >= 2 ? "MODERATE" : "CLEAR"}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic font-mono">Click refresh to load weather</p>
                    )}
                    {weatherData && !weatherData.error && weatherData.severity >= 3 && (
                      <p className="text-[10px] text-amber-400/80 mt-1.5 font-mono">
                        ⚡ Adverse weather may disrupt this node — check Alert Center
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-[#090d16] border border-slate-800 p-3 rounded-xl">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
                    <span>COMPOSITE RISK</span>
                    <span className={nodeColors(selectedNode.current_risk_score || 0, selectedNode.label).cls}>
                      {(selectedNode.current_risk_score || 0) >= 65 ? "CRITICAL" : (selectedNode.current_risk_score || 0) > 30 ? "ELEVATED" : "OPTIMAL"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-white">{selectedNode.current_risk_score || 0}</span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${(selectedNode.current_risk_score || 0) >= 65 ? "bg-red-500" : (selectedNode.current_risk_score || 0) > 30 ? "bg-yellow-500" : "bg-emerald-500"}`}
                      style={{ width: `${selectedNode.current_risk_score || 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-[10px]">
                  {selectedNode.label === "Supplier" && (
                    <>
                      {selectedNode.lead_time_days !== undefined && (
                        <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-slate-500 font-mono">LEAD TIME</span>
                          <span className="text-slate-300 font-semibold">{selectedNode.lead_time_days} days</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                        <span className="text-slate-500 font-mono">SINGLE SOURCE</span>
                        <span className={selectedNode.is_single_source ? "text-red-400 font-semibold" : "text-emerald-400 font-semibold"}>
                          {selectedNode.is_single_source ? "YES ⚠" : "NO"}
                        </span>
                      </div>
                      {selectedNode.revenue_exposure_inr !== undefined && (
                        <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-slate-500 font-mono">REVENUE EXPOSURE</span>
                          <span className="text-emerald-400 font-mono font-semibold">{formatRupee(selectedNode.revenue_exposure_inr)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {selectedNode.label === "Warehouse" && (
                    <>
                      {selectedNode.current_stock_units !== undefined && (
                        <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-slate-500 font-mono">CURRENT STOCK</span>
                          <span className="text-slate-300 font-semibold">{selectedNode.current_stock_units?.toLocaleString()} units</span>
                        </div>
                      )}
                      {selectedNode.daily_burn_rate !== undefined && (
                        <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-slate-500 font-mono">DAILY BURN</span>
                          <span className="text-slate-300 font-semibold">{selectedNode.daily_burn_rate} / day</span>
                        </div>
                      )}
                      {selectedNode.current_stock_units && selectedNode.daily_burn_rate ? (
                        <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-slate-500 font-mono">DAYS TO ZERO</span>
                          <span className={Math.floor(selectedNode.current_stock_units / selectedNode.daily_burn_rate) < 8 ? "text-red-400 font-semibold" : "text-emerald-400 font-semibold"}>
                            {Math.floor(selectedNode.current_stock_units / selectedNode.daily_burn_rate)} days
                          </span>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                {/* AI Explanation */}
                <div className="bg-[#060c18] border border-blue-900/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">AI Risk Analysis</span>
                      {aiPowered && !explainLoading && (
                        <span className="inline-flex items-center gap-0.5 text-[8px] bg-blue-950/60 text-blue-300 border border-blue-900/40 px-1 py-0.5 rounded font-mono">
                          <Sparkles className="h-2 w-2" /> Live
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => selectedNode && fetchExplanation(selectedNode.id)}
                      disabled={explainLoading}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-40"
                    >
                      <RefreshCw className={`h-3 w-3 ${explainLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  {explainLoading ? (
                    <div className="space-y-1.5">
                      <div className="h-3 bg-slate-800 rounded animate-pulse w-full" />
                      <div className="h-3 bg-slate-800 rounded animate-pulse w-5/6" />
                      <div className="h-3 bg-slate-800 rounded animate-pulse w-2/3" />
                    </div>
                  ) : explanation ? (
                    <p className="text-[11px] text-slate-300 leading-relaxed">{explanation}</p>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">Click refresh to generate AI explanation</p>
                  )}
                </div>

                {(selectedNode.label === "Supplier" || selectedNode.label === "Port") && (
                  <Link
                    href={`/dashboard/simulation?node=${encodeURIComponent(selectedNode.name || selectedNode.id)}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-900/40 bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 hover:text-amber-300 text-xs font-semibold transition-all"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Simulate Disruption Here
                  </Link>
                )}
              </>
            ) : (
              <div className="py-16 text-center text-slate-500 font-mono text-[10px]">
                NO NODE SELECTED.<br />CLICK GRAPH NODE TO INSPECT.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Nodes", value: nodes.length, color: "text-white" },
          { label: "Suppliers", value: nodes.filter(n => n.label === "Supplier").length, color: "text-blue-400" },
          { label: "Critical Nodes", value: nodes.filter(n => (n.current_risk_score || 0) >= 65).length, color: "text-red-400" },
          {
            label: "Avg Risk Score",
            value: nodes.length ? Math.round(nodes.reduce((s, n) => s + (n.current_risk_score || 0), 0) / nodes.length) : 0,
            color: "text-yellow-400",
          },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex justify-between items-center">
            <span className="text-xs font-mono text-slate-500 uppercase">{stat.label}</span>
            <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
