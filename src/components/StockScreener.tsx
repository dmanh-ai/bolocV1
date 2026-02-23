'use client';

import { useState, useMemo } from 'react';
import { useAppStore, type Stock } from '@/store/useAppStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Star,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { getStockList, getAllCompanyRatios } from '@/lib/vnstock-api';

interface StockWithRatios extends Stock {
  pe?: number;
  pb?: number;
  roe?: number;
  roa?: number;
  eps?: number;
  marketCap?: number;
  revenue_growth?: number;
  net_profit_growth?: number;
  net_profit_margin?: number;
  gross_margin?: number;
  current_ratio?: number;
  de?: number;
  dividend?: number;
  exchange?: string;
}

function FilterSection({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg">
      <button
        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-secondary/50"
        onClick={onToggle}
      >
        {title}
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="p-3 pt-0 grid gap-4 md:grid-cols-2">{children}</div>}
    </div>
  );
}

export function StockScreener() {
  const { filters, setFilters, resetFilters, addToWatchlist, removeFromWatchlist, isInWatchlist, setSelectedStock } = useAppStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    valuation: true, profitability: false, growth: false, solvency: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const { data: stocksWithRatios = [], isLoading: isLoadingStocks } = useQuery({
    queryKey: ['stocks-with-ratios-full'],
    queryFn: async () => {
      const [stockList, allRatios] = await Promise.all([
        getStockList(),
        getAllCompanyRatios(),
      ]);

      const ratiosMap = new Map(allRatios.map((r) => [r.symbol, r]));

      return stockList.map((s): StockWithRatios => {
        const r = ratiosMap.get(s.symbol);
        return {
          symbol: s.symbol,
          name: '',
          exchange: s.exchange,
          pe: r?.pe,
          pb: r?.pb,
          roe: r?.roe,
          roa: r?.roa,
          eps: r?.eps,
          marketCap: r?.market_cap,
          revenue_growth: r?.revenue_growth,
          net_profit_growth: r?.net_profit_growth,
          net_profit_margin: r?.net_profit_margin,
          gross_margin: r?.gross_margin,
          current_ratio: r?.current_ratio,
          de: r?.de,
          dividend: r?.dividend,
        };
      });
    },
    staleTime: 2 * 60 * 1000,
  });

  const filteredStocks = useMemo(() => {
    if (!stocksWithRatios.length) return [];

    return stocksWithRatios.filter((s) => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (!s.symbol.toLowerCase().includes(q) && !s.name?.toLowerCase().includes(q)) return false;
      }
      if (filters.exchange !== 'all' && s.exchange && s.exchange !== filters.exchange) return false;
      // Valuation
      if (s.pe !== undefined && (s.pe < filters.peMin || s.pe > filters.peMax)) return false;
      if (s.pb !== undefined && (s.pb < filters.pbMin || s.pb > filters.pbMax)) return false;
      // Profitability
      if (s.roe !== undefined && (s.roe < filters.roeMin || s.roe > filters.roeMax)) return false;
      if (s.roa !== undefined && (s.roa < filters.roaMin || s.roa > filters.roaMax)) return false;
      if (s.net_profit_margin !== undefined && (s.net_profit_margin < filters.netMarginMin || s.net_profit_margin > filters.netMarginMax)) return false;
      if (s.gross_margin !== undefined && (s.gross_margin < filters.grossMarginMin || s.gross_margin > filters.grossMarginMax)) return false;
      // Growth
      if (s.revenue_growth !== undefined && (s.revenue_growth < filters.revenueGrowthMin || s.revenue_growth > filters.revenueGrowthMax)) return false;
      if (s.net_profit_growth !== undefined && (s.net_profit_growth < filters.netProfitGrowthMin || s.net_profit_growth > filters.netProfitGrowthMax)) return false;
      // Solvency
      if (s.current_ratio !== undefined && s.current_ratio < filters.currentRatioMin) return false;
      if (s.de !== undefined && s.de > filters.deMax) return false;

      return true;
    });
  }, [stocksWithRatios, filters]);

  const columns: ColumnDef<StockWithRatios>[] = [
    {
      accessorKey: 'symbol',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
          Mã <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium text-green-500">{row.getValue('symbol')}</div>,
    },
    {
      accessorKey: 'pe',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
          P/E <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const v = row.getValue('pe') as number;
        if (v === undefined) return <span className="text-muted-foreground">---</span>;
        return <Badge variant={v < 15 ? 'default' : v < 25 ? 'secondary' : 'destructive'}>{v.toFixed(1)}</Badge>;
      },
    },
    {
      accessorKey: 'pb',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
          P/B <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const v = row.getValue('pb') as number;
        if (v === undefined) return <span className="text-muted-foreground">---</span>;
        return <Badge variant={v < 1 ? 'default' : v < 3 ? 'secondary' : 'destructive'}>{v.toFixed(2)}</Badge>;
      },
    },
    {
      accessorKey: 'roe',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
          ROE <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const v = row.getValue('roe') as number;
        if (v === undefined) return <span className="text-muted-foreground">---</span>;
        return <div className={v >= 15 ? 'text-green-500' : v >= 10 ? 'text-yellow-500' : 'text-red-500'}>{v.toFixed(1)}%</div>;
      },
    },
    {
      accessorKey: 'roa',
      header: 'ROA',
      cell: ({ row }) => {
        const v = row.getValue('roa') as number;
        return v !== undefined ? `${v.toFixed(1)}%` : '---';
      },
    },
    {
      accessorKey: 'eps',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="h-8 px-2">
          EPS <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const v = row.getValue('eps') as number;
        return v !== undefined ? <span className={v > 0 ? 'text-green-500' : 'text-red-500'}>{v.toFixed(0)}</span> : '---';
      },
    },
    {
      accessorKey: 'revenue_growth',
      header: 'DT %',
      cell: ({ row }) => {
        const v = row.getValue('revenue_growth') as number;
        if (v === undefined) return '---';
        return <span className={v > 0 ? 'text-green-500' : 'text-red-500'}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</span>;
      },
    },
    {
      accessorKey: 'net_profit_margin',
      header: 'NPM',
      cell: ({ row }) => {
        const v = row.getValue('net_profit_margin') as number;
        return v !== undefined ? `${v.toFixed(1)}%` : '---';
      },
    },
    {
      accessorKey: 'current_ratio',
      header: 'CR',
      cell: ({ row }) => {
        const v = row.getValue('current_ratio') as number;
        return v !== undefined ? v.toFixed(2) : '---';
      },
    },
    {
      accessorKey: 'de',
      header: 'D/E',
      cell: ({ row }) => {
        const v = row.getValue('de') as number;
        if (v === undefined) return '---';
        return <span className={v > 2 ? 'text-red-500' : ''}>{v.toFixed(2)}</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const stock = row.original;
        const inWatchlist = isInWatchlist(stock.symbol);
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => inWatchlist ? removeFromWatchlist(stock.symbol) : addToWatchlist(stock)}
          >
            <Star className={`h-4 w-4 ${inWatchlist ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredStocks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bộ lọc cổ phiếu</h1>
          <p className="text-muted-foreground">Lọc theo chỉ số tài chính, tăng trưởng, thanh khoản</p>
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bộ lọc nâng cao</CardTitle>
                <CardDescription>Lọc theo nhiều tiêu chí tài chính</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Đặt lại
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search + Exchange */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tìm kiếm</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Mã hoặc tên CP..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters({ searchQuery: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sàn giao dịch</Label>
                <Select value={filters.exchange} onValueChange={(v) => setFilters({ exchange: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="HOSE">HOSE</SelectItem>
                    <SelectItem value="HNX">HNX</SelectItem>
                    <SelectItem value="UPCOM">UPCOM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Valuation */}
            <FilterSection title="Định giá (P/E, P/B)" open={openSections.valuation} onToggle={() => toggleSection('valuation')}>
              <div className="space-y-2">
                <Label>P/E: {filters.peMin} - {filters.peMax}</Label>
                <Slider value={[filters.peMin, filters.peMax]} min={0} max={100} step={1} onValueChange={([min, max]) => setFilters({ peMin: min, peMax: max })} />
              </div>
              <div className="space-y-2">
                <Label>P/B: {filters.pbMin} - {filters.pbMax}</Label>
                <Slider value={[filters.pbMin, filters.pbMax]} min={0} max={20} step={0.5} onValueChange={([min, max]) => setFilters({ pbMin: min, pbMax: max })} />
              </div>
            </FilterSection>

            {/* Profitability */}
            <FilterSection title="Lợi nhuận (ROE, ROA, Biên LN)" open={openSections.profitability} onToggle={() => toggleSection('profitability')}>
              <div className="space-y-2">
                <Label>ROE: {filters.roeMin}% - {filters.roeMax}%</Label>
                <Slider value={[filters.roeMin, filters.roeMax]} min={0} max={100} step={1} onValueChange={([min, max]) => setFilters({ roeMin: min, roeMax: max })} />
              </div>
              <div className="space-y-2">
                <Label>ROA: {filters.roaMin}% - {filters.roaMax}%</Label>
                <Slider value={[filters.roaMin, filters.roaMax]} min={0} max={50} step={1} onValueChange={([min, max]) => setFilters({ roaMin: min, roaMax: max })} />
              </div>
              <div className="space-y-2">
                <Label>Biên LN ròng: {filters.netMarginMin}% - {filters.netMarginMax}%</Label>
                <Slider value={[filters.netMarginMin, filters.netMarginMax]} min={-50} max={100} step={1} onValueChange={([min, max]) => setFilters({ netMarginMin: min, netMarginMax: max })} />
              </div>
              <div className="space-y-2">
                <Label>Biên gộp: {filters.grossMarginMin}% - {filters.grossMarginMax}%</Label>
                <Slider value={[filters.grossMarginMin, filters.grossMarginMax]} min={0} max={100} step={1} onValueChange={([min, max]) => setFilters({ grossMarginMin: min, grossMarginMax: max })} />
              </div>
            </FilterSection>

            {/* Growth */}
            <FilterSection title="Tăng trưởng (Doanh thu, Lợi nhuận)" open={openSections.growth} onToggle={() => toggleSection('growth')}>
              <div className="space-y-2">
                <Label>Tăng trưởng DT: {filters.revenueGrowthMin}% - {filters.revenueGrowthMax}%</Label>
                <Slider value={[filters.revenueGrowthMin, filters.revenueGrowthMax]} min={-100} max={500} step={5} onValueChange={([min, max]) => setFilters({ revenueGrowthMin: min, revenueGrowthMax: max })} />
              </div>
              <div className="space-y-2">
                <Label>Tăng trưởng LN: {filters.netProfitGrowthMin}% - {filters.netProfitGrowthMax}%</Label>
                <Slider value={[filters.netProfitGrowthMin, filters.netProfitGrowthMax]} min={-100} max={500} step={5} onValueChange={([min, max]) => setFilters({ netProfitGrowthMin: min, netProfitGrowthMax: max })} />
              </div>
            </FilterSection>

            {/* Solvency */}
            <FilterSection title="Thanh khoản & Đòn bẩy (CR, D/E)" open={openSections.solvency} onToggle={() => toggleSection('solvency')}>
              <div className="space-y-2">
                <Label>Current Ratio tối thiểu: {filters.currentRatioMin}</Label>
                <Slider value={[filters.currentRatioMin]} min={0} max={5} step={0.1} onValueChange={([v]) => setFilters({ currentRatioMin: v })} />
              </div>
              <div className="space-y-2">
                <Label>D/E tối đa: {filters.deMax}</Label>
                <Slider value={[filters.deMax]} min={0} max={10} step={0.5} onValueChange={([v]) => setFilters({ deMax: v })} />
              </div>
            </FilterSection>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kết quả</CardTitle>
              <CardDescription>Tìm thấy {filteredStocks.length} cổ phiếu</CardDescription>
            </div>
            <Badge variant="secondary">{filteredStocks.length} kết quả</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingStocks ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="cursor-pointer hover:bg-secondary/50">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        Không tìm thấy cổ phiếu nào.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
