import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  ArrowRight,
  Database,
  Cpu,
  Wrench,
  ShieldAlert
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const Dashboard = ({ fleetData, isLoading, error, onRefresh, onSelectMachine }) => {
  if (isLoading && !fleetData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500 font-mono">Synchronizing Fleet Diagnostics...</p>
      </div>
    );
  }

  if (error && !fleetData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <div className="bg-white border border-rose-200 p-6 rounded-xl max-w-md w-full shadow-sm text-center">
          <AlertOctagon className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 mb-1">Fleet Telemetry Offline</h2>
          <p className="text-xs text-slate-600 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  const { summary, machines, critical_machines, failed_machines, timestamp } = fleetData || {
    summary: { total_machines: 5, working_machines: 3, warning_machines: 1, critical_machines: 1, failed_machines: 1, fleet_health: 68 },
    machines: [],
    critical_machines: [],
    failed_machines: [],
    timestamp: ''
  };

  const kpis = [
    { label: 'Total Machines', value: summary.total_machines, icon: Database, color: 'text-slate-900', border: 'border-slate-200' },
    { label: 'Working Machines', value: summary.working_machines, icon: CheckCircle2, color: 'text-emerald-700', border: 'border-emerald-200 bg-emerald-50/40' },
    { label: 'Critical Machines', value: summary.critical_machines, icon: AlertOctagon, color: 'text-rose-700', border: summary.critical_machines > 0 ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200' },
    { label: 'Warning Machines', value: summary.warning_machines, icon: AlertTriangle, color: 'text-amber-700', border: summary.warning_machines > 0 ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200' },
    { label: 'Failed / Not Working', value: summary.failed_machines, icon: Wrench, color: 'text-slate-800', border: 'border-slate-200 bg-slate-100/60' },
    { label: 'Fleet Health Score', value: `${summary.fleet_health}%`, icon: Activity, color: 'text-blue-700', border: 'border-blue-200 bg-blue-50/40' }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Fleet Health & Diagnostic Command Center
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            AI-powered predictive condition monitoring • AI4I 2020 dataset model engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            Telemetry: {timestamp?.split(' ')[1] || timestamp}
          </span>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 bg-white rounded-lg border shadow-sm ${kpi.border}`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">{kpi.label}</span>
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
              <div className={`text-2xl font-bold font-mono ${kpi.color}`}>
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. Critical Machines Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              🚨 Critical Machines Requiring Immediate Action
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">{critical_machines.length} active risk(s)</span>
        </div>

        {critical_machines.length === 0 ? (
          <div className="bg-white p-4 rounded-lg border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-sm font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>✓ No critical machines detected. All active equipment operating within safe bounds.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {critical_machines.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-lg border-2 border-rose-300 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{m.id}</span>
                    <span className="text-xs text-slate-600 font-medium">({m.name})</span>
                  </div>
                  <StatusBadge status="Critical" size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 bg-rose-50/60 p-2.5 rounded border border-rose-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-rose-700 block">Failure Risk</span>
                    <span className="text-base font-bold font-mono text-rose-800">{m.failure_probability}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-rose-700 block">Health Score</span>
                    <span className="text-base font-bold font-mono text-rose-800">{m.health_score}%</span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="text-slate-700">
                    <strong className="text-slate-900">Main Problem:</strong> {m.recommendations?.problem_title || 'Elevated load and tool wear'}
                  </div>
                  <div className="text-slate-700">
                    <strong className="text-slate-900">Recommended Action:</strong> {m.recommendations?.recommended_action}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">
                    Window: {m.recommendations?.maintenance_window}
                  </span>
                  <button
                    onClick={() => onSelectMachine(m.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    <span>Analyze Failure & Solutions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Machine Overview Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Fleet Machine Overview
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">Click any machine card for live diagnostics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelectMachine(m.id)}
              className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:border-slate-400 hover:shadow-md transition cursor-pointer space-y-3 group"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900 text-sm">{m.id}</span>
                    <span className="text-[11px] text-slate-500 font-mono">Type {m.type}</span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium truncate max-w-[180px]">{m.name}</div>
                </div>
                <StatusBadge status={m.status} size="sm" />
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Health</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{m.health_score}%</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Failure Risk</span>
                  <span className={`text-sm font-bold font-mono ${
                    m.failure_probability > 50 ? 'text-rose-600' : m.failure_probability > 20 ? 'text-amber-600' : 'text-slate-900'
                  }`}>
                    {m.failure_probability}%
                  </span>
                </div>
              </div>

              {/* Sensor Readings */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Temperature:</span>
                  <span className="font-mono font-semibold text-slate-800">{m.sensor_values.air_temperature_c}°C</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Speed:</span>
                  <span className="font-mono font-semibold text-slate-800">{m.sensor_values.rotational_speed} RPM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Torque:</span>
                  <span className="font-mono font-semibold text-slate-800">{m.sensor_values.torque} Nm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tool Wear:</span>
                  <span className="font-mono font-semibold text-slate-800">{m.sensor_values.tool_wear} min</span>
                </div>
              </div>

              {/* Operating Condition & Link */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate max-w-[190px] font-medium text-slate-700">
                  {m.recommendations?.working_condition?.replace(/[🟢🟡🔴⚫]/g, '').trim()}
                </span>
                <span className="group-hover:translate-x-1 transition-transform text-slate-900 font-semibold flex items-center gap-1 font-mono">
                  Details →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 12. Not Working Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-800" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              ⚫ Not Working / Stopped Machines
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">{failed_machines.length} offline asset(s)</span>
        </div>

        {failed_machines.length === 0 ? (
          <div className="bg-white p-4 rounded-lg border border-slate-200 text-slate-600 text-xs flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>All fleet machines are currently operational and online.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {failed_machines.map((fm) => (
              <div
                key={fm.id}
                className="bg-white rounded-lg border border-slate-300 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{fm.id}: {fm.name}</span>
                    <StatusBadge status="Failed" size="sm" />
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {fm.failure_type || 'Protective Cutoff'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600">
                    <strong>Reason:</strong> {fm.failure_reason || 'Critical sensor threshold exceeded.'}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                    <span>Shutdown Time: <strong>{fm.failure_time || '10:42 AM'}</strong></span>
                    {fm.last_known_sensor_values && (
                      <span>
                        Last Telemetry: {fm.last_known_sensor_values.air_temperature} K • {fm.last_known_sensor_values.tool_wear} min wear • {fm.last_known_sensor_values.torque} Nm
                      </span>
                    )}
                    <span>Maintenance: <strong className="text-rose-700">🔧 Required</strong></span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => onSelectMachine(fm.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
                  >
                    <span>View Failure Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
