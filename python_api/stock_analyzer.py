#!/usr/bin/env python3
"""
VN Sniper - Stock Screening & Recommendation Engine
Hệ thống tự động lọc và đề xuất cổ phiếu theo chiến lược

Chiến lược:
1. Đầu tư dài hạn (6 tháng - 1 năm): Focus Fundamental
2. Trading (1 - 3 tuần): Focus Technical ngắn hạn
3. Đầu cơ (2 - 4 tuần): Focus Momentum & Volatility
"""

import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

from vnstock_data import Listing, Quote, Finance, Company, Trading, Market, TopStock

# ============== STRATEGY CONFIGURATIONS ==============

STRATEGIES = {
    "investing": {
        "name": "Đầu tư dài hạn",
        "timeframe": "6 tháng - 1 năm",
        "description": "Tập trung vào fundamentals, giá hợp lý, tăng trưởng bền vững",
        "weights": {
            "fundamental": 0.60,
            "technical": 0.25,
            "money_flow": 0.15
        },
        "criteria": {
            "pe_max": 15,
            "pb_max": 2.0,
            "roe_min": 15,
            "roa_min": 8,
            "current_ratio_min": 1.5,
            "debt_equity_max": 1.0,
        }
    },
    "trading": {
        "name": "Trading",
        "timeframe": "1 - 3 tuần", 
        "description": "Tập trung vào xu hướng kỹ thuật, momentum ngắn hạn",
        "weights": {
            "fundamental": 0.15,
            "technical": 0.60,
            "money_flow": 0.25
        },
        "criteria": {
            "rsi_min": 35,
            "rsi_max": 65,
            "volume_spike_min": 1.2,
            "trend": "uptrend"
        }
    },
    "speculation": {
        "name": "Đầu cơ",
        "timeframe": "2 - 4 tuần",
        "description": "Tận dụng biến động, momentum mạnh, cơ hội ngắn hạn",
        "weights": {
            "fundamental": 0.20,
            "technical": 0.50,
            "money_flow": 0.30
        },
        "criteria": {
            "volatility_min": 25,
            "rsi_oversold_max": 35,
            "rsi_overbought_min": 65,
            "volume_spike_min": 1.5
        }
    }
}

# ============== UTILITY FUNCTIONS ==============

def safe_float(val, default=None):
    if val is None or val == '' or pd.isna(val):
        return default
    try:
        return float(val)
    except:
        return default

def calculate_rsi(prices: pd.Series, period: int = 14) -> float:
    """Calculate RSI from price series"""
    if len(prices) < period + 1:
        return None
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None

def calculate_ma(prices: pd.Series, period: int) -> float:
    """Calculate Moving Average"""
    if len(prices) < period:
        return None
    return float(prices.rolling(window=period).mean().iloc[-1])

# ============== STOCK ANALYZER ==============

