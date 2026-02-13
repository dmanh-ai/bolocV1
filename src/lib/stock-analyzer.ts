/**
 * Stock Analyzer - Comprehensive 3-pillar analysis
 * 1. Fundamental: Revenue, profit, margins, valuation, growth, solvency
 * 2. Technical: All indicators from vnstock (SMA, RSI, MACD, BB, volume, volatility)
 * 3. Macro: VN index trend, foreign flow, market breadth
 */

import {
  getPriceHistory,
  getCompanyRatios,
  getStockList,
  getAllCompanyRatios,
  getMarketBreadth,
  getIndexHistory,
  getForeignFlow,
  type StockOHLCV,
  type CompanyRatios,
  type StockListItem,
  type IndexData,
  type ForeignFlow,
} from "./vnstock-api";

// --------------- Types ---------------

export type Strategy = "investing" | "trading";

export interface Signal {
  type: "fundamental" | "technical" | "macro";
  signal: string;
  detail: string;
  impact: "positive" | "negative" | "neutral";
}

export interface TechnicalData {
  current_price: number;
  trend: string;
  rsi: number;
  ma20: number;
  ma50: number;
  ma200: number;
  macd: number;
  macd_signal: number;
  macd_hist: number;
  support: number;
  resistance: number;
  volatility: number;
  volume_ratio: number;
  bb_upper: number;
  bb_lower: number;
  daily_return: number;
  price_vs_ma20_pct: number;
  price_vs_ma50_pct: number;
  price_vs_ma200_pct: number;
}

export interface FundamentalData {
  pe?: number;
  pb?: number;
  ps?: number;
  ev_per_ebitda?: number;
  roe?: number;
  roic?: number;
  roa?: number;
  eps?: number;
  bvps?: number;
  revenue?: number;
  revenue_growth?: number;
  net_profit?: number;
  net_profit_growth?: number;
  gross_margin?: number;
  net_profit_margin?: number;
  ebit_margin?: number;
  current_ratio?: number;
  quick_ratio?: number;
  de?: number;
  interest_coverage?: number;
  dividend?: number;
  market_cap?: number;
}

export interface MacroData {
  vnindex_trend: string;
  vnindex_rsi: number;
  vnindex_change_pct: number;
  market_advancing: number;
  market_declining: number;
  foreign_net_value: number;
  market_sentiment: string;
}

export interface StockAnalysisResult {
  symbol: string;
  score: number;
  action: string;
  confidence: string;
  current_price: number;
  support: number;
  resistance: number;
  signals: Signal[];
  fundamental_score: number;
  technical_score: number;
  macro_score: number;
  data: {
    fundamental: FundamentalData;
    technical: TechnicalData;
    macro: MacroData;
  };
}

export interface StrategyResult {
  strategy: string;
  strategy_name: string;
  timeframe: string;
  description: string;
  total_analyzed: number;
  total_qualified: number;
  recommendations: StockAnalysisResult[];
  generated_at: string;
}

// --------------- Strategy Configurations ---------------

const STRATEGY_CONFIGS: Record<
  Strategy,
  {
    name: string;
    timeframe: string;
    description: string;
    weights: { fundamental: number; technical: number; macro: number };
    thresholds: {
      pe_max?: number;
      pb_max?: number;
      roe_min?: number;
      rsi_min?: number;
      rsi_max?: number;
      min_score: number;
    };
  }
> = {
  investing: {
    name: "Đầu tư dài hạn",
    timeframe: "6 tháng - 1 năm",
    description: "Fundamentals mạnh, định giá hợp lý, tăng trưởng bền vững, vĩ mô thuận lợi",
    weights: { fundamental: 0.50, technical: 0.25, macro: 0.25 },
    thresholds: {
      pe_max: 25,
      pb_max: 4,
      roe_min: 8,
      min_score: 55,
    },
  },
  trading: {
    name: "Trading ngắn hạn",
    timeframe: "1 - 4 tuần",
    description: "Xu hướng kỹ thuật mạnh, momentum tốt, thanh khoản cao",
    weights: { fundamental: 0.15, technical: 0.65, macro: 0.20 },
    thresholds: {
      rsi_min: 25,
      rsi_max: 75,
      min_score: 50,
    },
  },
};

