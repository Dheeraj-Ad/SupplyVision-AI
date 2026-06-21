"use client";

import React, { useEffect, useState } from "react";
import { request, isOfflineFallbackActive } from "@/lib/api";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Activity, 
  ShieldCheck,
  RefreshCw,
  Sliders,
  DollarSign,
  BookOpen
} from "lucide-react";

interface TimelineEvent {
  day: number;
  stage_name: string;
  description: string;
  trigger_node: string;
  severity: number;
  revenue_at_risk_inr: number;
  recovery_action_title: string;
  simulated_savings_inr: number;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  impact_area: string;
  duration_days: number;
  timeline: TimelineEvent[];
}

export default function HistoricalReplayDashboard() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  
  // Replay Player State
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1500); // ms per step
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    async function loadScenarios() {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const list = await request("GET", "/replay/scenarios");
        setScenarios(list || []);
        if (list && list.length > 0) {
          setSelectedScenarioId(list[0].id);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Failed to load historical scenarios.");
      } finally {
        setIsLoading(false);
      }
    }
    loadScenarios();
  }, []);

  // Fetch timeline when scenario selection changes
  useEffect(() => {
    if (!selectedScenarioId) return;
    
    async function fetchTimeline() {
      setIsPlaying(false);
      setCurrentDay(0);
      try {
        const details = await request("GET", `/replay/scenarios/${selectedScenarioId}`);
        setSelectedScenario(details);
      } catch (err) {
        console.error("Failed to load scenario timeline:", err);
      }
    }
    fetchTimeline();
  }, [selectedScenarioId]);

  // Playback timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isPlaying && selectedScenario) {
      interval = setInterval(() => {
        setCurrentDay((prev) => {
          if (prev >= selectedScenario.duration_days) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, selectedScenario, playbackSpeed]);

  const handlePlayPause = () => {
    if (selectedScenario && currentDay >= selectedScenario.duration_days) {
      // Auto reset if completed
      setCurrentDay(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentDay(0);
  };

  const handleStepForward = () => {
    if (selectedScenario && currentDay < selectedScenario.duration_days) {
      setCurrentDay(prev => prev + 1);
    }
  };

  const formatINR = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value);
  };

  // Compile active events up to current day
  const getActiveEvents = () => {
    if (!selectedScenario) return [];
    return selectedScenario.timeline.filter(e => e.day <= currentDay);
  };

  // Calculate dynamic running metrics
  const activeEvents = getActiveEvents();
  const cumulativeAtRisk = activeEvents.reduce((sum, e) => sum + (e.revenue_at_risk_inr || 0), 0);
  const cumulativeSavings = activeEvents.reduce((sum, e) => sum + (e.simulated_savings_inr || 0), 0);
  const activeAlertsCount = activeEvents.filter(e => e.severity >= 3).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#030712] text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 text-accent animate-spin" />
          <p className="font-mono text-sm tracking-wider">RETRIEVING HISTORICAL DISRUPTION ARCHIVES...</p>
        </div>
      </div>
    );
  }

  const isOffline = isOfflineFallbackActive();

  return (
    <div className="space-y-8 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase tracking-widest text-accent">Simulation Lab</span>
            {isOffline && (
              <span className="text-[10px] bg-amber-950/40 border border-amber-900/50 text-amber-400 font-mono px-2 py-0.5 rounded-full uppercase">
                Offline Mode
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Historical Disruption Replay Engine</h1>
          <p className="text-slate-400 text-sm mt-1">
            Replay historical natural disaster timelines downstream across your digital twin to assess financial recovery paths.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <label className="text-xs font-mono text-slate-500 uppercase">Archive:</label>
          <select
            value={selectedScenarioId}
            onChange={(e) => setSelectedScenarioId(e.target.value)}
            className="bg-[#0b0f19] border border-slate-800 text-white rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:border-accent"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>{sc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedScenario && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Scenario description & Player controls */}
          <div className="lg:col-span-5 bg-[#0b0f19] border border-slate-800 rounded-3xl p-8 flex flex-col justify-between space-y-6">
            
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-accent uppercase tracking-widest block">Scenario Case Study</span>
                <h2 className="text-2xl font-bold text-white tracking-tight">{selectedScenario.name}</h2>
                <span className="text-xs font-mono text-slate-500">
                  IMPACT REGION: {selectedScenario.impact_area} &bull; DURATION: {selectedScenario.duration_days} Days
                </span>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                {selectedScenario.description}
              </p>
            </div>

            {/* Simulation Player Widget */}
            <div className="bg-[#070b13] border border-slate-900 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-mono text-slate-400 flex items-center space-x-1.5">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  <span>PLAYBACK STATUS</span>
                </span>
                
                <span className="text-xs font-mono text-white bg-slate-900 border border-slate-850 px-2 py-0.5 rounded">
                  DAY {currentDay} / {selectedScenario.duration_days}
                </span>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="0"
                  max={selectedScenario.duration_days}
                  value={currentDay}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentDay(parseInt(e.target.value));
                  }}
                  className="w-full accent-accent bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>DAY 0</span>
                  <span>DAY {selectedScenario.duration_days}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={handleReset}
                  className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all"
                  title="Reset Scenario"
                >
                  <RotateCcw className="h-4.5 w-4.5" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className={`p-4 rounded-xl text-white transition-all shadow-md ${
                    isPlaying 
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-900/10" 
                      : "bg-accent hover:bg-accent-hover shadow-accent/15"
                  }`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                </button>

                <button
                  onClick={handleStepForward}
                  disabled={currentDay >= selectedScenario.duration_days}
                  className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 disabled:opacity-50 transition-all"
                  title="Step Forward (1 Day)"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Speed Settings */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500">
                <span className="flex items-center space-x-1">
                  <Sliders className="h-3 w-3" />
                  <span>STEP SPEED</span>
                </span>
                
                <div className="flex space-x-2">
                  {[
                    { label: "1x", ms: 2000 },
                    { label: "2x", ms: 1000 },
                    { label: "4x", ms: 500 }
                  ].map((spd) => (
                    <button
                      key={spd.label}
                      onClick={() => setPlaybackSpeed(spd.ms)}
                      className={`px-2 py-0.5 rounded transition-all ${
                        playbackSpeed === spd.ms 
                          ? "bg-accent/15 text-accent border border-accent/25" 
                          : "bg-slate-950 hover:bg-slate-900 text-slate-500 border border-transparent"
                      }`}
                    >
                      {spd.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
          </div>

          {/* Right Panel: Active Timeline Events & Sourced Impact Values */}
          <div className="lg:col-span-7 bg-[#0b0f19] border border-slate-800 rounded-3xl p-8 flex flex-col justify-between space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Dynamic Disruption Impact</h3>
              
              {/* Dynamic stats tracker */}
              <div className="grid grid-cols-3 gap-4">
                
                <div className="bg-[#070b13] border border-slate-800 p-4 rounded-xl space-y-1">
                  <span className="text-slate-500 font-mono text-[9px] uppercase block">Exposure at Risk</span>
                  <span className="text-md font-bold text-red-400 block">{formatINR(cumulativeAtRisk)}</span>
                </div>

                <div className="bg-[#070b13] border border-slate-800 p-4 rounded-xl space-y-1">
                  <span className="text-slate-500 font-mono text-[9px] uppercase block">Protected Savings</span>
                  <span className="text-md font-bold text-emerald-400 block">{formatINR(cumulativeSavings)}</span>
                </div>

                <div className="bg-[#070b13] border border-slate-800 p-4 rounded-xl space-y-1">
                  <span className="text-slate-500 font-mono text-[9px] uppercase block">Fired Alerts</span>
                  <span className="text-md font-bold text-amber-500 block">{activeAlertsCount} Alerts</span>
                </div>

              </div>
            </div>

            {/* Timeline Stream */}
            <div className="flex-1 min-h-[300px] overflow-y-auto space-y-4 pr-2 max-h-[380px]">
              {activeEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-2xl h-full">
                  <Play className="h-6 w-6 text-slate-600 mb-2 fill-current" />
                  <span>PRESS THE PLAY BUTTON TO REPLAY DISRUPTION TIMELINE STREAM</span>
                </div>
              ) : (
                <div className="relative border-l border-slate-800 pl-4 ml-2 space-y-6">
                  {activeEvents.map((event, idx) => (
                    <div key={idx} className="relative space-y-2">
                      {/* Timeline Node Dot */}
                      <span className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full border ${
                        event.severity >= 4 
                          ? "bg-red-400 border-red-500 shadow-md shadow-red-500/10" 
                          : "bg-amber-400 border-amber-500"
                      }`}></span>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-accent">
                            DAY {event.day} &bull; {event.stage_name}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-1.5">{event.trigger_node} Disruption</h4>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          SEVERITY: {event.severity}/5
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 font-mono leading-relaxed">
                        {event.description}
                      </p>

                      {/* Expected optimization action */}
                      {event.recovery_action_title && (
                        <div className="bg-[#070b13] border border-slate-900 rounded-xl p-3 mt-2 flex items-start space-x-2.5 text-[11px] font-mono">
                          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-white font-semibold">Mitigation Strategy: {event.recovery_action_title}</span>
                            <span className="text-slate-500 block">
                              Protected Sourced Value: {formatINR(event.revenue_at_risk_inr)} &bull; Saved: {formatINR(event.simulated_savings_inr)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
