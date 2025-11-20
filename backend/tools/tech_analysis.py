import matplotlib
matplotlib.use("Agg")

import yfinance as yf
import pandas as pd
import matplotlib.pyplot as plt
import ta
import os
import matplotlib.dates as mdates
import configparser
import google.generativeai as genai
from PIL import Image
from tools.utils import retry_gemini

# Load Config
config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.ini")
config.read(config_path)

# Configure Gemini
try:
    genai.configure(api_key=config["Gemini"]["API_KEY"])
    model = genai.GenerativeModel('gemini-2.0-flash')
except KeyError:
    print("Gemini API Key not found in config.ini")
    model = None

from datetime import datetime

def get_technical_df(ticker, start="2024-01-01", end=None):
    if end is None:
        end = datetime.now().strftime('%Y-%m-%d')
    df = yf.download(ticker, start=start, end=end)
    if isinstance(df.columns, pd.MultiIndex):
        # Handle yfinance multi-index if present
        try:
            df = df.xs(ticker, axis=1, level=1)
        except:
            pass # Keep as is if structure differs
            
    # Ensure we have the right columns, sometimes yfinance returns them in MultiIndex differently
    if 'Close' not in df.columns:
         # Try to flatten or fix
         df.columns = df.columns.get_level_values(0)

    df = df.reset_index()
    # Basic validation
    required_cols = ["Date", "Close", "High", "Low", "Open", "Volume"]
    for col in required_cols:
        if col not in df.columns:
            # Fallback or error
            pass

    df["MA5"] = ta.trend.sma_indicator(close=df["Close"], window=5)
    df["MA20"] = ta.trend.sma_indicator(close=df["Close"], window=20)
    df["MA60"] = ta.trend.sma_indicator(close=df["Close"], window=60)
    df["RSI"] = ta.momentum.rsi(close=df["Close"], window=14)
    df["%K"] = ta.momentum.stoch(high=df["High"], low=df["Low"], close=df["Close"], window=14)
    df["MACD"] = ta.trend.macd(close=df["Close"], window_slow=26, window_fast=12)
    df["MACD_Signal"] = ta.trend.macd_signal(close=df["Close"], window_slow=26, window_fast=12, window_sign=9)
    df["Bollinger"] = ta.volatility.bollinger_mavg(close=df["Close"], window=20)
    df["BB_High"] = ta.volatility.bollinger_hband(close=df["Close"], window=20)
    df["BB_Low"] = ta.volatility.bollinger_lband(close=df["Close"], window=20)
    df["VWAP"] = ta.volume.volume_weighted_average_price(high=df["High"], low=df["Low"], close=df["Close"], volume=df["Volume"])
    
    # New Indicators
    df["ATR"] = ta.volatility.average_true_range(high=df["High"], low=df["Low"], close=df["Close"], window=14)
    df["OBV"] = ta.volume.on_balance_volume(close=df["Close"], volume=df["Volume"])
    df["ADX"] = ta.trend.adx(high=df["High"], low=df["Low"], close=df["Close"], window=14)
    df["CCI"] = ta.trend.cci(high=df["High"], low=df["Low"], close=df["Close"], window=20)

    df.dropna(inplace=True)
    return df

def calculate_signals(df):
    latest = df.iloc[-1]
    signals = []
    
    # MA Signal
    if latest["Close"] > latest["MA20"]:
        signals.append({"indicator": "MA20", "value": f"{latest['MA20']:.2f}", "signal": "Buy", "reason": "Price above MA20"})
    else:
        signals.append({"indicator": "MA20", "value": f"{latest['MA20']:.2f}", "signal": "Sell", "reason": "Price below MA20"})

    # RSI Signal
    if latest["RSI"] < 30:
        signals.append({"indicator": "RSI", "value": f"{latest['RSI']:.2f}", "signal": "Buy", "reason": "Oversold (<30)"})
    elif latest["RSI"] > 70:
        signals.append({"indicator": "RSI", "value": f"{latest['RSI']:.2f}", "signal": "Sell", "reason": "Overbought (>70)"})
    else:
        signals.append({"indicator": "RSI", "value": f"{latest['RSI']:.2f}", "signal": "Hold", "reason": "Neutral Zone"})

    # MACD Signal
    if latest["MACD"] > latest["MACD_Signal"]:
        signals.append({"indicator": "MACD", "value": f"{latest['MACD']:.2f}", "signal": "Buy", "reason": "MACD > Signal"})
    else:
        signals.append({"indicator": "MACD", "value": f"{latest['MACD']:.2f}", "signal": "Sell", "reason": "MACD < Signal"})

    # Bollinger Signal
    if latest["Close"] < latest["BB_Low"]:
        signals.append({"indicator": "Bollinger", "value": f"{latest['BB_Low']:.2f}", "signal": "Buy", "reason": "Price < Lower Band"})
    elif latest["Close"] > latest["BB_High"]:
        signals.append({"indicator": "Bollinger", "value": f"{latest['BB_High']:.2f}", "signal": "Sell", "reason": "Price > Upper Band"})
    else:
        signals.append({"indicator": "Bollinger", "value": "In Range", "signal": "Hold", "reason": "Within Bands"})
        
    # ADX Trend Strength
    trend_str = "Strong" if latest["ADX"] > 25 else "Weak"
    signals.append({"indicator": "ADX", "value": f"{latest['ADX']:.2f}", "signal": "Info", "reason": f"{trend_str} Trend"})

    # CCI Signal
    if latest["CCI"] < -100:
        signals.append({"indicator": "CCI", "value": f"{latest['CCI']:.2f}", "signal": "Buy", "reason": "Oversold (<-100)"})
    elif latest["CCI"] > 100:
        signals.append({"indicator": "CCI", "value": f"{latest['CCI']:.2f}", "signal": "Sell", "reason": "Overbought (>100)"})
    else:
        signals.append({"indicator": "CCI", "value": f"{latest['CCI']:.2f}", "signal": "Hold", "reason": "Neutral"})

    return signals

