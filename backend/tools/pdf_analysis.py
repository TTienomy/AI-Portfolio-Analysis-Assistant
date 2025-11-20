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

def analyze_pdf_page(text):
    if not model:
        return "⚠️ Gemini API Key missing."

    prompt = f"""
You are a financial analyst.
Please read the following PDF page text and summarize key revenue trends, financial signals, or potential risks (in list format):
{text}
"""
    try:
        @retry_gemini
        def generate(p):
            return model.generate_content(p)
            
        response = generate(prompt)
        return response.text
    except Exception as e:
        return f"⚠️ Analysis failed: {str(e)}"
