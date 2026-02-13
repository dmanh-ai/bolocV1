import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  peMin: number;
  peMax: number;
  pbMin: number;
  pbMax: number;
  roeMin: number;
  roeMax: number;
  marketCap: 'all' | 'small' | 'mid' | 'large';
  sector: string;
  searchQuery: string;
}

interface AppState {
  // Navigation
  activeTab: 'dashboard' | 'screener' | 'watchlist' | 'market' | 'analysis';
  setActiveTab: (tab: 'dashboard' | 'screener' | 'watchlist' | 'market' | 'analysis') => void;
  
  // Watchlist
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  
  // Filters
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  
  // Selected Stock
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;
  
  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const defaultFilters: FilterState = {
  peMin: 0,
  peMax: 100,
  pbMin: 0,
  pbMax: 20,
  roeMin: 0,
  roeMax: 100,
  marketCap: 'all',
  sector: 'all',
  searchQuery: '',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Watchlist
      watchlist: [],
      addToWatchlist: (stock) => {
        const { watchlist } = get();
        if (!watchlist.find(s => s.symbol === stock.symbol)) {
          set({ watchlist: [...watchlist, stock] });
        }
      },
      removeFromWatchlist: (symbol) => {
        set({ watchlist: get().watchlist.filter(s => s.symbol !== symbol) });
      },
      isInWatchlist: (symbol) => {
        return get().watchlist.some(s => s.symbol === symbol);
      },
      
      // Filters
      filters: defaultFilters,
      setFilters: (newFilters) => {
        set({ filters: { ...get().filters, ...newFilters } });
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
      name: 'vn-sniper-storage',
      partialize: (state) => ({
        watchlist: state.watchlist,
        filters: state.filters,
      }),
    }
  )
);
