/**
 * Stock Analyzer V5.3 - TO Best Setups + RS Best Setups
 * Based on Technical Oscillator + Relative Strength methodology
 *
 * TO Tiers: Tier 1A (Ready), Tier 2A (Valid), S_MAJOR TREND,
 *           Fresh Breakout, Quality Retest, Pipeline (BASE)
 * RS Categories: SYNC+ACTIVE, D_LEAD+ACTIVE, M_LEAD+ACTIVE, PROBE Watch
 *
 * Metrics: STATE, TPATHS, MTF, QTIER, MIPH, MI, RANK, RS%, VECTOR, BUCKET, SCORE
 */

import {
  getPriceHistory,
  getAllCompanyRatios,
  getStockList,
  getIndexHistory,
  type StockOHLCV,
  type CompanyRatios,
} from "./vnstock-api";

// ==================== TYPES ====================

export type TrendPath = "S_MAJOR" | "MAJOR" | "MINOR" | "WEAK";
export type State = "BREAKOUT" | "CONFIRM" | "RETEST" | "TREND" | "BASE" | "WEAK";
export type MTFSync = "SYNC" | "PARTIAL" | "WEAK";
export type QTier = "PRIME" | "VALID" | "WATCH";
export type MIPhase = "PEAK" | "HIGH" | "MID" | "LOW";
export type RSState = "Leading" | "Improving" | "Neutral" | "Weakening" | "Declining";
export type RSVector = "SYNC" | "D_LEAD" | "M_LEAD" | "NEUT";
export type RSBucket = "PRIME" | "ELITE" | "CORE" | "QUALITY" | "WEAK";

export interface TOStock {
  symbol: string;
  price: number;
  changePct: number;
  gtgd: number; // trading value in tỷ VND
  state: State;
  tpaths: TrendPath;
  mtf: MTFSync;
  qtier: QTier;
  miph: MIPhase;
  mi: number; // 0-100
  rank: number; // composite score
  volRatio: number;
  rqs: number; // retest quality score
}

export interface RSStock {
  symbol: string;
  price: number;
  changePct: number;
  gtgd: number;
  rsState: RSState;
  vector: RSVector;
  bucket: RSBucket;
  rsPct: number; // RS vs VN-Index %
  score: number; // 0-100
  isActive: boolean;
}

export type TOTier = "tier1a" | "tier2a" | "s_major_trend" | "fresh_breakout" | "quality_retest" | "pipeline";
export type RSCategory = "sync_active" | "d_lead_active" | "m_lead_active" | "probe_watch";

export interface TOTierConfig {
  key: TOTier;
  name: string;
  description: string;
  filter: (s: TOStock) => boolean;
}

export interface RSCategoryConfig {
  key: RSCategory;
  name: string;
  description: string;
  filter: (s: RSStock) => boolean;
}

export interface AnalysisResult {
  totalStocks: number;
  toStocks: TOStock[];
  rsStocks: RSStock[];
  toTiers: Record<TOTier, TOStock[]>;
  rsCats: Record<RSCategory, RSStock[]>;
  counts: {
    prime: number;
    valid: number;
    tier1a: number;
    tier2a: number;
    active: number;
    sync: number;
    dLead: number;
    mLead: number;
  };
  generatedAt: string;
}

// ==================== TIER/CATEGORY CONFIGS ====================

