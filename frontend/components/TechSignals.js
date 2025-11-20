import { motion } from 'framer-motion';
import { ArrowUpCircle, ArrowDownCircle, MinusCircle, Info } from 'lucide-react';

export default function TechSignals({ signals }) {
  if (!signals || signals.length === 0) return null;

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'Buy': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Sell': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'Hold': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  const getSignalIcon = (signal) => {
    switch (signal) {
      case 'Buy': return <ArrowUpCircle className="w-5 h-5" />;
      case 'Sell': return <ArrowDownCircle className="w-5 h-5" />;
      case 'Hold': return <MinusCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  // Calculate overall sentiment
  const buyCount = signals.filter(s => s.signal === 'Buy').length;
  const sellCount = signals.filter(s => s.signal === 'Sell').length;
  let overallSignal = "Neutral";
  let overallColor = "text-yellow-400";

  if (buyCount > sellCount) {
    overallSignal = "Bullish";
    overallColor = "text-emerald-400";
  } else if (sellCount > buyCount) {
    overallSignal = "Bearish";
    overallColor = "text-rose-400";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-blue-300">Technical Signals</h2>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-700 ${overallColor}`}>
          <span className="text-sm font-bold">{overallSignal}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {signals.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`p-3 rounded-lg border flex flex-col justify-between h-full ${getSignalColor(item.signal)}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold uppercase opacity-70">{item.indicator}</span>
              {getSignalIcon(item.signal)}
            </div>

            <div className="mt-auto">
              <div className="text-lg font-bold truncate" title={item.value}>{item.value}</div>
              <div className="text-[10px] leading-tight opacity-80 mt-1">{item.reason}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
