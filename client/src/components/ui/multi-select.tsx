import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

interface MultiSelectOption {
  id: number;
  name: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: number[];
  onChange: (selected: number[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  emptyMessage = "No options available",
  emptyAction,
  className
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedOptions = options.filter(option => selected.includes(option.id));

  const handleToggle = (optionId: number) => {
    const newSelected = selected.includes(optionId)
      ? selected.filter(id => id !== optionId)
      : [...selected, optionId];
    onChange(newSelected);
  };

  const handleRemove = (optionId: number) => {
    onChange(selected.filter(id => id !== optionId));
  };

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[2.5rem] p-2"
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedOptions.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedOptions.map(option => (
                  <Badge
                    key={option.id}
                    variant="secondary"
                    className="text-xs"
                  >
                    {option.name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(option.id);
                      }}
                      className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search options..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandEmpty>
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {emptyMessage}
                </p>
                {emptyAction}
              </div>
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {filteredOptions.map(option => (
                <CommandItem
                  key={option.id}
                  onSelect={() => handleToggle(option.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selected.includes(option.id) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}