export const TO_TIERS: TOTierConfig[] = [
  {
    key: "tier1a",
    name: "Tier 1A - Ready",
    description: "PRIME + Entry State + SYNC | Entry tối ưu",
    filter: (s) => s.qtier === "PRIME" && (s.state === "RETEST" || s.state === "CONFIRM") && s.mtf === "SYNC",
  },
  {
    key: "tier2a",
    name: "Tier 2A - Valid",
    description: "VALID+ + Entry State + MTF≠WEAK | Entry được phép",
    filter: (s) => s.qtier !== "WATCH" && (s.state === "RETEST" || s.state === "CONFIRM" || s.state === "BREAKOUT") && s.mtf !== "WEAK",
  },
  {
    key: "s_major_trend",
    name: "S_MAJOR TREND",
    description: "S_MAJOR + TREND + MI HIGH/PEAK | Giữ vị thế",
    filter: (s) => s.tpaths === "S_MAJOR" && s.state === "TREND" && (s.miph === "HIGH" || s.miph === "PEAK"),
  },
  {
    key: "fresh_breakout",
    name: "Fresh Breakout",
    description: "BREAKOUT + VolR≥1.3 | Mới phá vỡ",
    filter: (s) => s.state === "BREAKOUT" && s.volRatio >= 1.3,
  },
  {
    key: "quality_retest",
    name: "Quality Retest",
    description: "RETEST + MAJOR+ + RQS≥55 | Pullback chất lượng",
    filter: (s) => s.state === "RETEST" && (s.tpaths === "S_MAJOR" || s.tpaths === "MAJOR") && s.rqs >= 55,
  },
  {
    key: "pipeline",
    name: "Pipeline (BASE)",
    description: "BASE + MI MID+ | Theo dõi",
    filter: (s) => s.state === "BASE" && (s.miph === "MID" || s.miph === "HIGH" || s.miph === "PEAK"),
  },
];

export const RS_CATEGORIES: RSCategoryConfig[] = [
  {
    key: "sync_active",
    name: "SYNC + ACTIVE",
    description: "RS SYNC + ACTIVE | 3 TF đồng thuận",
    filter: (s) => s.vector === "SYNC" && s.isActive,
  },
  {
    key: "d_lead_active",
    name: "D_LEAD + ACTIVE",
    description: "RS D_LEAD + ACTIVE | Daily dẫn đầu",
    filter: (s) => s.vector === "D_LEAD" && s.isActive,
  },
  {
    key: "m_lead_active",
    name: "M_LEAD + ACTIVE",
    description: "RS M_LEAD + ACTIVE | Monthly dẫn",
    filter: (s) => s.vector === "M_LEAD" && s.isActive,
  },
  {
    key: "probe_watch",
    name: "PROBE Watch",
    description: "Improving + Score≥45 | Sắp breakout RS",
    filter: (s) => s.rsState === "Improving" && s.score >= 45,
  },
];

// ==================== CALCULATIONS ====================

function calcTrendPath(data: StockOHLCV[]): TrendPath {
  if (data.length < 5) return "WEAK";
  const l = data[data.length - 1];
  const c = l.close;
  const m20 = l.sma_20 ?? c;
  const m50 = l.sma_50 ?? c;
  const m200 = l.sma_200 ?? c;
  if (c > m20 && m20 > m50 && m50 > m200) return "S_MAJOR";
  if (c > m50 && m50 > m200) return "MAJOR";
  if (c > m200) return "MINOR";
  return "WEAK";
}

function calcState(data: StockOHLCV[]): { state: State; volRatio: number; rqs: number } {
  if (data.length < 20) return { state: "WEAK", volRatio: 1, rqs: 0 };

  const l = data[data.length - 1];
  const prev = data[data.length - 2];
  const c = l.close;
  const m20 = l.sma_20 ?? c;
  const m50 = l.sma_50 ?? c;
  const bbU = l.bb_upper ?? c * 1.02;
  const bbL = l.bb_lower ?? c * 0.98;

  // Volume ratio (5-day avg vs 20-day avg)
  const vol5 = data.slice(-5).reduce((s, d) => s + d.volume, 0) / 5;
  const vol20 = data.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
  const volRatio = vol20 > 0 ? vol5 / vol20 : 1;

  // 60-day high/low
  const recent60 = data.slice(-60);
  const high60 = Math.max(...recent60.map((d) => d.high));
  const high20 = Math.max(...data.slice(-20).map((d) => d.high));

  // BB width for squeeze detection
  const bbWidth = bbU > 0 ? (bbU - bbL) / ((bbU + bbL) / 2) : 0.1;

  // Retest Quality Score (RQS)
  let rqs = 50;
  if (c >= m20 * 0.97 && c <= m20 * 1.03) rqs += 15;
  if (volRatio < 1.2) rqs += 10;
  if (l.rsi_14 && l.rsi_14 >= 40 && l.rsi_14 <= 55) rqs += 15;
  if (data.length >= 5) {
    const fiveDaysAgo = data[data.length - 5];
    if (c < fiveDaysAgo.close && c > m50) rqs += 10;
  }
  rqs = Math.min(100, Math.max(0, rqs));

  // State detection - ordered by priority
  if (c > high60 * 0.99 && volRatio >= 1.3) {
    return { state: "BREAKOUT", volRatio, rqs };
  }
  if (c > high20 * 0.98 && volRatio >= 1.1 && c > m20) {
    return { state: "CONFIRM", volRatio, rqs };
  }
  if (c >= m20 * 0.95 && c <= m20 * 1.03 && c > m50) {
    // Near MA20 and above MA50 → potential retest
    if (prev.close > m20 * 1.01 || volRatio < 0.9) {
      return { state: "RETEST", volRatio, rqs };
    }
  }
  if (c > m20 && m20 > m50) {
    const m20_5ago = data[data.length - 6]?.sma_20 ?? m20;
    if (m20 >= m20_5ago) {
      return { state: "TREND", volRatio, rqs };
    }
  }
  if (bbWidth < 0.08 && c > m50 * 0.95) {
    return { state: "BASE", volRatio, rqs };
  }

  return { state: "WEAK", volRatio, rqs };
}

