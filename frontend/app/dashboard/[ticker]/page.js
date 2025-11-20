"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePortfolio } from '../../../context/PortfolioContext';
import { Plus, Check } from 'lucide-react';
import InteractiveChart from '../../../components/InteractiveChart';
import TechSignals from '@/components/TechSignals';

export default function Dashboard() {
  const { ticker } = useParams();
  const { addToWatchlist, isInWatchlist } = usePortfolio();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showESG, setShowESG] = useState(true);

  useEffect(() => {
    if (!ticker) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/dashboard/${ticker}`);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Failed to fetch dashboard data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-xl mb-8">{error}</p>
        <Link href="/" className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              {ticker} Dashboard
            </h1>
            <p className="text-gray-400 mt-1">AI-Powered Investment Analysis</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => addToWatchlist(ticker)}
              disabled={isInWatchlist(ticker)}
              className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${isInWatchlist(ticker)
                ? 'bg-green-600/20 text-green-400 cursor-default'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
            >
              {isInWatchlist(ticker) ? (
                <>
                  <Check size={18} /> Added
                </>
              ) : (
                <>
                  <Plus size={18} /> Add to Watchlist
                </>
              )}
            </button>
            <Link href="/" className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition">
              ← Back to Search
            </Link>
          </div>
        </header>

        {/* Technical Chart and Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700"
            >
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-blue-300">Technical Chart</h2>
                  <p className="text-sm text-gray-400">Interactive Analysis</p>
                </div>
                {data.latest_price && (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">
                      ${data.latest_price.toFixed(2)}
                    </div>
                    <div className={`text-sm font-medium ${data.price_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.price_change >= 0 ? '+' : ''}{data.price_change.toFixed(2)} ({data.price_change_percent.toFixed(2)}%)
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                {data.chart_data ? (
                  <InteractiveChart data={data.chart_data} />
                ) : (
                  <div className="aspect-video flex items-center justify-center text-gray-500">
                    Loading Chart Data...
                  </div>
                )}
              </div>
            </motion.div>

            {/* AI Synthesis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-indigo-900 to-gray-900 rounded-xl p-6 shadow-lg border border-indigo-500/30"
            >
              <h2 className="text-2xl font-bold mb-4 text-indigo-300 flex items-center">
                <span className="mr-2">🤖</span> AI Investment Thesis
              </h2>
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300">
                {data.synthesis}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Stats & News */}
          <div className="space-y-8">

            {/* Technical Signals (New Placement) */}
            <TechSignals signals={data.signals} />

            {/* ESG Score Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-emerald-400">ESG Profile</h2>
                <button
                  onClick={() => setShowESG(!showESG)}
                  className="text-xs text-gray-400 hover:text-white bg-gray-700 px-2 py-1 rounded transition"
                >
                  {showESG ? 'Hide' : 'Show'}
                </button>
              </div>

              {showESG && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {data.esg_data ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Score</span>
                        <span className="text-2xl font-bold text-white">{data.esg_data['Total Score']}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div
                          className="bg-emerald-500 h-2.5 rounded-full"
                          style={{ width: `${data.esg_data['Total Score']}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm mt-4">
                        <div className="bg-gray-700/50 p-2 rounded">
                          <div className="text-emerald-300">E</div>
                          <div>{data.esg_data['Environmental Score']}</div>
                        </div>
                        <div className="bg-gray-700/50 p-2 rounded">
                          <div className="text-blue-300">S</div>
                          <div>{data.esg_data['Social Score']}</div>
                        </div>
                        <div className="bg-gray-700/50 p-2 rounded">
                          <div className="text-purple-300">G</div>
                          <div>{data.esg_data['Governance Score']}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No ESG data available for this asset.</p>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* Technical Summary Text */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700"
            >
              <h2 className="text-xl font-semibold mb-4 text-blue-300">Technical Analysis Details</h2>
              <div className="prose prose-invert max-w-none text-sm">
                <p className="whitespace-pre-line text-gray-300">{data.tech_summary}</p>
              </div>
            </motion.div>

            {/* News Analysis */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700"
            >
              <h2 className="text-xl font-semibold mb-4 text-blue-300">News Sentiment</h2>
              <div className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-900/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                {data.news_analysis}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
