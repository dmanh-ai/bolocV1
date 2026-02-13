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
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Loader2,
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

// Fetch stocks list
async function fetchStocks() {
  const res = await fetch('/api/stocks?action=list');
  return res.json();
}

// Fetch stock ratios
async function fetchStockRatios(symbol: string) {
  const res = await fetch(`/api/stocks?action=ratios&symbol=${symbol}&period=quarter`);
  return res.json();
}

// Extended stock type with ratios
interface StockWithRatios extends Stock {
  pe?: number;
  pb?: number;
  roe?: number;
  roa?: number;
  eps?: number;
  marketCap?: number;
  isLoading?: boolean;
}

export function StockScreener() {
  const { filters, setFilters, resetFilters, addToWatchlist, removeFromWatchlist, isInWatchlist, setSelectedStock, setActiveTab } = useAppStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());

  // Fetch stocks list
  const { data: stocksData, isLoading: isLoadingStocks, refetch } = useQuery({
    queryKey: ['stocks-list'],
    queryFn: fetchStocks,
  });

  // Local state for stocks with ratios
  const [stocksWithRatios, setStocksWithRatios] = useState<StockWithRatios[]>([]);
  const [loadedRatios, setLoadedRatios] = useState(false);

  // Load ratios for stocks
  const loadRatios = async () => {
    if (!stocksData?.data || loadedRatios) return;
    
    setLoadedRatios(true);
    const stocks: StockWithRatios[] = stocksData.data.map((s: any) => ({
      symbol: s.symbol,
      name: s.organ_name || '',
    }));
    
    setStocksWithRatios(stocks);
    
    // Load ratios in batches
    const batchSize = 10;
    for (let i = 0; i < Math.min(50, stocks.length); i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      
      const results = await Promise.all(
        batch.map(async (stock) => {
          try {
            const data = await fetchStockRatios(stock.symbol);
            return {
              ...stock,
              pe: data?.key_metrics?.pe,
              pb: data?.key_metrics?.pb,
              roe: data?.key_metrics?.roe,
              roa: data?.key_metrics?.roa,
              eps: data?.key_metrics?.eps,
              marketCap: data?.key_metrics?.market_cap,
            };
          } catch {
            return stock;
          }
        })
      );
      
      setStocksWithRatios(prev => {
        const updated = [...prev];
        results.forEach((r, idx) => {
          const existingIdx = updated.findIndex(s => s.symbol === r.symbol);
          if (existingIdx !== -1) {
            updated[existingIdx] = r;
          }
        });
        return updated;
      });
    }
  };

  // Start loading ratios when stocks are loaded
  if (stocksData?.data?.length > 0 && !loadedRatios) {
    loadRatios();
  }

  // Filter stocks
  const filteredStocks = useMemo(() => {
    if (!stocksWithRatios.length) return [];
    
    return stocksWithRatios.filter((stock) => {
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (
          !stock.symbol.toLowerCase().includes(query) &&
          !stock.name?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      
      // P/E filter
      if (stock.pe !== undefined) {
        if (stock.pe < filters.peMin || stock.pe > filters.peMax) return false;
      }
      
      // P/B filter
      if (stock.pb !== undefined) {
        if (stock.pb < filters.pbMin || stock.pb > filters.pbMax) return false;
      }
      
      // ROE filter
      if (stock.roe !== undefined) {
        if (stock.roe < filters.roeMin || stock.roe > filters.roeMax) return false;
      }
      
      return true;
    });
  }, [stocksWithRatios, filters]);

  // Table columns
  const columns: ColumnDef<StockWithRatios>[] = [
    {
      accessorKey: 'symbol',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Mã CP
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium text-green-500">{row.getValue('symbol')}</div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Tên công ty',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate text-muted-foreground">
          {row.getValue('name') || '---'}
        </div>
      ),
    },
    {
      accessorKey: 'pe',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          P/E
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.getValue('pe') as number;
        return value !== undefined ? (
          <Badge variant={value < 15 ? 'default' : value < 25 ? 'secondary' : 'destructive'}>
            {value.toFixed(1)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">---</span>
        );
      },
    },
    {
      accessorKey: 'pb',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          P/B
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.getValue('pb') as number;
        return value !== undefined ? (
          <Badge variant={value < 1 ? 'default' : value < 3 ? 'secondary' : 'destructive'}>
            {value.toFixed(2)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">---</span>
        );
      },
    },
    {
      accessorKey: 'roe',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          ROE %
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.getValue('roe') as number;
        return value !== undefined ? (
          <div className={value >= 15 ? 'text-green-500' : value >= 10 ? 'text-yellow-500' : 'text-red-500'}>
            {value.toFixed(1)}%
          </div>
        ) : (
          <span className="text-muted-foreground">---</span>
        );
      },
    },
    {
      accessorKey: 'roa',
      header: 'ROA %',
      cell: ({ row }) => {
        const value = row.getValue('roa') as number;
        return value !== undefined ? `${value.toFixed(1)}%` : '---';
      },
    },
    {
      accessorKey: 'eps',
      header: 'EPS',
      cell: ({ row }) => {
        const value = row.getValue('eps') as number;
        return value !== undefined ? value.toFixed(0) : '---';
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const stock = row.original;
        const inWatchlist = isInWatchlist(stock.symbol);
        
        return (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedStock(stock);
                // Could open detail modal
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (inWatchlist) {
                  removeFromWatchlist(stock.symbol);
                } else {
                  addToWatchlist(stock);
                }
              }}
            >
              <Star
                className={`h-4 w-4 ${
                  inWatchlist ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                }`}
              />
            </Button>
          </div>
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
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bộ lọc cổ phiếu</h1>
          <p className="text-muted-foreground">
            Tìm kiếm và lọc cổ phiếu theo các chỉ số tài chính
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bộ lọc</CardTitle>
                <CardDescription>Thiết lập các tiêu chí lọc cổ phiếu</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Đặt lại
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
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

              {/* P/E Filter */}
              <div className="space-y-2">
                <Label>
                  P/E Ratio: {filters.peMin} - {filters.peMax}
                </Label>
                <Slider
                  value={[filters.peMin, filters.peMax]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([min, max]) => setFilters({ peMin: min, peMax: max })}
                />
              </div>

              {/* P/B Filter */}
              <div className="space-y-2">
                <Label>
                  P/B Ratio: {filters.pbMin} - {filters.pbMax}
                </Label>
                <Slider
                  value={[filters.pbMin, filters.pbMax]}
                  min={0}
                  max={20}
                  step={0.5}
                  onValueChange={([min, max]) => setFilters({ pbMin: min, pbMax: max })}
                />
              </div>

              {/* ROE Filter */}
              <div className="space-y-2">
                <Label>
                  ROE %: {filters.roeMin}% - {filters.roeMax}%
                </Label>
                <Slider
                  value={[filters.roeMin, filters.roeMax]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([min, max]) => setFilters({ roeMin: min, roeMax: max })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kết quả</CardTitle>
              <CardDescription>
                Tìm thấy {filteredStocks.length} cổ phiếu
                {loadedRatios && stocksWithRatios.some(s => s.pe === undefined) && (
                  <span className="text-yellow-500 ml-2">(đang tải chỉ số...)</span>
                )}
              </CardDescription>
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
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className="cursor-pointer hover:bg-secondary/50"
                      >
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
