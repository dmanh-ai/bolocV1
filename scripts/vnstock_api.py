#!/usr/bin/env python3
"""
VN Sniper - Python API Script
Exposes vnstock data as JSON for Next.js API routes
"""

import sys
import json
import argparse
from datetime import datetime, timedelta
from vnstock import Vnstock
import pandas as pd

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def df_to_json(df):
    """Convert DataFrame to JSON serializable format"""
    if df is None or df.empty:
        return []
    
    # Flatten multi-level columns if present
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ['_'.join(str(col) if col else '' for col in col).strip('_') for col in df.columns.values]
    
    # Clean column names
    df.columns = [str(col).replace('(', '').replace(')', '').replace(' ', '_') for col in df.columns]
    
    # Convert to dict and handle NaN
    result = df.fillna('').to_dict(orient='records')
    return result

def get_all_stocks():
    """Get list of all stocks"""
    try:
        stock = Vnstock().stock(symbol='VNM', source='VCI')
        df = stock.listing.all_symbols()
        return {"success": True, "data": df_to_json(df), "total": len(df)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_stock_history(symbol, days=365):
    """Get stock price history"""
    try:
        stock = Vnstock().stock(symbol=symbol.upper(), source='VCI')
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        df = stock.quote.history(
            start=start_date.strftime('%Y-%m-%d'),
            end=end_date.strftime('%Y-%m-%d')
        )
        return {"success": True, "data": df_to_json(df), "symbol": symbol.upper()}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_stock_finance(symbol, period='year'):
    """Get stock financial data"""
    try:
        stock = Vnstock().stock(symbol=symbol.upper(), source='VCI')
        result = {"symbol": symbol.upper()}
        
        # Get financial ratios
        try:
            ratio = stock.finance.ratio(period=period)
            if ratio is not None and not ratio.empty:
                result["ratios"] = df_to_json(ratio)
        except Exception as e:
            result["ratios_error"] = str(e)
            
        # Get balance sheet
        try:
            balance = stock.finance.balance_sheet(period=period)
            if balance is not None and not balance.empty:
                result["balance_sheet"] = df_to_json(balance)
        except Exception as e:
            result["balance_sheet_error"] = str(e)
            
        # Get income statement
        try:
            income = stock.finance.income_statement(period=period)
            if income is not None and not income.empty:
                result["income_statement"] = df_to_json(income)
        except Exception as e:
            result["income_statement_error"] = str(e)
            
        # Get cash flow
        try:
            cashflow = stock.finance.cash_flow(period=period)
            if cashflow is not None and not cashflow.empty:
                result["cash_flow"] = df_to_json(cashflow)
        except Exception as e:
            result["cash_flow_error"] = str(e)
            
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_stock_overview(symbol):
    """Get stock company overview"""
    try:
        stock = Vnstock().stock(symbol=symbol.upper(), source='VCI')
        result = {"symbol": symbol.upper()}
        
        # Get company overview
        try:
            overview = stock.company.overview()
            if overview is not None and not overview.empty:
                result["overview"] = df_to_json(overview)
        except:
            pass
            
        # Get trading stats
        try:
            trading = stock.company.trading_stats()
            if trading is not None and not trading.empty:
                result["trading_stats"] = df_to_json(trading)
        except:
            pass
            
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_screener_data(limit=100):
    """Get screening data for multiple stocks"""
    try:
        stock = Vnstock().stock(symbol='VNM', source='VCI')
        all_stocks_df = stock.listing.all_symbols()
        
        if all_stocks_df.empty:
            return {"success": False, "error": "No stocks found"}
        
        symbols = all_stocks_df['symbol'].tolist()
        result = []
        
        # Limit to avoid rate limiting
        symbols_to_process = symbols[:min(limit, len(symbols))]
        
        for symbol in symbols_to_process:
            try:
                s = Vnstock().stock(symbol=symbol, source='VCI')
                
                # Get name
                name = ""
                name_rows = all_stocks_df[all_stocks_df['symbol'] == symbol]['organ_name']
                if len(name_rows) > 0:
                    name = name_rows.values[0]
                
                stock_data = {
                    "symbol": symbol,
                    "name": name,
                }
                
                # Get latest financial ratios
                try:
                    ratio = s.finance.ratio(period='year')
                    if ratio is not None and not ratio.empty and len(ratio) > 0:
                        latest = ratio.iloc[-1].to_dict()
                        
                        for key, value in latest.items():
                            if isinstance(key, tuple):
                                key = '_'.join(str(k) if k else '' for k in key)
                            key = str(key).replace('(', '').replace(')', '').replace(' ', '_')
                            if pd.notna(value):
                                try:
                                    stock_data[key] = float(value) if isinstance(value, (int, float)) else value
                                except:
                                    stock_data[key] = str(value)
                except:
                    pass
                    
                result.append(stock_data)
                    
            except Exception as e:
                continue
        
        return {"success": True, "data": result, "total": len(result)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_industries():
    """Get list of industries"""
    try:
        stock = Vnstock().stock(symbol='VNM', source='VCI')
        df = stock.listing.industries_icb()
        return {"success": True, "data": df_to_json(df)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_intraday(symbol):
    """Get intraday trading data"""
    try:
        stock = Vnstock().stock(symbol=symbol.upper(), source='VCI')
        df = stock.quote.intraday()
        return {"success": True, "data": df_to_json(df), "symbol": symbol.upper()}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description='VN Sniper API')
    parser.add_argument('action', choices=[
        'stocks', 'history', 'finance', 'overview', 'screener', 
        'industries', 'intraday'
    ], help='Action to perform')
    parser.add_argument('--symbol', type=str, help='Stock symbol')
    parser.add_argument('--days', type=int, default=365, help='Number of days for history')
    parser.add_argument('--period', type=str, default='year', help='Period for finance data')
    parser.add_argument('--limit', type=int, default=100, help='Limit for screener')
    
    args = parser.parse_args()
    
    result = {"success": False, "error": "Unknown action"}
    
    if args.action == 'stocks':
        result = get_all_stocks()
    elif args.action == 'history':
        if args.symbol:
            result = get_stock_history(args.symbol, args.days)
        else:
            result = {"success": False, "error": "Symbol required"}
    elif args.action == 'finance':
        if args.symbol:
            result = get_stock_finance(args.symbol, args.period)
        else:
            result = {"success": False, "error": "Symbol required"}
    elif args.action == 'overview':
        if args.symbol:
            result = get_stock_overview(args.symbol)
        else:
            result = {"success": False, "error": "Symbol required"}
    elif args.action == 'screener':
        result = get_screener_data(args.limit)
    elif args.action == 'industries':
        result = get_industries()
    elif args.action == 'intraday':
        if args.symbol:
            result = get_intraday(args.symbol)
        else:
            result = {"success": False, "error": "Symbol required"}
    
    print(json.dumps(result, default=json_serial, ensure_ascii=False))

if __name__ == "__main__":
    main()
