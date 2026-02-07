import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export interface KVEntry {
  key: string;
  value: string;
  enabled: boolean;
}

interface KeyValueEditorProps {
  entries: KVEntry[];
  onChange: (entries: KVEntry[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
}

export function KeyValueEditor({
  entries,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  disabled,
}: KeyValueEditorProps) {
  const update = useCallback(
    (index: number, field: keyof KVEntry, value: string | boolean) => {
      const next = entries.map((e, i) =>
        i === index ? { ...e, [field]: value } : e,
      );
      onChange(next);
    },
    [entries, onChange],
  );

  const remove = useCallback(
    (index: number) => {
      onChange(entries.filter((_, i) => i !== index));
    },
    [entries, onChange],
  );

  const add = useCallback(() => {
    onChange([...entries, { key: "", value: "", enabled: true }]);
  }, [entries, onChange]);

  const handleKeyInput = useCallback(
    (index: number, value: string) => {
      const next = entries.map((e, i) =>
        i === index ? { ...e, key: value } : e,
      );
      // Auto-add empty row when typing in the last row's key
      if (index === entries.length - 1 && value) {
        next.push({ key: "", value: "", enabled: true });
      }
      onChange(next);
    },
    [entries, onChange],
  );

  return (
    <div className="text-xs">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground font-medium border-b border-border/50">
        <span className="w-5" />
        <span className="flex-1">{keyPlaceholder}</span>
        <span className="flex-1">{valuePlaceholder}</span>
        <span className="w-7" />
      </div>

      {/* Rows */}
      {entries.map((entry, i) => (
        <div
          key={i}
          className="group flex items-center gap-2 px-2 py-1 hover:bg-muted/30 transition-colors"
        >
          <Checkbox
            checked={entry.enabled}
            onCheckedChange={(checked) => update(i, "enabled", !!checked)}
            className="size-3.5"
            disabled={disabled}
          />
          <input
            value={entry.key}
            onChange={(e) => handleKeyInput(i, e.target.value)}
            placeholder={keyPlaceholder}
            readOnly={disabled}
            className="flex-1 bg-transparent border-0 border-b border-transparent focus:border-border/50 font-mono text-xs px-1 py-0.5 outline-none placeholder:text-muted-foreground/40 transition-colors"
          />
          <input
            value={entry.value}
            onChange={(e) => update(i, "value", e.target.value)}
            placeholder={valuePlaceholder}
            readOnly={disabled}
            className="flex-1 bg-transparent border-0 border-b border-transparent focus:border-border/50 font-mono text-xs px-1 py-0.5 outline-none placeholder:text-muted-foreground/40 transition-colors"
          />
          {!disabled && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => remove(i)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      ))}

      {/* Add button */}
      {!disabled && (
        <button
          onClick={add}
          className="flex items-center gap-1 px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Plus className="size-3" />
          <span>Add</span>
        </button>
      )}
    </div>
  );
}
