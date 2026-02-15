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

const STOCK_AI_PROMPT = `Bạn là chuyên gia phân tích kỹ thuật chứng khoán Việt Nam. Nhiệm vụ: phân tích CHI TIẾT 1 mã cổ phiếu dựa trên dữ liệu kỹ thuật được cung cấp.

Yêu cầu output (BẮT BUỘC theo thứ tự):
1. **TỔNG QUAN** — Mã đang ở trạng thái gì, xu hướng ra sao (2-3 câu)
2. **PHÂN TÍCH KỸ THUẬT** — State, Trend Path, MTF, QTier, MI Phase, Momentum — giải thích ý nghĩa từng chỉ số
3. **VÙNG GIÁ QUAN TRỌNG** — Hỗ trợ, kháng cự, vùng mua lý tưởng
4. **KHUYẾN NGHỊ** — MUA / GIỮ / BÁN / CHỜ — kèm lý do cụ thể
5. **CHIẾN LƯỢC** — Entry price, Stop-loss, Target price (nếu mua)
6. **RỦI RO** — Các yếu tố cần lưu ý

Phong cách: ngắn gọn, bullet points, HÀNH ĐỘNG cụ thể. Viết bằng tiếng Việt.
Disclaimer cuối: "Lưu ý: Đây là phân tích tham khảo từ AI, không phải khuyến nghị đầu tư chính thức."`;

interface StockAIModalProps {
  stock: TOStock | RSStock | null;
  stockType: 'TO' | 'RS';
  regime: MarketRegime;
  onClose: () => void;
}

