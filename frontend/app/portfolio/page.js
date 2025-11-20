"use client";
import { usePortfolio } from '../../context/PortfolioContext';
import PortfolioAnalysis from '../../components/PortfolioAnalysis';
import Link from 'next/link';

export default function CustomPortfolio() {
  const { watchlist } = usePortfolio();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b border-gray-700 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              My Portfolio Analysis
            </h1>
            <p className="text-gray-400 mt-1">Efficient Frontier Optimization for your Watchlist</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition">
            ← Back to Home
          </Link>
        </header>

        {watchlist.length < 2 ? (
          <div className="text-center py-20 bg-gray-800 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-gray-400 mb-4">Not Enough Data</h2>
            <p className="text-gray-500 mb-8">
              You need at least 2 stocks in your watchlist to perform portfolio optimization.
            </p>
            <Link href="/" className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 transition">
              Search Stocks to Add
            </Link>
          </div>
        ) : (
          <PortfolioAnalysis tickers={watchlist} />
        )}
      </div>
    </div>
  );
}
