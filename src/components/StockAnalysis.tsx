'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Activity,
  Zap,
  Clock,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  XCircle,
  Sparkles,
  Briefcase,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  runFullAnalysis,
  TO_TIERS,
  RS_CATEGORIES,
  type AnalysisResult,
  type TOStock,
  type RSStock,
  type TOTier,
  type RSCategory,
  type State,
  type TrendPath,
  type MTFSync,
  type QTier,
  type MIPhase,
  type RSState,
  type RSVector,
  type RSBucket,
  type MarketRegime,
  type RegimeState,
  type RegimeLayer,
} from '@/lib/stock-analyzer';

// ==================== BADGE COLOR MAPS ====================

const STATE_COLORS: Record<State, string> = {
  BREAKOUT: 'bg-green-500 text-white',
  CONFIRM: 'bg-emerald-600 text-white',
  RETEST: 'bg-blue-500 text-white',
  TREND: 'bg-cyan-600 text-white',
  BASE: 'bg-amber-600 text-white',
  WEAK: 'bg-zinc-600 text-zinc-300',
};

const TPATH_COLORS: Record<TrendPath, string> = {
  S_MAJOR: 'bg-green-500 text-white',
  MAJOR: 'bg-emerald-600 text-white',
  MINOR: 'bg-amber-600 text-white',
  WEAK: 'bg-zinc-600 text-zinc-300',
};

const MTF_COLORS: Record<MTFSync, string> = {
  SYNC: 'bg-green-500 text-white',
  PARTIAL: 'bg-amber-500 text-white',
  WEAK: 'bg-zinc-600 text-zinc-300',
};

const QTIER_COLORS: Record<QTier, string> = {
  PRIME: 'bg-green-500 text-white',
  VALID: 'bg-blue-500 text-white',
  WATCH: 'bg-zinc-600 text-zinc-300',
  AVOID: 'bg-red-600 text-white',
};

const MIPH_COLORS: Record<MIPhase, string> = {
  PEAK: 'bg-green-500 text-white',
  HIGH: 'bg-emerald-600 text-white',
  MID: 'bg-amber-500 text-white',
  LOW: 'bg-zinc-600 text-zinc-300',
};

const RS_STATE_COLORS: Record<RSState, string> = {
  Leading: 'bg-green-500 text-white',
  Improving: 'bg-emerald-600 text-white',
  Neutral: 'bg-amber-500 text-white',
  Weakening: 'bg-orange-600 text-white',
  Declining: 'bg-red-600 text-white',
};

const VECTOR_COLORS: Record<RSVector, string> = {
  SYNC: 'bg-green-500 text-white',
  D_LEAD: 'bg-blue-500 text-white',
  M_LEAD: 'bg-cyan-600 text-white',
  WEAK: 'bg-red-600 text-white',
  NEUT: 'bg-zinc-600 text-zinc-300',
};

const BUCKET_COLORS: Record<RSBucket, string> = {
  PRIME: 'bg-green-500 text-white',
  ELITE: 'bg-emerald-600 text-white',
  CORE: 'bg-blue-500 text-white',
  QUALITY: 'bg-amber-500 text-white',
  WEAK: 'bg-zinc-600 text-zinc-300',
};

// ==================== TIER ACCENT COLORS ====================

const TIER_HEADER_COLORS: Record<TOTier, string> = {
  tier1a: 'border-l-green-500 bg-green-500/5',
  tier2a: 'border-l-blue-500 bg-blue-500/5',
  s_major_trend: 'border-l-cyan-500 bg-cyan-500/5',
  fresh_breakout: 'border-l-amber-500 bg-amber-500/5',
  quality_retest: 'border-l-purple-500 bg-purple-500/5',
  pipeline: 'border-l-zinc-500 bg-zinc-500/5',
};

const CAT_HEADER_COLORS: Record<RSCategory, string> = {
  sync_active: 'border-l-green-500 bg-green-500/5',
  d_lead_active: 'border-l-blue-500 bg-blue-500/5',
  m_lead_active: 'border-l-cyan-500 bg-cyan-500/5',
  probe_watch: 'border-l-amber-500 bg-amber-500/5',
};

// ==================== SORT HELPERS ====================

type SortDir = 'asc' | 'desc';
type TOSortKey = 'symbol' | 'price' | 'changePct' | 'gtgd' | 'state' | 'tpaths' | 'mtf' | 'qtier' | 'miph' | 'mi' | 'rank';
type RSSortKey = 'symbol' | 'price' | 'changePct' | 'gtgd' | 'rsState' | 'vector' | 'bucket' | 'rsPct' | 'score';

function sortTOStocks(stocks: TOStock[], key: TOSortKey, dir: SortDir): TOStock[] {
  return [...stocks].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') {
      return dir === 'asc' ? av - bv : bv - av;
    }
    return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

function sortRSStocks(stocks: RSStock[], key: RSSortKey, dir: SortDir): RSStock[] {
  return [...stocks].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') {
      return dir === 'asc' ? av - bv : bv - av;
    }
    return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

// ==================== SMALL COMPONENTS ====================

function CellBadge({ value, colorMap }: { value: string; colorMap: Record<string, string> }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold leading-tight ${colorMap[value] || 'bg-zinc-700 text-zinc-300'}`}>
      {value}
    </span>
  );
}

function PctCell({ value }: { value: number }) {
  const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-zinc-400';
  return <span className={`font-mono text-xs ${color}`}>{value > 0 ? '+' : ''}{value.toFixed(2)}%</span>;
}

function MIBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 50 ? 'bg-emerald-500' : value >= 30 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-zinc-300">{value}</span>
    </div>
  );
}

function SortHeader({ label, sortKey, currentKey, currentDir, onSort }: {
  label: string;
  sortKey: string;
  currentKey: string;
  currentDir: SortDir;
  onSort: (key: string) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className="px-2 py-2 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 select-none whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-1 text-zinc-300">{currentDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  );
}

// ==================== STOCK AI DETAIL MODAL ====================

const STOCK_AI_PROMPT = `Bạn là chuyên gia phân tích chứng khoán Việt Nam (cả kỹ thuật lẫn cơ bản). Nhiệm vụ: phân tích TOÀN DIỆN 1 mã cổ phiếu dựa trên dữ liệu kỹ thuật VÀ báo cáo tài chính được cung cấp.

Yêu cầu output (BẮT BUỘC theo thứ tự):
1. **TỔNG QUAN** — Mã đang ở trạng thái gì, xu hướng ra sao, chất lượng cơ bản tốt/xấu (2-3 câu)
2. **PHÂN TÍCH KỸ THUẬT** — State, Trend Path, MTF, QTier, MI Phase, Momentum — giải thích ý nghĩa
3. **PHÂN TÍCH CƠ BẢN** — Doanh thu, lợi nhuận, biên lợi nhuận, ROE, ROA, nợ/vốn, dòng tiền — xu hướng tăng trưởng qua các năm/quý. So sánh P/E, P/B với ngành nếu có thể.
4. **ĐIỂM MẠNH & ĐIỂM YẾU** — Tổng hợp từ cả kỹ thuật và cơ bản
5. **ĐỊNH GIÁ** — Cổ phiếu đang rẻ/đắt/hợp lý dựa trên P/E, P/B, EPS growth
6. **VÙNG GIÁ QUAN TRỌNG** — Hỗ trợ, kháng cự, vùng mua lý tưởng
7. **KHUYẾN NGHỊ** — MUA / GIỮ / BÁN / CHỜ — kèm lý do
8. **CHIẾN LƯỢC** — Entry price, Stop-loss, Target price (nếu mua)

⚠️ NẾU có mục "VỊ THẾ ĐANG GIỮ TRONG PORTFOLIO" trong dữ liệu → nhà đầu tư ĐANG NẮM GIỮ cổ phiếu này. Bắt buộc thêm mục:
9. **QUẢN LÝ VỊ THẾ HIỆN TẠI** — Phân tích dựa trên giá vốn, lời/lỗ hiện tại, và tín hiệu kỹ thuật:
   - **Khuyến nghị**: GIỮ / CHỐT LỜI (1 phần hoặc toàn bộ) / CẮT LỖ — kèm lý do rõ ràng
   - **Mục tiêu (Target)**: Giá target ngắn hạn và trung hạn (nếu giữ)
   - **Cắt lỗ (Stoploss)**: Mức stoploss cụ thể dựa trên hỗ trợ gần nhất
   - **Tỷ lệ R:R** (Risk:Reward) tính từ giá hiện tại
   - **Hành động cụ thể**: Ví dụ "Giữ 70%, chốt lời 30% nếu giá đạt X", "Cắt lỗ ngay nếu về dưới Y"

Phong cách: ngắn gọn, bullet points, HÀNH ĐỘNG cụ thể. Viết bằng tiếng Việt.
Nếu không có dữ liệu tài chính, chỉ phân tích kỹ thuật.
Disclaimer cuối: "Lưu ý: Đây là phân tích tham khảo từ AI, không phải khuyến nghị đầu tư chính thức."`;

// ==================== FETCH FINANCIAL DATA ====================

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/dmanh-ai/vnstock/main/data';

async function fetchFinancialCSV(url: string, signal?: AbortSignal): Promise<string> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

// ===== VCI + KBS API Fallback (replaces deprecated TCBS API) =====
const VCI_GRAPHQL_URL = 'https://trading.vietcap.com.vn/data-mt/graphql';
const KBS_INSIDER_URL = 'https://kbbuddywts.kbsec.com.vn/iis-server/investment/stockinfo/news/internal-trading';

// Try fetch directly, then via CORS proxies if blocked
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchWithCorsRetry(url: string, options?: RequestInit & { signal?: AbortSignal }): Promise<any> {
  // Try direct first
  try {
    const res = await fetch(url, options);
    if (res.ok) return await res.json();
  } catch { /* CORS or network error, try proxies */ }
  // Fallback: CORS proxies (GET only — for POST, skip proxies)
  if (options?.method === 'POST') return null;
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];
  for (const makeProxy of proxies) {
    try {
      const res = await fetch(makeProxy(url), { signal: options?.signal });
      if (res.ok) return await res.json();
    } catch { /* try next proxy */ }
  }
  return null;
}

// Fetch shareholders + news from VCI GraphQL API
async function fetchVCICompanyData(symbol: string, signal?: AbortSignal): Promise<{ shareholders: ShareholderItem[]; news: CompanyNewsItem[] }> {
  const query = `query Q($ticker:String!,$lang:String!){OrganizationShareHolders(ticker:$ticker){ownerFullName quantity percentage updateDate}News(ticker:$ticker,langCode:$lang){newsTitle newsShortContent publicDate newsSourceLink}}`;
  const variables = { ticker: symbol.toUpperCase(), lang: 'vi' };

  // Try POST first (direct)
  let data = null;
  try {
    const res = await fetch(VCI_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal,
    });
    if (res.ok) {
      const json = await res.json();
      data = json?.data;
    }
  } catch { /* CORS blocked, try GET via proxy */ }

  // Fallback: GraphQL over GET via CORS proxy
  if (!data) {
    const getUrl = `${VCI_GRAPHQL_URL}?query=${encodeURIComponent(query)}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
    const proxies = [
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    ];
    for (const makeProxy of proxies) {
      try {
        const res = await fetch(makeProxy(getUrl), { signal });
        if (res.ok) {
          const json = await res.json();
          data = json?.data;
          if (data) break;
        }
      } catch { /* try next */ }
    }
  }

  if (!data) return { shareholders: [], news: [] };

  // Parse shareholders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shList = (data.OrganizationShareHolders || []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shareholders: ShareholderItem[] = shList.map((s: any) => ({
    name: s.ownerFullName || '',
    sharesOwned: s.quantity ? parseInt(s.quantity).toLocaleString('vi-VN') : '',
    ownershipPct: s.percentage != null ? `${(s.percentage * 100).toFixed(2)}%` : '',
    updateDate: s.updateDate ? new Date(s.updateDate).toLocaleDateString('vi-VN') : '',
  })).filter((s: ShareholderItem) => s.name);

  // Parse news
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nList = (data.News || []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const news: CompanyNewsItem[] = nList.slice(0, 10).map((n: any) => ({
    title: n.newsTitle || '',
    shortContent: (n.newsShortContent || '').slice(0, 200),
    publicDate: n.publicDate ? new Date(n.publicDate).toLocaleDateString('vi-VN') : '',
    sourceLink: n.newsSourceLink || '',
  })).filter((n: CompanyNewsItem) => n.title);

  return { shareholders, news };
}

