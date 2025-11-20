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

def get_technical_df(ticker, start="2024-01-01", end=None, 
                     ma_short=5, ma_medium=20, ma_long=60,
                     macd_fast=12, macd_slow=26, macd_signal=9,
                     rsi_window=14, stoch_window=14, bb_window=20,
                     atr_window=14, cci_window=20, adx_window=14,
                     selected_indicators=None):
    
    if end is None:
        end = datetime.now().strftime('%Y-%m-%d')

    try:
        # Download data
        df = yf.download(ticker, start=start, end=end)
        
        if df.empty:
            return pd.DataFrame()

        # Flatten MultiIndex columns if present (yfinance update)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        # Ensure we have enough data
        if len(df) < 60:
            return pd.DataFrame()

        # Default to all indicators if none selected (backward compatibility)
        if selected_indicators is None:
            selected_indicators = ["MA", "RSI", "MACD", "Bollinger", "Stochastic", "ATR", "CCI", "ADX", "OBV", "Ichimoku", "WilliamsR", "MFI", "VWAP"]

        # --- Basic Indicators (Always calculated for chart basics) ---
        # Moving Averages
        if "MA" in selected_indicators:
            df[f"MA{ma_short}"] = ta.trend.sma_indicator(close=df["Close"], window=ma_short)
            df[f"MA{ma_medium}"] = ta.trend.sma_indicator(close=df["Close"], window=ma_medium)
            df[f"MA{ma_long}"] = ta.trend.sma_indicator(close=df["Close"], window=ma_long)

        # --- Oscillators ---
        if "RSI" in selected_indicators:
            df["RSI"] = ta.momentum.rsi(close=df["Close"], window=rsi_window)
        
        if "Stochastic" in selected_indicators:
            df["%K"] = ta.momentum.stoch(high=df["High"], low=df["Low"], close=df["Close"], window=stoch_window)
            df["%D"] = ta.momentum.stoch_signal(high=df["High"], low=df["Low"], close=df["Close"], window=stoch_window)

        if "WilliamsR" in selected_indicators:
            df["WilliamsR"] = ta.momentum.williams_r(high=df["High"], low=df["Low"], close=df["Close"], lbp=14)

        if "MFI" in selected_indicators:
            df["MFI"] = ta.volume.money_flow_index(high=df["High"], low=df["Low"], close=df["Close"], volume=df["Volume"], window=14)

        if "CCI" in selected_indicators:
            df["CCI"] = ta.trend.cci(high=df["High"], low=df["Low"], close=df["Close"], window=cci_window)

        # --- Trend & Volatility ---
        if "MACD" in selected_indicators:
            df["MACD"] = ta.trend.macd(close=df["Close"], window_slow=macd_slow, window_fast=macd_fast)
            df["MACD_Signal"] = ta.trend.macd_signal(close=df["Close"], window_slow=macd_slow, window_fast=macd_fast, window_sign=macd_signal)
            df["MACD_Hist"] = ta.trend.macd_diff(close=df["Close"], window_slow=macd_slow, window_fast=macd_fast, window_sign=macd_signal)

        if "Bollinger" in selected_indicators:
            df["Bollinger"] = ta.volatility.bollinger_mavg(close=df["Close"], window=bb_window)
            df["BB_High"] = ta.volatility.bollinger_hband(close=df["Close"], window=bb_window)
            df["BB_Low"] = ta.volatility.bollinger_lband(close=df["Close"], window=bb_window)

        if "ATR" in selected_indicators:
            df["ATR"] = ta.volatility.average_true_range(high=df["High"], low=df["Low"], close=df["Close"], window=atr_window)

        if "ADX" in selected_indicators:
            df["ADX"] = ta.trend.adx(high=df["High"], low=df["Low"], close=df["Close"], window=adx_window)

        if "Ichimoku" in selected_indicators:
            ichimoku = ta.trend.IchimokuIndicator(high=df["High"], low=df["Low"], window1=9, window2=26, window3=52)
            df["Ichimoku_A"] = ichimoku.ichimoku_a()
            df["Ichimoku_B"] = ichimoku.ichimoku_b()
            df["Ichimoku_Base"] = ichimoku.ichimoku_base_line()
            df["Ichimoku_Conv"] = ichimoku.ichimoku_conversion_line()

        # --- Volume ---
        if "OBV" in selected_indicators:
            df["OBV"] = ta.volume.on_balance_volume(close=df["Close"], volume=df["Volume"])

        if "VWAP" in selected_indicators:
            df["VWAP"] = ta.volume.volume_weighted_average_price(high=df["High"], low=df["Low"], close=df["Close"], volume=df["Volume"])
        
        return df.fillna(0)

    except Exception as e:
        print(f"Error in technical analysis: {e}")
        return pd.DataFrame()

