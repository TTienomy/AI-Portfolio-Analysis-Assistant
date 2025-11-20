from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import analysis
import pandas as pd
import os
import shutil

# Import new tools
from tools.news_analysis import analyze_news_sentiment
from tools.pdf_analysis import analyze_pdf_page
from tools.tech_analysis import get_technical_df, plot_indicators, generate_summary, analyze_technical_chart

app = FastAPI()

# Mount static files for plots
os.makedirs("static/plots", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FilterRequest(BaseModel):
    provider: str
    threshold: float

class AnalyzeRequest(BaseModel):
    tickers: list[str]
    risk_free_rate: float = 0.02


class NewsRequest(BaseModel):
    ticker: str
    name: str

class TechRequest(BaseModel):
    ticker: str
    # Moving Average parameters
    ma_short: Optional[int] = 5
    ma_medium: Optional[int] = 20
    ma_long: Optional[int] = 60
    # MACD parameters
    macd_fast: Optional[int] = 12
    macd_slow: Optional[int] = 26
    macd_signal: Optional[int] = 9
    # RSI parameter
    rsi_window: Optional[int] = 14
    # Stochastic parameter
    stoch_window: Optional[int] = 14
    # Bollinger Bands parameter
    bb_window: Optional[int] = 20
    # ATR parameter
    atr_window: Optional[int] = 14
    # CCI parameter
    cci_window: Optional[int] = 20
    # ADX parameter
    adx_window: Optional[int] = 14
    
    # Selected Indicators (List of indicator names)
    selected_indicators: Optional[List[str]] = None

class DashboardRequest(TechRequest):
    pass

@app.get("/api/esg_data")
def get_esg_data():
    try:
        df = analysis.load_esg_data()
        return df.to_dict(orient='records')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/filter_stocks")
def filter_stocks(request: FilterRequest):
    try:
        tickers = analysis.filter_stocks(request.provider, request.threshold)
        return {"tickers": tickers}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze")
def analyze_portfolio(request: AnalyzeRequest):
    try:
        result = analysis.optimize_portfolio(request.tickers, request.risk_free_rate)
        if not result:
             raise HTTPException(status_code=400, detail="Optimization failed")
             
        return {
            "optimization": {
                "weights": result["weights"],
                "return": result["return"],
                "risk": result["risk"],
                "sharpe_ratio": result["sharpe_ratio"]
            },
            "efficient_frontier": result["efficient_frontier"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- New Endpoints ---

@app.post("/api/analyze-news")
def analyze_news(request: NewsRequest):
    try:
        result = analyze_news_sentiment(request.ticker, request.name)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    try:
        # Save temp file
        os.makedirs("data", exist_ok=True)
        temp_path = f"data/{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Read PDF (using pymupdf as in original tool)
        import fitz
        doc = fitz.open(temp_path)
        # Analyze page 4 as per original logic, or maybe first page? 
        # Original code: page = doc.load_page(4)
        # Let's keep it but maybe warn or make it dynamic later. 
        # For now, to be safe, let's try page 0 if < 5 pages, else 4.
        page_num = 4 if len(doc) > 4 else 0
        page = doc.load_page(page_num)
        text = page.get_text()
        
        result = analyze_pdf_page(text)
        
        # Cleanup
        doc.close()
        os.remove(temp_path)
        
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-stock")
def analyze_stock(request: TechRequest):
    try:
        ticker = request.ticker
        
        # Extract indicator parameters
        # Filter out None values to ensure we use function defaults
        params = {
            'ma_short': request.ma_short,
            'ma_medium': request.ma_medium,
            'ma_long': request.ma_long,
            'macd_fast': request.macd_fast,
            'macd_slow': request.macd_slow,
            'macd_signal': request.macd_signal,
            'rsi_window': request.rsi_window,
            'stoch_window': request.stoch_window,
            'bb_window': request.bb_window,
            'atr_window': request.atr_window,
            'cci_window': request.cci_window,
            'adx_window': request.adx_window,
        }
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        
        df = get_technical_df(ticker, **params)
        if df.empty:
            raise HTTPException(status_code=400, detail="No data found for ticker")
            
        image_filename = plot_indicators(df, ticker, **params)
        
        # Path for LLM (absolute or relative to script)
        # plot_indicators saves to backend/static/plots
        # We need to pass the full path to analyze_technical_chart
        base_dir = os.path.dirname(__file__)
        local_path_for_llm = os.path.join(base_dir, "static", "plots", image_filename)
        
        summary = generate_summary(df)
        chart_analysis = analyze_technical_chart(filepath=local_path_for_llm, summary=summary)
        
        full_summary = summary + "\n\n" + chart_analysis
        
        # Return relative path for frontend
        image_url = f"/static/plots/{image_filename}"
        
        # Prepare historical data for frontend chart
        # We need to convert the dataframe to a list of dicts
        # df has Date as a column now (reset_index was called in get_technical_df)
        # We need to ensure Date is string format for JSON
        
        chart_data = df.copy()
        chart_data['Date'] = chart_data['Date'].dt.strftime('%Y-%m-%d')
        
        # Select relevant columns for the chart
        # Open, High, Low, Close, Volume, MA5, MA20, MA60
        chart_data_dict = chart_data[['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'MA5', 'MA20', 'MA60']].to_dict(orient='records')

        return {
            "summary": full_summary,
            "image_url": image_url,
            "chart_data": chart_data_dict,
            "latest_price": float(df.iloc[-1]['Close']),
            "price_change": float(df.iloc[-1]['Close'] - df.iloc[-2]['Close']) if len(df) > 1 else 0,
            "price_change_percent": float((df.iloc[-1]['Close'] - df.iloc[-2]['Close']) / df.iloc[-2]['Close'] * 100) if len(df) > 1 else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Dashboard Endpoint ---
from tools.dashboard import get_stock_dashboard

@app.post("/api/dashboard")
def get_dashboard(request: DashboardRequest):
    try:
        ticker = request.ticker
        
        # Extract indicator parameters
        params = {
            'ma_short': request.ma_short,
            'ma_medium': request.ma_medium,
            'ma_long': request.ma_long,
            'macd_fast': request.macd_fast,
            'macd_slow': request.macd_slow,
            'macd_signal': request.macd_signal,
            'rsi_window': request.rsi_window,
            'stoch_window': request.stoch_window,
            'bb_window': request.bb_window,
            'atr_window': request.atr_window,
            'cci_window': request.cci_window,
            'adx_window': request.adx_window,
            'selected_indicators': request.selected_indicators
        }
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}

        result = get_stock_dashboard(ticker, **params)
        if "error" in result:
             raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Ensure static directory exists
    os.makedirs("static/plots", exist_ok=True)
    uvicorn.run(app, host="0.0.0.0", port=8000)
