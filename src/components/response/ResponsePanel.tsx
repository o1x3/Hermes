import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { HeadersViewer } from "./HeadersViewer";
import { ResponseToolbar } from "./ResponseToolbar";
import { JsonViewer } from "./JsonViewer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  onCopyAsCurl,
}: {
  response: HttpResponse | null;
  loading: boolean;
  error: string | null;
  onCopyAsCurl?: () => void;
}) {
  const [viewMode, setViewMode] = useState<"pretty" | "raw">("pretty");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);

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

  const headerCount = Object.keys(response.headers).length;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${response.status}-${response.time_ms}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="flex h-full flex-col"
      >
        <Tabs defaultValue="body" className="flex h-full flex-col gap-0">
          {/* Status bar + tabs + toolbar */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-1.5 shrink-0">
            <StatusBadge
              status={response.status}
              statusText={response.status_text}
            />
            <TabsList
              variant="line"
              className="border-0 bg-transparent"
            >
              <TabsTrigger value="body" className="text-xs">
                Body
              </TabsTrigger>
              <TabsTrigger value="headers" className="text-xs gap-1">
                Headers
                {headerCount > 0 && (
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    ({headerCount})
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="ml-auto flex items-center gap-2">
              <ResponseToolbar
                body={response.body}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                searchVisible={searchVisible}
                onSearchVisibleChange={setSearchVisible}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                matchCount={matchCount}
                onCopyAsCurl={onCopyAsCurl}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatSize(response.size_bytes)} · {response.time_ms}ms
              </span>
            </div>
          </div>

          {/* Body tab */}
          <TabsContent value="body" className="flex-1 min-h-0">
            {viewMode === "pretty" ? (
              <ScrollArea className="h-full">
                <div className="p-4">
                  <JsonViewer
                    data={response.body}
                    searchQuery={searchQuery}
                    onMatchCount={setMatchCount}
                  />
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="h-full">
                <pre className="p-4 font-mono text-xs text-foreground whitespace-pre-wrap break-all">
                  {response.body}
                </pre>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Headers tab */}
          <TabsContent value="headers" className="flex-1 min-h-0">
            <HeadersViewer headers={response.headers} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </AnimatePresence>
  );
}
