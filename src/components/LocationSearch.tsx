'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface LocationSearchProps {
  value: string;
  onSelect: (name: string, lat: number, lng: number) => void;
  placeholder?: string;
}

export function LocationSearch({ value, onSelect, placeholder }: LocationSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=0`
      );
      const data: LocationResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);

    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  }

  function handleSelect(result: LocationResult) {
    const shortName = result.display_name.split(',').slice(0, 3).join(',').trim();
    setQuery(shortName);
    setOpen(false);
    setResults([]);
    onSelect(shortName, parseFloat(result.lat), parseFloat(result.lon));
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect('', 0, 0);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "Search location..."}
          className="pl-9 pr-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-background shadow-lg max-h-48 overflow-y-auto">
          {results.map((result, i) => (
            <button
              key={`${result.lat}-${result.lon}-${i}`}
              type="button"
              onClick={() => handleSelect(result)}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-start gap-2',
                i !== results.length - 1 && 'border-b'
              )}
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{result.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
