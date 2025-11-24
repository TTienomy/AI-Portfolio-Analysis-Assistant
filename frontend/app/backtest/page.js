'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Upload, Download, TrendingUp, TrendingDown, DollarSign, Percent, Activity, Save, Trash2, ArrowLeft } from 'lucide-react';
import StrategyEditor from '@/components/StrategyEditor';
import BacktestResults from '@/components/BacktestResults';

export default function BacktestPage() {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'upload', or 'ai'
  const [strategyCode, setStrategyCode] = useState('');
  const [templates, setTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Backtest parameters
  const [ticker, setTicker] = useState('AAPL');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [commission, setCommission] = useState(0.001);

  // Results
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // File upload
  const [selectedFile, setSelectedFile] = useState(null);

  // AI generation
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');

  // Load templates on mount
  useEffect(() => {
    loadTemplates(true);
  }, []);

  const loadTemplates = async (initialize = false) => {
    try {
      const response = await axios.get('http://localhost:8000/api/backtest/templates');
      setTemplates(response.data.templates);

      // Set first template as default only if initializing
      if (initialize) {
        const firstKey = Object.keys(response.data.templates)[0];
        if (firstKey) {
          setSelectedTemplate(firstKey);
          setStrategyCode(response.data.templates[firstKey].code);
        }
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const handleTemplateChange = (templateKey) => {
    setSelectedTemplate(templateKey);
    setStrategyCode(templates[templateKey].code);
  };

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await axios.post('http://localhost:8000/api/backtest', {
        ticker,
        strategy_code: strategyCode,
        start_date: startDate,
        end_date: endDate,
        initial_capital: initialCapital,
        commission
      });

      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('ticker', ticker);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('initial_capital', initialCapital.toString());
      formData.append('commission', commission.toString());

      const response = await axios.post('http://localhost:8000/api/backtest/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Also read and display the code
      const reader = new FileReader();
      reader.onload = (event) => {
        setStrategyCode(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([strategyCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strategy_${selectedTemplate}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      setError('請輸入策略描述');
      return;
    }

    setAiGenerating(true);
    setError(null);
    setAiExplanation('');

    try {
      const response = await axios.post('http://localhost:8000/api/backtest/generate', {
        prompt: aiPrompt
      });

      if (response.data.success) {
        setStrategyCode(response.data.code);
        setAiExplanation(response.data.explanation);
        setActiveTab('editor'); // Switch to editor to show generated code
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'AI 生成失敗');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => window.location.href = '/'}
              className="mb-2 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={16} />
              返回分析頁面
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              策略回測系統
            </h1>
            <p className="text-gray-400 mt-2">
              測試您的交易策略並分析歷史績效
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'editor'
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              程式碼編輯器
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'upload'
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              上傳策略檔案
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'ai'
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              🤖 AI 生成
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Strategy Input */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'editor' ? (
              <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">策略程式碼</h2>
                  <div className="flex gap-2">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500 max-w-[200px]"
                    >
                      {Object.entries(templates).map(([key, template]) => (
                        <option key={key} value={key}>
                          {template.name} {template.is_custom ? '(自訂)' : ''}
                        </option>
                      ))}
                    </select>

                    {/* Save Button */}
                    <button
                      onClick={async () => {
                        const name = prompt('請輸入策略名稱：', 'My Custom Strategy');
                        if (!name) return;

                        try {
                          const response = await axios.post('http://localhost:8000/api/backtest/strategies', {
                            name,
                            code: strategyCode,
                            description: 'User created strategy'
                          });

                          if (response.data.success) {
                            alert('✅ 策略儲存成功！');
                            await loadTemplates(); // Reload templates
                            setSelectedTemplate(response.data.key); // Select the new strategy
                          }
                        } catch (err) {
                          alert('❌ 儲存失敗：' + (err.response?.data?.detail || err.message));
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 text-sm"
                      title="儲存目前策略"
                    >
                      <Save size={16} />
                      儲存
                    </button>

                    {/* Delete Button (Only for custom strategies) */}
                    {templates[selectedTemplate]?.is_custom && (
                      <button
                        onClick={async () => {
                          if (!confirm(`確定要刪除策略 "${templates[selectedTemplate].name}" 嗎？`)) return;

                          try {
                            await axios.delete(`http://localhost:8000/api/backtest/strategies/${selectedTemplate}`);
                            alert('🗑️ 策略已刪除');
                            await loadTemplates(); // Reload templates
                            // Select default
                            const firstKey = Object.keys(templates).find(k => k !== selectedTemplate && k !== 'new_strategy') || 'moving_average_crossover';
                            setSelectedTemplate(firstKey);
                            setStrategyCode(templates[firstKey]?.code || '');
                          } catch (err) {
                            alert('❌ 刪除失敗：' + (err.response?.data?.detail || err.message));
                          }
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-2 text-sm"
                        title="刪除此策略"
                      >
                        <Trash2 size={16} />
                        刪除
                      </button>
                    )}

                    <button
                      onClick={downloadTemplate}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                      <Download size={16} />
                      下載
                    </button>
                  </div>
                </div>

                {selectedTemplate && templates[selectedTemplate] && (
                  <p className="text-sm text-gray-400 mb-4">
                    {templates[selectedTemplate].description}
                  </p>
                )}

                <StrategyEditor
                  code={strategyCode}
                  onChange={setStrategyCode}
                />

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={async () => {
                      if (!strategyCode.trim()) return;
                      setAiGenerating(true);
                      setAiExplanation('');
                      try {
                        const response = await fetch('http://localhost:8000/api/backtest/generate', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ prompt: "請幫我檢查並優化這段程式碼，轉換成符合系統格式的 Strategy class：\n\n" + strategyCode }),
                        });

                        // Check if response is ok before parsing JSON
                        if (!response.ok) {
                          throw new Error(`API Error: ${response.status}`);
                        }

                        const data = await response.json();

                        if (data.success) {
                          setStrategyCode(data.code);
                          setAiExplanation(data.explanation);

                          // Update ticker if extracted
                          if (data.ticker) {
                            setTicker(data.ticker);
                            alert(`✅ 優化完成！\n\n已自動偵測並設定股票代號：${data.ticker}\n\n${data.explanation}`);
                          } else {
                            alert(`✅ 優化完成！\n\n${data.explanation}`);
                          }
                        } else {
                          alert(`❌ 優化失敗：${data.error}`);
                        }
                      } catch (error) {
                        console.error('AI Optimize error:', error);
                        alert(`❌ 發生錯誤：${error.message || '請稍後再試'}`);
                      } finally {
                        setAiGenerating(false);
                      }
                    }}
                    disabled={aiGenerating || !strategyCode.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                  >
                    {aiGenerating ? (
                      <>
                        <Activity className="animate-spin" size={18} />
                        AI 優化中...
                      </>
                    ) : (
                      <>
                        ✨ AI 轉換/優化
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : activeTab === 'ai' ? (
              <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-bold mb-4">🤖 AI 策略生成與優化</h2>
                <p className="text-sm text-gray-400 mb-4">
                  用自然語言描述策略，或貼上其他格式的程式碼讓 AI 幫您轉換與優化
                </p>

                {/* Example prompts */}
                <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-300 mb-2">💡 您可以輸入：</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• 自然語言：當 RSI 低於 30 時買入，高於 70 時賣出</li>
                    <li>• 程式碼轉換：貼上 Backtesting.py 或其他套件的程式碼</li>
                    <li>• 策略優化：幫我加入 2% 停損和 5% 停利</li>
                  </ul>
                </div>

                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="請描述您的交易策略，或直接貼上程式碼...&#10;&#10;例如：&#10;1. 當 MACD 金叉且 RSI < 30 時買入&#10;2. (貼上外部程式碼) 請幫我轉換這段程式碼&#10;3. 加入移動停損機制"
                  className="w-full h-40 bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500 resize-none mb-4"
                />

                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {aiGenerating ? (
                    <>
                      <Activity className="animate-spin" size={20} />
                      AI 生成中...
                    </>
                  ) : (
                    <>
                      🤖 生成策略程式碼
                    </>
                  )}
                </button>

                {aiExplanation && (
                  <div className="mt-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
                    <p className="text-sm text-green-300">
                      <strong>✓ 策略說明：</strong> {aiExplanation}
                    </p>
                  </div>
                )}

                {/* Available indicators info */}
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-300 mb-2"><strong>📊 可用指標：</strong></p>
                  <p className="text-xs text-gray-400">
                    MA5/MA20/MA60 (移動平均線) • RSI (相對強弱指標) • MACD (指數平滑異同移動平均線) •
                    Bollinger Bands (布林通道) • 價格數據 (Open/High/Low/Close/Volume)
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-bold mb-4">上傳策略檔案</h2>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
                  <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                  <input
                    type="file"
                    accept=".py"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-green-400 hover:text-green-300 font-medium"
                  >
                    點擊選擇檔案
                  </label>
                  <p className="text-gray-400 text-sm mt-2">或拖曳 .py 檔案到此處</p>
                  {selectedFile && (
                    <p className="mt-4 text-white font-medium">已選擇: {selectedFile.name}</p>
                  )}
                </div>

                {strategyCode && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">檔案預覽</h3>
                    <StrategyEditor
                      code={strategyCode}
                      onChange={setStrategyCode}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Parameters */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4">回測參數</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    股票代碼
                  </label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                    placeholder="AAPL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    開始日期
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    結束日期
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    初始資金 ($)
                  </label>
                  <input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                    min="1000"
                    step="1000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    手續費率 (%)
                  </label>
                  <input
                    type="number"
                    value={commission * 100}
                    onChange={(e) => setCommission(Number(e.target.value) / 100)}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                    min="0"
                    max="1"
                    step="0.01"
                  />
                </div>

                <button
                  onClick={activeTab === 'editor' ? handleRunBacktest : handleFileUpload}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Activity className="animate-spin" size={20} />
                      執行中...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      開始回測
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-900/50 border border-red-500 rounded-xl p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && !error && (
          <div className="mt-8">
            <BacktestResults results={results} ticker={ticker} />
          </div>
        )}
      </div>
    </div>
  );
}
