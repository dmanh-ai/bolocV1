"use client";

import { StockAnalysis } from "@/components/StockAnalysis";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Sun, Moon, Crosshair } from "lucide-react";

export default function VNSniperPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Glass Header */}
      <header className="sticky top-0 z-30 h-14 glass-surface border-b-0">
        <div className="flex items-center justify-between h-full px-4 lg:px-6 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Crosshair className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl text-gradient-blue tracking-tight">
              VN Sniper
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl w-10 h-10 glass-inset hover:scale-105 transition-transform"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 max-w-[1400px] mx-auto">
        <StockAnalysis />
      </main>
    </div>
  );
}
