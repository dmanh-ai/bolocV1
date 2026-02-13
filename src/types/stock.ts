// Stock data types for VN Sniper

export interface Stock {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  pe?: number;
  pb?: number;
  roe?: number;
  roa?: number;
  eps?: number;
  marketCap?: number;
  sector?: string;
  industry?: string;
  volume?: number;
}

export interface StockPriceHistory {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockRatios {
  symbol: string;
  period: string;
  pe: number;
  pb: number;
  roe: number;
  roa: number;
  eps: number;
  marketCap: number;
}

export interface StockCompanyInfo {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  description?: string;
  website?: string;
  employees?: number;
  founded?: string;
}

export interface FilterState {
  peMin: number;
  peMax: number;
  pbMin: number;
  pbMax: number;
  roeMin: number;
  roeMax: number;
  marketCap: 'all' | 'small' | 'mid' | 'large';
  sector: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  addedAt: Date;
  price?: number;
  change?: number;
  pe?: number;
  pb?: number;
  roe?: number;
}

export type NavigationPage = 'dashboard' | 'screener' | 'watchlist' | 'market';

// Mock data for development
export const mockStocks: Stock[] = [
  { symbol: 'VIC', name: 'Vingroup JSC', price: 45600, change: 200, changePercent: 0.44, pe: 15.2, pb: 1.8, roe: 12.5, roa: 8.2, eps: 3000, marketCap: 120000, sector: 'Real Estate', volume: 5000000 },
  { symbol: 'VNM', name: 'Vinamilk', price: 70500, change: -500, changePercent: -0.71, pe: 18.5, pb: 2.1, roe: 15.8, roa: 10.2, eps: 3800, marketCap: 85000, sector: 'Consumer Goods', volume: 3200000 },
  { symbol: 'FPT', name: 'FPT Corporation', price: 128000, change: 1500, changePercent: 1.18, pe: 22.3, pb: 3.5, roe: 18.2, roa: 12.5, eps: 5700, marketCap: 65000, sector: 'Technology', volume: 2800000 },
  { symbol: 'VHM', name: 'Vinhomes JSC', price: 48700, change: 800, changePercent: 1.67, pe: 8.5, pb: 1.2, roe: 25.6, roa: 15.8, eps: 5720, marketCap: 180000, sector: 'Real Estate', volume: 6200000 },
  { symbol: 'HPG', name: 'Hoa Phat Group', price: 28500, change: -300, changePercent: -1.04, pe: 6.2, pb: 0.9, roe: 22.1, roa: 14.5, eps: 4600, marketCap: 95000, sector: 'Materials', volume: 12000000 },
  { symbol: 'MSN', name: 'Masan Group', price: 82000, change: 600, changePercent: 0.74, pe: 12.8, pb: 1.5, roe: 14.2, roa: 9.1, eps: 6400, marketCap: 72000, sector: 'Consumer Goods', volume: 1800000 },
  { symbol: 'TCB', name: 'Techcombank', price: 31500, change: 250, changePercent: 0.80, pe: 7.5, pb: 1.1, roe: 28.5, roa: 3.2, eps: 4200, marketCap: 88000, sector: 'Financials', volume: 8500000 },
  { symbol: 'MWG', name: 'Mobile World', price: 58500, change: -800, changePercent: -1.35, pe: 10.2, pb: 2.8, roe: 20.5, roa: 11.2, eps: 5735, marketCap: 55000, sector: 'Retail', volume: 4200000 },
  { symbol: 'GAS', name: 'PV Gas', price: 78500, change: 350, changePercent: 0.45, pe: 9.8, pb: 1.4, roe: 16.2, roa: 18.5, eps: 8010, marketCap: 48000, sector: 'Energy', volume: 1500000 },
  { symbol: 'BID', name: 'BIDV', price: 48200, change: 400, changePercent: 0.84, pe: 6.8, pb: 1.0, roe: 24.5, roa: 2.8, eps: 7088, marketCap: 125000, sector: 'Financials', volume: 9500000 },
  { symbol: 'PNJ', name: 'Phu Nhuan Jewelry', price: 92500, change: 1200, changePercent: 1.31, pe: 11.5, pb: 2.2, roe: 19.8, roa: 12.8, eps: 8043, marketCap: 32000, sector: 'Consumer Goods', volume: 980000 },
  { symbol: 'SAB', name: 'Sabeco', price: 56800, change: -400, changePercent: -0.70, pe: 14.2, pb: 1.8, roe: 12.5, roa: 8.8, eps: 4000, marketCap: 38000, sector: 'Consumer Goods', volume: 2100000 },
  { symbol: 'VCB', name: 'Vietcombank', price: 92500, change: 800, changePercent: 0.87, pe: 8.5, pb: 1.5, roe: 26.8, roa: 4.5, eps: 10882, marketCap: 180000, sector: 'Financials', volume: 3800000 },
  { symbol: 'HDB', name: 'HDBank', price: 24500, change: 150, changePercent: 0.62, pe: 5.8, pb: 0.8, roe: 22.5, roa: 2.5, eps: 4224, marketCap: 45000, sector: 'Financials', volume: 7200000 },
  { symbol: 'PLX', name: 'Petrolimex', price: 62500, change: -200, changePercent: -0.32, pe: 8.2, pb: 1.1, roe: 14.8, roa: 5.2, eps: 7622, marketCap: 42000, sector: 'Energy', volume: 1100000 },
];

export const mockPriceHistory: StockPriceHistory[] = [
  { date: '2024-01-02', open: 42000, high: 43500, low: 41500, close: 43200, volume: 4500000 },
  { date: '2024-01-03', open: 43200, high: 44100, low: 42800, close: 43800, volume: 3800000 },
  { date: '2024-01-04', open: 43800, high: 44200, low: 43000, close: 43100, volume: 4200000 },
  { date: '2024-01-05', open: 43100, high: 44500, low: 42800, close: 44200, volume: 5100000 },
  { date: '2024-01-08', open: 44200, high: 45800, low: 44000, close: 45500, volume: 6200000 },
  { date: '2024-01-09', open: 45500, high: 46200, low: 45000, close: 45800, volume: 4800000 },
  { date: '2024-01-10', open: 45800, high: 46500, low: 45500, close: 46200, volume: 3500000 },
  { date: '2024-01-11', open: 46200, high: 47000, low: 45800, close: 46800, volume: 4200000 },
  { date: '2024-01-12', open: 46800, high: 47500, low: 46200, close: 46400, volume: 3800000 },
  { date: '2024-01-15', open: 46400, high: 47200, low: 46000, close: 47000, volume: 4500000 },
  { date: '2024-01-16', open: 47000, high: 47800, low: 46800, close: 47500, volume: 5200000 },
  { date: '2024-01-17', open: 47500, high: 48200, low: 47000, close: 47800, volume: 4100000 },
  { date: '2024-01-18', open: 47800, high: 48000, low: 46500, close: 46800, volume: 5500000 },
  { date: '2024-01-19', open: 46800, high: 47500, low: 46000, close: 47200, volume: 4800000 },
  { date: '2024-01-22', open: 47200, high: 48000, low: 46800, close: 47800, volume: 3900000 },
];

export const sectors = [
  'All',
  'Financials',
  'Real Estate',
  'Consumer Goods',
  'Technology',
  'Materials',
  'Energy',
  'Retail',
  'Healthcare',
  'Industrial',
  'Utilities',
];
