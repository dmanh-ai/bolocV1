'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  DollarSign,
  Percent,
} from 'lucide-react';

export function MarketOverview() {
  // Mock market data
  const indices = [
    { name: 'VN-Index', value: 1254.32, change: 1.25, volume: '824.5M' },
    { name: 'VN30', value: 1356.78, change: 0.85, volume: '456.2M' },
    { name: 'HNX-Index', value: 234.56, change: -0.45, volume: '123.8M' },
    { name: 'UPCOM-Index', value: 89.34, change: 0.12, volume: '45.6M' },
  ];

  const sectors = [
    { name: 'Ngân hàng', change: 2.1, color: 'text-green-500' },
    { name: 'Bất động sản', change: 1.5, color: 'text-green-500' },
    { name: 'Công nghệ', change: -0.8, color: 'text-red-500' },
    { name: 'Thép', change: 0.5, color: 'text-green-500' },
    { name: 'Hóa chất', change: -1.2, color: 'text-red-500' },
    { name: 'Bán lẻ', change: 0.3, color: 'text-green-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan thị trường</h1>
        <p className="text-muted-foreground">
          Chỉ số và biến động thị trường chứng khoán Việt Nam
        </p>
      </div>

      {/* Market Indices */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {indices.map((index) => (
          <Card key={index.name}>
            <CardHeader className="pb-2">
              <CardDescription>{index.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">{index.value.toLocaleString()}</div>
                  <div className={`flex items-center gap-1 ${index.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {index.change >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{index.change >= 0 ? '+' : ''}{index.change}%</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  KL: {index.volume}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sectors */}
      <Card>
        <CardHeader>
          <CardTitle>Biến động ngành</CardTitle>
          <CardDescription>Top ngành tăng/giảm trong ngày</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector) => (
              <div
                key={sector.name}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50"
              >
                <span className="font-medium">{sector.name}</span>
                <div className={`flex items-center gap-1 ${sector.color}`}>
                  {sector.change >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{sector.change >= 0 ? '+' : ''}{sector.change}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Market Stats */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thống kê giao dịch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tổng giá trị giao dịch</span>
                <span className="font-medium">12,456.7 tỷ VND</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tổng khối lượng</span>
                <span className="font-medium">823.5 triệu CP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cổ phiếu tăng</span>
                <span className="font-medium text-green-500">234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cổ phiếu giảm</span>
                <span className="font-medium text-red-500">189</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cổ phiếu tham chiếu</span>
                <span className="font-medium text-yellow-500">87</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Khối ngoại</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mua ròng</span>
                <span className="font-medium text-green-500">+456.7 tỷ VND</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Giá trị mua</span>
                <span className="font-medium">1,234.5 tỷ VND</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Giá trị bán</span>
                <span className="font-medium">777.8 tỷ VND</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Top mua ròng</span>
                <Badge variant="outline">VIC, VHM, FPT</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Top bán ròng</span>
                <Badge variant="outline">VNM, MWG, HPG</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