function calcMTF(data: StockOHLCV[]): MTFSync {
  if (data.length < 5) return "WEAK";
  const l = data[data.length - 1];
  const c = l.close;
  const short = c > (l.sma_20 ?? c);
  const med = c > (l.sma_50 ?? c);
  const long = c > (l.sma_200 ?? c);
  if (short && med && long) return "SYNC";
  if ((short && med) || (med && long)) return "PARTIAL";
  return "WEAK";
}

/**
 * Quality Tier based on fundamentals.
 * NOTE: ratios from CSV are in DECIMAL form (0.15 = 15%).
 * We convert to percentage for comparison.
 *
 * Data coverage is limited (many major stocks missing from company_ratios.csv,
 * some fields are 0/undefined). Scoring compensates with:
 * - PE/EPS-based quality signals
 * - Gross margin as fallback for net margin
 * - Lower thresholds (PRIME>=5, VALID>=3)
 * - Stocks without any ratio data default to VALID (they are in our
 *   universe because they have price history = at least tracked stocks)
 */
function calcQTier(ratios: CompanyRatios | undefined): QTier {
  // Stocks without fundamental data but with price CSV → assume VALID
  // (they are in our universe = large-cap tracked stocks)
  if (!ratios) return "VALID";

  // Convert decimal ratios to percentage
  const roe = ratios.roe !== undefined ? ratios.roe * 100 : undefined;
  const npg = ratios.net_profit_growth !== undefined ? ratios.net_profit_growth * 100 : undefined;
  const rg = ratios.revenue_growth !== undefined ? ratios.revenue_growth * 100 : undefined;
  const npm = ratios.net_profit_margin !== undefined ? ratios.net_profit_margin * 100 : undefined;
  const gm = ratios.gross_margin !== undefined ? ratios.gross_margin * 100 : undefined;
  const cr = ratios.current_ratio;
  const de = ratios.de;
  const pe = ratios.pe;
  const eps = ratios.eps;

  let score = 0;

  // ROE (max 3) - primary quality indicator
  if (roe !== undefined && roe >= 15) score += 3;
  else if (roe !== undefined && roe >= 10) score += 2;
  else if (roe !== undefined && roe >= 5) score += 1;

  // Growth (max 3)
  if (npg !== undefined && npg > 10) score += 2;
  else if (npg !== undefined && npg > 0) score += 1;
  if (rg !== undefined && rg > 5) score += 1;

  // Valuation (max 2) - PE-based quality
  if (pe !== undefined && pe > 0 && pe < 15) score += 2;
  else if (pe !== undefined && pe > 0 && pe < 25) score += 1;

  // EPS quality (max 1)
  if (eps !== undefined && eps > 2000) score += 1;

  // Margins (max 1) - use gross margin as fallback
  if (npm !== undefined && npm > 8) score += 1;
  else if (gm !== undefined && gm > 15) score += 1;

  // Solvency (max 2)
  if (cr !== undefined && cr >= 1.2) score += 1;
  if (de !== undefined && de < 2) score += 1;

  // Max possible: 3 + 3 + 2 + 1 + 1 + 2 = 12
  if (score >= 5) return "PRIME";
  if (score >= 2) return "VALID";
  return "WATCH";
}

