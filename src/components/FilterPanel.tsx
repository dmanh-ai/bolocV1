'use client';

import { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Filter } from 'lucide-react';
import { useFilterStore } from '@/stores';
import { sectors } from '@/types/stock';

export function FilterPanel() {
  const { filters, setFilter, resetFilters } = useFilterStore();
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleSliderChange = (
    key: 'peMin' | 'peMax' | 'pbMin' | 'pbMax' | 'roeMin' | 'roeMax',
    value: number[]
  ) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value[0] }));
  };

  const handleSliderCommit = (
    key: 'peMin' | 'peMax' | 'pbMin' | 'pbMax' | 'roeMin' | 'roeMax',
    value: number[]
  ) => {
    setFilter(key, value[0]);
  };

  const handleSelectChange = (
    key: 'marketCap' | 'sector',
    value: string
  ) => {
    if (key === 'marketCap') {
      setFilter(key, value as 'all' | 'small' | 'mid' | 'large');
    } else {
      setFilter(key, value);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* P/E Ratio */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">P/E Ratio</Label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={localFilters.peMin}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, peMin: value }));
                setFilter('peMin', value);
              }}
              className="w-20 h-8"
              min={0}
            />
            <Slider
              value={[localFilters.peMin]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => handleSliderChange('peMin', value)}
              onValueCommit={(value) => handleSliderCommit('peMin', value)}
              className="flex-1"
            />
            <Slider
              value={[localFilters.peMax]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => handleSliderChange('peMax', value)}
              onValueCommit={(value) => handleSliderCommit('peMax', value)}
              className="flex-1"
            />
            <Input
              type="number"
              value={localFilters.peMax}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, peMax: value }));
                setFilter('peMax', value);
              }}
              className="w-20 h-8"
              min={0}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: {localFilters.peMin}</span>
            <span>Max: {localFilters.peMax}</span>
          </div>
        </div>

        {/* P/B Ratio */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">P/B Ratio</Label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={localFilters.pbMin}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, pbMin: value }));
                setFilter('pbMin', value);
              }}
              className="w-20 h-8"
              min={0}
              step={0.1}
            />
            <Slider
              value={[localFilters.pbMin]}
              min={0}
              max={20}
              step={0.1}
              onValueChange={(value) => handleSliderChange('pbMin', value)}
              onValueCommit={(value) => handleSliderCommit('pbMin', value)}
              className="flex-1"
            />
            <Slider
              value={[localFilters.pbMax]}
              min={0}
              max={20}
              step={0.1}
              onValueChange={(value) => handleSliderChange('pbMax', value)}
              onValueCommit={(value) => handleSliderCommit('pbMax', value)}
              className="flex-1"
            />
            <Input
              type="number"
              value={localFilters.pbMax}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, pbMax: value }));
                setFilter('pbMax', value);
              }}
              className="w-20 h-8"
              min={0}
              step={0.1}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: {localFilters.pbMin}</span>
            <span>Max: {localFilters.pbMax}</span>
          </div>
        </div>

        {/* ROE */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">ROE %</Label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={localFilters.roeMin}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, roeMin: value }));
                setFilter('roeMin', value);
              }}
              className="w-20 h-8"
              min={0}
            />
            <Slider
              value={[localFilters.roeMin]}
              min={0}
              max={50}
              step={0.5}
              onValueChange={(value) => handleSliderChange('roeMin', value)}
              onValueCommit={(value) => handleSliderCommit('roeMin', value)}
              className="flex-1"
            />
            <Slider
              value={[localFilters.roeMax]}
              min={0}
              max={50}
              step={0.5}
              onValueChange={(value) => handleSliderChange('roeMax', value)}
              onValueCommit={(value) => handleSliderCommit('roeMax', value)}
              className="flex-1"
            />
            <Input
              type="number"
              value={localFilters.roeMax}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, roeMax: value }));
                setFilter('roeMax', value);
              }}
              className="w-20 h-8"
              min={0}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: {localFilters.roeMin}%</span>
            <span>Max: {localFilters.roeMax}%</span>
          </div>
        </div>

        {/* Market Cap */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Market Cap</Label>
          <Select
            value={localFilters.marketCap}
            onValueChange={(value) => handleSelectChange('marketCap', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select market cap" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cap</SelectItem>
              <SelectItem value="small">Small Cap (&lt;50B VND)</SelectItem>
              <SelectItem value="mid">Mid Cap (50B-100B VND)</SelectItem>
              <SelectItem value="large">Large Cap (&gt;100B VND)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sector */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sector</Label>
          <Select
            value={localFilters.sector}
            onValueChange={(value) => handleSelectChange('sector', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sector" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
