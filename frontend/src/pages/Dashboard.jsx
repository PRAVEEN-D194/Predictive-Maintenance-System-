import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { 
  Layers, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Percent, 
  Database,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const FAILURE_COLORS = ['#10b981', '#ef4444'];

const Dashboard = () => {
  const [dbData, setDbData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dbRes, analyticsRes] = await Promise.all([
        fetch('http://127.0.0.1:5000/dashboard'),
        fetch('http://127.0.0.1:5000/analytics')
      ]);

      if (!dbRes.ok || !analyticsRes.ok) {
        throw new Error('Failed to fetch dashboard data from server.');
      }

      const dbJson = await dbRes.json();
      const analyticsJson = await analyticsRes.json();

      setDbData(dbJson);
      setAnalyticsData(analyticsJson);
    } catch (err) {
      setError(err.message || 'API connection failed. Make sure your Flask backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Loading industrial telemetry and analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-md text-center shadow-sm">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Backend Connection Error</h3>
          <p className="text-sm text-red-600 mb-6">{error}</p>
          <button 
            onClick={fetchData}
            className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium shadow-lg shadow-red-600/20 hover:bg-red-700 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { summary, first_10_rows } = dbData;
  const { type_dist, failure_dist, air_temp_dist, process_temp_dist, tool_wear_dist } = analyticsData;

  const cardStats = [
    { 
      title: 'Total Machines', 
      value: summary.total_machines.toLocaleString(), 
      icon: Database, 
      color: 'blue', 
      bg: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/5' 
    },
    { 
      title: 'Healthy Machines', 
      value: summary.healthy_machines.toLocaleString(), 
      icon: CheckCircle, 
      color: 'emerald', 
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5' 
    },
    { 
      title: 'Failed Machines', 
      value: summary.failed_machines.toLocaleString(), 
      icon: AlertTriangle, 
      color: 'red', 
      bg: 'bg-red-50 text-red-600 border-red-100 shadow-red-500/5' 
    },
    { 
      title: 'RF Accuracy', 
      value: `${summary.accuracy}%`, 
      icon: Percent, 
      color: 'indigo', 
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-500/5' 
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Diagnostics Dashboard
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Real-time machine health state and telemetry metrics.
          </p>
        </div>
        <button 
          onClick={fetchData} 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Telemetry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardStats.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className={`p-6 bg-white border border-slate-200/80 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 group`}
            >
              <div className={`p-3 rounded-xl ${card.bg.split(' ')[0]} ${card.bg.split(' ')[1]}`}>
                <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.title}</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">{card.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Graphs Row (Type & Failure Distributions) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Machine Type Distribution */}
        <div className="lg:col-span-3 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-base">Machine Type Distribution</h3>
            <p className="text-slate-400 text-xs mt-0.5">Asset count classified by quality grade (L/M/H)</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={type_dist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="type" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {type_dist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Failure Distribution */}
        <div className="lg:col-span-2 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-base">Failure Distribution</h3>
            <p className="text-slate-400 text-xs mt-0.5">Ratio of healthy assets to failed assets</p>
          </div>
          <div className="h-64 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={failure_dist}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {failure_dist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FAILURE_COLORS[index % FAILURE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Donut Chart Center Text */}
            <div className="absolute text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Failure Rate</span>
              <p className="text-2xl font-extrabold text-slate-800 mt-0.5">
                {((summary.failed_machines / summary.total_machines) * 100).toFixed(2)}%
              </p>
            </div>
          </div>
          {/* Legend indicator */}
          <div className="flex justify-center gap-6 text-xs font-semibold text-slate-600 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Failed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distributions Row (Air Temp, Process Temp, Tool Wear) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Air Temperature Distribution */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Air Temperature Distribution</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">Frequencies across temperature segments (K)</p>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={air_temp_dist} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAirTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="bin" tickFormatter={(val) => val.split(' ')[0]} stroke="#cbd5e1" fontSize={9} />
                <YAxis stroke="#cbd5e1" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAirTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Process Temperature Distribution */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Process Temperature Distribution</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">Frequencies across temperature segments (K)</p>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={process_temp_dist} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProcTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="bin" tickFormatter={(val) => val.split(' ')[0]} stroke="#cbd5e1" fontSize={9} />
                <YAxis stroke="#cbd5e1" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorProcTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tool Wear Distribution */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Tool Wear Distribution</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">Machine count grouped by tool wear duration</p>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tool_wear_dist} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="bin" tickFormatter={(val) => val.split(' ')[0]} stroke="#cbd5e1" fontSize={9} />
                <YAxis stroke="#cbd5e1" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="count" fill="#ec4899" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dataset Table Row (First 10 rows) */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Dataset Preview (First 10 Rows)</h3>
            <p className="text-slate-400 text-xs mt-0.5">Original raw telemetry data extracted from the CSV source</p>
          </div>
          <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-full font-semibold">
            ai4i2020.csv
          </span>
        </div>
        <div className="overflow-x-auto border border-slate-200/60 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">UDI</th>
                <th className="px-4 py-3">Product ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Air Temp (K)</th>
                <th className="px-4 py-3">Process Temp (K)</th>
                <th className="px-4 py-3">Speed (rpm)</th>
                <th className="px-4 py-3">Torque (Nm)</th>
                <th className="px-4 py-3">Tool Wear (min)</th>
                <th className="px-4 py-3">Failure Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
              {first_10_rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition duration-150">
                  <td className="px-4 py-3 font-semibold text-slate-500">{row.UDI || row.udi}</td>
                  <td className="px-4 py-3 text-slate-900">{row['Product ID'] || row.product_id}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      row.Type === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      row.Type === 'M' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      'bg-purple-50 text-purple-700 border border-purple-100'
                    }`}>
                      {row.Type || row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row['Air temperature [K]'] || row.air_temperature}</td>
                  <td className="px-4 py-3">{row['Process temperature [K]'] || row.process_temperature}</td>
                  <td className="px-4 py-3">{row['Rotational speed [rpm]'] || row.rotational_speed}</td>
                  <td className="px-4 py-3">{row['Torque [Nm]'] || row.torque}</td>
                  <td className="px-4 py-3">{row['Tool wear [min]'] || row.tool_wear}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      (row['Machine failure'] === 1 || row.machine_failure === 1)
                        ? 'bg-red-50 text-red-600 border border-red-100' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {(row['Machine failure'] === 1 || row.machine_failure === 1) ? 'Failure' : 'Healthy'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Simulation Disclaimer */}
      <div className="bg-slate-150 border border-slate-200/60 rounded-2xl p-4 text-center text-xs text-slate-500 font-medium">
        Simulation using historical dataset. All charts, stats, and telemetry logs correspond directly to the source database.
      </div>
    </div>
  );
};

export default Dashboard;
