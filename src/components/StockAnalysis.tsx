'use client';

import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Star,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { screenStocks, analyzeStock } from '@/lib/stock-analyzer';

// Strategy configurations
const STRATEGY_CONFIG = {
  investing: {
    name: "Đầu tư dài hạn",
    timeframe: "6 tháng - 1 năm",
    icon: Building2,
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    lightBg: "bg-blue-500/10",
    description: "Focus vào fundamentals, định giá hợp lý, tăng trưởng bền vững",
    criteria: ["P/E < 15", "P/B < 2", "ROE > 15%", "Thanh khoản tốt"]
  },
  trading: {
    name: "Trading",
    timeframe: "1 - 3 tuần",
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-500",
    lightBg: "bg-green-500/10",
    description: "Focus vào xu hướng kỹ thuật, momentum ngắn hạn",
    criteria: ["Xu hướng tăng", "RSI 35-65", "Volume tăng"]
  },
  speculation: {
    name: "Đầu cơ",
    timeframe: "2 - 4 tuần",
    icon: Zap,
    color: "text-orange-500",
    bgColor: "bg-orange-500",
    lightBg: "bg-orange-500/10",
    description: "Tận dụng biến động, momentum mạnh, cơ hội ngắn hạn",
    criteria: ["Biến động cao", "Momentum mạnh", "Volume bất thường"]
  }
};

interface StockRecommendation {
  symbol: string;
  score: number;
  action: string;
  confidence: string;
  current_price: number;
  support: number;
  resistance: number;
  signals: Array<{type: string; signal: string; detail: string}>;
  fundamental_score: number;
  technical_score: number;
  data: {
    fundamental: any;
    technical: any;
  };
}

interface StrategyResult {
  strategy: string;
  strategy_name: string;
  timeframe: string;
  description: string;
  total_analyzed: number;
  total_qualified: number;
  recommendations: StockRecommendation[];
  generated_at: string;
}

