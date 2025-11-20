import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import analysis

tickers = ["UNH", "MSFT", "CRM", "V", "IBM", "NVDA", "MRK", "WMT", "CSCO"]
print(f"Testing analysis for tickers: {tickers}")

try:
    print("Fetching data and optimizing...")
    result = analysis.optimize_portfolio(tickers)
    if result:
        print("Optimization successful!")
        print(result)
    else:
        print("Optimization returned None (empty data?)")

    print("Calculating efficient frontier...")
    frontier = analysis.calculate_efficient_frontier(tickers)
    if frontier:
        print("Frontier calculation successful!")
    else:
        print("Frontier returned empty list")

except Exception as e:
    print(f"Error occurred: {e}")
    import traceback
    traceback.print_exc()
