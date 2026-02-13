"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getStockList,
  getTopGainers,
  getTopLosers,
  type TopMover,
} from "@/lib/vnstock-api";

async function fetchMarketBreadth() {
  const stocks = await getStockList();
  let advancing = 0;
  let declining = 0;
  let unchanged = 0;
  let totalVolume = 0;

  stocks.forEach((s) => {
    if (s.price_change_pct > 0) advancing++;
    else if (s.price_change_pct < 0) declining++;
    else unchanged++;
    totalVolume += s.total_volume || 0;
  });

  return { advancing, declining, unchanged, totalVolume, total: stocks.length };
}

export function MarketOverview() {
  const { data: marketData, isLoading: loadingMarket } = useQuery({
    queryKey: ["market-breadth"],
    queryFn: fetchMarketBreadth,
    refetchInterval: 60000,
  });

  const { data: topGainers = [], isLoading: loadingGainers } = useQuery({
    queryKey: ["top-gainers-market"],
    queryFn: async () => (await getTopGainers()).slice(0, 5),
    refetchInterval: 60000,
  });

  const { data: topLosers = [], isLoading: loadingLosers } = useQuery({
    queryKey: ["top-losers-market"],
    queryFn: async () => (await getTopLosers()).slice(0, 5),
    refetchInterval: 60000,
  });

  const isLoading = loadingMarket || loadingGainers || loadingLosers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Tổng quan thị trường
        </h1>
        <p className="text-muted-foreground">
          Chỉ số và biến động thị trường chứng khoán Việt Nam
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng cổ phiếu</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMarket ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {marketData?.total?.toLocaleString() || "---"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cổ phiếu tăng</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMarket ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold text-green-500">
                  {marketData?.advancing || 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cổ phiếu giảm</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMarket ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <span className="text-2xl font-bold text-red-500">
                  {marketData?.declining || 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Không đổi</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMarket ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-yellow-500">
                {marketData?.unchanged || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Top tăng giá
            </CardTitle>
            <CardDescription>Cổ phiếu tăng mạnh nhất hôm nay</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {topGainers.map((stock: TopMover) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 hover:bg-green-500/10"
                  >
                    <div>
                      <div className="font-medium">{stock.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {stock.close_price?.toLocaleString()} VND
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-green-500 border-green-500/20"
                    >
                      +{stock.percent_change?.toFixed(2)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              Top giảm giá
            </CardTitle>
            <CardDescription>Cổ phiếu giảm mạnh nhất hôm nay</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {topLosers.map((stock: TopMover) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10"
                  >
                    <div>
                      <div className="font-medium">{stock.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {stock.close_price?.toLocaleString()} VND
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-red-500 border-red-500/20"
                    >
                      {stock.percent_change?.toFixed(2)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thống kê giao dịch</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMarket ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">Tổng khối lượng</span>
                <span className="font-medium">
                  {marketData?.totalVolume
                    ? `${(marketData.totalVolume / 1_000_000).toFixed(1)}M`
                    : "---"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">CP tăng</span>
                <span className="font-medium text-green-500">
                  {marketData?.advancing || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">CP giảm</span>
                <span className="font-medium text-red-500">
                  {marketData?.declining || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">CP tham chiếu</span>
                <span className="font-medium text-yellow-500">
                  {marketData?.unchanged || 0}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
