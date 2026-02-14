/**
 * VNStock Data Service
 * Fetches stock data from dmanh-ai/vnstock GitHub repository CSV files.
 * No Python dependency required.
 */

const BASE_URL =
  "https://raw.githubusercontent.com/dmanh-ai/vnstock/main/data";

// --------------- CSV Parser ---------------

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headerLine = lines[0].replace(/^\uFEFF/, ""); // strip BOM
  const headers = headerLine.split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = values[i]?.trim() ?? "";
    });
    return record;
  });
}

function num(val: string | undefined): number | undefined {
  if (!val || val === "" || val === "NaN" || val === "None") return undefined;
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

// --------------- In-Memory Cache ---------------

const cache = new Map<string, { data: Record<string, string>[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchCSV(path: string): Promise<Record<string, string>[]> {
  const url = `${BASE_URL}/${path}`;

  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }

  const text = await res.text();
  const data = parseCSV(text);

  cache.set(url, { data, ts: Date.now() });
  return data;
}

// Try latest, then today, then yesterday
async function fetchDailyCSV(file: string): Promise<Record<string, string>[]> {
  try {
    return await fetchCSV(`latest/${file}`);
  } catch {
    const today = new Date().toISOString().slice(0, 10);
    try {
      return await fetchCSV(`${today}/${file}`);
    } catch {
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .slice(0, 10);
      return await fetchCSV(`${yesterday}/${file}`);
    }
  }
}

// --------------- Stock List & Trading ---------------

export interface StockListItem {
  symbol: string;
  exchange: string;
  close_price: number;
  price_change: number;
  price_change_pct: number;
  total_volume: number;
  high: number;
  low: number;
  ref_price: number;
  ceiling: number;
  floor: number;
  foreign_volume: number;
  avg_match_volume_2w: number;
}

/**
 * Fetch all available stock symbols that have CSV price data.
 *
 * Strategy (ordered by reliability):
 * 1. GitHub Trees API: lists all files in data/stocks/ → definitive source
 * 2. Metadata CSV: metadata/symbols_by_industry.csv → 1066+ symbols
 * 3. Empty array (fallback)
 *
 * @returns Array of symbol strings (normalized to uppercase)
 */
export async function fetchAllSymbols(): Promise<string[]> {
  // Try GitHub Trees API first — gives us exactly which CSVs exist
  try {
    const res = await fetch(
      "https://api.github.com/repos/dmanh-ai/vnstock/git/trees/main:data/stocks",
      { headers: { "Accept": "application/vnd.github.v3+json" } }
    );
    if (res.ok) {
      const json = await res.json();
      if (json.tree && Array.isArray(json.tree)) {
        const symbols = json.tree
          .filter((f: { path: string; type: string }) => f.type === "blob" && f.path.endsWith(".csv"))
          .map((f: { path: string }) => f.path.replace(".csv", "").toUpperCase());
        if (symbols.length > 100) return [...new Set(symbols)] as string[];
      }
    }
  } catch {
    // GitHub API might be rate-limited, fall through
  }

  // Fallback: metadata CSV
  try {
    const data = await fetchCSV("metadata/symbols_by_industry.csv");
    const symbols = data
      .map((row) => row.symbol)
      .filter((s) => s && s.trim().length > 0)
      .map((s) => s.toUpperCase());
    if (symbols.length > 0) return [...new Set(symbols)];
  } catch (error) {
    console.error("Failed to fetch symbol list from metadata:", error);
  }

  return [];
}

/**
 * Get the full list of stocks by merging all available symbols with trading stats.
 * 
 * This function:
 * 1. Fetches all symbols from metadata/symbols_by_industry.csv (comprehensive list)
 * 2. Fetches trading stats from trading/trading_stats.csv (prices, volumes, etc.)
 * 3. Merges both datasets so all symbols are included
 * 4. For symbols without trading stats, defaults to 0 or empty values
 * 
 * Falls back to trading stats only if symbol metadata cannot be fetched.
 * 
 * @returns Promise<StockListItem[]> - Complete list of stocks with trading data
 */
export async function getStockList(): Promise<StockListItem[]> {
  try {
    // Fetch both symbol list and trading stats in parallel
    const [allSymbols, tradingData] = await Promise.all([
      fetchAllSymbols(),
      fetchCSV("trading/trading_stats.csv").catch(() => []),
    ]);

    // Create a map of trading stats for quick lookup
    const tradingMap = new Map<string, Record<string, string>>();
    tradingData.forEach((row) => {
      if (row.symbol) {
        tradingMap.set(row.symbol.toUpperCase(), row);
      }
    });

    // If we have symbols from metadata, use them as the base
    if (allSymbols.length > 0) {
      return allSymbols.map((symbol) => {
        const trading = tradingMap.get(symbol); // Symbol already uppercase from fetchAllSymbols
        return {
          symbol: symbol,
          exchange: trading?.exchange || "", // Empty string indicates no trading data available
          close_price: num(trading?.close_price) ?? 0,
          price_change: num(trading?.price_change) ?? 0,
          price_change_pct: num(trading?.price_change_pct) ?? 0,
          total_volume: num(trading?.total_volume) ?? 0,
          high: num(trading?.high) ?? 0,
          low: num(trading?.low) ?? 0,
          ref_price: num(trading?.ref_price) ?? 0,
          ceiling: num(trading?.ceiling) ?? 0,
          floor: num(trading?.floor) ?? 0,
          foreign_volume: num(trading?.foreign_volume) ?? 0,
          avg_match_volume_2w: num(trading?.avg_match_volume_2w) ?? 0,
        };
      });
    }

    // Fallback: use only trading stats if symbol list unavailable
    return tradingData.map((row) => ({
      symbol: row.symbol,
      exchange: row.exchange,
      close_price: num(row.close_price) ?? 0,
      price_change: num(row.price_change) ?? 0,
      price_change_pct: num(row.price_change_pct) ?? 0,
      total_volume: num(row.total_volume) ?? 0,
      high: num(row.high) ?? 0,
      low: num(row.low) ?? 0,
      ref_price: num(row.ref_price) ?? 0,
      ceiling: num(row.ceiling) ?? 0,
      floor: num(row.floor) ?? 0,
      foreign_volume: num(row.foreign_volume) ?? 0,
      avg_match_volume_2w: num(row.avg_match_volume_2w) ?? 0,
    }));
  } catch (error) {
    console.error("Failed to fetch stock list:", error);
    // Return empty array as final fallback
    return [];
  }
}

export async function getStocksByExchange(
  exchange: string
): Promise<StockListItem[]> {
  const all = await getStockList();
  return all.filter(
    (s) => s.exchange.toUpperCase() === exchange.toUpperCase()
  );
}

// --------------- Industries ---------------

export interface IndustryMapping {
  symbol: string;
  industry_code: string;
  industry_name: string;
}

export async function getIndustries(): Promise<
  Record<string, IndustryMapping[]>
> {
  const data = await fetchCSV("metadata/symbols_by_industry.csv");
  const industries: Record<string, IndustryMapping[]> = {};
  data.forEach((row) => {
    const name = row.industry_name || "Khác";
    if (!industries[name]) industries[name] = [];
    industries[name].push({
      symbol: row.symbol,
      industry_code: row.industry_code,
      industry_name: name,
    });
  });
  return industries;
}

export async function getSymbolIndustry(
  symbol: string
): Promise<string | undefined> {
  const data = await fetchCSV("metadata/symbols_by_industry.csv");
  const found = data.find(
    (r) => r.symbol.toUpperCase() === symbol.toUpperCase()
  );
  return found?.industry_name;
}

// --------------- Price History & Technicals ---------------

export interface StockOHLCV {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  rsi_14?: number;
  macd?: number;
  macd_signal?: number;
  macd_hist?: number;
  bb_upper?: number;
  bb_lower?: number;
  daily_return?: number;
  volatility_20d?: number;
}

export async function getPriceHistory(symbol: string): Promise<StockOHLCV[]> {
  const data = await fetchCSV(`stocks/${symbol.toUpperCase()}.csv`);
  return data.map((row) => ({
    time: row.time,
    open: num(row.open) ?? 0,
    high: num(row.high) ?? 0,
    low: num(row.low) ?? 0,
    close: num(row.close) ?? 0,
    volume: num(row.volume) ?? 0,
    sma_20: num(row.sma_20),
    sma_50: num(row.sma_50),
    sma_200: num(row.sma_200),
    rsi_14: num(row.rsi_14),
    macd: num(row.macd),
    macd_signal: num(row.macd_signal),
    macd_hist: num(row.macd_hist),
    bb_upper: num(row.bb_upper),
    bb_lower: num(row.bb_lower),
    daily_return: num(row.daily_return),
    volatility_20d: num(row.volatility_20d),
  }));
}

// --------------- Company Info ---------------

export interface CompanyOverview {
  symbol: string;
  organ_name: string;
  organ_short_name: string;
  industry_name: string;
  [key: string]: string;
}

export async function getCompanyOverview(
  symbol: string
): Promise<CompanyOverview | null> {
  const data = await fetchCSV("company_overview.csv");
  const found = data.find(
    (r) =>
      (r.symbol || r.ticker || "").toUpperCase() === symbol.toUpperCase()
  );
  if (!found) return null;
  return {
    symbol: symbol.toUpperCase(),
    organ_name: found.organ_name || found.company_name || "",
    organ_short_name: found.organ_short_name || found.short_name || "",
    industry_name: found.industry_name || found.industry || "",
    ...found,
  };
}

// --------------- Company Ratios ---------------

export interface CompanyRatios {
  symbol: string;
  year_report?: number;
  length_report?: number;
  // Valuation
  pe?: number;
  pb?: number;
  ps?: number;
  pcf?: number;
  eps?: number;
  eps_ttm?: number;
  bvps?: number;
  ev?: number;
  ev_per_ebitda?: number;
  market_cap?: number;
  // Profitability
  revenue?: number;
  revenue_growth?: number;
  net_profit?: number;
  net_profit_growth?: number;
  gross_margin?: number;
  net_profit_margin?: number;
  ebit_margin?: number;
  ebitda?: number;
  ebit?: number;
  roe?: number;
  roic?: number;
  roa?: number;
  // Liquidity
  current_ratio?: number;
  quick_ratio?: number;
  cash_ratio?: number;
  // Leverage
  de?: number;
  le?: number;
  interest_coverage?: number;
  // Efficiency
  at?: number;
  fat?: number;
  // Dividend
  dividend?: number;
  // Other
  issue_share?: number;
  charter_capital?: number;
}

function parseRatiosRow(row: Record<string, string>): CompanyRatios {
  return {
    symbol: (row.symbol || row.ticker || "").toUpperCase(),
    year_report: num(row.year_report),
    length_report: num(row.length_report),
    pe: num(row.pe),
    pb: num(row.pb),
    ps: num(row.ps),
    pcf: num(row.pcf),
    eps: num(row.eps),
    eps_ttm: num(row.eps_ttm),
    bvps: num(row.bvps),
    ev: num(row.ev),
    ev_per_ebitda: num(row.ev_per_ebitda),
    market_cap: num(row.market_cap),
    revenue: num(row.revenue),
    revenue_growth: num(row.revenue_growth),
    net_profit: num(row.net_profit),
    net_profit_growth: num(row.net_profit_growth),
    gross_margin: num(row.gross_margin),
    net_profit_margin: num(row.net_profit_margin),
    ebit_margin: num(row.ebit_margin),
    ebitda: num(row.ebitda),
    ebit: num(row.ebit),
    roe: num(row.roe),
    roic: num(row.roic),
    roa: num(row.roa),
    current_ratio: num(row.current_ratio),
    quick_ratio: num(row.quick_ratio),
    cash_ratio: num(row.cash_ratio),
    de: num(row.de),
    le: num(row.le),
    interest_coverage: num(row.interest_coverage),
    at: num(row.at),
    fat: num(row.fat),
    dividend: num(row.dividend),
    issue_share: num(row.issue_share),
    charter_capital: num(row.charter_capital),
  };
}

export async function getCompanyRatios(
  symbol: string
): Promise<CompanyRatios | null> {
  const data = await fetchCSV("company_ratios.csv");
  const found = data.find(
    (r) =>
      (r.symbol || r.ticker || "").toUpperCase() === symbol.toUpperCase()
  );
  if (!found) return null;
  return parseRatiosRow(found);
}

export async function getAllCompanyRatios(): Promise<CompanyRatios[]> {
  const data = await fetchCSV("company_ratios.csv");
  return data.map(parseRatiosRow);
}

// --------------- Financial Statements ---------------

export async function getFinancials(
  symbol: string,
  type: "balance_sheet" | "income_statement" | "cash_flow" | "ratio" = "ratio",
  period: "quarter" | "year" = "quarter"
): Promise<Record<string, string>[]> {
  return fetchCSV(
    `financials/${symbol.toUpperCase()}/${type}_${period}.csv`
  );
}

// --------------- Daily Market Snapshots ---------------

export interface TopMover {
  symbol: string;
  close_price: number;
  percent_change: number;
  total_trades: number;
  total_value: number;
}

export async function getTopGainers(): Promise<TopMover[]> {
  const data = await fetchDailyCSV("top_gainers.csv");
  return data.map((row) => ({
    symbol: row.symbol,
    close_price: num(row.close_price) ?? 0,
    percent_change: num(row.percent_change) ?? 0,
    total_trades: num(row.total_trades) ?? 0,
    total_value: num(row.total_value) ?? 0,
  }));
}

export async function getTopLosers(): Promise<TopMover[]> {
  const data = await fetchDailyCSV("top_losers.csv");
  return data.map((row) => ({
    symbol: row.symbol,
    close_price: num(row.close_price) ?? 0,
    percent_change: num(row.percent_change) ?? 0,
    total_trades: num(row.total_trades) ?? 0,
    total_value: num(row.total_value) ?? 0,
  }));
}

export interface MarketBreadth {
  exchange: string;
  advancing: number;
  declining: number;
  unchanged: number;
  total_stocks: number;
  net_ad: number;
}

export async function getMarketBreadth(): Promise<MarketBreadth[]> {
  const data = await fetchDailyCSV("market_breadth.csv");
  return data.map((row) => ({
    exchange: row.exchange,
    advancing: num(row.advancing) ?? 0,
    declining: num(row.declining) ?? 0,
    unchanged: num(row.unchanged) ?? 0,
    total_stocks: num(row.total_stocks) ?? 0,
    net_ad: num(row.net_ad) ?? 0,
  }));
}

export interface ForeignFlow {
  exchange: string;
  foreign_buy_volume: number;
  foreign_sell_volume: number;
  foreign_net_volume: number;
  foreign_buy_value: number;
  foreign_sell_value: number;
  foreign_net_value: number;
}

export async function getForeignFlow(): Promise<ForeignFlow[]> {
  const data = await fetchDailyCSV("foreign_flow.csv");
  return data.map((row) => ({
    exchange: row.exchange,
    foreign_buy_volume: num(row.foreign_buy_volume) ?? 0,
    foreign_sell_volume: num(row.foreign_sell_volume) ?? 0,
    foreign_net_volume: num(row.foreign_net_volume) ?? 0,
    foreign_buy_value: num(row.foreign_buy_value) ?? 0,
    foreign_sell_value: num(row.foreign_sell_value) ?? 0,
    foreign_net_value: num(row.foreign_net_value) ?? 0,
  }));
}

export interface IndexImpact {
  symbol: string;
  close_price: number;
  percent_change: number;
  market_cap: number;
  impact: number;
}

export async function getIndexImpact(
  type: "positive" | "negative"
): Promise<IndexImpact[]> {
  const data = await fetchDailyCSV(`index_impact_${type}.csv`);
  return data.map((row) => ({
    symbol: row.symbol,
    close_price: num(row.close_price) ?? 0,
    percent_change: num(row.percent_change) ?? 0,
    market_cap: num(row.market_cap) ?? 0,
    impact: num(row.impact) ?? 0,
  }));
}

// --------------- Indices ---------------

export interface IndexData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  rsi_14?: number;
  macd?: number;
  macd_signal?: number;
  macd_hist?: number;
  bb_upper?: number;
  bb_lower?: number;
  daily_return?: number;
  volatility_20d?: number;
}

export async function getIndexHistory(
  indexName: string
): Promise<IndexData[]> {
  const data = await fetchCSV(`indices/${indexName.toUpperCase()}.csv`);
  return data.map((row) => ({
    time: row.time,
    open: num(row.open) ?? 0,
    high: num(row.high) ?? 0,
    low: num(row.low) ?? 0,
    close: num(row.close) ?? 0,
    volume: num(row.volume) ?? 0,
    symbol: row.symbol || indexName,
    sma_20: num(row.sma_20),
    sma_50: num(row.sma_50),
    sma_200: num(row.sma_200),
    rsi_14: num(row.rsi_14),
    macd: num(row.macd),
    macd_signal: num(row.macd_signal),
    macd_hist: num(row.macd_hist),
    bb_upper: num(row.bb_upper),
    bb_lower: num(row.bb_lower),
    daily_return: num(row.daily_return),
    volatility_20d: num(row.volatility_20d),
  }));
}

export async function getLatestIndexData(): Promise<
  Record<string, IndexData>
> {
  const indices = ["VNINDEX", "VN30", "VNMID", "VNSML", "HNXINDEX", "UPCOMINDEX"];
  const result: Record<string, IndexData> = {};

  await Promise.all(
    indices.map(async (idx) => {
      try {
        const history = await getIndexHistory(idx);
        if (history.length > 0) {
          result[idx] = history[history.length - 1];
        }
      } catch {
        // skip if not found
      }
    })
  );

  return result;
}

// --------------- Market Insights ---------------

export async function getMarketPE(): Promise<
  { time: string; value: number }[]
> {
  const data = await fetchCSV("insights/market_pe.csv");
  return data.map((row) => ({
    time: row.time || row.date || "",
    value: num(row.value || row.pe || row.PE) ?? 0,
  }));
}

export async function getMarketPB(): Promise<
  { time: string; value: number }[]
> {
  const data = await fetchCSV("insights/market_pb.csv");
  return data.map((row) => ({
    time: row.time || row.date || "",
    value: num(row.value || row.pb || row.PB) ?? 0,
  }));
}

// --------------- Search ---------------

export async function searchStocks(query: string): Promise<StockListItem[]> {
  const q = query.toUpperCase();
  const stocks = await getStockList();

  // Try symbol match first
  const symbolMatches = stocks.filter((s) => s.symbol.includes(q));
  if (symbolMatches.length > 0) return symbolMatches.slice(0, 20);

  // Fallback: try company name
  try {
    const overviews = await fetchCSV("company_overview.csv");
    const nameMatches = new Set<string>();
    overviews.forEach((row) => {
      const sym = (row.symbol || row.ticker || "").toUpperCase();
      const name = (
        row.organ_name ||
        row.company_name ||
        ""
      ).toUpperCase();
      if (sym.includes(q) || name.includes(q)) {
        nameMatches.add(sym);
      }
    });
    return stocks
      .filter((s) => nameMatches.has(s.symbol))
      .slice(0, 20);
  } catch {
    return symbolMatches;
  }
}

// --------------- Foreign Trading Top ---------------

export async function getForeignTopBuy(): Promise<Record<string, string>[]> {
  return fetchDailyCSV("foreign_top_buy.csv");
}

export async function getForeignTopSell(): Promise<Record<string, string>[]> {
  return fetchDailyCSV("foreign_top_sell.csv");
}

// --------------- Intraday ---------------

export async function getIntradayData(
  symbol: string
): Promise<Record<string, string>[]> {
  return fetchCSV(`intraday/${symbol.toUpperCase()}.csv`);
}

// --------------- Real Breadth Calculation ---------------

export interface RealBreadthData {
  vn30AboveEMA50: number;  // Percentage of VN30 stocks above SMA50 (used as EMA50 proxy)
  vnmidAboveEMA50: number; // Percentage of VNMID stocks above SMA50 (used as EMA50 proxy)
  allStockAboveEMA50: number; // Percentage of all stocks above SMA50 (used as EMA50 proxy)
  vn30Slope: number;       // 5-day slope of VN30 breadth
  vnmidSlope: number;      // 5-day slope of VNMID breadth
  allSlope: number;        // 5-day slope of all stocks breadth
}

/**
 * Compute real market breadth by checking actual stocks above SMA50.
 * Uses cached CSV data from vnstock repository.
 * 
 * This function:
 * 1. Fetches the stock list to get all symbols
 * 2. For each stock, reads the last few rows of price data to check if close > sma_50
 * 3. Calculates percentage above SMA50 for VN30, VNMID, and all stocks
 * 4. Calculates 5-day slope by comparing current percentage to 5 days ago
 * 
 * Performance: Leverages existing CSV caching (5 min TTL) and processes stocks in batches
 * 
 * @returns RealBreadthData object with breadth percentages and slopes
 */
export async function computeRealBreadth(): Promise<RealBreadthData | null> {
  try {
    // Get list of all stocks
    const stockList = await getStockList();
    
    // Filter to HOSE and HNX stocks only (exclude UPCOM for performance)
    // Also prioritize stocks with higher trading volume
    const activeStocks = stockList
      .filter(s => 
        (s.exchange === "HOSE" || s.exchange === "HNX") && 
        s.total_volume > 0
      )
      .sort((a, b) => b.total_volume - a.total_volume)
      .slice(0, 300); // Limit to top 300 most liquid stocks for performance

    // Define VN30 symbols (top 30 by market cap on HOSE)
    // TODO: Fetch actual index constituents from metadata/symbols_by_industry.csv or index API
    // Current hardcoded list may become stale as index composition changes
    const vn30Symbols = new Set([
      "VCB", "VHM", "VNM", "VIC", "GAS", "MSN", "HPG", "MBB", "VPB", "TCB",
      "ACB", "FPT", "BID", "CTG", "PLX", "VRE", "MWG", "VJC", "STB", "POW",
      "SSI", "HDB", "PDR", "GVR", "NVL", "VCI", "TPB", "SAB", "PNJ", "KDH"
    ]);

    // VNMID: mid-cap stocks (roughly 30-100 by market cap)
    // TODO: Fetch actual VNMID constituents from metadata
    const vnmidSymbols = new Set([
      "DGC", "REE", "PVD", "DHG", "DPM", "VGC", "PC1", "NT2", "HT1", "SBT",
      "DBC", "VCG", "BCM", "TCH", "GMD", "DIG", "HSG", "HCM", "BCG", "PVT",
      "DCM", "VIB", "NLG", "QCG", "IDC", "BWE", "LPB", "VHC", "MSH", "VCS"
    ]);

    // Batch process stocks to get breadth data
    const batchSize = 30; // Process 30 stocks at a time
    const results: Array<{
      symbol: string;
      isVN30: boolean;
      isVNMID: boolean;
      todayAbove: boolean;
      fiveDaysAgoAbove: boolean;
    }> = [];

    for (let i = 0; i < activeStocks.length; i += batchSize) {
      const batch = activeStocks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (stock) => {
          try {
            const priceData = await getPriceHistory(stock.symbol);
            if (priceData.length < 10) return null;

            const latest = priceData[priceData.length - 1];
            // 5 trading days ago: if today is index n-1, then 5 days ago is index n-6
            const fiveDaysAgo = priceData[priceData.length - 6];

            // Check if close > sma_50 (using SMA50 as proxy for EMA50)
            const isTodayAboveSMA50 = latest.sma_50 !== undefined && 
                              latest.close > latest.sma_50;
            const wasFiveDaysAgoAboveSMA50 = fiveDaysAgo?.sma_50 !== undefined && 
                                    fiveDaysAgo.close > fiveDaysAgo.sma_50;

            return {
              symbol: stock.symbol,
              isVN30: vn30Symbols.has(stock.symbol),
              isVNMID: vnmidSymbols.has(stock.symbol),
              todayAbove: isTodayAboveSMA50,
              fiveDaysAgoAbove: wasFiveDaysAgoAboveSMA50,
            };
          } catch {
            return null;
          }
        })
      );

      // Add non-null results
      batchResults.forEach((r) => r && results.push(r));
    }

    // Calculate breadth percentages
    const vn30Stocks = results.filter(r => r.isVN30);
    const vnmidStocks = results.filter(r => r.isVNMID);
    const allStocks = results;

    const vn30AboveEMA50 = vn30Stocks.length > 0 
      ? (vn30Stocks.filter(r => r.todayAbove).length / vn30Stocks.length) * 100 
      : 50;
    
    const vnmidAboveEMA50 = vnmidStocks.length > 0
      ? (vnmidStocks.filter(r => r.todayAbove).length / vnmidStocks.length) * 100
      : 50;
    
    const allStockAboveEMA50 = allStocks.length > 0
      ? (allStocks.filter(r => r.todayAbove).length / allStocks.length) * 100
      : 50;

    // Calculate 5-day slopes (change in percentage)
    const vn30AboveEMA50_5d = vn30Stocks.length > 0
      ? (vn30Stocks.filter(r => r.fiveDaysAgoAbove).length / vn30Stocks.length) * 100
      : 50;
    
    const vnmidAboveEMA50_5d = vnmidStocks.length > 0
      ? (vnmidStocks.filter(r => r.fiveDaysAgoAbove).length / vnmidStocks.length) * 100
      : 50;
    
    const allAboveEMA50_5d = allStocks.length > 0
      ? (allStocks.filter(r => r.fiveDaysAgoAbove).length / allStocks.length) * 100
      : 50;

    const vn30Slope = vn30AboveEMA50 - vn30AboveEMA50_5d;
    const vnmidSlope = vnmidAboveEMA50 - vnmidAboveEMA50_5d;
    const allSlope = allStockAboveEMA50 - allAboveEMA50_5d;

    return {
      vn30AboveEMA50,
      vnmidAboveEMA50,
      allStockAboveEMA50,
      vn30Slope,
      vnmidSlope,
      allSlope,
    };
  } catch (error) {
    console.error("Failed to compute real breadth:", error);
    return null;
  }
}
