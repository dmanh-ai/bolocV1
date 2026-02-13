'use client';

import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import {
  Search,
  Sun,
  Moon,
  Bell,
  Menu,
  Star,
} from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { watchlist, setActiveTab, sidebarOpen, setSidebarOpen } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab('screener');
      // Trigger search in screener
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Mobile menu & Search */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <form onSubmit={handleSearch} className="hidden sm:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã cổ phiếu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 lg:w-80 bg-secondary/50"
              />
            </div>
          </form>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Watchlist Badge */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setActiveTab('watchlist')}
          >
            <Star className="w-4 h-4" />
            <span className="hidden sm:inline">Watchlist</span>
            {watchlist.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs">
                {watchlist.length}
              </Badge>
            )}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="w-5 h-5" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
