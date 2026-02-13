"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { NavigationPage } from "@/types/stock";
import {
  Search,
  Star,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Target,
} from "lucide-react";

const navItems: { id: NavigationPage; label: string; icon: typeof Search }[] = [
  { id: "market", label: "Thị trường", icon: TrendingUp },
  { id: "analysis", label: "Phân tích & Chiến lược", icon: Target },
  { id: "screener", label: "Bộ lọc cổ phiếu", icon: Search },
  { id: "watchlist", label: "Watchlist", icon: Star },
];

export function Sidebar() {
  const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen } =
    useAppStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-lg bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              VN Sniper
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                !sidebarOpen && "justify-center px-0",
                isActive &&
                  "bg-green-500/10 text-green-500 hover:bg-green-500/20"
              )}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon
                className={cn("w-5 h-5", isActive && "text-green-500")}
              />
              {sidebarOpen && <span>{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      <Separator />

      <div className="p-3">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3",
            !sidebarOpen && "justify-center px-0"
          )}
        >
          <Settings className="w-5 h-5" />
          {sidebarOpen && <span>Cài đặt</span>}
        </Button>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border shadow-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </Button>
    </aside>
  );
}
