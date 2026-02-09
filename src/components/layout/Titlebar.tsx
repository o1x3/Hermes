import { X, Plus, MoreHorizontal, Minus, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabStore, type Tab } from "@/stores/tabStore";
import type { HttpMethod } from "@/types/request";
import { EnvSwitcher } from "@/components/environments/EnvSwitcher";
import { usePlatform } from "@/hooks/usePlatform";
import { getCurrentWindow } from "@tauri-apps/api/window";

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
        "group relative flex items-center gap-1.5 px-3 text-xs border-r border-border min-w-[120px] max-w-[200px] transition-colors h-full",
        isActive
          ? "bg-card text-foreground"
          : "bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
      onClick={() => setActiveTab(tab.id)}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          closeTab(tab.id);
        }
      }}
    >
      <span
        className={cn(
          "size-2 rounded-full shrink-0",
          methodDotColor[tab.state.method],
        )}
      />
      <span className="truncate">{tab.title}</span>
      {isDirty && (
        <span className="size-1.5 rounded-full bg-primary shrink-0" />
      )}
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
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      )}
    </button>
  );
}

function WindowControls() {
  const appWindow = getCurrentWindow();

  return (
    <div className="flex items-center h-full">
      <button
        className="inline-flex items-center justify-center w-11 h-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        onClick={() => appWindow.minimize()}
        title="Minimize"
      >
        <Minus className="size-3.5" />
      </button>
      <button
        className="inline-flex items-center justify-center w-11 h-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        onClick={() => appWindow.toggleMaximize()}
        title="Maximize"
      >
        <Copy className="size-3" />
      </button>
      <button
        className="inline-flex items-center justify-center w-11 h-full hover:bg-destructive/80 hover:text-white transition-colors text-muted-foreground"
        onClick={() => appWindow.close()}
        title="Close"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

interface TitlebarProps {
  onManageEnvironments?: () => void;
  onOpenSettings?: () => void;
}

export function Titlebar({ onManageEnvironments, onOpenSettings }: TitlebarProps) {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const openNewTab = useTabStore((s) => s.openNewTab);
  const platform = usePlatform();
  const isMac = platform === "macos";

  return (
    <div
      data-tauri-drag-region
      className="titlebar flex h-10 shrink-0 items-stretch bg-background border-b border-border select-none"
    >
      {/* Center: request tabs */}
      <div className={cn(
        "flex items-stretch flex-1 min-w-0 overflow-x-auto titlebar-tabs",
        isMac && "pl-[68px]",
      )}>
        {tabs.map((tab) => (
          <TabItem key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
        ))}
        <button
          className="flex items-center justify-center px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
          onClick={openNewTab}
          title="New Tab (Cmd+T)"
        >
          <Plus className="size-3.5" />
        </button>
        {/* Drag region filler */}
        <div data-tauri-drag-region className="flex-1" />
      </div>

      {/* Right: env switcher + more menu + window controls */}
      <div className="flex items-center shrink-0 gap-0.5 pr-1">
        {onManageEnvironments && (
          <div className="flex items-center px-1">
            <EnvSwitcher onManageEnvironments={onManageEnvironments} />
          </div>
        )}
        {onOpenSettings && (
          <button
            className="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            onClick={onOpenSettings}
            title="More options"
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
        {!isMac && <WindowControls />}
      </div>
    </div>
  );
}
