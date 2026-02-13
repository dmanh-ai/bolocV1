#!/usr/bin/env python3
"""
VN Sniper - Stock API Script
Được gọi từ Next.js API route để lấy dữ liệu từ vnstock_data
Cập nhật: Sử dụng vnstock_data (Gold tier)
"""

import sys
import json
import pandas as pd
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Import từ vnstock_data (Gold tier)
from vnstock_data import Listing, Quote, Finance, Company, Trading, Market, TopStock

def df_to_json(df: pd.DataFrame) -> dict:
    """Convert DataFrame to JSON"""
    if df is None or df.empty:
        return {"data": [], "count": 0}
    
    # Xử lý MultiIndex columns
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ['_'.join(col).strip() for col in df.columns.values]
    
    # Reset index nếu là DatetimeIndex
    if isinstance(df.index, pd.DatetimeIndex):
        df = df.reset_index()
    
    # Xử lý NaN values và datetime
    df = df.fillna('')
    df = df.astype(str)
    
    return {
        "data": df.to_dict(orient='records'),
        "count": len(df),
        "columns": list(df.columns)
    }

def get_all_stocks():
    """Lấy danh sách tất cả cổ phiếu"""
    listing = Listing(source="vci")
    stocks = listing.all_symbols()
    return df_to_json(stocks)

def get_stocks_by_exchange(exchange: str):
    """Lấy danh sách cổ phiếu theo sàn"""
    listing = Listing(source="vci")
    stocks = listing.symbols_by_exchange(exchange=exchange)
    return df_to_json(stocks)

def get_industries():
    """Lấy danh sách ngành ICB"""
    listing = Listing(source="vci")
    industries = listing.industries_icb()
    return df_to_json(industries)

def get_price_history(symbol: str, start: str = None, end: str = None, interval: str = "1D"):
    """Lấy lịch sử giá cổ phiếu"""
    if not start:
        start = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    if not end:
        end = datetime.now().strftime("%Y-%m-%d")
    
    quote = Quote(source="vci", symbol=symbol.upper())
    history = quote.history(start=start, end=end, interval=interval)
    return df_to_json(history)

def get_intraday(symbol: str):
    """Lấy dữ liệu giao dịch trong ngày"""
    quote = Quote(source="vci", symbol=symbol.upper())
    intraday = quote.intraday()
    return df_to_json(intraday)

def get_ratios(symbol: str):
    """Lấy các chỉ số tài chính quan trọng"""
    finance = Finance(source="vci", symbol=symbol.upper())
    ratios = finance.ratio()
    
    # Flatten MultiIndex columns
    if isinstance(ratios.columns, pd.MultiIndex):
        ratios.columns = ['_'.join(col).strip() for col in ratios.columns.values]
    
    # Reset index
    ratios = ratios.reset_index()
    
    # Lấy dữ liệu mới nhất
    latest = ratios.iloc[0].to_dict() if len(ratios) > 0 else {}
    
    # Trích xuất các chỉ số quan trọng
    key_metrics = {"symbol": symbol.upper()}
    for col in ratios.columns:
        val = latest.get(col)
        if val is not None and val != '':
            try:
                val = float(val)
            except:
                pass
        
        if 'P/E' in col:
            key_metrics['pe'] = val
        elif 'P/B' in col:
            key_metrics['pb'] = val
        elif 'ROE' in col and '%' in col:
            key_metrics['roe'] = val
        elif 'ROA' in col and '%' in col:
            key_metrics['roa'] = val
        elif 'Market Cap' in col:
            key_metrics['market_cap'] = val
        elif 'Gross Margin' in col:
            key_metrics['gross_margin'] = val
        elif 'After-tax Profit Margin' in col:
            key_metrics['net_margin'] = val
        elif 'Current Ratio' in col:
            key_metrics['current_ratio'] = val
        elif 'Debt/Equity' in col:
            key_metrics['debt_equity'] = val
    
    return {
        "symbol": symbol.upper(),
        "key_metrics": key_metrics,
        "all_data": df_to_json(ratios)
    }

def get_finance(symbol: str):
    """Lấy tất cả dữ liệu tài chính"""
    finance = Finance(source="vci", symbol=symbol.upper())
    
    return {
        "ratios": df_to_json(finance.ratio()),
        "income_statement": df_to_json(finance.income_statement()),
        "balance_sheet": df_to_json(finance.balance_sheet()),
        "cashflow": df_to_json(finance.cashflow())
    }

def get_company_overview(symbol: str):
    """Lấy thông tin công ty"""
    company = Company(source="vci", symbol=symbol.upper())
    overview = company.overview()
    return df_to_json(overview)

def get_company_profile(symbol: str):
    """Lấy thông tin chi tiết công ty"""
    company = Company(source="vci", symbol=symbol.upper())
    
    result = {
        "overview": df_to_json(company.overview()),
        "shareholders": df_to_json(company.shareholders()),
        "officers": df_to_json(company.officers()),
        "subsidiaries": df_to_json(company.subsidiaries()),
        "news": df_to_json(company.news())
    }
    return result

