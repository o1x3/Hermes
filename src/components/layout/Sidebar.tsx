import { ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export function Sidebar({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-bold text-foreground text-sm tracking-wide">
          Hermes
        </span>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Collections section */}
          <SectionLabel>Collections</SectionLabel>
          <EmptyState>No collections yet</EmptyState>

          <div className="my-3 border-t border-border" />

          {/* History section */}
          <SectionLabel>History</SectionLabel>
          <EmptyState>No history yet</EmptyState>
        </div>
      </ScrollArea>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground/60 py-4 text-center">
      {children}
    </p>
  );
}
