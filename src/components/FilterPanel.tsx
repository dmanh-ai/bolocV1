"use client";

import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, Filter } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { SECTORS } from "@/types/stock";

const PE_RANGE = { min: 0, max: 100, step: 1 } as const;
const PB_RANGE = { min: 0, max: 20, step: 0.1 } as const;
const ROE_RANGE = { min: 0, max: 50, step: 0.5 } as const;

export function FilterPanel() {
  const { filters, setFilter, resetFilters } = useAppStore();
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleSliderChange = (
    key: "peMin" | "peMax" | "pbMin" | "pbMax" | "roeMin" | "roeMax",
    value: number[]
  ) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value[0] }));
  };

  const handleSliderCommit = (
    key: "peMin" | "peMax" | "pbMin" | "pbMax" | "roeMin" | "roeMax",
    value: number[]
  ) => {
    setFilter(key, value[0]);
  };

  const handleSelectChange = (key: "marketCap" | "sector", value: string) => {
    if (key === "marketCap") {
      setFilter(key, value as "all" | "small" | "mid" | "large");
    } else {
      setFilter(key, value);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Bộ lọc
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
        <div className="space-y-3">
          <Label className="text-sm font-medium">P/E Ratio</Label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={localFilters.peMin}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, peMin: value }));
                setFilter("peMin", value);
              }}
              className="w-20 h-8"
              min={PE_RANGE.min}
            />
            <Slider
              value={[localFilters.peMin]}
              min={PE_RANGE.min}
              max={PE_RANGE.max}
              step={PE_RANGE.step}
              onValueChange={(value) => handleSliderChange("peMin", value)}
              onValueCommit={(value) => handleSliderCommit("peMin", value)}
              className="flex-1"
            />
            <Slider
              value={[localFilters.peMax]}
              min={PE_RANGE.min}
              max={PE_RANGE.max}
              step={PE_RANGE.step}
              onValueChange={(value) => handleSliderChange("peMax", value)}
              onValueCommit={(value) => handleSliderCommit("peMax", value)}
              className="flex-1"
            />
            <Input
              type="number"
              value={localFilters.peMax}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, peMax: value }));
                setFilter("peMax", value);
              }}
              className="w-20 h-8"
              min={PE_RANGE.min}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">P/B Ratio</Label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={localFilters.pbMin}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, pbMin: value }));
                setFilter("pbMin", value);
              }}
              className="w-20 h-8"
              min={PB_RANGE.min}
              step={PB_RANGE.step}
            />
            <Slider
              value={[localFilters.pbMin]}
              min={PB_RANGE.min}
              max={PB_RANGE.max}
              step={PB_RANGE.step}
              onValueChange={(value) => handleSliderChange("pbMin", value)}
              onValueCommit={(value) => handleSliderCommit("pbMin", value)}
              className="flex-1"
            />
            <Slider
              value={[localFilters.pbMax]}
              min={PB_RANGE.min}
              max={PB_RANGE.max}
              step={PB_RANGE.step}
              onValueChange={(value) => handleSliderChange("pbMax", value)}
              onValueCommit={(value) => handleSliderCommit("pbMax", value)}
              className="flex-1"
            />
            <Input
              type="number"
              value={localFilters.pbMax}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, pbMax: value }));
                setFilter("pbMax", value);
              }}
              className="w-20 h-8"
              min={PB_RANGE.min}
              step={PB_RANGE.step}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">ROE %</Label>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={localFilters.roeMin}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, roeMin: value }));
                setFilter("roeMin", value);
              }}
              className="w-20 h-8"
              min={ROE_RANGE.min}
            />
            <Slider
              value={[localFilters.roeMin]}
              min={ROE_RANGE.min}
              max={ROE_RANGE.max}
              step={ROE_RANGE.step}
              onValueChange={(value) => handleSliderChange("roeMin", value)}
              onValueCommit={(value) => handleSliderCommit("roeMin", value)}
              className="flex-1"
            />
            <Slider
              value={[localFilters.roeMax]}
              min={ROE_RANGE.min}
              max={ROE_RANGE.max}
              step={ROE_RANGE.step}
              onValueChange={(value) => handleSliderChange("roeMax", value)}
              onValueCommit={(value) => handleSliderCommit("roeMax", value)}
              className="flex-1"
            />
            <Input
              type="number"
              value={localFilters.roeMax}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalFilters((prev) => ({ ...prev, roeMax: value }));
                setFilter("roeMax", value);
              }}
              className="w-20 h-8"
              min={ROE_RANGE.min}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Vốn hóa</Label>
          <Select
            value={localFilters.marketCap}
            onValueChange={(value) => handleSelectChange("marketCap", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn vốn hóa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="small">Small Cap</SelectItem>
              <SelectItem value="mid">Mid Cap</SelectItem>
              <SelectItem value="large">Large Cap</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Ngành</Label>
          <Select
            value={localFilters.sector}
            onValueChange={(value) => handleSelectChange("sector", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn ngành" />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map((sector) => (
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