def calculate_signals(df):
    """
    Generates trading signals based on technical indicators with a weighted scoring system.
    Returns a dictionary with recommendation, score, and details.
    """
    if df.empty:
        return {"recommendation": "NEUTRAL", "score": 0, "details": []}

    latest = df.iloc[-1]
    signals = []
    score = 0
    total_weight = 0

    # Helper to add signal
    def add_signal(condition, weight, name, bullish_msg, bearish_msg):
        nonlocal score, total_weight
        if condition is None: return # Indicator not present
        
        total_weight += weight
        if condition:
            score += weight
            signals.append({"indicator": name, "signal": "BULLISH", "message": bullish_msg})
        else:
            score -= weight
            signals.append({"indicator": name, "signal": "BEARISH", "message": bearish_msg})

    # --- Moving Averages (Trend) - Weight: 3 ---
    if "MA20" in df.columns and "MA60" in df.columns:
        add_signal(
            latest["MA20"] > latest["MA60"], 
            3, "Moving Averages", 
            "Short-term MA above Long-term MA (Golden Cross area)", 
            "Short-term MA below Long-term MA (Death Cross area)"
        )

    # --- MACD (Momentum) - Weight: 3 ---
    if "MACD" in df.columns and "MACD_Signal" in df.columns:
        add_signal(
            latest["MACD"] > latest["MACD_Signal"],
            3, "MACD",
            "MACD line above Signal line",
            "MACD line below Signal line"
        )

    # --- RSI (Overbought/Oversold) - Weight: 2 ---
    if "RSI" in df.columns:
        rsi = latest["RSI"]
        if rsi < 30:
            score += 2
            total_weight += 2
            signals.append({"indicator": "RSI", "signal": "BULLISH", "message": f"RSI is oversold ({rsi:.1f})"})
        elif rsi > 70:
            score -= 2
            total_weight += 2
            signals.append({"indicator": "RSI", "signal": "BEARISH", "message": f"RSI is overbought ({rsi:.1f})"})
        else:
            # Neutral RSI doesn't add to score but adds to weight denominator if we wanted strict percentages
            # Here we treat neutral as 0 impact
            pass

    # --- Bollinger Bands (Volatility/Mean Reversion) - Weight: 2 ---
    if "Close" in df.columns and "BB_Low" in df.columns and "BB_High" in df.columns:
        if latest["Close"] < latest["BB_Low"]:
            score += 2
            total_weight += 2
            signals.append({"indicator": "Bollinger", "signal": "BULLISH", "message": "Price below lower Bollinger Band"})
        elif latest["Close"] > latest["BB_High"]:
            score -= 2
            total_weight += 2
            signals.append({"indicator": "Bollinger", "signal": "BEARISH", "message": "Price above upper Bollinger Band"})

    # --- Stochastic (Momentum) - Weight: 1 ---
    if "%K" in df.columns and "%D" in df.columns:
        add_signal(
            latest["%K"] > latest["%D"],
            1, "Stochastic",
            "Stochastic %K above %D",
            "Stochastic %K below %D"
        )

    # --- Ichimoku (Trend) - Weight: 2 ---
    if "Close" in df.columns and "Ichimoku_A" in df.columns and "Ichimoku_B" in df.columns:
        # Price above Cloud (Bullish)
        cloud_top = max(latest["Ichimoku_A"], latest["Ichimoku_B"])
        cloud_bottom = min(latest["Ichimoku_A"], latest["Ichimoku_B"])
        
        if latest["Close"] > cloud_top:
            score += 2
            total_weight += 2
            signals.append({"indicator": "Ichimoku", "signal": "BULLISH", "message": "Price above Cloud"})
        elif latest["Close"] < cloud_bottom:
            score -= 2
            total_weight += 2
            signals.append({"indicator": "Ichimoku", "signal": "BEARISH", "message": "Price below Cloud"})

    # --- OBV (Volume Trend) - Weight: 1 ---
    # Compare with 5 days ago to see trend
    if "OBV" in df.columns and len(df) > 5:
        obv_trend = latest["OBV"] > df.iloc[-5]["OBV"]
        add_signal(
            obv_trend,
            1, "OBV",
            "Volume trend is rising",
            "Volume trend is falling"
        )

    # --- Williams %R - Weight: 1 ---
    if "WilliamsR" in df.columns:
        wr = latest["WilliamsR"]
        if wr < -80: # Oversold
            score += 1
            total_weight += 1
            signals.append({"indicator": "Williams %R", "signal": "BULLISH", "message": "Oversold territory"})
        elif wr > -20: # Overbought
            score -= 1
            total_weight += 1
            signals.append({"indicator": "Williams %R", "signal": "BEARISH", "message": "Overbought territory"})

    # Normalize Score (-1 to 1)
    # Avoid division by zero
    normalized_score = score / total_weight if total_weight > 0 else 0
    
    # Determine Recommendation
    if normalized_score >= 0.5:
        recommendation = "STRONG BUY"
        color = "green"
    elif normalized_score >= 0.2:
        recommendation = "BUY"
        color = "lightgreen"
    elif normalized_score <= -0.5:
        recommendation = "STRONG SELL"
        color = "red"
    elif normalized_score <= -0.2:
        recommendation = "SELL"
        color = "orange"
    else:
        recommendation = "HOLD"
        color = "yellow"

    return {
        "recommendation": recommendation,
        "score": round(normalized_score, 2),
        "color": color,
        "details": signals
    }

