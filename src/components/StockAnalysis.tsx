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
        <Tabs defaultValue="to" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-zinc-900 border border-zinc-800">
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

          {/* ========= TO TAB ========= */}
          <TabsContent value="to" className="space-y-4">
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
    </div>
  );
}
