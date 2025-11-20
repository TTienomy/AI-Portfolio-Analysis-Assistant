"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { TrendingUp, Activity, PieChart } from 'lucide-react';

export default function PortfolioAnalysis({ tickers }) {
  const router = useRouter();
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [riskFreeRate, setRiskFreeRate] = useState(2.0);
  const [inputRiskFreeRate, setInputRiskFreeRate] = useState(2.0);

  useEffect(() => {
    if (!tickers || tickers.length === 0) return;

    async function runAnalysis() {
      setLoading(true);
      setError('');
      setAnalysisData(null);
      try {
        const res = await axios.post('http://localhost:8000/api/analyze', {
          tickers: tickers,
          risk_free_rate: riskFreeRate / 100
        });
        setAnalysisData(res.data);
      } catch (err) {
        console.error("Analysis error:", err);
        setError('Failed to analyze portfolio. Ensure backend is running and data is available.');
      } finally {
        setLoading(false);
      }
    }

    runAnalysis();
  }, [tickers, riskFreeRate]);

  if (!tickers || tickers.length === 0) {
    return (
      <div className="text-center text-gray-400 py-10">
        Select stocks using the filter to begin analysis.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
        {error}
      </div>
    );
  }

  if (!analysisData) return null;

  const { optimization, efficient_frontier } = analysisData;

  // Prepare data for Efficient Frontier Chart
  const frontierData = efficient_frontier.volatility.map((vol, i) => ({
    volatility: vol,
    return: efficient_frontier.returns[i]
  }));

  // Prepare Optimal Portfolio Point
  const optimalPoint = [{ x: optimization.risk, y: optimization.return }];

  return (
    <div className="space-y-6">
      {/* Risk-Free Rate Input */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Risk-Free Rate (%)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            value={inputRiskFreeRate}
            onChange={(e) => setInputRiskFreeRate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setRiskFreeRate(parseFloat(inputRiskFreeRate) || 0);
              }
            }}
            className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 1.785"
          />
          <button
            onClick={() => setRiskFreeRate(parseFloat(inputRiskFreeRate) || 0)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            Update
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Adjust the risk-free rate and click Update to recalculate (default: 2%)</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Expected Return"
          value={`${(optimization.return * 100).toFixed(2)}%`}
          icon={<TrendingUp className="text-green-400" />}
        />
        <MetricCard
          title="Risk (Volatility)"
          value={`${(optimization.risk * 100).toFixed(2)}%`}
          icon={<Activity className="text-red-400" />}
        />
        <MetricCard
          title="Sharpe Ratio"
          value={optimization.sharpe_ratio.toFixed(2)}
          icon={<PieChart className="text-blue-400" />}
        />
      </div>

      {/* Efficient Frontier Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Efficient Frontier</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" dataKey="volatility" name="Risk" unit="" stroke="#888" />
              <YAxis type="number" dataKey="return" name="Return" unit="" stroke="#888" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Scatter name="Efficient Frontier" data={frontierData} fill="#3b82f6" line shape="circle" />
              <Scatter name="Optimal Portfolio" data={optimalPoint} fill="#10b981" shape="star" s={200} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Weights Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Optimal Allocation</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-black/20 text-gray-400">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Ticker</th>
                <th className="px-4 py-3 rounded-r-lg text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(optimization.weights)
                .sort(([, a], [, b]) => b - a)
                .filter(([, weight]) => weight > 0.001) // Filter out negligible weights
                .map(([ticker, weight]) => (
                  <tr
                    key={ticker}
                    onClick={() => router.push(`/dashboard/${ticker}`)}
                    className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                      {ticker}
                      <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">View</span>
                    </td>
                    <td className="px-4 py-3 text-right">{(weight * 100).toFixed(2)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function MetricCard({ title, value, icon }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 flex items-center justify-between"
    >
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </div>
      <div className="p-3 bg-white/5 rounded-lg">
        {icon}
      </div>
    </motion.div>
  );
}
