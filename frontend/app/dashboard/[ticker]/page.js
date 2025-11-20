"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePortfolio } from '../../../context/PortfolioContext';
import { Plus, Check } from 'lucide-react';
import InteractiveChart from '../../../components/InteractiveChart';
import TechSignals from '@/components/TechSignals';
import SignalLight from '@/components/SignalLight';

export default function Dashboard() {
  const { ticker } = useParams();
  const { addToWatchlist, isInWatchlist } = usePortfolio();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showESG, setShowESG] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Selected Indicators State
  const [selectedIndicators, setSelectedIndicators] = useState([
    "MA", "RSI", "MACD", "Bollinger", "Stochastic", "ATR", "CCI", "ADX", "OBV", "Ichimoku", "WilliamsR", "MFI", "VWAP"
  ]);

  // Available Indicators List
  const availableIndicators = [
    { id: "MA", label: "Moving Averages" },
    { id: "MACD", label: "MACD" },
    { id: "RSI", label: "RSI" },
    { id: "Bollinger", label: "Bollinger Bands" },
    { id: "Stochastic", label: "Stochastic" },
    { id: "Ichimoku", label: "Ichimoku Cloud" },
    { id: "OBV", label: "On-Balance Volume" },
    { id: "VWAP", label: "VWAP" },
    { id: "WilliamsR", label: "Williams %R" },
    { id: "MFI", label: "Money Flow Index" },
    { id: "ATR", label: "ATR" },
    { id: "CCI", label: "CCI" },
    { id: "ADX", label: "ADX" },
  ];

  const toggleIndicator = (id) => {
    setSelectedIndicators(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Technical indicator parameters with defaults
  const [params, setParams] = useState({
    ma_short: 5,
    ma_medium: 20,
    ma_long: 60,
    macd_fast: 12,
    macd_slow: 26,
    macd_signal: 9,
    rsi_window: 14,
    stoch_window: 14,
    bb_window: 20,
    atr_window: 14,
    cci_window: 20,
    adx_window: 14,
  });

  const handleParamChange = (key, value) => {
    if (value === '') {
      setParams(prev => ({ ...prev, [key]: '' }));
      return;
    }
    const num = parseInt(value);
    if (!isNaN(num)) {
      setParams(prev => ({ ...prev, [key]: num }));
    }
  };

  const applyPreset = (preset) => {
    const presets = {
      default: {
        ma_short: 5, ma_medium: 20, ma_long: 60,
        macd_fast: 12, macd_slow: 26, macd_signal: 9,
        rsi_window: 14, stoch_window: 14, bb_window: 20,
        atr_window: 14, cci_window: 20, adx_window: 14,
      },
      shortTerm: {
        ma_short: 3, ma_medium: 10, ma_long: 30,
        macd_fast: 8, macd_slow: 17, macd_signal: 9,
        rsi_window: 9, stoch_window: 9, bb_window: 10,
        atr_window: 10, cci_window: 14, adx_window: 10,
      },
      longTerm: {
        ma_short: 10, ma_medium: 50, ma_long: 200,
        macd_fast: 12, macd_slow: 26, macd_signal: 9,
        rsi_window: 21, stoch_window: 21, bb_window: 30,
        atr_window: 20, cci_window: 30, adx_window: 20,
      },
    };
    setParams(presets[preset]);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Filter out empty or invalid parameters
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '' && v !== null && !isNaN(v) && v > 0)
      );

      const response = await fetch('http://localhost:8000/api/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker,
          ...cleanParams,
          selected_indicators: selectedIndicators
        }),
      });

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

  useEffect(() => {
    if (!ticker) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]); // Only auto-fetch on ticker change, not params change (user must click refresh)

  if (loading && !data) { // Only show full screen loader on initial load
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
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-gray-400">Interactive Analysis</p>
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <svg className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Settings
                    </button>
                  </div>
                </div>
                {data?.latest_price && (
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

              {/* Advanced Settings Panel */}
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mb-4 border border-gray-700 rounded-lg p-4 bg-gray-900/50 space-y-4 overflow-hidden"
                >
                  {/* Indicator Selection */}
                  <div className="mb-4 pb-4 border-b border-gray-700">
                    <label className="block text-xs font-medium text-gray-400 mb-2">Active Indicators</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {availableIndicators.map((ind) => (
                        <label key={ind.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedIndicators.includes(ind.id)}
                            onChange={() => toggleIndicator(ind.id)}
                            className="form-checkbox h-3 w-3 text-indigo-500 rounded border-gray-600 bg-gray-700 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-gray-300">{ind.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Presets */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Quick Presets</label>
                    <div className="flex gap-2">
                      <button onClick={() => applyPreset('default')} className="px-3 py-1 text-xs bg-blue-900/30 text-blue-400 border border-blue-800 rounded hover:bg-blue-900/50">Default</button>
                      <button onClick={() => applyPreset('shortTerm')} className="px-3 py-1 text-xs bg-green-900/30 text-green-400 border border-green-800 rounded hover:bg-green-900/50">Short-term</button>
                      <button onClick={() => applyPreset('longTerm')} className="px-3 py-1 text-xs bg-purple-900/30 text-purple-400 border border-purple-800 rounded hover:bg-purple-900/50">Long-term</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Moving Averages */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase">Moving Averages</h3>
                      <div><label className="text-xs text-gray-400">Short</label><input type="number" value={params.ma_short} onChange={(e) => handleParamChange('ma_short', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                      <div><label className="text-xs text-gray-400">Medium</label><input type="number" value={params.ma_medium} onChange={(e) => handleParamChange('ma_medium', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                      <div><label className="text-xs text-gray-400">Long</label><input type="number" value={params.ma_long} onChange={(e) => handleParamChange('ma_long', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                    </div>
                    {/* MACD */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase">MACD</h3>
                      <div><label className="text-xs text-gray-400">Fast</label><input type="number" value={params.macd_fast} onChange={(e) => handleParamChange('macd_fast', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                      <div><label className="text-xs text-gray-400">Slow</label><input type="number" value={params.macd_slow} onChange={(e) => handleParamChange('macd_slow', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                      <div><label className="text-xs text-gray-400">Signal</label><input type="number" value={params.macd_signal} onChange={(e) => handleParamChange('macd_signal', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                    </div>
                    {/* Oscillators */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase">Oscillators</h3>
                      <div><label className="text-xs text-gray-400">RSI</label><input type="number" value={params.rsi_window} onChange={(e) => handleParamChange('rsi_window', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                      <div><label className="text-xs text-gray-400">Stoch</label><input type="number" value={params.stoch_window} onChange={(e) => handleParamChange('stoch_window', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                      <div><label className="text-xs text-gray-400">CCI</label><input type="number" value={params.cci_window} onChange={(e) => handleParamChange('cci_window', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                    </div>
                    {/* Volatility */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase">Volatility</h3>
                      <div><label className="text-xs text-gray-400">Bollinger</label><input type="number" value={params.bb_window} onChange={(e) => handleParamChange('bb_window', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                      <div><label className="text-xs text-gray-400">ATR</label><input type="number" value={params.atr_window} onChange={(e) => handleParamChange('atr_window', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                      <div><label className="text-xs text-gray-400">ADX</label><input type="number" value={params.adx_window} onChange={(e) => handleParamChange('adx_window', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" /></div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={fetchData}
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? 'Updating...' : 'Apply Changes'}
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                {data?.chart_data ? (
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
                {data?.synthesis}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Stats & News */}
          <div className="space-y-8">

            {/* Signal Light (New) */}
            {data?.signals && <SignalLight signal={data.signals} />}

            {/* Tech Signals List (Legacy/Detailed) */}
            {/* <TechSignals signals={data.signals.details} />  We can hide the old list if SignalLight covers it, or keep both. Let's keep SignalLight as primary. */}

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
                  {data?.esg_data ? (
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
                <p className="whitespace-pre-line text-gray-300">{data?.tech_summary}</p>
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
                {data?.news_analysis}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
