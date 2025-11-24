"""
Backtesting Engine for Trading Strategies

This module provides functionality to backtest trading strategies on historical stock data.
Users can define custom strategies and evaluate their performance.
"""

import yfinance as yf
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import io
import base64
import os
import warnings

# Suppress FutureWarning from pandas (likely from user strategy code using positional indexing)
warnings.simplefilter(action='ignore', category=FutureWarning)
from datetime import datetime
import sys
import signal
from contextlib import contextmanager

# Timeout decorator for strategy execution
class TimeoutException(Exception):
    pass

@contextmanager
def time_limit(seconds):
    """Context manager to limit execution time"""
    def signal_handler(signum, frame):
        raise TimeoutException("Strategy execution timed out")
    
    signal.signal(signal.SIGALRM, signal_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)


def validate_strategy_code(code):
    """
    Validate strategy code for security and correctness.
    
    Args:
        code (str): Strategy code to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    # Check for dangerous imports/operations
    dangerous_keywords = [
        'import os', 'import sys', 'import subprocess', 
        'import socket', 'import requests', 'import urllib',
        '__import__', 'eval(', 'exec(',
        'open(', 'file(', 'input(', 'raw_input(',
        'compile(', 'globals(', 'locals(',
    ]
    
    for keyword in dangerous_keywords:
        if keyword in code:
            return False, f"Forbidden operation detected: {keyword}"
    
    # Check if Strategy class is defined
    if 'class Strategy' not in code:
        return False, "Strategy class not found. Please define a 'Strategy' class."
    
    # Check if generate_signals method exists
    if 'def generate_signals' not in code:
        return False, "generate_signals method not found in Strategy class."
    
    return True, None


def execute_strategy(code, ticker, start_date, end_date, initial_capital=100000, commission=0.001):
    """
    Execute a trading strategy backtest.
    
    Args:
        code (str): Strategy code containing Strategy class
        ticker (str): Stock ticker symbol
        start_date (str): Start date for backtest (YYYY-MM-DD)
        end_date (str): End date for backtest (YYYY-MM-DD)
        initial_capital (float): Initial capital for trading
        commission (float): Commission rate (e.g., 0.001 = 0.1%)
        
    Returns:
        dict: Backtest results including metrics, equity curve, and trades
    """
    try:
        # Validate strategy code
        is_valid, error_msg = validate_strategy_code(code)
        if not is_valid:
            return {"error": error_msg}
        
        # Download historical data
        stock = yf.Ticker(ticker)
        df = stock.history(start=start_date, end=end_date)
        
        if df.empty:
            return {"error": f"No data available for {ticker} in the specified date range"}
        
        # Add technical indicators to data
        df = add_technical_indicators(df)
        
        # Execute strategy code in controlled environment
        namespace = {
            'pd': pd,
            'np': np,
            'ta': None,  # Restrict ta-lib access for now
        }
        
        try:
            exec(code, namespace)
        except Exception as e:
            return {"error": f"Strategy execution error: {str(e)}"}
        
        # Get Strategy class from namespace
        if 'Strategy' not in namespace:
            return {"error": "Strategy class not found after execution"}
        
        StrategyClass = namespace['Strategy']
        
        # Initialize strategy with data
        try:
            strategy = StrategyClass(df)
            signals = strategy.generate_signals()
            
            # Extract optional risk management parameters
            stop_loss = getattr(strategy, 'stop_loss', 0.0)
            take_profit = getattr(strategy, 'take_profit', 0.0)
            
        except Exception as e:
            return {"error": f"Error generating signals: {str(e)}"}
        
        # Validate signals
        if not isinstance(signals, pd.Series):
            return {"error": "generate_signals must return a pandas Series"}
        
        if len(signals) != len(df):
            return {"error": f"Signals length ({len(signals)}) must match data length ({len(df)})"}
        
        # Run backtest simulation
        results = simulate_trading(df, signals, initial_capital, commission, stop_loss, take_profit)
        
        # Generate equity curve plot
        plot_path = generate_equity_plot(results['equity_curve'], ticker, start_date, end_date)
        results['plot_path'] = plot_path
        
        return results
        
    except Exception as e:
        return {"error": f"Backtest error: {str(e)}"}


def add_technical_indicators(df):
    """Add common technical indicators to dataframe"""
    # Moving averages
    df['MA5'] = df['Close'].rolling(window=5).mean()
    df['MA20'] = df['Close'].rolling(window=20).mean()
    df['MA60'] = df['Close'].rolling(window=60).mean()
    
    # RSI
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    # MACD
    exp1 = df['Close'].ewm(span=12, adjust=False).mean()
    exp2 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = exp1 - exp2
    df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_Hist'] = df['MACD'] - df['MACD_Signal']
    
    # Bollinger Bands
    df['BB_Middle'] = df['Close'].rolling(window=20).mean()
    bb_std = df['Close'].rolling(window=20).std()
    df['BB_Upper'] = df['BB_Middle'] + (bb_std * 2)
    df['BB_Lower'] = df['BB_Middle'] - (bb_std * 2)
    
    return df


def simulate_trading(df, signals, initial_capital, commission, stop_loss=0.0, take_profit=0.0):
    """
    Simulate trading based on signals.
    
    Args:
        df (DataFrame): Price data
        signals (Series): Trading signals (1=buy, -1=sell, 0=hold)
        initial_capital (float): Starting capital
        commission (float): Commission rate
        stop_loss (float): Stop loss percentage (e.g., 0.02 for 2%)
        take_profit (float): Take profit percentage (e.g., 0.04 for 4%)
        
    Returns:
        dict: Trading results with metrics and equity curve
    """
    cash = initial_capital
    position = 0  # Number of shares held
    entry_price = 0 # Track entry price for SL/TP
    equity_curve = []
    trades = []
    
    for i in range(len(df)):
        date = df.index[i]
        price = df['Close'].iloc[i]
        signal = signals.iloc[i]
        
        # Check Stop Loss / Take Profit if holding position
        if position > 0 and entry_price > 0:
            pct_change = (price - entry_price) / entry_price
            
            # Stop Loss
            if stop_loss > 0 and pct_change <= -stop_loss:
                # Trigger Sell
                signal = -1
            
            # Take Profit
            elif take_profit > 0 and pct_change >= take_profit:
                # Trigger Sell
                signal = -1
        
        # Execute trades based on signals
        if signal == 1 and position == 0:  # Buy signal
            shares_to_buy = int(cash / (price * (1 + commission)))
            if shares_to_buy > 0:
                cost = shares_to_buy * price * (1 + commission)
                cash -= cost
                position = shares_to_buy
                entry_price = price
                trades.append({
                    'date': date,
                    'type': 'BUY',
                    'price': price,
                    'shares': shares_to_buy,
                    'value': cost
                })
        
        elif signal == -1 and position > 0:  # Sell signal
            proceeds = position * price * (1 - commission)
            cash += proceeds
            trades.append({
                'date': date,
                'type': 'SELL',
                'price': price,
                'shares': position,
                'value': proceeds
            })
            position = 0
            entry_price = 0
        
        # Calculate current equity
        portfolio_value = cash + (position * price)
        equity_curve.append({
            'date': date,
            'equity': portfolio_value,
            'cash': cash,
            'position_value': position * price
        })
    
    # Close any remaining position at the end
    if position > 0:
        final_price = df['Close'].iloc[-1]
        proceeds = position * final_price * (1 - commission)
        cash += proceeds
        trades.append({
            'date': df.index[-1],
            'type': 'SELL',
            'price': final_price,
            'shares': position,
            'value': proceeds
        })
        position = 0
        equity_curve[-1]['equity'] = cash
        equity_curve[-1]['cash'] = cash
        equity_curve[-1]['position_value'] = 0
    
    # Convert to DataFrame
    equity_df = pd.DataFrame(equity_curve)
    trades_df = pd.DataFrame(trades) if trades else pd.DataFrame()
    
    # Calculate metrics
    metrics = calculate_metrics(equity_df, trades_df, initial_capital)
    
    # Replace NaN values with 0 for JSON serialization
    equity_df = equity_df.fillna(0)
    
    return {
        'metrics': metrics,
        'equity_curve': equity_df.to_dict('records'),
        'trades': trades_df.to_dict('records') if not trades_df.empty else []
    }


def calculate_metrics(equity_df, trades_df, initial_capital):
    """Calculate performance metrics"""
    final_equity = equity_df['equity'].iloc[-1]
    total_return = (final_equity - initial_capital) / initial_capital
    
    # Calculate returns
    equity_df['returns'] = equity_df['equity'].pct_change()
    
    # Sharpe Ratio (annualized, assuming 252 trading days)
    if len(equity_df) > 1 and equity_df['returns'].std() > 0:
        sharpe_ratio = (equity_df['returns'].mean() / equity_df['returns'].std()) * np.sqrt(252)
    else:
        sharpe_ratio = 0
    
    # Maximum Drawdown
    equity_df['cummax'] = equity_df['equity'].cummax()
    equity_df['drawdown'] = (equity_df['equity'] - equity_df['cummax']) / equity_df['cummax']
    max_drawdown = equity_df['drawdown'].min()
    
    # Trade statistics
    num_trades = len(trades_df)
    if num_trades > 0 and num_trades % 2 == 0:
        # Calculate P&L for each round trip
        winning_trades = 0
        losing_trades = 0
        total_profit = 0
        total_loss = 0
        
        for i in range(0, len(trades_df), 2):
            buy_trade = trades_df.iloc[i]
            sell_trade = trades_df.iloc[i+1]
            pnl = sell_trade['value'] - buy_trade['value']
            
            if pnl > 0:
                winning_trades += 1
                total_profit += pnl
            else:
                losing_trades += 1
                total_loss += abs(pnl)
        
        win_rate = winning_trades / (winning_trades + losing_trades) if (winning_trades + losing_trades) > 0 else 0
        avg_win = total_profit / winning_trades if winning_trades > 0 else 0
        avg_loss = total_loss / losing_trades if losing_trades > 0 else 0
        profit_factor = total_profit / total_loss if total_loss > 0 else float('inf')
    else:
        winning_trades = 0
        losing_trades = 0
        win_rate = 0
        avg_win = 0
        avg_loss = 0
        profit_factor = 0
    
    
    metrics = {
        'initial_capital': initial_capital,
        'final_equity': final_equity,
        'total_return': total_return if not np.isnan(total_return) else 0,
        'total_return_pct': (total_return * 100) if not np.isnan(total_return) else 0,
        'sharpe_ratio': sharpe_ratio if not np.isnan(sharpe_ratio) and not np.isinf(sharpe_ratio) else 0,
        'max_drawdown': max_drawdown if not np.isnan(max_drawdown) else 0,
        'max_drawdown_pct': (max_drawdown * 100) if not np.isnan(max_drawdown) else 0,
        'num_trades': num_trades // 2,  # Round trips
        'winning_trades': winning_trades,
        'losing_trades': losing_trades,
        'win_rate': win_rate if not np.isnan(win_rate) else 0,
        'win_rate_pct': (win_rate * 100) if not np.isnan(win_rate) else 0,
        'avg_win': avg_win if not np.isnan(avg_win) else 0,
        'avg_loss': avg_loss if not np.isnan(avg_loss) else 0,
        'profit_factor': profit_factor if not np.isnan(profit_factor) and not np.isinf(profit_factor) else 0
    }
    
    return metrics


def generate_equity_plot(equity_curve, ticker, start_date, end_date):
    """Generate equity curve plot"""
    try:
        df = pd.DataFrame(equity_curve)
        df['date'] = pd.to_datetime(df['date'])
        
        plt.figure(figsize=(12, 6))
        plt.style.use('dark_background')
        
        plt.plot(df['date'], df['equity'], linewidth=2, color='#00ff88', label='Portfolio Value')
        plt.fill_between(df['date'], df['equity'], alpha=0.3, color='#00ff88')
        
        plt.title(f'Backtest Results - {ticker}', fontsize=16, fontweight='bold', pad=20)
        plt.xlabel('Date', fontsize=12)
        plt.ylabel('Portfolio Value ($)', fontsize=12)
        plt.legend(loc='upper left', fontsize=10)
        plt.grid(True, alpha=0.2)
        plt.tight_layout()
        
        # Save plot
        os.makedirs("static/plots", exist_ok=True)
        filename = f"backtest_{ticker}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join("static/plots", filename)
        plt.savefig(filepath, dpi=100, bbox_inches='tight', facecolor='#1a1a1a')
        plt.close()
        
        return f"/static/plots/{filename}"
    except Exception as e:
        print(f"Error generating plot: {e}")
        return None


def get_strategy_templates():
    """Return example strategy templates and custom saved strategies"""
    # Default templates
    templates = {
        "new_strategy": {
            "name": "+ 新增策略",
            "description": "Create a new empty strategy",
            "code": """class Strategy:
    def __init__(self, data):
        self.data = data
        # Optional: Set Stop Loss / Take Profit
        self.stop_loss = 0.0
        self.take_profit = 0.0
    
    def generate_signals(self):
        signals = pd.Series(0, index=self.data.index)
        
        # Implement your strategy logic here
        # signals[buy_condition] = 1
        # signals[sell_condition] = -1
        
        return signals"""
        },
        "moving_average_crossover": {
            "name": "Moving Average Crossover",
            "description": "Buy when MA5 crosses above MA20, sell when it crosses below",
            "code": """class Strategy:
    def __init__(self, data):
        self.data = data
    
    def generate_signals(self):
        signals = pd.Series(0, index=self.data.index)
        
        # Buy when MA5 crosses above MA20
        buy_condition = (self.data['MA5'] > self.data['MA20']) & (self.data['MA5'].shift(1) <= self.data['MA20'].shift(1))
        signals[buy_condition] = 1
        
        # Sell when MA5 crosses below MA20
        sell_condition = (self.data['MA5'] < self.data['MA20']) & (self.data['MA5'].shift(1) >= self.data['MA20'].shift(1))
        signals[sell_condition] = -1
        
        return signals"""
        },
        "rsi_mean_reversion": {
            "name": "RSI Mean Reversion",
            "description": "Buy when RSI < 30 (oversold), sell when RSI > 70 (overbought)",
            "code": """class Strategy:
    def __init__(self, data):
        self.data = data
    
    def generate_signals(self):
        signals = pd.Series(0, index=self.data.index)
        
        # Buy when RSI is oversold (< 30)
        buy_condition = (self.data['RSI'] < 30) & (self.data['RSI'].shift(1) >= 30)
        signals[buy_condition] = 1
        
        # Sell when RSI is overbought (> 70)
        sell_condition = (self.data['RSI'] > 70) & (self.data['RSI'].shift(1) <= 70)
        signals[sell_condition] = -1
        
        return signals"""
        },
        "macd_trend": {
            "name": "MACD Trend Following",
            "description": "Buy when MACD crosses above signal line, sell when it crosses below",
            "code": """class Strategy:
    def __init__(self, data):
        self.data = data
    
    def generate_signals(self):
        signals = pd.Series(0, index=self.data.index)
        
        # Buy when MACD crosses above signal line
        buy_condition = (self.data['MACD'] > self.data['MACD_Signal']) & (self.data['MACD'].shift(1) <= self.data['MACD_Signal'].shift(1))
        signals[buy_condition] = 1
        
        # Sell when MACD crosses below signal line
        sell_condition = (self.data['MACD'] < self.data['MACD_Signal']) & (self.data['MACD'].shift(1) >= self.data['MACD_Signal'].shift(1))
        signals[sell_condition] = -1
        
        return signals"""
        },
        "bollinger_breakout": {
            "name": "Bollinger Band Breakout",
            "description": "Buy when price breaks above upper band, sell when it breaks below lower band",
            "code": """class Strategy:
    def __init__(self, data):
        self.data = data
    
    def generate_signals(self):
        signals = pd.Series(0, index=self.data.index)
        
        # Buy when price breaks above upper Bollinger Band
        buy_condition = (self.data['Close'] > self.data['BB_Upper']) & (self.data['Close'].shift(1) <= self.data['BB_Upper'].shift(1))
        signals[buy_condition] = 1
        
        # Sell when price breaks below lower Bollinger Band
        sell_condition = (self.data['Close'] < self.data['BB_Lower']) & (self.data['Close'].shift(1) >= self.data['BB_Lower'].shift(1))
        signals[sell_condition] = -1
        
        return signals"""
        },
        "multi_indicator": {
            "name": "Multi-Indicator Strategy",
            "description": "Combine MA, RSI, and MACD signals for confirmation",
            "code": """class Strategy:
    def __init__(self, data):
        self.data = data
    
    def generate_signals(self):
        signals = pd.Series(0, index=self.data.index)
        
        # Buy when multiple bullish conditions are met
        ma_bullish = self.data['MA5'] > self.data['MA20']
        rsi_bullish = (self.data['RSI'] > 30) & (self.data['RSI'] < 70)
        macd_bullish = self.data['MACD'] > self.data['MACD_Signal']
        
        buy_condition = ma_bullish & rsi_bullish & macd_bullish & (~ma_bullish.shift(1) | ~macd_bullish.shift(1))
        signals[buy_condition] = 1
        
        # Sell when multiple bearish conditions are met
        ma_bearish = self.data['MA5'] < self.data['MA20']
        rsi_bearish = self.data['RSI'] > 70
        macd_bearish = self.data['MACD'] < self.data['MACD_Signal']
        
        sell_condition = (ma_bearish & macd_bearish) | rsi_bearish
        signals[sell_condition] = -1
        
        return signals"""
        }
    }
    
    # Load custom strategies
    strategies_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "strategies")
    if os.path.exists(strategies_dir):
        import json
        for filename in os.listdir(strategies_dir):
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(strategies_dir, filename), 'r', encoding='utf-8') as f:
                        strategy_data = json.load(f)
                        # Use filename (without extension) as key to ensure uniqueness and easy deletion
                        key = filename[:-5]
                        templates[key] = {
                            "name": strategy_data.get("name", key),
                            "description": strategy_data.get("description", "Custom Strategy"),
                            "code": strategy_data.get("code", ""),
                            "is_custom": True  # Flag to identify custom strategies
                        }
                except Exception as e:
                    print(f"Error loading strategy {filename}: {e}")
    
    return templates

def save_custom_strategy(name, code, description="Custom Strategy"):
    """Save a custom strategy to file"""
    import json
    import re
    
    # Create filename from name (sanitize)
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name).lower()
    filename = f"{safe_name}.json"
    
    strategies_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "strategies")
    os.makedirs(strategies_dir, exist_ok=True)
    
    filepath = os.path.join(strategies_dir, filename)
    
    data = {
        "name": name,
        "description": description,
        "code": code
    }
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    return safe_name

def delete_custom_strategy(key):
    """Delete a custom strategy file"""
    strategies_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "strategies")
    filename = f"{key}.json"
    filepath = os.path.join(strategies_dir, filename)
    
    if os.path.exists(filepath):
        os.remove(filepath)
        return True
    return False
