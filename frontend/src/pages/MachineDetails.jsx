import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  ArrowLeft,
  Wrench,
  Thermometer,
  RotateCw,
  Gauge,
  Activity,
  Layers,
  ShieldAlert,
  Zap,
  Check,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Clock,
  FileText,
  Radio
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const MachineDetails = ({ machineId, fleetData, onRefresh, onBack, onNavigateMachine, addToast }) => {
  const [selectedMachine, setSelectedMachine] = useState(machineId || 'M-001');
  const [isMaintaining, setIsMaintaining] = useState(false);
  const [activeChart, setActiveChart] = useState('all');

  // Find machine directly from fleetData for instant 0ms rendering
  const machineData = fleetData?.machines?.find((m) => m.id === selectedMachine) || fleetData?.machines?.[0];

  // -------------------------------------------------------------------------
  // 🔴 LIVE MACHINE CONDITION & TELEMETRY REPORT STREAM ENGINE
  // Newest report comes to the top first row, old rows push down
  // -------------------------------------------------------------------------
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [streamTick, setStreamTick] = useState(0);

  // Initialize with the most recent baseline reports (newest at index 0)
  const [liveReportList, setLiveReportList] = useState(() => {
    const initial = [];
    const now = Date.now();
    for (let i = 0; i < 8; i++) {
      const timeStr = new Date(now - i * 3000).toLocaleTimeString();
      const temp = Number((68.2 + Math.sin(i) * 0.8).toFixed(1));
      const rpm = Math.round(1515 + Math.cos(i) * 15);
      const torque = Number((41.8 + Math.sin(i * 0.7) * 1.2).toFixed(1));
      const wear = Number((80.0 + (8 - i) * 0.4).toFixed(1));
      const risk = Number((4.5 + Math.sin(i) * 0.4).toFixed(1));
      const health = Math.round(100 - risk);

      initial.push({
        id: `rep-init-${i}`,
        time: timeStr,
        temp_c: temp,
        rpm: rpm,
        torque: torque,
        tool_wear: wear,
        health: health,
        failure_risk: risk,
        status: 'Healthy',
        condition_assessment: 'Nominal operating state: Spindle rotational dynamics and thermal equilibrium optimal.'
      });
    }
    return initial;
  });

  // Stream loop: Every 3.0s generate a new live sensor reading, process it, and prepend to top (index 0)
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setStreamTick((prevTick) => {
        const nextTick = prevTick + 1;
        const cycle = nextTick % 30;

        // Realistic continuous sensor variations
        let temp = 68.5;
        let torque = 42.0;
        let rpm = 1520;
        let wear = 82.0 + nextTick * 0.2;
        let risk = 5.0;
        let status = 'Healthy';
        let assessment = 'Nominal operating state: Parameters within design baselines.';

        if (cycle < 12) {
          // Healthy nominal condition
          temp = Number((68.0 + (cycle / 12) * 2.5 + (Math.random() * 0.4 - 0.2)).toFixed(1));
          torque = Number((41.5 + (cycle / 12) * 2.0 + (Math.random() * 0.4 - 0.2)).toFixed(1));
          rpm = Math.round(1525 - (cycle / 12) * 15 + (Math.random() * 6 - 3));
          risk = Number((4.2 + (cycle / 12) * 2.5).toFixed(1));
          status = 'Healthy';
          assessment = 'Nominal operating condition: Optimal tool sharpness and spindle speed balance.';
        } else if (cycle < 22) {
          // Warning drift condition
          const progress = (cycle - 12) / 10;
          temp = Number((72.0 + progress * 5.0 + (Math.random() * 0.5 - 0.25)).toFixed(1));
          torque = Number((45.0 + progress * 8.0 + (Math.random() * 0.5 - 0.25)).toFixed(1));
          rpm = Math.round(1495 - progress * 50 + (Math.random() * 6 - 3));
          risk = Number((18.5 + progress * 16.0).toFixed(1));
          status = 'Warning';
          assessment = `Parameter drift detected: Elevated torque (${torque} Nm) and rising heat dissipation (${temp} °C).`;
        } else {
          // Peak load / recovery
          const progress = (cycle - 22) / 8;
          temp = Number((77.0 - progress * 8.5).toFixed(1));
          torque = Number((53.0 - progress * 11.0).toFixed(1));
          rpm = Math.round(1445 + progress * 75);
          risk = Number((34.5 - progress * 29.0).toFixed(1));
          status = risk >= 18 ? 'Warning' : 'Healthy';
          assessment = 'Thermal load moderating: Heat sink dispersing thermal energy back towards baseline.';
        }

        const health = Math.max(0, Math.min(100, Math.round(100 - risk)));
        const timeStr = new Date().toLocaleTimeString();

        const newReport = {
          id: `rep-${Date.now()}`,
          time: timeStr,
          temp_c: temp,
          rpm: rpm,
          torque: torque,
          tool_wear: Number(wear.toFixed(1)),
          health: health,
          failure_risk: risk,
          status: status,
          condition_assessment: assessment
        };

        // PREPEND NEW REPORT TO TOP FIRST ROW (0th index), OLD ROWS SHIFT DOWN
        setLiveReportList((prev) => [newReport, ...prev.slice(0, 24)]);

        return nextTick;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  const handlePerformMaintenance = async () => {
    setIsMaintaining(true);
    try {
      const res = await fetch(`http://127.0.0.1:5000/machine/${selectedMachine}/maintain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Full maintenance overhaul: Carbide tool replaced, cooling fins cleared, spindle re-aligned.'
        })
      });
      if (!res.ok) throw new Error('Maintenance action failed');
      const data = await res.json();
      if (onRefresh) onRefresh();
      if (addToast) {
        addToast({
          title: `Service Restored: ${selectedMachine}`,
          message: `Machine status successfully restored to Healthy (Health: ${data.machine.health_score}%).`,
          type: 'success'
        });
      }
    } catch (err) {
      if (addToast) {
        addToast({
          title: 'Maintenance Error',
          message: err.message,
          type: 'error'
        });
      }
    } finally {
      setIsMaintaining(false);
    }
  };

  if (!machineData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <p className="text-sm font-medium text-slate-500 font-mono">Loading telemetry for {selectedMachine}...</p>
      </div>
    );
  }

  const {
    id,
    name,
    type,
    status,
    is_failed,
    failure_type,
    failure_reason,
    health_score,
    failure_probability,
    operating_hours,
    last_maintenance,
    next_maintenance,
    sensor_values,
    sensor_badges,
    explainability,
    recommendations,
    history,
    maintenance_history,
    last_updated
  } = machineData;

  const isCriticalOrWarning = status === 'Critical' || status === 'Warning' || status === 'Failed';
  const machinesList = ['M-001', 'M-002', 'M-003', 'M-004', 'M-005'];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header & Fleet Quick Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">{id}: {name}</h1>
              <StatusBadge status={status} size="sm" />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Type {type} Industrial Asset • Updated: {last_updated?.split(' ')[1] || last_updated}
            </p>
          </div>
        </div>

        {/* Machine Navigation Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2">Select:</span>
          {machinesList.map((mId) => (
            <button
              key={mId}
              onClick={() => {
                setSelectedMachine(mId);
                if (onNavigateMachine) onNavigateMachine(mId);
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${selectedMachine === mId
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {mId}
            </button>
          ))}
        </div>
      </div>

      {/* Machine Key Information KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Health Score</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{health_score}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${health_score > 70 ? 'bg-emerald-500' : health_score > 40 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              style={{ width: `${health_score}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Failure Risk</div>
          <div className={`text-xl font-bold font-mono mt-1 ${failure_probability > 50 ? 'text-rose-600' : failure_probability > 20 ? 'text-amber-600' : 'text-slate-900'}`}>
            {failure_probability}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">ML RF Model</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Current Status</div>
          <div className="mt-1.5">
            <StatusBadge status={status} size="sm" />
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">{is_failed ? 'Offline' : 'Online'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Operating Time</div>
          <div className="text-base font-bold font-mono text-slate-900 mt-1">{operating_hours} hrs</div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">Runtime Clock</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Last Service</div>
          <div className="text-xs font-semibold font-mono text-slate-800 mt-1">{last_maintenance}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">Historical Log</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Next Recommended</div>
          <div className="text-xs font-semibold font-mono text-slate-800 mt-1">{next_maintenance}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">Target Window</div>
        </div>
      </div>

      {/* Working Condition & AI Diagnostics Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Current Working Condition
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
            Telemetry Feed
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-900">
              {recommendations?.working_condition}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              <span className="font-semibold text-slate-700">AI Diagnostics:</span> {recommendations?.ai_summary}
            </p>
          </div>

          {isCriticalOrWarning && (
            <button
              onClick={handlePerformMaintenance}
              disabled={isMaintaining}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{isMaintaining ? 'Executing Maintenance...' : 'Perform Maintenance & Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* LIVE SENSOR DATA CARDS */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Live Sensor Telemetry
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-medium">Air / Process Temp</span>
              <Thermometer className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {sensor_values?.air_temperature_c}°C
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Proc: {sensor_values?.process_temperature_c}°C ({sensor_values?.air_temperature} K)
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Status</span>
              <span className={`font-medium font-mono text-[11px] ${sensor_badges?.temperature === 'Normal' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                {sensor_badges?.temperature}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-medium">Rotational Speed</span>
              <RotateCw className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {sensor_values?.rotational_speed} <span className="text-xs font-normal text-slate-500">RPM</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Spindle Freq: {((sensor_values?.rotational_speed || 0) / 60).toFixed(1)} Hz
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Status</span>
              <span className={`font-medium font-mono text-[11px] ${sensor_badges?.rotational_speed === 'Stable' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                {sensor_badges?.rotational_speed}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-medium">Torque Load</span>
              <Gauge className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {sensor_values?.torque} <span className="text-xs font-normal text-slate-500">Nm</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Limit: 70.0 Nm
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Status</span>
              <span className={`font-medium font-mono text-[11px] ${sensor_badges?.torque === 'Normal' ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                {sensor_badges?.torque}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-medium">Tool Wear</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {sensor_values?.tool_wear} <span className="text-xs font-normal text-slate-500">min</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Limit: 200 min
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Status</span>
              <span className={`font-medium font-mono text-[11px] ${sensor_badges?.tool_wear === 'Nominal' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                {sensor_badges?.tool_wear}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span className="font-medium">Calculated Power</span>
              <Zap className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {sensor_values?.power_kw} <span className="text-xs font-normal text-slate-500">kW</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              P = Torque × ω
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Efficiency</span>
              <span className="font-medium font-mono text-[11px] text-slate-700">Nominal</span>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED FAILURE ANALYSIS (When Critical / Warning / Failed) */}
      {isCriticalOrWarning && recommendations && (
        <div className="bg-white rounded-lg border border-rose-200 p-5 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-rose-100">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                  Problem Detected: {recommendations.problem_title}
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {failure_reason || recommendations.ai_summary}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Priority</div>
              <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded mt-0.5 ${recommendations.priority === 'CRITICAL' || recommendations.priority === 'HIGH'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
                }`}>
                {recommendations.priority}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Why is this machine critical? (Explainable AI Feature Contributions)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Normalized Feature Impact</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {explainability && explainability.map((f, i) => (
                <div key={i} className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>{f.factor}</span>
                    <span className="font-mono font-bold text-slate-900">+{f.impact}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${f.severity === 'high'
                        ? 'bg-rose-500'
                        : f.severity === 'medium'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                        }`}
                      style={{ width: `${f.impact}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  🔧 Recommended Solution
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                <span>Action: <strong>{recommendations.recommended_action}</strong></span>
                <span>Window: <strong>{recommendations.maintenance_window}</strong></span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
              {recommendations.steps && recommendations.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handlePerformMaintenance}
                disabled={isMaintaining}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isMaintaining ? 'Executing Maintenance Protocol...' : 'Mark Maintenance Completed & Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SENSOR CHARTS */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Sensor & Diagnostics Charts
            </h2>
            <p className="text-xs text-slate-500 font-mono">Recorded telemetry feed</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveChart('all')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition ${activeChart === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              All Signals
            </button>
            <button
              onClick={() => setActiveChart('sensors')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition ${activeChart === 'sensors' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Thermals & Torque
            </button>
            <button
              onClick={() => setActiveChart('health')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition ${activeChart === 'health' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Health & Failure Risk
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {(activeChart === 'all' || activeChart === 'sensors') && (
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>Temperature vs Time (°C)</span>
                <span className="text-[10px] text-slate-500 font-mono">Target: &lt;35°C</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <YAxis domain={['auto', 'auto']} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="air_temperature_c" name="Air Temp (°C)" stroke="#3b82f6" dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line type="monotone" dataKey="process_temperature_c" name="Process Temp (°C)" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {(activeChart === 'all' || activeChart === 'sensors') && (
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>Rotational Speed vs Time (RPM)</span>
                <span className="text-[10px] text-slate-500 font-mono">Nominal: ~1500 RPM</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <YAxis domain={['auto', 'auto']} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="rotational_speed" name="Speed (RPM)" stroke="#10b981" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {(activeChart === 'all' || activeChart === 'sensors') && (
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>Torque Load vs Time (Nm)</span>
                <span className="text-[10px] text-slate-500 font-mono">Max Limit: 70 Nm</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <YAxis domain={['auto', 'auto']} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="torque" name="Torque (Nm)" stroke="#8b5cf6" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {(activeChart === 'all' || activeChart === 'sensors') && (
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>Tool Wear Progression (min)</span>
                <span className="text-[10px] text-slate-500 font-mono">Critical: &gt;200 min</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 250]} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="tool_wear" name="Wear (min)" stroke="#ea580c" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {(activeChart === 'all' || activeChart === 'health') && (
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200 lg:col-span-2">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>Machine Health Score (%) vs Predicted Failure Risk (%)</span>
                <span className="text-[10px] text-slate-500 font-mono">ML Random Forest Probability</span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="health_score" name="Health Score (%)" stroke="#10b981" dot={false} strokeWidth={2.5} isAnimationActive={false} />
                    <Line type="monotone" dataKey="failure_probability" name="Failure Risk (%)" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAINTENANCE HISTORY */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              {id} Maintenance History & Service Log
            </h2>
            <p className="text-xs text-slate-500 font-mono">Chronological service record</p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {maintenance_history ? maintenance_history.length : 0} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Maintenance Type</th>
                <th className="py-2.5 px-3">Issue Found</th>
                <th className="py-2.5 px-3">Action Taken</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {maintenance_history && maintenance_history.length > 0 ? (
                maintenance_history.map((rec, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-900 font-medium whitespace-nowrap">{rec.date}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{rec.type}</td>
                    <td className="py-2.5 px-3 text-slate-600">{rec.issue}</td>
                    <td className="py-2.5 px-3 text-slate-600">{rec.action}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-slate-400">No prior maintenance entries logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 🔴 LIVE MACHINE CONDITION & TELEMETRY STREAMING REPORT */}
      {/* New incoming live processed reports go into the top first row */}
      {/* ======================================================================= */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        {/* Section Header with Live Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-base font-bold uppercase tracking-wide text-slate-900 font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <span>Live Machine Condition & Telemetry Streaming Report</span>
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                LIVE STREAMING
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Live processed telemetry report • Cycle: Every 3.0s • Newest reading automatically appears in top first row
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiveStreaming((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition ${isLiveStreaming
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
            >
              {isLiveStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isLiveStreaming ? 'Pause Stream' : 'Resume Stream'}</span>
            </button>

            <button
              onClick={() => {
                setLiveReportList([]);
                setStreamTick(0);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded text-xs font-medium transition"
              title="Clear logged reports"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Streaming Live Report Table (Top row = Newest, lower rows = Older) */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3 text-right">Temp (°C)</th>
                <th className="py-2.5 px-3 text-right">Speed (RPM)</th>
                <th className="py-2.5 px-3 text-right">Torque (Nm)</th>
                <th className="py-2.5 px-3 text-right">Tool Wear</th>
                <th className="py-2.5 px-3 text-right">Health</th>
                <th className="py-2.5 px-3 text-right">Failure Risk</th>
                <th className="py-2.5 px-3 text-center">Machine Condition</th>
                <th className="py-2.5 px-3 text-left">Processed Condition Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {liveReportList && liveReportList.length > 0 ? (
                liveReportList.map((rep, idx) => {
                  const isTopRow = idx === 0;
                  return (
                    <tr
                      key={rep.id}
                      className={
                        isTopRow
                          ? 'bg-indigo-50/50 font-medium transition-colors hover:bg-indigo-50/70 border-l-4 border-l-indigo-600'
                          : 'hover:bg-slate-50/80 transition-colors'
                      }
                    >
                      {/* Time Column with LIVE tag on top row */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{rep.time}</span>
                          {isTopRow && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse">
                              NEW (TOP)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Temperature */}
                      <td className={`py-2.5 px-3 text-right ${rep.temp_c >= 77 ? 'text-rose-600 font-bold' : rep.temp_c >= 73 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {rep.temp_c} °C
                      </td>

                      {/* Speed (RPM) */}
                      <td className={`py-2.5 px-3 text-right ${rep.rpm <= 1400 ? 'text-rose-600 font-bold' : rep.rpm <= 1470 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {rep.rpm}
                      </td>

                      {/* Torque */}
                      <td className={`py-2.5 px-3 text-right ${rep.torque >= 54 ? 'text-rose-600 font-bold' : rep.torque >= 47 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {rep.torque} Nm
                      </td>

                      {/* Tool Wear */}
                      <td className={`py-2.5 px-3 text-right ${rep.tool_wear >= 150 ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                        {rep.tool_wear} min
                      </td>

                      {/* Health */}
                      <td className={`py-2.5 px-3 text-right font-bold ${rep.health <= 60 ? 'text-rose-600' : rep.health <= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {rep.health}%
                      </td>

                      {/* Failure Risk */}
                      <td className={`py-2.5 px-3 text-right font-bold ${rep.failure_risk >= 30 ? 'text-rose-600' : rep.failure_risk >= 15 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {rep.failure_risk}%
                      </td>

                      {/* Machine Condition Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${rep.status === 'Critical'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : rep.status === 'Warning'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                          {rep.status === 'Critical' ? '🔴 CRITICAL' : rep.status === 'Warning' ? '🟡 WARNING' : '🟢 HEALTHY'}
                        </span>
                      </td>

                      {/* Processed Condition Report Summary */}
                      <td className="py-2.5 px-3 font-sans text-xs text-slate-600 max-w-md truncate">
                        {rep.condition_assessment}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="py-6 text-center text-slate-400 font-sans">
                    Waiting for incoming live stream data...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MachineDetails;
