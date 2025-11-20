import requests
from newspaper import Article
import google.generativeai as genai
import configparser
import os
from tools.utils import retry_gemini

# GNews API Key (Hardcoded as in original)
# NewsAPI Key
NEWS_API_KEY = "a99599d53394467e89f8cd2933ef2d9e"

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

def get_news_articles(query, count=3):
    # Use 'everything' endpoint for broader search, or 'top-headlines' for specific category
    # Sort by relevancy or publishedAt
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "apiKey": NEWS_API_KEY,
        "language": "zh", # Focus on Traditional Chinese/Taiwanese content
        "sortBy": "publishedAt",
        "pageSize": count
    }
    
    try:
        print(f"Fetching news for: {query}")
        res = requests.get(url, params=params)
        if res.status_code != 200:
            print(f"NewsAPI Error: {res.status_code} - {res.text}")
            return []
        
        articles = res.json().get("articles", [])
        print(f"Found {len(articles)} articles for {query}")
        return [article['url'] for article in articles]
    except Exception as e:
        print(f"Error fetching news: {e}")
        return []

def extract_article_text(url):
    try:
        article = Article(url)
        article.download()
        article.parse()
        return article.text
    except:
        return None

def analyze_news_sentiment(ticker, company_name):
    if not model:
        return "⚠️ Gemini API Key missing or invalid configuration."

    urls = get_news_articles(company_name)
    if not urls:
        print(f"No news found for {company_name}, trying ticker {ticker}")
        urls = get_news_articles(ticker)
        
    if not urls:
        return "⚠️ No news found (API Limit or No Results)"

    for url in urls:
        text = extract_article_text(url)
        if text and len(text) > 200:
            prompt = f"""
You are a senior financial analyst.
Please read the following news content and determine if it has potential stock price impact on '{ticker} - {company_name}'.
Please reply in the following format:
1. Whether it has impact (Yes/No)
2. Impact direction (Positive/Negative/Indeterminate)
3. Impact strength (High/Medium/Low)
4. Brief reason (about 50 words)

News content:
{text[:3000]}
"""
            try:
                # Wrap generation in a helper to apply decorator easily or just call with retry logic if we refactored. 
                # Since we didn't decorate the main function (it returns strings on error), let's do a local retry or helper.
                # Actually, let's define a helper function for generation.
                
                @retry_gemini
                def generate(p):
                    return model.generate_content(p)

                response = generate(prompt)
                return f"🌐 Source: {url}\n\n🧠 Analysis:\n{response.text}"
            except Exception as e:
                return f"⚠️ Analysis failed: {str(e)}"
                
    return "⚠️ Content too short or invalid"
