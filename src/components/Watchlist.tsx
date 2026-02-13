'use client';

import { useAppStore, type Stock } from '@/store/useAppStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Star,
  Search,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// Fetch stock ratios
async function fetchStockRatios(symbol: string) {
  const res = await fetch(`/api/stocks?action=ratios&symbol=${symbol}&period=quarter`);
  return res.json();
}

export function Watchlist() {
  const { watchlist, removeFromWatchlist, setSelectedStock } = useAppStore();

  // Fetch ratios for watchlist stocks
  const { data: ratiosData, isLoading } = useQuery({
    queryKey: ['watchlist-ratios', watchlist.map(s => s.symbol).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        watchlist.map(async (stock) => {
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
      return results;
    },
    enabled: watchlist.length > 0,
  });

  const stocks = ratiosData || watchlist;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Watchlist</h1>
        <p className="text-muted-foreground">
          Danh sách cổ phiếu bạn đang theo dõi
        </p>
      </div>

      {/* Watchlist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Cổ phiếu yêu thích
          </CardTitle>
          <CardDescription>
            {watchlist.length} cổ phiếu trong watchlist
          </CardDescription>
        </CardHeader>
        <CardContent>
          {watchlist.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Watchlist trống</h3>
              <p className="text-muted-foreground mb-4">
                Thêm cổ phiếu vào watchlist từ Bộ lọc cổ phiếu
              </p>
              <Button onClick={() => useAppStore.getState().setActiveTab('screener')}>
                <Search className="w-4 h-4 mr-2" />
                Tìm cổ phiếu
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Đang tải dữ liệu...
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Mã CP</TableHead>
                    <TableHead>Tên công ty</TableHead>
                    <TableHead className="text-right">P/E</TableHead>
                    <TableHead className="text-right">P/B</TableHead>
                    <TableHead className="text-right">ROE %</TableHead>
                    <TableHead className="text-right">ROA %</TableHead>
                    <TableHead className="text-right">EPS</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks.map((stock: any) => (
                    <TableRow key={stock.symbol} className="hover:bg-secondary/50">
                      <TableCell className="font-medium text-green-500">
                        {stock.symbol}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {stock.name || '---'}
                      </TableCell>
                      <TableCell className="text-right">
                        {stock.pe !== undefined ? (
                          <Badge variant={stock.pe < 15 ? 'default' : stock.pe < 25 ? 'secondary' : 'destructive'}>
                            {stock.pe.toFixed(1)}
                          </Badge>
                        ) : '---'}
                      </TableCell>
                      <TableCell className="text-right">
                        {stock.pb !== undefined ? stock.pb.toFixed(2) : '---'}
                      </TableCell>
                      <TableCell className="text-right">
                        {stock.roe !== undefined ? (
                          <span className={stock.roe >= 15 ? 'text-green-500' : stock.roe >= 10 ? 'text-yellow-500' : 'text-red-500'}>
                            {stock.roe.toFixed(1)}%
                          </span>
                        ) : '---'}
                      </TableCell>
                      <TableCell className="text-right">
                        {stock.roa !== undefined ? `${stock.roa.toFixed(1)}%` : '---'}
                      </TableCell>
                      <TableCell className="text-right">
                        {stock.eps !== undefined ? stock.eps.toFixed(0) : '---'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromWatchlist(stock.symbol)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
