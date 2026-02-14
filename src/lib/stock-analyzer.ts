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
  getMarketBreadth,
  getForeignFlow,
  computeRealBreadth,
  fetchAllSymbols,
  type StockOHLCV,
  type CompanyRatios,
  type IndexData,
  type MarketBreadth,
  type ForeignFlow,
  type RealBreadthData,
} from "./vnstock-api";

// ==================== TYPES ====================

export type TrendPath = "S_MAJOR" | "MAJOR" | "MINOR" | "WEAK";
export type State = "BREAKOUT" | "CONFIRM" | "RETEST" | "TREND" | "BASE" | "WEAK";
export type MTFSync = "SYNC" | "PARTIAL" | "WEAK";
export type QTier = "PRIME" | "VALID" | "WATCH" | "AVOID";
export type MIPhase = "PEAK" | "HIGH" | "MID" | "LOW";
export type RSState = "Leading" | "Improving" | "Neutral" | "Weakening" | "Declining";
export type RSVector = "SYNC" | "D_LEAD" | "M_LEAD" | "WEAK" | "NEUT";
export type RSBucket = "PRIME" | "ELITE" | "CORE" | "QUALITY" | "WEAK";

export type RegimeState = "BULL" | "NEUTRAL" | "BEAR" | "BLOCKED";

export type BreadthQuadrant = "Q1" | "Q2" | "Q3" | "Q4";
export type RegimeMode = "STABLE" | "BLOCKED" | "ROTATING";
export type CeilingStatus = "CLEAR" | "BLOCKED";
export type RotationStatus = "SYNC" | "DESYNC";

export interface IndexOverview {
  symbol: string;
  state: string; // e.g., "7.EXIT"
  stateNum: number; // e.g., 7
  mi: number;
  miPhase: MIPhase;
  tpath: TrendPath;
  miD: number; // daily MI
  miW: number; // weekly MI
  miM: number; // monthly MI
  dMI_D: number; // delta MI daily
  dMI_W: number; // delta MI weekly
  bqs: number; // base quality score
  rqs: number; // retest quality score
  volX: number; // volume ratio
  close?: number; // optional: closing price
  changePct?: number; // optional: percentage change
}

export interface BreadthIndex {
  symbol: string;
  quadrant: BreadthQuadrant;
  aboveEMA50Pct: number;
  slope5d: number;
  slope10d?: number;
  accel?: number;
}

export interface RegimeLayer {
  score: number;    // -100 to +100
  signal: RegimeState;
  label: string;
  details: string[];
}

// Layer 1: VNINDEX TO (Ceiling Check)
export interface Layer1Ceiling extends RegimeLayer {
  status: CeilingStatus;
  broken: boolean;
  weak: boolean;
  badge: string; // "LIMITED", "CLEAR"
}

// Layer 2: Components (Rotation)
export interface Layer2Components extends RegimeLayer {
  status: RotationStatus;
  vn30Status: string; // "OUTPERFORM", "UNDERPERFORM", "NEUTRAL"
  vnmidStatus: string;
  vn30dMI: number;
  vnmiddMI: number;
  rotation: string; // "None", "VN30→VNMID", etc.
  badge: string; // "CHECK", "ROTATING"
}

// Layer 3: Breadth V2 (Quadrant)
export interface Layer3Breadth extends RegimeLayer {
  allStockQuadrant: BreadthQuadrant;
  vn30Breadth: BreadthIndex;
  vnmidBreadth: BreadthIndex;
  allStockAboveEMA50: number;
  base: string; // "CAU" (Cautious), "NEU" (Neutral), "AGG" (Aggressive)
  badge: string; // "ALL_WEAK", "ALL_STRONG", "MIXED"
}

// Layer 4: Regime Output
export interface Layer4Output extends RegimeLayer {
  base: string;
  ceilingStatus: CeilingStatus;
  direction: string; // "STABLE", "IMPROVING", "DETERIORATING"
  mode: RegimeMode;
  lead: string; // From Layer 3 badge
  badge: string; // "LOW", "MED", "HIGH"
}

export interface MarketRegime {
  regime: RegimeState;
  score: number;        // -100 to +100
  allocation: string;   // "80-100%" etc.
  allocDesc: string;
  
  // New 4-layer structure
  layer1Ceiling: Layer1Ceiling;
  layer2Components: Layer2Components;
  layer3Breadth: Layer3Breadth;
  layer4Output: Layer4Output;
  
  // Index Overview
  indices: IndexOverview[];
  
  // Legacy layers (kept for backward compatibility)
  indexLayer?: RegimeLayer & {
    vnindex: number;
    change: number;
    changePct: number;
    sma20: number;
    sma50: number;
    sma200: number;
    rsi: number;
    macd: number;
    macdSignal: number;
    trend: string;
  };
  breadthLayer?: RegimeLayer & {
    advancing: number;
    declining: number;
    unchanged: number;
    adRatio: number;
    netAD: number;
  };
  momentumLayer?: RegimeLayer & {
    primeCount: number;
    validCount: number;
    breakoutCount: number;
    trendCount: number;
    avgMI: number;
  };
  flowLayer?: RegimeLayer & {
    foreignNetValue: number;
    foreignNetVolume: number;
    flowBias: string;
  };
}

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
  totalStocks: number;      // filtered stocks (GTGD >= 10B)
  totalUniverse: number;    // all analyzed stocks
  toStocks: TOStock[];
  rsStocks: RSStock[];
  toTiers: Record<TOTier, TOStock[]>;
  rsCats: Record<RSCategory, RSStock[]>;
  counts: {
    prime: number;
    valid: number;
    watch: number;
    avoid: number;
    tier1a: number;
    tier2a: number;
    active: number;
    sync: number;
    dLead: number;
    mLead: number;
    weak: number;
    neut: number;
  };
  distribution: {
    qtier: { total: number; prime: number; valid: number; watch: number; avoid: number };
    rsVector: { total: number; sync: number; dLead: number; mLead: number; weak: number; neut: number };
  };
  regime: MarketRegime;
  generatedAt: string;
}

// ==================== TIER/CATEGORY CONFIGS ====================

