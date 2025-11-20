import pandas as pd
import numpy as np
import yfinance as yf
from scipy.optimize import minimize
import os

# Load ESG Data
def load_esg_data():
    file_path = os.path.join(os.path.dirname(__file__), 'esg_data.csv')
    return pd.read_csv(file_path)

def filter_stocks(provider, threshold):
    df = load_esg_data()
    if provider not in df.columns:
        raise ValueError(f"Provider {provider} not found in ESG data")
    
    # Filter based on threshold (assuming higher is better or percentile based)
    # In the notebook, it seemed to be raw scores or percentiles.
    # Let's assume the user wants stocks with score >= threshold
    filtered_df = df[df[provider] >= threshold]
    return filtered_df['Code'].tolist()

def get_stock_data(tickers, start_date, end_date):
    if not tickers:
        return pd.DataFrame()
    data = yf.download(tickers, start=start_date, end=end_date)
    
    # Handle MultiIndex columns (Price, Ticker)
    if isinstance(data.columns, pd.MultiIndex):
        if 'Adj Close' in data.columns.get_level_values(0):
            return data['Adj Close']
        elif 'Close' in data.columns.get_level_values(0):
            return data['Close']
        else:
            # Fallback: try to find a close-like column
            return data.iloc[:, 0] # This is risky, but better than crash
    else:
        # Single index
        if 'Adj Close' in data.columns:
            return data['Adj Close']
        elif 'Close' in data.columns:
            return data['Close']
            
    return data

def calculate_returns(data):
    returns = data.pct_change().dropna()
    return returns

def portfolio_performance(weights, mean_returns, cov_matrix):
    returns = np.sum(mean_returns * weights) * 252
    std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
    return std, returns

def negative_sharpe_ratio(weights, mean_returns, cov_matrix, risk_free_rate=0.0):
    p_var, p_ret = portfolio_performance(weights, mean_returns, cov_matrix)
    return -(p_ret - risk_free_rate) / p_var

import pandas as pd
import numpy as np
import yfinance as yf
from scipy.optimize import minimize
from datetime import datetime, timedelta # <-- 修正: 必須導入 datetime 和 timedelta
import traceback # <-- 導入 traceback 方便調試

# ... 其他 functions (load_esg_data, filter_stocks, etc.) ...

def optimize_portfolio(tickers: list[str], risk_free_rate: float = 0.02):
    """
    執行投資組合最佳化 (最大化夏普比率)，並計算有效前緣。
    
    Args:
        tickers: 股票代號列表 (e.g., ["2330.TW", "0050.TW"])。
        risk_free_rate: 無風險利率 (e.g., 0.02)。
        
    Returns:
        dict: 包含最佳權重、績效和有效前緣數據，或在失敗時返回 None。
    """
    
    # 步驟 1: 數據獲取
    try:
        start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        end_date = datetime.now().strftime('%Y-%m-%d')
        
        # 獲取調整後的收盤價 ('Adj Close')
        data = yf.download(tickers, start=start_date, end=end_date)
        
        # 處理 MultiIndex/單一股票數據
        if isinstance(data.columns, pd.MultiIndex):
            # 優先使用 'Adj Close'，其次 'Close'
            if 'Adj Close' in data.columns.get_level_values(0):
                data = data['Adj Close']
            elif 'Close' in data.columns.get_level_values(0):
                data = data['Close']
            else:
                return None # 找不到收盤價數據
        elif len(tickers) == 1:
            # 單一股票下載，確保它是 DataFrame
            if isinstance(data, pd.Series):
                data = data.to_frame(name=tickers[0])
            elif 'Adj Close' in data.columns:
                data = data['Adj Close'].to_frame(name=tickers[0])
            elif 'Close' in data.columns:
                data = data['Close'].to_frame(name=tickers[0])
        
        if data.empty:
            print("Error: Data is empty after fetching or filtering.")
            return None
            
        # 計算報酬率和統計數據
        returns = data.pct_change().dropna()
        if returns.empty or len(returns) < 2:
            print("Error: Insufficient valid returns data for calculation.")
            return None

        # 假設一年有 252 個交易日
        mean_returns = returns.mean() * 252
        cov_matrix = returns.cov() * 252
        
    except Exception as e:
        # 捕捉數據獲取或處理期間的所有錯誤
        print(f"Error during data preparation: {e}")
        traceback.print_exc()
        return None

    # 步驟 2: 投資組合最佳化
    try:
        # 確保輸入是 NumPy 陣列
        mean_returns_np = mean_returns.values if isinstance(mean_returns, pd.Series) else mean_returns
        cov_matrix_np = cov_matrix.values if isinstance(cov_matrix, pd.DataFrame) else cov_matrix

        # 定義目標函數 (最小化負夏普比率)
        def negative_sharpe(weights):
            p_return = np.sum(weights * mean_returns_np)
            # 使用協方差矩陣的 NumPy 版本
            p_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix_np, weights)))
            
            # 處理極端情況
            if p_volatility == 0 or np.isnan(p_volatility):
                return 1e10 
            return -(p_return - risk_free_rate) / p_volatility

        num_assets = len(tickers)
        constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1}) # 權重總和為 1
        bounds = tuple((0, 1) for _ in range(num_assets)) # 權重在 0 到 1 之間
        initial_guess = num_assets * [1. / num_assets,]

        result = minimize(negative_sharpe, initial_guess, method='SLSQP', bounds=bounds, constraints=constraints)
        
        if not result.success:
            print(f"Optimization failed: {result.message}")
            return None
        
        # 提取最佳結果
        optimal_weights = result.x
        opt_return = np.sum(optimal_weights * mean_returns_np)
        opt_volatility = np.sqrt(np.dot(optimal_weights.T, np.dot(cov_matrix_np, optimal_weights)))
        
        sharpe_ratio = (opt_return - risk_free_rate) / opt_volatility if opt_volatility != 0 else 0

        # 步驟 3: 計算有效前緣 (Efficient Frontier) 
        frontier_volatility = []
        frontier_returns = []
        
        # 定義目標報酬範圍
        target_returns = np.linspace(mean_returns_np.min(), mean_returns_np.max(), 50)
        
        for r in target_returns:
            constraints_frontier = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
                                    {'type': 'eq', 'fun': lambda x: np.sum(x * mean_returns_np) - r})
            
            # 最小化波動度 (Standard Deviation)
            res = minimize(lambda w: np.sqrt(np.dot(w.T, np.dot(cov_matrix_np, w))), 
                           initial_guess, bounds=bounds, constraints=constraints_frontier, method='SLSQP')
            
            if res.success:
                frontier_volatility.append(res.fun)
                frontier_returns.append(r)

        # 步驟 4: 返回結果
        return {
            "weights": dict(zip(tickers, optimal_weights.tolist())),
            "return": float(opt_return),
            "risk": float(opt_volatility),
            "sharpe_ratio": float(sharpe_ratio),
            "efficient_frontier": {
                "volatility": frontier_volatility,
                "returns": [float(r) for r in frontier_returns]
            }
        }
    
    except np.linalg.LinAlgError as e:
        # 捕捉奇異矩陣等線性代數錯誤
        print(f"LinAlgError occurred during optimization: {e}")
        return None
    except Exception as e:
        # 捕捉所有其他意外錯誤
        print(f"An unexpected error occurred during optimization: {e}")
        traceback.print_exc()
        return None
