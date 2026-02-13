import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WatchlistItem, FilterState, NavigationPage } from '@/types/stock';

interface WatchlistStore {
  items: WatchlistItem[];
  addToWatchlist: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      addToWatchlist: (item) => {
        const { items } = get();
        if (!items.some((i) => i.symbol === item.symbol)) {
          set({
            items: [...items, { ...item, addedAt: new Date() }],
          });
        }
      },
      removeFromWatchlist: (symbol) => {
        set({
          items: get().items.filter((i) => i.symbol !== symbol),
        });
      },
      isInWatchlist: (symbol) => {
        return get().items.some((i) => i.symbol === symbol);
      },
    }),
    {
      name: 'vn-sniper-watchlist',
    }
  )
);

interface FilterStore {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  peMin: 0,
  peMax: 100,
  pbMin: 0,
  pbMax: 20,
  roeMin: 0,
  roeMax: 50,
  marketCap: 'all',
  sector: 'All',
};

export const useFilterStore = create<FilterStore>()((set) => ({
  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
}));

interface UIStore {
  currentPage: NavigationPage;
  setCurrentPage: (page: NavigationPage) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedStock: string | null;
  setSelectedStock: (symbol: string | null) => void;
  detailModalOpen: boolean;
  setDetailModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedStock: null,
  setSelectedStock: (symbol) => set({ selectedStock: symbol }),
  detailModalOpen: false,
  setDetailModalOpen: (open) => set({ detailModalOpen: open }),
}));