// --------------- Macro Analysis ---------------

let cachedMacro: { data: MacroData; ts: number } | null = null;
const MACRO_CACHE_TTL = 10 * 60 * 1000;

async function analyzeMacro(): Promise<{
  score: number;
  data: MacroData;
  signals: Signal[];
}> {
  if (cachedMacro && Date.now() - cachedMacro.ts < MACRO_CACHE_TTL) {
    return { score: 50, data: cachedMacro.data, signals: [] };
  }

  const signals: Signal[] = [];
  let score = 50;

  let vnindexTrend = "N/A";
  let vnindexRsi = 50;
  let vnindexChangePct = 0;
  let advancing = 0;
  let declining = 0;
  let foreignNetValue = 0;

  // VN-Index analysis
  try {
    const vnindex = await getIndexHistory("VNINDEX");
    if (vnindex.length >= 20) {
      const latest = vnindex[vnindex.length - 1];
      const prev = vnindex[vnindex.length - 2];
      vnindexRsi = latest.rsi_14 ?? 50;
      vnindexChangePct = latest.daily_return ?? 0;
      const sma20 = latest.sma_20 ?? latest.close;

      if (latest.close > sma20) {
        vnindexTrend = "Uptrend";
        score += 10;
        signals.push({ type: "macro", signal: "VN-Index trên MA20", detail: `VNI = ${latest.close.toFixed(0)}`, impact: "positive" });
      } else {
        vnindexTrend = "Downtrend";
        score -= 10;
        signals.push({ type: "macro", signal: "VN-Index dưới MA20", detail: `VNI = ${latest.close.toFixed(0)}`, impact: "negative" });
      }

      if (vnindexRsi < 30) {
        score += 5;
        signals.push({ type: "macro", signal: "VN-Index quá bán", detail: `RSI = ${vnindexRsi.toFixed(0)}`, impact: "positive" });
      } else if (vnindexRsi > 70) {
        score -= 5;
        signals.push({ type: "macro", signal: "VN-Index quá mua", detail: `RSI = ${vnindexRsi.toFixed(0)}`, impact: "negative" });
      }

      // Check 5-day momentum
      if (vnindex.length >= 6) {
        const fiveDayAgo = vnindex[vnindex.length - 6];
        const fiveDayReturn = ((latest.close - fiveDayAgo.close) / fiveDayAgo.close) * 100;
        if (fiveDayReturn > 2) {
          score += 5;
          signals.push({ type: "macro", signal: "Thị trường momentum tốt", detail: `+${fiveDayReturn.toFixed(1)}% 5 phiên`, impact: "positive" });
        } else if (fiveDayReturn < -2) {
          score -= 5;
          signals.push({ type: "macro", signal: "Thị trường suy yếu", detail: `${fiveDayReturn.toFixed(1)}% 5 phiên`, impact: "negative" });
        }
      }
    }
  } catch { /* skip */ }

  // Market breadth
  try {
    const breadth = await getMarketBreadth();
    breadth.forEach((b) => {
      advancing += b.advancing;
      declining += b.declining;
    });
    if (advancing > 0 || declining > 0) {
      const ratio = advancing / (advancing + declining);
      if (ratio > 0.6) {
        score += 8;
        signals.push({ type: "macro", signal: "Breadth tích cực", detail: `${advancing} tăng / ${declining} giảm`, impact: "positive" });
      } else if (ratio < 0.4) {
        score -= 8;
        signals.push({ type: "macro", signal: "Breadth tiêu cực", detail: `${advancing} tăng / ${declining} giảm`, impact: "negative" });
      }
    }
  } catch { /* skip */ }

  // Foreign flow
  try {
    const flows = await getForeignFlow();
    foreignNetValue = flows.reduce((sum, f) => sum + f.foreign_net_value, 0);
    if (foreignNetValue > 0) {
      score += 5;
      signals.push({ type: "macro", signal: "Khối ngoại mua ròng", detail: `${(foreignNetValue / 1e9).toFixed(1)} tỷ`, impact: "positive" });
    } else if (foreignNetValue < -50e9) {
      score -= 5;
      signals.push({ type: "macro", signal: "Khối ngoại bán ròng mạnh", detail: `${(foreignNetValue / 1e9).toFixed(1)} tỷ`, impact: "negative" });
    }
  } catch { /* skip */ }

  let sentiment = "Trung lập";
  if (score >= 60) sentiment = "Tích cực";
  else if (score >= 70) sentiment = "Rất tích cực";
  else if (score <= 40) sentiment = "Tiêu cực";
  else if (score <= 30) sentiment = "Rất tiêu cực";

  const macroData: MacroData = {
    vnindex_trend: vnindexTrend,
    vnindex_rsi: vnindexRsi,
    vnindex_change_pct: vnindexChangePct,
    market_advancing: advancing,
    market_declining: declining,
    foreign_net_value: foreignNetValue,
    market_sentiment: sentiment,
  };

  cachedMacro = { data: macroData, ts: Date.now() };

  return {
    score: Math.max(0, Math.min(100, score)),
    data: macroData,
    signals,
  };
}

