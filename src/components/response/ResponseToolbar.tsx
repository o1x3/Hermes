import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Code, Braces, Search, X, Terminal } from "lucide-react";

interface ResponseToolbarProps {
  body: string;
  viewMode: "pretty" | "raw";
  onViewModeChange: (mode: "pretty" | "raw") => void;
  searchVisible: boolean;
  onSearchVisibleChange: (visible: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  matchCount?: number;
  onCopyAsCurl?: () => void;
}

export function ResponseToolbar({
  body,
  viewMode,
  onViewModeChange,
  searchVisible,
  onSearchVisibleChange,
  searchQuery,
  onSearchQueryChange,
  matchCount,
  onCopyAsCurl,
}: ResponseToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [body]);

  return (
    <div className="flex items-center gap-1">
      {searchVisible && (
        <div className="flex items-center gap-1 mr-1">
          <input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search..."
            autoFocus
            className="h-6 w-32 rounded border border-border bg-background px-2 font-mono text-xs outline-none focus:border-primary/50 transition-colors"
          />
          {searchQuery && matchCount !== undefined && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {matchCount} match{matchCount !== 1 ? "es" : ""}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              onSearchVisibleChange(false);
              onSearchQueryChange("");
            }}
          >
            <X className="size-3" />
          </Button>
        </div>
      )}

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onSearchVisibleChange(!searchVisible)}
        className={searchVisible ? "text-primary" : ""}
      >
        <Search className="size-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() =>
          onViewModeChange(viewMode === "pretty" ? "raw" : "pretty")
        }
        className={viewMode === "raw" ? "text-primary" : ""}
      >
        {viewMode === "pretty" ? (
          <Code className="size-3.5" />
        ) : (
          <Braces className="size-3.5" />
        )}
      </Button>

      {onCopyAsCurl && (
        <Button variant="ghost" size="icon-xs" onClick={onCopyAsCurl} title="Copy as cURL">
          <Terminal className="size-3.5" />
        </Button>
      )}

      <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
        {copied ? (
          <Check className="size-3.5 text-green-500" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