class StockAnalyzer:
    """Phân tích cổ phiếu đơn lẻ"""
    
    def __init__(self, symbol: str):
        self.symbol = symbol
        self._finance = None
        self._history = None
        self._ratios = None
        
    def _get_finance(self):
        if self._finance is None:
            try:
                f = Finance(source="vci", symbol=self.symbol)
                self._ratios = f.ratio()
            except:
                pass
        return self._ratios
    
    def _get_history(self, days: int = 120):
        if self._history is None:
            try:
                q = Quote(source="vci", symbol=self.symbol)
                end = datetime.now().strftime("%Y-%m-%d")
                start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
                self._history = q.history(start=start, end=end, interval="1D")
            except:
                pass
        return self._history
    
    def analyze_fundamental(self) -> Dict:
        """Phân tích cơ bản"""
        ratios_df = self._get_finance()
        
        if ratios_df is None or len(ratios_df) == 0:
            return {"score": 0, "data": {}, "signals": []}
        
        # Get latest ratios
        if hasattr(ratios_df.index, 'name'):
            ratios_df = ratios_df.reset_index()
        latest = ratios_df.iloc[0].to_dict() if len(ratios_df) > 0 else {}
        
        pe = safe_float(latest.get('P/E'))
        pb = safe_float(latest.get('P/B'))
        roe = safe_float(latest.get('ROE (%)'))
        roa = safe_float(latest.get('ROA (%)'))
        current_ratio = safe_float(latest.get('Current Ratio'))
        debt_equity = safe_float(latest.get('Debt/Equity'))
        net_margin = safe_float(latest.get('After-tax Profit Margin (%)'))
        gross_margin = safe_float(latest.get('Gross Margin (%)'))
        market_cap = safe_float(latest.get('Market Cap'))
        
        # Calculate score (0-100)
        score = 50
        signals = []
        
        # Valuation scoring
        if pe and pe > 0:
            if pe < 8:
                score += 15
                signals.append({"type": "valuation", "signal": "Rất rẻ", "detail": f"P/E={pe:.1f}"})
            elif pe < 12:
                score += 10
                signals.append({"type": "valuation", "signal": "Rẻ", "detail": f"P/E={pe:.1f}"})
            elif pe < 15:
                score += 5
            elif pe > 25:
                score -= 10
                signals.append({"type": "valuation", "signal": "Đắt", "detail": f"P/E={pe:.1f}"})
        
        if pb and pb > 0:
            if pb < 1:
                score += 10
                signals.append({"type": "valuation", "signal": "P/B thấp", "detail": f"P/B={pb:.2f}"})
            elif pb < 1.5:
                score += 5
            elif pb > 3:
                score -= 5
        
        # Profitability scoring
        if roe and roe > 0:
            if roe > 20:
                score += 15
                signals.append({"type": "profitability", "signal": "ROE xuất sắc", "detail": f"ROE={roe:.1f}%"})
            elif roe > 15:
                score += 10
            elif roe > 10:
                score += 5
            elif roe < 5:
                score -= 10
        
        if roa and roa > 0:
            if roa > 10:
                score += 10
            elif roa > 5:
                score += 5
        
        # Financial health scoring
        if current_ratio:
            if current_ratio >= 2:
                score += 10
            elif current_ratio >= 1.5:
                score += 5
            elif current_ratio < 1:
                score -= 15
                signals.append({"type": "risk", "signal": "Thanh khoản yếu", "detail": f"Current Ratio={current_ratio:.2f}"})
        
        if debt_equity is not None:
            if debt_equity < 0.5:
                score += 5
            elif debt_equity > 2:
                score -= 10
                signals.append({"type": "risk", "signal": "Đòn bẩy cao", "detail": f"D/E={debt_equity:.2f}"})
        
        # Margin scoring
        if net_margin and net_margin > 20:
            score += 5
            signals.append({"type": "profitability", "signal": "Biên lợi nhuận cao", "detail": f"Net Margin={net_margin:.1f}%"})
        
        score = max(0, min(100, score))
        
        return {
            "score": score,
            "data": {
                "pe": pe,
                "pb": pb,
                "roe": roe,
                "roa": roa,
                "current_ratio": current_ratio,
                "debt_equity": debt_equity,
                "net_margin": net_margin,
                "gross_margin": gross_margin,
                "market_cap": market_cap
            },
            "signals": signals
        }
    
    def analyze_technical(self) -> Dict:
        """Phân tích kỹ thuật"""
        df = self._get_history()
        
        if df is None or len(df) < 50:
            return {"score": 50, "data": {}, "signals": []}
        
        df = df.copy()
        close = df['close']
        
        current_price = float(close.iloc[-1])
        
        # Moving averages
        ma20 = calculate_ma(close, 20)
        ma50 = calculate_ma(close, 50)
        
        # RSI
        rsi = calculate_rsi(close, 14)
        
        # Volume analysis
        volume = df['volume']
        avg_volume_20 = volume.rolling(window=20).mean().iloc[-1]
        current_volume = float(volume.iloc[-1])
        volume_ratio = current_volume / avg_volume_20 if avg_volume_20 > 0 else 1
        
        # Volatility
        returns = close.pct_change()
        volatility = returns.std() * np.sqrt(250) * 100  # Annualized
        
        # Calculate ATR%
        df['high_low'] = df['high'] - df['low']
        atr = df['high_low'].rolling(window=14).mean().iloc[-1]
        atr_pct = (atr / current_price * 100) if atr and current_price else None
        
        # Score calculation
        score = 50
        signals = []
        trend = "Sideways"
        
        # Trend analysis
        if ma20 and ma50:
            if current_price > ma20 > ma50:
                trend = "Uptrend"
                score += 20
                signals.append({"type": "trend", "signal": "Xu hướng tăng", "detail": f"Giá > MA20({ma20:.1f}) > MA50({ma50:.1f})"})
            elif current_price > ma20:
                trend = "Weak Uptrend"
                score += 10
            elif current_price < ma20 < ma50:
                trend = "Downtrend"
                score -= 20
                signals.append({"type": "trend", "signal": "Xu hướng giảm", "detail": f"Giá < MA20({ma20:.1f}) < MA50({ma50:.1f})"})
            elif current_price < ma20:
                trend = "Weak Downtrend"
                score -= 10
        
        # RSI analysis
        if rsi:
            if rsi < 30:
                score += 15
                signals.append({"type": "momentum", "signal": "Quá bán - Cơ hội mua", "detail": f"RSI={rsi:.1f}"})
            elif rsi < 40:
                score += 10
            elif rsi > 70:
                score -= 15
                signals.append({"type": "momentum", "signal": "Quá mua - Cảnh báo", "detail": f"RSI={rsi:.1f}"})
            elif rsi > 60:
                score -= 5
        
        # Volume analysis
        if volume_ratio > 2:
            score += 10
            signals.append({"type": "volume", "signal": "Volume tăng đột biến", "detail": f"Volume x{volume_ratio:.1f} lần TB"})
        elif volume_ratio > 1.5:
            score += 5
        
        score = max(0, min(100, score))
        
        # Support/Resistance
        support = float(df['low'].rolling(window=20).min().iloc[-1])
        resistance = float(df['high'].rolling(window=20).max().iloc[-1])
        
        return {
            "score": score,
            "data": {
                "current_price": current_price,
                "ma20": ma20,
                "ma50": ma50,
                "rsi": rsi,
                "trend": trend,
                "volume_ratio": round(volume_ratio, 2),
                "volatility": round(volatility, 2) if volatility else None,
                "atr_pct": round(atr_pct, 2) if atr_pct else None,
                "support": support,
                "resistance": resistance,
                "distance_to_support": round((current_price - support) / support * 100, 2) if support else None,
                "distance_to_resistance": round((resistance - current_price) / current_price * 100, 2) if resistance else None
            },
            "signals": signals
        }
    
    def analyze_money_flow(self) -> Dict:
        """Phân tích dòng tiền (placeholder - cần thêm data)"""
        # TODO: Integrate foreign trading data when available
        return {
            "score": 50,
            "data": {},
            "signals": []
        }
    
    def get_full_analysis(self) -> Dict:
        """Phân tích đầy đủ"""
        fundamental = self.analyze_fundamental()
        technical = self.analyze_technical()
        money_flow = self.analyze_money_flow()
        
        return {
            "symbol": self.symbol,
            "fundamental": fundamental,
            "technical": technical,
            "money_flow": money_flow
        }
    
    def calculate_strategy_score(self, strategy: str) -> Dict:
        """Tính điểm theo chiến lược cụ thể"""
        analysis = self.get_full_analysis()
        config = STRATEGIES.get(strategy, STRATEGIES["investing"])
        weights = config["weights"]
        
        score = (
            analysis["fundamental"]["score"] * weights["fundamental"] +
            analysis["technical"]["score"] * weights["technical"] +
            analysis["money_flow"]["score"] * weights["money_flow"]
        )
        
        # Check criteria
        meets_criteria = True
        criteria_details = []
        
        if strategy == "investing":
            fd = analysis["fundamental"]["data"]
            criteria = config["criteria"]
            
            if fd.get("pe") and fd["pe"] > criteria["pe_max"]:
                meets_criteria = False
                criteria_details.append(f"P/E {fd['pe']:.1f} > {criteria['pe_max']}")
            if fd.get("pb") and fd["pb"] > criteria["pb_max"]:
                meets_criteria = False
                criteria_details.append(f"P/B {fd['pb']:.2f} > {criteria['pb_max']}")
            if fd.get("roe") and fd["roe"] < criteria["roe_min"]:
                meets_criteria = False
                criteria_details.append(f"ROE {fd['roe']:.1f}% < {criteria['roe_min']}%")
            if fd.get("current_ratio") and fd["current_ratio"] < criteria["current_ratio_min"]:
                meets_criteria = False
                criteria_details.append(f"Current Ratio {fd['current_ratio']:.2f} < {criteria['current_ratio_min']}")
        
        elif strategy == "trading":
            td = analysis["technical"]["data"]
            criteria = config["criteria"]
            
            if td.get("rsi"):
                if td["rsi"] < criteria["rsi_min"] or td["rsi"] > criteria["rsi_max"]:
                    meets_criteria = False
                    criteria_details.append(f"RSI {td['rsi']:.1f} ngoàirange [{criteria['rsi_min']}-{criteria['rsi_max']}]")
            
            if td.get("trend") != "Uptrend":
                meets_criteria = False
                criteria_details.append(f"Không có xu hướng tăng rõ ràng")
        
        elif strategy == "speculation":
            td = analysis["technical"]["data"]
            criteria = config["criteria"]
            
            # Speculation cần volatility cao
            if td.get("volatility") and td["volatility"] < criteria["volatility_min"]:
                meets_criteria = False
                criteria_details.append(f"Volatility {td['volatility']:.1f}% < {criteria['volatility_min']}%")
        
        # Collect all signals
        all_signals = (
            analysis["fundamental"]["signals"] +
            analysis["technical"]["signals"] +
            analysis["money_flow"]["signals"]
        )
        
        # Determine action
        action = "Hold"
        confidence = "Trung bình"
        
        if score >= 70:
            action = "Strong Buy"
            confidence = "Cao"
        elif score >= 60:
            action = "Buy"
            confidence = "Khá cao"
        elif score >= 50:
            action = "Watch"
            confidence = "Trung bình"
        elif score <= 35:
            action = "Sell"
            confidence = "Cao"
        elif score <= 45:
            action = "Avoid"
            confidence = "Khá cao"
        
        return {
            "symbol": self.symbol,
            "strategy": strategy,
            "strategy_name": config["name"],
            "timeframe": config["timeframe"],
            "score": round(score, 1),
            "meets_criteria": meets_criteria,
            "criteria_details": criteria_details,
            "action": action,
            "confidence": confidence,
            "current_price": analysis["technical"]["data"].get("current_price"),
            "support": analysis["technical"]["data"].get("support"),
            "resistance": analysis["technical"]["data"].get("resistance"),
            "signals": all_signals,
            "fundamental_score": analysis["fundamental"]["score"],
            "technical_score": analysis["technical"]["score"],
            "data": {
                "fundamental": analysis["fundamental"]["data"],
                "technical": analysis["technical"]["data"]
            }
        }