def plot_indicators(df, ticker, ma_short=5, ma_medium=20, ma_long=60,
                   macd_fast=12, macd_slow=26, macd_signal=9,
                   rsi_window=14, stoch_window=14, bb_window=20,
                   atr_window=14, cci_window=20, adx_window=14):
    # Reset index to get Date column if it's a DatetimeIndex
    if not isinstance(df.index, pd.RangeIndex):
        df = df.reset_index()
    
    # Ensure Date column exists and is datetime
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"])
    else:
        # If no Date column, create one from index
        df["Date"] = pd.to_datetime(df.index)
    
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

    # Chart 1: Price and Moving Averages
    axs[0].plot(df["Date"], df["Close"], label="Close Price", color='#00d4ff', linewidth=2, zorder=5)
    if "MA5" in df.columns: axs[0].plot(df["Date"], df["MA5"], label=f"MA{ma_short}", color='#ffa500', linewidth=1.5, alpha=0.9)
    if "MA20" in df.columns: axs[0].plot(df["Date"], df["MA20"], label=f"MA{ma_medium}", color='#00ff88', linewidth=1.5, alpha=0.9)
    if "MA60" in df.columns: axs[0].plot(df["Date"], df["MA60"], label=f"MA{ma_long}", color='#ff4757', linewidth=1.5, alpha=0.9)
    
    if "BB_High" in df.columns and "BB_Low" in df.columns:
        axs[0].plot(df["Date"], df["BB_High"], label=f"BB Upper ({bb_window})", color='gray', linestyle='--', alpha=0.5)
        axs[0].plot(df["Date"], df["BB_Low"], label=f"BB Lower ({bb_window})", color='gray', linestyle='--', alpha=0.5)
        axs[0].fill_between(df["Date"], df["BB_Low"], df["BB_High"], alpha=0.1, color='gray')
    
    axs[0].set_ylabel('Price (USD)', fontsize=10, color=text_color, fontweight='bold')
    axs[0].legend(loc='upper left', frameon=True, fancybox=True, shadow=True, 
                  framealpha=0.9, facecolor='#1c2532', edgecolor='#2d3748')
    axs[0].yaxis.set_label_coords(-0.05, 0.5)

    # Chart 2: RSI and Stochastic
    if "RSI" in df.columns:
        axs[1].plot(df['Date'], df['RSI'], label=f'RSI({rsi_window})', color='#a78bfa', linewidth=1.8)
        axs[1].axhline(y=70, color='#ff4757', linestyle='--', linewidth=1, alpha=0.7, label='Overbought')
        axs[1].axhline(y=30, color='#00ff88', linestyle='--', linewidth=1, alpha=0.7, label='Oversold')
        axs[1].axhline(y=50, color='#ffa500', linestyle=':', linewidth=0.8, alpha=0.5)
        axs[1].fill_between(df['Date'], 70, 100, alpha=0.1, color='#ff4757')
        axs[1].fill_between(df['Date'], 0, 30, alpha=0.1, color='#00ff88')
    
    if "%K" in df.columns:
        axs[1].plot(df['Date'], df['%K'], label=f'Stoch %K({stoch_window})', color='#00d4ff', linewidth=1.5, alpha=0.8)
        
    axs[1].set_ylabel('RSI / Stoch', fontsize=9, color=text_color, fontweight='bold')
    axs[1].set_ylim(0, 100)
    axs[1].legend(loc='upper left', frameon=True, fancybox=True, shadow=True,
                  framealpha=0.9, facecolor='#1c2532', edgecolor='#2d3748', fontsize=8)
    axs[1].yaxis.set_label_coords(-0.05, 0.5)

    # Chart 3: MACD
    if "MACD" in df.columns:
        macd_colors = ['#00ff88' if x >= 0 else '#ff4757' for x in df['MACD']]
        axs[2].bar(df['Date'], df['MACD'], label=f'MACD({macd_fast},{macd_slow},{macd_signal})', color=macd_colors, alpha=0.6, width=1)
        axs[2].plot(df['Date'], df['MACD'], color='#00d4ff', linewidth=1.5, alpha=0.9)
        axs[2].axhline(y=0, color=text_color, linestyle='-', linewidth=0.8, alpha=0.3)
    
    axs[2].set_ylabel('MACD', fontsize=9, color=text_color, fontweight='bold')
    axs[2].legend(loc='upper left', frameon=True, fancybox=True, shadow=True,
                  framealpha=0.9, facecolor='#1c2532', edgecolor='#2d3748', fontsize=8)
    axs[2].yaxis.set_label_coords(-0.05, 0.5)

    # Chart 4: Bollinger Bands and VWAP
    if "Bollinger" in df.columns:
        axs[3].plot(df['Date'], df['Bollinger'], label='Bollinger MA', color='#ffa500', linewidth=1.8)
        axs[3].fill_between(df['Date'], df['Bollinger'], alpha=0.1, color='#ffa500') # Just for visual consistency if wanted, or remove
        
    if "VWAP" in df.columns:
        axs[3].plot(df['Date'], df['VWAP'], label='VWAP', color='#a78bfa', linewidth=1.8, linestyle='--')
        
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
    # Ensure Date column exists
    if "Date" not in df.columns:
        if isinstance(df.index, pd.DatetimeIndex):
            df = df.reset_index()
            df["Date"] = pd.to_datetime(df["Date"])
        else:
            # Fallback if no date info
            return "Technical summary unavailable due to missing date information."

    latest = df.iloc[-1]
    date_str = latest["Date"].date()
    close = latest["Close"]
    
    summary_parts = [f"Technical Analysis Summary for {date_str}:"]
    summary_parts.append(f"The stock closed at ${close:.2f}.")

    # Moving Averages
    if "MA5" in df.columns and "MA20" in df.columns and "MA60" in df.columns:
        ma5 = latest["MA5"]
        ma20 = latest["MA20"]
        ma60 = latest["MA60"]
        if ma5 > ma20 > ma60:
            summary_parts.append("The trend is bullish (MA5 > MA20 > MA60).")
        elif ma5 < ma20 < ma60:
            summary_parts.append("The trend is bearish (MA5 < MA20 < MA60).")
        else:
            summary_parts.append("The trend is volatile or consolidating.")

    # RSI
    if "RSI" in df.columns:
        rsi = latest["RSI"]
        if rsi > 70:
            summary_parts.append(f"RSI is overbought ({rsi:.1f}), suggesting a potential pullback.")
        elif rsi < 30:
            summary_parts.append(f"RSI is oversold ({rsi:.1f}), suggesting a potential rebound.")
        else:
            summary_parts.append(f"RSI is neutral ({rsi:.1f}).")

    # MACD
    if "MACD" in df.columns:
        macd = latest["MACD"]
        if macd > 0:
            summary_parts.append("MACD is positive, indicating bullish momentum.")
        else:
            summary_parts.append("MACD is negative, indicating bearish momentum.")

    # VWAP
    if "VWAP" in df.columns:
        vwap = latest["VWAP"]
        if close > vwap:
            summary_parts.append("Price is above VWAP, confirming bullish intraday sentiment.")
        else:
            summary_parts.append("Price is below VWAP, indicating bearish intraday sentiment.")

    # Bollinger Bands
    if "Bollinger" in df.columns and "BB_High" in df.columns and "BB_Low" in df.columns:
        bb_high = latest["BB_High"]
        bb_low = latest["BB_Low"]
        if close > bb_high:
            summary_parts.append("Price is breaking above the upper Bollinger Band (high volatility).")
        elif close < bb_low:
            summary_parts.append("Price is dropping below the lower Bollinger Band (oversold).")

    return " ".join(summary_parts)

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
