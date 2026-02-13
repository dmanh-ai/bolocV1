"use client";

import { useAppStore } from "@/store/useAppStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Search,
  Star,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

async function fetchStocks() {
  const res = await fetch("/api/stocks?action=list");
  return res.json();
}

async function fetchTopGainers() {
  const res = await fetch("/api/stocks?action=top_gainers");
  return res.json();
}

async function fetchTopLosers() {
  const res = await fetch("/api/stocks?action=top_losers");
  return res.json();
}

interface TopMover {
  symbol: string;
  close_price: number;
  percent_change: number;
}

export function Dashboard() {
  const { watchlist, setActiveTab } = useAppStore();

  const { data: stocksData, isLoading } = useQuery({
    queryKey: ["stocks-list"],
    queryFn: fetchStocks,
  });

  const { data: gainersData, isLoading: loadingGainers } = useQuery({
    queryKey: ["top-gainers"],
    queryFn: fetchTopGainers,
    refetchInterval: 60000,
  });

  const { data: losersData, isLoading: loadingLosers } = useQuery({
    queryKey: ["top-losers"],
    queryFn: fetchTopLosers,
    refetchInterval: 60000,
  });

  const totalStocks = stocksData?.count || 0;
  const topGainers: TopMover[] = (gainersData?.data || []).slice(0, 5);
  const topLosers: TopMover[] = (losersData?.data || []).slice(0, 5);

  const stats = [
    {
      title: "Tổng cổ phiếu",
      value: totalStocks || "---",
      description: "HOSE, HNX, UPCOM",
      icon: BarChart3,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Watchlist",
      value: watchlist.length,
      description: "Cổ phiếu theo dõi",
      icon: Star,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      title: "Top tăng hôm nay",
      value: topGainers[0]?.symbol || "---",
      description: topGainers[0]?.percent_change
        ? `+${topGainers[0].percent_change.toFixed(2)}%`
        : "Đang tải...",
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Tổng quan thị trường chứng khoán Việt Nam
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
            <CardDescription>Các tính năng chính của VN Sniper</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start gap-3 h-12"
              variant="outline"
              onClick={() => setActiveTab("screener")}
            >
              <Search className="w-5 h-5 text-green-500" />
              <div className="text-left">
                <div className="font-medium">Bộ lọc cổ phiếu</div>
                <div className="text-xs text-muted-foreground">
                  Tìm cổ phiếu theo P/E, P/B, ROE...
                </div>
              </div>
            </Button>

            <Button
              className="w-full justify-start gap-3 h-12"
              variant="outline"
              onClick={() => setActiveTab("watchlist")}
            >
              <Star className="w-5 h-5 text-yellow-500" />
              <div className="text-left">
                <div className="font-medium">Watchlist</div>
                <div className="text-xs text-muted-foreground">
                  Xem cổ phiếu yêu thích
                </div>
              </div>
            </Button>

            <Button
              className="w-full justify-start gap-3 h-12"
              variant="outline"
              onClick={() => setActiveTab("market")}
            >
              <Activity className="w-5 h-5 text-blue-500" />
              <div className="text-left">
                <div className="font-medium">Tổng quan thị trường</div>
                <div className="text-xs text-muted-foreground">
                  Biểu đồ và chỉ số thị trường
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top biến động</CardTitle>
            <CardDescription>
              Cổ phiếu tăng/giảm mạnh nhất hôm nay
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGainers || loadingLosers ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">
                      Tăng nhất
                    </span>
                  </div>
                  <div className="space-y-2">
                    {topGainers.length > 0 ? (
                      topGainers.map((stock) => (
                        <div
                          key={stock.symbol}
                          className="flex items-center justify-between p-2 rounded-lg bg-green-500/5 hover:bg-green-500/10 cursor-pointer"
                        >
                          <div>
                            <div className="font-medium">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">
                              {stock.close_price
                                ? `${stock.close_price.toLocaleString()} VND`
                                : "---"}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-green-500 border-green-500/20"
                          >
                            +{stock.percent_change?.toFixed(2) || "0"}%
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Không có dữ liệu
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-500">
                      Giảm nhất
                    </span>
                  </div>
                  <div className="space-y-2">
                    {topLosers.length > 0 ? (
                      topLosers.map((stock) => (
                        <div
                          key={stock.symbol}
                          className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 hover:bg-red-500/10 cursor-pointer"
                        >
                          <div>
                            <div className="font-medium">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">
                              {stock.close_price
                                ? `${stock.close_price.toLocaleString()} VND`
                                : "---"}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-red-500 border-red-500/20"
                          >
                            {stock.percent_change?.toFixed(2) || "0"}%
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Không có dữ liệu
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {watchlist.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Watchlist của bạn</CardTitle>
              <CardDescription>
                {watchlist.length} cổ phiếu đang theo dõi
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("watchlist")}
            >
              Xem tất cả
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {watchlist.slice(0, 4).map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 cursor-pointer"
                >
                  <div>
                    <div className="font-medium">{stock.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {stock.name}
                    </div>
                  </div>
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
