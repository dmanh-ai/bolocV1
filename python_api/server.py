"""
VN Sniper - Python Backend API
FastAPI server to expose vnstock data for Next.js frontend
Tự động chạy screening vào 11:45 và 15:15 (UTC+7)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import vnstock as vs
import pandas as pd
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List
import os

from scheduler import create_scheduler, get_latest_result, get_schedule_info, run_screening

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vn-sniper")

# Scheduler lifecycle
@asynccontextmanager
async def lifespan(app):
    # Startup: khởi động scheduler
    scheduler = create_scheduler()
    scheduler.start()
    logger.info("Auto-scheduler đã khởi động (11:45 & 15:15 UTC+7)")
    yield
    # Shutdown: dừng scheduler
    scheduler.shutdown()
    logger.info("Auto-scheduler đã dừng")

# Khởi tạo FastAPI
app = FastAPI(
    title="VN Sniper API",
    description="API dữ liệu chứng khoán Việt Nam từ vnstock - Tự động screening 11:45 & 15:15 (UTC+7)",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS để cho phép Next.js gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache dữ liệu để giảm số lượng request
_cache = {}
_cache_timeout = 300  # 5 phút

def get_cache(key: str):
    """Lấy dữ liệu từ cache"""
    if key in _cache:
        data, timestamp = _cache[key]
        if datetime.now().timestamp() - timestamp < _cache_timeout:
            return data
    return None

def set_cache(key: str, data):
    """Lưu dữ liệu vào cache"""
    _cache[key] = (data, datetime.now().timestamp())

def df_to_json(df: pd.DataFrame) -> dict:
    """Convert DataFrame to JSON"""
    if df is None or df.empty:
        return {"data": [], "count": 0}
    
    # Xử lý MultiIndex columns
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ['_'.join(col).strip() for col in df.columns.values]
    
    # Xử lý NaN values
    df = df.fillna('')
    
    return {
        "data": df.to_dict(orient='records'),
        "count": len(df),
        "columns": list(df.columns)
    }

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/")
async def root():
    """API info"""
    return {
        "name": "VN Sniper API",
        "version": "1.0.0",
        "endpoints": [
            "/stocks/list - Danh sách tất cả cổ phiếu",
            "/stocks/price_history/{symbol} - Lịch sử giá",
            "/stocks/intraday/{symbol} - Dữ liệu trong ngày",
            "/stocks/finance/{symbol} - Chỉ số tài chính",
            "/stocks/company/{symbol} - Thông tin công ty",
            "/stocks/search - Tìm kiếm cổ phiếu",
            "/scheduler/status - Trạng thái auto-scheduler",
            "/scheduler/latest - Kết quả screening mới nhất",
            "/scheduler/run-now - Chạy screening ngay (POST)",
        ]
    }

@app.get("/stocks/list")
async def get_all_stocks():
    """Lấy danh sách tất cả cổ phiếu"""
    cache_key = "all_stocks"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    try:
        listing = vs.Listing()
        stocks = listing.all_symbols()
        result = df_to_json(stocks)
        set_cache(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/by_exchange")
async def get_stocks_by_exchange(exchange: str = Query(default="HOSE", description="Sàn giao dịch: HOSE, HNX, UPCOM")):
    """Lấy danh sách cổ phiếu theo sàn"""
    try:
        listing = vs.Listing()
        stocks = listing.symbols_by_exchange(exchange=exchange)
        return df_to_json(stocks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/industries")
async def get_industries():
    """Lấy danh sách ngành ICB"""
    cache_key = "industries"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    try:
        listing = vs.Listing()
        industries = listing.industries_icb()
        result = df_to_json(industries)
        set_cache(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/price_history/{symbol}")
async def get_price_history(
    symbol: str,
    start: str = Query(default=None, description="Ngày bắt đầu (YYYY-MM-DD)"),
    end: str = Query(default=None, description="Ngày kết thúc (YYYY-MM-DD)")
):
    """Lấy lịch sử giá cổ phiếu"""
    # Mặc định 1 năm
    if not start:
        start = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    if not end:
        end = datetime.now().strftime("%Y-%m-%d")
    
    cache_key = f"price_history_{symbol}_{start}_{end}"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    try:
        quote = vs.Quote(symbol=symbol.upper())
        history = quote.history(start=start, end=end)
        result = df_to_json(history)
        set_cache(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/intraday/{symbol}")
async def get_intraday(symbol: str):
    """Lấy dữ liệu giao dịch trong ngày"""
    try:
        quote = vs.Quote(symbol=symbol.upper())
        intraday = quote.intraday()
        return df_to_json(intraday)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/finance/{symbol}")
async def get_finance(
    symbol: str,
    period: str = Query(default="quarter", description="Kỳ báo cáo: quarter hoặc year")
):
    """Lấy các chỉ số tài chính"""
    cache_key = f"finance_{symbol}_{period}"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    try:
        finance = vs.Finance(symbol=symbol.upper(), source="VCI")
        
        # Lấy tất cả dữ liệu tài chính
        ratios = finance.ratio(period=period)
        income = finance.income_statement(period=period)
        balance = finance.balance_sheet(period=period)
        cashflow = finance.cash_flow(period=period)
        
        result = {
            "ratios": df_to_json(ratios),
            "income_statement": df_to_json(income),
            "balance_sheet": df_to_json(balance),
            "cash_flow": df_to_json(cashflow)
        }
        
        set_cache(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/ratios/{symbol}")
async def get_ratios(
    symbol: str,
    period: str = Query(default="quarter", description="Kỳ báo cáo: quarter hoặc year")
):
    """Lấy các chỉ số tài chính quan trọng"""
    cache_key = f"ratios_{symbol}_{period}"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    try:
        finance = vs.Finance(symbol=symbol.upper(), source="VCI")
        ratios = finance.ratio(period=period)
        
        # Flatten MultiIndex columns
        if isinstance(ratios.columns, pd.MultiIndex):
            ratios.columns = ['_'.join(col).strip() for col in ratios.columns.values]
        
        # Lấy dữ liệu mới nhất
        latest = ratios.iloc[0].to_dict() if len(ratios) > 0 else {}
        
        # Trích xuất các chỉ số quan trọng
        key_metrics = {}
        for col in ratios.columns:
            if 'P/E' in col:
                key_metrics['pe'] = latest.get(col)
            elif 'P/B' in col:
                key_metrics['pb'] = latest.get(col)
            elif 'ROE' in col and '%' in col:
                key_metrics['roe'] = latest.get(col)
            elif 'ROA' in col and '%' in col:
                key_metrics['roa'] = latest.get(col)
            elif 'EPS' in col and 'VND' in col:
                key_metrics['eps'] = latest.get(col)
            elif 'Market Capital' in col:
                key_metrics['market_cap'] = latest.get(col)
        
        result = {
            "symbol": symbol.upper(),
            "period": period,
            "latest_ratios": latest,
            "key_metrics": key_metrics,
            "all_data": df_to_json(ratios)
        }
        
        set_cache(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/company/{symbol}")
async def get_company_info(symbol: str):
    """Lấy thông tin công ty"""
    cache_key = f"company_{symbol}"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    try:
        company = vs.Company(symbol=symbol.upper())
        overview = company.overview()
        
        result = {
            "overview": df_to_json(overview),
        }
        
        set_cache(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/officers/{symbol}")
async def get_company_officers(symbol: str):
    """Lấy thông tin ban lãnh đạo"""
    try:
        company = vs.Company(symbol=symbol.upper())
        officers = company.officers()
        return df_to_json(officers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/shareholders/{symbol}")
async def get_shareholders(symbol: str):
    """Lấy thông tin cổ đông lớn"""
    try:
        company = vs.Company(symbol=symbol.upper())
        shareholders = company.shareholders()
        return df_to_json(shareholders)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/news/{symbol}")
async def get_stock_news(symbol: str):
    """Lấy tin tức công ty"""
    try:
        company = vs.Company(symbol=symbol.upper())
        news = company.news()
        return df_to_json(news)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/search")
async def search_stocks(q: str = Query(default="", description="Từ khóa tìm kiếm")):
    """Tìm kiếm cổ phiếu theo tên hoặc mã"""
    try:
        listing = vs.Listing()
        all_stocks = listing.all_symbols()
        
        if q:
            q = q.upper()
            # Tìm theo mã hoặc tên
            mask = (
                all_stocks['symbol'].str.upper().str.contains(q, na=False) |
                all_stocks['organ_name'].str.upper().str.contains(q, na=False)
            )
            results = all_stocks[mask]
        else:
            results = all_stocks
        
        return df_to_json(results.head(50))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/bulk_ratios")
async def get_bulk_ratios(
    symbols: str = Query(default="", description="Danh sách mã cổ phiếu, phân cách bằng dấu phẩy")
):
    """Lấy chỉ số tài chính của nhiều cổ phiếu cùng lúc"""
    if not symbols:
        raise HTTPException(status_code=400, detail="Cần cung cấp danh sách mã cổ phiếu")
    
    symbol_list = [s.strip().upper() for s in symbols.split(",")][:20]  # Giới hạn 20 mã
    results = []
    
    for symbol in symbol_list:
        try:
            finance = vs.Finance(symbol=symbol, source="VCI")
            ratios = finance.ratio(period="quarter")
            
            if isinstance(ratios.columns, pd.MultiIndex):
                ratios.columns = ['_'.join(col).strip() for col in ratios.columns.values]
            
            latest = ratios.iloc[0].to_dict() if len(ratios) > 0 else {}
            
            # Trích xuất key metrics
            metrics = {"symbol": symbol}
            for col in ratios.columns:
                if 'P/E' in col:
                    metrics['pe'] = latest.get(col)
                elif 'P/B' in col:
                    metrics['pb'] = latest.get(col)
                elif 'ROE' in col and '%' in col:
                    metrics['roe'] = latest.get(col)
                elif 'ROA' in col and '%' in col:
                    metrics['roa'] = latest.get(col)
                elif 'EPS' in col and 'VND' in col:
                    metrics['eps'] = latest.get(col)
                elif 'Market Capital' in col:
                    metrics['market_cap'] = latest.get(col)
            
            results.append(metrics)
        except Exception as e:
            results.append({"symbol": symbol, "error": str(e)})
    
    return {"data": results, "count": len(results)}

# ============================================
# SCHEDULER ENDPOINTS
# ============================================

@app.get("/scheduler/status")
async def scheduler_status():
    """Xem trạng thái và lịch chạy tự động"""
    return get_schedule_info()

@app.get("/scheduler/latest")
async def scheduler_latest():
    """Lấy kết quả screening mới nhất từ auto-scheduler"""
    result = get_latest_result()
    if result is None:
        return {
            "message": "Chưa có kết quả screening nào. Scheduler sẽ chạy vào 11:45 hoặc 15:15 (UTC+7).",
            "schedule": get_schedule_info()
        }
    return result

@app.post("/scheduler/run-now")
async def scheduler_run_now():
    """Chạy screening ngay lập tức (manual trigger)"""
    try:
        run_screening()
        result = get_latest_result()
        return {
            "message": "Screening hoàn tất!",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi chạy screening: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