def plot_indicators(df, ticker):
    df["Date"] = pd.to_datetime(df["Date"])
    
    # Ensure static/plots exists
    save_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "plots")
    os.makedirs(save_dir, exist_ok=True)

    filename = f"{ticker}_technical.png"
    filepath = os.path.join(save_dir, filename)
    
    # Professional dark theme styling
    plt.style.use('dark_background')
    
    # Create figure with better proportions
    fig, axs = plt.subplots(4, 1, figsize=(14, 10), sharex=True, 
                            gridspec_kw={'hspace': 0.05, 'height_ratios': [3, 1, 1, 1]})
    
    # Set dark background colors
    bg_color = '#0f1419'
    grid_color = '#1c2532'
    text_color = '#e1e8ed'
    
    fig.patch.set_facecolor(bg_color)
    for ax in axs:
        ax.set_facecolor(bg_color)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color(grid_color)
        ax.spines['bottom'].set_color(grid_color)
        ax.tick_params(colors=text_color, which='both')
        ax.grid(True, alpha=0.15, linestyle='--', linewidth=0.5, color=grid_color)
    
    # Title with better styling
    fig.suptitle(f"{ticker} Technical Analysis", 
                 fontsize=16, fontweight='bold', color=text_color, y=0.995)

    # Chart 1: Price and Moving Averages with professional colors
    axs[0].plot(df['Date'], df['Close'], label='Close', color='#00d4ff', linewidth=2, zorder=5)
    axs[0].plot(df['Date'], df['MA5'], label='MA5', color='#ffa500', linewidth=1.5, alpha=0.9)
    axs[0].plot(df['Date'], df['MA20'], label='MA20', color='#00ff88', linewidth=1.5, alpha=0.9)
    axs[0].plot(df['Date'], df['MA60'], label='MA60', color='#ff4757', linewidth=1.5, alpha=0.9)
    
    # Fill area under close price for depth
    axs[0].fill_between(df['Date'], df['Close'], alpha=0.1, color='#00d4ff')
    
    axs[0].set_ylabel('Price (USD)', fontsize=10, color=text_color, fontweight='bold')
    axs[0].legend(loc='upper left', frameon=True, fancybox=True, shadow=True, 
                  framealpha=0.9, facecolor='#1c2532', edgecolor='#2d3748')
    axs[0].yaxis.set_label_coords(-0.05, 0.5)

    # Chart 2: RSI and Stochastic with zones
    axs[1].plot(df['Date'], df['RSI'], label='RSI', color='#a78bfa', linewidth=1.8)
    axs[1].axhline(y=70, color='#ff4757', linestyle='--', linewidth=1, alpha=0.7, label='Overbought')
    axs[1].axhline(y=30, color='#00ff88', linestyle='--', linewidth=1, alpha=0.7, label='Oversold')
    axs[1].axhline(y=50, color='#ffa500', linestyle=':', linewidth=0.8, alpha=0.5)
    
    # Fill overbought/oversold zones
    axs[1].fill_between(df['Date'], 70, 100, alpha=0.1, color='#ff4757')
    axs[1].fill_between(df['Date'], 0, 30, alpha=0.1, color='#00ff88')
    
    axs[1].plot(df['Date'], df['%K'], label='Stoch %K', color='#00d4ff', linewidth=1.5, alpha=0.8)
    axs[1].set_ylabel('RSI / Stoch', fontsize=9, color=text_color, fontweight='bold')
    axs[1].set_ylim(0, 100)
    axs[1].legend(loc='upper left', frameon=True, fancybox=True, shadow=True,
                  framealpha=0.9, facecolor='#1c2532', edgecolor='#2d3748', fontsize=8)
    axs[1].yaxis.set_label_coords(-0.05, 0.5)

    # Chart 3: MACD with histogram effect
    macd_colors = ['#00ff88' if x >= 0 else '#ff4757' for x in df['MACD']]
    axs[2].bar(df['Date'], df['MACD'], label='MACD', color=macd_colors, alpha=0.6, width=1)
    axs[2].plot(df['Date'], df['MACD'], color='#00d4ff', linewidth=1.5, alpha=0.9)
    axs[2].axhline(y=0, color=text_color, linestyle='-', linewidth=0.8, alpha=0.3)
    axs[2].set_ylabel('MACD', fontsize=9, color=text_color, fontweight='bold')
    axs[2].legend(loc='upper left', frameon=True, fancybox=True, shadow=True,
                  framealpha=0.9, facecolor='#1c2532', edgecolor='#2d3748', fontsize=8)
    axs[2].yaxis.set_label_coords(-0.05, 0.5)

    # Chart 4: Bollinger Bands and VWAP
    axs[3].plot(df['Date'], df['Bollinger'], label='Bollinger MA', color='#ffa500', linewidth=1.8)
    axs[3].plot(df['Date'], df['VWAP'], label='VWAP', color='#a78bfa', linewidth=1.8, linestyle='--')
    axs[3].fill_between(df['Date'], df['Bollinger'], alpha=0.1, color='#ffa500')
    axs[3].set_ylabel('BB / VWAP', fontsize=9, color=text_color, fontweight='bold')
    axs[3].set_xlabel('Date', fontsize=10, color=text_color, fontweight='bold')
    axs[3].legend(loc='upper left', frameon=True, fancybox=True, shadow=True,
                  framealpha=0.9, facecolor='#1c2532', edgecolor='#2d3748', fontsize=8)
    axs[3].yaxis.set_label_coords(-0.05, 0.5)

    # Format x-axis
    axs[3].xaxis.set_major_locator(mdates.MonthLocator(interval=1))
    axs[3].xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    axs[3].xaxis.set_minor_locator(mdates.WeekdayLocator())
    
    # Rotate date labels
    plt.setp(axs[3].xaxis.get_majorticklabels(), rotation=45, ha='right')

    # Adjust layout
    plt.tight_layout(rect=[0, 0, 1, 0.99])
    
    # Save with high DPI for better quality
    plt.savefig(filepath, facecolor=bg_color, edgecolor='none', dpi=150, bbox_inches='tight')
    plt.close()

    return filename

