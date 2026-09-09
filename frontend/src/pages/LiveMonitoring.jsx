import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  Activity,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Layers,
  Thermometer,
  RotateCw,
  Gauge,
  Cpu,
  Info
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const LiveMonitoring = ({ fleetData, isLoading, error, onRefresh, onSelectMachine }) => {
  if (isLoading && !fleetData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500 font-mono">Initializing Multi-Machine Live Monitoring Grid...</p>
      </div>
    );
  }

  if (error && !fleetData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <div className="bg-white border border-rose-200 p-6 rounded-xl max-w-md w-full shadow-sm text-center">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 mb-1">Live Feed Interrupted</h2>
          <p className="text-xs text-slate-600 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { summary, working_machines, failed_machines } = fleetData || {
    summary: { total_machines: 5, working_machines: 3 },
    working_machines: [],
    failed_machines: []
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Live Fleet Sensor Telemetry
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Real-time multi-stream monitoring for all online operating machines • Synchronized at 1.5s intervals
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Online: <strong>{working_machines?.length || 0}</strong> / {summary?.total_machines || 5}</span>
          </div>
        </div>
      </div>

      {/* Notice for failed machines */}
      {failed_machines && failed_machines.length > 0 && (
        <div className="bg-slate-100 border border-slate-300 p-3 rounded-lg flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            <span>
              <strong>{failed_machines.length} machine(s) offline</strong> ({failed_machines.map(m => m.id).join(', ')}) excluded from active live telemetry feed.
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">In Maintenance Queue</span>
        </div>
      )}

      {/* Grid of Working Machines */}
      {!working_machines || working_machines.length === 0 ? (
        <div className="bg-white p-8 rounded-lg border border-slate-200 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Machines Currently Online</h3>
          <p className="text-xs text-slate-500">All fleet machines are currently stopped or awaiting maintenance overhaul.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {working_machines.map((machine) => (
            <div
              key={machine.id}
              className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4 hover:border-slate-300 transition-all"
            >
              {/* Machine Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-700 border border-slate-200">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 font-mono">
                        {machine.id}: {machine.name}
                      </h2>
                      <StatusBadge status={machine.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      Type {machine.type} • {machine.recommendations?.working_condition}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Health Score</span>
                    <span className="text-base font-bold font-mono text-slate-900">{machine.health_score}%</span>
                  </div>
                  <div className="text-right pl-3 border-l border-slate-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Failure Risk</span>
                    <span className={`text-base font-bold font-mono ${
                      machine.failure_probability > 50 ? 'text-rose-600' : machine.failure_probability > 20 ? 'text-amber-600' : 'text-slate-900'
                    }`}>
                      {machine.failure_probability}%
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectMachine(machine.id)}
                    className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
                  >
                    <span>Diagnostics</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sensor Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center gap-2.5">
                  <Thermometer className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Temperature</span>
                    <span className="text-sm font-bold font-mono text-slate-900">{machine.sensor_values.air_temperature_c}°C</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center gap-2.5">
                  <RotateCw className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Rotational Speed</span>
                    <span className="text-sm font-bold font-mono text-slate-900">{machine.sensor_values.rotational_speed} <span className="text-xs font-normal">RPM</span></span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center gap-2.5">
                  <Gauge className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Torque Load</span>
                    <span className="text-sm font-bold font-mono text-slate-900">{machine.sensor_values.torque} <span className="text-xs font-normal">Nm</span></span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Tool Wear</span>
                    <span className="text-sm font-bold font-mono text-slate-900">{machine.sensor_values.tool_wear} <span className="text-xs font-normal">min</span></span>
                  </div>
                </div>
              </div>

              {/* LIVE SENSOR GRAPH */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>LIVE SENSOR GRAPH: Temperature (°C), RPM/50, Torque (Nm) vs Time</span>
                  <span className="text-[10px] font-mono text-slate-500">Live Buffer: {machine.history?.length || 0} pts</span>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={machine.history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <YAxis domain={['auto', 'auto']} stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '10px' }} />
                      <Line type="monotone" dataKey="air_temperature_c" name="Temp (°C)" stroke="#3b82f6" dot={false} strokeWidth={2} isAnimationActive={false} />
                      <Line type="monotone" dataKey="torque" name="Torque (Nm)" stroke="#8b5cf6" dot={false} strokeWidth={2} isAnimationActive={false} />
                      <Line type="monotone" dataKey="health_score" name="Health (%)" stroke="#10b981" dot={false} strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveMonitoring;
