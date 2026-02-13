"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { StockScreener } from "@/components/StockScreener";
import { Watchlist } from "@/components/Watchlist";
import { MarketOverview } from "@/components/MarketOverview";
import { StockAnalysis } from "@/components/StockAnalysis";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

function MainContent() {
  const { activeTab, sidebarOpen } = useAppStore();

  return (
    <div
      className={cn(
        "min-h-screen bg-background transition-all duration-300",
        sidebarOpen ? "lg:pl-64" : "lg:pl-16"
      )}
    >
      <Header />

      <main className="p-4 lg:p-6">
        {activeTab === "market" && <MarketOverview />}
        {activeTab === "analysis" && <StockAnalysis />}
        {activeTab === "screener" && <StockScreener />}
        {activeTab === "watchlist" && <Watchlist />}
      </main>
    </div>
  );
}

export default function VNSniperPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MainContent />
    </div>
  );
}
