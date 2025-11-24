'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent, Activity, Target, Award, BarChart3 } from 'lucide-react';

export default function BacktestResults({ results, ticker }) {
  const [showAllTrades, setShowAllTrades] = useState(false);

  if (!results || !results.metrics) {
    return null;
  }

  const { metrics, equity_curve, trades } = results;

  // Format equity curve data for chart
  const chartData = equity_curve.map(point => ({
    date: new Date(point.date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
    equity: point.equity.toFixed(2),
    cash: point.cash.toFixed(2),
    position: point.position_value.toFixed(2)
  }));

  // Metric cards configuration
  const metricCards = [
    {
      title: '總報酬',
      value: `${metrics.total_return_pct >= 0 ? '+' : ''}${metrics.total_return_pct.toFixed(2)}%`,
      subValue: `$${(metrics.final_equity - metrics.initial_capital).toFixed(2)}`,
      icon: metrics.total_return >= 0 ? TrendingUp : TrendingDown,
      color: metrics.total_return >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: metrics.total_return >= 0 ? 'bg-green-900/30' : 'bg-red-900/30',
      borderColor: metrics.total_return >= 0 ? 'border-green-500' : 'border-red-500'
    },
    {
      title: 'Sharpe Ratio',
      value: metrics.sharpe_ratio.toFixed(3),
      subValue: metrics.sharpe_ratio > 1 ? '優秀' : metrics.sharpe_ratio > 0.5 ? '良好' : '一般',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/30',
      borderColor: 'border-blue-500'
    },
    {
      title: '最大回撤',
      value: `${metrics.max_drawdown_pct.toFixed(2)}%`,
      subValue: '風險指標',
      icon: TrendingDown,
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/30',
      borderColor: 'border-orange-500'
    },
    {
      title: '勝率',
      value: `${metrics.win_rate_pct.toFixed(1)}%`,
      subValue: `${metrics.winning_trades}勝 / ${metrics.losing_trades}敗`,
      icon: Target,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/30',
      borderColor: 'border-purple-500'
    },
    {
      title: '交易次數',
      value: metrics.num_trades,
      subValue: '完整交易',
      icon: BarChart3,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-900/30',
      borderColor: 'border-cyan-500'
    },
    {
      title: '獲利因子',
      value: metrics.profit_factor === Infinity ? '∞' : metrics.profit_factor.toFixed(2),
      subValue: metrics.profit_factor > 1.5 ? '優秀' : metrics.profit_factor > 1 ? '良好' : '需改進',
      icon: Award,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/30',
      borderColor: 'border-yellow-500'
    }
  ];

  const displayedTrades = showAllTrades ? trades : trades.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-6 border border-green-500/30">
        <h2 className="text-2xl font-bold mb-2">回測結果 - {ticker}</h2>
        <p className="text-gray-300">
          初始資金: ${metrics.initial_capital.toLocaleString()} →
          最終權益: ${metrics.final_equity.toLocaleString()}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`${card.bgColor} border ${card.borderColor} rounded-xl p-6 transition-all hover:scale-105`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
                <Icon className={card.color} size={32} />
              </div>
              <p className="text-gray-400 text-sm">{card.subValue}</p>
            </div>
          );
        })}
      </div>

      {/* Equity Curve Chart */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-bold mb-4">權益曲線</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
              formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="#10B981"
              strokeWidth={3}
              dot={false}
              name="總權益"
            />
            <Line
              type="monotone"
              dataKey="cash"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="現金"
            />
            <Line
              type="monotone"
              dataKey="position"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              name="持倉價值"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trade History */}
      {trades.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-xl font-bold mb-4">交易記錄</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">日期</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">類型</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">價格</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">股數</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">金額</th>
                </tr>
              </thead>
              <tbody>
                {displayedTrades.map((trade, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(trade.date).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${trade.type === 'BUY'
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-red-900/50 text-red-400'
                          }`}
                      >
                        {trade.type === 'BUY' ? '買入' : '賣出'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      ${trade.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      {trade.shares.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300 font-medium">
                      ${trade.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {trades.length > 10 && (
            <button
              onClick={() => setShowAllTrades(!showAllTrades)}
              className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
            >
              {showAllTrades ? '顯示較少' : `顯示全部 ${trades.length} 筆交易`}
            </button>
          )}
        </div>
      )}

      {/* Plot Image */}
      {results.plot_path && (
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-xl font-bold mb-4">權益曲線圖表</h3>
          <img
            src={`http://localhost:8000${results.plot_path}`}
            alt="Equity Curve"
            className="w-full rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