def get_trading_stats(symbol: str):
    """Lấy thống kê giao dịch"""
    trading = Trading(source="vci", symbol=symbol.upper())
    stats = trading.trading_stats()
    return df_to_json(stats)

def get_price_board(symbols: list):
    """Lấy bảng giá cho nhiều mã"""
    trading = Trading(source="vci", symbols=symbols)
    board = trading.price_board()
    return df_to_json(board)

def get_top_gainers():
    """Lấy top cổ phiếu tăng giá"""
    topstock = TopStock(source="vnd")
    gainers = topstock.gainer()
    return df_to_json(gainers)

def get_top_losers():
    """Lấy top cổ phiếu giảm giá"""
    topstock = TopStock(source="vnd")
    losers = topstock.loser()
    return df_to_json(losers)

def get_top_value():
    """Lấy top cổ phiếu theo giá trị giao dịch"""
    topstock = TopStock(source="vnd")
    value = topstock.value()
    return df_to_json(value)

def get_market_pe():
    """Lấy P/E thị trường"""
    market = Market(source="vnd")
    pe = market.pe()
    return df_to_json(pe)

def get_market_pb():
    """Lấy P/B thị trường"""
    market = Market(source="vnd")
    pb = market.pb()
    return df_to_json(pb)

def search_stocks(q: str):
    """Tìm kiếm cổ phiếu"""
    listing = Listing(source="vci")
    all_stocks = listing.all_symbols()
    
    if q:
        q = q.upper()
        mask = (
            all_stocks['symbol'].str.upper().str.contains(q, na=False) |
            all_stocks['organ_name'].str.upper().str.contains(q, na=False)
        )
        results = all_stocks[mask]
    else:
        results = all_stocks
    
    return df_to_json(results.head(50))

def get_screener_data():
    """Lấy dữ liệu cho screener - tất cả cổ phiếu với chỉ số tài chính"""
    listing = Listing(source="vci")
    all_stocks = listing.all_symbols()
    
    result_stocks = []
    
    # Lấy dữ liệu cho 50 cổ phiếu đầu tiên (để demo)
    for idx, row in all_stocks.head(50).iterrows():
        symbol = row['symbol']
        try:
            finance = Finance(source="vci", symbol=symbol)
            ratios = finance.ratio()
            
            if len(ratios) > 0:
                latest = ratios.iloc[0].to_dict()
                
                stock_data = {
                    "symbol": symbol,
                    "name": row.get('organ_name', ''),
                    "pe": safe_float(latest.get('P/E')),
                    "pb": safe_float(latest.get('P/B')),
                    "roe": safe_float(latest.get('ROE (%)')),
                    "roa": safe_float(latest.get('ROA (%)')),
                    "market_cap": safe_float(latest.get('Market Cap')),
                    "gross_margin": safe_float(latest.get('Gross Margin (%)')),
                    "net_margin": safe_float(latest.get('After-tax Profit Margin (%)')),
                    "current_ratio": safe_float(latest.get('Current Ratio')),
                    "debt_equity": safe_float(latest.get('Debt/Equity')),
                }
                result_stocks.append(stock_data)
        except Exception as e:
            continue
    
    return {
        "data": result_stocks,
        "count": len(result_stocks)
    }

def safe_float(val):
    """Safely convert to float"""
    if val is None or val == '':
        return None
    try:
        return float(val)
    except:
        return None

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Action is required"}))
        sys.exit(1)
    
    action = sys.argv[1]
    
    try:
        result = None
        
        if action == "list":
            result = get_all_stocks()
        elif action == "by_exchange":
            exchange = sys.argv[2] if len(sys.argv) > 2 else "HOSE"
            result = get_stocks_by_exchange(exchange)
        elif action == "industries":
            result = get_industries()
        elif action == "price_history":
            symbol = sys.argv[2]
            start = sys.argv[3] if len(sys.argv) > 3 else None
            end = sys.argv[4] if len(sys.argv) > 4 else None
            result = get_price_history(symbol, start, end)
        elif action == "intraday":
            symbol = sys.argv[2]
            result = get_intraday(symbol)
        elif action == "ratios":
            symbol = sys.argv[2]
            result = get_ratios(symbol)
        elif action == "finance":
            symbol = sys.argv[2]
            result = get_finance(symbol)
        elif action == "company":
            symbol = sys.argv[2]
            result = get_company_overview(symbol)
        elif action == "company_profile":
            symbol = sys.argv[2]
            result = get_company_profile(symbol)
        elif action == "trading_stats":
            symbol = sys.argv[2]
            result = get_trading_stats(symbol)
        elif action == "top_gainers":
            result = get_top_gainers()
        elif action == "top_losers":
            result = get_top_losers()
        elif action == "top_value":
            result = get_top_value()
        elif action == "market_pe":
            result = get_market_pe()
        elif action == "market_pb":
            result = get_market_pb()
        elif action == "search":
            q = sys.argv[2] if len(sys.argv) > 2 else ""
            result = search_stocks(q)
        elif action == "screener":
            result = get_screener_data()
        else:
            result = {"error": f"Unknown action: {action}"}
        
        print(json.dumps(result, ensure_ascii=False, default=str))
        
    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
        sys.exit(1)

if __name__ == "__main__":
    main()