function calcMIPhase(data: StockOHLCV[]): { miph: MIPhase; mi: number } {
  if (data.length < 5) return { miph: "LOW", mi: 30 };
  const l = data[data.length - 1];
  const prev = data[data.length - 2];
  const c = l.close;
  const rsi = l.rsi_14 ?? 50;
  const macd = l.macd ?? 0;
  const macdSig = l.macd_signal ?? 0;
  const macdHist = l.macd_hist ?? 0;
  const prevHist = prev.macd_hist ?? 0;
  const m20 = l.sma_20 ?? c;
  const m50 = l.sma_50 ?? c;
  const m200 = l.sma_200 ?? c;

  let mi = 0;

  // RSI component (0-25)
  if (rsi >= 50) mi += Math.min(25, (rsi - 30) * 0.625);
  else mi += Math.max(0, (rsi - 20) * 0.5);

  // MACD component (0-25)
  if (macd > macdSig) mi += 10;
  if (macd > 0) mi += 5;
  if (macdHist > 0 && macdHist > prevHist) mi += 10;
  else if (macdHist > 0) mi += 5;

  // Trend component (0-25)
  if (c > m20) mi += 8;
  if (m20 > m50) mi += 8;
  if (m50 > m200) mi += 9;

  // Volume & momentum component (0-25)
  const vol5 = data.slice(-5).reduce((s, d) => s + d.volume, 0) / 5;
  const vol20 = data.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
  const vr = vol20 > 0 ? vol5 / vol20 : 1;
  if (vr > 1.5 && c > prev.close) mi += 15;
  else if (vr > 1.0 && c > prev.close) mi += 10;
  else if (c > prev.close) mi += 5;

  mi = Math.min(100, Math.max(0, Math.round(mi)));

  let miph: MIPhase;
  if (rsi >= 60 && macd > macdSig && c > m20) miph = "PEAK";
  else if (rsi >= 50 && (macd > 0 || c > m20)) miph = "HIGH";
  else if (rsi >= 40) miph = "MID";
  else miph = "LOW";

  return { miph, mi };
}

function calcRank(to: Omit<TOStock, "rank">): number {
  let rank = 0;
  if (to.qtier === "PRIME") rank += 450;
  else if (to.qtier === "VALID") rank += 300;
  else rank += 100;

  rank += to.mi * 5;

  if (to.tpaths === "S_MAJOR") rank += 200;
  else if (to.tpaths === "MAJOR") rank += 130;
  else if (to.tpaths === "MINOR") rank += 60;
  if (to.mtf === "SYNC") rank += 100;
  else if (to.mtf === "PARTIAL") rank += 50;
  if (to.state === "BREAKOUT") rank += 80;
  else if (to.state === "CONFIRM") rank += 70;
  else if (to.state === "TREND") rank += 50;
  else if (to.state === "RETEST") rank += 60;

  return Math.round(rank);
}