// --------------- Technical Analysis ---------------

function analyzeTechnicals(priceData: StockOHLCV[]): {
  score: number;
  data: TechnicalData;
  signals: Signal[];
} {
  if (priceData.length < 5) {
    return {
      score: 50,
      data: {
        current_price: 0, trend: "N/A", rsi: 50,
        ma20: 0, ma50: 0, ma200: 0,
        macd: 0, macd_signal: 0, macd_hist: 0,
        support: 0, resistance: 0,
        volatility: 0, volume_ratio: 1,
        bb_upper: 0, bb_lower: 0,
        daily_return: 0,
        price_vs_ma20_pct: 0, price_vs_ma50_pct: 0, price_vs_ma200_pct: 0,
      },
      signals: [],
    };
  }

  const latest = priceData[priceData.length - 1];
  const prev = priceData[priceData.length - 2];
  const price = latest.close;
  const signals: Signal[] = [];
  let score = 50;

  const ma20 = latest.sma_20 ?? price;
  const ma50 = latest.sma_50 ?? price;
  const ma200 = latest.sma_200 ?? price;
  const rsi = latest.rsi_14 ?? 50;
  const macd = latest.macd ?? 0;
  const macdSignal = latest.macd_signal ?? 0;
  const macdHist = latest.macd_hist ?? 0;
  const volatility = latest.volatility_20d ?? 0;
  const bbUpper = latest.bb_upper ?? price * 1.02;
  const bbLower = latest.bb_lower ?? price * 0.98;
  const dailyReturn = latest.daily_return ?? 0;

  const pctMa20 = ma20 > 0 ? ((price - ma20) / ma20) * 100 : 0;
  const pctMa50 = ma50 > 0 ? ((price - ma50) / ma50) * 100 : 0;
  const pctMa200 = ma200 > 0 ? ((price - ma200) / ma200) * 100 : 0;

  // --- Trend (MA alignment) ---
  let trend = "Sideway";
  if (price > ma20 && ma20 > ma50) {
    trend = "Uptrend";
    score += 10;
    signals.push({ type: "technical", signal: "Xu hướng tăng", detail: "Giá > MA20 > MA50", impact: "positive" });
  } else if (price < ma20 && ma20 < ma50) {
    trend = "Downtrend";
    score -= 10;
    signals.push({ type: "technical", signal: "Xu hướng giảm", detail: "Giá < MA20 < MA50", impact: "negative" });
  }

  // Golden / Death Cross
  if (ma50 > ma200 && price > ma50) {
    score += 5;
    signals.push({ type: "technical", signal: "Golden Cross", detail: "MA50 > MA200", impact: "positive" });
  } else if (ma50 < ma200 && price < ma50) {
    score -= 5;
    signals.push({ type: "technical", signal: "Death Cross", detail: "MA50 < MA200", impact: "negative" });
  }

  // Price vs MA200 (long-term trend)
  if (price > ma200) score += 3;
  else score -= 3;

  // --- RSI ---
  if (rsi < 30) {
    score += 8;
    signals.push({ type: "technical", signal: "Quá bán (RSI < 30)", detail: `RSI = ${rsi.toFixed(1)}`, impact: "positive" });
  } else if (rsi > 70) {
    score -= 8;
    signals.push({ type: "technical", signal: "Quá mua (RSI > 70)", detail: `RSI = ${rsi.toFixed(1)}`, impact: "negative" });
  } else if (rsi >= 40 && rsi <= 60) {
    score += 2;
  }

  // RSI divergence check (simple)
  if (priceData.length >= 10) {
    const tenAgo = priceData[priceData.length - 10];
    const priceDown = price < tenAgo.close;
    const rsiUp = rsi > (tenAgo.rsi_14 ?? 50);
    if (priceDown && rsiUp) {
      score += 5;
      signals.push({ type: "technical", signal: "Phân kỳ RSI dương", detail: "Giá giảm nhưng RSI tăng", impact: "positive" });
    }
  }

  // --- MACD ---
  if (macd > macdSignal && macd > 0) {
    score += 5;
    signals.push({ type: "technical", signal: "MACD bullish", detail: "MACD trên tín hiệu", impact: "positive" });
  } else if (macd < macdSignal && macd < 0) {
    score -= 5;
    signals.push({ type: "technical", signal: "MACD bearish", detail: "MACD dưới tín hiệu", impact: "negative" });
  }

  // MACD crossover
  const prevMacd = prev.macd ?? 0;
  const prevSig = prev.macd_signal ?? 0;
  if (prevMacd <= prevSig && macd > macdSignal) {
    score += 7;
    signals.push({ type: "technical", signal: "MACD cắt lên", detail: "Tín hiệu mua", impact: "positive" });
  } else if (prevMacd >= prevSig && macd < macdSignal) {
    score -= 5;
    signals.push({ type: "technical", signal: "MACD cắt xuống", detail: "Tín hiệu bán", impact: "negative" });
  }

  // MACD Histogram momentum
  const prevHist = prev.macd_hist ?? 0;
  if (macdHist > 0 && macdHist > prevHist) {
    score += 2;
  } else if (macdHist < 0 && macdHist < prevHist) {
    score -= 2;
  }

  // --- Bollinger Bands ---
  if (price <= bbLower) {
    score += 5;
    signals.push({ type: "technical", signal: "Chạm BB dưới", detail: "Có thể phục hồi", impact: "positive" });
  } else if (price >= bbUpper) {
    score -= 3;
    signals.push({ type: "technical", signal: "Chạm BB trên", detail: "Có thể điều chỉnh", impact: "negative" });
  }

  // BB width (squeeze)
  const bbWidth = bbUpper > 0 ? (bbUpper - bbLower) / ((bbUpper + bbLower) / 2) : 0;
  if (bbWidth < 0.05 && bbWidth > 0) {
    signals.push({ type: "technical", signal: "BB Squeeze", detail: "Biên độ hẹp, sắp breakout", impact: "neutral" });
  }

  // --- Volume ---
  const recentVolumes = priceData.slice(-20).map((d) => d.volume);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const volumeRatio = avgVolume > 0 ? latest.volume / avgVolume : 1;

  if (volumeRatio > 2 && price > prev.close) {
    score += 7;
    signals.push({ type: "technical", signal: "Volume đột biến + giá tăng", detail: `${volumeRatio.toFixed(1)}x trung bình`, impact: "positive" });
  } else if (volumeRatio > 1.5 && price > prev.close) {
    score += 4;
  } else if (volumeRatio > 2 && price < prev.close) {
    score -= 5;
    signals.push({ type: "technical", signal: "Volume đột biến + giá giảm", detail: "Áp lực bán mạnh", impact: "negative" });
  }

  // --- Volatility ---
  if (volatility > 0.03) {
    signals.push({ type: "technical", signal: "Biến động cao", detail: `Vol 20d = ${(volatility * 100).toFixed(1)}%`, impact: "neutral" });
  }

  // --- Support / Resistance ---
  const recent = priceData.slice(-60);
  const lows = recent.map((d) => d.low);
  const highs = recent.map((d) => d.high);
  const support = Math.min(...lows);
  const resistance = Math.max(...highs);

  if (price < support * 1.05 && price > support * 0.98) {
    score += 5;
    signals.push({ type: "technical", signal: "Gần vùng hỗ trợ", detail: `Hỗ trợ: ${support.toLocaleString()}`, impact: "positive" });
  }
  if (price > resistance * 0.95) {
    signals.push({ type: "technical", signal: "Gần kháng cự", detail: `Kháng cự: ${resistance.toLocaleString()}`, impact: "neutral" });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    data: {
      current_price: price, trend, rsi, ma20, ma50, ma200,
      macd, macd_signal: macdSignal, macd_hist: macdHist,
      support, resistance,
      volatility: volatility * 100,
      volume_ratio: parseFloat(volumeRatio.toFixed(2)),
      bb_upper: bbUpper, bb_lower: bbLower,
      daily_return: dailyReturn * 100,
      price_vs_ma20_pct: parseFloat(pctMa20.toFixed(2)),
      price_vs_ma50_pct: parseFloat(pctMa50.toFixed(2)),
      price_vs_ma200_pct: parseFloat(pctMa200.toFixed(2)),
    },
    signals,
  };
}

