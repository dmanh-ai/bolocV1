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
  type StockListItem,
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
  gtgd: number; // trading value 5-day avg in tỷ VND
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
    description: "VALID + Entry State + MTF≠WEAK | Entry được phép",
    filter: (s) => s.qtier === "VALID" && (s.state === "RETEST" || s.state === "CONFIRM" || s.state === "BREAKOUT") && s.mtf !== "WEAK",
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
    description: "BREAKOUT + QT≥VALID + VolR≥1.5 | Mới phá vỡ",
    filter: (s) => s.state === "BREAKOUT" && s.qtier !== "WATCH" && s.volRatio >= 1.5,
  },
  {
    key: "quality_retest",
    name: "Quality Retest",
    description: "RETEST + S_MAJOR + RQS≥60 | Pullback chất lượng",
    filter: (s) => s.state === "RETEST" && s.tpaths === "S_MAJOR" && s.rqs >= 60,
  },
  {
    key: "pipeline",
    name: "Pipeline (BASE)",
    description: "BASE + QT≥VALID + MI MID+ | Theo dõi",
    filter: (s) => s.state === "BASE" && s.qtier !== "WATCH" && (s.miph === "MID" || s.miph === "HIGH" || s.miph === "PEAK"),
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
    description: "Improving + PROBE + Score≥50 | Sắp breakout RS",
    filter: (s) => s.rsState === "Improving" && s.score >= 50,
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
  if (c >= m20 * 0.97 && c <= m20 * 1.03) rqs += 15; // near MA20
  if (volRatio < 1.2) rqs += 10; // low volume pullback = healthy
  if (l.rsi_14 && l.rsi_14 >= 40 && l.rsi_14 <= 55) rqs += 15; // RSI in good zone
  if (data.length >= 5) {
    const fiveDaysAgo = data[data.length - 5];
    if (c < fiveDaysAgo.close && c > m50) rqs += 10; // pulled back but above MA50
  }
  rqs = Math.min(100, Math.max(0, rqs));

  // State detection
  if (c > high60 * 0.99 && volRatio >= 1.5) {
    return { state: "BREAKOUT", volRatio, rqs };
  }
  if (c > high20 * 0.99 && volRatio >= 1.2 && c > m20) {
    return { state: "CONFIRM", volRatio, rqs };
  }
  // Retest: pulled back toward MA20 or MA50
  if (c >= m20 * 0.95 && c <= m20 * 1.02 && prev.close > m20 * 1.02 && c > m50) {
    return { state: "RETEST", volRatio, rqs };
  }
  if (c > m20 && m20 > m50) {
    // Check if MA20 is rising
    const m20_5ago = data[data.length - 6]?.sma_20 ?? m20;
    if (m20 > m20_5ago) {
      return { state: "TREND", volRatio, rqs };
    }
  }
  if (bbWidth < 0.06 && c > m50 * 0.97) {
    return { state: "BASE", volRatio, rqs };
  }

  return { state: "WEAK", volRatio, rqs };
}

function calcMTF(data: StockOHLCV[]): MTFSync {
  if (data.length < 5) return "WEAK";
  const l = data[data.length - 1];
  const c = l.close;
  const short = c > (l.sma_20 ?? c); // daily
  const med = c > (l.sma_50 ?? c); // weekly equivalent
  const long = c > (l.sma_200 ?? c); // monthly equivalent
  if (short && med && long) return "SYNC";
  if ((short && med) || (med && long)) return "PARTIAL";
  return "WEAK";
}