// RS calculations
function calcRS(
  stockData: StockOHLCV[],
  vnindexData: StockOHLCV[]
): { rsPct: number; rsState: RSState; vector: RSVector; score: number; isActive: boolean } {
  if (stockData.length < 20 || vnindexData.length < 20) {
    return { rsPct: 0, rsState: "Neutral", vector: "NEUT", score: 30, isActive: false };
  }

  const sLen = stockData.length;
  const vLen = vnindexData.length;

  const calcReturn = (data: StockOHLCV[], periods: number) => {
    if (data.length < periods + 1) return 0;
    const now = data[data.length - 1].close;
    const then = data[data.length - 1 - periods].close;
    return then > 0 ? ((now - then) / then) * 100 : 0;
  };

  const sr20 = calcReturn(stockData, 20);
  const sr50 = calcReturn(stockData, Math.min(50, sLen - 1));
  const sr200 = calcReturn(stockData, Math.min(200, sLen - 1));

  const vr20 = calcReturn(vnindexData, 20);
  const vr50 = calcReturn(vnindexData, Math.min(50, vLen - 1));
  const vr200 = calcReturn(vnindexData, Math.min(200, vLen - 1));

  const rs20 = sr20 - vr20;
  const rs50 = sr50 - vr50;
  const rs200 = sr200 - vr200;

  const rsPct = parseFloat((rs20 * 0.5 + rs50 * 0.3 + rs200 * 0.2).toFixed(2));

  const sr20_5ago = stockData.length >= 26 ? calcReturn(stockData.slice(0, -5), 20) : sr20;
  const vr20_5ago = vnindexData.length >= 26 ? calcReturn(vnindexData.slice(0, -5), 20) : vr20;
  const rs20_5ago = sr20_5ago - vr20_5ago;
  const rsTrend = rs20 - rs20_5ago;

  let rsState: RSState;
  if (rsPct > 3 && rsTrend > 0) rsState = "Leading";
  else if (rsTrend > 0.5) rsState = "Improving";
  else if (Math.abs(rsTrend) <= 0.5) rsState = "Neutral";
  else if (rsTrend < -0.5 && rsPct > 0) rsState = "Weakening";
  else rsState = "Declining";

  let vector: RSVector;
  if (rs20 > 0 && rs50 > 0 && rs200 > 0) vector = "SYNC";
  else if (rs20 > 2) vector = "D_LEAD";
  else if (rs200 > 2) vector = "M_LEAD";
  else vector = "NEUT";

  let score = 50;
  score += Math.min(20, Math.max(-20, rsPct * 2));
  score += Math.min(10, Math.max(-10, rsTrend * 3));
  if (vector === "SYNC") score += 10;
  else if (vector === "D_LEAD" || vector === "M_LEAD") score += 5;
  if (rsState === "Leading") score += 5;
  score = Math.min(100, Math.max(0, Math.round(score)));

  const isActive = rsState === "Leading" || rsState === "Improving";

  return { rsPct, rsState, vector, score, isActive };
}

function calcBucket(score: number): RSBucket {
  if (score >= 85) return "PRIME";
  if (score >= 75) return "ELITE";
  if (score >= 60) return "CORE";
  if (score >= 50) return "QUALITY";
  return "WEAK";
}

// ==================== MAIN ANALYSIS ====================

