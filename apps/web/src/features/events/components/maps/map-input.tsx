import { useState, useRef, useEffect } from "react";
import { Input } from "@lootlog/ui/components/input";
import { useGameMaps, type GameMap } from "@/hooks/api/use-game-maps";
import { cn } from "@lootlog/ui/lib/utils";
import { MapPin, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MapInputProps {
  value: string;
  onChange: (value: string) => void;
  onMapSelect?: (map: GameMap) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const MapInput = ({
  value,
  onChange,
  onMapSelect,
  placeholder = "Nazwa mapy",
  className,
  onKeyDown,
}: MapInputProps) => {
  const { data: maps = [], isLoading } = useGameMaps();
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredMaps = value.trim()
    ? maps
        .filter((map) => map.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10)
    : [];
  const activeHighlightedIndex =
    highlightedIndex >= 0 && highlightedIndex < filteredMaps.length
      ? highlightedIndex
      : -1;

  const showDropdown =
    isFocused && value.trim().length > 0 && filteredMaps.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredMaps.length - 1 ? prev + 1 : filteredMaps.length - 1,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && activeHighlightedIndex >= 0) {
        e.preventDefault();
        const selectedMap = filteredMaps[activeHighlightedIndex];
        if (selectedMap) {
          onChange(selectedMap.name);
          onMapSelect?.(selectedMap);
        }
        setIsFocused(false);
        setHighlightedIndex(-1);
        return;
      } else if (e.key === "Escape") {
        setIsFocused(false);
        setHighlightedIndex(-1);
      }
    }
    onKeyDown?.(e);
  };

  const handleSelect = (map: GameMap) => {
    onChange(map.name);
    onMapSelect?.(map);
    setIsFocused(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setHighlightedIndex(-1);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
          >
            <ul className="max-h-48 overflow-y-auto py-1">
              {filteredMaps.map((map, index) => (
                <li key={map.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(map)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                      "hover:bg-accent transition-colors",
                      activeHighlightedIndex === index && "bg-accent",
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{map.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