# ============== AUTO SCREENER ==============

class AutoScreener:
    """Tự động lọc và đề xuất cổ phiếu"""
    
    def __init__(self):
        self.listing = Listing(source="vci")
        self._all_symbols = None
    
    def get_all_symbols(self, limit: int = None) -> List[str]:
        """Lấy danh sách tất cả mã cổ phiếu"""
        if self._all_symbols is None:
            df = self.listing.all_symbols()
            # Filter for stocks only (remove bonds, warrants, etc.)
            df = df[df['symbol'].str.match(r'^[A-Z]{2,4}$', na=False)]
            self._all_symbols = df['symbol'].tolist()
        
        return self._all_symbols[:limit] if limit else self._all_symbols
    
    def _get_liquid_symbols(self, top_n: int = 50) -> List[str]:
        """Lấy danh sách cổ phiếu thanh khoản cao"""
        try:
            topstock = TopStock(source="vnd")
            gainers = topstock.gainer()
            losers = topstock.loser()
            value = topstock.value()
            
            symbols = set()
            for df in [gainers, losers, value]:
                if df is not None and 'symbol' in df.columns:
                    symbols.update(df['symbol'].tolist())
            
            return list(symbols)[:top_n]
        except:
            return self.get_all_symbols(limit=top_n)
    
    def screen_for_strategy(self, strategy: str, top_n: int = 10) -> Dict:
        """Lọc cổ phiếu theo chiến lược"""
        config = STRATEGIES.get(strategy, STRATEGIES["investing"])
        
        # Get liquid symbols for better performance
        symbols = self._get_liquid_symbols(50)
        
        results = []
        
        for symbol in symbols:
            try:
                analyzer = StockAnalyzer(symbol)
                result = analyzer.calculate_strategy_score(strategy)
                
                # Only include stocks that meet minimum criteria
                if result["score"] >= 50:
                    results.append(result)
            except Exception as e:
                continue
        
        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        
        # Get top N
        top_results = results[:top_n]
        
        return {
            "strategy": strategy,
            "strategy_name": config["name"],
            "timeframe": config["timeframe"],
            "description": config["description"],
            "total_analyzed": len(symbols),
            "total_qualified": len(results),
            "recommendations": top_results,
            "generated_at": datetime.now().isoformat()
        }
    
    def screen_all_strategies(self, top_n: int = 10) -> Dict:
        """Lọc cổ phiếu cho tất cả chiến lược"""
        results = {}
        
        for strategy in STRATEGIES.keys():
            results[strategy] = self.screen_for_strategy(strategy, top_n)
        
        # Market overview
        try:
            market = Market(source="vnd")
            topstock = TopStock(source="vnd")
            
            gainers = topstock.gainer()
            losers = topstock.loser()
            
            market_overview = {
                "num_gainers": len(gainers) if gainers is not None else 0,
                "num_losers": len(losers) if losers is not None else 0,
                "top_gainer": gainers.iloc[0].to_dict() if gainers is not None and len(gainers) > 0 else None,
                "top_loser": losers.iloc[0].to_dict() if losers is not None and len(losers) > 0 else None,
            }
        except:
            market_overview = {
                "num_gainers": 0,
                "num_losers": 0,
            }
        
        return {
            "strategies": results,
            "market_overview": market_overview,
            "generated_at": datetime.now().isoformat()
        }


