"use client";

import { useState, useMemo } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function InteractiveChart({ data }) {
  const [timeRange, setTimeRange] = useState('1Y');
  const [mainIndicators, setMainIndicators] = useState({
    MA5: true,
    MA20: true,
    MA60: true,
    Bollinger: false,
  });
  const [subIndicator, setSubIndicator] = useState('Volume'); // Volume, MACD, RSI, KD

  if (!data || data.length === 0) return null;

  // Filter data based on timeRange
  const filteredData = useMemo(() => {
    const now = new Date(data[data.length - 1].Date);
    let cutoffDate = new Date(now);

    switch (timeRange) {
      case '1M': cutoffDate.setMonth(now.getMonth() - 1); break;
      case '3M': cutoffDate.setMonth(now.getMonth() - 3); break;
      case '6M': cutoffDate.setMonth(now.getMonth() - 6); break;
      case '1Y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
      case 'YTD': cutoffDate = new Date(now.getFullYear(), 0, 1); break;
      case 'All': cutoffDate = new Date(0); break;
      default: cutoffDate.setFullYear(now.getFullYear() - 1);
    }

    return data.filter(item => new Date(item.Date) >= cutoffDate);
  }, [data, timeRange]);

  // Calculate Y-Axis Domain for Price Chart
  const priceDomain = useMemo(() => {
    if (filteredData.length === 0) return ['auto', 'auto'];
    const prices = filteredData.map(d => d.Close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [filteredData]);

  const toggleMainIndicator = (key) => {
    setMainIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl text-xs z-50">
          <p className="text-gray-300 font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span className="text-gray-400">{entry.name}:</span>
              <span className="text-white font-mono">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col min-h-[600px]">
      {/* Controls Header */}
      <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-800 gap-4 bg-gray-900 rounded-t-xl">

        {/* Time Range */}
        <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
          {['1M', '3M', '6M', 'YTD', '1Y', 'All'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === range
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Main Indicators */}
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500 mr-1">Main:</span>
          {Object.keys(mainIndicators).map(ind => (
            <button
              key={ind}
              onClick={() => toggleMainIndicator(ind)}
              className={`px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${mainIndicators[ind]
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${ind === 'MA5' ? 'bg-yellow-400' :
                ind === 'MA20' ? 'bg-green-400' :
                  ind === 'MA60' ? 'bg-red-400' :
                    ind === 'Bollinger' ? 'bg-purple-400' : 'bg-blue-400'
                }`} />
              {ind}
            </button>
          ))}
        </div>

        {/* Sub Indicators */}
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500 mr-1">Sub:</span>
          {['Volume', 'MACD', 'RSI', 'KD'].map(ind => (
            <button
              key={ind}
              onClick={() => setSubIndicator(ind)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${subIndicator === ind
                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Area (Price) */}
      <div className="w-full h-[400px] bg-gray-900 p-4 border-b border-gray-800">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} syncId="syncChart" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="Date" hide />
            <YAxis
              domain={priceDomain}
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
              orientation="right"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />

            <Area
              type="monotone"
              dataKey="Close"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
              name="Price"
            />

            {mainIndicators.MA5 && <Line type="monotone" dataKey="MA5" stroke="#facc15" dot={false} strokeWidth={1.5} />}
            {mainIndicators.MA20 && <Line type="monotone" dataKey="MA20" stroke="#4ade80" dot={false} strokeWidth={1.5} />}
            {mainIndicators.MA60 && <Line type="monotone" dataKey="MA60" stroke="#f87171" dot={false} strokeWidth={1.5} />}

            {mainIndicators.Bollinger && (
              <>
                <Line type="monotone" dataKey="BB_High" stroke="#c084fc" strokeDasharray="3 3" dot={false} strokeWidth={1} name="BB High" />
                <Line type="monotone" dataKey="BB_Low" stroke="#c084fc" strokeDasharray="3 3" dot={false} strokeWidth={1} name="BB Low" />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sub Chart Area (Indicators) */}
      <div className="w-full h-[200px] bg-gray-900 p-4 rounded-b-xl">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} syncId="syncChart" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis
              dataKey="Date"
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
              tickFormatter={(str) => {
                try {
                  const date = new Date(str);
                  if (isNaN(date.getTime())) return str;
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                } catch (e) { return str; }
              }}
              minTickGap={50}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              orientation="right"
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />

            {subIndicator === 'Volume' && (
              <Bar dataKey="Volume" fill="#374151" opacity={0.5} name="Volume" />
            )}

            {subIndicator === 'MACD' && (
              <>
                <Line type="monotone" dataKey="MACD" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="MACD_Signal" stroke="#f87171" dot={false} strokeWidth={1.5} name="Signal" />
                {/* Histogram could be added as Bar if calculated */}
              </>
            )}

            {subIndicator === 'RSI' && (
              <>
                <Line type="monotone" dataKey="RSI" stroke="#facc15" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey={() => 70} stroke="#4b5563" strokeDasharray="3 3" dot={false} strokeWidth={1} name="Overbought" />
                <Line type="monotone" dataKey={() => 30} stroke="#4b5563" strokeDasharray="3 3" dot={false} strokeWidth={1} name="Oversold" />
              </>
            )}

            {subIndicator === 'KD' && (
              <>
                <Line type="monotone" dataKey="%K" stroke="#facc15" dot={false} strokeWidth={1.5} name="%K" />
                {/* %D is not calculated in backend currently, only %K */}
              </>
            )}

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
