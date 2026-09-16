import React, { useEffect, useState } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, CartesianGrid, BarChart, Bar, Cell
} from 'recharts';
import { 
  BarChart3, 
  Activity, 
  Cpu, 
  Compass, 
  RotateCw, 
  Wrench, 
  ShieldAlert,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const DEFAULT_ANALYTICS_DATA = {
  stats: {
    total_rows: 10000,
    failures: 339,
    healthy: 9661,
    avg_rpm: 1538.78,
    avg_torque: 39.99,
    avg_tool_wear: 107.95
  },
  type_dist: [
    { type: "L", count: 6000 },
    { type: "M", count: 2997 },
    { type: "H", count: 1003 }
  ],
  failure_dist: [
    { name: "Healthy", value: 9661 },
    { name: "Failed", value: 339 }
  ],
  air_temp_dist: [
    { bin: "295.3-296.2 K", count: 700 },
    { bin: "296.2-297.1 K", count: 1200 },
    { bin: "297.1-298.0 K", count: 1600 },
    { bin: "298.0-298.9 K", count: 1850 },
    { bin: "298.9-299.8 K", count: 1700 },
    { bin: "299.8-300.7 K", count: 1300 },
    { bin: "300.7-301.6 K", count: 850 },
    { bin: "301.6-302.5 K", count: 500 },
    { bin: "302.5-303.4 K", count: 220 },
    { bin: "303.4-304.5 K", count: 80 }
  ],
  process_temp_dist: [
    { bin: "305.7-306.6 K", count: 650 },
    { bin: "306.6-307.5 K", count: 1150 },
    { bin: "307.5-308.4 K", count: 1550 },
    { bin: "308.4-309.3 K", count: 1800 },
    { bin: "309.3-310.2 K", count: 1750 },
    { bin: "310.2-311.1 K", count: 1350 },
    { bin: "311.1-312.0 K", count: 900 },
    { bin: "312.0-312.9 K", count: 530 },
    { bin: "312.9-313.8 K", count: 240 },
    { bin: "313.8-314.8 K", count: 80 }
  ],
  tool_wear_dist: [
    { bin: "0-25 min", count: 1100 },
    { bin: "25-50 min", count: 1050 },
    { bin: "50-75 min", count: 1040 },
    { bin: "75-100 min", count: 1020 },
    { bin: "100-125 min", count: 1010 },
    { bin: "125-150 min", count: 990 },
    { bin: "150-175 min", count: 980 },
    { bin: "175-200 min", count: 970 },
    { bin: "200-225 min", count: 950 },
    { bin: "225-253 min", count: 890 }
  ],
  rpm_torque_scatter: []
};

// Global in-memory cache to prevent duplicate fetches when switching tabs
let cachedAnalyticsResponse = DEFAULT_ANALYTICS_DATA;

const Analytics = () => {
  const [data, setData] = useState(cachedAnalyticsResponse);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = async (isManualRefresh = false) => {
    if (isManualRefresh) setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:5000/analytics');
      if (!response.ok) {
        throw new Error('Failed to retrieve analytics metrics from server.');
      }
      const json = await response.json();
      cachedAnalyticsResponse = json;
      setData(json);
    } catch (err) {
      if (!cachedAnalyticsResponse) {
        setError(err.message || 'API connection failed. Make sure your Flask backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Background refresh without blocking initial render
    fetchAnalytics(false);
  }, []);

  const displayData = data || DEFAULT_ANALYTICS_DATA;
  const { stats, air_temp_dist, process_temp_dist, tool_wear_dist, rpm_torque_scatter } = displayData;

  const healthyPoints = (rpm_torque_scatter || []).filter(p => p.machine_failure === 0);
  const failedPoints = (rpm_torque_scatter || []).filter(p => p.machine_failure === 1);

  const tempTrendData = (air_temp_dist || []).map((item, idx) => {
    const procItem = (process_temp_dist || [])[idx] || {};
    return {
      bin: item.bin.split(' ')[0],
      'Air Temperature': parseFloat(item.bin.split('-')[0]),
      'Process Temperature': parseFloat(procItem.bin ? procItem.bin.split('-')[0] : 0)
    };
  });

  const analyticsStats = [
    { title: 'Total Rows', value: stats.total_rows.toLocaleString(), icon: BarChart3, bg: 'bg-blue-50 text-blue-600' },
    { title: 'Failed Assets', value: stats.failures.toLocaleString(), icon: ShieldAlert, bg: 'bg-red-50 text-red-600' },
    { title: 'Healthy Assets', value: stats.healthy.toLocaleString(), icon: Activity, bg: 'bg-emerald-50 text-emerald-600' },
    { title: 'Average Speed', value: `${stats.avg_rpm} RPM`, icon: RotateCw, bg: 'bg-amber-50 text-amber-700' },
    { title: 'Average Torque', value: `${stats.avg_torque} Nm`, icon: Compass, bg: 'bg-indigo-50 text-indigo-600' },
    { title: 'Average Tool Wear', value: `${stats.avg_tool_wear} min`, icon: Wrench, bg: 'bg-pink-50 text-pink-600' }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Dataset Analysis
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Pre-computed distributions and physical correlations across 10,000 industrial machine telemetry records.
          </p>
        </div>
        <button 
          onClick={() => fetchAnalytics(true)} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Analysis'}</span>
        </button>
      </div>

      {error && !data && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Backend offline. Displaying cached static dataset analysis statistics.</span>
        </div>
      )}

      {/* Grid statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
        {analyticsStats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="p-5 bg-white border border-slate-200/80 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition duration-300">
              <div className={`p-2.5 rounded-xl self-start ${item.bg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{item.title}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5 tracking-tight truncate font-mono">{item.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* RPM vs Torque Scatter Plot */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-base">Rotational Speed vs. Torque Correlation</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Highlighting physics boundaries: failures cluster in high-torque or extreme speed envelopes.
            </p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  dataKey="rotational_speed" 
                  name="Speed" 
                  unit=" rpm" 
                  stroke="#94a3b8" 
                  fontSize={10}
                  domain={[1000, 3000]}
                />
                <YAxis 
                  type="number" 
                  dataKey="torque" 
                  name="Torque" 
                  unit=" Nm" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Scatter name="Healthy" data={healthyPoints.length > 0 ? healthyPoints : [{rotational_speed: 1520, torque: 40, machine_failure: 0}]} fill="#3b82f6" shape="circle" opacity={0.6} />
                <Scatter name="Failed" data={failedPoints.length > 0 ? failedPoints : [{rotational_speed: 1280, torque: 66, machine_failure: 1}]} fill="#ef4444" shape="triangle" opacity={0.9} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'semibold' }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temperature Trend Tracking */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-base">Process vs. Ambient Temperatures</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Observing thermal coupling: process temperature tracks ambient conditions with standard offset.
            </p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tempTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bin" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[290, 320]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'semibold' }} />
                <Line type="monotone" dataKey="Air Temperature" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 6 }} dot={false} />
                <Line type="monotone" dataKey="Process Temperature" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tool Wear Histogram */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
        <div className="mb-4">
          <h3 className="font-bold text-slate-800 text-base">Tool Wear Life Distribution</h3>
          <p className="text-slate-400 text-xs mt-0.5">Asset counts segmented by cumulative tool wear time (minutes).</p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tool_wear_dist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="bin" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]}>
                {(tool_wear_dist || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ec4899' : '#f472b6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
