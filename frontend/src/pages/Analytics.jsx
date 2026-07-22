import React, { useEffect, useState } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, CartesianGrid, BarChart, Bar, Cell
} from 'recharts';
import { 
  BarChart3, 
  Activity, 
  Cpu, 
  Compass, 
  RotateCw, 
  Wrench, 
  Flame, 
  ShieldAlert,
  RefreshCw
} from 'lucide-react';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:5000/analytics');
      if (!response.ok) {
        throw new Error('Failed to retrieve analytics metrics from server.');
      }
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message || 'API connection failed. Make sure your Flask backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Running advanced statistical computations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-md text-center shadow-sm">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Backend Connection Error</h3>
          <p className="text-sm text-red-600 mb-6">{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium shadow-lg shadow-red-600/20 hover:bg-red-700 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { stats, air_temp_dist, process_temp_dist, tool_wear_dist, rpm_torque_scatter } = data;

  // Split scatter sample into healthy vs failed for Recharts custom colouring
  const healthyPoints = rpm_torque_scatter.filter(p => p.machine_failure === 0);
  const failedPoints = rpm_torque_scatter.filter(p => p.machine_failure === 1);

  // Line chart data combining air temp and process temp bins for trend mapping
  const tempTrendData = air_temp_dist.map((item, idx) => {
    const procItem = process_temp_dist[idx] || {};
    return {
      bin: item.bin.split(' ')[0], // just take the left bound value for x-axis
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
            Explore overall distributions and mechanical correlations within raw telemetry.
          </p>
        </div>
        <button 
          onClick={fetchAnalytics} 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Re-calculate Stats
        </button>
      </div>

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
                <h3 className="text-lg font-bold text-slate-900 mt-0.5 tracking-tight truncate">{item.value}</h3>
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
                <Scatter name="Healthy" data={healthyPoints} fill="#3b82f6" shape="circle" opacity={0.6} />
                <Scatter name="Failed" data={failedPoints} fill="#ef4444" shape="triangle" opacity={0.9} />
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
                {tool_wear_dist.map((entry, index) => (
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
