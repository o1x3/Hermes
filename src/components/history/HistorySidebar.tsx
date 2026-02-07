import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistoryStore } from "@/stores/historyStore";
import { MethodBadge } from "@/components/request/MethodBadge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Search, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoryEntry } from "@/types/history";
import type { HttpMethod } from "@/types/request";

interface HistorySidebarProps {
  onOpenEntry: (entry: HistoryEntry) => void;
}

const METHOD_FILTERS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE"];

type StatusFilter = "2xx" | "3xx" | "4xx" | "5xx";
const STATUS_FILTERS: { label: StatusFilter; min: number; max: number }[] = [
  { label: "2xx", min: 200, max: 299 },
  { label: "3xx", min: 300, max: 399 },
  { label: "4xx", min: 400, max: 499 },
  { label: "5xx", min: 500, max: 599 },
];

function groupByDate(entries: HistoryEntry[]): Map<string, HistoryEntry[]> {
  const groups = new Map<string, HistoryEntry[]>();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  for (const entry of entries) {
    const entryDate = new Date(entry.timestamp + "Z");
    let label: string;

    if (entryDate >= today) {
      label = "Today";
    } else if (entryDate >= yesterday) {
      label = "Yesterday";
    } else if (entryDate >= weekAgo) {
      label = "Last 7 Days";
    } else {
      label = "Older";
    }

    const group = groups.get(label);
    if (group) {
      group.push(entry);
    } else {
      groups.set(label, [entry]);
    }
  }

  return groups;
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;
    return path.length > 40 ? path.slice(0, 37) + "..." : path;
  } catch {
    return url.length > 40 ? url.slice(0, 37) + "..." : url;
  }
}

function HistoryItem({
  entry,
  onOpen,
  onDelete,
}: {
  entry: HistoryEntry;
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}) {
  const hasError = !!entry.error;
  const time = entry.responseTimeMs != null ? `${entry.responseTimeMs}ms` : null;

  return (
    <button
      onClick={() => onOpen(entry)}
      className="group w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 flex items-center gap-1.5 text-xs transition-colors"
    >
      <MethodBadge
        method={entry.method}
        className="text-[9px] px-1.5 py-0 shrink-0"
      />
      <span className="flex-1 truncate font-mono text-muted-foreground">
        {truncateUrl(entry.url)}
      </span>
      <span className="shrink-0 flex items-center gap-1">
        {hasError ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="size-3 text-destructive" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[200px] text-xs">
              {entry.error}
            </TooltipContent>
          </Tooltip>
        ) : entry.responseStatus ? (
          <span
            className={cn(
              "text-[10px] font-mono",
              entry.responseStatus < 300
                ? "text-status-success"
                : entry.responseStatus < 400
                  ? "text-status-redirect"
                  : entry.responseStatus < 500
                    ? "text-status-client-error"
                    : "text-status-server-error",
            )}
          >
            {entry.responseStatus}
          </span>
        ) : null}
        {time && (
          <span className="text-[10px] text-muted-foreground/60">{time}</span>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          className="opacity-0 group-hover:opacity-100 size-5 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(entry.id);
          }}
        >
          <Trash2 className="size-3" />
        </Button>
      </span>
    </button>
  );
}

export function HistorySidebar({ onOpenEntry }: HistorySidebarProps) {
  const entries = useHistoryStore((s) => s.entries);
  const hasMore = useHistoryStore((s) => s.hasMore);
  const loading = useHistoryStore((s) => s.loading);
  const search = useHistoryStore((s) => s.search);
  const loadMore = useHistoryStore((s) => s.loadMore);
  const deleteEntry = useHistoryStore((s) => s.deleteEntry);

  const [queryInput, setQueryInput] = useState("");
  const [activeMethod, setActiveMethod] = useState<HttpMethod | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusFilter | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const applyFilters = useCallback(
    (query: string, method: HttpMethod | null, status: StatusFilter | null) => {
      const statusDef = status
        ? STATUS_FILTERS.find((s) => s.label === status)
        : undefined;
      search({
        query: query || undefined,
        method: method ?? undefined,
        statusMin: statusDef?.min,
        statusMax: statusDef?.max,
      });
    },
    [search],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQueryInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        applyFilters(value, activeMethod, activeStatus);
      }, 300);
    },
    [applyFilters, activeMethod, activeStatus],
  );

  const handleMethodToggle = useCallback(
    (method: HttpMethod) => {
      const next = activeMethod === method ? null : method;
      setActiveMethod(next);
      applyFilters(queryInput, next, activeStatus);
    },
    [activeMethod, activeStatus, queryInput, applyFilters],
  );

  const handleStatusToggle = useCallback(
    (status: StatusFilter) => {
      const next = activeStatus === status ? null : status;
      setActiveStatus(next);
      applyFilters(queryInput, activeMethod, next);
    },
    [activeStatus, activeMethod, queryInput, applyFilters],
  );

  const clearFilters = useCallback(() => {
    setQueryInput("");
    setActiveMethod(null);
    setActiveStatus(null);
    search({});
  }, [search]);

  const hasFilters = queryInput || activeMethod || activeStatus;

  const groups = useMemo(() => groupByDate(entries), [entries]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (entries.length === 0 && !hasFilters && !loading) {
    return (
      <p className="text-[11px] text-muted-foreground/40 py-6 text-center">
        No history yet
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Search */}
      <div className="relative px-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        <Input
          value={queryInput}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search URLs..."
          className="h-7 text-xs pl-7 pr-7"
        />
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1 flex-wrap px-1">
        {METHOD_FILTERS.map((method) => (
          <Badge
            key={method}
            variant={activeMethod === method ? "default" : "outline"}
            className="cursor-pointer text-[9px] px-1.5 py-0 h-4"
            onClick={() => handleMethodToggle(method)}
          >
            {method}
          </Badge>
        ))}
        {STATUS_FILTERS.map(({ label }) => (
          <Badge
            key={label}
            variant={activeStatus === label ? "default" : "outline"}
            className="cursor-pointer text-[9px] px-1.5 py-0 h-4"
            onClick={() => handleStatusToggle(label)}
          >
            {label}
          </Badge>
        ))}
      </div>

      {/* Entries grouped by date */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 px-1">
          {Array.from(groups.entries()).map(([label, groupEntries]) => (
            <div key={label}>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-2 py-1">
                {label}
              </p>
              <div className="space-y-0.5">
                {groupEntries.map((entry) => (
                  <HistoryItem
                    key={entry.id}
                    entry={entry}
                    onOpen={onOpenEntry}
                    onDelete={deleteEntry}
                  />
                ))}
              </div>
            </div>
          ))}

          {entries.length === 0 && hasFilters && (
            <p className="text-[11px] text-muted-foreground/40 py-6 text-center">
              No matching entries
            </p>
          )}

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load more"}
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
