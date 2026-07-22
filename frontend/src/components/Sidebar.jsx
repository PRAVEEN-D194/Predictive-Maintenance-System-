import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  BarChart3, 
  Sliders, 
  Wrench, 
  Cpu
} from 'lucide-react';

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'predict', name: 'Live Monitoring', icon: Cpu },
    { id: 'comparison', name: 'Model Comparison', icon: Sliders },
    { id: 'analytics', name: 'Dataset Analysis', icon: BarChart3 }
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800 shadow-xl select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
          <Wrench className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="font-semibold text-base leading-tight font-display tracking-tight text-white">
            AssetPro
          </h1>
          <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">
            Predictive Maintenance
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              <span>{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-6 border-t border-slate-800 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2 mb-1 text-slate-400">
          <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
          <span>System Status: Active</span>
        </div>
        <p className="text-[10px]">Academic ML Project © 2026</p>
      </div>
    </div>
  );
};

export default Sidebar;
