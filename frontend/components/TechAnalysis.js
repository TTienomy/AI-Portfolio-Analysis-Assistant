"use client";
import { useState } from 'react';

export default function TechAnalysis() {
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    // Allow empty string for better UX (user clearing input)
    if (value === '') {
      setParams(prev => ({ ...prev, [key]: '' }));
      return;
    }
    // Only update if it's a valid number
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

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      // Filter out empty or invalid parameters to let backend use defaults
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '' && v !== null && !isNaN(v) && v > 0)
      );

      const response = await fetch('http://localhost:8000/api/analyze-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker, ...cleanParams }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Analysis failed');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Technical Analysis & Charting</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Ticker Symbol</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="e.g., NVDA"
          />
        </div>

        {/* Advanced Settings Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-2"
        >
          <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Indicator Settings
        </button>

        {/* Advanced Settings Panel */}
        {showAdvanced && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
            {/* Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
              <div className="flex gap-2">
                <button onClick={() => applyPreset('default')} className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                  Default
                </button>
                <button onClick={() => applyPreset('shortTerm')} className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
                  Short-term Trading
                </button>
                <button onClick={() => applyPreset('longTerm')} className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                  Long-term Investing
                </button>
              </div>
            </div>

            {/* Moving Averages */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Moving Averages</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">Short MA</label>
                  <input type="number" value={params.ma_short} onChange={(e) => handleParamChange('ma_short', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Medium MA</label>
                  <input type="number" value={params.ma_medium} onChange={(e) => handleParamChange('ma_medium', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Long MA</label>
                  <input type="number" value={params.ma_long} onChange={(e) => handleParamChange('ma_long', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
              </div>
            </div>

            {/* MACD */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">MACD</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">Fast Period</label>
                  <input type="number" value={params.macd_fast} onChange={(e) => handleParamChange('macd_fast', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Slow Period</label>
                  <input type="number" value={params.macd_slow} onChange={(e) => handleParamChange('macd_slow', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Signal Period</label>
                  <input type="number" value={params.macd_signal} onChange={(e) => handleParamChange('macd_signal', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
              </div>
            </div>

            {/* Oscillators */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Oscillators</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">RSI Period</label>
                  <input type="number" value={params.rsi_window} onChange={(e) => handleParamChange('rsi_window', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Stochastic Period</label>
                  <input type="number" value={params.stoch_window} onChange={(e) => handleParamChange('stoch_window', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">CCI Period</label>
                  <input type="number" value={params.cci_window} onChange={(e) => handleParamChange('cci_window', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
              </div>
            </div>

            {/* Volatility & Trend */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Volatility & Trend</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600">Bollinger Bands</label>
                  <input type="number" value={params.bb_window} onChange={(e) => handleParamChange('bb_window', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">ATR Period</label>
                  <input type="number" value={params.atr_window} onChange={(e) => handleParamChange('atr_window', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">ADX Period</label>
                  <input type="number" value={params.adx_window} onChange={(e) => handleParamChange('adx_window', e.target.value)}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1 border" />
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !ticker}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          {loading ? 'Analyzing...' : 'Analyze Stock'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-6 space-y-6">
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <img
              src={`http://localhost:8000${data.image_url}`}
              alt="Technical Analysis Chart"
              className="w-full h-auto"
            />
          </div>
          <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap font-mono text-sm text-gray-800">
            <h3 className="font-bold mb-2 text-lg">AI Analysis Summary</h3>
            {data.summary}
          </div>
        </div>
      )}
    </div>
  );
}
