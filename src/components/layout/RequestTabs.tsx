import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabStore, type Tab } from "@/stores/tabStore";
import type { HttpMethod } from "@/types/request";

const methodDotColor: Record<HttpMethod, string> = {
  GET: "bg-method-get",
  POST: "bg-method-post",
  PUT: "bg-method-put",
  PATCH: "bg-method-patch",
  DELETE: "bg-method-delete",
  HEAD: "bg-method-head",
  OPTIONS: "bg-method-options",
};

function TabItem({ tab, isActive }: { tab: Tab; isActive: boolean }) {
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const isDirty = useTabStore((s) => s.isTabDirty(tab.id));

  return (
    <button
      className={cn(
        "group relative flex h-full items-center gap-1.5 px-3 text-xs border-r border-border min-w-[120px] max-w-[200px] transition-colors",
        isActive
          ? "bg-card text-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      onClick={() => setActiveTab(tab.id)}
      onMouseDown={(e) => {
        // Middle-click to close
        if (e.button === 1) {
          e.preventDefault();
          closeTab(tab.id);
        }
      }}
    >
      {/* Method dot */}
      <span
        className={cn(
          "size-2 rounded-full shrink-0",
          methodDotColor[tab.state.method],
        )}
      />

      {/* Title */}
      <span className="truncate">
        {tab.title}
      </span>

      {/* Dirty indicator */}
      {isDirty && (
        <span className="size-1.5 rounded-full bg-primary shrink-0" />
      )}

      {/* Close button */}
      <span
        role="button"
        tabIndex={-1}
        className="ml-auto shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-foreground/10 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
      >
        <X className="size-3" />
      </span>

      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      )}
    </button>
  );
}

export function RequestTabs() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const openNewTab = useTabStore((s) => s.openNewTab);

  if (tabs.length === 0) return null;

  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-border bg-muted/30 overflow-x-auto">
      {tabs.map((tab) => (
        <TabItem key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
      ))}

      {/* New tab button */}
      <button
        className="flex items-center justify-center px-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        onClick={openNewTab}
        title="New Tab (Cmd+T)"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
