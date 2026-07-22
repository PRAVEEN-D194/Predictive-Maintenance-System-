import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  RotateCw, 
  Compass, 
  Wrench, 
  Thermometer,
  Cpu,
  Clock,
  Info
} from 'lucide-react';

const Predict = () => {
  const [liveData, setLiveData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(true);

  const fetchLiveStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/live-status');
      if (!response.ok) {
        throw new Error('Failed to retrieve live asset status.');
      }
      const json = await response.json();
      
      setLiveData(json);
      setError(null);
      
      // Append to local history for sparkline trend (limit to 10 points)
      setHistory(prev => {
        const newPoint = {
          time: json.timestamp.split(' ')[1], // HH:MM:SS
          probability: json.failure_probability,
          rpm: json.sensor_values.rotational_speed,
          torque: json.sensor_values.torque,
          tool_wear: json.sensor_values.tool_wear
        };
        const updated = [...prev, newPoint];
        if (updated.length > 10) {
          updated.shift();
        }
        return updated;
      });
    } catch (err) {
      setError(err.message || 'Unable to connect to Flask API. Verify the server is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchLiveStatus();

    // Poll every 5 seconds
    const intervalId = setInterval(() => {
      if (isLive) {
        fetchLiveStatus();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isLive]);

  if (loading && !liveData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Initializing real-time playback connection...</p>
      </div>
    );
  }

  const toggleSimulation = () => {
    setIsLive(!isLive);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Live Asset Monitoring
            </h1>
            {/* Flashing Live indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-150 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 ${isLive ? '' : 'hidden'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 bg-red-500`}></span>
              </span>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest leading-none">
                {isLive ? 'LIVE' : 'PAUSED'}
              </span>
            </div>
          </div>
          <p className="text-slate-500 mt-1 font-medium">
            Real-time playback simulation of historical asset performance telemetry.
          </p>
        </div>
        
        {/* Toggle Button */}
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSimulation}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition shadow-sm ${
              isLive 
                ? 'bg-slate-800 text-white hover:bg-slate-700 active:bg-slate-900'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-blue-500/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            {isLive ? 'Pause Playback' : 'Resume Playback'}
          </button>
          <button 
            onClick={fetchLiveStatus}
            disabled={!isLive}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Tick Index
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl shadow-sm text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2 animate-bounce" />
          <h4 className="font-bold mb-1">Telemetry Synchronization Interrupted</h4>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {liveData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Live Status Overview Card (Donut, status banner) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Node</span>
                  <h3 className="font-extrabold text-slate-800 text-lg leading-tight font-display">
                    Asset ID: <span className="text-blue-600">{liveData.machine_id}</span>
                  </h3>
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                  liveData.machine_type === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                  liveData.machine_type === 'M' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  'bg-purple-50 text-purple-700 border border-purple-100'
                }`}>
                  Grade: {liveData.machine_type} Quality
                </span>
              </div>

              {/* Major Status Banner */}
              <div className={`p-5 rounded-2xl border text-center transition-colors duration-500 ${
                liveData.status === 'Machine Failure'
                  ? 'bg-red-50 border-red-200 text-red-950 shadow-md shadow-red-500/5'
                  : 'bg-emerald-50 border-emerald-250 text-emerald-950 shadow-md shadow-emerald-500/5'
              }`}>
                <div className="flex justify-center mb-3">
                  {liveData.status === 'Machine Failure' ? (
                    <div className="p-3 bg-red-100 text-red-600 rounded-full animate-bounce">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">ML Classifier Prediction</span>
                <h2 className={`text-2xl font-black mt-1 ${
                  liveData.status === 'Machine Failure' ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {liveData.status === 'Machine Failure' ? 'CRITICAL FAILURE' : 'SYSTEM HEALTHY'}
                </h2>
              </div>
            </div>

            {/* Circular Gauge Failure Probability */}
            <div className="my-8 flex flex-col sm:flex-row items-center justify-around gap-6 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={liveData.status === 'Machine Failure' ? '#fee2e2' : '#d1fae5'}
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={liveData.status === 'Machine Failure' ? '#ef4444' : '#10b981'}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - liveData.failure_probability / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-base font-black text-slate-800 leading-none">{liveData.failure_probability}%</span>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                    Prob.
                  </span>
                </div>
              </div>

              <div className="text-center sm:text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Category</span>
                <div className="mt-1 flex items-center gap-2 justify-center sm:justify-start">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    liveData.risk_level === 'High' ? 'bg-red-100 text-red-700 border border-red-200' :
                    liveData.risk_level === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                    'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    {liveData.risk_level} Risk
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-2 max-w-[180px] leading-relaxed">
                  RF confidence score thresholds trigger immediate node level classification.
                </p>
              </div>
            </div>

            {/* Sync Timestamp Footer */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold border-t border-slate-100 pt-4 mt-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Telemetry Sync: {liveData.timestamp}</span>
            </div>
          </div>

          {/* Right Column: Sensor Readings Grid + Recent Sparkline */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Sensor readings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Air Temperature */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Air Temp</span>
                  <h4 className="font-bold text-slate-800 text-base mt-0.5">{liveData.sensor_values.air_temperature} K</h4>
                </div>
              </div>

              {/* Process Temperature */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Process Temp</span>
                  <h4 className="font-bold text-slate-800 text-base mt-0.5">{liveData.sensor_values.process_temperature} K</h4>
                </div>
              </div>

              {/* Rotational Speed */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Speed</span>
                  <h4 className="font-bold text-slate-800 text-base mt-0.5">{liveData.sensor_values.rotational_speed} rpm</h4>
                </div>
              </div>

              {/* Torque */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Torque</span>
                  <h4 className="font-bold text-slate-800 text-base mt-0.5">{liveData.sensor_values.torque} Nm</h4>
                </div>
              </div>

              {/* Tool Wear */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tool Wear</span>
                  <h4 className="font-bold text-slate-800 text-base mt-0.5">{liveData.sensor_values.tool_wear} min</h4>
                </div>
              </div>

              {/* Model status */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl">
                  <Cpu className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model</span>
                  <h4 className="font-bold text-slate-800 text-xs mt-0.5 truncate">Random Forest</h4>
                </div>
              </div>
            </div>

            {/* Live sparkline chart of failure probability over time */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex-1 flex flex-col justify-between min-h-[220px]">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Failure Probability Sparkline</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Visualizing telemetry trends over the last 10 simulation ticks.</p>
              </div>

              <div className="h-32 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#cbd5e1" fontSize={8} />
                    <YAxis stroke="#cbd5e1" fontSize={8} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                    <Line type="monotone" dataKey="probability" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Simulation Disclaimer Block */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">Simulation Disclaimer</h4>
          <p className="text-blue-800 font-medium mt-1 leading-relaxed">
            Simulation using historical dataset. This is a real-time playback simulation of historical CSV telemetry and does not reflect future predictions or Remaining Useful Life (RUL) estimation. Predictions are generated on-the-fly using the pre-trained Random Forest model for each individual row.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Predict;
