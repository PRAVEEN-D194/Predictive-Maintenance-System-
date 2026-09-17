import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  Cpu, 
  Sliders, 
  BarChart3, 
  ShieldCheck,
  Wrench
} from 'lucide-react';

const Sidebar = ({ currentPage, setCurrentPage, fleetSummary, selectedMachineId }) => {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'fleet-overview', name: 'Fleet Overview', icon: Cpu },
    { id: 'live-monitoring', name: 'Live Monitoring', icon: Activity },
    { id: 'machine-details', name: 'Machine Diagnostics', icon: Wrench, badge: selectedMachineId },
    { id: 'comparison', name: 'Model Comparison', icon: Sliders },
    { id: 'analytics', name: 'Dataset Analysis', icon: BarChart3 }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col h-full border-r border-slate-800 select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg text-white">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-white uppercase">
            Aegis Control
          </h1>
          <span className="text-[11px] text-slate-400 font-mono tracking-wider">
            AI Fleet Diagnostics
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Fleet Quick Status Footer */}
      <div className="p-4 border-t border-slate-800 text-xs space-y-2.5 bg-slate-950/40">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Telemetry Stream
          </span>
          <span className="font-mono text-slate-300">Active</span>
        </div>

        {fleetSummary && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-800/80 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Fleet Health</span>
              <span className="font-bold text-slate-100 text-sm font-mono">{fleetSummary.fleet_health}%</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Critical</span>
              <span className={`font-bold text-sm font-mono ${fleetSummary.critical_machines > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {fleetSummary.critical_machines}
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Simulation Engine</span>
          <span className="text-[10px] font-mono text-slate-400">v2.4.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
