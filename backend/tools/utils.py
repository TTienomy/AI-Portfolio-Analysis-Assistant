import time
import functools
from google.api_core import exceptions

def retry_gemini(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        retries = 3
        delay = 2
        for i in range(retries):
            try:
                return func(*args, **kwargs)
            except exceptions.ResourceExhausted:
                if i == retries - 1:
                    raise
                print(f"⚠️ Quota exceeded, retrying in {delay}s...")
                time.sleep(delay)
                delay *= 2
            except Exception as e:
                raise e
    return wrapper
