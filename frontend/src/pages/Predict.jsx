import React, { useEffect, useState, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Compass, 
  Cpu, 
  Info, 
  RefreshCw, 
  RotateCw, 
  ShieldAlert, 
  Thermometer, 
  Wrench, 
  Zap 
} from 'lucide-react';

const Predict = () => {
  const [currentData, setCurrentData] = useState(null);
  const [chartHistory, setChartHistory] = useState([]);
  const [eventLog, setEventLog] = useState([]);
  const [history60s, setHistory60s] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(true);

  // Statistics counters
  const [stats, setStats] = useState({
    totalPredictions: 0,
    healthyCount: 0,
    warningCount: 0,
    criticalCount: 0,
    failureAlertsCount: 0
  });

  const lastAlertTimeRef = useRef(0);

  const fetchLiveTelemetry = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/live-status');
      if (!response.ok) {
        throw new Error('Unable to fetch live telemetry from server.');
      }
      const data = await response.json();
      setCurrentData(data);
      setError(null);

      const timeFormatted = data.timestamp.split(' ')[1] || data.timestamp;

      // 1. Update 20-record Chart History
      setChartHistory(prev => {
        const newPoint = {
          time: timeFormatted,
          air_temperature: data.sensor_values.air_temperature,
          process_temperature: data.sensor_values.process_temperature,
          rotational_speed: data.sensor_values.rotational_speed,
          torque: data.sensor_values.torque,
          tool_wear: data.sensor_values.tool_wear
        };
        const updated = [...prev, newPoint];
        return updated.slice(-20); // Keep only latest 20
      });

      // 2. Update Event Log (Newest events first)
      setEventLog(prev => {
        const newEntry = {
          id: Date.now() + Math.random(),
          time: timeFormatted,
          status: data.status,
          confidence: `${data.confidence}%`,
          riskLevel: data.risk_level
        };
        return [newEntry, ...prev].slice(0, 50); // Keep top 50
      });

      // 3. Update Statistics
      setStats(prev => ({
        ...prev,
        totalPredictions: prev.totalPredictions + 1,
        healthyCount: data.status === 'Healthy' ? prev.healthyCount + 1 : prev.healthyCount,
        warningCount: data.status === 'Warning' ? prev.warningCount + 1 : prev.warningCount,
        criticalCount: data.status === 'Critical' ? prev.criticalCount + 1 : prev.criticalCount
      }));

      // 4. Update 60-second window history (at 5s interval, max 12 items = 60s)
      setHistory60s(prev => {
        const isHighOrCritical = data.risk_level === 'High Risk' || data.risk_level === 'Critical Risk' || data.status === 'Critical';
        const updatedWindow = [...prev, { isHighOrCritical, time: Date.now() }].slice(-12);
        
        // Count high/critical risk predictions in the 60s window
        const highRiskCount = updatedWindow.filter(item => item.isHighOrCritical).length;

        // Trigger alert if high/critical risk occurs > 8 times in 60s window
        if (highRiskCount > 8 && !showAlert && Date.now() - lastAlertTimeRef.current > 30000) {
          setShowAlert(true);
          lastAlertTimeRef.current = Date.now();
          setStats(s => ({ ...s, failureAlertsCount: s.failureAlertsCount + 1 }));
        }

        return updatedWindow;
      });

    } catch (err) {
      setError(err.message || 'Telemetry connection failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTelemetry();

    const intervalId = setInterval(() => {
      if (isLive) {
        fetchLiveTelemetry();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isLive, showAlert]);

  const handlePerformMaintenance = async () => {
    try {
      await fetch('http://127.0.0.1:5000/live-reset', { method: 'POST' });
    } catch (e) {
      console.error('Failed to reset backend state:', e);
    }
    setShowAlert(false);
    setHistory60s([]);
    fetchLiveTelemetry();
  };

  if (loading && !currentData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-semibold animate-pulse">Initializing Live Telemetry Feed for Machine MC-101...</p>
      </div>
    );
  }

  // Color helper functions
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Healthy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Healthy': return 'text-emerald-600';
      case 'Warning': return 'text-amber-500';
      case 'Critical': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Live Asset Monitoring
            </h1>
            {/* LIVE Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider leading-none">
                {isLive ? 'LIVE' : 'PAUSED'}
              </span>
            </div>
          </div>
          <p className="text-slate-500 mt-1 font-medium text-sm">
            Continuous sensor telemetry for industrial machine <strong className="text-slate-800 font-bold">MC-101</strong> with live Random Forest model inference.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition shadow-sm ${
              isLive 
                ? 'bg-slate-800 text-white hover:bg-slate-700 active:bg-slate-900'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-blue-500/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            {isLive ? 'Pause Stream' : 'Resume Stream'}
          </button>
          <button 
            onClick={fetchLiveTelemetry}
            disabled={!isLive}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 animate-bounce" />
          <div className="text-xs">
            <span className="font-bold block">Backend Communication Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 🚨 MACHINE FAILURE ALERT OVERLAY BANNER */}
      {showAlert && (
        <div className="bg-red-600 text-white p-6 rounded-2xl shadow-xl border-2 border-red-400 animate-pulse flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm shrink-0">
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-white text-red-600 text-xs font-black uppercase rounded-md tracking-wider">
                  🚨 MACHINE FAILURE ALERT
                </span>
                <span className="text-xs opacity-90 font-medium">
                  {currentData?.timestamp}
                </span>
              </div>
              <h2 className="text-xl font-black mt-1">
                Machine ID: {currentData?.machine_id || 'MC-101'} - High Failure Risk Detected
              </h2>
              <p className="text-xs text-red-100 mt-1 font-medium">
                The trained Random Forest model has predicted High/Critical Risk consistently over the last 60 seconds.
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="font-bold text-red-100">Recommended Actions:</span>
                <span className="px-2.5 py-1 bg-red-700/60 rounded-lg border border-red-400/40">🔧 Inspect Machine</span>
                <span className="px-2.5 py-1 bg-red-700/60 rounded-lg border border-red-400/40">⚙️ Replace Worn Tool</span>
                <span className="px-2.5 py-1 bg-red-700/60 rounded-lg border border-red-400/40">🔩 Check Bearings</span>
              </div>
            </div>
          </div>

          <button
            onClick={handlePerformMaintenance}
            className="w-full md:w-auto px-6 py-3 bg-white text-red-600 hover:bg-red-50 active:bg-red-100 font-extrabold text-sm rounded-xl transition shadow-lg shrink-0 flex items-center justify-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Perform Maintenance
          </button>
        </div>
      )}

      {/* Session Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Predictions</span>
          <div className="text-2xl font-black text-slate-800 mt-1 font-display">{stats.totalPredictions}</div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">Healthy Count</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-display">{stats.healthyCount}</div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Warning Count</span>
          <div className="text-2xl font-black text-amber-600 mt-1 font-display">{stats.warningCount}</div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">Critical Count</span>
          <div className="text-2xl font-black text-red-600 mt-1 font-display">{stats.criticalCount}</div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest block">Failure Alerts</span>
          <div className="text-2xl font-black text-purple-600 mt-1 font-display">{stats.failureAlertsCount}</div>
        </div>
      </div>

      {currentData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Main Status & ML Inference Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col justify-between transition-all duration-300">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Target Unit</span>
                  <h3 className="font-black text-slate-900 text-xl font-display">
                    Machine ID: <span className="text-blue-600">{currentData.machine_id}</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Type:</span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    currentData.machine_type === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    currentData.machine_type === 'M' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-purple-50 text-purple-700 border border-purple-100'
                  }`}>
                    {currentData.machine_type}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-6 rounded-2xl border text-center transition-colors duration-500 ${
                currentData.status === 'Healthy' ? 'bg-emerald-50/80 border-emerald-200' :
                currentData.status === 'Warning' ? 'bg-amber-50/80 border-amber-200' :
                'bg-red-50/80 border-red-200 shadow-lg shadow-red-500/5 animate-pulse'
              }`}>
                <div className="flex justify-center mb-3">
                  {currentData.status === 'Healthy' && (
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                  )}
                  {currentData.status === 'Warning' && (
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                  )}
                  {currentData.status === 'Critical' && (
                    <div className="p-3 bg-red-100 text-red-600 rounded-full animate-bounce">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Random Forest Classifier Output</span>
                <h2 className={`text-3xl font-black mt-1 ${getStatusColor(currentData.status)}`}>
                  {currentData.status.toUpperCase()}
                </h2>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(currentData.status)}`}>
                    ● {currentData.status} Condition
                  </span>
                </div>
              </div>
            </div>

            {/* Failure Probability & Risk Gauge */}
            <div className="my-6 p-4 bg-slate-50/80 border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-center justify-around gap-6">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke={currentData.failure_probability > 50 ? '#ef4444' : currentData.failure_probability > 25 ? '#f59e0b' : '#10b981'}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={2 * Math.PI * 46 * (1 - currentData.failure_probability / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-lg font-black text-slate-800 leading-none">{currentData.failure_probability}%</span>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Failure Prob.
                  </span>
                </div>
              </div>

              <div className="text-center sm:text-left space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Risk Level</span>
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-extrabold mt-0.5 border ${
                    currentData.risk_level === 'Critical Risk' ? 'bg-red-100 text-red-800 border-red-200' :
                    currentData.risk_level === 'High Risk' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    currentData.risk_level === 'Medium Risk' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {currentData.risk_level}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Confidence Score</span>
                  <span className="text-sm font-extrabold text-slate-800">{currentData.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Last updated timestamp */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Last Updated: {currentData.timestamp}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">5s Tick</span>
            </div>
          </div>

          {/* Telemetry Sensor Values Grid */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Air Temperature */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Air Temp</span>
                  <h4 className="font-extrabold text-slate-800 text-base mt-0.5">
                    {currentData.sensor_values.air_temperature} <span className="text-xs font-medium text-slate-500">K</span>
                  </h4>
                  <span className="text-[9px] text-slate-400 font-medium">Range: 295–305 K</span>
                </div>
              </div>

              {/* Process Temperature */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Process Temp</span>
                  <h4 className="font-extrabold text-slate-800 text-base mt-0.5">
                    {currentData.sensor_values.process_temperature} <span className="text-xs font-medium text-slate-500">K</span>
                  </h4>
                  <span className="text-[9px] text-slate-400 font-medium">Range: 305–320 K</span>
                </div>
              </div>

              {/* Rotational Speed */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Rotational Speed</span>
                  <h4 className="font-extrabold text-slate-800 text-base mt-0.5">
                    {currentData.sensor_values.rotational_speed} <span className="text-xs font-medium text-slate-500">RPM</span>
                  </h4>
                  <span className="text-[9px] text-slate-400 font-medium">Range: 1100–3000 RPM</span>
                </div>
              </div>

              {/* Torque */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Torque</span>
                  <h4 className="font-extrabold text-slate-800 text-base mt-0.5">
                    {currentData.sensor_values.torque} <span className="text-xs font-medium text-slate-500">Nm</span>
                  </h4>
                  <span className="text-[9px] text-slate-400 font-medium">Range: 10–80 Nm</span>
                </div>
              </div>

              {/* Tool Wear */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tool Wear</span>
                  <h4 className="font-extrabold text-slate-800 text-base mt-0.5">
                    {currentData.sensor_values.tool_wear} <span className="text-xs font-medium text-slate-500">min</span>
                  </h4>
                  <span className="text-[9px] text-slate-400 font-medium">Range: 0–250 min</span>
                </div>
              </div>

              {/* Machine ID info */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl shrink-0">
                  <Cpu className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Model</span>
                  <h4 className="font-extrabold text-slate-800 text-sm mt-0.5">Random Forest</h4>
                  <span className="text-[9px] text-emerald-600 font-semibold">Trained Classifier</span>
                </div>
              </div>
            </div>

            {/* Note banner */}
            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-3 text-xs">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-blue-900 font-medium leading-relaxed">
                Simulation using generated industrial sensor data with predictions from the existing trained Random Forest model.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME CHARTS (LATEST 20 RECORDS) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 font-display">Real-Time Telemetry Charts</h2>
            <p className="text-xs text-slate-500 font-medium">Showing the latest 20 telemetry records continuously updated every 5 seconds.</p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
            Latest 20 Records
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Temperature vs Time */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Temperature vs Time (K)</h3>
            <p className="text-slate-400 text-[11px] mb-4">Air Temperature & Process Temperature</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#cbd5e1" fontSize={9} />
                  <YAxis stroke="#cbd5e1" fontSize={9} domain={[290, 325]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="air_temperature" name="Air Temp (K)" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="process_temperature" name="Process Temp (K)" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: RPM vs Time */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-1">RPM vs Time</h3>
            <p className="text-slate-400 text-[11px] mb-4">Rotational Speed (RPM)</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#cbd5e1" fontSize={9} />
                  <YAxis stroke="#cbd5e1" fontSize={9} domain={[1000, 3100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="rotational_speed" name="Rotational Speed (RPM)" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Torque vs Time */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Torque vs Time</h3>
            <p className="text-slate-400 text-[11px] mb-4">Torque (Nm)</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#cbd5e1" fontSize={9} />
                  <YAxis stroke="#cbd5e1" fontSize={9} domain={[0, 85]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="torque" name="Torque (Nm)" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Tool Wear vs Time */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Tool Wear vs Time</h3>
            <p className="text-slate-400 text-[11px] mb-4">Tool Wear Accumulation (min)</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#cbd5e1" fontSize={9} />
                  <YAxis stroke="#cbd5e1" fontSize={9} domain={[0, 260]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="tool_wear" name="Tool Wear (min)" stroke="#ec4899" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* EVENT LOG TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-900 text-lg font-display">Live Event Log</h3>
            <p className="text-xs text-slate-500 font-medium">Real-time prediction event stream. Newest events appear first.</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">Total Logged: {eventLog.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Time</th>
                <th className="py-3 px-4">Machine Status</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4 rounded-r-xl">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {eventLog.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 text-slate-700 font-mono">{event.time}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(event.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        event.status === 'Healthy' ? 'bg-emerald-500' :
                        event.status === 'Warning' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      {event.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 font-semibold">{event.confidence}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                      event.riskLevel === 'Critical Risk' ? 'bg-red-100 text-red-800' :
                      event.riskLevel === 'High Risk' ? 'bg-orange-100 text-orange-800' :
                      event.riskLevel === 'Medium Risk' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {event.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
              {eventLog.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                    Waiting for telemetry data...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Predict;