// Helper to check if stock is in higher tiers
const isTier1A = (s: TOStock) => 
  s.qtier === "PRIME" && (s.state === "RETEST" || s.state === "CONFIRM") && s.mtf === "SYNC";

const isTier2A = (s: TOStock) => 
  s.qtier !== "WATCH" && s.qtier !== "AVOID" && 
  (s.state === "RETEST" || s.state === "CONFIRM") && 
  s.mtf !== "WEAK" && 
  !isTier1A(s);

const isSMajorTrend = (s: TOStock) => 
  s.tpaths === "S_MAJOR" && s.state === "TREND" && 
  (s.miph === "HIGH" || s.miph === "PEAK") && 
  !isTier1A(s) && !isTier2A(s);

export const TO_TIERS: TOTierConfig[] = [
  {
    key: "tier1a",
    name: "Tier 1A - Ready",
    description: "PRIME + Entry State + SYNC | Entry tối ưu",
    filter: isTier1A,
  },
  {
    key: "tier2a",
    name: "Tier 2A - Valid",
    description: "VALID + Entry State + MTF≠WEAK | Entry được phép",
    filter: isTier2A,
  },
  {
    key: "s_major_trend",
    name: "S_MAJOR TREND",
    description: "S_MAJOR + TREND + MI HIGH/PEAK | Giữ vị thế",
    filter: isSMajorTrend,
  },
  {
    key: "fresh_breakout",
    name: "Fresh Breakout",
    description: "BREAKOUT + QT≥VALID + VolX≥1.5 | Mới phá vỡ",
    filter: (s) => s.state === "BREAKOUT" && s.qtier !== "WATCH" && s.qtier !== "AVOID" && s.volRatio >= 1.5,
  },
  {
    key: "quality_retest",
    name: "Quality Retest",
    description: "RETEST + S_MAJOR + RQS≥60 | Pullback chất lượng",
    filter: (s) => s.state === "RETEST" && s.tpaths === "S_MAJOR" && s.rqs >= 60 && 
                   !isTier1A(s) && !isTier2A(s) && !isSMajorTrend(s),
  },
  {
    key: "pipeline",
    name: "Pipeline (BASE)",
    description: "BASE + QT≥VALID + MI MID+ | Theo dõi",
    filter: (s) => s.state === "BASE" && s.qtier !== "WATCH" && s.qtier !== "AVOID" && 
                   (s.miph === "MID" || s.miph === "HIGH" || s.miph === "PEAK"),
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
    description: "Improving + PROBE + ScoreQual≥50",
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
  const c = l.close;
  const m20 = l.sma_20 ?? c;
  const m50 = l.sma_50 ?? c;
  const m200 = l.sma_200 ?? c;
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
  // BREAKOUT: Near 60-day high with volume surge
  if (c > high60 * 0.98 && volRatio >= 1.2) {
    return { state: "BREAKOUT", volRatio, rqs };
  }
  // CONFIRM: Near 20-day high with above-average volume, above MA20
  if (c > high20 * 0.97 && volRatio >= 1.0 && c > m20) {
    return { state: "CONFIRM", volRatio, rqs };
  }
  // RETEST: Pullback to near MA20 zone but still above MA50
  if (c >= m20 * 0.95 && c <= m20 * 1.05 && c > m50 * 0.98) {
    return { state: "RETEST", volRatio, rqs };
  }
  // TREND: Above MA20 and MA20 is rising
  if (c > m20 && m20 > m50) {
    const m20_5ago = data[data.length - 6]?.sma_20 ?? m20;
    if (m20 >= m20_5ago * 0.998) {
      return { state: "TREND", volRatio, rqs };
    }
  }
  // BASE: Tight consolidation near MA50
  if (bbWidth < 0.10 && c > m50 * 0.93) {
    return { state: "BASE", volRatio, rqs };
  }
  // Extended BASE: above MA200 even if not tight
  if (c > m200 && c > m50 * 0.95) {
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
 * V5.3 scoring: Stricter thresholds to match reference distribution.
 * - Reference distribution: PRIME 4%, VALID 8%, WATCH 19%, AVOID 69%
 * - Stocks without ratio data default to AVOID (not VALID)
 *   Rationale: In the reference system, most stocks (69%) are AVOID, suggesting
 *   that quality data is essential. Missing ratios indicates lack of transparency
 *   or tracking, which aligns with AVOID criteria. This is a conservative
 *   approach that protects against investing in stocks with insufficient data.
 * - PRIME >= 8, VALID >= 5, WATCH >= 2, else AVOID
 * - More stringent ROE/growth requirements
 */
function calcQTier(ratios: CompanyRatios | undefined, priceData?: StockOHLCV[]): QTier {
  if (!ratios) return "AVOID";

  // Convert decimal ratios to percentage
  const roe = ratios.roe !== undefined ? ratios.roe * 100 : undefined;
  const roa = ratios.roa !== undefined ? ratios.roa * 100 : undefined;
  const npg = ratios.net_profit_growth !== undefined ? ratios.net_profit_growth * 100 : undefined;
  const rg = ratios.revenue_growth !== undefined ? ratios.revenue_growth * 100 : undefined;
  const npm = ratios.net_profit_margin !== undefined ? ratios.net_profit_margin * 100 : undefined;
  const cr = ratios.current_ratio;
  const de = ratios.de;
  const pe = ratios.pe;
  const pb = ratios.pb;
  const eps = ratios.eps;

  let score = 0;

  // ROE (max 4) - primary quality indicator, more stringent
  if (roe !== undefined && roe >= 20) score += 4;
  else if (roe !== undefined && roe >= 15) score += 3;
  else if (roe !== undefined && roe >= 10) score += 2;
  else if (roe !== undefined && roe >= 5) score += 1;

  // ROA fallback if ROE missing (max 2)
  if (roe === undefined && roa !== undefined && roa >= 8) score += 2;
  else if (roe === undefined && roa !== undefined && roa >= 5) score += 1;

  // Growth (max 3)
  if (npg !== undefined && npg > 15) score += 2;
  else if (npg !== undefined && npg > 5) score += 1;
  if (rg !== undefined && rg > 10) score += 1;

  // Valuation (max 2)
  if (pe !== undefined && pe > 0 && pe < 12) score += 2;
  else if (pe !== undefined && pe > 0 && pe < 20) score += 1;

  // PB valuation (max 1)
  if (pb !== undefined && pb > 0 && pb < 1.5) score += 1;

  // EPS quality (max 1)
  if (eps !== undefined && eps > 3000) score += 1;

  // Margins (max 2)
  if (npm !== undefined && npm > 10) score += 2;
  else if (npm !== undefined && npm > 5) score += 1;

  // Solvency (max 2)
  if (cr !== undefined && cr >= 1.5) score += 1;
  if (de !== undefined && de < 1.5) score += 1;

  // Price-momentum quality bonus (max 1)
  // Stocks in strong uptrend tend to have quality characteristics
  if (priceData && priceData.length >= 50) {
    const last = priceData[priceData.length - 1];
    const c = last.close;
    const sma50 = last.sma_50 ?? c;
    const sma200 = last.sma_200 ?? c;
    if (c > sma50 && sma50 > sma200) score += 1;
  }

  // Max possible: 4 + 2 + 3 + 2 + 1 + 1 + 2 + 2 + 1 = 18
  // Adjusted thresholds to match reference distribution
  if (score >= 8) return "PRIME";    // ~4%
  if (score >= 5) return "VALID";    // ~8%
  if (score >= 2) return "WATCH";    // ~19%
  return "AVOID";                     // ~69%
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
  else if (rs20 > 0 && rs50 > 0) vector = "D_LEAD";
  else if (rs200 > 0) vector = "M_LEAD";
  else if (rsPct > -2 && rs20 > -2) vector = "NEUT";
  else vector = "WEAK";

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

// ==================== MARKET REGIME ====================

function layerSignal(score: number): RegimeState {
  if (score >= 25) return "BULL";
  if (score <= -25) return "BEAR";
  return "NEUTRAL";
}

// ==================== 4-LAYER REGIME MODEL ====================

function determineIndexState(mi: number, tpath: TrendPath, miph: MIPhase, dMI_D?: number, dMI_W?: number): { state: string; stateNum: number } {
  // EXIT override: deteriorating momentum overrides all other states
  // Weekly momentum threshold: dMI_W < -5 indicates strong weekly decline
  if (dMI_W !== undefined && dMI_W < -5) return { state: "7.EXIT", stateNum: 7 };
  // Daily momentum threshold: dMI_D < -3 with mi < 70 indicates daily decline without strong peak
  if (dMI_D !== undefined && dMI_D < -3 && mi < 70) return { state: "7.EXIT", stateNum: 7 };
  
  // State numbering system based on MI and trend
  if (tpath === "S_MAJOR" && miph === "PEAK") return { state: "1.BREAKOUT", stateNum: 1 };
  if (tpath === "S_MAJOR" && miph === "HIGH") return { state: "2.CONFIRM", stateNum: 2 };
  if (tpath === "MAJOR" && miph === "HIGH") return { state: "3.TREND", stateNum: 3 };
  if (tpath === "MAJOR" && miph === "MID") return { state: "4.RETEST", stateNum: 4 };
  if (tpath === "MINOR" && miph === "MID") return { state: "5.BASE", stateNum: 5 };
  if (tpath === "WEAK" || miph === "LOW") return { state: "6.WEAK", stateNum: 6 };
  if (mi < 40) return { state: "7.EXIT", stateNum: 7 };
  return { state: "3.TREND", stateNum: 3 };
}

function determineBreadthQuadrant(aboveEMA50: number, slope: number): BreadthQuadrant {
  // Q1: Bull (>50% above EMA50, positive slope)
  // Q2: Improving (>50% above EMA50, negative slope)
  // Q3: Bear (<50% above EMA50, negative slope)
  // Q4: Recovering (<50% above EMA50, positive slope)
  const isAbove50 = aboveEMA50 > 50;
  const isPositiveSlope = slope > 0;
  
  if (isAbove50 && isPositiveSlope) return "Q1";
  if (isAbove50 && !isPositiveSlope) return "Q2";
  if (!isAbove50 && !isPositiveSlope) return "Q3";
  return "Q4";
}

async function calcIndexOverviews(): Promise<IndexOverview[]> {
  const indexSymbols = ["VNINDEX", "VN30", "VNMID", "VNSML"];
  const indexDataArray = await Promise.all(
    indexSymbols.map(sym => getIndexHistory(sym).catch(() => [] as IndexData[]))
  );
  
  const overviews: IndexOverview[] = [];
  
  for (let i = 0; i < indexSymbols.length; i++) {
    const symbol = indexSymbols[i];
    const data = indexDataArray[i];
    
    if (data.length < 5) continue;
    
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    
    // Calculate MI (using RSI as proxy)
    const mi = last.rsi_14 ?? 50;
    const miPrev = prev.rsi_14 ?? 50;
    const dMI_D = mi - miPrev;
    
    // Calculate weekly/monthly MI (simplified - using longer windows)
    const miW = data.length >= 7 ? (data[data.length - 7].rsi_14 ?? 50) : mi;
    const miM = data.length >= 30 ? (data[data.length - 30].rsi_14 ?? 50) : mi;
    const dMI_W = mi - miW;
    
    // Determine MI phase
    let miPhase: MIPhase;
    if (mi >= 70) miPhase = "PEAK";
    else if (mi >= 55) miPhase = "HIGH";
    else if (mi >= 45) miPhase = "MID";
    else miPhase = "LOW";
    
    // Determine trend path
    const c = last.close;
    const sma20 = last.sma_20 ?? c;
    const sma50 = last.sma_50 ?? c;
    const sma200 = last.sma_200 ?? c;
    
    let tpath: TrendPath;
    if (c > sma50 && sma20 > sma50 && sma50 > sma200) tpath = "S_MAJOR";
    else if (c > sma50 && sma20 > sma50) tpath = "MAJOR";
    else if (c > sma200) tpath = "MINOR";
    else tpath = "WEAK";
    
    const { state, stateNum } = determineIndexState(mi, tpath, miPhase, dMI_D, dMI_W);
    
    // Volume ratio
    const vol = last.volume ?? 0;
    const avgVol = data.slice(-20).reduce((s, d) => s + (d.volume ?? 0), 0) / 20;
    const volX = avgVol > 0 ? vol / avgVol : 1;
    
    // Calculate change percentage
    const prevClose = prev.close;
    const changePct = prevClose > 0 ? ((c - prevClose) / prevClose) * 100 : 0;
    
    overviews.push({
      symbol,
      state,
      stateNum,
      mi,
      miPhase,
      tpath,
      miD: mi,
      miW,
      miM,
      dMI_D,
      dMI_W,
      bqs: 50, // Base quality score (placeholder)
      rqs: 50, // Retest quality score (placeholder)
      volX,
      close: c,
      changePct,
    });
  }
  
  return overviews;
}

function calcLayer1Ceiling(indices: IndexOverview[]): Layer1Ceiling {
  const vnindex = indices.find(i => i.symbol === "VNINDEX");
  const details: string[] = [];
  let score = 0;
  
  if (!vnindex) {
    return {
      score: 0,
      signal: "NEUTRAL",
      label: "CEILING",
      details: ["No VNINDEX data"],
      status: "CLEAR",
      broken: false,
      weak: false,
      badge: "CLEAR",
    };
  }
  
  // Check if at ceiling (resistance)
  const atCeiling = vnindex.stateNum >= 6; // 6.WEAK or 7.EXIT = ceiling
  const weak = vnindex.stateNum === 7 || vnindex.miPhase === "LOW";
  const broken = vnindex.tpath === "WEAK" || vnindex.stateNum === 7;
  
  if (atCeiling) {
    score -= 50;
    details.push("VNINDEX at ceiling/resistance");
  }
  if (broken) {
    score -= 30;
    details.push("Broken: Yes");
  }
  if (weak) {
    score -= 20;
    details.push("Weak: Yes");
  }
  
  const status: CeilingStatus = atCeiling ? "BLOCKED" : "CLEAR";
  const badge = status === "BLOCKED" ? "LIMITED" : "CLEAR";
  
  if (!atCeiling && !weak) {
    score += 50;
    details.push("Ceiling clear");
  }
  
  return {
    score: Math.max(-100, Math.min(100, score)),
    signal: layerSignal(score),
    label: "CEILING",
    details,
    status,
    broken,
    weak,
    badge,
  };
}

function calcLayer2Components(indices: IndexOverview[]): Layer2Components {
  const vn30 = indices.find(i => i.symbol === "VN30");
  const vnmid = indices.find(i => i.symbol === "VNMID");
  const details: string[] = [];
  let score = 0;
  
  if (!vn30 || !vnmid) {
    return {
      score: 0,
      signal: "NEUTRAL",
      label: "COMPONENTS",
      details: ["Missing component data"],
      status: "SYNC",
      vn30Status: "NEUTRAL",
      vnmidStatus: "NEUTRAL",
      vn30dMI: 0,
      vnmiddMI: 0,
      rotation: "None",
      badge: "CHECK",
    };
  }
  
  // Determine component status based on dMI
  const vn30Status = vn30.dMI_D > 2 ? "OUTPERFORM" : vn30.dMI_D < -2 ? "UNDERPERFORM" : "NEUTRAL";
  const vnmidStatus = vnmid.dMI_D > 2 ? "OUTPERFORM" : vnmid.dMI_D < -2 ? "UNDERPERFORM" : "NEUTRAL";
  
  details.push(`VN30: ${vn30Status} (dMI: ${vn30.dMI_D >= 0 ? '+' : ''}${vn30.dMI_D.toFixed(0)})`);
  details.push(`VNMID: ${vnmidStatus} (dMI: ${vnmid.dMI_D >= 0 ? '+' : ''}${vnmid.dMI_D.toFixed(0)})`);
  
  // Check for rotation
  let rotation = "None";
  const bothOutperform = vn30Status === "OUTPERFORM" && vnmidStatus === "OUTPERFORM";
  const bothUnderperform = vn30Status === "UNDERPERFORM" && vnmidStatus === "UNDERPERFORM";
  
  if (vn30Status === "OUTPERFORM" && vnmidStatus === "UNDERPERFORM") {
    rotation = "VN30 Leading";
  } else if (vn30Status === "UNDERPERFORM" && vnmidStatus === "OUTPERFORM") {
    rotation = "VNMID Leading";
  }
  
  const status: RotationStatus = bothOutperform || bothUnderperform ? "SYNC" : "DESYNC";
  
  // Scoring
  if (bothOutperform) {
    score += 50;
    details.push("Components synchronized (both strong)");
  } else if (bothUnderperform) {
    score -= 50;
    details.push("Components synchronized (both weak)");
  } else {
    score += 0;
    details.push("Rotation detected");
  }
  
  const badge = status === "SYNC" ? "CHECK" : "ROTATING";
  
  return {
    score: Math.max(-100, Math.min(100, score)),
    signal: layerSignal(score),
    label: "COMPONENTS",
    details,
    status,
    vn30Status,
    vnmidStatus,
    vn30dMI: vn30.dMI_D,
    vnmiddMI: vnmid.dMI_D,
    rotation,
    badge,
  };
}

function calcLayer3BreadthV2(
  indices: IndexOverview[],
  realBreadth: RealBreadthData | null = null
): Layer3Breadth {
  const details: string[] = [];
  let score = 0;
  
  // Get breadth data for each index
  const vn30 = indices.find(i => i.symbol === "VN30");
  const vnmid = indices.find(i => i.symbol === "VNMID");
  const vnindex = indices.find(i => i.symbol === "VNINDEX");
  
  // Use real breadth data if available, otherwise fall back to simulated RSI-based approach
  let vn30AboveEMA50: number;
  let vnmidAboveEMA50: number;
  let allStockAboveEMA50: number;
  let vn30Slope: number;
  let vnmidSlope: number;
  let allSlope: number;

  if (realBreadth) {
    // Use real breadth data from actual stock analysis
    vn30AboveEMA50 = realBreadth.vn30AboveEMA50;
    vnmidAboveEMA50 = realBreadth.vnmidAboveEMA50;
    allStockAboveEMA50 = realBreadth.allStockAboveEMA50;
    vn30Slope = realBreadth.vn30Slope;
    vnmidSlope = realBreadth.vnmidSlope;
    allSlope = realBreadth.allSlope;
  } else {
    // Fallback: Simulate breadth % using RSI-based formula (legacy approach)
    // More conservative estimation that matches reference
    vn30AboveEMA50 = vn30 ? Math.min(100, Math.max(0, vn30.mi * 0.75 - 3)) : 50;
    vnmidAboveEMA50 = vnmid ? Math.min(100, Math.max(0, vnmid.mi * 0.65 - 2)) : 50;
    allStockAboveEMA50 = vnindex ? Math.min(100, Math.max(0, vnindex.mi * 0.70 - 2)) : 50;
    
    // Calculate slopes (simplified - using dMI as proxy)
    vn30Slope = vn30 ? vn30.dMI_D * 0.5 : 0;
    vnmidSlope = vnmid ? vnmid.dMI_D * 0.5 : 0;
    allSlope = vnindex ? vnindex.dMI_D * 0.5 : 0;
  }
  
  // Determine quadrants
  const vn30Quadrant = determineBreadthQuadrant(vn30AboveEMA50, vn30Slope);
  const vnmidQuadrant = determineBreadthQuadrant(vnmidAboveEMA50, vnmidSlope);
  const allStockQuadrant = determineBreadthQuadrant(allStockAboveEMA50, allSlope);
  
  const vn30Breadth: BreadthIndex = {
    symbol: "VN30",
    quadrant: vn30Quadrant,
    aboveEMA50Pct: vn30AboveEMA50,
    slope5d: vn30Slope,
  };
  
  const vnmidBreadth: BreadthIndex = {
    symbol: "VNMID",
    quadrant: vnmidQuadrant,
    aboveEMA50Pct: vnmidAboveEMA50,
    slope5d: vnmidSlope,
  };
  
  details.push(`VN30: ${vn30Quadrant} ${vn30AboveEMA50.toFixed(1)}% (s ${vn30Slope >= 0 ? '+' : ''}${vn30Slope.toFixed(1)})`);
  details.push(`VNMID: ${vnmidQuadrant} ${vnmidAboveEMA50.toFixed(1)}% (s ${vnmidSlope >= 0 ? '+' : ''}${vnmidSlope.toFixed(1)})`);
  details.push(`All: ${allStockQuadrant}: ${allStockAboveEMA50.toFixed(1)}%`);
  
  // Determine base stance
  let base: string;
  if (allStockQuadrant === "Q1") base = "AGG"; // Aggressive
  else if (allStockQuadrant === "Q2" || allStockQuadrant === "Q4") base = "NEU"; // Neutral
  else base = "CAU"; // Cautious
  
  // Determine badge
  let badge: string;
  if (vn30Quadrant === "Q3" && vnmidQuadrant === "Q3" && allStockQuadrant === "Q3") {
    badge = "ALL_WEAK";
    score -= 70;
  } else if (vn30Quadrant === "Q1" && vnmidQuadrant === "Q1" && allStockQuadrant === "Q1") {
    badge = "ALL_STRONG";
    score += 70;
  } else {
    badge = "MIXED";
    score += 0;
  }
  
  details.push(`Base: ${base}`);
  
  return {
    score: Math.max(-100, Math.min(100, score)),
    signal: layerSignal(score),
    label: "BREADTH",
    details,
    allStockQuadrant,
    vn30Breadth,
    vnmidBreadth,
    allStockAboveEMA50,
    base,
    badge,
  };
}

function calcLayer4Output(
  layer1: Layer1Ceiling,
  layer2: Layer2Components,
  layer3: Layer3Breadth,
  indices: IndexOverview[], // Add this parameter
): Layer4Output {
  const details: string[] = [];
  
  // Combine layer scores with weights
  const totalScore = Math.round(
    layer1.score * 0.3 +
    layer2.score * 0.3 +
    layer3.score * 0.4
  );
  
  details.push(`Base: ${layer3.base} → Ceiling: ${layer1.status}`);
  
  // Determine direction
  let direction: string;
  if (layer2.status === "SYNC" && layer2.vn30Status === "OUTPERFORM") {
    direction = "IMPROVING";
  } else if (layer2.status === "SYNC" && layer2.vn30Status === "UNDERPERFORM") {
    direction = "DETERIORATING";
  } else {
    direction = "STABLE";
  }
  
  details.push(`Dir: ${direction} | Mode: ${layer1.status === "BLOCKED" ? "BLOCKED" : "STABLE"}`);
  
  // Determine mode
  let mode: RegimeMode;
  // Check if ALL indices are in EXIT state
  const allIndicesExit = indices.length > 0 && indices.every(idx => idx.stateNum >= 7);
  // Fallback: also BLOCKED if ceiling is blocked AND weak
  const blocked = allIndicesExit || (layer1.status === "BLOCKED" && layer1.weak);
  if (blocked) {
    mode = "BLOCKED";
  } else if (layer2.rotation !== "None") {
    mode = "ROTATING";
  } else {
    mode = "STABLE";
  }
  
  details.push(`Lead: ${layer3.badge}`);
  
  // Determine final badge
  let badge: string;
  if (totalScore >= 40) badge = "HIGH";
  else if (totalScore >= -10) badge = "MED";
  else badge = "LOW";
  
  return {
    score: totalScore,
    signal: layerSignal(totalScore),
    label: "OUTPUT",
    details,
    base: layer3.base,
    ceilingStatus: layer1.status,
    direction,
    mode,
    lead: layer3.badge,
    badge,
  };
}

// ==================== LEGACY LAYER FUNCTIONS ====================

function calcIndexLayer(vnindex: IndexData[]): MarketRegime["indexLayer"] {
  const details: string[] = [];
  let score = 0;

  if (vnindex.length < 5) {
    return {
      score: 0, signal: "NEUTRAL", label: "INDEX", details: ["Không đủ dữ liệu"],
      vnindex: 0, change: 0, changePct: 0, sma20: 0, sma50: 0, sma200: 0,
      rsi: 50, macd: 0, macdSignal: 0, trend: "N/A",
    };
  }

  const last = vnindex[vnindex.length - 1];
  const prev = vnindex[vnindex.length - 2];
  const c = last.close;
  const sma20 = last.sma_20 ?? c;
  const sma50 = last.sma_50 ?? c;
  const sma200 = last.sma_200 ?? c;
  const rsi = last.rsi_14 ?? 50;
  const macd = last.macd ?? 0;
  const macdSig = last.macd_signal ?? 0;
  const change = c - prev.close;
  const changePct = prev.close > 0 ? (change / prev.close) * 100 : 0;

  // Price vs MAs (max +/-40)
  if (c > sma20) { score += 10; details.push("VN-Index > SMA20"); }
  else { score -= 10; details.push("VN-Index < SMA20"); }

  if (c > sma50) { score += 15; details.push("VN-Index > SMA50"); }
  else { score -= 15; details.push("VN-Index < SMA50"); }

  if (c > sma200) { score += 15; details.push("VN-Index > SMA200"); }
  else { score -= 15; details.push("VN-Index < SMA200"); }

  // MA alignment (max +/-20)
  if (sma20 > sma50 && sma50 > sma200) { score += 20; details.push("MA alignment: Bull"); }
  else if (sma20 < sma50 && sma50 < sma200) { score -= 20; details.push("MA alignment: Bear"); }
  else { details.push("MA alignment: Mixed"); }

  // RSI (max +/-15)
  if (rsi >= 50) { score += Math.min(15, (rsi - 50) * 0.5); details.push(`RSI ${rsi.toFixed(0)} (Bullish)`); }
  else { score -= Math.min(15, (50 - rsi) * 0.5); details.push(`RSI ${rsi.toFixed(0)} (Bearish)`); }

  // MACD (max +/-15)
  if (macd > macdSig) { score += 10; details.push("MACD > Signal"); }
  else { score -= 10; details.push("MACD < Signal"); }
  if (macd > 0) { score += 5; details.push("MACD > 0"); }
  else { score -= 5; }

  // 20-day trend (max +/-10)
  const idx20ago = Math.max(0, vnindex.length - 21);
  const close20ago = vnindex[idx20ago].close;
  const return20d = close20ago > 0 ? ((c - close20ago) / close20ago) * 100 : 0;
  if (return20d > 2) { score += 10; }
  else if (return20d < -2) { score -= 10; }

  // Determine trend label
  let trend: string;
  if (c > sma50 && sma20 > sma50) trend = "Uptrend";
  else if (c < sma50 && sma20 < sma50) trend = "Downtrend";
  else trend = "Sideways";

  score = Math.max(-100, Math.min(100, Math.round(score)));

  return {
    score, signal: layerSignal(score), label: "INDEX", details,
    vnindex: c, change: parseFloat(change.toFixed(2)),
    changePct: parseFloat(changePct.toFixed(2)),
    sma20, sma50, sma200, rsi, macd, macdSignal: macdSig, trend,
  };
}

function calcBreadthLayer(breadth: MarketBreadth[]): MarketRegime["breadthLayer"] {
  const details: string[] = [];
  let score = 0;

  // Aggregate across exchanges (HOSE + HNX)
  let advancing = 0, declining = 0, unchanged = 0;
  breadth.forEach((b) => {
    advancing += b.advancing;
    declining += b.declining;
    unchanged += b.unchanged;
  });

  const total = advancing + declining + unchanged;
  const adRatio = declining > 0 ? advancing / declining : advancing > 0 ? 5 : 1;
  const netAD = advancing - declining;
  const advPct = total > 0 ? (advancing / total) * 100 : 50;
  const decPct = total > 0 ? (declining / total) * 100 : 50;

  details.push(`Tăng: ${advancing} | Giảm: ${declining} | Đứng: ${unchanged}`);
  details.push(`A/D Ratio: ${adRatio.toFixed(2)}`);

  // AD ratio scoring (max +/-50)
  if (adRatio >= 2.0) { score += 50; details.push("Breadth rất mạnh (AD≥2)"); }
  else if (adRatio >= 1.5) { score += 35; details.push("Breadth mạnh (AD≥1.5)"); }
  else if (adRatio >= 1.0) { score += 15; details.push("Breadth tích cực (AD≥1)"); }
  else if (adRatio >= 0.7) { score -= 15; details.push("Breadth yếu (AD<1)"); }
  else if (adRatio >= 0.5) { score -= 35; details.push("Breadth tiêu cực (AD<0.7)"); }
  else { score -= 50; details.push("Breadth rất yếu (AD<0.5)"); }

  // Advancing % bonus (max +/-30)
  if (advPct >= 60) { score += 30; }
  else if (advPct >= 50) { score += 15; }
  else if (decPct >= 60) { score -= 30; }
  else if (decPct >= 50) { score -= 15; }

  // Breadth thrust detection (max +/-20)
  if (adRatio >= 3.0) { score += 20; details.push("BREADTH THRUST detected!"); }
  else if (adRatio <= 0.33) { score -= 20; details.push("Breadth collapse!"); }

  score = Math.max(-100, Math.min(100, Math.round(score)));

  return {
    score, signal: layerSignal(score), label: "BREADTH", details,
    advancing, declining, unchanged, adRatio: parseFloat(adRatio.toFixed(2)), netAD,
  };
}

function calcMomentumLayer(toStocks: TOStock[]): MarketRegime["momentumLayer"] {
  const details: string[] = [];
  let score = 0;

  const total = toStocks.length;
  const primeCount = toStocks.filter((s) => s.qtier === "PRIME").length;
  const validCount = toStocks.filter((s) => s.qtier === "VALID").length;
  const breakoutCount = toStocks.filter((s) => s.state === "BREAKOUT" || s.state === "CONFIRM").length;
  const trendCount = toStocks.filter((s) => s.state === "TREND" || s.state === "BREAKOUT" || s.state === "CONFIRM").length;
  const weakCount = toStocks.filter((s) => s.state === "WEAK").length;
  const avgMI = total > 0 ? Math.round(toStocks.reduce((s, t) => s + t.mi, 0) / total) : 50;

  const primePct = total > 0 ? (primeCount / total) * 100 : 0;
  const trendPct = total > 0 ? (trendCount / total) * 100 : 0;
  const weakPct = total > 0 ? (weakCount / total) * 100 : 0;

  details.push(`PRIME: ${primeCount} | VALID: ${validCount}`);
  details.push(`Breakout/Confirm: ${breakoutCount} | Trend: ${trendCount}`);
  details.push(`Avg MI: ${avgMI}`);

  // PRIME ratio (max +/-20)
  if (primePct >= 10) { score += 20; }
  else if (primePct >= 5) { score += 10; }
  else { score -= 5; }

  // Trend participation (max +/-30)
  if (trendPct >= 40) { score += 30; details.push("Trend participation cao (≥40%)"); }
  else if (trendPct >= 25) { score += 15; }
  else if (weakPct >= 60) { score -= 30; details.push("Weak dominance (≥60%)"); }
  else if (weakPct >= 40) { score -= 15; }

  // Average MI (max +/-30)
  if (avgMI >= 65) { score += 30; details.push("Momentum mạnh"); }
  else if (avgMI >= 55) { score += 15; }
  else if (avgMI >= 45) { score += 0; }
  else if (avgMI >= 35) { score -= 15; }
  else { score -= 30; details.push("Momentum yếu"); }

  // Breakout count (max +/-20)
  if (breakoutCount >= 10) { score += 20; details.push("Nhiều breakout mới"); }
  else if (breakoutCount >= 5) { score += 10; }
  else if (breakoutCount <= 1) { score -= 10; }

  score = Math.max(-100, Math.min(100, Math.round(score)));

  return {
    score, signal: layerSignal(score), label: "MOMENTUM", details,
    primeCount, validCount, breakoutCount, trendCount, avgMI,
  };
}

function calcFlowLayer(flow: ForeignFlow[]): MarketRegime["flowLayer"] {
  const details: string[] = [];
  let score = 0;

  let foreignNetValue = 0, foreignNetVolume = 0;
  flow.forEach((f) => {
    foreignNetValue += f.foreign_net_value;
    foreignNetVolume += f.foreign_net_volume;
  });

  // Determine flow bias
  let flowBias: string;
  if (foreignNetValue > 0) { flowBias = "Inflow"; }
  else if (foreignNetValue < 0) { flowBias = "Outflow"; }
  else { flowBias = "Neutral"; }

  // Display in tỷ VND
  const netValBn = foreignNetValue / 1e9;
  details.push(`Foreign net: ${netValBn >= 0 ? "+" : ""}${netValBn.toFixed(1)} tỷ VND`);
  details.push(`Flow bias: ${flowBias}`);

  // Foreign flow scoring (max +/-100)
  // Value in raw units varies, normalize scoring
  if (foreignNetValue > 100e9) { score += 50; details.push("Dòng tiền ngoại mua ròng mạnh"); }
  else if (foreignNetValue > 10e9) { score += 25; }
  else if (foreignNetValue > 0) { score += 10; }
  else if (foreignNetValue > -10e9) { score -= 10; }
  else if (foreignNetValue > -100e9) { score -= 25; }
  else { score -= 50; details.push("Dòng tiền ngoại bán ròng mạnh"); }

  // Volume-based confirmation
  if (foreignNetVolume > 0 && foreignNetValue > 0) { score += 20; details.push("Khối lượng & giá trị đều dương"); }
  else if (foreignNetVolume < 0 && foreignNetValue < 0) { score -= 20; }

  score = Math.max(-100, Math.min(100, Math.round(score)));

  return {
    score, signal: layerSignal(score), label: "FLOW", details,
    foreignNetValue, foreignNetVolume, flowBias,
  };
}

function buildRegime(
  indexLayer: MarketRegime["indexLayer"],
  breadthLayer: MarketRegime["breadthLayer"],
  momentumLayer: MarketRegime["momentumLayer"],
  flowLayer: MarketRegime["flowLayer"],
  layer1Ceiling: Layer1Ceiling,
  layer2Components: Layer2Components,
  layer3Breadth: Layer3Breadth,
  layer4Output: Layer4Output,
  indices: IndexOverview[],
): MarketRegime {
  // Use the new 4-layer model for regime determination
  const totalScore = layer4Output.score;
  
  let regime: RegimeState;
  // Check for BLOCKED mode first
  if (layer4Output.mode === "BLOCKED") {
    regime = "BLOCKED";
  } else if (totalScore >= 25) {
    regime = "BULL";
  } else if (totalScore <= -25) {
    regime = "BEAR";
  } else {
    regime = "NEUTRAL";
  }

  let allocation: string;
  let allocDesc: string;
  if (regime === "BLOCKED") {
    allocation = "0%";
    allocDesc = "BLOCKED. Tất cả chỉ số EXIT. Không giao dịch. Chờ phục hồi.";
  } else if (regime === "BULL") {
    allocation = "80-100%";
    allocDesc = "Ưu tiên giải ngân. Tìm Tier 1A/2A. Giữ vị thế Trend.";
  } else if (regime === "NEUTRAL") {
    allocation = "40-60%";
    allocDesc = "Chọn lọc. Chỉ Tier 1A. Giảm size. Bảo vệ vốn.";
  } else {
    allocation = "0-10%";
    allocDesc = "Phòng thủ. Không mở mới. Chờ tín hiệu phục hồi.";
  }

  return {
    regime,
    score: totalScore,
    allocation,
    allocDesc,
    layer1Ceiling,
    layer2Components,
    layer3Breadth,
    layer4Output,
    indices,
    // Legacy layers for backward compatibility
    indexLayer,
    breadthLayer,
    momentumLayer,
    flowLayer,
  };
}

/**
 * Run full stock analysis on ALL stocks with CSV price data.
 * Fetches symbols from GitHub repo (data/stocks/*.csv) + metadata + ratios.
 * GTGD = Giá trị giao dịch (trading value) = price * volume, in billion VND.
 * Display filter: GTGD >= 10 tỷ for liquid stocks.
 */
export async function runFullAnalysis(): Promise<AnalysisResult> {
  // Step 1: Get all data sources in parallel, including new 4-layer index data
  const [stockList, allRatios, allCsvSymbols, vnindexRaw, breadthRaw, flowRaw, indices, realBreadth] = await Promise.all([
    getStockList(),
    getAllCompanyRatios(),
    fetchAllSymbols(),
    getIndexHistory("VNINDEX").catch(() => [] as IndexData[]),
    getMarketBreadth().catch(() => [] as MarketBreadth[]),
    getForeignFlow().catch(() => [] as ForeignFlow[]),
    calcIndexOverviews(), // New 4-layer index data
    computeRealBreadth().catch(() => null), // Real breadth calculation
  ]);

  // Cast vnindex data (IndexData has all the fields we need for StockOHLCV)
  const vnindexData = vnindexRaw as unknown as StockOHLCV[];

  // Calculate legacy layers (for backward compatibility)
  const indexLayer = calcIndexLayer(vnindexRaw);
  const breadthLayer = calcBreadthLayer(breadthRaw);
  
  // Calculate new 4-layer model
  const layer1Ceiling = calcLayer1Ceiling(indices);
  const layer2Components = calcLayer2Components(indices);
  const layer3Breadth = calcLayer3BreadthV2(indices, realBreadth);

  // Step 2: Build lookup maps
  const ratiosMap = new Map<string, CompanyRatios>();
  allRatios.forEach((r) => {
    if (r.symbol) ratiosMap.set(r.symbol.toUpperCase(), r);
  });

  const tradingMap = new Map<string, { close_price: number; price_change_pct: number; total_volume: number }>();
  stockList.forEach((s) => {
    if (s.symbol) tradingMap.set(s.symbol.toUpperCase(), s);
  });

  // Step 3: Build universe from ALL sources (CSV files + ratios + trading_stats)
  // allCsvSymbols = all stocks with CSV price data in data/stocks/ (1093+)
  // allRatios = stocks with financial data (400+)
  // stockList = stocks from metadata + trading_stats
  const symbolSet = new Set<string>();
  allCsvSymbols.forEach((s) => symbolSet.add(s));
  allRatios.forEach((r) => { if (r.symbol) symbolSet.add(r.symbol.toUpperCase()); });
  stockList.forEach((s) => { if (s.symbol) symbolSet.add(s.symbol.toUpperCase()); });

  // Compute market cap: close_price * issue_share
  // If no trading data, estimate from pe * eps or default to 0
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
    // close_price is in thousands VND (e.g. 25.5 = 25,500 VND), volume is in shares
    // closePrice * volume = value in thousands VND
    // To convert to billion VND (tỷ): divide by 1e6 (1000 × 1e6 = 1e9 = 1 billion)
    const gtgd = closePrice > 0 && volume > 0
      ? (closePrice * volume) / 1e6
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
    // REMOVED: Filter that excluded stocks without trading_stats (closePrice=0 or gtgd=0)
    // Instead, all symbols are retained and sorted. Stocks with price history CSVs will be
    // successfully analyzed in batch processing; those without will be naturally excluded
    // when getPriceHistory fails or returns insufficient data (< 10 rows).
    // Note: gtgd values are non-negative by construction (see lines 1395-1399)
    .sort((a, b) => b.gtgd - a.gtgd); // Sort by GTGD descending (0 values sort to end)

  // Step 4: Analyze ALL stocks — stocks without CSV will fail silently in batch
  const toAnalyze = universe;

  // Step 5: Batch fetch price histories
  const allTOStocks: TOStock[] = [];
  const allRSStocks: RSStock[] = [];

  const batchSize = 50;
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
          const qtier = calcQTier(ratios, priceData);
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
        allTOStocks.push(r.toStock);
        allRSStocks.push(r.rsStock);
      }
    });
  }

  // Step 6: Distribution stats (from ALL analyzed stocks)
  const totalAnalyzed = allTOStocks.length;
  const distribution = {
    qtier: {
      total: totalAnalyzed,
      prime: allTOStocks.filter((s) => s.qtier === "PRIME").length,
      valid: allTOStocks.filter((s) => s.qtier === "VALID").length,
      watch: allTOStocks.filter((s) => s.qtier === "WATCH").length,
      avoid: allTOStocks.filter((s) => s.qtier === "AVOID").length,
    },
    rsVector: {
      total: allRSStocks.length,
      sync: allRSStocks.filter((s) => s.vector === "SYNC").length,
      dLead: allRSStocks.filter((s) => s.vector === "D_LEAD").length,
      mLead: allRSStocks.filter((s) => s.vector === "M_LEAD").length,
      weak: allRSStocks.filter((s) => s.vector === "WEAK").length,
      neut: allRSStocks.filter((s) => s.vector === "NEUT").length,
    },
  };

  // Step 7: Use ALL analyzed stocks for display (no GTGD filter)
  const toStocks = [...allTOStocks];
  const rsStocks = [...allRSStocks];

  // Step 8: Sort and categorize
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

  // Step 9: Build regime (use ALL stocks for momentum layer)
  const momentumLayer = calcMomentumLayer(allTOStocks);
  const flowLayer = calcFlowLayer(flowRaw);
  const layer4Output = calcLayer4Output(layer1Ceiling, layer2Components, layer3Breadth, indices);
  const regime = buildRegime(
    indexLayer,
    breadthLayer,
    momentumLayer,
    flowLayer,
    layer1Ceiling,
    layer2Components,
    layer3Breadth,
    layer4Output,
    indices,
  );

  return {
    totalStocks: toStocks.length,
    totalUniverse: totalAnalyzed,
    toStocks,
    rsStocks,
    toTiers,
    rsCats,
    counts: {
      prime: toStocks.filter((s) => s.qtier === "PRIME").length,
      valid: toStocks.filter((s) => s.qtier === "VALID").length,
      watch: toStocks.filter((s) => s.qtier === "WATCH").length,
      avoid: toStocks.filter((s) => s.qtier === "AVOID").length,
      tier1a: toTiers.tier1a.length,
      tier2a: toTiers.tier2a.length,
      active: rsStocks.filter((s) => s.isActive).length,
      sync: rsStocks.filter((s) => s.vector === "SYNC").length,
      dLead: rsStocks.filter((s) => s.vector === "D_LEAD").length,
      mLead: rsStocks.filter((s) => s.vector === "M_LEAD").length,
      weak: rsStocks.filter((s) => s.vector === "WEAK").length,
      neut: rsStocks.filter((s) => s.vector === "NEUT").length,
    },
    distribution,
    regime,
    generatedAt: new Date().toISOString(),
  };
}