// --------------- Fundamental Analysis ---------------

function analyzeFundamentals(ratios: CompanyRatios): {
  score: number;
  data: FundamentalData;
  signals: Signal[];
} {
  const signals: Signal[] = [];
  let score = 50;

  const { pe, pb, ps, ev_per_ebitda, roe, roic, roa, eps,
    revenue_growth, net_profit_growth, gross_margin, net_profit_margin,
    ebit_margin, current_ratio, quick_ratio, de, interest_coverage, dividend } = ratios;

  // === VALUATION (max ~25 pts) ===
  if (pe !== undefined && pe > 0) {
    if (pe < 8) { score += 12; signals.push({ type: "fundamental", signal: "P/E rất thấp", detail: `P/E = ${pe.toFixed(1)}`, impact: "positive" }); }
    else if (pe < 12) { score += 8; signals.push({ type: "fundamental", signal: "P/E hấp dẫn", detail: `P/E = ${pe.toFixed(1)}`, impact: "positive" }); }
    else if (pe < 18) { score += 3; }
    else if (pe >= 30) { score -= 8; signals.push({ type: "fundamental", signal: "P/E cao", detail: `P/E = ${pe.toFixed(1)}`, impact: "negative" }); }
  }

  if (pb !== undefined && pb > 0) {
    if (pb < 1) { score += 8; signals.push({ type: "fundamental", signal: "P/B < 1", detail: `P/B = ${pb.toFixed(2)}`, impact: "positive" }); }
    else if (pb < 1.5) { score += 5; }
    else if (pb < 2.5) { score += 2; }
    else if (pb >= 4) { score -= 5; }
  }

  if (ev_per_ebitda !== undefined && ev_per_ebitda > 0) {
    if (ev_per_ebitda < 8) score += 3;
    else if (ev_per_ebitda > 20) score -= 3;
  }

  // === PROFITABILITY (max ~25 pts) ===
  if (roe !== undefined) {
    if (roe >= 25) { score += 12; signals.push({ type: "fundamental", signal: "ROE xuất sắc", detail: `ROE = ${roe.toFixed(1)}%`, impact: "positive" }); }
    else if (roe >= 18) { score += 8; signals.push({ type: "fundamental", signal: "ROE tốt", detail: `ROE = ${roe.toFixed(1)}%`, impact: "positive" }); }
    else if (roe >= 12) { score += 4; }
    else if (roe < 5 && roe >= 0) { score -= 5; }
    else if (roe !== undefined && roe < 0) { score -= 10; signals.push({ type: "fundamental", signal: "ROE âm", detail: "Lỗ vốn chủ", impact: "negative" }); }
  }

  if (roa !== undefined) {
    if (roa >= 12) score += 5;
    else if (roa >= 7) score += 3;
    else if (roa < 2 && roa >= 0) score -= 3;
  }

  if (net_profit_margin !== undefined) {
    if (net_profit_margin >= 20) { score += 5; signals.push({ type: "fundamental", signal: "Biên lợi nhuận cao", detail: `NPM = ${net_profit_margin.toFixed(1)}%`, impact: "positive" }); }
    else if (net_profit_margin >= 10) score += 3;
    else if (net_profit_margin < 3 && net_profit_margin >= 0) score -= 3;
    else if (net_profit_margin !== undefined && net_profit_margin < 0) { score -= 8; signals.push({ type: "fundamental", signal: "Lỗ ròng", detail: `NPM = ${net_profit_margin.toFixed(1)}%`, impact: "negative" }); }
  }

  if (gross_margin !== undefined) {
    if (gross_margin >= 40) score += 3;
    else if (gross_margin < 15) score -= 3;
  }

  if (eps !== undefined) {
    if (eps > 5000) { score += 5; signals.push({ type: "fundamental", signal: "EPS cao", detail: `EPS = ${eps.toFixed(0)}`, impact: "positive" }); }
    else if (eps > 2000) score += 3;
    else if (eps <= 0) { score -= 8; signals.push({ type: "fundamental", signal: "EPS âm", detail: "Công ty lỗ", impact: "negative" }); }
  }

  // === GROWTH (max ~15 pts) ===
  if (revenue_growth !== undefined) {
    if (revenue_growth > 30) { score += 8; signals.push({ type: "fundamental", signal: "Doanh thu tăng mạnh", detail: `+${revenue_growth.toFixed(1)}%`, impact: "positive" }); }
    else if (revenue_growth > 15) { score += 5; }
    else if (revenue_growth > 5) { score += 2; }
    else if (revenue_growth < -10) { score -= 5; signals.push({ type: "fundamental", signal: "Doanh thu sụt giảm", detail: `${revenue_growth.toFixed(1)}%`, impact: "negative" }); }
  }

  if (net_profit_growth !== undefined) {
    if (net_profit_growth > 30) { score += 7; signals.push({ type: "fundamental", signal: "Lợi nhuận tăng mạnh", detail: `+${net_profit_growth.toFixed(1)}%`, impact: "positive" }); }
    else if (net_profit_growth > 15) score += 4;
    else if (net_profit_growth < -20) { score -= 5; signals.push({ type: "fundamental", signal: "Lợi nhuận giảm mạnh", detail: `${net_profit_growth.toFixed(1)}%`, impact: "negative" }); }
  }

  // === SOLVENCY / LEVERAGE (max ~10 pts) ===
  if (current_ratio !== undefined) {
    if (current_ratio >= 2) score += 3;
    else if (current_ratio >= 1.5) score += 2;
    else if (current_ratio < 1) { score -= 5; signals.push({ type: "fundamental", signal: "Thanh khoản yếu", detail: `CR = ${current_ratio.toFixed(2)}`, impact: "negative" }); }
  }

  if (de !== undefined) {
    if (de < 0.5) score += 3;
    else if (de < 1) score += 1;
    else if (de > 3) { score -= 5; signals.push({ type: "fundamental", signal: "Đòn bẩy cao", detail: `D/E = ${de.toFixed(2)}`, impact: "negative" }); }
  }

  if (interest_coverage !== undefined) {
    if (interest_coverage > 5) score += 2;
    else if (interest_coverage < 1.5 && interest_coverage > 0) { score -= 3; signals.push({ type: "fundamental", signal: "Khả năng trả lãi yếu", detail: `ICR = ${interest_coverage.toFixed(1)}`, impact: "negative" }); }
  }

  // === DIVIDEND ===
  if (dividend !== undefined && dividend > 0) {
    score += 2;
    signals.push({ type: "fundamental", signal: "Có cổ tức", detail: `${dividend.toFixed(0)} VND/CP`, impact: "positive" });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    data: {
      pe, pb, ps, ev_per_ebitda, roe, roic, roa, eps, bvps: ratios.bvps,
      revenue: ratios.revenue, revenue_growth, net_profit: ratios.net_profit, net_profit_growth,
      gross_margin, net_profit_margin, ebit_margin,
      current_ratio, quick_ratio, de, interest_coverage,
      dividend, market_cap: ratios.market_cap,
    },
    signals,
  };
}