# ============== SINGLE STOCK ANALYSIS ==============

def analyze_single_stock(symbol: str) -> Dict:
    """Phân tích chi tiết một cổ phiếu"""
    analyzer = StockAnalyzer(symbol.upper())
    
    results = {
        "symbol": symbol.upper(),
        "strategies": {}
    }
    
    for strategy in STRATEGIES.keys():
        results["strategies"][strategy] = analyzer.calculate_strategy_score(strategy)
    
    # Full analysis
    results["full_analysis"] = analyzer.get_full_analysis()
    
    return results


# ============== MAIN ==============

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Action required: screen, analyze, strategies"}))
        sys.exit(1)
    
    action = sys.argv[1]
    
    try:
        result = None
        
        if action == "screen":
            # Screen for recommendations
            strategy = sys.argv[2] if len(sys.argv) > 2 else "all"
            top_n = int(sys.argv[3]) if len(sys.argv) > 3 else 10
            
            screener = AutoScreener()
            
            if strategy == "all":
                result = screener.screen_all_strategies(top_n)
            else:
                result = screener.screen_for_strategy(strategy, top_n)
        
        elif action == "analyze":
            symbol = sys.argv[2] if len(sys.argv) > 2 else "VCI"
            result = analyze_single_stock(symbol)
        
        elif action == "strategies":
            result = {
                "strategies": {k: {
                    "name": v["name"],
                    "timeframe": v["timeframe"],
                    "description": v["description"],
                    "weights": v["weights"],
                    "criteria": v["criteria"]
                } for k, v in STRATEGIES.items()}
            }
        
        else:
            result = {"error": f"Unknown action: {action}"}
        
        print(json.dumps(result, ensure_ascii=False, default=str))
        
    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
        sys.exit(1)


if __name__ == "__main__":
    main()
