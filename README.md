# Investment Dashboard

A full-stack web application for ESG (Environmental, Social, Governance) investment analysis and other important analysis with advanced technical indicators, AI-powered insights, and portfolio optimization.

## Features

### 📊 Technical Analysis
- **Interactive Charts**: Real-time stock price visualization with multiple timeframes (1M, 3M, 6M, YTD, 1Y, All)
- **Enhanced Technical Indicators**:
  - Moving Averages (MA5, MA20, MA60) - Customizable periods
  - Bollinger Bands - Adjustable window size
  - RSI (Relative Strength Index) - Configurable period
  - MACD (Moving Average Convergence Divergence) - Custom fast/slow/signal periods
  - Stochastic Oscillator (%K, %D) - Adjustable window
  - ADX (Average Directional Index) - Trend strength indicator
  - CCI (Commodity Channel Index) - Momentum indicator
  - ATR (Average True Range) - Volatility measure
  - OBV (On-Balance Volume) - Volume trend analysis
  - **Ichimoku Cloud** - Complete cloud analysis with conversion/base lines
  - **Williams %R** - Momentum oscillator for overbought/oversold
  - **MFI (Money Flow Index)** - Volume-weighted RSI
  - **VWAP (Volume Weighted Average Price)** - Intraday benchmark
- **Signal Light System**: Visual trading signal with weighted scoring
  - Color-coded recommendations (Strong Buy/Buy/Hold/Sell/Strong Sell)
  - Normalized score from -1 to 1 based on multiple indicators
  - Detailed breakdown of bullish/bearish signals per indicator
  - Weighted analysis: MA (3), MACD (3), RSI (2), Bollinger (2), Ichimoku (2), Stochastic (1), OBV (1), Williams %R (1)
- **Customizable Parameters**: 
  - Quick presets (Default, Short-term Trading, Long-term Investing)
  - Fine-tune individual indicator periods
  - Real-time parameter adjustment
- **Professional Chart Visualization**: 4-panel layout with dark theme
  - Price action with MA and Bollinger Bands
  - RSI and Stochastic oscillators
  - MACD histogram and signal line
  - Bollinger MA and VWAP comparison

### 🌱 ESG Analysis
- **ESG Filtering**: Filter stocks by ESG providers (MSCI, Sustainalytics, Refinitiv)
- **ESG Scores**: View Environmental, Social, and Governance ratings
- **Manual Selection**: Add custom tickers for analysis
- **Profile Toggle**: Show/hide ESG profile information

### 💼 Portfolio Optimization
- **Efficient Frontier**: Visualize optimal portfolio allocations
- **Risk-Return Analysis**: Calculate Sharpe ratios and expected returns
- **Custom Risk-Free Rate**: Manually adjust risk-free rate for calculations
- **Watchlist Management**: Save and manage your stock watchlist

### 📰 News Sentiment Analysis
- **Real-time News**: Fetch latest news articles using NewsAPI.org
- **Sentiment Analysis**: AI-powered sentiment scoring
- **Multi-language Support**: Chinese (Traditional) text processing with Jieba

### 🤖 AI Investment Thesis
- **Gemini AI Integration**: Comprehensive investment analysis using Google's Gemini API
- **Multi-factor Synthesis**: Combines technical, fundamental, ESG, and sentiment data
- **Visual Chart Analysis**: AI analyzes technical chart patterns

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Data Sources**: 
  - yfinance (Stock data)
  - NewsAPI.org (News articles)
- **AI/ML**:
  - Google Gemini API (Investment analysis)
  - Jieba (Chinese text segmentation)
- **Technical Analysis**: TA-Lib, pandas
- **Visualization**: matplotlib, seaborn

### Frontend
- **Framework**: Next.js 16 (React)
- **Charting**: Recharts
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Installation

### Prerequisites
- Python 3.13+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `config.ini` from template:
```bash
cp config.ini.template config.ini
```

5. Configure your API keys in `config.ini`:
```ini
[Gemini]
API_KEY = your_gemini_api_key_here

[NewsAPI]
API_KEY = your_newsapi_key_here
```