function StockAIModal({ stock, stockType, regime, onClose }: StockAIModalProps) {
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as content streams
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [analysis]);

  // Auto-analyze on open
  useEffect(() => {
    if (!stock) return;
    const apiKey = localStorage.getItem('anthropic_api_key');
    if (!apiKey) {
      setError('Chưa có API Key. Vui lòng nhập ở tab "AI Khuyến nghị" trước.');
      return;
    }

    const analyze = async () => {
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

        if (stockType === 'TO') {
          const s = stock as TOStock;
          info += `\n--- CHỈ SỐ KỸ THUẬT (TO) ---\n`;
          info += `State: ${s.state}\n`;
          info += `Trend Path: ${s.tpaths}\n`;
          info += `MTF Sync: ${s.mtf}\n`;
          info += `QTier: ${s.qtier}\n`;
          info += `MI Phase: ${s.miph}\n`;
          info += `MI (Momentum): ${s.mi}\n`;
          info += `Rank: ${s.rank}\n`;
          info += `Vol Ratio: ${s.volRatio?.toFixed(2) ?? 'N/A'}\n`;
          info += `RQS (Retest Quality): ${s.rqs?.toFixed(1) ?? 'N/A'}\n`;
        } else {
          const s = stock as RSStock;
          info += `\n--- CHỈ SỐ RS (Relative Strength) ---\n`;
          info += `RS State: ${s.rsState}\n`;
          info += `Vector: ${s.vector}\n`;
          info += `Bucket: ${s.bucket}\n`;
          info += `RS%: ${s.rsPct >= 0 ? '+' : ''}${s.rsPct.toFixed(1)}%\n`;
          info += `Score: ${s.score}\n`;
        }

        info += `\n--- BỐI CẢNH THỊ TRƯỜNG ---\n`;
        info += `Regime: ${regime.regime} | Score: ${regime.score} | Allocation: ${regime.allocation}\n`;

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
            max_tokens: 2048,
            stream: true,
            system: STOCK_AI_PROMPT,
            messages: [{ role: 'user', content: `Phân tích chi tiết mã ${stock.symbol} dựa trên dữ liệu sau:\n\n${info}` }],
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
    };

    analyze();

    return () => {
      abortRef.current?.abort();
    };
  }, [stock, stockType, regime]);

  if (!stock) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                {stock.symbol}
                <span className={`text-sm font-normal ${stock.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                </span>
              </h3>
              <p className="text-xs text-zinc-500">
                Giá: {(stock.price * 1000).toLocaleString('vi-VN')} VNĐ | GTGD: {stock.gtgd} tỷ | {stockType === 'TO' ? `State: ${(stock as TOStock).state}` : `RS: ${(stock as RSStock).rsState}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 mb-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {analysis ? (
            <div>
              <SimpleMarkdown text={analysis} />
              {isLoading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Đang phân tích...
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-4" />
              <p className="text-sm text-zinc-400">AI đang phân tích <strong className="text-zinc-200">{stock.symbol}</strong>...</p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 text-[10px] text-zinc-600 text-center">
          Phân tích bởi Claude AI — Chỉ mang tính tham khảo, không phải khuyến nghị đầu tư
        </div>
      </div>
    </div>
  );
}

// ==================== TO TABLE ====================

function TOTable({ stocks, onStockClick }: { stocks: TOStock[]; onStockClick?: (s: TOStock) => void }) {
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
              <td className="px-2 py-1.5 font-bold text-zinc-100">{s.symbol}</td>
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

function RSTable({ stocks, onStockClick }: { stocks: RSStock[]; onStockClick?: (s: RSStock) => void }) {
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
              <td className="px-2 py-1.5 font-bold text-zinc-100">{s.symbol}</td>
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

function TierSection({ name, description, count, color, defaultOpen, children }: {
  name: string;
  description: string;
  count: number;
  color: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? count > 0);

  return (
    <div className={`rounded-lg border border-zinc-800 overflow-hidden ${color} border-l-4`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
          <span className="font-bold text-sm text-zinc-100">{name}</span>
          <span className="text-xs text-zinc-500">{description}</span>
        </div>
        <Badge variant="secondary" className="bg-zinc-800 text-zinc-200 text-xs font-mono">
          {count}
        </Badge>
      </button>
      {open && (
        <div className="px-2 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ==================== SUMMARY STATS ====================

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-zinc-900 border border-zinc-800">
      <span className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-bold font-mono ${color || 'text-zinc-100'}`}>{value}</span>
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
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-3xl font-black ${regimeTextColor}`}>{regime.regime}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-zinc-100">Stop: {regime.allocation}</div>
            <div className="text-sm text-zinc-400">{regime.regime} × {scoreMultiplier.toFixed(2)} | {regime.allocation}</div>
          </div>
        </div>
      </div>

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
        <h3 className="text-lg font-bold text-zinc-100 mb-3">4-LAYER FRAMEWORK</h3>
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
        <h3 className="text-lg font-bold text-zinc-100 mb-3">INDEX OVERVIEW — LAYER 1 CEILING</h3>
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
        <h3 className="text-lg font-bold text-zinc-100 mb-3">BREADTH ANALYSIS — LAYER 3 QUADRANT</h3>
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
        <h3 className="text-lg font-bold text-zinc-100 mb-3">DISTRIBUTION SUMMARY</h3>
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

function ScreenerTab({ toStocks, rsStocks, onStockClick }: { toStocks: TOStock[]; rsStocks: RSStock[]; onStockClick?: (s: TOStock) => void }) {
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
      <TOTable stocks={filtered} onStockClick={onStockClick} />
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
              <StatCard label="Total" value={data.totalStocks} />
              <StatCard label="PRIME" value={data.counts.prime} color="text-green-400" />
              <StatCard label="VALID" value={data.counts.valid} color="text-blue-400" />
              <StatCard label="Tier 1A" value={data.counts.tier1a} color="text-green-400" />
              <StatCard label="Tier 2A" value={data.counts.tier2a} color="text-blue-400" />
              <StatCard
                label="Setups"
                value={TO_TIERS.reduce((sum, t) => sum + (data.toTiers[t.key]?.length || 0), 0)}
                color="text-amber-400"
              />
            </div>

            {/* Tier Sections */}
            {TO_TIERS.map((tier) => (
              <TierSection
                key={tier.key}
                name={tier.name}
                description={tier.description}
                count={data.toTiers[tier.key]?.length || 0}
                color={TIER_HEADER_COLORS[tier.key]}
                defaultOpen={tier.key === 'tier1a' || tier.key === 'tier2a'}
              >
                <TOTable stocks={data.toTiers[tier.key] || []} onStockClick={openTOModal} />
              </TierSection>
            ))}
          </TabsContent>

          {/* ========= RS TAB ========= */}
          <TabsContent value="rs" className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <StatCard label="Total" value={data.rsStocks.length} />
              <StatCard label="ACTIVE" value={data.counts.active} color="text-green-400" />
              <StatCard label="SYNC" value={data.counts.sync} color="text-green-400" />
              <StatCard label="D_LEAD" value={data.counts.dLead} color="text-blue-400" />
              <StatCard label="M_LEAD" value={data.counts.mLead} color="text-cyan-400" />
            </div>

            {/* Category Sections */}
            {RS_CATEGORIES.map((cat) => (
              <TierSection
                key={cat.key}
                name={cat.name}
                description={cat.description}
                count={data.rsCats[cat.key]?.length || 0}
                color={CAT_HEADER_COLORS[cat.key]}
                defaultOpen={cat.key === 'sync_active'}
              >
                <RSTable stocks={data.rsCats[cat.key] || []} onStockClick={openRSModal} />
              </TierSection>
            ))}
          </TabsContent>

          {/* ========= SCREENER TAB ========= */}
          <TabsContent value="screener" className="space-y-4">
            <ScreenerTab toStocks={data.toStocks} rsStocks={data.rsStocks} onStockClick={openTOModal} />
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