// --------------- Composite ---------------

function getAction(score: number): { action: string; confidence: string } {
  if (score >= 80) return { action: "Strong Buy", confidence: "Rất cao" };
  if (score >= 70) return { action: "Buy", confidence: "Cao" };
  if (score >= 60) return { action: "Watch", confidence: "Trung bình" };
  if (score >= 50) return { action: "Hold", confidence: "Thấp" };
  if (score >= 40) return { action: "Avoid", confidence: "Thấp" };
  return { action: "Sell", confidence: "Rất thấp" };
}

export async function analyzeStock(
  symbol: string
): Promise<{
  full_analysis: {
    technical: ReturnType<typeof analyzeTechnicals>;
    fundamental: ReturnType<typeof analyzeFundamentals>;
    macro: Awaited<ReturnType<typeof analyzeMacro>>;
  };
  strategies: Record<Strategy, StockAnalysisResult>;
}> {
  const [priceData, ratiosData, macro] = await Promise.all([
    getPriceHistory(symbol).catch(() => [] as StockOHLCV[]),
    getCompanyRatios(symbol).catch(() => null),
    analyzeMacro(),
  ]);

  const technical = analyzeTechnicals(priceData);
  const fundamental = analyzeFundamentals(ratiosData || { symbol });

  const strategies: Record<string, StockAnalysisResult> = {};

  for (const [key, config] of Object.entries(STRATEGY_CONFIGS)) {
    const compositeScore =
      fundamental.score * config.weights.fundamental +
      technical.score * config.weights.technical +
      macro.score * config.weights.macro;

    const { action, confidence } = getAction(compositeScore);

    strategies[key] = {
      symbol: symbol.toUpperCase(),
      score: compositeScore,
      action, confidence,
      current_price: technical.data.current_price,
      support: technical.data.support,
      resistance: technical.data.resistance,
      signals: [...fundamental.signals, ...technical.signals, ...macro.signals],
      fundamental_score: fundamental.score,
      technical_score: technical.score,
      macro_score: macro.score,
      data: {
        fundamental: fundamental.data,
        technical: technical.data,
        macro: macro.data,
      },
    };
  }

  return {
    full_analysis: { technical, fundamental, macro },
    strategies: strategies as Record<Strategy, StockAnalysisResult>,
  };
}

