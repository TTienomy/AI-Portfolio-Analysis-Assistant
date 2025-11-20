"use client";
import { useState } from 'react';

export default function TechAnalysis() {
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await fetch('http://localhost:8000/api/analyze-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticker }),
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
            {/* Use full URL for localhost */}
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
