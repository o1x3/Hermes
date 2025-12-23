import { ChevronLeft, FolderClosed, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export function Sidebar({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[53px] shrink-0">
        <span className="font-bold text-sidebar-foreground tracking-tight">
          Hermes
        </span>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          {/* Collections section */}
          <SectionLabel icon={<FolderClosed className="h-3.5 w-3.5" />}>
            Collections
          </SectionLabel>
          <EmptyState>No collections yet</EmptyState>

          <div className="my-3 mx-1 border-t border-sidebar-border" />

          {/* History section */}
          <SectionLabel icon={<Clock className="h-3.5 w-3.5" />}>
            History
          </SectionLabel>
          <EmptyState>No history yet</EmptyState>
        </div>
      </ScrollArea>
    </div>
  );
}

function SectionLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {icon}
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground/40 py-6 text-center">
      {children}
    </p>
  );
}
