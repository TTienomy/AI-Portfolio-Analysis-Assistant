"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePortfolio } from '../context/PortfolioContext';
import { Trash2, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar() {
  const { watchlist, removeFromWatchlist } = usePortfolio();
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 right-0 transform -translate-y-1/2 z-50 bg-blue-600 p-2 rounded-l-lg shadow-lg hover:bg-blue-500 transition-all ${isOpen ? 'mr-64' : ''}`}
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed top-0 right-0 h-full w-64 bg-gray-900 border-l border-gray-700 shadow-2xl z-40 flex flex-col"
          >
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-blue-400" />
                Watchlist
              </h2>
              <p className="text-xs text-gray-400 mt-1">{watchlist.length} stocks saved</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {watchlist.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <p>No stocks saved.</p>
                  <p className="text-sm mt-2">Add stocks from their dashboard.</p>
                </div>
              ) : (
                watchlist.map(ticker => (
                  <div key={ticker} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center group hover:bg-gray-750 transition-colors border border-gray-700">
                    <Link href={`/dashboard/${ticker}`} className="font-bold text-white hover:text-blue-400">
                      {ticker}
                    </Link>
                    <button
                      onClick={() => removeFromWatchlist(ticker)}
                      className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900">
              <button
                onClick={() => router.push('/portfolio')}
                disabled={watchlist.length < 2}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${watchlist.length < 2
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:shadow-lg hover:scale-[1.02]'
                  }`}
              >
                Analyze Portfolio
              </button>
              {watchlist.length < 2 && (
                <p className="text-xs text-center text-gray-500 mt-2">
                  Add at least 2 stocks to analyze
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