function getActionBadge(action: string) {
  const styles: Record<string, string> = {
    'Strong Buy': 'bg-green-500 text-white',
    'Buy': 'bg-green-400 text-white',
    'Watch': 'bg-blue-500 text-white',
    'Hold': 'bg-yellow-500 text-white',
    'Avoid': 'bg-orange-500 text-white',
    'Sell': 'bg-red-500 text-white',
  };
  return styles[action] || 'bg-gray-500 text-white';
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-green-500';
  if (score >= 60) return 'text-blue-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

function getScoreBg(score: number) {
  if (score >= 70) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function StockCard({ stock, strategyKey, onSelect }: { 
  stock: StockRecommendation; 
  strategyKey: string;
  onSelect: (symbol: string) => void;
}) {
  const config = STRATEGY_CONFIG[strategyKey as keyof typeof STRATEGY_CONFIG];
  
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSelect(stock.symbol)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${getScoreBg(stock.score)}`}>
              {stock.score.toFixed(0)}
            </div>
            <div>
              <div className="font-bold text-lg">{stock.symbol}</div>
              <div className="text-sm text-muted-foreground">
                {stock.current_price?.toLocaleString() || '---'} VND
              </div>
            </div>
          </div>
          <Badge className={getActionBadge(stock.action)}>
            {stock.action}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div className="p-2 rounded bg-secondary/50">
            <div className="text-muted-foreground text-xs">Hỗ trợ</div>
            <div className="font-medium">{stock.support?.toLocaleString() || '---'}</div>
          </div>
          <div className="p-2 rounded bg-secondary/50">
            <div className="text-muted-foreground text-xs">Kháng cự</div>
            <div className="font-medium">{stock.resistance?.toLocaleString() || '---'}</div>
          </div>
        </div>
        
        <div className="flex gap-2 text-xs">
          <div className="px-2 py-1 rounded bg-secondary">
            Fundamental: <span className={getScoreColor(stock.fundamental_score)}>{stock.fundamental_score?.toFixed(0)}</span>
          </div>
          <div className="px-2 py-1 rounded bg-secondary">
            Technical: <span className={getScoreColor(stock.technical_score)}>{stock.technical_score?.toFixed(0)}</span>
          </div>
        </div>
        
        {stock.signals && stock.signals.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex flex-wrap gap-1">
              {stock.signals.slice(0, 2).map((signal, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {signal.signal}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StrategySection({ 
  strategyKey, 
  data, 
  isLoading,
  onSelectStock 
}: { 
  strategyKey: string; 
  data: StrategyResult | undefined;
  isLoading: boolean;
  onSelectStock: (symbol: string) => void;
}) {
  const config = STRATEGY_CONFIG[strategyKey as keyof typeof STRATEGY_CONFIG];
  const Icon = config.icon;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.lightBg}`}>
              <Icon className={`w-6 h-6 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {config.name}
                <Badge variant="outline" className="font-normal">
                  {config.timeframe}
                </Badge>
              </CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          {!isLoading && data && (
            <div className="text-right text-sm">
              <div className="text-muted-foreground">Phân tích {data.total_analyzed} CP</div>
              <div className="text-green-500">{data.total_qualified} đạt yêu cầu</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Criteria */}
        <div className="flex flex-wrap gap-2 mb-4">
          {config.criteria.map((c, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {c}
            </Badge>
          ))}
        </div>
        
        {/* Stock List */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : data?.recommendations && data.recommendations.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.recommendations.map((stock) => (
              <StockCard 
                key={stock.symbol} 
                stock={stock} 
                strategyKey={strategyKey}
                onSelect={onSelectStock}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>Không tìm thấy cổ phiếu phù hợp</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StockDetailModal({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['stock-analysis', symbol],
    queryFn: () => analyzeStock(symbol),
    enabled: !!symbol,
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analysis = data?.full_analysis;
  const strategies = data?.strategies;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{symbol}</CardTitle>
            <CardDescription>Phân tích chi tiết theo từng chiến lược</CardDescription>
          </div>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strategy Scores */}
          <div className="grid gap-4 sm:grid-cols-3">
            {Object.entries(strategies || {}).map(([key, result]: [string, any]) => {
              const config = STRATEGY_CONFIG[key as keyof typeof STRATEGY_CONFIG];
              const Icon = config.icon;
              return (
                <Card key={key} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <span className="font-medium">{config.name}</span>
                  </div>
                  <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score?.toFixed(0)}
                  </div>
                  <Badge className={`mt-2 ${getActionBadge(result.action)}`}>
                    {result.action}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {result.confidence}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Technical Data */}
          {analysis?.technical && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Phân tích Kỹ thuật</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">Giá hiện tại</div>
                    <div className="font-bold text-lg">{analysis.technical.data?.current_price?.toLocaleString() || 'N/A'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">Xu hướng</div>
                    <div className="font-bold">{analysis.technical.data?.trend || 'N/A'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">RSI</div>
                    <div className="font-bold">{analysis.technical.data?.rsi?.toFixed(1) || 'N/A'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">MA20</div>
                    <div className="font-bold">{analysis.technical.data?.ma20?.toFixed(2) || 'N/A'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <div className="text-sm text-green-500">Hỗ trợ</div>
                    <div className="font-bold">{analysis.technical.data?.support?.toLocaleString() || 'N/A'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10">
                    <div className="text-sm text-red-500">Kháng cự</div>
                    <div className="font-bold">{analysis.technical.data?.resistance?.toLocaleString() || 'N/A'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">Volatility</div>
                    <div className="font-bold">{analysis.technical.data?.volatility?.toFixed(1) || 'N/A'}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">Volume Ratio</div>
                    <div className="font-bold">{analysis.technical.data?.volume_ratio || 'N/A'}x</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fundamental Data */}
          {analysis?.fundamental && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Phân tích Cơ bản</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">P/E</div>
                    <div className="font-bold text-lg">{analysis.fundamental.data?.pe?.toFixed(1) || 'N/A'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">P/B</div>
                    <div className="font-bold text-lg">{analysis.fundamental.data?.pb?.toFixed(2) || 'N/A'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">ROE</div>
                    <div className="font-bold text-lg">{analysis.fundamental.data?.roe?.toFixed(1) || 'N/A'}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">ROA</div>
                    <div className="font-bold text-lg">{analysis.fundamental.data?.roa?.toFixed(1) || 'N/A'}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">EPS</div>
                    <div className="font-bold">{analysis.fundamental.data?.eps?.toFixed(0) || 'N/A'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground">Market Cap</div>
                    <div className="font-bold">{analysis.fundamental.data?.market_cap ? `${(analysis.fundamental.data.market_cap / 1e9).toFixed(0)}B` : 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function StockAnalysis() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const { addToWatchlist, isInWatchlist } = useAppStore();
  
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['all-recommendations'],
    queryFn: () => screenStocks('all', 8),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const marketOverview = data?.market_overview;
  const strategies = data?.strategies as Record<string, StrategyResult> | undefined;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Đề xuất Cổ phiếu</h1>
          <p className="text-muted-foreground">
            Tự động lọc và đề xuất cổ phiếu theo từng chiến lược đầu tư
          </p>
        </div>
        <Button 
          onClick={() => refetch()} 
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Đang cập nhật...' : 'Cập nhật'}
        </Button>
      </div>

      {/* Market Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowUpRight className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Cổ phiếu tăng</div>
                <div className="text-2xl font-bold text-green-500">{marketOverview?.num_gainers || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ArrowDownRight className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Cổ phiếu giảm</div>
                <div className="text-2xl font-bold text-red-500">{marketOverview?.num_losers || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Cập nhật lần cuối</div>
                <div className="text-sm font-medium">
                  {data?.generated_at ? new Date(data.generated_at).toLocaleString('vi-VN') : '---'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Sections */}
      <Tabs defaultValue="investing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          {Object.entries(STRATEGY_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const count = strategies?.[key]?.recommendations?.length || 0;
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2 py-3">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{config.name}</span>
                <Badge variant="secondary" className="ml-1">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(STRATEGY_CONFIG).map((strategyKey) => (
          <TabsContent key={strategyKey} value={strategyKey}>
            <StrategySection
              strategyKey={strategyKey}
              data={strategies?.[strategyKey]}
              isLoading={isLoading}
              onSelectStock={setSelectedSymbol}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Stock Detail Modal */}
      {selectedSymbol && (
        <StockDetailModal 
          symbol={selectedSymbol} 
          onClose={() => setSelectedSymbol(null)} 
        />
      )}
    </div>
  );
}
