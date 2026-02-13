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
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Building2,
  Globe,
  BarChart3,
  Clock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { screenStocks, analyzeStock, type StrategyResult, type MacroData } from '@/lib/stock-analyzer';

const STRATEGY_CONFIG = {
  investing: {
    name: "Đầu tư dài hạn",
    timeframe: "6 tháng - 1 năm",
    icon: Building2,
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    lightBg: "bg-blue-500/10",
    description: "Fundamentals mạnh, định giá hợp lý, tăng trưởng bền vững",
    criteria: ["P/E < 25", "ROE > 8%", "Tăng trưởng DT", "Biên LN tốt"]
  },
  trading: {
    name: "Trading ngắn hạn",
    timeframe: "1 - 4 tuần",
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-500",
    lightBg: "bg-green-500/10",
    description: "Xu hướng kỹ thuật mạnh, momentum tốt, thanh khoản cao",
    criteria: ["Uptrend", "RSI 25-75", "MACD bullish", "Volume tăng"]
  },
};

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

function val(v: number | undefined | null, decimals = 1, suffix = '') {
  if (v === undefined || v === null || isNaN(v)) return 'N/A';
  return v.toFixed(decimals) + suffix;
}

function MacroOverview({ macro }: { macro?: MacroData }) {
  if (!macro) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-purple-500" />
          Phân tích Vĩ mô
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="text-xs text-muted-foreground">VN-Index Trend</div>
            <div className={`font-bold ${macro.vnindex_trend === 'Uptrend' ? 'text-green-500' : macro.vnindex_trend === 'Downtrend' ? 'text-red-500' : ''}`}>
              {macro.vnindex_trend}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="text-xs text-muted-foreground">VN-Index RSI</div>
            <div className="font-bold">{macro.vnindex_rsi?.toFixed(0) || 'N/A'}</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="text-xs text-muted-foreground">Breadth</div>
            <div className="font-bold">
              <span className="text-green-500">{macro.market_advancing}</span>
              {' / '}
              <span className="text-red-500">{macro.market_declining}</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="text-xs text-muted-foreground">Khối ngoại</div>
            <div className={`font-bold ${macro.foreign_net_value > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {macro.foreign_net_value ? `${(macro.foreign_net_value / 1e9).toFixed(1)} tỷ` : 'N/A'}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tâm lý thị trường:</span>
          <Badge variant="outline">{macro.market_sentiment}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function StockCard({ stock, onSelect }: {
  stock: StrategyResult['recommendations'][0];
  onSelect: (symbol: string) => void;
}) {
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

        <div className="flex gap-1 text-xs flex-wrap">
          <div className="px-2 py-1 rounded bg-blue-500/10">
            <span className="text-muted-foreground">F:</span> <span className={getScoreColor(stock.fundamental_score)}>{stock.fundamental_score?.toFixed(0)}</span>
          </div>
          <div className="px-2 py-1 rounded bg-green-500/10">
            <span className="text-muted-foreground">T:</span> <span className={getScoreColor(stock.technical_score)}>{stock.technical_score?.toFixed(0)}</span>
          </div>
          <div className="px-2 py-1 rounded bg-purple-500/10">
            <span className="text-muted-foreground">M:</span> <span className={getScoreColor(stock.macro_score)}>{stock.macro_score?.toFixed(0)}</span>
          </div>
        </div>

        {stock.signals && stock.signals.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex flex-wrap gap-1">
              {stock.signals.filter(s => s.impact === 'positive').slice(0, 3).map((signal, idx) => (
                <Badge key={idx} variant="outline" className="text-xs text-green-500 border-green-500/30">
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
        <div className="flex flex-wrap gap-2 mb-4">
          {config.criteria.map((c, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">{c}</Badge>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-44 w-full" />))}
          </div>
        ) : data?.recommendations && data.recommendations.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.recommendations.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} onSelect={onSelectStock} />
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <Card className="w-full max-w-5xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-10">
          <div>
            <CardTitle className="text-2xl">{symbol}</CardTitle>
            <CardDescription>Phân tích tổng hợp: Cơ bản + Kỹ thuật + Vĩ mô</CardDescription>
          </div>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strategy Scores */}
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(strategies || {}).map(([key, result]) => {
              const config = STRATEGY_CONFIG[key as keyof typeof STRATEGY_CONFIG];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <Card key={key} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <span className="font-medium">{config.name}</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                      {result.score?.toFixed(0)}
                    </div>
                    <Badge className={getActionBadge(result.action)}>{result.action}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                    <div className="text-center p-1 rounded bg-blue-500/10">F: {result.fundamental_score?.toFixed(0)}</div>
                    <div className="text-center p-1 rounded bg-green-500/10">T: {result.technical_score?.toFixed(0)}</div>
                    <div className="text-center p-1 rounded bg-purple-500/10">M: {result.macro_score?.toFixed(0)}</div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Fundamental */}
          {analysis?.fundamental && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Phân tích Cơ bản
                  <Badge variant="outline" className={getScoreColor(analysis.fundamental.score)}>
                    {analysis.fundamental.score}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Định giá</div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      <Metric label="P/E" value={val(analysis.fundamental.data?.pe)} />
                      <Metric label="P/B" value={val(analysis.fundamental.data?.pb, 2)} />
                      <Metric label="P/S" value={val(analysis.fundamental.data?.ps, 2)} />
                      <Metric label="EV/EBITDA" value={val(analysis.fundamental.data?.ev_per_ebitda)} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Lợi nhuận & Hiệu quả</div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      <Metric label="ROE" value={val(analysis.fundamental.data?.roe, 1, '%')} />
                      <Metric label="ROA" value={val(analysis.fundamental.data?.roa, 1, '%')} />
                      <Metric label="Biên LN ròng" value={val(analysis.fundamental.data?.net_profit_margin, 1, '%')} />
                      <Metric label="Biên gộp" value={val(analysis.fundamental.data?.gross_margin, 1, '%')} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Tăng trưởng</div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      <Metric label="DT tăng trưởng" value={val(analysis.fundamental.data?.revenue_growth, 1, '%')} green={analysis.fundamental.data?.revenue_growth && analysis.fundamental.data.revenue_growth > 0} />
                      <Metric label="LN tăng trưởng" value={val(analysis.fundamental.data?.net_profit_growth, 1, '%')} green={analysis.fundamental.data?.net_profit_growth && analysis.fundamental.data.net_profit_growth > 0} />
                      <Metric label="EPS" value={val(analysis.fundamental.data?.eps, 0)} />
                      <Metric label="Cổ tức" value={analysis.fundamental.data?.dividend ? val(analysis.fundamental.data.dividend, 0, ' VND') : 'N/A'} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Khả năng thanh toán & Đòn bẩy</div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      <Metric label="Current Ratio" value={val(analysis.fundamental.data?.current_ratio, 2)} />
                      <Metric label="Quick Ratio" value={val(analysis.fundamental.data?.quick_ratio, 2)} />
                      <Metric label="D/E" value={val(analysis.fundamental.data?.de, 2)} />
                      <Metric label="ICR" value={val(analysis.fundamental.data?.interest_coverage)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical */}
          {analysis?.technical && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Phân tích Kỹ thuật
                  <Badge variant="outline" className={getScoreColor(analysis.technical.score)}>
                    {analysis.technical.score}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Giá & Xu hướng</div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      <Metric label="Giá hiện tại" value={analysis.technical.data?.current_price?.toLocaleString() || 'N/A'} />
                      <Metric label="Xu hướng" value={analysis.technical.data?.trend || 'N/A'} green={analysis.technical.data?.trend === 'Uptrend'} />
                      <Metric label="Return ngày" value={val(analysis.technical.data?.daily_return, 2, '%')} green={analysis.technical.data?.daily_return > 0} />
                      <Metric label="Volatility 20d" value={val(analysis.technical.data?.volatility, 1, '%')} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Moving Averages</div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                      <Metric label="MA20" value={`${analysis.technical.data?.ma20?.toFixed(0) || 'N/A'} (${val(analysis.technical.data?.price_vs_ma20_pct, 1, '%')})`} green={analysis.technical.data?.price_vs_ma20_pct > 0} />
                      <Metric label="MA50" value={`${analysis.technical.data?.ma50?.toFixed(0) || 'N/A'} (${val(analysis.technical.data?.price_vs_ma50_pct, 1, '%')})`} green={analysis.technical.data?.price_vs_ma50_pct > 0} />
                      <Metric label="MA200" value={`${analysis.technical.data?.ma200?.toFixed(0) || 'N/A'} (${val(analysis.technical.data?.price_vs_ma200_pct, 1, '%')})`} green={analysis.technical.data?.price_vs_ma200_pct > 0} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Chỉ báo Momentum</div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      <Metric label="RSI (14)" value={val(analysis.technical.data?.rsi)} />
                      <Metric label="MACD" value={val(analysis.technical.data?.macd, 2)} green={analysis.technical.data?.macd > 0} />
                      <Metric label="MACD Signal" value={val(analysis.technical.data?.macd_signal, 2)} />
                      <Metric label="MACD Hist" value={val(analysis.technical.data?.macd_hist, 2)} green={analysis.technical.data?.macd_hist > 0} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Bollinger Bands & Volume</div>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      <Metric label="BB Upper" value={analysis.technical.data?.bb_upper?.toFixed(0) || 'N/A'} />
                      <Metric label="BB Lower" value={analysis.technical.data?.bb_lower?.toFixed(0) || 'N/A'} />
                      <Metric label="Volume Ratio" value={`${analysis.technical.data?.volume_ratio || 'N/A'}x`} />
                      <div className="grid grid-cols-2 gap-1">
                        <div className="p-2 rounded bg-green-500/10 text-center">
                          <div className="text-[10px] text-green-500">Hỗ trợ</div>
                          <div className="text-xs font-bold">{analysis.technical.data?.support?.toLocaleString()}</div>
                        </div>
                        <div className="p-2 rounded bg-red-500/10 text-center">
                          <div className="text-[10px] text-red-500">Kháng cự</div>
                          <div className="text-xs font-bold">{analysis.technical.data?.resistance?.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Macro */}
          {analysis?.macro && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-500" />
                  Phân tích Vĩ mô
                  <Badge variant="outline" className={getScoreColor(analysis.macro.score)}>
                    {analysis.macro.score}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                  <Metric label="VN-Index" value={analysis.macro.data?.vnindex_trend || 'N/A'} green={analysis.macro.data?.vnindex_trend === 'Uptrend'} />
                  <Metric label="VNI RSI" value={val(analysis.macro.data?.vnindex_rsi, 0)} />
                  <Metric label="Tăng / Giảm" value={`${analysis.macro.data?.market_advancing} / ${analysis.macro.data?.market_declining}`} />
                  <Metric label="Khối ngoại" value={analysis.macro.data?.foreign_net_value ? `${(analysis.macro.data.foreign_net_value / 1e9).toFixed(1)} tỷ` : 'N/A'} green={analysis.macro.data?.foreign_net_value > 0} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signals */}
          {analysis && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Tín hiệu phân tích</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...analysis.fundamental.signals, ...analysis.technical.signals, ...analysis.macro.signals].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {s.impact === 'positive' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500 shrink-0" />
                      ) : s.impact === 'negative' ? (
                        <ArrowDownRight className="w-4 h-4 text-red-500 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-yellow-500/20 shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {s.type === 'fundamental' ? 'CB' : s.type === 'technical' ? 'KT' : 'VM'}
                      </Badge>
                      <span className="font-medium">{s.signal}</span>
                      <span className="text-muted-foreground">{s.detail}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, green }: { label: string; value: string; green?: boolean | number | null }) {
  return (
    <div className="p-2 rounded bg-secondary/50">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold ${green === true ? 'text-green-500' : green === false ? 'text-red-500' : ''}`}>
        {value}
      </div>
    </div>
  );
}

