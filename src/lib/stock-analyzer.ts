/**
 * Stock Analyzer - TypeScript implementation
 * Replaces Python stock_analyzer.py
 * Analyzes stocks using data from dmanh-ai/vnstock/data
 */

import {
  getPriceHistory,
  getCompanyRatios,
  getStockList,
  getAllCompanyRatios,
  getMarketBreadth,
  type StockOHLCV,
  type CompanyRatios,
  type StockListItem,
} from "./vnstock-api";

// --------------- Types ---------------

export type Strategy = "investing" | "trading" | "speculation";

export interface Signal {
  type: string;
  signal: string;
  detail: string;
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
  support: number;
  resistance: number;
  volatility: number;
  volume_ratio: number;
  bb_upper: number;
  bb_lower: number;
}

export interface FundamentalData {
  pe?: number;
  pb?: number;
  roe?: number;
  roa?: number;
  eps?: number;
  market_cap?: number;
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
  data: {
    fundamental: FundamentalData;
    technical: TechnicalData;
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
    weights: { fundamental: number; technical: number };
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
    description: "Focus vào fundamentals, định giá hợp lý, tăng trưởng bền vững",
    weights: { fundamental: 0.65, technical: 0.35 },
    thresholds: {
      pe_max: 20,
      pb_max: 3,
      roe_min: 10,
      min_score: 55,
    },
  },
  trading: {
    name: "Trading",
    timeframe: "1 - 3 tuần",
    description: "Focus vào xu hướng kỹ thuật, momentum ngắn hạn",
    weights: { fundamental: 0.25, technical: 0.75 },
    thresholds: {
      rsi_min: 30,
      rsi_max: 70,
      min_score: 50,
    },
  },
  speculation: {
    name: "Đầu cơ",
    timeframe: "2 - 4 tuần",
    description: "Tận dụng biến động, momentum mạnh, cơ hội ngắn hạn",
    weights: { fundamental: 0.15, technical: 0.85 },
    thresholds: {
      min_score: 45,
    },
  },
};

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
        current_price: 0,
        trend: "N/A",
        rsi: 50,
        ma20: 0,
        ma50: 0,
        ma200: 0,
        macd: 0,
        macd_signal: 0,
        support: 0,
        resistance: 0,
        volatility: 0,
        volume_ratio: 1,
        bb_upper: 0,
        bb_lower: 0,
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
  const volatility = latest.volatility_20d ?? 0;
  const bbUpper = latest.bb_upper ?? price * 1.02;
  const bbLower = latest.bb_lower ?? price * 0.98;

  // Trend determination
  let trend = "Sideway";
  if (price > ma20 && ma20 > ma50) {
    trend = "Uptrend";
    score += 10;
    signals.push({
      type: "technical",
      signal: "Xu hướng tăng",
      detail: "Giá > MA20 > MA50",
    });
  } else if (price < ma20 && ma20 < ma50) {
    trend = "Downtrend";
    score -= 10;
    signals.push({
      type: "technical",
      signal: "Xu hướng giảm",
      detail: "Giá < MA20 < MA50",
    });
  }

  // Golden/Death Cross
  if (ma50 > ma200 && price > ma50) {
    score += 5;
    signals.push({
      type: "technical",
      signal: "Golden Cross",
      detail: "MA50 > MA200, xu hướng dài hạn tích cực",
    });
  } else if (ma50 < ma200 && price < ma50) {
    score -= 5;
  }

  // RSI analysis
  if (rsi < 30) {
    score += 8;
    signals.push({
      type: "technical",
      signal: "Quá bán (RSI < 30)",
      detail: `RSI = ${rsi.toFixed(1)}`,
    });
  } else if (rsi > 70) {
    score -= 8;
    signals.push({
      type: "technical",
      signal: "Quá mua (RSI > 70)",
      detail: `RSI = ${rsi.toFixed(1)}`,
    });
  } else if (rsi >= 40 && rsi <= 60) {
    score += 3;
  }

  // MACD
  if (macd > macdSignal && macd > 0) {
    score += 5;
    signals.push({
      type: "technical",
      signal: "MACD bullish",
      detail: "MACD trên đường tín hiệu",
    });
  } else if (macd < macdSignal && macd < 0) {
    score -= 5;
  }

  // MACD crossover
  const prevMacd = prev.macd ?? 0;
  const prevSignal = prev.macd_signal ?? 0;
  if (prevMacd <= prevSignal && macd > macdSignal) {
    score += 7;
    signals.push({
      type: "technical",
      signal: "MACD cắt lên",
      detail: "Tín hiệu mua ngắn hạn",
    });
  }

  // Bollinger Bands
  if (price <= bbLower) {
    score += 5;
    signals.push({
      type: "technical",
      signal: "Chạm BB dưới",
      detail: "Có thể phục hồi",
    });
  } else if (price >= bbUpper) {
    score -= 3;
  }

  // Volume analysis
  const recentVolumes = priceData.slice(-20).map((d) => d.volume);
  const avgVolume =
    recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const volumeRatio = avgVolume > 0 ? latest.volume / avgVolume : 1;

  if (volumeRatio > 1.5 && price > prev.close) {
    score += 5;
    signals.push({
      type: "technical",
      signal: "Volume đột biến",
      detail: `Volume gấp ${volumeRatio.toFixed(1)}x trung bình`,
    });
  }

  // Support and Resistance
  const recent = priceData.slice(-60);
  const lows = recent.map((d) => d.low);
  const highs = recent.map((d) => d.high);
  const support = Math.min(...lows);
  const resistance = Math.max(...highs);

  // Price near support = positive
  if (price < support * 1.05) {
    score += 5;
    signals.push({
      type: "technical",
      signal: "Gần vùng hỗ trợ",
      detail: `Hỗ trợ: ${support.toLocaleString()}`,
    });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    data: {
      current_price: price,
      trend,
      rsi,
      ma20,
      ma50,
      ma200,
      macd,
      macd_signal: macdSignal,
      support,
      resistance,
      volatility: volatility * 100,
      volume_ratio: parseFloat(volumeRatio.toFixed(2)),
      bb_upper: bbUpper,
      bb_lower: bbLower,
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

  const { pe, pb, roe, roa, eps } = ratios;

  // P/E analysis
  if (pe !== undefined) {
    if (pe > 0 && pe < 10) {
      score += 15;
      signals.push({
        type: "fundamental",
        signal: "P/E rất thấp",
        detail: `P/E = ${pe.toFixed(1)} (hấp dẫn)`,
      });
    } else if (pe >= 10 && pe < 15) {
      score += 10;
      signals.push({
        type: "fundamental",
        signal: "P/E hợp lý",
        detail: `P/E = ${pe.toFixed(1)}`,
      });
    } else if (pe >= 15 && pe < 25) {
      score += 3;
    } else if (pe >= 25) {
      score -= 5;
      signals.push({
        type: "fundamental",
        signal: "P/E cao",
        detail: `P/E = ${pe.toFixed(1)} (định giá cao)`,
      });
    }
  }

  // P/B analysis
  if (pb !== undefined) {
    if (pb > 0 && pb < 1) {
      score += 10;
      signals.push({
        type: "fundamental",
        signal: "P/B < 1",
        detail: `P/B = ${pb.toFixed(2)} (dưới giá trị sổ sách)`,
      });
    } else if (pb >= 1 && pb < 2) {
      score += 5;
    } else if (pb >= 3) {
      score -= 5;
    }
  }

  // ROE analysis
  if (roe !== undefined) {
    if (roe >= 20) {
      score += 15;
      signals.push({
        type: "fundamental",
        signal: "ROE xuất sắc",
        detail: `ROE = ${roe.toFixed(1)}%`,
      });
    } else if (roe >= 15) {
      score += 10;
      signals.push({
        type: "fundamental",
        signal: "ROE tốt",
        detail: `ROE = ${roe.toFixed(1)}%`,
      });
    } else if (roe >= 10) {
      score += 5;
    } else if (roe < 5 && roe >= 0) {
      score -= 5;
    }
  }

  // ROA analysis
  if (roa !== undefined) {
    if (roa >= 10) score += 5;
    else if (roa >= 5) score += 3;
  }

  // EPS analysis
  if (eps !== undefined) {
    if (eps > 5000) {
      score += 5;
      signals.push({
        type: "fundamental",
        signal: "EPS cao",
        detail: `EPS = ${eps.toFixed(0)}`,
      });
    } else if (eps > 2000) {
      score += 3;
    } else if (eps <= 0) {
      score -= 10;
      signals.push({
        type: "fundamental",
        signal: "EPS âm",
        detail: "Công ty đang lỗ",
      });
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    data: {
      pe,
      pb,
      roe,
      roa,
      eps,
      market_cap: ratios.market_cap,
    },
    signals,
  };
}

// --------------- Composite Analysis ---------------

function getAction(
  score: number
): { action: string; confidence: string } {
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
  full_analysis: { technical: ReturnType<typeof analyzeTechnicals>; fundamental: ReturnType<typeof analyzeFundamentals> };
  strategies: Record<Strategy, StockAnalysisResult>;
}> {
  const [priceData, ratiosData] = await Promise.all([
    getPriceHistory(symbol).catch(() => [] as StockOHLCV[]),
    getCompanyRatios(symbol).catch(() => null),
  ]);

  const technical = analyzeTechnicals(priceData);
  const fundamental = analyzeFundamentals(
    ratiosData || { symbol, pe: undefined, pb: undefined, roe: undefined, roa: undefined, eps: undefined }
  );

  const strategies: Record<string, StockAnalysisResult> = {};

  for (const [key, config] of Object.entries(STRATEGY_CONFIGS)) {
    const compositeScore =
      fundamental.score * config.weights.fundamental +
      technical.score * config.weights.technical;

    const { action, confidence } = getAction(compositeScore);

    strategies[key] = {
      symbol: symbol.toUpperCase(),
      score: compositeScore,
      action,
      confidence,
      current_price: technical.data.current_price,
      support: technical.data.support,
      resistance: technical.data.resistance,
      signals: [...fundamental.signals, ...technical.signals],
      fundamental_score: fundamental.score,
      technical_score: technical.score,
      data: {
        fundamental: fundamental.data,
        technical: technical.data,
      },
    };
  }

  return {
    full_analysis: { technical, fundamental },
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
  generated_at: string;
}> {
  // Get stock list & ratios
  const [stockList, allRatios, breadthData] = await Promise.all([
    getStockList(),
    getAllCompanyRatios(),
    getMarketBreadth().catch(() => []),
  ]);

  // Calculate market overview from breadth data
  let numGainers = 0;
  let numLosers = 0;
  let numUnchanged = 0;
  breadthData.forEach((b) => {
    numGainers += b.advancing;
    numLosers += b.declining;
    numUnchanged += b.unchanged;
  });

  // If no breadth data, calculate from stock list
  if (breadthData.length === 0) {
    stockList.forEach((s) => {
      if (s.price_change_pct > 0) numGainers++;
      else if (s.price_change_pct < 0) numLosers++;
      else numUnchanged++;
    });
  }

  // Build ratios lookup
  const ratiosMap = new Map<string, CompanyRatios>();
  allRatios.forEach((r) => {
    if (r.symbol) ratiosMap.set(r.symbol, r);
  });

  // Filter stocks with sufficient data and liquidity
  const candidates = stockList.filter(
    (s) => s.total_volume > 10000 && s.close_price > 0
  );

  // Analyze candidates (limit to top 100 by volume for performance)
  const sortedByVolume = [...candidates]
    .sort((a, b) => b.total_volume - a.total_volume)
    .slice(0, 100);

  const analysisResults: Array<{
    stock: StockListItem;
    ratios: CompanyRatios;
    priceData: StockOHLCV[];
    technical: ReturnType<typeof analyzeTechnicals>;
    fundamental: ReturnType<typeof analyzeFundamentals>;
  }> = [];

  // Batch fetch price data (in groups of 10)
  const batchSize = 10;
  for (let i = 0; i < sortedByVolume.length; i += batchSize) {
    const batch = sortedByVolume.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (stock) => {
        try {
          const priceData = await getPriceHistory(stock.symbol);
          const ratios = ratiosMap.get(stock.symbol) || {
            symbol: stock.symbol,
          };
          const technical = analyzeTechnicals(priceData);
          const fundamental = analyzeFundamentals(ratios);
          return { stock, ratios, priceData, technical, fundamental };
        } catch {
          return null;
        }
      })
    );
    results.forEach((r) => {
      if (r) analysisResults.push(r);
    });
  }

  // Build strategy results
  const strategiesToProcess: Strategy[] =
    strategy === "all"
      ? ["investing", "trading", "speculation"]
      : [strategy];

  const strategyResults: Record<string, StrategyResult> = {};

  for (const strat of strategiesToProcess) {
    const config = STRATEGY_CONFIGS[strat];

    const scored = analysisResults
      .map((r) => {
        const compositeScore =
          r.fundamental.score * config.weights.fundamental +
          r.technical.score * config.weights.technical;

        // Apply strategy-specific filters
        const ratios = r.ratios;
        if (config.thresholds.pe_max && ratios.pe && ratios.pe > config.thresholds.pe_max)
          return null;
        if (config.thresholds.pb_max && ratios.pb && ratios.pb > config.thresholds.pb_max)
          return null;
        if (config.thresholds.roe_min && ratios.roe !== undefined && ratios.roe < config.thresholds.roe_min)
          return null;

        const rsi = r.technical.data.rsi;
        if (config.thresholds.rsi_min && rsi < config.thresholds.rsi_min)
          return null;
        if (config.thresholds.rsi_max && rsi > config.thresholds.rsi_max)
          return null;

        if (compositeScore < config.thresholds.min_score) return null;

        const { action, confidence } = getAction(compositeScore);

        return {
          symbol: r.stock.symbol,
          score: compositeScore,
          action,
          confidence,
          current_price: r.technical.data.current_price,
          support: r.technical.data.support,
          resistance: r.technical.data.resistance,
          signals: [...r.fundamental.signals, ...r.technical.signals],
          fundamental_score: r.fundamental.score,
          technical_score: r.technical.score,
          data: {
            fundamental: r.fundamental.data,
            technical: r.technical.data,
          },
        } as StockAnalysisResult;
      })
      .filter((r): r is StockAnalysisResult => r !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    strategyResults[strat] = {
      strategy: strat,
      strategy_name: config.name,
      timeframe: config.timeframe,
      description: config.description,
      total_analyzed: analysisResults.length,
      total_qualified: scored.length,
      recommendations: scored,
      generated_at: new Date().toISOString(),
    };
  }

  return {
    strategies: strategyResults,
    market_overview: {
      num_gainers: numGainers,
      num_losers: numLosers,
      num_unchanged: numUnchanged,
    },
    generated_at: new Date().toISOString(),
  };
}