// Fetch insider trading from KBS API
async function fetchKBSInsider(symbol: string, signal?: AbortSignal): Promise<InsiderTradeItem[]> {
  const url = `${KBS_INSIDER_URL}/${symbol.toUpperCase()}?l=1&p=1&s=20`;
  const data = await fetchWithCorsRetry(url, { signal });
  if (!Array.isArray(data)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.slice(0, 15).map((t: any) => ({
    title: t.name || t.transactionMan || '',
    position: t.position || t.transactionManPosition || '',
    buyVol: (t.transactionType === 'BUY' || t.transactionType === 'Mua' || t.transactionType === '0') && t.quantity ? parseInt(t.quantity).toLocaleString('vi-VN') : '-',
    sellVol: (t.transactionType === 'SELL' || t.transactionType === 'Bán' || t.transactionType === '1') && t.quantity ? parseInt(t.quantity).toLocaleString('vi-VN') : '-',
    volBefore: t.volumeBeforeTransaction ? parseInt(t.volumeBeforeTransaction).toLocaleString('vi-VN') : '',
    volAfter: t.volumeAfterTransaction ? parseInt(t.volumeAfterTransaction).toLocaleString('vi-VN') : '',
    dateAction: t.transactionDate || t.orderDate || '',
    status: t.transactionNote || '',
  })).filter((t: InsiderTradeItem) => t.title);
}

function parseCSVToSummary(csv: string, label: string, maxCols?: number): string {
  if (!csv) return '';
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return '';

  // Parse header to get period columns
  const header = lines[0].split(',');
  const periodCols = header.slice(2, maxCols ? 2 + maxCols : undefined); // skip item, item_en
  let out = `\n--- ${label} (${periodCols.join(' | ')}) ---\n`;

  for (let i = 1; i < lines.length; i++) {
    // Handle CSV with possible commas in quoted fields
    const row = lines[i];
    const parts: string[] = [];
    let inQuote = false;
    let current = '';
    for (const ch of row) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { parts.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    parts.push(current.trim());

    const itemEn = parts[1] || parts[0] || '';
    if (!itemEn) continue;
    const values = parts.slice(2, maxCols ? 2 + maxCols : undefined);
    // Format large numbers to billions
    const formatted = values.map(v => {
      const n = parseFloat(v);
      if (isNaN(n)) return v || '-';
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return n % 1 === 0 ? n.toString() : n.toFixed(2);
    });
    out += `${itemEn}: ${formatted.join(' | ')}\n`;
  }
  return out;
}

function parseRatiosExtraToSummary(csv: string): string {
  if (!csv) return '';
  const lines = csv.trim().split('\n');
  if (lines.length < 3) return '';

  // Row 0: category headers, Row 1: column names, Row 2+: data
  const colNames = lines[1].split(',');
  // Get annual rows only (lengthReport=5) — latest 4
  const dataRows = lines.slice(2)
    .map(line => line.split(','))
    .filter(parts => parts[2]?.trim() === '5') // annual only
    .slice(-4); // latest 4 years

  if (dataRows.length === 0) return '';

  const years = dataRows.map(r => r[1]?.trim() || '?');
  let out = `\n--- CHỈ SỐ TÀI CHÍNH MỞ RỘNG (${years.join(' | ')}) ---\n`;

  // Key metrics to show (column index -> label)
  const keyMetrics = [
    [4, 'Debt/Equity'], [7, 'Asset Turnover'], [9, 'Days Sales Outstanding'],
    [10, 'Days Inventory Outstanding'], [12, 'Cash Cycle'], [14, 'EBIT Margin (%)'],
    [15, 'Gross Profit Margin (%)'], [16, 'Net Profit Margin (%)'],
    [17, 'ROE (%)'], [18, 'ROIC (%)'], [19, 'ROA (%)'],
    [23, 'Current Ratio'], [26, 'Interest Coverage'],
    [28, 'Market Cap (Bn VND)'], [30, 'P/E'], [31, 'P/B'], [32, 'P/S'],
    [34, 'EPS (VND)'], [35, 'BVPS (VND)'], [36, 'EV/EBITDA'],
  ] as const;

  for (const [idx, label] of keyMetrics) {
    if (idx >= colNames.length) continue;
    const values = dataRows.map(r => {
      const v = r[idx]?.trim();
      if (!v || v === '') return '-';
      const n = parseFloat(v);
      if (isNaN(n)) return v;
      return n % 1 === 0 ? n.toString() : n.toFixed(2);
    });
    out += `${label}: ${values.join(' | ')}\n`;
  }
  return out;
}

async function fetchStockFinancials(symbol: string, signal?: AbortSignal): Promise<string> {
  const urls = {
    income: `${GITHUB_RAW_BASE}/financials/${symbol}/income_statement_year.csv`,
    balance: `${GITHUB_RAW_BASE}/financials/${symbol}/balance_sheet_year.csv`,
    cashflow: `${GITHUB_RAW_BASE}/financials/${symbol}/cash_flow_year.csv`,
    ratio: `${GITHUB_RAW_BASE}/financials/${symbol}/ratio_year.csv`,
    extra: `${GITHUB_RAW_BASE}/financials_extra/ratios_detail/${symbol}.csv`,
  };

  // Fetch all in parallel
  const [income, balance, cashflow, ratio, extra] = await Promise.all([
    fetchFinancialCSV(urls.income, signal),
    fetchFinancialCSV(urls.balance, signal),
    fetchFinancialCSV(urls.cashflow, signal),
    fetchFinancialCSV(urls.ratio, signal),
    fetchFinancialCSV(urls.extra, signal),
  ]);

  let summary = '';
  if (income || balance || cashflow || ratio || extra) {
    summary += `\n\n========== PHÂN TÍCH CƠ BẢN ==========\n`;
  }

  summary += parseCSVToSummary(income, 'BÁO CÁO KẾT QUẢ KINH DOANH (NĂM)', 4);
  summary += parseCSVToSummary(ratio, 'TỶ SỐ TÀI CHÍNH (NĂM)', 4);
  summary += parseCSVToSummary(balance, 'BẢNG CÂN ĐỐI KẾ TOÁN (NĂM)', 4);
  summary += parseCSVToSummary(cashflow, 'BÁO CÁO LƯU CHUYỂN TIỀN TỆ (NĂM)', 4);
  summary += parseRatiosExtraToSummary(extra);

  if (!summary.trim()) {
    summary = '\n(Không tìm thấy dữ liệu tài chính cho mã này)\n';
  }

  return summary;
}

// Parse CSV into structured table data for display
interface TableData {
  headers: string[];
  rows: { label: string; values: string[] }[];
}

function parseCSVToTable(csv: string, maxCols?: number): TableData | null {
  if (!csv) return null;
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return null;

  const header = lines[0].split(',');
  const headers = header.slice(2, maxCols ? 2 + maxCols : undefined);
  const rows: TableData['rows'] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const parts: string[] = [];
    let inQuote = false;
    let current = '';
    for (const ch of row) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { parts.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    parts.push(current.trim());

    const label = parts[1] || parts[0] || '';
    if (!label) continue;
    const values = parts.slice(2, maxCols ? 2 + maxCols : undefined).map(v => {
      const n = parseFloat(v);
      if (isNaN(n)) return v || '-';
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return n % 1 === 0 ? n.toString() : n.toFixed(2);
    });
    rows.push({ label, values });
  }
  return rows.length > 0 ? { headers, rows } : null;
}

function parseRatiosExtraToTable(csv: string): TableData | null {
  if (!csv) return null;
  const lines = csv.trim().split('\n');
  if (lines.length < 3) return null;

  const colNames = lines[1].split(',');
  const dataRows = lines.slice(2)
    .map(line => line.split(','))
    .filter(parts => parts[2]?.trim() === '5')
    .slice(-4);

  if (dataRows.length === 0) return null;

  const headers = dataRows.map(r => r[1]?.trim() || '?');
  const keyMetrics = [
    [4, 'Debt/Equity'], [7, 'Asset Turnover'], [9, 'Days Sales Outstanding'],
    [10, 'Days Inventory Outstanding'], [12, 'Cash Cycle'], [14, 'EBIT Margin (%)'],
    [15, 'Gross Profit Margin (%)'], [16, 'Net Profit Margin (%)'],
    [17, 'ROE (%)'], [18, 'ROIC (%)'], [19, 'ROA (%)'],
    [23, 'Current Ratio'], [26, 'Interest Coverage'],
    [28, 'Market Cap (Bn VND)'], [30, 'P/E'], [31, 'P/B'], [32, 'P/S'],
    [34, 'EPS (VND)'], [35, 'BVPS (VND)'], [36, 'EV/EBITDA'],
  ] as const;

  const rows: TableData['rows'] = [];
  for (const [idx, label] of keyMetrics) {
    if (idx >= colNames.length) continue;
    const values = dataRows.map(r => {
      const v = r[idx]?.trim();
      if (!v || v === '') return '-';
      const n = parseFloat(v);
      if (isNaN(n)) return v;
      return n % 1 === 0 ? n.toString() : n.toFixed(2);
    });
    rows.push({ label, values });
  }
  return rows.length > 0 ? { headers, rows } : null;
}

// ==================== INDICATOR EXPLANATIONS ====================

const TO_EXPLANATIONS: Record<string, { desc: string; values?: Record<string, string> }> = {
  State: {
    desc: 'Trạng thái kỹ thuật hiện tại của cổ phiếu trên đồ thị. Cho biết cổ phiếu đang ở giai đoạn nào trong chu kỳ giá.',
    values: {
      BREAKOUT: 'Giá vừa phá vỡ vùng kháng cự/tích lũy — tín hiệu mua mạnh, cần xác nhận bằng khối lượng.',
      CONFIRM: 'Breakout đã được xác nhận — xu hướng tăng rõ ràng, điểm mua an toàn hơn.',
      RETEST: 'Giá đang quay lại test vùng breakout — cơ hội mua vào nếu giữ được hỗ trợ.',
      TREND: 'Cổ phiếu đang trong xu hướng tăng ổn định — nắm giữ, trailing stop.',
      BASE: 'Đang tích lũy/đi ngang — chờ tín hiệu breakout, chưa nên vào.',
      WEAK: 'Xu hướng yếu hoặc giảm — tránh mua, cân nhắc cắt lỗ nếu đang giữ.',
    },
  },
  'Trend Path': {
    desc: 'Đánh giá sức mạnh xu hướng dựa trên cấu trúc sóng giá (đỉnh/đáy cao dần, EMA alignment).',
    values: {
      S_MAJOR: 'Super Major — xu hướng tăng cực mạnh, multi-timeframe đồng thuận. Top pick.',
      MAJOR: 'Major — xu hướng tăng mạnh và rõ ràng, đáng tin cậy.',
      MINOR: 'Minor — xu hướng tăng nhẹ hoặc đang hình thành, cần thêm xác nhận.',
      WEAK: 'Weak — không có xu hướng rõ hoặc đang giảm.',
    },
  },
  'MTF Sync': {
    desc: 'Multi-TimeFrame Sync — mức độ đồng thuận xu hướng giữa các khung thời gian (ngày, tuần, tháng).',
    values: {
      SYNC: 'Tất cả khung thời gian đồng thuận tăng — tín hiệu mạnh nhất, xác suất thành công cao.',
      PARTIAL: 'Một số khung đồng thuận — cần chọn lọc, có thể có divergence.',
      WEAK: 'Các khung mâu thuẫn nhau — rủi ro cao, nên đứng ngoài.',
    },
  },
  QTier: {
    desc: 'Quality Tier — xếp hạng chất lượng tổng hợp dựa trên state, trend, MTF, momentum.',
    values: {
      PRIME: 'Chất lượng cao nhất — đầy đủ tiêu chí: trend mạnh, MTF sync, momentum tốt.',
      VALID: 'Chất lượng tốt — đạt hầu hết tiêu chí, có thể cân nhắc mua.',
      WATCH: 'Theo dõi — chưa đủ điều kiện, cần chờ thêm tín hiệu.',
      AVOID: 'Tránh — không đạt tiêu chí, rủi ro cao.',
    },
  },
  'MI Phase': {
    desc: 'Momentum Index Phase — giai đoạn momentum hiện tại, cho biết sức đẩy giá đang ở đâu.',
    values: {
      PEAK: 'Momentum đỉnh — giá tăng mạnh nhưng có thể sắp chậm lại. Cẩn thận đuổi giá.',
      HIGH: 'Momentum cao — sức đẩy tốt, xu hướng đang khỏe.',
      MID: 'Momentum trung bình — đang hồi phục hoặc bắt đầu suy yếu.',
      LOW: 'Momentum thấp — sức đẩy yếu, giá có thể đi ngang hoặc giảm.',
    },
  },
  MI: {
    desc: 'Momentum Index (0-100) — chỉ số đo lường sức mạnh momentum. >70: mạnh, 40-70: trung bình, <40: yếu.',
  },
  Rank: {
    desc: 'Điểm tổng hợp (composite score) xếp hạng cổ phiếu. Càng cao càng tốt. Tính từ state, trend, MTF, momentum, volume.',
  },
  'Vol Ratio': {
    desc: 'Tỷ lệ khối lượng hiện tại so với trung bình 20 phiên. >1.5: khối lượng cao bất thường (breakout đáng tin hơn). <0.7: thanh khoản thấp.',
  },
  RQS: {
    desc: 'Retest Quality Score — đánh giá chất lượng lần retest gần nhất. Điểm cao = retest sạch, giữ hỗ trợ tốt. Có ý nghĩa khi State = RETEST.',
  },
};

const RS_EXPLANATIONS: Record<string, { desc: string; values?: Record<string, string> }> = {
  'RS State': {
    desc: 'Trạng thái sức mạnh tương đối (Relative Strength) so với VN-Index.',
    values: {
      Leading: 'Dẫn dắt thị trường — cổ phiếu mạnh hơn VN-Index rõ rệt. Top pick trong uptrend.',
      Improving: 'Đang cải thiện — RS đang tăng, có thể sắp trở thành leader.',
      Neutral: 'Trung lập — đi ngang so với thị trường chung.',
      Weakening: 'Đang suy yếu — RS giảm dần, cần cẩn thận.',
      Declining: 'Suy yếu rõ — yếu hơn thị trường, tránh mua mới.',
    },
  },
  Vector: {
    desc: 'Hướng RS trên các khung thời gian — cho biết RS đang đồng thuận hay phân kỳ giữa Daily/Monthly.',
    values: {
      SYNC: 'Đồng thuận tăng cả Daily & Monthly — RS mạnh nhất.',
      D_LEAD: 'Daily dẫn — RS ngắn hạn mạnh hơn dài hạn, có thể đang bắt đầu chu kỳ mới.',
      M_LEAD: 'Monthly dẫn — RS dài hạn vẫn mạnh, ngắn hạn đang nghỉ/điều chỉnh.',
      WEAK: 'RS yếu trên cả hai khung — tránh.',
      NEUT: 'Trung lập — không có tín hiệu rõ.',
    },
  },
  Bucket: {
    desc: 'Phân loại cổ phiếu theo chất lượng RS tổng hợp.',
    values: {
      PRIME: 'Nhóm tốt nhất — RS mạnh, vector sync, thanh khoản tốt.',
      ELITE: 'Nhóm tinh hoa — RS rất mạnh, gần top.',
      CORE: 'Nhóm nòng cốt — RS tốt, đáng theo dõi.',
      QUALITY: 'Nhóm chất lượng — RS khá, có tiềm năng.',
      WEAK: 'Nhóm yếu — RS kém, không ưu tiên.',
    },
  },
  'RS%': {
    desc: 'Phần trăm RS so với VN-Index. Dương = mạnh hơn thị trường. Âm = yếu hơn. Càng cao càng tốt.',
  },
  Score: {
    desc: 'Điểm RS tổng hợp (0-100). >70: mạnh, 40-70: trung bình, <40: yếu so với thị trường.',
  },
};

const REGIME_EXPLANATION: { desc: string; values: Record<string, string> } = {
  desc: 'Trạng thái thị trường chung — quyết định chiến lược phân bổ vốn và mức độ tích cực.',
  values: {
    BULL: 'Thị trường tăng — môi trường thuận lợi, tăng tỷ trọng cổ phiếu, ưu tiên mua breakout.',
    NEUTRAL: 'Trung lập — cân bằng, chọn lọc kỹ, giảm size.',
    BEAR: 'Thị trường giảm — phòng thủ, giữ tiền mặt nhiều, chỉ mua khi có tín hiệu cực mạnh.',
    BLOCKED: 'Thị trường bị chặn — tín hiệu mâu thuẫn, không rõ hướng. Tốt nhất đứng ngoài.',
  },
};

// Clickable metric item with expandable explanation
function MetricItem({ label, value, explanations }: {
  label: string;
  value: string | number;
  explanations?: { desc: string; values?: Record<string, string> };
}) {
  const [expanded, setExpanded] = useState(false);
  const strVal = String(value);
  const valueExpl = explanations?.values?.[strVal];

  return (
    <div className="col-span-1">
      <button
        className={`flex justify-between w-full text-left rounded px-1.5 py-1 transition-colors ${
          explanations ? 'hover:bg-zinc-800/60 cursor-pointer' : 'cursor-default'
        } ${expanded ? 'bg-zinc-800/40' : ''}`}
        onClick={() => explanations && setExpanded(e => !e)}
      >
        <span className="text-zinc-500 flex items-center gap-1">
          {label}
          {explanations && <span className="text-zinc-700 text-[10px]">?</span>}
        </span>
        <span className="text-zinc-200 font-medium">{strVal}</span>
      </button>
      {expanded && explanations && (
        <div className="mt-0.5 mx-1.5 mb-1 px-2 py-1.5 rounded bg-zinc-800/60 border border-zinc-700/50 text-[11px] leading-relaxed text-zinc-400">
          <p>{explanations.desc}</p>
          {valueExpl && (
            <p className="mt-1 text-zinc-300 font-medium">
              <span className="text-amber-400">{strVal}</span>: {valueExpl}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Collapsible data section component
function DataSection({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2">
      <button
        className="flex items-center gap-1.5 w-full text-left px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors text-sm font-semibold text-zinc-300"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {title}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

// Mini table component for financial data
function FinTable({ data }: { data: TableData }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="px-2 py-1 text-left text-zinc-500 font-normal">Chỉ tiêu</th>
            {data.headers.map((h, i) => (
              <th key={i} className="px-2 py-1 text-right text-zinc-500 font-normal whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
              <td className="px-2 py-1 text-zinc-400 max-w-[200px] truncate" title={row.label}>{row.label}</td>
              {row.values.map((v, j) => (
                <td key={j} className="px-2 py-1 text-right font-mono text-zinc-300 whitespace-nowrap">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface OwnershipItem {
  ownerType: string;
  ownershipPct: number;
  sharesOwned: string;
}

interface StockAIModalProps {
  stock: TOStock | RSStock | null;
  stockType: 'TO' | 'RS';
  regime: MarketRegime;
  onClose: () => void;
  companyNameMap?: Record<string, string>;
  toStocks?: TOStock[];
  rsStocks?: RSStock[];
}

interface FinancialTables {
  income: TableData | null;
  balance: TableData | null;
  cashflow: TableData | null;
  ratio: TableData | null;
  extra: TableData | null;
}

// ===== Company Extra Data Interfaces =====
interface CompanyNewsItem {
  title: string;
  shortContent: string;
  publicDate: string;
  sourceLink: string;
}

interface ShareholderItem {
  name: string;
  sharesOwned: string;
  ownershipPct: string;
  updateDate: string;
}

interface SubsidiaryItem {
  name: string;
  charterCapital: string;
  ownershipPct: string;
  type: string;
  updateDate: string;
}

interface InsiderTradeItem {
  title: string;
  position: string;
  buyVol: string;
  sellVol: string;
  volBefore: string;
  volAfter: string;
  dateAction: string;
  status: string;
}

interface CompanyRatioItem {
  year: string;
  revenueGrowth: string;
  netProfitGrowth: string;
  ebitMargin: string;
  grossMargin: string;
  netProfitMargin: string;
  roe: string;
  roic: string;
  roa: string;
  pe: string;
  pb: string;
  ps: string;
  eps: string;
  bvps: string;
  de: string;
  currentRatio: string;
  dividend: string;
  ccc: string;
}

interface CompanyOverviewData {
  profile: string;
  industry: string;
  history: string;
}

interface CompanyExtraData {
  news: CompanyNewsItem[];
  shareholders: ShareholderItem[];
  subsidiaries: SubsidiaryItem[];
  insiderTrades: InsiderTradeItem[];
  ratios: CompanyRatioItem[];
  overview: CompanyOverviewData | null;
  ownership: OwnershipItem[];
  freefloatPct: number | null;
}

// ===== Parse Company CSVs =====

// Robust CSV parser: handles quoted fields, multi-line values, escaped quotes
function parseFullCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuote = false;
  let i = 0;
  while (i < csv.length) {
    const ch = csv[i];
    if (inQuote) {
      if (ch === '"') {
        if (csv[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuote = false;
        i++;
        continue;
      }
      field += ch;
      i++;
    } else {
      if (ch === '"' && field.length === 0) { inQuote = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\n' || ch === '\r') {
        row.push(field);
        field = '';
        if (ch === '\r' && csv[i + 1] === '\n') i++;
        if (row.some(f => f.length > 0)) rows.push(row);
        row = [];
        i++;
        continue;
      }
      field += ch;
      i++;
    }
  }
  row.push(field);
  if (row.some(f => f.length > 0)) rows.push(row);
  return rows;
}

function parseCompanyCSVBySymbol(csv: string, symbol: string): Record<string, string>[] {
  if (!csv) return [];
  const cleaned = csv.replace(/^\uFEFF/, '');
  const allRows = parseFullCSV(cleaned);
  if (allRows.length < 2) return [];
  const headers = allRows[0].map(h => h.trim());
  const symIdx = headers.findIndex(h => h === 'symbol');
  if (symIdx === -1) return [];
  const results: Record<string, string>[] = [];
  for (let i = 1; i < allRows.length; i++) {
    const vals = allRows[i];
    if (vals[symIdx]?.trim() === symbol) {
      const rec: Record<string, string> = {};
      headers.forEach((h, j) => { rec[h] = vals[j]?.trim() ?? ''; });
      results.push(rec);
    }
  }
  return results;
}

function parseNewsCSV(csv: string, symbol: string): CompanyNewsItem[] {
  const rows = parseCompanyCSVBySymbol(csv, symbol);
  return rows.slice(0, 10).map(r => ({
    title: r['news_title'] || r['title'] || '',
    shortContent: r['news_short_content'] || '',
    publicDate: r['public_date'] ? new Date(parseInt(r['public_date'])).toLocaleDateString('vi-VN') : '',
    sourceLink: r['news_source_link'] || '',
  })).filter(n => n.title);
}

function parseShareholdersCSV(csv: string, symbol: string): ShareholderItem[] {
  const rows = parseCompanyCSVBySymbol(csv, symbol);
  return rows.map(r => ({
    name: r['name'] || '',
    sharesOwned: r['shares_owned'] ? parseInt(r['shares_owned']).toLocaleString('vi-VN') : '',
    ownershipPct: r['ownership_percentage'] ? `${parseFloat(r['ownership_percentage']).toFixed(2)}%` : '',
    updateDate: r['update_date'] ? r['update_date'].split('T')[0] : '',
  })).filter(s => s.name);
}

function parseSubsidiariesCSV(csv: string, symbol: string): SubsidiaryItem[] {
  const rows = parseCompanyCSVBySymbol(csv, symbol);
  return rows.map(r => ({
    name: r['name'] || '',
    charterCapital: r['charter_capital'] ? (parseFloat(r['charter_capital']) / 1e9).toFixed(1) + ' tỷ' : '',
    ownershipPct: r['ownership_percent'] ? `${parseFloat(r['ownership_percent']).toFixed(1)}%` : '',
    type: r['type'] || '',
    updateDate: r['update_date'] ? r['update_date'].split('T')[0] : '',
  })).filter(s => s.name);
}

function parseInsiderCSV(csv: string, symbol: string): InsiderTradeItem[] {
  const rows = parseCompanyCSVBySymbol(csv, symbol);
  return rows.slice(0, 15).map(r => ({
    title: r['title'] || '',
    position: r['position_cd'] || '',
    buyVol: r['buy_volume'] && r['buy_volume'] !== '' ? parseInt(r['buy_volume']).toLocaleString('vi-VN') : '-',
    sellVol: r['sell_volume'] && r['sell_volume'] !== '' ? parseInt(r['sell_volume']).toLocaleString('vi-VN') : '-',
    volBefore: r['volume_before'] ? parseInt(r['volume_before']).toLocaleString('vi-VN') : '',
    volAfter: r['volume_after'] ? parseInt(r['volume_after']).toLocaleString('vi-VN') : '',
    dateAction: r['date_action_to'] ? r['date_action_to'].split('T')[0] : '',
    status: r['status_name'] || '',
  })).filter(t => t.title);
}

function fmtRatio(val: string | undefined, pct = false, dec = 2): string {
  if (!val || val === '' || val === 'NaN' || val === 'None') return '-';
  const n = parseFloat(val);
  if (isNaN(n)) return '-';
  return pct ? `${(n * 100).toFixed(dec)}%` : n.toFixed(dec);
}

function parseCompanyRatiosCSV(csv: string, symbol: string): CompanyRatioItem[] {
  const rows = parseCompanyCSVBySymbol(csv, symbol);
  return rows
    .sort((a, b) => parseFloat(b['year_report'] || '0') - parseFloat(a['year_report'] || '0'))
    .slice(0, 5)
    .map(r => ({
      year: r['year_report'] ? parseFloat(r['year_report']).toFixed(0) : '',
      revenueGrowth: fmtRatio(r['revenue_growth'], true, 1),
      netProfitGrowth: fmtRatio(r['net_profit_growth'], true, 1),
      ebitMargin: fmtRatio(r['ebit_margin'], true, 1),
      grossMargin: fmtRatio(r['gross_margin'], true, 1),
      netProfitMargin: fmtRatio(r['net_profit_margin'], true, 1),
      roe: fmtRatio(r['roe'], true, 1),
      roic: fmtRatio(r['roic'], true, 1),
      roa: fmtRatio(r['roa'], true, 1),
      pe: fmtRatio(r['pe'], false, 1),
      pb: fmtRatio(r['pb'], false, 2),
      ps: fmtRatio(r['ps'], false, 2),
      eps: r['eps'] ? parseFloat(r['eps']).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '-',
      bvps: r['bvps'] ? parseFloat(r['bvps']).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '-',
      de: fmtRatio(r['de'], false, 2),
      currentRatio: fmtRatio(r['current_ratio'], false, 2),
      dividend: fmtRatio(r['dividend'], true, 1),
      ccc: fmtRatio(r['ccc'], false, 0),
    })).filter(r => r.year);
}

function parseOverviewCSV(csv: string, symbol: string): CompanyOverviewData | null {
  const rows = parseCompanyCSVBySymbol(csv, symbol);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    profile: r['company_profile'] || '',
    industry: [r['icb_name2'], r['icb_name3'], r['icb_name4']].filter(Boolean).join(' > '),
    history: (r['history'] || '').slice(0, 500),
  };
}

// Keywords indicating locked (non-freefloat) ownership - normalize whitespace before matching
const LOCKED_KEYWORDS = ['Nhà nước', 'sáng lập', 'phiếu quỹ', 'trên 5%', '>= 5%', 'CĐ lớn'];

function parseOwnershipCSV(csv: string, symbol: string): { items: OwnershipItem[]; freefloatPct: number | null } {
  const rows = parseCompanyCSVBySymbol(csv, symbol);
  if (rows.length === 0) return { items: [], freefloatPct: null };
  const items: OwnershipItem[] = rows.map(r => ({
    ownerType: r['owner_type'] || '',
    ownershipPct: parseFloat(r['ownership_percentage'] || '0'),
    sharesOwned: r['shares_owned'] ? parseInt(r['shares_owned']).toLocaleString('vi-VN') : '',
  })).filter(o => o.ownerType);

  // Calculate freefloat: 100% - locked ownership
  // Only show freefloat if we can identify at least one locked category
  let lockedPct = 0;
  let hasLocked = false;
  for (const item of items) {
    const norm = item.ownerType.replace(/\s+/g, ' ');
    if (LOCKED_KEYWORDS.some(k => norm.includes(k))) {
      lockedPct += item.ownershipPct;
      hasLocked = true;
    }
  }
  const freefloatPct = hasLocked ? Math.max(0, 100 - lockedPct) : null;
  return { items, freefloatPct };
}

function parseCompanyNameMap(csv: string): Record<string, string> {
  if (!csv) return {};
  const cleaned = csv.replace(/^\uFEFF/, '');
  const allRows = parseFullCSV(cleaned);
  if (allRows.length < 2) return {};
  const headers = allRows[0].map(h => h.trim());
  const symIdx = headers.findIndex(h => h === 'symbol');
  const profIdx = headers.findIndex(h => h === 'company_profile');
  if (symIdx === -1 || profIdx === -1) return {};
  const map: Record<string, string> = {};
  for (let i = 1; i < allRows.length; i++) {
    const vals = allRows[i];
    const sym = vals[symIdx]?.trim();
    if (!sym || map[sym]) continue;
    const profile = (vals[profIdx] || '').trim();
    if (profile) {
      const m = profile.match(/^(.+?)[\(,]/);
      if (m) map[sym] = m[1].trim();
    }
  }
  return map;
}

function StockAIModal({ stock, stockType, regime, onClose, companyNameMap = {}, toStocks = [], rsStocks = [] }: StockAIModalProps) {
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [financials, setFinancials] = useState<FinancialTables | null>(null);
  const [finLoading, setFinLoading] = useState(false);
  const [finTextCache, setFinTextCache] = useState('');
  const [companyExtra, setCompanyExtra] = useState<CompanyExtraData | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Lookup counterpart: if opened from TO tab, find matching RS stock and vice versa
  const toStock = useMemo(() => stockType === 'TO' ? stock as TOStock : toStocks.find(s => s.symbol === stock?.symbol) ?? null, [stock, stockType, toStocks]);
  const rsStock = useMemo(() => stockType === 'RS' ? stock as RSStock : rsStocks.find(s => s.symbol === stock?.symbol) ?? null, [stock, stockType, rsStocks]);

  // Auto-scroll as content streams (only during AI analysis)
  useEffect(() => {
    if (contentRef.current && isLoading) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [analysis, isLoading]);

  // Auto-fetch financial data on open
  useEffect(() => {
    if (!stock) return;
    const controller = new AbortController();

    const loadFinancials = async () => {
      setFinLoading(true);
      const urls = {
        income: `${GITHUB_RAW_BASE}/financials/${stock.symbol}/income_statement_year.csv`,
        balance: `${GITHUB_RAW_BASE}/financials/${stock.symbol}/balance_sheet_year.csv`,
        cashflow: `${GITHUB_RAW_BASE}/financials/${stock.symbol}/cash_flow_year.csv`,
        ratio: `${GITHUB_RAW_BASE}/financials/${stock.symbol}/ratio_year.csv`,
        extra: `${GITHUB_RAW_BASE}/financials_extra/ratios_detail/${stock.symbol}.csv`,
      };

      const [incomeCSV, balanceCSV, cashflowCSV, ratioCSV, extraCSV] = await Promise.all([
        fetchFinancialCSV(urls.income, controller.signal),
        fetchFinancialCSV(urls.balance, controller.signal),
        fetchFinancialCSV(urls.cashflow, controller.signal),
        fetchFinancialCSV(urls.ratio, controller.signal),
        fetchFinancialCSV(urls.extra, controller.signal),
      ]);

      setFinancials({
        income: parseCSVToTable(incomeCSV, 4),
        balance: parseCSVToTable(balanceCSV, 4),
        cashflow: parseCSVToTable(cashflowCSV, 4),
        ratio: parseCSVToTable(ratioCSV, 4),
        extra: parseRatiosExtraToTable(extraCSV),
      });

      // Cache text summary for AI
      let summary = '';
      if (incomeCSV || balanceCSV || cashflowCSV || ratioCSV || extraCSV) {
        summary += `\n\n========== PHÂN TÍCH CƠ BẢN ==========\n`;
      }
      summary += parseCSVToSummary(incomeCSV, 'BÁO CÁO KẾT QUẢ KINH DOANH (NĂM)', 4);
      summary += parseCSVToSummary(ratioCSV, 'TỶ SỐ TÀI CHÍNH (NĂM)', 4);
      summary += parseCSVToSummary(balanceCSV, 'BẢNG CÂN ĐỐI KẾ TOÁN (NĂM)', 4);
      summary += parseCSVToSummary(cashflowCSV, 'BÁO CÁO LƯU CHUYỂN TIỀN TỆ (NĂM)', 4);
      summary += parseRatiosExtraToSummary(extraCSV);
      setFinTextCache(summary || '\n(Không tìm thấy dữ liệu tài chính cho mã này)\n');

      setFinLoading(false);
    };

    // Load company extra data (news, shareholders, subsidiaries, insider trading, ratios, overview, ownership)
    const loadCompanyExtra = async () => {
      setCompanyLoading(true);
      const [newsCSV, shareholdersCSV, subsidiariesCSV, insiderCSV, ratiosCSV, overviewCSV, ownershipCSV] = await Promise.all([
        fetchFinancialCSV(`${GITHUB_RAW_BASE}/company_news.csv`, controller.signal),
        fetchFinancialCSV(`${GITHUB_RAW_BASE}/shareholders.csv`, controller.signal),
        fetchFinancialCSV(`${GITHUB_RAW_BASE}/subsidiaries.csv`, controller.signal),
        fetchFinancialCSV(`${GITHUB_RAW_BASE}/insider_trading.csv`, controller.signal),
        fetchFinancialCSV(`${GITHUB_RAW_BASE}/company_ratios.csv`, controller.signal),
        fetchFinancialCSV(`${GITHUB_RAW_BASE}/company_overview.csv`, controller.signal),
        fetchFinancialCSV(`${GITHUB_RAW_BASE}/company_ownership.csv`, controller.signal),
      ]);

      let news = parseNewsCSV(newsCSV, stock.symbol);
      let shareholders = parseShareholdersCSV(shareholdersCSV, stock.symbol);
      const subsidiaries = parseSubsidiariesCSV(subsidiariesCSV, stock.symbol);
      let insiderTrades = parseInsiderCSV(insiderCSV, stock.symbol);
      const ratios = parseCompanyRatiosCSV(ratiosCSV, stock.symbol);
      const overview = parseOverviewCSV(overviewCSV, stock.symbol);
      const ownershipData = parseOwnershipCSV(ownershipCSV, stock.symbol);

      // Fallback to VCI + KBS APIs if CSV has no data for this stock
      const needsApiFallback = news.length === 0 || shareholders.length === 0;
      if (needsApiFallback) {
        const [vciData, kbsInsider] = await Promise.all([
          (news.length === 0 || shareholders.length === 0) ? fetchVCICompanyData(stock.symbol, controller.signal) : Promise.resolve(null),
          insiderTrades.length === 0 ? fetchKBSInsider(stock.symbol, controller.signal) : Promise.resolve([]),
        ]);

        if (vciData) {
          if (news.length === 0 && vciData.news.length > 0) news = vciData.news;
          if (shareholders.length === 0 && vciData.shareholders.length > 0) shareholders = vciData.shareholders;
        }
        if (insiderTrades.length === 0 && kbsInsider.length > 0) insiderTrades = kbsInsider;
      }

      setCompanyExtra({
        news,
        shareholders,
        subsidiaries,
        insiderTrades,
        ratios,
        overview,
        ownership: ownershipData.items,
        freefloatPct: ownershipData.freefloatPct,
      });
      setCompanyLoading(false);
    };

    loadFinancials();
    loadCompanyExtra();
    return () => controller.abort();
  }, [stock]);

  // AI analysis — triggered by button
  const runAnalysis = useCallback(async () => {
    if (!stock) return;
    const apiKey = localStorage.getItem('anthropic_api_key');
    if (!apiKey) {
      setError('Chưa có API Key. Vui lòng nhập ở tab "AI Khuyến nghị" trước.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let info = `=== PHÂN TÍCH CỔ PHIẾU: ${stock.symbol} ===\n`;
      info += `Giá hiện tại: ${(stock.price * 1000).toLocaleString('vi-VN')} VNĐ\n`;
      info += `Thay đổi hôm nay: ${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(2)}%\n`;
      info += `GTGD (thanh khoản): ${stock.gtgd} tỷ\n`;

      if (toStock) {
        info += `\n--- CHỈ SỐ KỸ THUẬT (TO) ---\n`;
        info += `State: ${toStock.state}\n`;
        info += `Trend Path: ${toStock.tpaths}\n`;
        info += `MTF Sync: ${toStock.mtf}\n`;
        info += `QTier: ${toStock.qtier}\n`;
        info += `MI Phase: ${toStock.miph}\n`;
        info += `MI (Momentum): ${toStock.mi}\n`;
        info += `Rank: ${toStock.rank}\n`;
        info += `Vol Ratio: ${toStock.volRatio?.toFixed(2) ?? 'N/A'}\n`;
        info += `RQS (Retest Quality): ${toStock.rqs?.toFixed(1) ?? 'N/A'}\n`;
      }
      if (rsStock) {
        info += `\n--- CHỈ SỐ RS (Relative Strength) ---\n`;
        info += `RS State: ${rsStock.rsState}\n`;
        info += `Vector: ${rsStock.vector}\n`;
        info += `Bucket: ${rsStock.bucket}\n`;
        info += `RS%: ${rsStock.rsPct >= 0 ? '+' : ''}${rsStock.rsPct.toFixed(1)}%\n`;
        info += `Score: ${rsStock.score}\n`;
      }

      info += `\n--- BỐI CẢNH THỊ TRƯỜNG ---\n`;
      info += `Regime: ${regime.regime} | Score: ${regime.score} | Allocation: ${regime.allocation}\n`;
      info += finTextCache;

      // Add company extra data for AI context
      if (companyExtra) {
        if (companyExtra.overview) {
          info += `\n\n--- THÔNG TIN CÔNG TY ---\n`;
          info += `Ngành: ${companyExtra.overview.industry}\n`;
          if (companyExtra.overview.profile) info += `Mô tả: ${companyExtra.overview.profile.slice(0, 300)}\n`;
        }
        if (companyExtra.ownership.length > 0) {
          info += `\n--- CƠ CẤU SỞ HỮU ---\n`;
          companyExtra.ownership.forEach(o => {
            info += `${o.ownerType}: ${o.ownershipPct.toFixed(2)}%\n`;
          });
          if (companyExtra.freefloatPct !== null) info += `Freefloat: ${companyExtra.freefloatPct.toFixed(2)}%\n`;
        }
        if (companyExtra.shareholders.length > 0) {
          info += `\n--- CỔ ĐÔNG LỚN ---\n`;
          companyExtra.shareholders.slice(0, 5).forEach(s => {
            info += `${s.name}: ${s.ownershipPct} (${s.sharesOwned} cp)\n`;
          });
        }
        if (companyExtra.insiderTrades.length > 0) {
          info += `\n--- GIAO DỊCH NỘI BỘ GẦN ĐÂY ---\n`;
          companyExtra.insiderTrades.slice(0, 5).forEach(t => {
            info += `${t.dateAction}: Mua ${t.buyVol} | Bán ${t.sellVol} (${t.status})\n`;
          });
        }
        if (companyExtra.ratios.length > 0) {
          info += `\n--- CHỈ SỐ CÔNG TY (theo năm) ---\n`;
          companyExtra.ratios.slice(0, 3).forEach(r => {
            info += `${r.year}: ROE=${r.roe} ROIC=${r.roic} P/E=${r.pe} P/B=${r.pb} Growth: Rev=${r.revenueGrowth} Profit=${r.netProfitGrowth} D/E=${r.de} Dividend=${r.dividend}\n`;
          });
        }
        if (companyExtra.news.length > 0) {
          info += `\n--- TIN TỨC GẦN ĐÂY ---\n`;
          companyExtra.news.slice(0, 5).forEach(n => {
            info += `[${n.publicDate}] ${n.title}\n`;
          });
        }
      }

      // Check if stock is in portfolio → add position context for AI
      try {
        const savedHoldings = localStorage.getItem('portfolio_holdings');
        if (savedHoldings) {
          const allHoldings: PortfolioHolding[] = JSON.parse(savedHoldings);
          const myHoldings = allHoldings.filter(h => h.symbol === stock.symbol);
          if (myHoldings.length > 0) {
            let totalBuyQty = 0, totalSellQty = 0, totalBuyCost = 0;
            myHoldings.forEach(h => {
              if (h.type === 'BUY') {
                totalBuyQty += h.quantity;
                totalBuyCost += h.buyPrice * h.quantity;
              } else {
                totalSellQty += h.quantity;
              }
            });
            const netQty = totalBuyQty - totalSellQty;
            if (netQty > 0) {
              const avgCost = totalBuyCost / totalBuyQty;
              const currentPrice = stock.price * 1000;
              const pnl = (currentPrice - avgCost) * netQty;
              const pnlPct = ((currentPrice - avgCost) / avgCost) * 100;
              info += `\n\n⚠️ === VỊ THẾ ĐANG GIỮ TRONG PORTFOLIO ===\n`;
              info += `Số lượng đang giữ: ${netQty.toLocaleString('vi-VN')} cổ phiếu\n`;
              info += `Giá vốn trung bình: ${avgCost.toLocaleString('vi-VN')} VNĐ\n`;
              info += `Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')} VNĐ\n`;
              info += `Lời/Lỗ: ${pnl >= 0 ? '+' : ''}${pnl.toLocaleString('vi-VN')} VNĐ (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)\n`;
              const buyDates = myHoldings.filter(h => h.type === 'BUY').map(h => h.buyDate).join(', ');
              info += `Ngày mua: ${buyDates}\n`;
              info += `→ NHÀ ĐẦU TƯ ĐANG GIỮ CỔ PHIẾU NÀY - Hãy đưa ra khuyến nghị GIỮ/BÁN/CHỐT LỜI/CẮT LỖ + Target + Stoploss cụ thể\n`;
            }
          }
        }
      } catch { /* ignore localStorage errors */ }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          stream: true,
          system: STOCK_AI_PROMPT,
          messages: [{ role: 'user', content: `Phân tích toàn diện (kỹ thuật + cơ bản) mã ${stock.symbol} dựa trên dữ liệu sau:\n\n${info}` }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error ${response.status}: ${errText.slice(0, 200)}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                text += event.delta.text;
                setAnalysis(text);
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setIsLoading(false);
    }
  }, [stock, stockType, regime, finTextCache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  if (!stock) return null;

  const hasFinancials = financials && (financials.income || financials.balance || financials.cashflow || financials.ratio || financials.extra);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                {stock.symbol}
                {companyNameMap[stock.symbol] && (
                  <span className="text-sm font-normal text-zinc-400">— {companyNameMap[stock.symbol]}</span>
                )}
                <span className={`text-sm font-normal ${stock.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                </span>
              </h3>
              <p className="text-xs text-zinc-500">
                Giá: {(stock.price * 1000).toLocaleString('vi-VN')} VNĐ | GTGD: {stock.gtgd} tỷ
                {toStock && ` | State: ${toStock.state}`}
                {rsStock && ` | RS: ${rsStock.rsState}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAnalysis}
              disabled={isLoading || finLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang phân tích...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> AI Phân tích</>
              )}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 mb-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Technical Data - TO */}
          {toStock && (
            <DataSection title="Chỉ số kỹ thuật (TO) — bấm chỉ số để xem giải thích" defaultOpen={true}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-0.5 px-1 text-xs">
                <MetricItem label="State" value={toStock.state} explanations={TO_EXPLANATIONS.State} />
                <MetricItem label="Trend Path" value={toStock.tpaths} explanations={TO_EXPLANATIONS['Trend Path']} />
                <MetricItem label="MTF Sync" value={toStock.mtf} explanations={TO_EXPLANATIONS['MTF Sync']} />
                <MetricItem label="QTier" value={toStock.qtier} explanations={TO_EXPLANATIONS.QTier} />
                <MetricItem label="MI Phase" value={toStock.miph} explanations={TO_EXPLANATIONS['MI Phase']} />
                <MetricItem label="MI" value={toStock.mi} explanations={TO_EXPLANATIONS.MI} />
                <MetricItem label="Rank" value={toStock.rank} explanations={TO_EXPLANATIONS.Rank} />
                <MetricItem label="Vol Ratio" value={toStock.volRatio?.toFixed(2) ?? 'N/A'} explanations={TO_EXPLANATIONS['Vol Ratio']} />
                <MetricItem label="RQS" value={toStock.rqs?.toFixed(1) ?? 'N/A'} explanations={TO_EXPLANATIONS.RQS} />
                <MetricItem label="Regime" value={regime.regime} explanations={REGIME_EXPLANATION} />
              </div>
            </DataSection>
          )}

          {/* Technical Data - RS */}
          {rsStock && (
            <DataSection title="Chỉ số RS (Relative Strength) — bấm chỉ số để xem giải thích" defaultOpen={true}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-0.5 px-1 text-xs">
                <MetricItem label="RS State" value={rsStock.rsState} explanations={RS_EXPLANATIONS['RS State']} />
                <MetricItem label="Vector" value={rsStock.vector} explanations={RS_EXPLANATIONS.Vector} />
                <MetricItem label="Bucket" value={rsStock.bucket} explanations={RS_EXPLANATIONS.Bucket} />
                <MetricItem label="RS%" value={`${rsStock.rsPct >= 0 ? '+' : ''}${rsStock.rsPct.toFixed(1)}%`} explanations={RS_EXPLANATIONS['RS%']} />
                <MetricItem label="Score" value={rsStock.score} explanations={RS_EXPLANATIONS.Score} />
                {!toStock && <MetricItem label="Regime" value={regime.regime} explanations={REGIME_EXPLANATION} />}
              </div>
            </DataSection>
          )}

          {/* Financial Data */}
          {finLoading && (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-zinc-500">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Đang tải dữ liệu tài chính...
            </div>
          )}

          {hasFinancials && (
            <>
              {financials.ratio && (
                <DataSection title="Tỷ số tài chính" defaultOpen={true}>
                  <FinTable data={financials.ratio} />
                </DataSection>
              )}
              {financials.income && (
                <DataSection title="Báo cáo kết quả kinh doanh">
                  <FinTable data={financials.income} />
                </DataSection>
              )}
              {financials.balance && (
                <DataSection title="Bảng cân đối kế toán">
                  <FinTable data={financials.balance} />
                </DataSection>
              )}
              {financials.cashflow && (
                <DataSection title="Báo cáo lưu chuyển tiền tệ">
                  <FinTable data={financials.cashflow} />
                </DataSection>
              )}
              {financials.extra && (
                <DataSection title="Chỉ số mở rộng (ROIC, Cash Cycle...)">
                  <FinTable data={financials.extra} />
                </DataSection>
              )}
            </>
          )}

          {!finLoading && !hasFinancials && (
            <div className="px-2 py-2 text-xs text-zinc-600 italic">Không tìm thấy dữ liệu tài chính cho mã này</div>
          )}

          {/* Company Extra Data */}
          {companyLoading && (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-zinc-500">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Đang tải thông tin công ty...
            </div>
          )}

          {companyExtra && (
            <>
              {/* Company Overview */}
              {companyExtra.overview && (
                <DataSection title={`Thông tin công ty — ${companyExtra.overview.industry || ''}`}>
                  <div className="px-2 text-xs text-zinc-400 leading-relaxed space-y-1.5">
                    {companyExtra.overview.profile && <p>{companyExtra.overview.profile}</p>}
                  </div>
                </DataSection>
              )}

              {/* Company Ratios (aggregated) */}
              {companyExtra.ratios.length > 0 && (
                <DataSection title="Chỉ số công ty (theo năm)">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="px-2 py-1 text-left text-zinc-500 font-normal">Chỉ tiêu</th>
                          {companyExtra.ratios.map(r => (
                            <th key={r.year} className="px-2 py-1 text-right text-zinc-500 font-normal">{r.year}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Tăng trưởng DT', key: 'revenueGrowth' as const },
                          { label: 'Tăng trưởng LNST', key: 'netProfitGrowth' as const },
                          { label: 'Biên LN gộp', key: 'grossMargin' as const },
                          { label: 'Biên EBIT', key: 'ebitMargin' as const },
                          { label: 'Biên LN ròng', key: 'netProfitMargin' as const },
                          { label: 'ROE', key: 'roe' as const },
                          { label: 'ROIC', key: 'roic' as const },
                          { label: 'ROA', key: 'roa' as const },
                          { label: 'P/E', key: 'pe' as const },
                          { label: 'P/B', key: 'pb' as const },
                          { label: 'P/S', key: 'ps' as const },
                          { label: 'EPS', key: 'eps' as const },
                          { label: 'BVPS', key: 'bvps' as const },
                          { label: 'D/E', key: 'de' as const },
                          { label: 'Current Ratio', key: 'currentRatio' as const },
                          { label: 'Cổ tức', key: 'dividend' as const },
                          { label: 'CCC (ngày)', key: 'ccc' as const },
                        ].map(({ label, key }) => (
                          <tr key={key} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                            <td className="px-2 py-1 text-zinc-400">{label}</td>
                            {companyExtra.ratios.map(r => (
                              <td key={r.year} className="px-2 py-1 text-right font-mono text-zinc-300">{r[key]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DataSection>
              )}

              {/* Ownership Structure + Freefloat + Shareholders */}
              {(companyExtra.ownership.length > 0 || companyExtra.shareholders.length > 0) && (
                <DataSection title={`Cơ cấu sở hữu & Cổ đông${companyExtra.freefloatPct !== null ? ` — Freefloat: ${companyExtra.freefloatPct.toFixed(1)}%` : ''}`}>
                  {/* Ownership breakdown */}
                  {companyExtra.ownership.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2 px-2 mb-2">
                        {companyExtra.ownership.map((o, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/50">
                            <span className="text-[11px] text-zinc-400">{o.ownerType}</span>
                            <span className="text-[11px] font-mono font-bold text-zinc-200">{o.ownershipPct.toFixed(1)}%</span>
                          </div>
                        ))}
                        {companyExtra.freefloatPct !== null && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/30">
                            <span className="text-[11px] text-green-400">Freefloat</span>
                            <span className="text-[11px] font-mono font-bold text-green-300">{companyExtra.freefloatPct.toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Shareholders table */}
                  {companyExtra.shareholders.length > 0 && (
                    <div className="overflow-x-auto">
                      <div className="px-2 pb-1 text-[11px] text-zinc-500 font-medium">Cổ đông lớn ({companyExtra.shareholders.length})</div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="px-2 py-1 text-left text-zinc-500 font-normal">Tên</th>
                            <th className="px-2 py-1 text-right text-zinc-500 font-normal">Số CP</th>
                            <th className="px-2 py-1 text-right text-zinc-500 font-normal">Tỷ lệ</th>
                            <th className="px-2 py-1 text-right text-zinc-500 font-normal">Cập nhật</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyExtra.shareholders.map((s, i) => (
                            <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                              <td className="px-2 py-1 text-zinc-300 max-w-[250px] truncate" title={s.name}>{s.name}</td>
                              <td className="px-2 py-1 text-right font-mono text-zinc-300">{s.sharesOwned}</td>
                              <td className="px-2 py-1 text-right font-mono text-amber-400 font-bold">{s.ownershipPct}</td>
                              <td className="px-2 py-1 text-right text-zinc-500">{s.updateDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </DataSection>
              )}

              {/* Subsidiaries */}
              {companyExtra.subsidiaries.length > 0 && (
                <DataSection title={`Công ty con & liên kết (${companyExtra.subsidiaries.length})`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="px-2 py-1 text-left text-zinc-500 font-normal">Tên</th>
                          <th className="px-2 py-1 text-right text-zinc-500 font-normal">Vốn</th>
                          <th className="px-2 py-1 text-right text-zinc-500 font-normal">Sở hữu</th>
                          <th className="px-2 py-1 text-right text-zinc-500 font-normal">Loại</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyExtra.subsidiaries.map((s, i) => (
                          <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                            <td className="px-2 py-1 text-zinc-300 max-w-[250px] truncate" title={s.name}>{s.name}</td>
                            <td className="px-2 py-1 text-right font-mono text-zinc-300">{s.charterCapital}</td>
                            <td className="px-2 py-1 text-right font-mono text-blue-400 font-bold">{s.ownershipPct}</td>
                            <td className="px-2 py-1 text-right text-zinc-500">{s.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DataSection>
              )}

              {/* Insider Trading */}
              {companyExtra.insiderTrades.length > 0 && (
                <DataSection title={`Giao dịch nội bộ (${companyExtra.insiderTrades.length})`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="px-2 py-1 text-left text-zinc-500 font-normal">Ngày</th>
                          <th className="px-2 py-1 text-left text-zinc-500 font-normal">Chức vụ</th>
                          <th className="px-2 py-1 text-right text-zinc-500 font-normal">Mua</th>
                          <th className="px-2 py-1 text-right text-zinc-500 font-normal">Bán</th>
                          <th className="px-2 py-1 text-right text-zinc-500 font-normal">Trước GD</th>
                          <th className="px-2 py-1 text-right text-zinc-500 font-normal">Sau GD</th>
                          <th className="px-2 py-1 text-right text-zinc-500 font-normal">TT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyExtra.insiderTrades.map((t, i) => (
                          <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                            <td className="px-2 py-1 text-zinc-400 whitespace-nowrap">{t.dateAction}</td>
                            <td className="px-2 py-1 text-zinc-300 max-w-[120px] truncate" title={t.position}>{t.position}</td>
                            <td className="px-2 py-1 text-right font-mono text-green-400">{t.buyVol}</td>
                            <td className="px-2 py-1 text-right font-mono text-red-400">{t.sellVol}</td>
                            <td className="px-2 py-1 text-right font-mono text-zinc-400">{t.volBefore}</td>
                            <td className="px-2 py-1 text-right font-mono text-zinc-300">{t.volAfter}</td>
                            <td className="px-2 py-1 text-right text-zinc-500">{t.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DataSection>
              )}

              {/* Company News */}
              {companyExtra.news.length > 0 && (
                <DataSection title={`Tin tức công ty (${companyExtra.news.length})`}>
                  <div className="space-y-2 px-1">
                    {companyExtra.news.map((n, i) => (
                      <div key={i} className="flex items-start gap-2 py-1 border-b border-zinc-800/30">
                        <span className="text-[10px] text-zinc-600 whitespace-nowrap mt-0.5">{n.publicDate}</span>
                        <div className="flex-1 min-w-0">
                          {n.sourceLink ? (
                            <a href={n.sourceLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline leading-snug line-clamp-2">{n.title}</a>
                          ) : (
                            <span className="text-xs text-zinc-300 leading-snug line-clamp-2">{n.title}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </DataSection>
              )}
            </>
          )}

          {/* AI Analysis */}
          {analysis && (
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-amber-400">
                <Sparkles className="w-4 h-4" />
                AI Phân tích
              </div>
              <SimpleMarkdown text={analysis} />
              {isLoading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Đang phân tích...
                </div>
              )}
            </div>
          )}

          {!analysis && !isLoading && !error && (
            <div className="text-center py-4 text-xs text-zinc-600">
              Xem dữ liệu phía trên, sau đó bấm <strong className="text-amber-400">AI Phân tích</strong> để nhận phân tích toàn diện
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 text-[10px] text-zinc-600 text-center">
          Dữ liệu tài chính từ vnstock — Phân tích bởi Claude AI — Chỉ mang tính tham khảo
        </div>
      </div>
    </div>
  );
}

// ==================== TO TABLE ====================

function TOTable({ stocks, onStockClick, companyNameMap = {} }: { stocks: TOStock[]; onStockClick?: (s: TOStock) => void; companyNameMap?: Record<string, string> }) {
  const [sortKey, setSortKey] = useState<TOSortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => sortTOStocks(stocks, sortKey, sortDir), [stocks, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key as TOSortKey); setSortDir('desc'); }
  };

  if (stocks.length === 0) {
    return <div className="py-4 text-center text-zinc-500 text-sm">Không tìm thấy mã nào</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <SortHeader label="Ticker" sortKey="symbol" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Price" sortKey="price" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="%" sortKey="changePct" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="GTGD" sortKey="gtgd" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="State" sortKey="state" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="TPaths" sortKey="tpaths" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="MTF" sortKey="mtf" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="QTier" sortKey="qtier" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="MIPh" sortKey="miph" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="MI" sortKey="mi" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Rank" sortKey="rank" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.symbol} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => onStockClick?.(s)}>
              <td className="px-2 py-1.5">
                <span className="font-bold text-zinc-100">{s.symbol}</span>
                {companyNameMap[s.symbol] && (
                  <span className="ml-1.5 text-[10px] text-zinc-500">{companyNameMap[s.symbol]}</span>
                )}
              </td>
              <td className="px-2 py-1.5 font-mono text-xs text-zinc-300">{s.price.toLocaleString()}</td>
              <td className="px-2 py-1.5"><PctCell value={s.changePct} /></td>
              <td className="px-2 py-1.5 font-mono text-xs text-zinc-400">{s.gtgd}</td>
              <td className="px-2 py-1.5"><CellBadge value={s.state} colorMap={STATE_COLORS} /></td>
              <td className="px-2 py-1.5"><CellBadge value={s.tpaths} colorMap={TPATH_COLORS} /></td>
              <td className="px-2 py-1.5"><CellBadge value={s.mtf} colorMap={MTF_COLORS} /></td>
              <td className="px-2 py-1.5"><CellBadge value={s.qtier} colorMap={QTIER_COLORS} /></td>
              <td className="px-2 py-1.5"><CellBadge value={s.miph} colorMap={MIPH_COLORS} /></td>
              <td className="px-2 py-1.5"><MIBar value={s.mi} /></td>
              <td className="px-2 py-1.5 font-mono text-xs font-bold text-amber-400">{s.rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== RS TABLE ====================

function RSTable({ stocks, onStockClick, companyNameMap = {} }: { stocks: RSStock[]; onStockClick?: (s: RSStock) => void; companyNameMap?: Record<string, string> }) {
  const [sortKey, setSortKey] = useState<RSSortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => sortRSStocks(stocks, sortKey, sortDir), [stocks, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key as RSSortKey); setSortDir('desc'); }
  };

  if (stocks.length === 0) {
    return <div className="py-4 text-center text-zinc-500 text-sm">Không tìm thấy mã nào</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <SortHeader label="Ticker" sortKey="symbol" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Price" sortKey="price" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="%Chg" sortKey="changePct" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="GTGD" sortKey="gtgd" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="State" sortKey="rsState" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Vector" sortKey="vector" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Bucket" sortKey="bucket" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="RS%" sortKey="rsPct" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Score" sortKey="score" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.symbol} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => onStockClick?.(s)}>
              <td className="px-2 py-1.5">
                <span className="font-bold text-zinc-100">{s.symbol}</span>
                {companyNameMap[s.symbol] && (
                  <span className="ml-1.5 text-[10px] text-zinc-500">{companyNameMap[s.symbol]}</span>
                )}
              </td>
              <td className="px-2 py-1.5 font-mono text-xs text-zinc-300">{s.price.toLocaleString()}</td>
              <td className="px-2 py-1.5"><PctCell value={s.changePct} /></td>
              <td className="px-2 py-1.5 font-mono text-xs text-zinc-400">{s.gtgd}</td>
              <td className="px-2 py-1.5"><CellBadge value={s.rsState} colorMap={RS_STATE_COLORS} /></td>
              <td className="px-2 py-1.5"><CellBadge value={s.vector} colorMap={VECTOR_COLORS} /></td>
              <td className="px-2 py-1.5"><CellBadge value={s.bucket} colorMap={BUCKET_COLORS} /></td>
              <td className="px-2 py-1.5">
                <span className={`font-mono text-xs font-bold ${s.rsPct > 0 ? 'text-green-400' : s.rsPct < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                  {s.rsPct > 0 ? '+' : ''}{s.rsPct.toFixed(1)}%
                </span>
              </td>
              <td className="px-2 py-1.5">
                <MIBar value={s.score} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== COLLAPSIBLE SECTION ====================

// Tier explanations
const TIER_EXPLANATIONS: Record<string, string> = {
  tier1a: 'Nhóm entry TỐI ƯU nhất. Cổ phiếu phải đạt cả 3 điều kiện: QTier = PRIME (chất lượng cao nhất), State = RETEST hoặc CONFIRM (điểm entry an toàn), MTF = SYNC (tất cả khung thời gian đồng thuận tăng). Đây là nhóm có xác suất thành công cao nhất — ưu tiên giải ngân trong BULL regime.',
  tier2a: 'Nhóm entry ĐƯỢC PHÉP. QTier ≥ VALID + State = RETEST/CONFIRM + MTF ≠ WEAK. Chất lượng tốt nhưng không hoàn hảo như Tier 1A (có thể MTF chỉ PARTIAL hoặc QTier = VALID). Vẫn đáng mua nhưng nên giảm size so với Tier 1A.',
  s_major_trend: 'Cổ phiếu đang trong xu hướng tăng MẠNH NHẤT (S_MAJOR = giá > MA20 > MA50 > MA200). State = TREND nghĩa là đang chạy, không phải điểm entry mới. MI HIGH/PEAK = momentum vẫn khỏe. Chiến lược: GIỮ vị thế đang có, trailing stop, KHÔNG mua đuổi ở đây.',
  fresh_breakout: 'Cổ phiếu VỪA phá vỡ vùng kháng cự/tích lũy. Điều kiện: State = BREAKOUT + QTier ≥ VALID + Volume Ratio ≥ 1.5x (khối lượng xác nhận breakout). Cơ hội mua nhanh nhưng rủi ro cao hơn Tier 1A/2A vì chưa được xác nhận. Cần stop-loss chặt.',
  quality_retest: 'Pullback chất lượng CAO. Cổ phiếu S_MAJOR (trend mạnh nhất) đang quay về test hỗ trợ (RETEST) với RQS ≥ 60 (chất lượng retest tốt). Đây là cơ hội "mua giá tốt" trong uptrend mạnh. Nếu giữ hỗ trợ → entry đẹp.',
  pipeline: 'Nhóm THEO DÕI — cổ phiếu đang tích lũy (BASE) với chất lượng tốt (QTier ≥ VALID) và momentum đang hồi phục (MI ≥ MID). Chưa có tín hiệu entry rõ ràng. Theo dõi để bắt khi breakout hoặc chuyển sang CONFIRM/RETEST.',
};

const RS_CAT_EXPLANATIONS: Record<string, string> = {
  sync_active: 'RS SYNC + ACTIVE — Cổ phiếu mạnh hơn VN-Index trên CẢ 3 khung thời gian (Daily, Weekly, Monthly) + đang active (thanh khoản tốt). Nhóm MẠNH NHẤT về sức mạnh tương đối. Ưu tiên mua trong BULL regime.',
  d_lead_active: 'RS D_LEAD + ACTIVE — Daily RS dẫn đầu, Monthly RS chưa hoàn toàn. Có thể là cổ phiếu đang BẮT ĐẦU chu kỳ outperform mới. Theo dõi để xem có chuyển sang SYNC không.',
  m_lead_active: 'RS M_LEAD + ACTIVE — Monthly RS vẫn mạnh, Daily RS đang nghỉ/điều chỉnh. Cổ phiếu có nền tảng RS dài hạn tốt nhưng ngắn hạn đang yếu đi. Có thể là cơ hội mua pullback nếu Daily RS hồi phục.',
  probe_watch: 'Nhóm THEO DÕI — RS chưa đủ mạnh hoặc chưa active. Có thể đang hình thành RS mới. Không ưu tiên mua nhưng theo dõi để bắt sớm khi RS cải thiện.',
};

function TierSection({ name, description, count, color, defaultOpen, children, tierKey }: {
  name: string;
  description: string;
  count: number;
  color: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  tierKey?: string;
}) {
  const [open, setOpen] = useState(defaultOpen ?? count > 0);
  const [showExpl, setShowExpl] = useState(false);
  const explanation = tierKey ? (TIER_EXPLANATIONS[tierKey] || RS_CAT_EXPLANATIONS[tierKey]) : undefined;

  return (
    <div className={`rounded-lg border border-zinc-800 overflow-hidden ${color} border-l-4`}>
      <div className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          {open ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
          <span className="font-bold text-sm text-zinc-100">{name}</span>
          <span className="text-xs text-zinc-500">{description}</span>
        </button>
        <div className="flex items-center gap-2">
          {explanation && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowExpl(s => !s); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${showExpl ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'}`}
            >
              ?
            </button>
          )}
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-200 text-xs font-mono">
            {count}
          </Badge>
        </div>
      </div>
      {showExpl && explanation && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs leading-relaxed text-zinc-400">
          {explanation}
        </div>
      )}
      {open && (
        <div className="px-2 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ==================== SUMMARY STATS ====================

function StatCard({ label, value, color, hint }: { label: string; value: number | string; color?: string; hint?: string }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div
      className={`flex flex-col items-center p-3 rounded-lg bg-zinc-900 border border-zinc-800 ${hint ? 'cursor-pointer hover:bg-zinc-800/60' : ''} transition-colors`}
      onClick={() => hint && setShowHint(h => !h)}
    >
      <span className="text-[11px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
        {label}
        {hint && <span className="text-zinc-700 text-[9px]">?</span>}
      </span>
      <span className={`text-xl font-bold font-mono ${color || 'text-zinc-100'}`}>{value}</span>
      {showHint && hint && (
        <p className="mt-1.5 text-[10px] leading-snug text-zinc-500 text-center">{hint}</p>
      )}
    </div>
  );
}

// ==================== REGIME COLORS ====================

const REGIME_COLORS: Record<RegimeState, string> = {
  BULL: 'bg-green-500 text-white',
  NEUTRAL: 'bg-amber-500 text-white',
  BEAR: 'bg-red-500 text-white',
  BLOCKED: 'bg-gray-500 text-white',
};

const REGIME_BG: Record<RegimeState, string> = {
  BULL: 'bg-green-500/10 border-green-500/30',
  NEUTRAL: 'bg-amber-500/10 border-amber-500/30',
  BEAR: 'bg-red-500/10 border-red-500/30',
  BLOCKED: 'bg-gray-500/10 border-gray-500/30',
};

const REGIME_TEXT: Record<RegimeState, string> = {
  BULL: 'text-green-400',
  NEUTRAL: 'text-amber-400',
  BEAR: 'text-red-400',
  BLOCKED: 'text-gray-400',
};

const REGIME_ICON: Record<RegimeState, typeof TrendingUp> = {
  BULL: TrendingUp,
  NEUTRAL: Minus,
  BEAR: TrendingDown,
  BLOCKED: XCircle,
};

// ==================== REGIME SCORE BAR ====================

function RegimeScoreBar({ score, label }: { score: number; label?: string }) {
  // score is -100 to +100, map to 0-100 for display
  const pct = Math.round((score + 100) / 2);
  const color = score >= 25 ? 'bg-green-500' : score <= -25 ? 'bg-red-500' : 'bg-amber-500';
  return (
    <div className="space-y-1">
      {label && <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden relative">
          {/* Center marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600 z-10" />
          <div
            className={`h-full rounded-full ${color} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-mono font-bold min-w-[36px] text-right ${score >= 25 ? 'text-green-400' : score <= -25 ? 'text-red-400' : 'text-amber-400'}`}>
          {score > 0 ? '+' : ''}{score}
        </span>
      </div>
    </div>
  );
}

// ==================== MARKET REGIME PANEL ====================

// Badge color mapping for regime layers
const REGIME_BADGE_COLORS: Record<string, string> = {
  LIMITED: 'bg-green-500 text-white',
  CHECK: 'bg-green-500 text-white',
  ALL_WEAK: 'bg-red-500 text-white border-2 border-red-500',
  LOW: 'bg-red-500 text-white',
  MED: 'bg-amber-500 text-white',
  HIGH: 'bg-green-500 text-white',
  CLEAR: 'bg-green-500 text-white',
  ROTATING: 'bg-amber-500 text-white',
};

// Score multipliers for regime calculation
const POSITIVE_SCORE_MULTIPLIER = 1.00;
const NEGATIVE_SCORE_MULTIPLIER = 0.50;

// Minimum threshold for showing labels in distribution charts (5%)
const MIN_CHART_LABEL_THRESHOLD = 0.05;

// Helper function to convert boolean to Yes/No
const boolToYesNo = (value: boolean): string => value ? 'Yes' : 'No';

// Action guide text mapping
const ACTION_GUIDES: Record<RegimeState, { title: string; bullets: string[] }> = {
  BLOCKED: {
    title: 'HƯỚNG DẪN HÀNH ĐỘNG — BLOCKED',
    bullets: [
      '• KHÔNG mở vị thế mới — toàn bộ index đều EXIT',
      '• Chuyển cash, bảo toàn vốn là ưu tiên số 1',
      '• Tín hiệu dẫn đường (breadth/rotation) chỉ để CHUẨN BỊ, không phải hành động',
      '• Theo dõi: index nào thoát EXIT trước → xác định hướng đi tiếp theo',
    ],
  },
  BEAR: {
    title: 'HƯỚNG DẪN HÀNH ĐỘNG — BEAR',
    bullets: [
      '• Phòng thủ. Không mở mới.',
      '• Chờ tín hiệu phục hồi.',
      '• Bảo vệ vốn là ưu tiên.',
    ],
  },
  NEUTRAL: {
    title: 'HƯỚNG DẪN HÀNH ĐỘNG — NEUTRAL',
    bullets: [
      '• Chọn lọc. Chỉ Tier 1A.',
      '• Giảm size.',
      '• Bảo vệ vốn.',
    ],
  },
  BULL: {
    title: 'HƯỚNG DẪN HÀNH ĐỘNG — BULL',
    bullets: [
      '• Ưu tiên giải ngân.',
      '• Tìm Tier 1A/2A.',
      '• Giữ vị thế Trend.',
    ],
  },
};

// Top banner with expandable regime explanation
function RegimeBanner({ regime, allocation, scoreMultiplier, regimeTextColor }: {
  regime: RegimeState; allocation: string; scoreMultiplier: number; regimeTextColor: string;
}) {
  const [showExpl, setShowExpl] = useState(false);
  const expl = REGIME_EXPLANATION.values[regime];
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      <div className="flex items-center justify-between">
        <button className="text-left" onClick={() => setShowExpl(s => !s)}>
          <span className={`text-3xl font-black ${regimeTextColor}`}>{regime}</span>
          <span className="ml-2 text-zinc-700 text-xs">bấm để xem giải thích</span>
        </button>
        <div className="text-right">
          <div className="text-lg font-bold text-zinc-100">Stop: {allocation}</div>
          <div className="text-sm text-zinc-400">{regime} × {scoreMultiplier.toFixed(2)} | {allocation}</div>
        </div>
      </div>
      {showExpl && expl && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/40 text-xs leading-relaxed text-zinc-400">
          <span className={`font-bold ${regimeTextColor}`}>{regime}</span>: {expl}
        </div>
      )}
    </div>
  );
}

// Clickable section title with expandable explanation for regime panel
function SectionTitle({ title, hint }: { title: string; hint: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <button
        className="flex items-center gap-2 text-lg font-bold text-zinc-100 hover:text-amber-400 transition-colors"
        onClick={() => setShow(s => !s)}
      >
        {title}
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${show ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`}>?</span>
      </button>
      {show && (
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 bg-zinc-800/40 rounded-lg px-3 py-2 border border-zinc-700/40">
          {hint}
        </p>
      )}
    </div>
  );
}

function MarketRegimePanel({ regime, distribution }: {
  regime: MarketRegime;
  distribution: AnalysisResult['distribution'];
}) {
  const actionGuide = ACTION_GUIDES[regime.regime] || ACTION_GUIDES.NEUTRAL;

  // Use distribution data from ALL analyzed stocks (universe)
  const { qtier: qtierDist, rsVector: rsDist } = distribution;
  const rsVectorCounts = {
    SYNC: rsDist.sync,
    D_LEAD: rsDist.dLead,
    M_LEAD: rsDist.mLead,
    WEAK: rsDist.weak,
    NEUT: rsDist.neut,
  };
  const rsTotal = rsDist.total;
  const totalStocks = qtierDist.total;
  const counts = { prime: qtierDist.prime, valid: qtierDist.valid, watch: qtierDist.watch, avoid: qtierDist.avoid };

  // Determine regime text color
  const regimeTextColor = REGIME_TEXT[regime.regime] || 'text-zinc-400';
  const scoreMultiplier = regime.score >= 0 ? POSITIVE_SCORE_MULTIPLIER : NEGATIVE_SCORE_MULTIPLIER;

  return (
    <div className="space-y-4">
      {/* Section 1: Top Banner */}
      <RegimeBanner regime={regime.regime} allocation={regime.allocation} scoreMultiplier={scoreMultiplier} regimeTextColor={regimeTextColor} />

      {/* Section 2: Current Regime Box */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-zinc-500 uppercase mb-2">CURRENT REGIME</div>
            <div className="text-3xl font-black text-zinc-100">{regime.regime}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 uppercase mb-2">ALLOCATION</div>
            <div className="text-xl font-bold text-zinc-100">{regime.allocation}</div>
          </div>
        </div>
        
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">PREVIOUS:</span>
            <span className="font-bold text-zinc-100">{regime.regime}</span>
            <span className="text-zinc-600">→</span>
            <span className="text-zinc-400">CURRENT:</span>
            <span className="font-bold text-zinc-100">{regime.regime}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold ${REGIME_BADGE_COLORS[regime.layer4Output.badge] || 'bg-zinc-700 text-zinc-300'}`}>
            {regime.layer4Output.badge}
          </span>
          <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500 text-white">
            Code: {regime.score}
          </span>
          <span className="px-2 py-1 rounded text-xs font-bold bg-red-500 text-white">
            ×{scoreMultiplier.toFixed(2)}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-bold ${REGIME_BADGE_COLORS[regime.layer3Breadth.badge] || 'bg-zinc-700 text-zinc-300'}`}>
            {regime.layer3Breadth.badge}
          </span>
        </div>
      </div>

      {/* Section 3: Action Guide */}
      <div className="rounded-lg border-l-4 border-amber-500 bg-amber-500/10 p-4">
        <h4 className="font-bold text-sm text-zinc-100 mb-3">{actionGuide.title}</h4>
        <div className="space-y-1">
          {actionGuide.bullets.map((bullet, i) => (
            <p key={i} className="text-xs text-zinc-300">{bullet}</p>
          ))}
        </div>
      </div>

      {/* Section 4: 4-LAYER FRAMEWORK */}
      <div>
        <SectionTitle
          title="4-LAYER FRAMEWORK"
          hint="Hệ thống 4 lớp đánh giá sức khỏe thị trường. Layer 1 (Ceiling): VN-Index có bị chặn không? Layer 2 (Components): VN30/VNMID đang rotation hay đồng thuận? Layer 3 (Breadth): % cổ phiếu trên EMA50, xác định quadrant Bull/Bear. Layer 4 (Output): Tổng hợp → quyết định Regime (BULL/NEUTRAL/BEAR/BLOCKED) và mức phân bổ vốn."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1 - LAYER 1 */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-bold text-zinc-500 uppercase">LAYER 1</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${REGIME_BADGE_COLORS[regime.layer1Ceiling.badge] || 'bg-zinc-700 text-zinc-300'}`}>
                {regime.layer1Ceiling.badge}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mb-2">VNINDEX TO (Ceiling)</div>
            <div className="text-xl font-black text-zinc-100 mb-3">{regime.layer1Ceiling.status}</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Broken:</span>
                <span className="text-amber-500">⚠ {boolToYesNo(regime.layer1Ceiling.broken)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Weak:</span>
                <span className="text-amber-500">⚠ {boolToYesNo(regime.layer1Ceiling.weak)}</span>
              </div>
            </div>
          </div>

          {/* Card 2 - LAYER 2 */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-bold text-zinc-500 uppercase">LAYER 2</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${REGIME_BADGE_COLORS[regime.layer2Components.badge] || 'bg-zinc-700 text-zinc-300'}`}>
                {regime.layer2Components.badge}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mb-2">Components (Rotation)</div>
            <div className="text-xl font-black text-zinc-100 mb-3">{regime.layer2Components.status}</div>
            <div className="space-y-1 text-xs">
              <div className="text-zinc-300">VN30: {regime.layer2Components.vn30Status} (dMI: {regime.layer2Components.vn30dMI >= 0 ? '+' : ''}{regime.layer2Components.vn30dMI.toFixed(0)})</div>
              <div className="text-zinc-300">VNMID: {regime.layer2Components.vnmidStatus} (dMI: {regime.layer2Components.vnmiddMI >= 0 ? '+' : ''}{regime.layer2Components.vnmiddMI.toFixed(0)})</div>
              <div className="text-zinc-400">Rotation: {regime.layer2Components.rotation}</div>
            </div>
          </div>

          {/* Card 3 - LAYER 3 */}
          <div className={`rounded-lg border p-4 ${regime.layer3Breadth.badge === 'ALL_WEAK' ? 'border-red-500 bg-zinc-950' : 'border-zinc-800 bg-zinc-950'}`}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-bold text-zinc-500 uppercase">LAYER 3</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${REGIME_BADGE_COLORS[regime.layer3Breadth.badge] || 'bg-zinc-700 text-zinc-300'}`}>
                {regime.layer3Breadth.badge}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mb-2">Breadth V2 (Quadrant)</div>
            <div className="text-xl font-black text-zinc-100 mb-3">AllStock {regime.layer3Breadth.allStockQuadrant}</div>
            <div className="space-y-1 text-xs">
              <div className="text-zinc-300">VN30: {regime.layer3Breadth.vn30Breadth.quadrant} {regime.layer3Breadth.vn30Breadth.aboveEMA50Pct.toFixed(0)}% (s {regime.layer3Breadth.vn30Breadth.slope5d >= 0 ? '+' : ''}{regime.layer3Breadth.vn30Breadth.slope5d.toFixed(1)})</div>
              <div className="text-zinc-300">VNMID: {regime.layer3Breadth.vnmidBreadth.quadrant} {regime.layer3Breadth.vnmidBreadth.aboveEMA50Pct.toFixed(0)}% (s {regime.layer3Breadth.vnmidBreadth.slope5d >= 0 ? '+' : ''}{regime.layer3Breadth.vnmidBreadth.slope5d.toFixed(1)})</div>
              <div className="text-zinc-300">All: {regime.layer3Breadth.allStockQuadrant}: {regime.layer3Breadth.signal} {regime.layer3Breadth.allStockAboveEMA50.toFixed(1)}%</div>
              <div className="text-green-400">Base: {regime.layer3Breadth.base}</div>
            </div>
          </div>

          {/* Card 4 - LAYER 4 */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-bold text-zinc-500 uppercase">LAYER 4</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${REGIME_BADGE_COLORS[regime.layer4Output.badge] || 'bg-zinc-700 text-zinc-300'}`}>
                {regime.layer4Output.badge}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mb-2">Regime Output</div>
            <div className="text-xl font-black text-zinc-100 mb-3">{regime.regime}</div>
            <div className="space-y-1 text-xs">
              <div className="text-zinc-300">Base: <span className="font-bold">{regime.layer4Output.base}</span> → Ceiling: <span className="font-bold">{regime.layer4Output.ceilingStatus}</span></div>
              <div className="text-zinc-300">Dir: <span className="font-bold">{regime.layer4Output.direction}</span> | Mode: <span className="font-bold">{regime.layer4Output.mode}</span></div>
              <div className="text-zinc-300">Lead: <span className="font-bold">{regime.layer4Output.lead}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: INDEX OVERVIEW — LAYER 1 CEILING */}
      <div>
        <SectionTitle
          title="INDEX OVERVIEW — LAYER 1 CEILING"
          hint="Tổng quan các chỉ số chính (VN-Index, VN30, VNMID, VN100). Mỗi index hiển thị: giá, state (trạng thái kỹ thuật), MI (momentum), TrendPath, BQS (breakout quality), RQS (retest quality), VolX (volume ratio). Nếu VN-Index ở trạng thái WEAK/EXIT → ceiling bị phá, regime sẽ chuyển BEAR/BLOCKED."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {regime.indices.map((index) => {
            const price = index.close || regime.indexLayer?.vnindex || 0;
            const changePct = index.changePct || regime.indexLayer?.changePct || 0;
            
            return (
              <div key={index.symbol} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-bold text-zinc-100">{index.symbol}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500 text-white">
                    {index.state}
                  </span>
                </div>
                <div className="mb-3">
                  <span className="text-2xl font-bold text-zinc-100">{price > 0 ? price.toLocaleString('en', { maximumFractionDigits: 2 }) : 'N/A'}</span>
                  {changePct !== 0 && (
                    <span className={`ml-2 text-sm font-bold ${changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs text-zinc-400">
                  <div>MI: {index.mi.toFixed(1)} ({index.miPhase}) | TPath: {index.tpath}</div>
                  <div>MI D/W/M: {index.miD.toFixed(0)}/{index.miW.toFixed(0)}/{index.miM.toFixed(0)}</div>
                  <div>dMI_D: {index.dMI_D >= 0 ? '+' : ''}{index.dMI_D.toFixed(1)} | dMI_W: {index.dMI_W >= 0 ? '+' : ''}{index.dMI_W.toFixed(1)}</div>
                  <div>BQS: {index.bqs.toFixed(0)} | RQS: {index.rqs.toFixed(0)} | VolX: {index.volX.toFixed(1)} | Normal</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 6: BREADTH ANALYSIS — LAYER 3 QUADRANT */}
      <div>
        <SectionTitle
          title="BREADTH ANALYSIS — LAYER 3 QUADRANT"
          hint="Phân tích độ rộng thị trường — đo bao nhiêu % cổ phiếu trên EMA50. Quadrant: Q1 (Bull) = %EMA50 cao + slope dương, Q2 (Weak Bull) = %EMA50 cao nhưng slope âm (đang suy yếu), Q3 (Bear) = %EMA50 thấp + slope âm, Q4 (Weak Bear) = %EMA50 thấp nhưng slope dương (đang hồi phục). Slope 5d/10d cho biết tốc độ thay đổi, Accel cho biết xu hướng đang tăng tốc hay chậm lại."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: 'VN30', breadthData: regime.layer3Breadth.vn30Breadth, isAll: false },
            { name: 'VNMID', breadthData: regime.layer3Breadth.vnmidBreadth, isAll: false },
            { name: 'ALLSTOCK', breadthData: null, isAll: true },
          ].map((item) => {
            const aboveEMA50 = item.isAll 
              ? regime.layer3Breadth.allStockAboveEMA50 
              : (item.breadthData?.aboveEMA50Pct || 0);
            const quadrant = item.isAll 
              ? regime.layer3Breadth.allStockQuadrant 
              : (item.breadthData?.quadrant || 'Q3');
            const slope5d = item.isAll ? 0 : (item.breadthData?.slope5d || 0);
            const slope10d = item.isAll ? 0 : (item.breadthData?.slope10d || 0);
            const accel = item.isAll ? 0 : (item.breadthData?.accel || 0);
            
            const quadrantLabel = quadrant === 'Q1' ? 'Bull' : quadrant === 'Q2' ? 'Weak Bull' : quadrant === 'Q3' ? 'Bear' : 'Weak Bear';
            
            return (
              <div key={item.name} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="text-sm font-bold text-zinc-100 mb-2">{item.name}</div>
                <div className="mb-3">
                  <span className={`text-lg font-black ${quadrant === 'Q3' ? 'text-red-500' : quadrant === 'Q1' ? 'text-green-500' : 'text-amber-500'}`}>
                    {quadrant}: {quadrantLabel}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${aboveEMA50}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1 text-xs text-zinc-400">
                  {/* Note: EMA10 data not available, showing EMA50 for both as placeholder */}
                  <div>Trên EMA50: {aboveEMA50.toFixed(1)}% (EMA10: {aboveEMA50.toFixed(1)}%)</div>
                  {!item.isAll && (
                    <>
                      <div>Slope 5d: {slope5d.toFixed(2)} | 10d: {slope10d.toFixed(2)}</div>
                      <div>Accel: {accel.toFixed(2)}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 7: DISTRIBUTION SUMMARY */}
      <div>
        <SectionTitle
          title="DISTRIBUTION SUMMARY"
          hint="Phân bổ cổ phiếu theo RS Vector và QualityTier. RS Vector: SYNC (3 TF outperform) nhiều = thị trường khỏe, WEAK nhiều = thị trường yếu. QualityTier: PRIME+VALID nhiều = nhiều cơ hội chất lượng, WATCH+AVOID nhiều = ít cơ hội. So sánh tỷ lệ này qua thời gian để đánh giá thị trường đang cải thiện hay xấu đi."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RS VECTOR */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h4 className="text-sm font-bold text-zinc-200 mb-3">RS VECTOR ({rsTotal} STOCKS)</h4>
            <div className="space-y-2">
              <div className="flex h-8 rounded overflow-hidden">
                {rsVectorCounts.SYNC > 0 && (
                  <div 
                    className="bg-green-500 flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ width: `${(rsVectorCounts.SYNC / rsTotal) * 100}%` }}
                  >
                    {rsVectorCounts.SYNC > rsTotal * MIN_CHART_LABEL_THRESHOLD && `SYNC: ${rsVectorCounts.SYNC}`}
                  </div>
                )}
                {rsVectorCounts.D_LEAD > 0 && (
                  <div 
                    className="bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ width: `${(rsVectorCounts.D_LEAD / rsTotal) * 100}%` }}
                  >
                    {rsVectorCounts.D_LEAD > rsTotal * MIN_CHART_LABEL_THRESHOLD && `D_LEAD: ${rsVectorCounts.D_LEAD}`}
                  </div>
                )}
                {rsVectorCounts.M_LEAD > 0 && (
                  <div 
                    className="bg-cyan-500 flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ width: `${(rsVectorCounts.M_LEAD / rsTotal) * 100}%` }}
                  >
                    {rsVectorCounts.M_LEAD > rsTotal * MIN_CHART_LABEL_THRESHOLD && `M_LEAD: ${rsVectorCounts.M_LEAD}`}
                  </div>
                )}
                {rsVectorCounts.WEAK > 0 && (
                  <div 
                    className="bg-red-500 flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ width: `${(rsVectorCounts.WEAK / rsTotal) * 100}%` }}
                  >
                    {rsVectorCounts.WEAK > rsTotal * MIN_CHART_LABEL_THRESHOLD && `WEAK: ${rsVectorCounts.WEAK}`}
                  </div>
                )}
                {rsVectorCounts.NEUT > 0 && (
                  <div 
                    className="bg-zinc-600 flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ width: `${(rsVectorCounts.NEUT / rsTotal) * 100}%` }}
                  >
                    {rsVectorCounts.NEUT > rsTotal * MIN_CHART_LABEL_THRESHOLD && `NEUT: ${rsVectorCounts.NEUT}`}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-green-400">SYNC: {rsVectorCounts.SYNC} ({((rsVectorCounts.SYNC/rsTotal)*100).toFixed(0)}%)</span>
                <span className="text-blue-400">D_LEAD: {rsVectorCounts.D_LEAD} ({((rsVectorCounts.D_LEAD/rsTotal)*100).toFixed(0)}%)</span>
                <span className="text-cyan-400">M_LEAD: {rsVectorCounts.M_LEAD} ({((rsVectorCounts.M_LEAD/rsTotal)*100).toFixed(0)}%)</span>
                <span className="text-red-400">WEAK: {rsVectorCounts.WEAK} ({((rsVectorCounts.WEAK/rsTotal)*100).toFixed(0)}%)</span>
                <span className="text-zinc-400">NEUT: {rsVectorCounts.NEUT} ({((rsVectorCounts.NEUT/rsTotal)*100).toFixed(0)}%)</span>
              </div>
            </div>
          </div>

          {/* QUALITYTIER */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h4 className="text-sm font-bold text-zinc-200 mb-3">QUALITYTIER ({totalStocks} STOCKS)</h4>
            <div className="space-y-2">
              <div className="flex h-8 rounded overflow-hidden">
                {counts.prime > 0 && (
                  <div 
                    className="bg-green-500 flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ width: `${(counts.prime / totalStocks) * 100}%` }}
                  >
                    {counts.prime > totalStocks * MIN_CHART_LABEL_THRESHOLD && `PRIME: ${counts.prime}`}
                  </div>
                )}
                {counts.valid > 0 && (
                  <div 
                    className="bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ width: `${(counts.valid / totalStocks) * 100}%` }}
                  >
                    {counts.valid > totalStocks * MIN_CHART_LABEL_THRESHOLD && `VALID: ${counts.valid}`}
                  </div>
                )}
                {counts.watch > 0 && (
                  <div 
                    className="bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ width: `${(counts.watch / totalStocks) * 100}%` }}
                  >
                    {counts.watch > totalStocks * MIN_CHART_LABEL_THRESHOLD && `WATCH: ${counts.watch}`}
                  </div>
                )}
                {counts.avoid > 0 && (
                  <div 
                    className="bg-red-500 flex items-center justify-center text-[10px] font-bold text-white px-1"
                    style={{ width: `${(counts.avoid / totalStocks) * 100}%` }}
                  >
                    {counts.avoid > totalStocks * MIN_CHART_LABEL_THRESHOLD && `AVOID: ${counts.avoid}`}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-green-400">PRIME: {counts.prime} ({((counts.prime/totalStocks)*100).toFixed(0)}%)</span>
                <span className="text-blue-400">VALID: {counts.valid} ({((counts.valid/totalStocks)*100).toFixed(0)}%)</span>
                <span className="text-amber-400">WATCH: {counts.watch} ({((counts.watch/totalStocks)*100).toFixed(0)}%)</span>
                <span className="text-red-400">AVOID: {counts.avoid} ({((counts.avoid/totalStocks)*100).toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== LOADING SKELETON ====================

function AnalysisLoading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-lg border border-zinc-800 p-4 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      ))}
    </div>
  );
}

// ==================== MARKDOWN RENDERER ====================

function formatInline(text: string): ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, j) =>
    j % 2 === 1 ? <strong key={j} className="text-zinc-100 font-bold">{part}</strong> : part
  );
}

function SimpleMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-0.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i} className="text-base font-bold text-zinc-100 mt-5 mb-2 border-b border-zinc-800 pb-1">{formatInline(line.slice(3))}</h3>;
        }
        if (line.startsWith('### ')) {
          return <h4 key={i} className="text-sm font-bold text-amber-400 mt-3 mb-1">{formatInline(line.slice(4))}</h4>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <p key={i} className="text-sm text-zinc-300 pl-4 py-0.5">{formatInline('• ' + line.slice(2))}</p>;
        }
        if (/^\d+\.\s/.test(line)) {
          return <p key={i} className="text-sm text-zinc-300 pl-2 py-0.5">{formatInline(line)}</p>;
        }
        if (line.trim() === '') {
          return <div key={i} className="h-1.5" />;
        }
        return <p key={i} className="text-sm text-zinc-300 py-0.5">{formatInline(line)}</p>;
      })}
    </div>
  );
}

// ==================== AI RECOMMENDATION TAB ====================

const AI_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích thị trường chứng khoán Việt Nam với 20 năm kinh nghiệm. Nhiệm vụ: phân tích dữ liệu từ Market Dashboard V3 và đưa ra khuyến nghị đầu tư ngắn gọn, trực tiếp, có thể hành động ngay.

Nguyên tắc phân tích:
- Dựa trên Market Regime (Bull/Neutral/Bear/Blocked) để xác định mức độ tham gia thị trường
- Ưu tiên Tier 1A (PRIME + Entry State + SYNC) > Tier 2A > Fresh Breakout
- Kết hợp TO (Technical Oscillator) và RS (Relative Strength) để chọn mã tốt nhất
- Chú ý breadth, momentum, và 4-Layer Framework để đánh giá sức khỏe thị trường
- Xem xét GTGD (thanh khoản), MI (momentum), QTier (chất lượng cơ bản)

Yêu cầu output (BẮT BUỘC theo thứ tự):
1. **TỔNG QUAN THỊ TRƯỜNG** — Đánh giá 2-3 câu về tình hình chung
2. **NHẬN ĐỊNH XU HƯỚNG** — Ngắn hạn (1-2 tuần) và trung hạn (1-3 tháng)
3. **TOP MÃ KHUYẾN NGHỊ MUA** — 3-5 mã, mỗi mã kèm: lý do 1 dòng, giá hiện tại, mức mua vào gợi ý
4. **MÃ CẦN TRÁNH / CẮT LỖ** — Nếu có, kèm lý do ngắn
5. **CHIẾN LƯỢC HÀNH ĐỘNG** — Cụ thể: mua gì, bao nhiêu %, stop-loss ở đâu
6. **PHÂN BỔ VỐN GỢI Ý** — Tỷ lệ cash/stock theo regime hiện tại

Phong cách: ngắn gọn, bullet points, tập trung vào HÀNH ĐỘNG. Không giải thích dài dòng lý thuyết. Viết bằng tiếng Việt.
Disclaimer cuối: "Lưu ý: Đây là phân tích tham khảo từ AI, không phải khuyến nghị đầu tư chính thức."`;

function AIRecommendationTab({ data }: { data: AnalysisResult }) {
  const [recommendation, setRecommendation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('anthropic_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const generateSummary = useCallback(() => {
    const regime = data.regime;
    const dist = data.distribution;

    let s = `=== MARKET DASHBOARD V3 ===\n`;
    s += `Generated: ${data.generatedAt}\n`;
    s += `Total Stocks Analyzed: ${data.totalStocks}\n\n`;

    // Market Regime
    s += `--- MARKET REGIME ---\n`;
    s += `State: ${regime.regime} | Score: ${regime.score} | Allocation: ${regime.allocation}\n`;
    s += `Layer 1 (VNINDEX Ceiling): ${regime.layer1Ceiling.status} | Broken: ${regime.layer1Ceiling.broken} | Weak: ${regime.layer1Ceiling.weak}\n`;
    s += `Layer 2 (Components): VN30 ${regime.layer2Components.vn30Status} dMI:${regime.layer2Components.vn30dMI.toFixed(0)} | VNMID ${regime.layer2Components.vnmidStatus} dMI:${regime.layer2Components.vnmiddMI.toFixed(0)} | Rotation: ${regime.layer2Components.rotation}\n`;
    s += `Layer 3 (Breadth): AllStock ${regime.layer3Breadth.allStockQuadrant} ${regime.layer3Breadth.allStockAboveEMA50.toFixed(1)}% | Signal: ${regime.layer3Breadth.signal} | Base: ${regime.layer3Breadth.base}\n`;
    s += `  VN30: ${regime.layer3Breadth.vn30Breadth.quadrant} ${regime.layer3Breadth.vn30Breadth.aboveEMA50Pct.toFixed(0)}% slope5d:${regime.layer3Breadth.vn30Breadth.slope5d.toFixed(1)}\n`;
    s += `  VNMID: ${regime.layer3Breadth.vnmidBreadth.quadrant} ${regime.layer3Breadth.vnmidBreadth.aboveEMA50Pct.toFixed(0)}% slope5d:${regime.layer3Breadth.vnmidBreadth.slope5d.toFixed(1)}\n`;
    s += `Layer 4 (Output): ${regime.regime} | Dir: ${regime.layer4Output.direction} | Mode: ${regime.layer4Output.mode} | Lead: ${regime.layer4Output.lead}\n\n`;

    // Index Overview
    s += `--- INDEX OVERVIEW ---\n`;
    for (const idx of regime.indices) {
      const price = idx.close || 0;
      const chgPct = idx.changePct ?? 0;
      s += `${idx.symbol}: ${price > 0 ? price.toLocaleString('en', { maximumFractionDigits: 2 }) : 'N/A'} ${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}% State:${idx.state} MI:${idx.mi.toFixed(0)} Phase:${idx.miPhase} TPath:${idx.tpath} MI_D/W/M:${idx.miD.toFixed(0)}/${idx.miW.toFixed(0)}/${idx.miM.toFixed(0)} dMI_D:${idx.dMI_D >= 0 ? '+' : ''}${idx.dMI_D.toFixed(1)}\n`;
    }
    s += '\n';

    // Distribution
    const qTotal = dist.qtier.total || 1;
    const rTotal = dist.rsVector.total || 1;
    s += `--- DISTRIBUTION ---\n`;
    s += `QTier (${qTotal} stocks): PRIME=${dist.qtier.prime}(${((dist.qtier.prime / qTotal) * 100).toFixed(0)}%) VALID=${dist.qtier.valid}(${((dist.qtier.valid / qTotal) * 100).toFixed(0)}%) WATCH=${dist.qtier.watch}(${((dist.qtier.watch / qTotal) * 100).toFixed(0)}%) AVOID=${dist.qtier.avoid}(${((dist.qtier.avoid / qTotal) * 100).toFixed(0)}%)\n`;
    s += `RS Vector (${rTotal}): SYNC=${dist.rsVector.sync} D_LEAD=${dist.rsVector.dLead} M_LEAD=${dist.rsVector.mLead} WEAK=${dist.rsVector.weak} NEUT=${dist.rsVector.neut}\n\n`;

    // TO Tiers
    s += `--- TO BEST SETUPS ---\n`;
    for (const tier of TO_TIERS) {
      const stocks = data.toTiers[tier.key] || [];
      s += `\n${tier.name} (${stocks.length} stocks) — ${tier.description}:\n`;
      for (const st of stocks.slice(0, 15)) {
        s += `  ${st.symbol} Price:${st.price.toLocaleString()} Chg:${st.changePct >= 0 ? '+' : ''}${st.changePct.toFixed(1)}% State:${st.state} TP:${st.tpaths} MTF:${st.mtf} QT:${st.qtier} MIPh:${st.miph} MI:${st.mi} Rank:${st.rank} GTGD:${st.gtgd}\n`;
      }
      if (stocks.length > 15) s += `  ... and ${stocks.length - 15} more\n`;
    }

    // RS Categories
    s += `\n--- RS BEST SETUPS ---\n`;
    for (const cat of RS_CATEGORIES) {
      const stocks = data.rsCats[cat.key] || [];
      s += `\n${cat.name} (${stocks.length} stocks) — ${cat.description}:\n`;
      for (const st of stocks.slice(0, 10)) {
        s += `  ${st.symbol} Price:${st.price.toLocaleString()} Chg:${st.changePct >= 0 ? '+' : ''}${st.changePct.toFixed(1)}% RSState:${st.rsState} Vector:${st.vector} Bucket:${st.bucket} RS%:${st.rsPct >= 0 ? '+' : ''}${st.rsPct.toFixed(1)}% Score:${st.score}\n`;
      }
      if (stocks.length > 10) s += `  ... and ${stocks.length - 10} more\n`;
    }

    return s;
  }, [data]);

  const analyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setRecommendation('');

    try {
      if (!apiKey) {
        setShowKeyInput(true);
        throw new Error('Vui lòng nhập Anthropic API Key để sử dụng tính năng này.');
      }

      const summary = generateSummary();

      // Call Claude API directly from browser (GitHub Pages = static, no server)
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          stream: true,
          system: AI_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Hãy phân tích dữ liệu dashboard sau và đưa ra khuyến nghị đầu tư chi tiết:\n\n${summary}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude API error ${response.status}: ${errText.slice(0, 300)}`);
      }

      // Parse SSE stream from Anthropic API
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                text += event.delta.text;
                setRecommendation(text);
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      setAnalyzedAt(new Date().toLocaleString('vi-VN'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [generateSummary, apiKey]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Khuyến nghị AI
          </h3>
          <p className="text-xs text-zinc-500">Claude AI phân tích toàn bộ dashboard và đưa ra khuyến nghị đầu tư</p>
        </div>
        <Button
          onClick={analyze}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Đang phân tích...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              {recommendation ? 'Phân tích lại' : 'Phân tích bằng AI'}
            </>
          )}
        </Button>
      </div>

      {/* API Key Input */}
      {showKeyInput && (
        <div className="rounded-lg border border-amber-800/50 bg-amber-900/10 p-4 space-y-2">
          <p className="text-xs text-amber-400">Nhập Anthropic API Key (lưu trong trình duyệt, không gửi đi đâu ngoài Anthropic API):</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <Button
              size="sm"
              variant="outline"
              className="border-amber-700 text-amber-400 hover:bg-amber-900/30"
              onClick={() => {
                if (apiKey.trim()) {
                  localStorage.setItem('anthropic_api_key', apiKey.trim());
                  setShowKeyInput(false);
                  setError(null);
                }
              }}
            >
              Lưu
            </Button>
          </div>
        </div>
      )}

      {/* Saved key indicator + change button */}
      {apiKey && !showKeyInput && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>API Key: ****{apiKey.slice(-6)}</span>
          <button
            className="text-amber-500 hover:text-amber-400 underline"
            onClick={() => setShowKeyInput(true)}
          >
            Đổi key
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Result */}
      {recommendation ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          {analyzedAt && (
            <div className="flex items-center gap-1 mb-4 text-xs text-zinc-600">
              <Clock className="w-3 h-3" />
              Phân tích lúc {analyzedAt}
            </div>
          )}
          <SimpleMarkdown text={recommendation} />
          {isLoading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Đang tạo phân tích...
            </div>
          )}
        </div>
      ) : !isLoading ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-10 text-center">
          <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Nhấn <strong className="text-zinc-200">&quot;Phân tích bằng AI&quot;</strong> để Claude phân tích toàn bộ dữ liệu dashboard
            (Market Regime, TO Tiers, RS Categories) và đưa ra khuyến nghị đầu tư trực tiếp.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-zinc-400">Claude đang phân tích {data.totalStocks} mã cổ phiếu...</p>
        </div>
      )}
    </div>
  );
}

// ==================== PORTFOLIO TAB ====================

interface PortfolioHolding {
  id: string;
  symbol: string;
  buyPrice: number;   // stored in VND (user enters in thousands, e.g. 28.8 = 28,800)
  quantity: number;
  buyDate: string;
  type: 'BUY' | 'SELL';
}

const PORTFOLIO_STORAGE_KEY = 'portfolio_holdings';
const PORTFOLIO_CAPITAL_KEY = 'portfolio_capital';

const PORTFOLIO_AI_PROMPT = `Bạn là chuyên gia tư vấn quản lý danh mục đầu tư chứng khoán Việt Nam. Nhiệm vụ: phân tích danh mục hiện tại của nhà đầu tư và đưa ra khuyến nghị cụ thể.

Yêu cầu output (BẮT BUỘC theo thứ tự):
1. **ĐÁNH GIÁ DANH MỤC** — Tổng quan hiệu suất, mức độ tập trung/phân tán, rủi ro
2. **PHÂN TÍCH TỪNG MÃ** — Mỗi mã: tình trạng kỹ thuật, nên giữ/bán/mua thêm
3. **MÃ CẦN CẮT LỖ** — Nếu có mã lỗ nặng hoặc xu hướng xấu, khuyến nghị cắt
4. **MÃ NÊN CHỐT LỜI** — Nếu có mã lãi cao hoặc vùng kháng cự
5. **TÁI CÂN BẰNG** — Đề xuất tỷ trọng hợp lý, mã nên tăng/giảm vị thế
6. **HÀNH ĐỘNG TIẾP THEO** — 2-3 bước cụ thể nên làm ngay

Phong cách: ngắn gọn, bullet points, tập trung vào HÀNH ĐỘNG. Viết bằng tiếng Việt.
Disclaimer cuối: "Lưu ý: Đây là phân tích tham khảo từ AI, không phải khuyến nghị đầu tư chính thức."`;

function PortfolioTab({ data }: { data: AnalysisResult }) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [totalCapital, setTotalCapital] = useState<number>(0);
  const [capitalInput, setCapitalInput] = useState('');
  const [newType, setNewType] = useState<'BUY' | 'SELL'>('BUY');
  const [newSymbol, setNewSymbol] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newDate, setNewDate] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (saved) {
      try { setHoldings(JSON.parse(saved)); } catch { /* ignore */ }
    }
    const cap = localStorage.getItem(PORTFOLIO_CAPITAL_KEY);
    if (cap) {
      setTotalCapital(Number(cap));
      setCapitalInput(Number(cap).toLocaleString('vi-VN'));
    }
    const key = localStorage.getItem('anthropic_api_key');
    if (key) setApiKey(key);
  }, []);

  // Save holdings to localStorage
  const saveHoldings = useCallback((h: PortfolioHolding[]) => {
    setHoldings(h);
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(h));
  }, []);

  // Build price lookup from data
  const priceMap = useMemo(() => {
    const map: Record<string, { price: number; changePct: number; state?: State; qtier?: QTier }> = {};
    for (const s of data.toStocks) {
      map[s.symbol] = { price: s.price, changePct: s.changePct, state: s.state, qtier: s.qtier };
    }
    for (const s of data.rsStocks) {
      if (!map[s.symbol]) map[s.symbol] = { price: s.price, changePct: s.changePct };
    }
    return map;
  }, [data.toStocks, data.rsStocks]);

  // Add holding — price entered in thousands (28.8 = 28,800 VND)
  const addHolding = useCallback(() => {
    const sym = newSymbol.trim().toUpperCase();
    const priceRaw = parseFloat(newPrice.replace(/,/g, ''));
    const qty = parseInt(newQuantity.replace(/,/g, ''), 10);
    if (!sym || isNaN(priceRaw) || priceRaw <= 0 || isNaN(qty) || qty <= 0) return;

    const h: PortfolioHolding = {
      id: Date.now().toString(),
      type: newType,
      symbol: sym,
      buyPrice: Math.round(priceRaw * 1000), // 28.8 → 28,800 VND
      quantity: qty,
      buyDate: newDate || new Date().toISOString().slice(0, 10),
    };
    saveHoldings([...holdings, h]);
    setNewSymbol('');
    setNewPrice('');
    setNewQuantity('');
    setNewDate('');
  }, [newType, newSymbol, newPrice, newQuantity, newDate, holdings, saveHoldings]);

  const removeHolding = useCallback((id: string) => {
    saveHoldings(holdings.filter(h => h.id !== id));
  }, [holdings, saveHoldings]);

  // Calculate portfolio stats — aggregate net position per symbol
  const portfolioStats = useMemo(() => {
    // Group by symbol: net quantity & weighted avg cost
    const posMap: Record<string, { totalQty: number; totalCost: number; sellQty: number; sellRevenue: number; entries: PortfolioHolding[] }> = {};
    for (const h of holdings) {
      if (!posMap[h.symbol]) posMap[h.symbol] = { totalQty: 0, totalCost: 0, sellQty: 0, sellRevenue: 0, entries: [] };
      const pos = posMap[h.symbol];
      pos.entries.push(h);
      if (h.type === 'BUY') {
        pos.totalCost += h.buyPrice * h.quantity;
        pos.totalQty += h.quantity;
      } else {
        pos.sellRevenue += h.buyPrice * h.quantity;
        pos.sellQty += h.quantity;
      }
    }

    let totalInvested = 0;
    let totalMarketValue = 0;
    let totalRealizedPnl = 0;

    const positions = Object.entries(posMap).map(([symbol, pos]) => {
      const current = priceMap[symbol];
      const currentPrice = current ? current.price * 1000 : (pos.totalQty > 0 ? Math.round(pos.totalCost / pos.totalQty) : 0);
      const netQty = pos.totalQty - pos.sellQty;
      const avgCost = pos.totalQty > 0 ? Math.round(pos.totalCost / pos.totalQty) : 0;
      const invested = avgCost * netQty;
      const marketValue = currentPrice * netQty;
      // Realized P/L from sells
      const realizedPnl = pos.sellQty > 0 ? pos.sellRevenue - avgCost * pos.sellQty : 0;
      totalRealizedPnl += realizedPnl;
      // Unrealized P/L on remaining position
      const unrealizedPnl = netQty > 0 ? (currentPrice - avgCost) * netQty : 0;
      const pnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0;
      totalInvested += invested;
      totalMarketValue += marketValue;
      return {
        symbol,
        avgCost,
        netQty,
        currentPrice,
        changePct: current?.changePct ?? 0,
        state: current?.state,
        qtier: current?.qtier,
        invested,
        marketValue,
        unrealizedPnl,
        realizedPnl,
        pnlPct,
        found: !!current,
        entries: pos.entries,
      };
    }).filter(p => p.netQty > 0 || p.realizedPnl !== 0);

    const totalUnrealizedPnl = totalMarketValue - totalInvested;
    const totalPnl = totalUnrealizedPnl + totalRealizedPnl;
    const totalPnlPct = totalInvested > 0 ? (totalUnrealizedPnl / totalInvested) * 100 : 0;
    const margin = totalCapital > 0 && totalInvested > totalCapital ? totalInvested - totalCapital : 0;
    const marginPct = totalCapital > 0 ? (margin / totalCapital) * 100 : 0;
    const cashRemaining = totalCapital > 0 && totalInvested < totalCapital ? totalCapital - totalInvested : 0;
    const cashPct = totalCapital > 0 ? (cashRemaining / totalCapital) * 100 : 0;
    return { positions, totalInvested, totalMarketValue, totalUnrealizedPnl, totalRealizedPnl, totalPnl, totalPnlPct, cashRemaining, cashPct, margin, marginPct };
  }, [holdings, priceMap, totalCapital]);

  // AI analysis for portfolio
  const analyzePortfolio = useCallback(async () => {
    if (holdings.length === 0) {
      setError('Vui lòng thêm ít nhất 1 mã vào danh mục.');
      return;
    }
    if (!apiKey) {
      setShowKeyInput(true);
      setError('Vui lòng nhập Anthropic API Key.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecommendation('');

    try {
      let summary = `=== DANH MỤC ĐẦU TƯ ===\n`;
      summary += `Tổng vốn: ${totalCapital > 0 ? totalCapital.toLocaleString('vi-VN') : 'Chưa nhập'} VNĐ\n`;
      summary += `Tổng đầu tư: ${portfolioStats.totalInvested.toLocaleString('vi-VN')} VNĐ\n`;
      summary += `Giá trị thị trường: ${portfolioStats.totalMarketValue.toLocaleString('vi-VN')} VNĐ\n`;
      summary += `Lãi/Lỗ chưa chốt: ${portfolioStats.totalUnrealizedPnl >= 0 ? '+' : ''}${portfolioStats.totalUnrealizedPnl.toLocaleString('vi-VN')} (${portfolioStats.totalPnlPct >= 0 ? '+' : ''}${portfolioStats.totalPnlPct.toFixed(2)}%)\n`;
      if (portfolioStats.totalRealizedPnl !== 0) {
        summary += `Lãi/Lỗ đã chốt: ${portfolioStats.totalRealizedPnl >= 0 ? '+' : ''}${portfolioStats.totalRealizedPnl.toLocaleString('vi-VN')}\n`;
      }
      if (totalCapital > 0 && portfolioStats.margin > 0) {
        summary += `Margin (vay ký quỹ): ${portfolioStats.margin.toLocaleString('vi-VN')} (${portfolioStats.marginPct.toFixed(1)}% vốn)\n`;
      } else if (totalCapital > 0) {
        summary += `Cash còn: ${portfolioStats.cashRemaining.toLocaleString('vi-VN')} (${portfolioStats.cashPct.toFixed(1)}%)\n`;
      }
      summary += `\n--- VỊ THẾ HIỆN TẠI ---\n`;
      for (const p of portfolioStats.positions.filter(p => p.netQty > 0)) {
        summary += `${p.symbol}: Giá TB ${p.avgCost.toLocaleString('vi-VN')} x ${p.netQty.toLocaleString('vi-VN')} cp | Giá hiện tại: ${p.currentPrice.toLocaleString('vi-VN')} | Hôm nay: ${p.changePct >= 0 ? '+' : ''}${p.changePct.toFixed(2)}% | P/L: ${p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnl.toLocaleString('vi-VN')} (${p.pnlPct >= 0 ? '+' : ''}${p.pnlPct.toFixed(1)}%)`;
        if (p.state) summary += ` | State: ${p.state}`;
        if (p.qtier) summary += ` | QTier: ${p.qtier}`;
        summary += `\n`;
      }

      // Add market context
      const regime = data.regime;
      summary += `\n--- BỐI CẢNH THỊ TRƯỜNG ---\n`;
      summary += `Regime: ${regime.regime} | Score: ${regime.score} | Allocation: ${regime.allocation}\n`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          stream: true,
          system: PORTFOLIO_AI_PROMPT,
          messages: [{ role: 'user', content: `Phân tích danh mục đầu tư sau và đưa ra khuyến nghị:\n\n${summary}` }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude API error ${response.status}: ${errText.slice(0, 300)}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                text += event.delta.text;
                setRecommendation(text);
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setIsLoading(false);
    }
  }, [holdings, apiKey, totalCapital, portfolioStats, data.regime]);

  const fmtVND = (n: number) => n.toLocaleString('vi-VN');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-violet-400" />
            Danh mục đầu tư
          </h3>
          <p className="text-xs text-zinc-500">Quản lý danh mục, tính lãi/lỗ realtime, AI khuyến nghị</p>
        </div>
      </div>

      {/* Total Capital */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 mb-4">
        <label className="text-xs text-zinc-400 mb-1 block">Tổng vốn (VNĐ)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={capitalInput}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              const num = parseInt(raw, 10) || 0;
              setCapitalInput(num > 0 ? num.toLocaleString('vi-VN') : '');
              setTotalCapital(num);
              localStorage.setItem(PORTFOLIO_CAPITAL_KEY, String(num));
            }}
            placeholder="VD: 500,000,000"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Add Transaction Form */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <p className="text-xs text-zinc-400 font-semibold">Thêm giao dịch</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {/* BUY / SELL toggle */}
          <div className="flex rounded-md border border-zinc-700 overflow-hidden">
            <button
              onClick={() => setNewType('BUY')}
              className={`flex-1 py-1.5 text-xs font-bold transition-colors ${newType === 'BUY' ? 'bg-green-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
            >
              MUA
            </button>
            <button
              onClick={() => setNewType('SELL')}
              className={`flex-1 py-1.5 text-xs font-bold transition-colors ${newType === 'SELL' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
            >
              BÁN
            </button>
          </div>
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            placeholder="Mã (VD: FPT)"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <input
            type="text"
            value={newPrice}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d.]/g, '');
              setNewPrice(raw);
            }}
            placeholder="Giá (VD: 28.8)"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <input
            type="text"
            value={newQuantity}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              setNewQuantity(raw);
            }}
            placeholder="Số lượng"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <Button
            size="sm"
            variant="outline"
            className={`gap-1 ${newType === 'BUY' ? 'border-green-700 text-green-400 hover:bg-green-900/30' : 'border-red-700 text-red-400 hover:bg-red-900/30'}`}
            onClick={addHolding}
          >
            <Plus className="w-3.5 h-3.5" />
            {newType === 'BUY' ? 'Mua' : 'Bán'}
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      {holdings.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
              <p className="text-xs text-zinc-500">Tổng đầu tư</p>
              <p className="text-sm font-bold text-zinc-200">{fmtVND(portfolioStats.totalInvested)}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
              <p className="text-xs text-zinc-500">Giá trị hiện tại</p>
              <p className="text-sm font-bold text-zinc-200">{fmtVND(portfolioStats.totalMarketValue)}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
              <p className="text-xs text-zinc-500">Lãi/Lỗ chưa chốt</p>
              <p className={`text-sm font-bold ${portfolioStats.totalUnrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {portfolioStats.totalUnrealizedPnl >= 0 ? '+' : ''}{fmtVND(portfolioStats.totalUnrealizedPnl)}
                <span className="text-xs ml-1">({portfolioStats.totalPnlPct >= 0 ? '+' : ''}{portfolioStats.totalPnlPct.toFixed(2)}%)</span>
              </p>
            </div>
            {portfolioStats.totalRealizedPnl !== 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                <p className="text-xs text-zinc-500">Lãi/Lỗ đã chốt</p>
                <p className={`text-sm font-bold ${portfolioStats.totalRealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolioStats.totalRealizedPnl >= 0 ? '+' : ''}{fmtVND(portfolioStats.totalRealizedPnl)}
                </p>
              </div>
            )}
            {totalCapital > 0 && portfolioStats.margin > 0 ? (
              <div className="rounded-lg border border-red-800/50 bg-red-900/10 p-3 text-center">
                <p className="text-xs text-zinc-500">Margin (vay)</p>
                <p className="text-sm font-bold text-red-400">
                  {fmtVND(portfolioStats.margin)}
                  <span className="text-xs ml-1">({portfolioStats.marginPct.toFixed(1)}%)</span>
                </p>
              </div>
            ) : totalCapital > 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                <p className="text-xs text-zinc-500">Cash còn lại</p>
                <p className="text-sm font-bold text-amber-400">
                  {fmtVND(portfolioStats.cashRemaining)}
                  <span className="text-xs ml-1">({portfolioStats.cashPct.toFixed(1)}%)</span>
                </p>
              </div>
            ) : null}
          </div>

          {/* Positions Table (aggregated) */}
          <div className="rounded-lg border border-zinc-800 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                  <th className="text-left p-2 font-medium">Mã</th>
                  <th className="text-right p-2 font-medium">Giá TB</th>
                  <th className="text-right p-2 font-medium">SL còn</th>
                  <th className="text-right p-2 font-medium">Giá hiện tại</th>
                  <th className="text-right p-2 font-medium">Hôm nay</th>
                  <th className="text-right p-2 font-medium">Giá trị</th>
                  <th className="text-right p-2 font-medium">Lãi/Lỗ</th>
                  <th className="text-right p-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {portfolioStats.positions.filter(p => p.netQty > 0).map((p) => (
                  <tr key={p.symbol} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="p-2 font-bold text-zinc-200">
                      {p.symbol}
                      {p.state && <span className="ml-1 text-[10px] text-zinc-500">{p.state}</span>}
                    </td>
                    <td className="text-right p-2 text-zinc-300">{fmtVND(p.avgCost)}</td>
                    <td className="text-right p-2 text-zinc-300">{fmtVND(p.netQty)}</td>
                    <td className={`text-right p-2 font-medium ${p.found ? 'text-zinc-200' : 'text-zinc-500'}`}>
                      {fmtVND(p.currentPrice)}
                      {!p.found && <span className="text-[10px] text-zinc-600 ml-1">?</span>}
                    </td>
                    <td className={`text-right p-2 ${p.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.changePct >= 0 ? '+' : ''}{p.changePct.toFixed(2)}%
                    </td>
                    <td className="text-right p-2 text-zinc-300">{fmtVND(p.marketValue)}</td>
                    <td className={`text-right p-2 font-medium ${p.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.unrealizedPnl >= 0 ? '+' : ''}{fmtVND(p.unrealizedPnl)}
                    </td>
                    <td className={`text-right p-2 font-medium ${p.pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.pnlPct >= 0 ? '+' : ''}{p.pnlPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Transaction History */}
          <div className="rounded-lg border border-zinc-800 overflow-x-auto">
            <p className="text-xs text-zinc-400 font-semibold p-2 bg-zinc-900 border-b border-zinc-800">Lịch sử giao dịch</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-900/50 text-zinc-500 border-b border-zinc-800">
                  <th className="text-left p-2 font-medium">Loại</th>
                  <th className="text-left p-2 font-medium">Mã</th>
                  <th className="text-right p-2 font-medium">Giá</th>
                  <th className="text-right p-2 font-medium">SL</th>
                  <th className="text-right p-2 font-medium">Ngày</th>
                  <th className="text-right p-2 font-medium">Giá trị</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="p-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${h.type === 'BUY' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {h.type === 'BUY' ? 'MUA' : 'BÁN'}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-zinc-200">{h.symbol}</td>
                    <td className="text-right p-2 text-zinc-300">{fmtVND(h.buyPrice)}</td>
                    <td className="text-right p-2 text-zinc-300">{fmtVND(h.quantity)}</td>
                    <td className="text-right p-2 text-zinc-500">{h.buyDate}</td>
                    <td className="text-right p-2 text-zinc-300">{fmtVND(h.buyPrice * h.quantity)}</td>
                    <td className="p-2">
                      <button onClick={() => removeHolding(h.id)} className="text-zinc-600 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                AI khuyến nghị danh mục
              </h4>
              <Button
                onClick={analyzePortfolio}
                disabled={isLoading}
                size="sm"
                variant="outline"
                className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                {isLoading ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Đang phân tích...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" />{recommendation ? 'Phân tích lại' : 'Phân tích danh mục'}</>
                )}
              </Button>
            </div>

            {/* API Key Input */}
            {showKeyInput && (
              <div className="rounded-lg border border-amber-800/50 bg-amber-900/10 p-4 space-y-2">
                <p className="text-xs text-amber-400">Nhập Anthropic API Key:</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-700 text-amber-400 hover:bg-amber-900/30"
                    onClick={() => {
                      if (apiKey.trim()) {
                        localStorage.setItem('anthropic_api_key', apiKey.trim());
                        setShowKeyInput(false);
                        setError(null);
                      }
                    }}
                  >
                    Lưu
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {recommendation && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <SimpleMarkdown text={recommendation} />
                {isLoading && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Đang tạo phân tích...
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {holdings.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-10 text-center">
          <Briefcase className="w-10 h-10 text-violet-500 mx-auto mb-4" />
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Nhập <strong className="text-zinc-200">Tổng vốn</strong>, sau đó thêm các mã cổ phiếu bạn đang nắm giữ.
            Hệ thống sẽ tự tính lãi/lỗ từ giá hiện tại và AI sẽ đưa ra khuyến nghị cho danh mục.
          </p>
        </div>
      )}
    </div>
  );
}

// ==================== SCREENER TAB ====================

function ScreenerTab({ toStocks, rsStocks, onStockClick, companyNameMap = {} }: { toStocks: TOStock[]; rsStocks: RSStock[]; onStockClick?: (s: TOStock) => void; companyNameMap?: Record<string, string> }) {
  const [filterState, setFilterState] = useState<State | 'ALL'>('ALL');
  const [filterQTier, setFilterQTier] = useState<QTier | 'ALL'>('ALL');
  const [filterTPath, setFilterTPath] = useState<TrendPath | 'ALL'>('ALL');
  const [filterMTF, setFilterMTF] = useState<MTFSync | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    return toStocks.filter(s => {
      if (filterState !== 'ALL' && s.state !== filterState) return false;
      if (filterQTier !== 'ALL' && s.qtier !== filterQTier) return false;
      if (filterTPath !== 'ALL' && s.tpaths !== filterTPath) return false;
      if (filterMTF !== 'ALL' && s.mtf !== filterMTF) return false;
      return true;
    });
  }, [toStocks, filterState, filterQTier, filterTPath, filterMTF]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">State:</span>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value as State | 'ALL')}
              className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700"
            >
              <option value="ALL">ALL</option>
              {(['BREAKOUT', 'CONFIRM', 'RETEST', 'TREND', 'BASE', 'WEAK'] as State[]).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">QTier:</span>
            <select
              value={filterQTier}
              onChange={(e) => setFilterQTier(e.target.value as QTier | 'ALL')}
              className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700"
            >
              <option value="ALL">ALL</option>
              {(['PRIME', 'VALID', 'WATCH', 'AVOID'] as QTier[]).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">TPath:</span>
            <select
              value={filterTPath}
              onChange={(e) => setFilterTPath(e.target.value as TrendPath | 'ALL')}
              className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700"
            >
              <option value="ALL">ALL</option>
              {(['S_MAJOR', 'MAJOR', 'MINOR', 'WEAK'] as TrendPath[]).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">MTF:</span>
            <select
              value={filterMTF}
              onChange={(e) => setFilterMTF(e.target.value as MTFSync | 'ALL')}
              className="bg-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 border border-zinc-700"
            >
              <option value="ALL">ALL</option>
              {(['SYNC', 'PARTIAL', 'WEAK'] as MTFSync[]).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <span className="text-xs font-bold text-amber-400">{filtered.length} / {toStocks.length} stocks</span>
          </div>
        </div>
      </div>

      {/* Full stock table */}
      <TOTable stocks={filtered} onStockClick={onStockClick} companyNameMap={companyNameMap} />
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function StockAnalysis() {
  const { data, isLoading, refetch, isFetching } = useQuery<AnalysisResult>({
    queryKey: ['stock-analysis-v5'],
    queryFn: () => runFullAnalysis(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Company name map: symbol -> company name
  const [companyNameMap, setCompanyNameMap] = useState<Record<string, string>>({});
  useEffect(() => {
    fetchFinancialCSV(`${GITHUB_RAW_BASE}/company_overview.csv`)
      .then(csv => setCompanyNameMap(parseCompanyNameMap(csv)))
      .catch(() => {});
  }, []);

  // Stock AI modal state
  const [modalStock, setModalStock] = useState<TOStock | RSStock | null>(null);
  const [modalStockType, setModalStockType] = useState<'TO' | 'RS'>('TO');
  const openTOModal = useCallback((s: TOStock) => { setModalStock(s); setModalStockType('TO'); }, []);
  const openRSModal = useCallback((s: RSStock) => { setModalStock(s); setModalStockType('RS'); }, []);
  const closeModal = useCallback(() => setModalStock(null), []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Market Dashboard V3
          </h1>
          <p className="text-sm text-zinc-500">
            TO Best Setups + RS Best Setups | All Stocks
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(data.generatedAt).toLocaleString('vi-VN')}
            </span>
          )}
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            size="sm"
            variant="outline"
            className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Đang tải...' : 'Cập nhật'}
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <AnalysisLoading />
      ) : (
        <Tabs defaultValue="to" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-zinc-900 border border-zinc-800">
            <TabsTrigger
              value="to"
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-green-400"
            >
              <Activity className="w-4 h-4" />
              <span className="font-bold text-sm">TO</span>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs font-mono ml-1">
                {data.toStocks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="rs"
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400"
            >
              <Zap className="w-4 h-4" />
              <span className="font-bold text-sm">RS</span>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs font-mono ml-1">
                {data.rsStocks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="screener"
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-400"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="font-bold text-sm">Screener</span>
            </TabsTrigger>
            <TabsTrigger
              value="portfolio"
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-violet-400"
            >
              <Briefcase className="w-4 h-4" />
              <span className="font-bold text-sm">Portfolio</span>
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-400"
            >
              <Sparkles className="w-4 h-4" />
              <span className="font-bold text-sm">AI</span>
            </TabsTrigger>
          </TabsList>

          {/* ========= TO TAB ========= */}
          <TabsContent value="to" className="space-y-4">
            {/* Compact Market Regime at top */}
            <MarketRegimePanel
              regime={data.regime}
              distribution={data.distribution}
            />

            {/* Summary Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <StatCard label="Total" value={data.totalStocks} hint="Tổng số cổ phiếu được phân tích trong universe (đã lọc thanh khoản)." />
              <StatCard label="PRIME" value={data.counts.prime} color="text-green-400" hint="QTier = PRIME — chất lượng cao nhất: trend mạnh, MTF sync, momentum tốt. Nhóm ưu tiên mua." />
              <StatCard label="VALID" value={data.counts.valid} color="text-blue-400" hint="QTier = VALID — đạt hầu hết tiêu chí chất lượng. Có thể mua khi có tín hiệu entry tốt." />
              <StatCard label="Tier 1A" value={data.counts.tier1a} color="text-green-400" hint="Entry TỐI ƯU: PRIME + RETEST/CONFIRM + MTF SYNC. Xác suất thành công cao nhất." />
              <StatCard label="Tier 2A" value={data.counts.tier2a} color="text-blue-400" hint="Entry ĐƯỢC PHÉP: VALID+ + Entry State + MTF≠WEAK. Tốt nhưng nên giảm size so với Tier 1A." />
              <StatCard
                label="Setups"
                value={TO_TIERS.reduce((sum, t) => sum + (data.toTiers[t.key]?.length || 0), 0)}
                color="text-amber-400"
                hint="Tổng số cổ phiếu có setup đáng chú ý (tất cả tier cộng lại: 1A + 2A + S_MAJOR + Breakout + Retest + Pipeline)."
              />
            </div>

            {/* Tier Sections */}
            {TO_TIERS.map((tier) => (
              <TierSection
                key={tier.key}
                tierKey={tier.key}
                name={tier.name}
                description={tier.description}
                count={data.toTiers[tier.key]?.length || 0}
                color={TIER_HEADER_COLORS[tier.key]}
                defaultOpen={tier.key === 'tier1a' || tier.key === 'tier2a'}
              >
                <TOTable stocks={data.toTiers[tier.key] || []} onStockClick={openTOModal} companyNameMap={companyNameMap} />
              </TierSection>
            ))}
          </TabsContent>

          {/* ========= RS TAB ========= */}
          <TabsContent value="rs" className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <StatCard label="Total" value={data.rsStocks.length} hint="Tổng số cổ phiếu được phân tích RS (Relative Strength) so với VN-Index." />
              <StatCard label="ACTIVE" value={data.counts.active} color="text-green-400" hint="Cổ phiếu đang active — thanh khoản đủ lớn và RS đang có tín hiệu rõ ràng. Chỉ nên mua cổ phiếu ACTIVE." />
              <StatCard label="SYNC" value={data.counts.sync} color="text-green-400" hint="RS SYNC — mạnh hơn VN-Index trên cả 3 khung (D/W/M). Nhóm mạnh nhất, ưu tiên mua." />
              <StatCard label="D_LEAD" value={data.counts.dLead} color="text-blue-400" hint="RS D_LEAD — Daily RS dẫn, có thể đang bắt đầu chu kỳ outperform mới. Theo dõi chuyển SYNC." />
              <StatCard label="M_LEAD" value={data.counts.mLead} color="text-cyan-400" hint="RS M_LEAD — Monthly RS mạnh, Daily đang nghỉ. Nền tảng RS tốt, chờ Daily hồi phục." />
            </div>

            {/* Category Sections */}
            {RS_CATEGORIES.map((cat) => (
              <TierSection
                key={cat.key}
                tierKey={cat.key}
                name={cat.name}
                description={cat.description}
                count={data.rsCats[cat.key]?.length || 0}
                color={CAT_HEADER_COLORS[cat.key]}
                defaultOpen={cat.key === 'sync_active'}
              >
                <RSTable stocks={data.rsCats[cat.key] || []} onStockClick={openRSModal} companyNameMap={companyNameMap} />
              </TierSection>
            ))}
          </TabsContent>

          {/* ========= SCREENER TAB ========= */}
          <TabsContent value="screener" className="space-y-4">
            <ScreenerTab toStocks={data.toStocks} rsStocks={data.rsStocks} onStockClick={openTOModal} companyNameMap={companyNameMap} />
          </TabsContent>

          {/* ========= PORTFOLIO TAB ========= */}
          <TabsContent value="portfolio" className="space-y-4">
            <PortfolioTab data={data} />
          </TabsContent>

          {/* ========= AI RECOMMENDATION TAB ========= */}
          <TabsContent value="ai" className="space-y-4">
            <AIRecommendationTab data={data} />
          </TabsContent>
        </Tabs>
      )}

      {/* ========= GUIDE ========= */}
      <Guide />

      {/* ========= STOCK AI MODAL ========= */}
      {modalStock && data && (
        <StockAIModal
          stock={modalStock}
          stockType={modalStockType}
          regime={data.regime}
          onClose={closeModal}
          companyNameMap={companyNameMap}
          toStocks={data.toStocks}
          rsStocks={data.rsStocks}
        />
      )}
    </div>
  );
}

// ==================== GUIDE SECTION ====================

const GUIDE_ITEMS = [
  {
    term: "Regime",
    desc: "Trạng thái thị trường chung (Bull / Neutral / Bear) dựa trên VN-Index vs MA50 & MA200, breadth, và momentum.",
  },
  {
    term: "Allocation",
    desc: "Mức phân bổ vốn khuyến nghị theo Regime: Bull 80-100%, Neutral 40-60%, Bear 0-20%.",
  },
  {
    term: "Tier",
    desc: "Phân hạng entry: Tier 1A (PRIME + SYNC + Entry State) = tối ưu, Tier 2A (VALID+ + Entry + MTF≠WEAK) = chấp nhận.",
  },
  {
    term: "QTier (Grade)",
    desc: "Chất lượng cơ bản: PRIME (ROE cao, tăng trưởng tốt, P/E hợp lý), VALID (đạt yêu cầu), WATCH (theo dõi).",
  },
  {
    term: "State",
    desc: "Trạng thái kỹ thuật: BREAKOUT (phá đỉnh + volume), CONFIRM (xác nhận), RETEST (hồi về MA), TREND (xu hướng), BASE (tích lũy).",
  },
  {
    term: "TrendPath (TPaths)",
    desc: "Đường xu hướng: S_MAJOR (C>MA20>MA50>MA200 = mạnh nhất), MAJOR, MINOR, WEAK.",
  },
  {
    term: "MTF (Multi-Timeframe)",
    desc: "Đồng thuận đa khung: SYNC (trên cả MA20, MA50, MA200), PARTIAL (2/3), WEAK.",
  },
  {
    term: "MI (Momentum Index)",
    desc: "Chỉ số momentum 0-100 tổng hợp từ RSI, MACD, Trend, Volume. Phase: PEAK > HIGH > MID > LOW.",
  },
  {
    term: "RS (Relative Strength)",
    desc: "Sức mạnh tương đối vs VN-Index qua 20/50/200 phiên. RS% > 0 = outperform thị trường.",
  },
  {
    term: "Vector",
    desc: "Hướng RS: SYNC (cả 3 TF outperform), D_LEAD (Daily dẫn), M_LEAD (Monthly dẫn), NEUT (trung tính).",
  },
  {
    term: "Bucket",
    desc: "Phân nhóm RS: PRIME (≥85) > ELITE (≥75) > CORE (≥60) > QUALITY (≥50) > WEAK.",
  },
  {
    term: "GTGD",
    desc: "Giá trị giao dịch trung bình 5 phiên (tỷ VND). Đo thanh khoản thực tế.",
  },
  {
    term: "Rank",
    desc: "Điểm tổng hợp TO: QTier + MI*5 + TrendPath bonus + MTF bonus + State bonus. Rank cao = setup tốt hơn.",
  },
  {
    term: "RQS (Retest Quality)",
    desc: "Chất lượng pullback 0-100: gần MA20, volume giảm, RSI vùng 40-55, giữ trên MA50 = pullback khoẻ.",
  },
];

function Guide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
          <span className="font-bold text-sm text-zinc-300">Huong dan su dung (Guide)</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {GUIDE_ITEMS.map((item) => (
              <div key={item.term} className="flex gap-2 text-xs">
                <span className="font-bold text-amber-400 whitespace-nowrap min-w-[80px]">{item.term}</span>
                <span className="text-zinc-400">{item.desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5">
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-400 font-semibold">Cach dung:</span> Tab TO Best Setups de tim diem entry ky thuat tot nhat. Tab RS Best Setups de tim co phieu manh hon thi truong.
            </p>
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-400 font-semibold">Uu tien:</span> Tier 1A &gt; Tier 2A &gt; Fresh Breakout &gt; Quality Retest &gt; S_MAJOR TREND &gt; Pipeline.
            </p>
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-400 font-semibold">Luu y:</span> Du lieu duoc lay tu repo vnstock (CSV). Ket qua mang tinh tham khao, khong phai khuyen nghi dau tu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
