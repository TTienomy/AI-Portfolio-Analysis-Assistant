#!/usr/bin/env python3
"""
Quick test script to verify custom technical indicator parameters work correctly.
"""
import sys
sys.path.insert(0, '/Users/tomytien/Downloads/SideProject/backend')

from tools.tech_analysis import get_technical_df, plot_indicators

# Test 1: Default parameters
print("Test 1: Testing with default parameters...")
try:
    df = get_technical_df("AAPL")
    print(f"✓ Default parameters work. Data shape: {df.shape}")
    print(f"  Columns: {list(df.columns)}")
except Exception as e:
    print(f"✗ Default parameters failed: {e}")

# Test 2: Custom parameters
print("\nTest 2: Testing with custom parameters...")
try:
    df_custom = get_technical_df(
        "AAPL",
        ma_short=10,
        ma_medium=30,
        ma_long=90,
        macd_fast=8,
        macd_slow=17,
        rsi_window=10
    )
    print(f"✓ Custom parameters work. Data shape: {df_custom.shape}")
    
    # Verify the indicators were calculated
    latest = df_custom.iloc[-1]
    print(f"  Latest RSI: {latest['RSI']:.2f}")
    print(f"  Latest MACD: {latest['MACD']:.2f}")
except Exception as e:
    print(f"✗ Custom parameters failed: {e}")

# Test 3: Chart generation with custom parameters
print("\nTest 3: Testing chart generation with custom parameters...")
try:
    filename = plot_indicators(
        df_custom, 
        "AAPL",
        ma_short=10,
        ma_medium=30,
        ma_long=90,
        macd_fast=8,
        macd_slow=17,
        rsi_window=10
    )
    print(f"✓ Chart generated successfully: {filename}")
except Exception as e:
    print(f"✗ Chart generation failed: {e}")

print("\n" + "="*50)
print("All tests completed!")