export async function runFullAnalysis(topN = 200): Promise<AnalysisResult> {
  // Step 1: Get all data sources in parallel
  const [stockList, allRatios, vnindexRaw] = await Promise.all([
    getStockList(),
    getAllCompanyRatios(),
    getIndexHistory("VNINDEX").catch(() => []),
  ]);

  // Cast vnindex data (IndexData has all the fields we need: close)
  const vnindexData = vnindexRaw as unknown as StockOHLCV[];

  // Step 2: Build lookup maps
  const ratiosMap = new Map<string, CompanyRatios>();
  allRatios.forEach((r) => {
    if (r.symbol) ratiosMap.set(r.symbol.toUpperCase(), r);
  });

  const tradingMap = new Map<string, { close_price: number; price_change_pct: number; total_volume: number }>();
  stockList.forEach((s) => {
    if (s.symbol) tradingMap.set(s.symbol.toUpperCase(), s);
  });

  // Step 3: Build universe from BOTH company_ratios AND trading_stats
  // Use company_ratios as base (400+ stocks), enrich with trading data
  const symbolSet = new Set<string>();
  allRatios.forEach((r) => { if (r.symbol) symbolSet.add(r.symbol.toUpperCase()); });
  stockList.forEach((s) => { if (s.symbol) symbolSet.add(s.symbol.toUpperCase()); });

  // Compute market cap: close_price * issue_share
  // If no trading data, estimate from pe * eps
  const universe = Array.from(symbolSet).map((sym) => {
    const ratios = ratiosMap.get(sym);
    const trading = tradingMap.get(sym);

    const estimatedPrice = (ratios?.pe ?? 0) * (ratios?.eps ?? 0);
    const closePrice = trading?.close_price ?? (estimatedPrice > 0 ? estimatedPrice : 0);
    const issueShare = ratios?.issue_share ?? 0;
    const marketCap = closePrice > 0 && issueShare > 0
      ? closePrice * issueShare
      : (ratios?.ev ?? 0); // fallback to enterprise value

    const volume = trading?.total_volume ?? 0;
    const gtgd = closePrice > 0 && volume > 0
      ? (closePrice * volume) / 1e9
      : 0;

    return {
      symbol: sym,
      closePrice,
      changePct: trading?.price_change_pct ?? 0,
      volume,
      marketCap,
      gtgd,
    };
  })
    .filter((s) => s.closePrice > 0)
    .sort((a, b) => b.marketCap - a.marketCap);

  // Step 4: Take top N symbols for detailed analysis (no strict GTGD filter)
  const toAnalyze = universe.slice(0, topN);

  // Step 5: Batch fetch price histories
  const toStocks: TOStock[] = [];
  const rsStocks: RSStock[] = [];

  const batchSize = 15;
  for (let i = 0; i < toAnalyze.length; i += batchSize) {
    const batch = toAnalyze.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (stock) => {
        try {
          const priceData = await getPriceHistory(stock.symbol);
          if (priceData.length < 10) return null;

          const ratios = ratiosMap.get(stock.symbol);

          // Get latest price from price data if available
          const latestPrice = priceData[priceData.length - 1]?.close ?? stock.closePrice;
          const prevPrice = priceData.length >= 2 ? priceData[priceData.length - 2].close : latestPrice;
          // stock.changePct from trading_stats is in decimal (0.02 = 2%), multiply by 100 for fallback
          const changePct = prevPrice > 0 ? ((latestPrice - prevPrice) / prevPrice) * 100 : stock.changePct * 100;

          // Compute GTGD from recent price data (5-day avg)
          // Stock CSV prices are in thousands VND → close * volume = value in 1000 VND
          // To get tỷ VND: divide by 1e6 (1000 VND * 1e6 = 1e9 VND = 1 tỷ)
          const recentVols = priceData.slice(-5);
          const avgVal = recentVols.reduce((s, d) => s + d.close * d.volume, 0) / recentVols.length;
          const gtgd = parseFloat((avgVal / 1e6).toFixed(1));

          // TO calculations
          const tpaths = calcTrendPath(priceData);
          const { state, volRatio, rqs } = calcState(priceData);
          const mtf = calcMTF(priceData);
          const qtier = calcQTier(ratios);
          const { miph, mi } = calcMIPhase(priceData);

          const toPartial: Omit<TOStock, "rank"> = {
            symbol: stock.symbol,
            price: latestPrice,
            changePct: parseFloat(changePct.toFixed(2)),
            gtgd,
            state, tpaths, mtf, qtier, miph, mi,
            volRatio: parseFloat(volRatio.toFixed(2)),
            rqs,
          };
          const toStock: TOStock = { ...toPartial, rank: calcRank(toPartial) };

          // RS calculations
          const { rsPct, rsState, vector, score, isActive } = calcRS(priceData, vnindexData);
          const rsStock: RSStock = {
            symbol: stock.symbol,
            price: latestPrice,
            changePct: parseFloat(changePct.toFixed(2)),
            gtgd,
            rsState, vector,
            bucket: calcBucket(score),
            rsPct, score, isActive,
          };

          return { toStock, rsStock };
        } catch {
          return null;
        }
      })
    );
    results.forEach((r) => {
      if (r) {
        toStocks.push(r.toStock);
        rsStocks.push(r.rsStock);
      }
    });
  }

  // Step 6: Sort and categorize
  toStocks.sort((a, b) => b.rank - a.rank);
  rsStocks.sort((a, b) => b.score - a.score);

  const toTiers = {} as Record<TOTier, TOStock[]>;
  for (const tier of TO_TIERS) {
    toTiers[tier.key] = toStocks.filter(tier.filter);
  }

  const rsCats = {} as Record<RSCategory, RSStock[]>;
  for (const cat of RS_CATEGORIES) {
    rsCats[cat.key] = rsStocks.filter(cat.filter);
  }

  return {
    totalStocks: toStocks.length,
    toStocks,
    rsStocks,
    toTiers,
    rsCats,
    counts: {
      prime: toStocks.filter((s) => s.qtier === "PRIME").length,
      valid: toStocks.filter((s) => s.qtier === "VALID").length,
      tier1a: toTiers.tier1a.length,
      tier2a: toTiers.tier2a.length,
      active: rsStocks.filter((s) => s.isActive).length,
      sync: rsCats.sync_active.length,
      dLead: rsCats.d_lead_active.length,
      mLead: rsCats.m_lead_active.length,
    },
    generatedAt: new Date().toISOString(),
  };
}
