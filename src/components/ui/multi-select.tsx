import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OptionItem = { _id: string; trackName?: string; name?: string; slug?: string; trackCode?: string; category?: string; description?: string };

type MultiSelectProps = {
  values: string[];
  options: OptionItem[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
};

export function MultiSelect({ values, options, onChange, placeholder = "Select items...", searchPlaceholder = "Search...", emptyText = "No options available", disabled = false }: MultiSelectProps) {
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return options;
    return options.filter((option) => {
      const label = `${option.trackName || option.name || option.slug || option.trackCode || ""} ${option.category || ""} ${option.description || ""}`.toLowerCase();
      return label.includes(text);
    });
  }, [options, query]);

  const toggle = (id: string) => {
    if (disabled) return;
    if (values.includes(id)) {
      onChange(values.filter((value) => value !== id));
    } else {
      onChange([...values, id]);
    }
  };

  return (
    <div className={cn("space-y-2 rounded-lg border border-input bg-background p-3", disabled && "opacity-60")}> 
      <div className="min-h-[2.5rem] flex flex-wrap items-center gap-2">
        {values.length ? values.map((value) => {
          const option = options.find((item) => String(item._id) === String(value));
          return (
            <Badge key={value} variant="secondary" className="inline-flex items-center gap-1 px-2 py-1">
              <span>{option?.trackName || option?.name || option?.slug || value}</span>
              <button type="button" onClick={() => toggle(value)} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          );
        }) : <span className="text-sm text-muted-foreground">{placeholder}</span>}
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        disabled={disabled}
      />
      <div className="max-h-56 overflow-y-auto rounded-md border border-muted bg-muted/10 p-2">
        {filteredOptions.length ? (
          <div className="grid gap-2">
            {filteredOptions.map((option) => {
              const id = option._id;
              const label = option.trackName || option.name || option.slug || option.trackCode || id;
              return (
                <label key={id} className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent p-2 text-sm transition hover:border-border hover:bg-muted">
                  <Checkbox checked={values.includes(id)} onCheckedChange={() => toggle(id)} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{label}</div>
                    {option.description ? <div className="text-xs text-muted-foreground line-clamp-2">{option.description}</div> : null}
                  </div>
                  {values.includes(id) ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                </label>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-muted px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
        )}
      </div>
    </div>
  );
}
