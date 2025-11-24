"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ESGFilter from '../components/ESGFilter';
import PortfolioAnalysis from '../components/PortfolioAnalysis';
import NewsAnalysis from '../components/NewsAnalysis';
import PdfAnalysis from '../components/PdfAnalysis';
import TechAnalysis from '../components/TechAnalysis';

export default function Home() {
  const [filteredTickers, setFilteredTickers] = useState([]);
  const [activeTab, setActiveTab] = useState('esg');
  const [searchTicker, setSearchTicker] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTicker.trim()) {
      router.push(`/dashboard/${searchTicker.trim().toUpperCase()}`);
    }
  };

  const tabs = [
    { id: 'esg', label: 'ESG Portfolio' },
    { id: 'news', label: 'News Sentiment' },
    { id: 'pdf', label: 'PDF Report' },
    { id: 'tech', label: 'Technical Analysis' },
    { id: 'backtest', label: 'Backtest Strategy' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-4">
            Financial Analysis Hub
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
            Comprehensive financial tools powered by AI.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-md mx-auto relative">
            <input
              type="text"
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              placeholder="Search Ticker (e.g., AAPL, 2330.TW)..."
              className="w-full px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/20 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 rounded-full hover:bg-blue-500 transition-colors"
            >
              🔍
            </button>
          </form>
        </motion.header>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'esg' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar / Filter */}
              <div className="lg:col-span-1 space-y-6">
                <div className="sticky top-8 space-y-6">
                  {/* Manual Input Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/20"
                  >
                    <h2 className="text-xl font-semibold mb-4 text-blue-300">Manual Selection</h2>
                    <p className="text-sm text-gray-400 mb-4">
                      Add stocks manually to your portfolio analysis without ESG filtering.
                    </p>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const ticker = e.target.elements.manualTicker.value.trim().toUpperCase();
                      if (ticker && !filteredTickers.includes(ticker)) {
                        setFilteredTickers([...filteredTickers, ticker]);
                        e.target.elements.manualTicker.value = '';
                      }
                    }} className="flex gap-2">
                      <input
                        name="manualTicker"
                        type="text"
                        placeholder="Ticker (e.g. AAPL)"
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                      >
                        +
                      </button>
                    </form>
                  </motion.div>

                  <ESGFilter onFilter={(tickers) => {
                    // Merge with existing manually added tickers if desired, or replace?
                    // Let's replace for filter action, but maybe we should allow mixing.
                    // For now, let's just set it, but user can manually add more after.
                    setFilteredTickers(tickers);
                  }} />

                  {/* Selected Tickers Preview */}
                  {filteredTickers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white/5 rounded-xl p-4 border border-white/10"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-gray-300">Selected Assets ({filteredTickers.length})</h3>
                        <button
                          onClick={() => setFilteredTickers([])}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {filteredTickers.map(t => (
                          <span key={t} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md border border-blue-500/30 flex items-center gap-1">
                            {t}
                            <button
                              onClick={() => setFilteredTickers(filteredTickers.filter(item => item !== t))}
                              className="hover:text-white"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Main Content / Analysis */}
              <div className="lg:col-span-3">
                <PortfolioAnalysis tickers={filteredTickers} />
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="max-w-3xl mx-auto">
              <NewsAnalysis />
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="max-w-3xl mx-auto">
              <PdfAnalysis />
            </div>
          )}

          {activeTab === 'tech' && (
            <div className="max-w-3xl mx-auto">
              <TechAnalysis />
            </div>
          )}

          {activeTab === 'backtest' && (
            <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-lg border border-white/20 text-center">
              <h2 className="text-2xl font-bold mb-4">策略回測系統</h2>
              <p className="text-gray-300 mb-6">測試您的交易策略並分析歷史績效</p>
              <button
                onClick={() => router.push('/backtest')}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold rounded-lg transition-all shadow-lg"
              >
                前往回測頁面
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