function calcQTier(ratios: CompanyRatios | undefined): QTier {
  if (!ratios) return "WATCH";
  const { roe, net_profit_growth, revenue_growth, current_ratio, de, net_profit_margin } = ratios;
  let score = 0;
  if (roe !== undefined && roe >= 15) score += 3;
  else if (roe !== undefined && roe >= 10) score += 2;
  else if (roe !== undefined && roe >= 5) score += 1;
  if (net_profit_growth !== undefined && net_profit_growth > 10) score += 2;
  else if (net_profit_growth !== undefined && net_profit_growth > 0) score += 1;
  if (revenue_growth !== undefined && revenue_growth > 10) score += 1;
  if (current_ratio !== undefined && current_ratio >= 1.2) score += 1;
  if (de !== undefined && de < 2) score += 1;
  if (net_profit_margin !== undefined && net_profit_margin > 10) score += 1;

  if (score >= 7) return "PRIME";
  if (score >= 4) return "VALID";
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

  // MI calculation (0-100)
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
  // Quality (0-500)
  if (to.qtier === "PRIME") rank += 450;
  else if (to.qtier === "VALID") rank += 300;
  else rank += 100;

  // Technical (0-500)
  rank += to.mi * 5; // mi 0-100 → 0-500

  // Momentum bonus (0-500)
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

  // Calculate returns over different periods
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

  // RS% is the weighted average
  const rsPct = parseFloat((rs20 * 0.5 + rs50 * 0.3 + rs200 * 0.2).toFixed(2));

  // RS trend (compare current rs20 with 5-day ago rs20)
  const sr20_5ago = stockData.length >= 26 ? calcReturn(stockData.slice(0, -5), 20) : sr20;
  const vr20_5ago = vnindexData.length >= 26 ? calcReturn(vnindexData.slice(0, -5), 20) : vr20;
  const rs20_5ago = sr20_5ago - vr20_5ago;
  const rsTrend = rs20 - rs20_5ago;

  // RS State
  let rsState: RSState;
  if (rsPct > 3 && rsTrend > 0) rsState = "Leading";
  else if (rsTrend > 0.5) rsState = "Improving";
  else if (Math.abs(rsTrend) <= 0.5) rsState = "Neutral";
  else if (rsTrend < -0.5 && rsPct > 0) rsState = "Weakening";
  else rsState = "Declining";

  // Vector
  let vector: RSVector;
  if (rs20 > 0 && rs50 > 0 && rs200 > 0) vector = "SYNC";
  else if (rs20 > 2) vector = "D_LEAD";
  else if (rs200 > 2) vector = "M_LEAD";
  else vector = "NEUT";

  // Score (0-100)
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
  // Step 1: Get all data sources
  const [stockList, allRatios, vnindexData] = await Promise.all([
    getStockList(),
    getAllCompanyRatios(),
    getIndexHistory("VNINDEX").catch(() => [] as StockOHLCV[]),
  ]);

  // Step 2: Build ratios map & get top 500 by market cap
  const ratiosMap = new Map<string, CompanyRatios>();
  allRatios.forEach((r) => { if (r.symbol) ratiosMap.set(r.symbol, r); });

  // Join stock list with ratios for market cap
  const stocksWithCap = stockList
    .filter((s) => s.close_price > 0 && s.total_volume > 0)
    .map((s) => ({
      ...s,
      marketCap: ratiosMap.get(s.symbol)?.market_cap ?? 0,
      gtgd: (s.close_price * s.total_volume) / 1e9, // tỷ VND
    }))
    .filter((s) => s.marketCap > 0)
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 500);

  // Step 3: Filter by liquidity (GTGD >= 5 tỷ)
  const liquidStocks = stocksWithCap.filter((s) => s.gtgd >= 5);

  // Step 4: Take top N for detailed analysis
  const toAnalyze = liquidStocks.slice(0, topN);

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

          // TO calculations
          const tpaths = calcTrendPath(priceData);
          const { state, volRatio, rqs } = calcState(priceData);
          const mtf = calcMTF(priceData);
          const qtier = calcQTier(ratios);
          const { miph, mi } = calcMIPhase(priceData);

          const toPartial: Omit<TOStock, "rank"> = {
            symbol: stock.symbol,
            price: stock.close_price,
            changePct: stock.price_change_pct,
            gtgd: parseFloat(stock.gtgd.toFixed(1)),
            state, tpaths, mtf, qtier, miph, mi, volRatio: parseFloat(volRatio.toFixed(2)), rqs,
          };
          const toStock: TOStock = { ...toPartial, rank: calcRank(toPartial) };

          // RS calculations
          const { rsPct, rsState, vector, score, isActive } = calcRS(priceData, vnindexData);
          const rsStock: RSStock = {
            symbol: stock.symbol,
            price: stock.close_price,
            changePct: stock.price_change_pct,
            gtgd: parseFloat(stock.gtgd.toFixed(1)),
            rsState, vector,
            bucket: calcBucket(score),
            rsPct, score, isActive,
          };

          return { toStock, rsStock };
        } catch { return null; }
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