export function StockAnalysis() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['all-recommendations'],
    queryFn: () => screenStocks('all', 8),
    staleTime: 5 * 60 * 1000,
  });

  const marketOverview = data?.market_overview;
  const strategies = data?.strategies as Record<string, StrategyResult> | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phân tích & Đề xuất</h1>
          <p className="text-muted-foreground">
            Đánh giá cổ phiếu dựa trên Cơ bản + Kỹ thuật + Vĩ mô
          </p>
        </div>
        <Button onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Đang cập nhật...' : 'Cập nhật'}
        </Button>
      </div>

      {/* Market + Macro Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowUpRight className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">CP tăng</div>
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
                <div className="text-sm text-muted-foreground">CP giảm</div>
                <div className="text-2xl font-bold text-red-500">{marketOverview?.num_losers || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Globe className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Tâm lý TT</div>
                <div className="text-lg font-bold">{data?.macro?.market_sentiment || '---'}</div>
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
                <div className="text-sm text-muted-foreground">Cập nhật</div>
                <div className="text-sm font-medium">
                  {data?.generated_at ? new Date(data.generated_at).toLocaleString('vi-VN') : '---'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Macro detail */}
      <MacroOverview macro={data?.macro} />

      {/* Strategy Tabs */}
      <Tabs defaultValue="investing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1">
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

      {selectedSymbol && (
        <StockDetailModal symbol={selectedSymbol} onClose={() => setSelectedSymbol(null)} />
      )}
    </div>
  );
}
