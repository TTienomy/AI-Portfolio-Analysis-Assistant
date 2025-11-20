import google.generativeai as genai
import configparser
import os

# Load Config
config = configparser.ConfigParser()
config.read("config.ini")

try:
    genai.configure(api_key=config["Gemini"]["API_KEY"])
    print("Listing available models:")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")
