/**
 * VNStock Data Service
 * Fetches stock data from dmanh-ai/vnstock GitHub repository CSV files.
 * No Python dependency required.
 */

const BASE_URL =
  process.env.VNSTOCK_DATA_URL ||
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

  const res = await fetch(url, { next: { revalidate: 300 } });
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

export async function getStockList(): Promise<StockListItem[]> {
  const data = await fetchCSV("trading/trading_stats.csv");
  return data.map((row) => ({
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
  pe?: number;
  pb?: number;
  roe?: number;
  roa?: number;
  eps?: number;
  bvps?: number;
  market_cap?: number;
  [key: string]: string | number | undefined;
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
  return {
    symbol: symbol.toUpperCase(),
    pe: num(found.pe || found.PE || found.price_to_earning),
    pb: num(found.pb || found.PB || found.price_to_book),
    roe: num(found.roe || found.ROE || found.return_on_equity),
    roa: num(found.roa || found.ROA || found.return_on_asset),
    eps: num(found.eps || found.EPS || found.earning_per_share),
    bvps: num(found.bvps || found.BVPS || found.book_value_per_share),
    market_cap: num(
      found.market_cap || found.MarketCap || found.market_capitalization
    ),
  };
}

export async function getAllCompanyRatios(): Promise<CompanyRatios[]> {
  const data = await fetchCSV("company_ratios.csv");
  return data.map((row) => ({
    symbol: (row.symbol || row.ticker || "").toUpperCase(),
    pe: num(row.pe || row.PE || row.price_to_earning),
    pb: num(row.pb || row.PB || row.price_to_book),
    roe: num(row.roe || row.ROE || row.return_on_equity),
    roa: num(row.roa || row.ROA || row.return_on_asset),
    eps: num(row.eps || row.EPS || row.earning_per_share),
    bvps: num(row.bvps || row.BVPS || row.book_value_per_share),
    market_cap: num(
      row.market_cap || row.MarketCap || row.market_capitalization
    ),
  }));
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
  rsi_14?: number;
  daily_return?: number;
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
    rsi_14: num(row.rsi_14),
    daily_return: num(row.daily_return),
  }));
}

export async function getLatestIndexData(): Promise<
  Record<string, IndexData>
> {
  const indices = ["VNINDEX", "VN30", "HNXINDEX", "UPCOMINDEX"];
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
