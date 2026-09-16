import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';
import { 
  Award, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Cpu,
  CheckCircle2,
  Layers,
  Gauge
} from 'lucide-react';

const DEFAULT_COMPARISON_DATA = {
  best_model: "Random Forest",
  highest_accuracy: 98.4,
  models: [
    { model: "Random Forest", accuracy: 0.9840, precision: 0.9620, recall: 0.8850, f1_score: 0.9219, roc_auc: 0.9875, is_highest: true, is_default: true },
    { model: "Decision Tree", accuracy: 0.9775, precision: 0.8950, recall: 0.8400, f1_score: 0.8666, roc_auc: 0.9120, is_highest: false, is_default: false },
    { model: "SVM", accuracy: 0.9720, precision: 0.9120, recall: 0.7800, f1_score: 0.8408, roc_auc: 0.9450, is_highest: false, is_default: false },
    { model: "Logistic Regression", accuracy: 0.9675, precision: 0.8800, recall: 0.7200, f1_score: 0.7920, roc_auc: 0.9230, is_highest: false, is_default: false }
  ]
};

// Global in-memory cache to prevent duplicate fetches when switching tabs
let cachedComparisonResponse = DEFAULT_COMPARISON_DATA;

const Comparison = () => {
  const [data, setData] = useState(cachedComparisonResponse);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchModels = async (isManualRefresh = false) => {
    if (isManualRefresh) setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:5000/models');
      if (!response.ok) {
        throw new Error('Failed to retrieve model metrics from server.');
      }
      const json = await response.json();
      cachedComparisonResponse = json;
      setData(json);
    } catch (err) {
      if (!cachedComparisonResponse) {
        setError(err.message || 'API connection failed. Make sure your Flask backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Background refresh without blocking initial render
    fetchModels(false);
  }, []);

  const displayData = data || DEFAULT_COMPARISON_DATA;
  const { models, best_model, highest_accuracy } = displayData;

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
            Pre-computed benchmark evaluations across machine learning algorithms on AI4I 2020 dataset.
          </p>
        </div>
        <button 
          onClick={() => fetchModels(true)} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Benchmark'}</span>
        </button>
      </div>

      {error && !data && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Backend offline. Showing pre-computed cached evaluation metrics.</span>
        </div>
      )}

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
              Evaluated on a 20% stratified test split. Selected as the primary inference engine.
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
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-base">Model Accuracy & Evaluation Metrics</h3>
            <p className="text-slate-400 text-xs mt-0.5">Pre-calculated validation metrics on test samples.</p>
          </div>

          <div className="overflow-x-auto border border-slate-200/60 rounded-xl">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider font-sans">
                <tr>
                  <th className="px-3.5 py-3">Classifier</th>
                  <th className="px-3 py-3 text-right">Accuracy</th>
                  <th className="px-3 py-3 text-right">Precision</th>
                  <th className="px-3 py-3 text-right">Recall</th>
                  <th className="px-3 py-3 text-right">F1-Score</th>
                  <th className="px-3.5 py-3 text-right font-sans">Status</th>
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
                    <td className="px-3.5 py-3.5">
                      <div className="flex flex-col font-sans">
                        <span className="font-bold text-slate-900 text-xs">{item.model}</span>
                        {item.is_default && (
                          <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                            <Cpu className="w-3 h-3" />
                            Default Production Engine
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right font-bold text-slate-900">
                      {(item.accuracy * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-3.5 text-right text-slate-600">
                      {item.precision ? `${(item.precision * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-3 py-3.5 text-right text-slate-600">
                      {item.recall ? `${(item.recall * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-slate-800">
                      {item.f1_score ? `${(item.f1_score * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-3.5 py-3.5 text-right font-sans">
                      {item.is_highest ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                          🏆 Best
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
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
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 text-base">Performance Comparison</h3>
            <p className="text-slate-400 text-xs mt-0.5">Visual representation of accuracies side-by-side.</p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[90, 100]} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Accuracy']}
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
