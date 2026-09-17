import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  ArrowRight,
  Server,
  Square,
  ShieldAlert,
  Bell,
  Clock
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const Dashboard = ({
  fleetData,
  isLoading,
  error,
  onRefresh,
  onSelectMachine,
  onNavigateFleet
}) => {
  if (isLoading && !fleetData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500 font-mono">Loading Dashboard...</p>
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

  const {
    summary = {
      total_machines: 0,
      working_machines: 0,
      running_machines: 0,
      warning_machines: 0,
      critical_machines: 0,
      stopped_machines: 0,
      fleet_health: 0
    },
    critical_machines = [],
    machines = [],
    timestamp = ''
  } = fleetData || {};

  const runningCount = summary.running_machines ?? summary.working_machines ?? 0;
  const stoppedCount = summary.stopped_machines ?? 0;
  const warningCount = summary.warning_machines ?? 0;
  const criticalCount = summary.critical_machines ?? 0;
  const totalCount = summary.total_machines ?? machines.length ?? 0;
  const fleetHealth = summary.fleet_health ?? 0;

  // Simple KPI summary cards
  const kpiCards = [
    {
      label: 'Total Machines',
      value: totalCount,
      icon: Server,
      color: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200'
    },
    {
      label: 'Running',
      value: runningCount,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-white',
      border: 'border-slate-200'
    },
    {
      label: 'Warning',
      value: warningCount,
      icon: AlertTriangle,
      color: 'text-amber-700',
      bg: 'bg-white',
      border: warningCount > 0 ? 'border-amber-300' : 'border-slate-200'
    },
    {
      label: 'Critical',
      value: criticalCount,
      icon: AlertOctagon,
      color: 'text-rose-700',
      bg: 'bg-white',
      border: criticalCount > 0 ? 'border-rose-300' : 'border-slate-200'
    },
    {
      label: 'Stopped',
      value: stoppedCount,
      icon: Square,
      color: 'text-slate-600',
      bg: 'bg-white',
      border: 'border-slate-200'
    },
    {
      label: 'Fleet Health',
      value: `${fleetHealth}%`,
      icon: Activity,
      color: 'text-blue-700',
      bg: 'bg-white',
      border: 'border-slate-200'
    }
  ];

  // Derive recent alerts from fleet status
  const recentAlerts = [];
  machines.forEach((m) => {
    if (m.status === 'Critical') {
      recentAlerts.push({
        id: `alert-${m.id}-crit`,
        machineId: m.id,
        machineName: m.name,
        severity: 'critical',
        title: 'Critical Risk Threshold',
        message: `${m.recommendations?.problem_title || 'High failure risk detected'} (${m.failure_probability}% risk)`,
        time: timestamp ? timestamp.split(' ')[1] || 'Just now' : 'Just now'
      });
    } else if (m.status === 'Warning') {
      recentAlerts.push({
        id: `alert-${m.id}-warn`,
        machineId: m.id,
        machineName: m.name,
        severity: 'warning',
        title: 'Thermal / Load Warning',
        message: `${m.recommendations?.problem_title || 'Elevated sensor telemetry'} (${m.failure_probability}% risk)`,
        time: timestamp ? timestamp.split(' ')[1] || 'Just now' : 'Just now'
      });
    } else if (m.status === 'Stopped' || m.is_stopped) {
      recentAlerts.push({
        id: `alert-${m.id}-stop`,
        machineId: m.id,
        machineName: m.name,
        severity: 'info',
        title: 'Machine Stopped',
        message: `Machine safely stopped by operator.`,
        time: timestamp ? timestamp.split(' ')[1] || 'Just now' : 'Just now'
      });
    }
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Fleet condition and operational health summary
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border shadow-sm ${kpi.bg} ${kpi.border} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
              <div className={`text-3xl font-bold font-mono tracking-tight ${kpi.color}`}>
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Critical Machines (Left) & Recent Alerts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Small Critical Machines Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Critical Machines
              </h2>
            </div>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-semibold ${
              critical_machines.length > 0
                ? 'bg-rose-100 text-rose-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {critical_machines.length} Critical
            </span>
          </div>

          {critical_machines.length === 0 ? (
            <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All machines operating within normal parameters.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {critical_machines.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">{m.id}</span>
                      <span className="text-xs text-slate-600 font-medium truncate max-w-[160px]">{m.name}</span>
                    </div>
                    <StatusBadge status="Critical" size="sm" />
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-600">
                      Health: <strong className="text-slate-900">{m.health_score}%</strong>
                    </span>
                    <span className="text-slate-600">
                      Risk: <strong className="text-rose-700">{m.failure_probability}%</strong>
                    </span>
                  </div>

                  <div className="pt-2 border-t border-rose-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      {m.recommendations?.problem_title || 'Elevated load and tool wear'}
                    </span>
                    <button
                      onClick={() => onSelectMachine && onSelectMachine(m.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-800 font-mono transition"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Small Recent Alerts Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Recent Alerts
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {recentAlerts.length} Event{recentAlerts.length === 1 ? '' : 's'}
            </span>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 text-center">
              No recent alerts or anomalous conditions.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {recentAlerts.slice(0, 5).map((alert) => {
                let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                if (alert.severity === 'critical') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                if (alert.severity === 'warning') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                if (alert.severity === 'info') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';

                return (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{alert.machineId}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs line-clamp-1">{alert.message}</p>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{alert.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {onNavigateFleet && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={onNavigateFleet}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-200"
              >
                <span>View Full Fleet Overview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
