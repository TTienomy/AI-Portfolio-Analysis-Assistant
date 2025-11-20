import google.generativeai as genai
import configparser
import os
import pandas as pd
import yfinance as yf
from tools.tech_analysis import get_technical_df, generate_summary, plot_indicators, calculate_signals
from tools.news_analysis import analyze_news_sentiment
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

def get_esg_score(ticker):
    try:
        # Load ESG Data (Assuming it's in the parent directory or same as analysis.py)
        # We need to find where esg_data.csv is. Based on previous file lists, it's in backend/esg_data.csv
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'esg_data.csv')
        df = pd.read_csv(csv_path)
        
        # Filter for ticker
        # Assuming column 'Code' has tickers like 'AAPL' or '2330.TW'
        row = df[df['Code'] == ticker]
        if not row.empty:
            return row.iloc[0].to_dict()
        return None
    except Exception as e:
        print(f"Error fetching ESG: {e}")
        return None

def get_news_analysis(ticker):
    try:
        # Try to get company name from yfinance
        stock = yf.Ticker(ticker)
        name = stock.info.get('longName', ticker)
        
        # Run analysis
        return analyze_news_sentiment(ticker, name)
    except Exception as e:
        return f"News analysis failed: {str(e)}"

def get_stock_dashboard(ticker, ma_short=5, ma_medium=20, ma_long=60,
                        macd_fast=12, macd_slow=26, macd_signal=9,
                        rsi_window=14, stoch_window=14, bb_window=20,
                        atr_window=14, cci_window=20, adx_window=14,
                        selected_indicators=None):
    if not model:
        return {"error": "Gemini API Key missing"}

    # 1. Technical Data
    try:
        # Pass custom parameters
        df = get_technical_df(ticker, 
                              ma_short=ma_short, ma_medium=ma_medium, ma_long=ma_long,
                              macd_fast=macd_fast, macd_slow=macd_slow, macd_signal=macd_signal,
                              rsi_window=rsi_window, stoch_window=stoch_window, bb_window=bb_window,
                              atr_window=atr_window, cci_window=cci_window, adx_window=adx_window,
                              selected_indicators=selected_indicators)
                              
        if df.empty:
            return {"error": "No market data found"}
        
        # Generate Chart with custom parameters
        image_filename = plot_indicators(df, ticker,
                                         ma_short=ma_short, ma_medium=ma_medium, ma_long=ma_long,
                                         macd_fast=macd_fast, macd_slow=macd_slow, macd_signal=macd_signal,
                                         rsi_window=rsi_window, stoch_window=stoch_window, bb_window=bb_window,
                                         atr_window=atr_window, cci_window=cci_window, adx_window=adx_window)
        image_url = f"/static/plots/{image_filename}"
        
        # Tech Summary
        tech_summary = generate_summary(df)
    except Exception as e:
        return {"error": f"Technical analysis failed: {str(e)}"}

    # 2. News Data
    news_analysis = get_news_analysis(ticker)

    # 3. ESG Data
    esg_data = get_esg_score(ticker)
    esg_text = f"ESG Data: {esg_data}" if esg_data else "ESG Data: Not available for this asset."

    # 4. Master Synthesis
    prompt = f"""
You are a Chief Investment Officer. Analyze the following data for **{ticker}** and provide a comprehensive investment thesis.

### 1. Technical Analysis
{tech_summary}

### 2. Recent News Context
{news_analysis}

---
**Your Task:**
1.  Executive Summary: One sentence recommendation (Buy/Hold/Sell) with a confidence level.
2.  Key Drivers: Bullet points explaining the main factors (Technical, Fundamental/News, ESG) driving your decision.
3.  Risk Assessment: What could go wrong?
4.  Conclusion: Final verdict.

Keep it professional, concise, and actionable and do not include any formatting.
"""
    
    try:
        @retry_gemini
        def generate(p):
            return model.generate_content(p)
            
        response = generate(prompt)
        synthesis = response.text
    except Exception as e:
        synthesis = f"AI Synthesis failed: {str(e)}"

    # Prepare historical data for frontend chart
    chart_data = df.copy()
    
    # Ensure Date column exists
    if "Date" not in chart_data.columns:
        if isinstance(chart_data.index, pd.DatetimeIndex):
            chart_data = chart_data.reset_index()
            # If the index name was not 'Date', rename it
            if "Date" not in chart_data.columns:
                # Try to find the date column (it might be named 'index' or 'Date' or something else)
                # Usually reset_index() on DatetimeIndex named 'Date' creates 'Date' column
                # If it was unnamed, it might be 'index'
                if 'index' in chart_data.columns:
                    chart_data = chart_data.rename(columns={'index': 'Date'})
                
    # Now ensure we have a Date column to format
    if 'Date' in chart_data.columns:
        chart_data['Date'] = pd.to_datetime(chart_data['Date']).dt.strftime('%Y-%m-%d')
    else:
        # Fallback if something is really weird
        chart_data['Date'] = [d.strftime('%Y-%m-%d') for d in chart_data.index]
    # Include all calculated indicators
    chart_data_dict = chart_data.to_dict(orient='records')

    # Calculate Signals
    signals = calculate_signals(df)

    return {
        "ticker": ticker,
        "image_url": image_url,
        "chart_data": chart_data_dict,
        "latest_price": float(df.iloc[-1]['Close']),
        "price_change": float(df.iloc[-1]['Close'] - df.iloc[-2]['Close']) if len(df) > 1 else 0,
        "price_change_percent": float((df.iloc[-1]['Close'] - df.iloc[-2]['Close']) / df.iloc[-2]['Close'] * 100) if len(df) > 1 else 0,
        "signals": signals,
        "tech_summary": tech_summary,
        "esg_data": esg_data,
        "news_analysis": news_analysis,
        "synthesis": synthesis
    }