def generate_summary(df):
    df["Date"] = pd.to_datetime(df["Date"])
    latest = df.iloc[-1]
    date_str = latest["Date"].date()

    close = latest["Close"]
    ma5 = latest["MA5"]
    ma20 = latest["MA20"]
    ma60 = latest["MA60"]
    rsi = latest["RSI"]
    macd = latest["MACD"]
    vwap = latest["VWAP"]
    stoch_k = latest["%K"]
    bollinger = latest["Bollinger"]

    ma_trend = "up" if ma5 > ma20 > ma60 else "volatile or down"
    rsi_state = "overbought" if rsi > 70 else "oversold" if rsi < 30 else "neutral"
    macd_trend = "bullish trend" if macd > 0 else "bearish trend"
    vwap_signal = "above VWAP, bullish" if close > vwap else "below VWAP, bearish"

    summary = (
        f"Technical indicator summary ({date_str})\n"
        f"Closing price: {close:.2f}.\n"
        f"Moving averages: MA5={ma5:.2f}, MA20={ma20:.2f}, MA60={ma60:.2f}, trend: {ma_trend}.\n"
        f"RSI: {rsi:.2f}, belongs to {rsi_state} zone.\n"
        f"MACD value is {macd:.2f}, shows {macd_trend}.\n"
        f"Price {vwap_signal}.\n"
        f"KD indicator %K value is {stoch_k:.2f}.\n"
        f"Bollinger band middle line is {bollinger:.2f}.\n"
    )
    return summary

def analyze_technical_chart(filepath, summary):
    if not model:
        return "⚠️ Gemini API Key missing."

    try:
        # Load image
        img = Image.open(filepath)
        
        prompt = f"""
You are a professional technical analyst. Please refer to the attached chart (stock technical indicator chart) and the following data summary:
{summary}

Please Analysis the chart and data summary, and provide the following analysis:
1. Current trend status (bullish/bearish/neutral)
2. Key support and resistance levels
3. RSI and MACD signals interpretation
4. Short-term trading suggestions (buy/sell/watch)
"""
        @retry_gemini
        def generate(p, i):
            return model.generate_content([p, i])

        response = generate(prompt, img)
        return response.text
    except Exception as e:
        return f"⚠️ Analysis failed: {str(e)}"
