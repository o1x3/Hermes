import { motion, AnimatePresence } from "motion/react";
import { ArrowUp } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HttpResponse } from "@/types/request";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LoadingShimmer() {
  return (
    <div className="flex h-full flex-col gap-3 p-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-4 rounded bg-muted"
          style={{ width: `${60 + Math.random() * 30}%` }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08 }}
        />
      ))}
    </div>
  );
}

export function ResponsePanel({
  response,
  loading,
  error,
  children,
}: {
  response: HttpResponse | null;
  loading: boolean;
  error: string | null;
  children?: React.ReactNode;
}) {
  if (loading) {
    return <LoadingShimmer />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-destructive font-medium text-sm">Request failed</p>
          <p className="text-muted-foreground text-xs mt-1 max-w-md">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground/50">
        <ArrowUp className="h-8 w-8" />
        <p className="text-sm">Send a request to see the response</p>
        <p className="text-xs">⌘ Enter</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${response.status}-${response.time_ms}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="flex h-full flex-col"
      >
        {/* Status + metadata bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <StatusBadge
            status={response.status}
            statusText={response.status_text}
          />
          <span className="text-xs text-muted-foreground">
            {formatSize(response.size_bytes)} · {response.time_ms}ms
          </span>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="p-4">{children}</div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