> [!IMPORTANT]
> **API Keys Required:**
> - **Gemini API**: Get your key from [Google AI Studio](https://makersuite.google.com/app/apikey)
> - **NewsAPI**: Get your key from [NewsAPI.org](https://newsapi.org/register)
> 
> The `config.ini` file is gitignored and will not be committed to version control.

6. Start the backend server:
```bash
python main.py
```

The backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

### ESG Portfolio Analysis
1. Navigate to the "ESG Portfolio" tab
2. Select ESG provider and set minimum threshold
3. Click "Filter Stocks" to see eligible stocks
4. Or manually add tickers in the "Manual Selection" section
5. Click "Analyze Portfolio" to view optimization results

### Stock Dashboard
1. Enter a stock ticker (e.g., AAPL, 2330.TW)
2. View comprehensive analysis including:
   - Real-time price and changes
   - Interactive technical charts
   - Trading signals
   - ESG profile
   - News sentiment
   - AI investment thesis

### Interactive Chart Controls
- **Time Range**: Select from 1M, 3M, 6M, YTD, 1Y, or All
- **Main Indicators**: Toggle MA5, MA20, MA60, Bollinger Bands
- **Sub Indicators**: Switch between Volume, MACD, RSI, KD

## API Endpoints

### Stock Analysis
- `GET /api/dashboard/{ticker}` - Get comprehensive stock dashboard data
- `GET /api/analyze-stock?ticker={ticker}` - Get technical analysis with chart

### ESG & Portfolio
- `GET /api/esg_data` - Get all ESG data
- `POST /api/filter-stocks` - Filter stocks by ESG criteria
- `POST /api/analyze-portfolio` - Optimize portfolio allocation

### News Analysis
- `POST /api/analyze-news` - Analyze news sentiment for tickers

### PDF Analysis
- `POST /api/analyze-pdf` - Upload and analyze financial PDFs

## Project Structure

```
SideProject/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── analysis.py             # Portfolio optimization
│   ├── config.ini              # API keys configuration (gitignored)
│   ├── config.ini.template     # Configuration template
│   ├── test_custom_params.py   # Testing utility for custom indicators
│   ├── requirements.txt        # Python dependencies
│   └── tools/
│       ├── dashboard.py        # Dashboard data aggregation
│       ├── tech_analysis.py    # Technical indicators & signals
│       ├── news_analysis.py    # News sentiment analysis
│       └── pdf_analysis.py     # PDF document analysis
├── frontend/
│   ├── app/
│   │   ├── page.js             # Home page (ESG Portfolio)
│   │   └── dashboard/[ticker]/ # Stock dashboard page
│   ├── components/
│   │   ├── InteractiveChart.js # Advanced chart component
│   │   ├── TechSignals.js      # Trading signals display
│   │   ├── SignalLight.js      # Signal Light component (NEW)
│   │   ├── TechAnalysis.js     # Technical analysis with custom params
│   │   ├── ESGFilter.js        # ESG filtering UI
│   │   └── PortfolioAnalysis.js # Portfolio optimization UI
│   └── context/
│       └── PortfolioContext.js # Global state management
└── README.md
```

## Configuration

### Backend Configuration (`config.ini`)
```ini
[Gemini]
API_KEY = your_gemini_api_key_here

[NewsAPI]
API_KEY = your_newsapi_key_here
```

> [!WARNING]
> Never commit `config.ini` to version control. Use `config.ini.template` as a reference.

### Environment Variables
- Backend runs on port `8000`
- Frontend runs on port `3000`
- CORS enabled for `http://localhost:3000`

## Data Sources

- **Stock Data**: Yahoo Finance (via yfinance)
- **ESG Data**: `esg_data.csv` (MSCI, Sustainalytics, Refinitiv scores)
- **News**: NewsAPI.org
- **AI Analysis**: Google Gemini API

## Features in Detail

### Signal Light System
The Signal Light provides intelligent trading recommendations using a weighted scoring system:

**Weighted Indicators:**
- **High Weight (3)**: Moving Average Crossovers, MACD - Primary trend indicators
- **Medium Weight (2)**: RSI, Bollinger Bands, Ichimoku Cloud - Key momentum and volatility signals
- **Low Weight (1)**: Stochastic, OBV, Williams %R - Supporting indicators

**Scoring Logic:**
- Each indicator contributes to a normalized score from -1 (strongly bearish) to +1 (strongly bullish)
- **Strong Buy** (≥ 0.5): Multiple bullish signals across high-weight indicators
- **Buy** (0.2 to 0.5): Moderate bullish sentiment
- **Hold** (-0.2 to 0.2): Neutral or mixed signals
- **Sell** (-0.5 to -0.2): Moderate bearish sentiment  
- **Strong Sell** (≤ -0.5): Multiple bearish signals across high-weight indicators

**Signal Details:**
- Visual breakdown of each indicator's contribution
- Color-coded bullish (green) / bearish (red) signals
- Specific messages explaining each indicator's current state

### Technical Signals Details
The system analyzes the following technical patterns:
- **MA Crossovers**: Golden Cross (bullish) / Death Cross (bearish) between MA20 and MA60
- **RSI Levels**: Overbought (>70) / Oversold (<30) / Neutral (30-70)
- **MACD**: Bullish/Bearish crossovers between MACD line and Signal line
- **Bollinger Bands**: Price position relative to upper/lower bands
- **Ichimoku Cloud**: Price above cloud (bullish) / below cloud (bearish) / inside cloud (neutral)
- **Stochastic**: %K and %D crossovers for momentum shifts
- **Williams %R**: Overbought (>-20) / Oversold (<-80)
- **OBV**: Volume trend analysis (5-day comparison)
- **ADX**: Trend strength (>25 = strong trend)
- **CCI**: Momentum (>100 = overbought, <-100 = oversold)

### Portfolio Optimization
Uses Modern Portfolio Theory to:
- Maximize Sharpe ratio
- Calculate efficient frontier
- Suggest optimal asset allocation
- Compute expected returns and volatility

## License

This project is for educational and research purposes.

## Contributing

This is a personal side project. Feel free to fork and adapt for your own use.

## Support

For issues or questions, please refer to the code documentation or create an issue in the repository.
