import { useEffect, useState, useRef } from "react";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Sparkles } from "lucide-react";
import { getNameSuggestions, NameSuggestion, formatCategoryLabel } from "@/lib/itemAiAssist";
import { cn } from "@/lib/utils";

interface AiNameCompletionProps {
  inputValue: string;
  onSelect: (name: string, category?: string, subcategory?: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export const AiNameCompletion = ({
  inputValue,
  onSelect,
  inputRef,
}: AiNameCompletionProps) => {
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputValue.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const results = getNameSuggestions(inputValue, 4);
    setSuggestions(results);
    setIsOpen(results.length > 0);
    setSelectedIndex(0);
  }, [inputValue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
          if (isOpen && suggestions[selectedIndex]) {
            e.preventDefault();
            const selected = suggestions[selectedIndex];
            onSelect(selected.name, selected.category, selected.subcategory);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    const input = inputRef.current;
    input?.addEventListener('keydown', handleKeyDown);
    return () => input?.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suggestions, selectedIndex, onSelect, inputRef]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute top-full left-0 right-0 z-50 mt-1"
    >
      <Command className="rounded-lg border shadow-md bg-popover">
        <CommandList>
          <CommandGroup 
            heading={
              <div className="flex items-center gap-1.5 text-xs">
                <Sparkles className="h-3 w-3 text-primary" />
                Suggestions
              </div>
            }
          >
            {suggestions.map((suggestion, index) => (
              <CommandItem
                key={suggestion.name}
                value={suggestion.name}
                onSelect={() => {
                  onSelect(suggestion.name, suggestion.category, suggestion.subcategory);
                  setIsOpen(false);
                }}
                className={cn(
                  "cursor-pointer h-11",
                  index === selectedIndex && "bg-accent"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{suggestion.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCategoryLabel(suggestion.category)}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};
