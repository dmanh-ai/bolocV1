'use client';

import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { Dashboard } from '@/components/Dashboard';
import { StockScreener } from '@/components/StockScreener';
import { Watchlist } from '@/components/Watchlist';
import { MarketOverview } from '@/components/MarketOverview';
import { StockAnalysis } from '@/components/StockAnalysis';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Main Content Component
function MainContent() {
  const { activeTab, sidebarOpen } = useAppStore();

  return (
    <div 
      className={cn(
        'min-h-screen bg-background transition-all duration-300',
        sidebarOpen ? 'lg:pl-64' : 'lg:pl-16'
      )}
    >
      <Header />
      
      <main className="p-4 lg:p-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'analysis' && <StockAnalysis />}
        {activeTab === 'screener' && <StockScreener />}
        {activeTab === 'watchlist' && <Watchlist />}
        {activeTab === 'market' && <MarketOverview />}
      </main>
    </div>
  );
}

// App Component with Providers
function AppWithProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MainContent />
      </div>
    </QueryClientProvider>
  );
}

// Main Page Export
export default function VNSniperPage() {
  return <AppWithProviders />;
}
