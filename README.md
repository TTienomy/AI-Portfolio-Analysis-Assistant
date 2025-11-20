# ESG Investment Dashboard

A full-stack web application for ESG (Environmental, Social, Governance) investment analysis with advanced technical indicators, AI-powered insights, and portfolio optimization.

## Features

### 📊 Technical Analysis
- **Interactive Charts**: Real-time stock price visualization with multiple timeframes (1M, 3M, 6M, YTD, 1Y, All)
- **Technical Indicators**:
  - Moving Averages (MA5, MA20, MA60)
  - Bollinger Bands
  - RSI (Relative Strength Index)
  - MACD (Moving Average Convergence Divergence)
  - ADX (Average Directional Index)
  - CCI (Commodity Channel Index)
  - ATR (Average True Range)
  - OBV (On-Balance Volume)
- **Trading Signals**: AI-generated Buy/Sell/Hold recommendations based on multiple indicators
- **Sub-Charts**: Toggle between Volume, MACD, RSI, and KD oscillators

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

4. Configure API keys in `config.ini`:
```ini
[API_KEYS]
gemini_api_key = your_gemini_api_key_here
news_api_key = your_newsapi_key_here
```

5. Start the backend server:
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
│   ├── config.ini              # API keys configuration
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
│   │   ├── ESGFilter.js        # ESG filtering UI
│   │   └── PortfolioAnalysis.js # Portfolio optimization UI
│   └── context/
│       └── PortfolioContext.js # Global state management
└── README.md
```

## Configuration

### Backend Configuration (`config.ini`)
```ini
[API_KEYS]
gemini_api_key = your_gemini_api_key_here
news_api_key = your_newsapi_key_here
```

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

### Technical Signals
The system generates trading signals based on:
- **MA Crossovers**: Price vs MA20
- **RSI Levels**: Overbought (>70) / Oversold (<30)
- **MACD**: Bullish/Bearish crossovers
- **Bollinger Bands**: Price position relative to bands
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
