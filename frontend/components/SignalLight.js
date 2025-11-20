import React from 'react';
import { motion } from 'framer-motion';

export default function SignalLight({ signal }) {
  if (!signal) return null;

  const { recommendation, score, color, details } = signal;

  const getColorClass = (c) => {
    switch (c) {
      case 'green': return 'text-green-500 bg-green-500/20 border-green-500/50';
      case 'lightgreen': return 'text-emerald-400 bg-emerald-400/20 border-emerald-400/50';
      case 'red': return 'text-red-500 bg-red-500/20 border-red-500/50';
      case 'orange': return 'text-orange-400 bg-orange-400/20 border-orange-400/50';
      default: return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/50';
    }
  };

  const getLightColor = (c) => {
    switch (c) {
      case 'green': return 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]';
      case 'lightgreen': return 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]';
      case 'red': return 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]';
      case 'orange': return 'bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.5)]';
      default: return 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]';
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-blue-300">Technical Signal</h2>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getColorClass(color)}`}>
          Score: {score}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${getLightColor(color)}`}
        >
          <span className="text-gray-900 font-black text-xl text-center leading-tight">
            {recommendation.replace(' ', '\n')}
          </span>
        </motion.div>
        <p className="text-gray-400 text-sm text-center max-w-xs">
          Based on weighted analysis of active indicators
        </p>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {details.map((item, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.signal === 'BULLISH' ? 'bg-green-500' : 'bg-red-500'}`} />
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-300">{item.indicator}</span>
                <span className={`text-xs font-bold ${item.signal === 'BULLISH' ? 'text-green-400' : 'text-red-400'}`}>
                  {item.signal}
                </span>
              </div>
              <p className="text-xs text-gray-500">{item.message}</p>
            </div>
          </div>
        ))}
        {details.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4">No signals detected with current indicators.</p>
        )}
      </div>
    </div>
  );
}
