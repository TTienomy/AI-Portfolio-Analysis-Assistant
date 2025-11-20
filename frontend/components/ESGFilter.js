"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Filter, ChevronDown } from 'lucide-react';

export default function ESGFilter({ onFilter }) {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [threshold, setThreshold] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [minScore, setMinScore] = useState(0);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProviders() {
      try {
        const res = await axios.get('http://localhost:8000/api/esg_data');
        if (res.data.length > 0) {
          setAllData(res.data);
          const keys = Object.keys(res.data[0]).filter(k => k !== 'Code');
          setProviders(keys);
          if (keys.length > 0) {
            setSelectedProvider(keys[0]);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching providers:", error);
        setLoading(false);
      }
    }
    fetchProviders();
  }, []);

  useEffect(() => {
    if (selectedProvider && allData.length > 0) {
      const scores = allData.map(d => d[selectedProvider]);
      const max = Math.ceil(Math.max(...scores));
      const min = Math.floor(Math.min(...scores));
      setMaxScore(max);
      setMinScore(min);
      // Set default threshold to min or median? Let's set to min so all show by default
      setThreshold(min);
    }
  }, [selectedProvider, allData]);

  const handleFilter = async () => {
    if (!selectedProvider) return;
    try {
      const res = await axios.post('http://localhost:8000/api/filter_stocks', {
        provider: selectedProvider,
        threshold: parseFloat(threshold)
      });
      onFilter(res.data.tickers);
    } catch (error) {
      console.error("Error filtering stocks:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/20 text-white"
    >
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-blue-400" />
        <h2 className="text-xl font-semibold">ESG Screening</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Provider</label>
          <div className="relative">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              disabled={loading}
            >
              {providers.map(p => (
                <option key={p} value={p} className="text-black">{p}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Min Score Threshold: <span className="text-blue-400 font-mono">{threshold}</span>
            <span className="text-xs text-gray-500 ml-2">(Range: {minScore} - {maxScore})</span>
          </label>
          <input
            type="range"
            min={minScore}
            max={maxScore}
            step={maxScore <= 10 ? 0.1 : 1}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{minScore}</span>
            <span>{maxScore}</span>
          </div>
        </div>

        <button
          onClick={handleFilter}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors shadow-md hover:shadow-blue-500/20"
        >
          Apply Filter
        </button>
      </div>
    </motion.div>
  );
}
