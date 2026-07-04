'use client';

import { useState } from 'react';
import { ACTIVITY_TYPES, SKILL_LEVELS, type MapFilters } from '@/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const RADIUS_OPTIONS = [
  { value: '1', label: '1 km' },
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
  { value: '50', label: '50 km' },
] as const;

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
}

const DEFAULT_FILTERS: MapFilters = {
  activity_types: [],
  skill_level: undefined,
  free_only: false,
  radius_km: 10,
};

export function FilterPanel({ open, onOpenChange, filters, onChange }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<MapFilters>(filters);

  // Sync when panel opens
  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setLocalFilters(filters);
    }
    onOpenChange(isOpen);
  }

  function toggleActivityType(value: string) {
    setLocalFilters((prev) => {
      const types = prev.activity_types.includes(value)
        ? prev.activity_types.filter((t) => t !== value)
        : [...prev.activity_types, value];
      return { ...prev, activity_types: types };
    });
  }

  function handleApply() {
    onChange(localFilters);
    onOpenChange(false);
  }

  function handleClear() {
    setLocalFilters(DEFAULT_FILTERS);
    onChange(DEFAULT_FILTERS);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="overflow-y-auto p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-6">
          {/* Activity Types */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Activity Types</label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_TYPES.map((type) => {
                const isSelected = localFilters.activity_types.includes(type.value);
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => toggleActivityType(type.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    <span>{type.icon}</span>
                    <span className="truncate">{type.value}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skill Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Skill Level</label>
            <Select
              value={localFilters.skill_level ?? 'any'}
              onValueChange={(val: string | null) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  skill_level: !val || val === 'any' ? undefined : val,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any level" />
              </SelectTrigger>
              <SelectContent>
                {SKILL_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Free Only */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Free Only</label>
              <p className="text-xs text-muted-foreground">Show only free events</p>
            </div>
            <Switch
              checked={localFilters.free_only}
              onCheckedChange={(checked) =>
                setLocalFilters((prev) => ({ ...prev, free_only: !!checked }))
              }
            />
          </div>

          {/* Distance Radius */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Distance</label>
            <Select
              value={String(localFilters.radius_km)}
              onValueChange={(val) =>
                setLocalFilters((prev) => ({ ...prev, radius_km: Number(val) }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select distance" />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="border-t gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear All
          </Button>
          <SheetClose render={<Button className="flex-1" onClick={handleApply} />}>
            Apply
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function getActiveFilterCount(filters: MapFilters): number {
  let count = 0;
  if (filters.activity_types.length > 0) count++;
  if (filters.skill_level) count++;
  if (filters.free_only) count++;
  if (filters.radius_km !== 10) count++;
  return count;
}
