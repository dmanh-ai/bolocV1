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
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
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

// ==================== TO TABLE ====================

function TOTable({ stocks }: { stocks: TOStock[] }) {
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
            <tr key={s.symbol} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
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

function RSTable({ stocks }: { stocks: RSStock[] }) {
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
            <tr key={s.symbol} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
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

// ==================== LAYER CARD ====================

function LayerCard({ layer, num: layerNum }: { layer: RegimeLayer; num: number }) {
  const Icon = REGIME_ICON[layer.signal];
  return (
    <div className={`rounded-lg border p-4 space-y-3 ${REGIME_BG[layer.signal]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">L{layerNum}</span>
          <span className="font-bold text-sm text-zinc-100">{layer.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${REGIME_COLORS[layer.signal]}`}>
            <Icon className="w-3 h-3" />
            {layer.signal}
          </span>
        </div>
      </div>
      <RegimeScoreBar score={layer.score} />
      <div className="space-y-1">
        {layer.details.slice(0, 4).map((d, i) => (
          <p key={i} className="text-[11px] text-zinc-400">{d}</p>
        ))}
      </div>
    </div>
  );
}

// ==================== MARKET REGIME PANEL ====================

function MarketRegimePanel({ regime }: { regime: MarketRegime }) {
  const Icon = REGIME_ICON[regime.regime];
  return (
    <div className="space-y-4">
      {/* Overall Regime Assessment */}
      <div className={`rounded-xl border-2 p-5 ${REGIME_BG[regime.regime]}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-100">Market Regime Assessment</h3>
            <p className="text-xs text-zinc-500">4-Layer Framework V5.3</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-lg font-black ${REGIME_COLORS[regime.regime]}`}>
              <Icon className="w-5 h-5" />
              {regime.regime}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-zinc-900/50">
            <span className="text-[10px] text-zinc-500 uppercase">Overall Score</span>
            <p className={`text-xl font-bold font-mono ${REGIME_TEXT[regime.regime]}`}>
              {regime.score > 0 ? '+' : ''}{regime.score}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-zinc-900/50">
            <span className="text-[10px] text-zinc-500 uppercase">Allocation</span>
            <p className={`text-xl font-bold font-mono ${REGIME_TEXT[regime.regime]}`}>{regime.allocation}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-zinc-900/50 col-span-2">
            <span className="text-[10px] text-zinc-500 uppercase">Guideline</span>
            <p className="text-sm text-zinc-300 mt-0.5">{regime.allocDesc}</p>
          </div>
        </div>
        <RegimeScoreBar score={regime.score} label="Overall" />
      </div>

      {/* 4-Layer Framework */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {regime.indexLayer && <LayerCard layer={regime.indexLayer} num={1} />}
        {regime.breadthLayer && <LayerCard layer={regime.breadthLayer} num={2} />}
        {regime.momentumLayer && <LayerCard layer={regime.momentumLayer} num={3} />}
        {regime.flowLayer && <LayerCard layer={regime.flowLayer} num={4} />}
      </div>

      {/* Index Overview */}
      {regime.indexLayer && (
        <div className="rounded-lg border border-zinc-800 p-4">
          <h4 className="font-bold text-sm text-zinc-200 mb-3">Index Overview - VN-Index</h4>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">VN-Index</span>
              <span className="text-base font-bold font-mono text-zinc-100">{regime.indexLayer.vnindex.toLocaleString('en', { maximumFractionDigits: 1 })}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">Change</span>
              <span className={`text-base font-bold font-mono ${regime.indexLayer.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {regime.indexLayer.changePct >= 0 ? '+' : ''}{regime.indexLayer.changePct.toFixed(2)}%
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">SMA 20</span>
              <span className={`text-sm font-mono ${regime.indexLayer.vnindex > regime.indexLayer.sma20 ? 'text-green-400' : 'text-red-400'}`}>
                {regime.indexLayer.sma20.toLocaleString('en', { maximumFractionDigits: 1 })}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">SMA 50</span>
              <span className={`text-sm font-mono ${regime.indexLayer.vnindex > regime.indexLayer.sma50 ? 'text-green-400' : 'text-red-400'}`}>
                {regime.indexLayer.sma50.toLocaleString('en', { maximumFractionDigits: 1 })}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">SMA 200</span>
              <span className={`text-sm font-mono ${regime.indexLayer.vnindex > regime.indexLayer.sma200 ? 'text-green-400' : 'text-red-400'}`}>
                {regime.indexLayer.sma200.toLocaleString('en', { maximumFractionDigits: 1 })}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">RSI 14</span>
              <span className={`text-sm font-mono ${regime.indexLayer.rsi >= 50 ? 'text-green-400' : regime.indexLayer.rsi <= 30 ? 'text-red-400' : 'text-amber-400'}`}>
                {regime.indexLayer.rsi.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Trend:</span>
            <span className={`text-xs font-bold ${
              regime.indexLayer.trend === 'Uptrend' ? 'text-green-400' :
              regime.indexLayer.trend === 'Downtrend' ? 'text-red-400' : 'text-amber-400'
            }`}>{regime.indexLayer.trend}</span>
            <span className="text-[10px] text-zinc-500 ml-3">MACD:</span>
            <span className={`text-xs font-mono ${regime.indexLayer.macd > regime.indexLayer.macdSignal ? 'text-green-400' : 'text-red-400'}`}>
              {regime.indexLayer.macd.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Breadth Analysis */}
      {regime.breadthLayer && (
        <div className="rounded-lg border border-zinc-800 p-4">
          <h4 className="font-bold text-sm text-zinc-200 mb-3">Breadth Analysis</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">Advancing</span>
              <span className="text-base font-bold font-mono text-green-400">{regime.breadthLayer.advancing}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">Declining</span>
              <span className="text-base font-bold font-mono text-red-400">{regime.breadthLayer.declining}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">Unchanged</span>
              <span className="text-base font-bold font-mono text-zinc-400">{regime.breadthLayer.unchanged}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">A/D Ratio</span>
              <span className={`text-base font-bold font-mono ${regime.breadthLayer.adRatio >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                {regime.breadthLayer.adRatio.toFixed(2)}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">Net A/D</span>
              <span className={`text-base font-bold font-mono ${regime.breadthLayer.netAD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {regime.breadthLayer.netAD > 0 ? '+' : ''}{regime.breadthLayer.netAD}
              </span>
            </div>
          </div>
          {/* Visual AD bar */}
          <div className="mt-3">
            <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800">
              {(regime.breadthLayer.advancing + regime.breadthLayer.declining + regime.breadthLayer.unchanged) > 0 && (
                <>
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(regime.breadthLayer.advancing / (regime.breadthLayer.advancing + regime.breadthLayer.declining + regime.breadthLayer.unchanged)) * 100}%` }}
                  />
                  <div
                    className="bg-zinc-500 transition-all"
                    style={{ width: `${(regime.breadthLayer.unchanged / (regime.breadthLayer.advancing + regime.breadthLayer.declining + regime.breadthLayer.unchanged)) * 100}%` }}
                  />
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(regime.breadthLayer.declining / (regime.breadthLayer.advancing + regime.breadthLayer.declining + regime.breadthLayer.unchanged)) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Allocation Guidelines */}
      <div className="rounded-lg border border-zinc-800 p-4">
        <h4 className="font-bold text-sm text-zinc-200 mb-3">Allocation Guidelines</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { regime: 'BULL' as RegimeState, alloc: '80-100%', desc: 'Full exposure. Tier 1A/2A entries. Hold trends.' },
            { regime: 'NEUTRAL' as RegimeState, alloc: '40-60%', desc: 'Selective. Only Tier 1A. Reduce size.' },
            { regime: 'BEAR' as RegimeState, alloc: '0-20%', desc: 'Defensive. No new entries. Wait for recovery.' },
          ].map((g) => (
            <div
              key={g.regime}
              className={`rounded-lg border p-3 ${regime.regime === g.regime ? REGIME_BG[g.regime] + ' ring-1 ring-offset-0' : 'border-zinc-800 opacity-50'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${REGIME_COLORS[g.regime]}`}>
                  {g.regime}
                </span>
                <span className="text-sm font-bold font-mono text-zinc-200">{g.alloc}</span>
              </div>
              <p className="text-[11px] text-zinc-400">{g.desc}</p>
            </div>
          ))}
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

// ==================== MAIN COMPONENT ====================

export function StockAnalysis() {
  const { data, isLoading, refetch, isFetching } = useQuery<AnalysisResult>({
    queryKey: ['stock-analysis-v5'],
    queryFn: () => runFullAnalysis(200),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Stock Setups V5.3
          </h1>
          <p className="text-sm text-zinc-500">
            Technical Oscillator + Relative Strength | Top 500 vốn hoá
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
        <Tabs defaultValue="regime" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-zinc-900 border border-zinc-800">
            <TabsTrigger
              value="regime"
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-400"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="font-bold text-sm">Market Regime</span>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ml-1 ${REGIME_COLORS[data.regime.regime]}`}>
                {data.regime.regime}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="to"
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-green-400"
            >
              <Activity className="w-4 h-4" />
              <span className="font-bold text-sm">TO Best Setups</span>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs font-mono ml-1">
                {data.toStocks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="rs"
              className="flex items-center gap-2 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400"
            >
              <Zap className="w-4 h-4" />
              <span className="font-bold text-sm">RS Best Setups</span>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs font-mono ml-1">
                {data.rsStocks.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* ========= MARKET REGIME TAB ========= */}
          <TabsContent value="regime" className="space-y-4">
            <MarketRegimePanel regime={data.regime} />
          </TabsContent>

          {/* ========= TO TAB ========= */}
          <TabsContent value="to" className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <StatCard label="Total" value={data.totalStocks} />
              <StatCard label="PRIME" value={data.counts.prime} color="text-green-400" />
              <StatCard label="VALID" value={data.counts.valid} color="text-blue-400" />
              <StatCard label="WATCH" value={data.counts.watch} color="text-zinc-400" />
              <StatCard label="AVOID" value={data.counts.avoid} color="text-red-400" />
              <StatCard
                label="Setups"
                value={TO_TIERS.reduce((sum, t) => sum + (data.toTiers[t.key]?.length || 0), 0)}
                color="text-amber-400"
              />
            </div>

            {/* Distribution Summary */}
            <div className="text-xs text-zinc-400 space-y-1">
              <div>QualityTier Distribution ({data.totalStocks} stocks): {data.totalStocks > 0 ? `PRIME ${data.counts.prime} (${((data.counts.prime/data.totalStocks)*100).toFixed(1)}%), VALID ${data.counts.valid} (${((data.counts.valid/data.totalStocks)*100).toFixed(1)}%), WATCH ${data.counts.watch} (${((data.counts.watch/data.totalStocks)*100).toFixed(1)}%), AVOID ${data.counts.avoid} (${((data.counts.avoid/data.totalStocks)*100).toFixed(1)}%)` : 'No data'}</div>
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
                <TOTable stocks={data.toTiers[tier.key] || []} />
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

            {/* RS Vector Distribution Summary */}
            <div className="text-xs text-zinc-400 space-y-1">
              <div>RS Vector Distribution ({data.rsStocks.length} stocks): {data.rsStocks.length > 0 ? `SYNC ${data.counts.sync} (${((data.counts.sync/data.rsStocks.length)*100).toFixed(1)}%), D_LEAD ${data.counts.dLead} (${((data.counts.dLead/data.rsStocks.length)*100).toFixed(1)}%), M_LEAD ${data.counts.mLead} (${((data.counts.mLead/data.rsStocks.length)*100).toFixed(1)}%), NEUT ${data.counts.neut} (${((data.counts.neut/data.rsStocks.length)*100).toFixed(1)}%), WEAK ${data.counts.weak} (${((data.counts.weak/data.rsStocks.length)*100).toFixed(1)}%)` : 'No data'}</div>
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
                <RSTable stocks={data.rsCats[cat.key] || []} />
              </TierSection>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* ========= GUIDE ========= */}
      <Guide />
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
