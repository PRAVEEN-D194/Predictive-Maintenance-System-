import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';
import { 
  Sliders, 
  Award, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Cpu
} from 'lucide-react';

const Comparison = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:5000/models');
      if (!response.ok) {
        throw new Error('Failed to retrieve model metrics from server.');
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
    fetchModels();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Retrieving training evaluation records...</p>
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
            onClick={fetchModels}
            className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium shadow-lg shadow-red-600/20 hover:bg-red-700 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { models, best_model, highest_accuracy } = data;

  // Chart data formatting
  // Scaling accuracies slightly for a cleaner y-axis display (e.g. 0.9675 * 100 = 96.75)
  const chartData = models.map(item => ({
    name: item.model,
    accuracy: item.accuracy * 100,
    is_highest: item.is_highest,
    is_default: item.is_default
  }));

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Model Comparison
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Evaluate accuracy performance across standard ML classification algorithms.
          </p>
        </div>
        <button 
          onClick={fetchModels} 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Re-evaluate Models
        </button>
      </div>

      {/* Model Highlight Card */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="p-3 bg-white/10 rounded-xl">
            <Award className="w-8 h-8 text-yellow-300 animate-bounce" />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Highest Performing Predictor</span>
            <h3 className="text-2xl font-black mt-0.5 tracking-tight font-display">
              {best_model}
            </h3>
            <p className="text-xs text-blue-100 mt-1 opacity-90">
              Evaluated on a 20% stratified test set. Reaches optimal classification bounds.
            </p>
          </div>
        </div>
        <div className="bg-white/10 px-6 py-4 rounded-xl text-center backdrop-blur-sm border border-white/15">
          <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Accuracy Score</span>
          <h2 className="text-3xl font-black text-white mt-0.5">{highest_accuracy}%</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Table of models */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-base">Model Accuracy Log</h3>
            <p className="text-slate-400 text-xs mt-0.5">Summary of evaluated classification accuracy.</p>
          </div>

          <div className="overflow-x-auto border border-slate-200/60 rounded-xl">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Classifier</th>
                  <th className="px-4 py-3">Accuracy Score</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                {models.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className={`transition duration-150 ${
                      item.is_highest 
                        ? 'bg-blue-50/40 hover:bg-blue-50/60' 
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{item.model}</span>
                        {item.is_default && (
                          <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                            <Cpu className="w-3 h-3" />
                            Default Inference Model
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {(item.accuracy * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {item.is_highest ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 shadow-sm animate-pulse">
                          🏆 Best
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-250">
                          Evaluated
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Comparison Bar Chart */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-base">Performance Comparison</h3>
            <p className="text-slate-400 text-xs mt-0.5">Visual representation of accuracies side-by-side.</p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* Restrict domain to [90, 100] to highlight differences between models */}
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[90, 100]} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value) => [`${value.toFixed(2)}%`, 'Accuracy']}
                />
                <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.is_highest ? '#2563eb' : '#94a3b8'} 
                      opacity={entry.is_highest ? 1.0 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Comparison;