// --------------- Screening ---------------

export async function screenStocks(
  strategy: Strategy | "all" = "all",
  topN: number = 10
): Promise<{
  strategies: Record<string, StrategyResult>;
  market_overview: { num_gainers: number; num_losers: number; num_unchanged: number };
  macro: MacroData;
  generated_at: string;
}> {
  const [stockList, allRatios, breadthData, macro] = await Promise.all([
    getStockList(),
    getAllCompanyRatios(),
    getMarketBreadth().catch(() => []),
    analyzeMacro(),
  ]);

  let numGainers = 0, numLosers = 0, numUnchanged = 0;
  breadthData.forEach((b) => { numGainers += b.advancing; numLosers += b.declining; numUnchanged += b.unchanged; });
  if (breadthData.length === 0) {
    stockList.forEach((s) => {
      if (s.price_change_pct > 0) numGainers++;
      else if (s.price_change_pct < 0) numLosers++;
      else numUnchanged++;
    });
  }

  const ratiosMap = new Map<string, CompanyRatios>();
  allRatios.forEach((r) => { if (r.symbol) ratiosMap.set(r.symbol, r); });

  const candidates = stockList.filter((s) => s.total_volume > 10000 && s.close_price > 0);
  const sortedByVolume = [...candidates].sort((a, b) => b.total_volume - a.total_volume).slice(0, 100);

  type AnalysisItem = {
    stock: StockListItem;
    ratios: CompanyRatios;
    technical: ReturnType<typeof analyzeTechnicals>;
    fundamental: ReturnType<typeof analyzeFundamentals>;
  };
  const analysisResults: AnalysisItem[] = [];

  const batchSize = 10;
  for (let i = 0; i < sortedByVolume.length; i += batchSize) {
    const batch = sortedByVolume.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (stock) => {
        try {
          const priceData = await getPriceHistory(stock.symbol);
          const ratios = ratiosMap.get(stock.symbol) || { symbol: stock.symbol };
          const technical = analyzeTechnicals(priceData);
          const fundamental = analyzeFundamentals(ratios);
          return { stock, ratios, technical, fundamental } as AnalysisItem;
        } catch { return null; }
      })
    );
    results.forEach((r) => { if (r) analysisResults.push(r); });
  }

  const strategiesToProcess: Strategy[] =
    strategy === "all" ? ["investing", "trading"] : [strategy];

  const strategyResults: Record<string, StrategyResult> = {};

  for (const strat of strategiesToProcess) {
    const config = STRATEGY_CONFIGS[strat];

    const scored = analysisResults
      .map((r) => {
        const compositeScore =
          r.fundamental.score * config.weights.fundamental +
          r.technical.score * config.weights.technical +
          macro.score * config.weights.macro;

        const ratios = r.ratios;
        if (config.thresholds.pe_max && ratios.pe && ratios.pe > config.thresholds.pe_max) return null;
        if (config.thresholds.pb_max && ratios.pb && ratios.pb > config.thresholds.pb_max) return null;
        if (config.thresholds.roe_min && ratios.roe !== undefined && ratios.roe < config.thresholds.roe_min) return null;
        const rsi = r.technical.data.rsi;
        if (config.thresholds.rsi_min && rsi < config.thresholds.rsi_min) return null;
        if (config.thresholds.rsi_max && rsi > config.thresholds.rsi_max) return null;
        if (compositeScore < config.thresholds.min_score) return null;

        const { action, confidence } = getAction(compositeScore);
        return {
          symbol: r.stock.symbol, score: compositeScore, action, confidence,
          current_price: r.technical.data.current_price,
          support: r.technical.data.support, resistance: r.technical.data.resistance,
          signals: [...r.fundamental.signals, ...r.technical.signals, ...macro.signals],
          fundamental_score: r.fundamental.score,
          technical_score: r.technical.score,
          macro_score: macro.score,
          data: { fundamental: r.fundamental.data, technical: r.technical.data, macro: macro.data },
        } as StockAnalysisResult;
      })
      .filter((r): r is StockAnalysisResult => r !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    strategyResults[strat] = {
      strategy: strat, strategy_name: config.name,
      timeframe: config.timeframe, description: config.description,
      total_analyzed: analysisResults.length, total_qualified: scored.length,
      recommendations: scored, generated_at: new Date().toISOString(),
    };
  }

  return {
    strategies: strategyResults,
    market_overview: { num_gainers: numGainers, num_losers: numLosers, num_unchanged: numUnchanged },
    macro: macro.data,
    generated_at: new Date().toISOString(),
  };
}
