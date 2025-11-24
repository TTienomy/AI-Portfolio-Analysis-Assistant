"""
AI Strategy Generator using Gemini API

This module converts natural language trading strategy descriptions into
executable Python code for backtesting.
"""

import google.generativeai as genai
import configparser
import os
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


AVAILABLE_INDICATORS = """
Available Technical Indicators:
- MA5, MA20, MA60: Moving Averages (5, 20, 60 periods)
- RSI: Relative Strength Index (14 periods)
- MACD, MACD_Signal, MACD_Hist: MACD indicator
- BB_Upper, BB_Middle, BB_Lower: Bollinger Bands (20 periods, 2 std dev)
- Close, Open, High, Low, Volume: Price and volume data
"""


STRATEGY_TEMPLATE = """
You are an expert quantitative trading strategy developer. Your task is to convert a natural language trading strategy description into executable Python code.

IMPORTANT RULES:
1. You MUST respond in valid JSON format with the following structure:
   {{
     "success": true/false,
     "code": "python code here" or null,
     "error": "error message" or null,
     "explanation": "brief explanation of the strategy"
   }}

2. If the strategy is FEASIBLE with available indicators, set success=true and provide the code.
3. If the strategy is NOT FEASIBLE (requires unavailable indicators/data), set success=false and explain why in the error field.
4. If the user's prompt is TOO VAGUE or UNCLEAR, set success=false and ask for clarification in the error field.
5. If the user provides CODE from another library (e.g., backtesting.py), CONVERT IT to the format required below. Extract the logic (entry/exit conditions, stop loss, take profit) and rewrite it using the `Strategy` class template.

{available_indicators}

STRATEGY CODE REQUIREMENTS:
- Must define a class named "Strategy"
- Must have __init__(self, data) method that stores self.data = data
- OPTIONAL: Define self.stop_loss and self.take_profit in __init__ (e.g., 0.02 for 2%)
- Must have generate_signals(self) method that returns a pandas Series
- Signals: 1 = BUY, -1 = SELL, 0 = HOLD
- Use self.data to access price and indicator data
- Use pd.Series for creating signals
- Use shift(1) to avoid look-ahead bias
- Only use the available indicators listed above

EXAMPLE VALID STRATEGY:
```python
class Strategy:
    def __init__(self, data):
        self.data = data
    
    def generate_signals(self):
        signals = pd.Series(0, index=self.data.index)
        
        # Buy when RSI < 30 (oversold)
        buy_condition = (self.data['RSI'] < 30) & (self.data['RSI'].shift(1) >= 30)
        signals[buy_condition] = 1
        
        # Sell when RSI > 70 (overbought)
        sell_condition = (self.data['RSI'] > 70) & (self.data['RSI'].shift(1) <= 70)
        signals[sell_condition] = -1
        
        return signals
```

USER'S STRATEGY DESCRIPTION:
{user_prompt}

Please analyze the strategy and respond in JSON format as specified above.
"""


def generate_strategy_from_prompt(prompt: str) -> dict:
    """
    Generate trading strategy code from natural language prompt.
    
    Args:
        prompt (str): User's natural language strategy description
        
    Returns:
        dict: {
            'success': bool,
            'code': str or None,
            'error': str or None,
            'explanation': str
        }
    """
    if not model:
        return {
            'success': False,
            'code': None,
            'error': '⚠️ Gemini API 未配置。請在 config.ini 中設定 API 金鑰。',
            'explanation': None
        }
    
    if not prompt or len(prompt.strip()) < 10:
        return {
            'success': False,
            'code': None,
            'error': '請提供更詳細的策略描述（至少 10 個字元）',
            'explanation': None
        }
    
    try:
        # Format the prompt with available indicators
        formatted_prompt = STRATEGY_TEMPLATE.format(
            available_indicators=AVAILABLE_INDICATORS,
            user_prompt=prompt
        )
        
        # Generate strategy using Gemini
        @retry_gemini
        def generate(p):
            return model.generate_content(
                p,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,  # Lower temperature for more consistent code generation
                    response_mime_type="application/json"
                )
            )
        
        response = generate(formatted_prompt)
        
        # Parse JSON response
        import json
        try:
            result = json.loads(response.text)
        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract code manually
            return {
                'success': False,
                'code': None,
                'error': 'AI 回應格式錯誤，請重試或換個方式描述策略',
                'explanation': None
            }
        
        # Validate the response structure
        if not isinstance(result, dict):
            return {
                'success': False,
                'code': None,
                'error': 'AI 回應格式不正確',
                'explanation': None
            }
        
        # If strategy generation failed, return the error
        if not result.get('success', False):
            return {
                'success': False,
                'code': None,
                'error': result.get('error', '無法生成策略，請提供更明確的描述'),
                'explanation': result.get('explanation')
            }
        
        # Validate generated code
        code = result.get('code', '')
        if not code or 'class Strategy' not in code:
            return {
                'success': False,
                'code': None,
                'error': '生成的程式碼不完整，請重試',
                'explanation': result.get('explanation')
            }
            
        # Extract ticker from the original prompt (user's code)
        extracted_ticker = extract_ticker_from_text(prompt)
        
        return {
            'success': True,
            'code': code,
            'ticker': extracted_ticker,
            'error': None,
            'explanation': result.get('explanation', '策略已成功生成')
        }
        
    except Exception as e:
        return {
            'success': False,
            'code': None,
            'error': f'生成策略時發生錯誤: {str(e)}',
            'explanation': None
        }

def extract_ticker_from_text(text: str) -> str:
    """Extract stock ticker from text using regex patterns."""
    import re
    
    # Common patterns for Taiwan stock tickers in code
    patterns = [
        r"data/(\d{4})_ohlc\.csv",      # pd.read_csv('data/2330_ohlc.csv')
        r"ticker\s*=\s*['\"](\d{4})['\"]", # ticker = '2330'
        r"symbol\s*=\s*['\"](\d{4})['\"]", # symbol = '2330'
        r"stock_id\s*=\s*['\"](\d{4})['\"]", # stock_id = '2330'
        r"(\d{4})\.TW",                 # 2330.TW
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1) + ".TW"
            
    return None
