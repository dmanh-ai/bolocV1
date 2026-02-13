import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NavigationPage } from "@/types/stock";

export interface Stock {
  symbol: string;
  name: string;
  price?: number;
  pe?: number;
  pb?: number;
  roe?: number;
  roa?: number;
  eps?: number;
  marketCap?: number;
}

export interface FilterState {
  searchQuery: string;
  exchange: string;
  sector: string;
  // Valuation
  peMin: number;
  peMax: number;
  pbMin: number;
  pbMax: number;
  // Profitability
  roeMin: number;
  roeMax: number;
  roaMin: number;
  roaMax: number;
  netMarginMin: number;
  netMarginMax: number;
  grossMarginMin: number;
  grossMarginMax: number;
  // Growth
  revenueGrowthMin: number;
  revenueGrowthMax: number;
  netProfitGrowthMin: number;
  netProfitGrowthMax: number;
  // Solvency
  currentRatioMin: number;
  deMax: number;
  // Technical
  rsiMin: number;
  rsiMax: number;
  // Size
  marketCap: "all" | "small" | "mid" | "large";
}

interface AppState {
  // Navigation
  activeTab: NavigationPage;
  setActiveTab: (tab: NavigationPage) => void;

  // Watchlist
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;

  // Filters
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;

  // Selected Stock
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const defaultFilters: FilterState = {
  searchQuery: "",
  exchange: "all",
  sector: "All",
  peMin: 0,
  peMax: 100,
  pbMin: 0,
  pbMax: 20,
  roeMin: 0,
  roeMax: 100,
  roaMin: 0,
  roaMax: 50,
  netMarginMin: -50,
  netMarginMax: 100,
  grossMarginMin: 0,
  grossMarginMax: 100,
  revenueGrowthMin: -100,
  revenueGrowthMax: 500,
  netProfitGrowthMin: -100,
  netProfitGrowthMax: 500,
  currentRatioMin: 0,
  deMax: 10,
  rsiMin: 0,
  rsiMax: 100,
  marketCap: "all",
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      activeTab: "market",
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Watchlist
      watchlist: [],
      addToWatchlist: (stock) => {
        const { watchlist } = get();
        if (!watchlist.find((s) => s.symbol === stock.symbol)) {
          set({ watchlist: [...watchlist, stock] });
        }
      },
      removeFromWatchlist: (symbol) => {
        set({
          watchlist: get().watchlist.filter((s) => s.symbol !== symbol),
        });
      },
      isInWatchlist: (symbol) => {
        return get().watchlist.some((s) => s.symbol === symbol);
      },

      // Filters
      filters: defaultFilters,
      setFilters: (newFilters) => {
        set({ filters: { ...get().filters, ...newFilters } });
      },
      setFilter: (key, value) => {
        set({ filters: { ...get().filters, [key]: value } });
      },
      resetFilters: () => set({ filters: defaultFilters }),

      // Selected Stock
      selectedStock: null,
      setSelectedStock: (stock) => set({ selectedStock: stock }),

      // UI
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "vn-sniper-storage",
      partialize: (state) => ({
        watchlist: state.watchlist,
        filters: state.filters,
      }),
    }
  )
);
