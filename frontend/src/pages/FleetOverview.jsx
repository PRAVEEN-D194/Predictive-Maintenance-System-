import React, { useState } from 'react';
import {
  Cpu,
  RefreshCw,
  AlertOctagon,
  Play,
  Square,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Activity
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const FleetOverview = ({
  fleetData,
  isLoading,
  error,
  onRefresh,
  onSelectMachine,
  addToast
}) => {
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});

  const handleStartMachine = async (e, machineId) => {
    if (e) e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [machineId]: 'starting' }));
    try {
      const res = await fetch(`http://127.0.0.1:5000/machine/${machineId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start machine');
      if (onRefresh) onRefresh();
      if (addToast) {
        addToast({
          title: `Machine ${machineId} Started`,
          message: `Machine ${machineId} resumed normal operation.`,
          type: 'success'
        });
      }
    } catch (err) {
      if (addToast) {
        addToast({
          title: 'Start Command Error',
          message: err.message,
          type: 'error'
        });
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [machineId]: null }));
    }
  };

  const handleStopMachine = async (e, machineId) => {
    if (e) e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [machineId]: 'stopping' }));
    try {
      const res = await fetch(`http://127.0.0.1:5000/machine/${machineId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to stop machine');
      if (onRefresh) onRefresh();
      if (addToast) {
        addToast({
          title: `Machine ${machineId} Stopped`,
          message: `Machine ${machineId} stopped safely.`,
          type: 'info'
        });
      }
    } catch (err) {
      if (addToast) {
        addToast({
          title: 'Stop Command Error',
          message: err.message,
          type: 'error'
        });
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [machineId]: null }));
    }
  };

  if (isLoading && !fleetData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500 font-mono">Loading Fleet Overview...</p>
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
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  const { machines = [], summary = {}, timestamp = '' } = fleetData || {};

  const filteredMachines = machines.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'running') return m.status === 'Working' || m.is_running;
    if (filter === 'warning') return m.status === 'Warning';
    if (filter === 'critical') return m.status === 'Critical';
    if (filter === 'stopped') return m.status === 'Stopped' || m.is_stopped || m.status === 'Failed';
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Fleet Overview
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Detailed machine status, live sensor telemetry, and controls
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            {timestamp ? timestamp.split(' ')[1] || timestamp : ''}
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {[
          { id: 'all', label: `All (${machines.length})` },
          { id: 'running', label: `Running (${summary.running_machines ?? summary.working_machines ?? 0})` },
          { id: 'warning', label: `Warning (${summary.warning_machines ?? 0})` },
          { id: 'critical', label: `Critical (${summary.critical_machines ?? 0})` },
          { id: 'stopped', label: `Stopped (${summary.stopped_machines ?? 0})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              filter === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Machine Cards Grid */}
      {filteredMachines.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2">
          <p className="text-sm font-medium text-slate-600">No machines match the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMachines.map((m) => {
            const isStopped = m.status === 'Stopped' || m.is_stopped || m.status === 'Failed';
            const isCritical = m.status === 'Critical' || m.failure_probability >= 50;

            const tempK = m.sensor_values?.air_temperature
              ? `${Math.round(m.sensor_values.air_temperature)} K`
              : '--';
            const rpm = m.sensor_values?.rotational_speed
              ? `${Math.round(m.sensor_values.rotational_speed)}`
              : '--';
            const torque = m.sensor_values?.torque
              ? `${Math.round(m.sensor_values.torque)} Nm`
              : '--';
            const toolWear = m.sensor_values?.tool_wear
              ? `${Math.round(m.sensor_values.tool_wear)} min`
              : '--';

            return (
              <div
                key={m.id}
                className={`bg-white rounded-xl border transition shadow-sm hover:shadow-md flex flex-col justify-between ${
                  isCritical
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : isStopped
                    ? 'border-slate-200 opacity-90'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-4 space-y-3.5">
                  {/* Card Header: Machine ID & Status */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-base">
                          {m.id}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Type {m.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium truncate max-w-[180px]">
                        {m.name}
                      </div>
                    </div>
                    <StatusBadge status={m.status} size="sm" />
                  </div>

                  {/* Health & Failure Risk Section */}
                  <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Health</span>
                      <span className="font-mono font-bold text-slate-900">
                        {m.health_score}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Failure Risk</span>
                      <span
                        className={`font-mono font-bold ${
                          m.failure_probability > 50
                            ? 'text-rose-600'
                            : m.failure_probability > 20
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {m.failure_probability}%
                      </span>
                    </div>
                  </div>

                  {/* Sensor Telemetry Section (Shown for Running / Active Machines) */}
                  {!isStopped ? (
                    <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Temperature</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {tempK}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">RPM</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {rpm}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Torque</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {torque}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tool Wear</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {toolWear}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Card Action Buttons Footer */}
                <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectMachine(m.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isStopped ? (
                    <button
                      onClick={(e) => handleStartMachine(e, m.id)}
                      disabled={actionLoading[m.id] === 'starting'}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>
                        {actionLoading[m.id] === 'starting' ? 'Starting...' : 'Start'}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleStopMachine(e, m.id)}
                      disabled={actionLoading[m.id] === 'stopping'}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>
                        {actionLoading[m.id] === 'stopping' ? 'Stopping...' : 'Stop'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FleetOverview;
