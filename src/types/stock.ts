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
  marketCap: "all" | "small" | "mid" | "large";
  sector: string;
  searchQuery: string;
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

export type NavigationPage =
  | "screener"
  | "watchlist"
  | "market"
  | "analysis";

export const SECTORS = [
  "All",
  "Ngân hàng",
  "Bất động sản",
  "Chứng khoán",
  "Thép",
  "Dầu khí",
  "Bán lẻ",
  "Công nghệ",
  "Thực phẩm",
  "Xây dựng",
  "Điện",
  "Hóa chất",
  "Y tế",
  "Vận tải",
  "Bảo hiểm",
] as const;
