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

// ==================== MAIN COMPONENT ====================

export function StockAnalysis() {
  const { data, isLoading, refetch, isFetching } = useQuery<AnalysisResult>({
    queryKey: ['stock-analysis-v5'],
    queryFn: () => runFullAnalysis(),
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
            Technical Oscillator + Relative Strength | All Stocks
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
            <MarketRegimePanel
              regime={data.regime}
              distribution={data.distribution}
            />
          </TabsContent>

          {/* ========= TO TAB ========= */}
          <TabsContent value="to" className="space-y-4">
            {/* Header info */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-zinc-200">Tổ hợp TO chất lượng cao</span>
                <span className="text-xs text-zinc-500 ml-2">| TK ≥ 10 tỷ</span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">{data.totalStocks} mã / {data.totalUniverse} universe</span>
            </div>

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
                <TOTable stocks={data.toTiers[tier.key] || []} />
              </TierSection>
            ))}
          </TabsContent>

          {/* ========= RS TAB ========= */}
          <TabsContent value="rs" className="space-y-4">
            {/* Header info */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-zinc-200">Tổ hợp RS chất lượng cao</span>
                <span className="text-xs text-zinc-500 ml-2">| TK ≥ 10 tỷ</span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">{data.rsStocks.length} mã / {data.totalUniverse} universe</span>
            </div>

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
