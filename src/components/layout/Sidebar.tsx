import { FolderClosed, Clock, Plus, Settings, Import } from "lucide-react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { Collection, Folder, SavedRequest } from "@/types/collection";
import type { HistoryEntry } from "@/types/history";
import { CollectionTree } from "@/components/collections/CollectionTree";
import { HistorySidebar } from "@/components/history/HistorySidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  onCreateCollection: () => void;
  onOpenSettings: () => void;
  onOpenHistoryEntry: (entry: HistoryEntry) => void;
  onOpenImport: () => void;
}

export function Sidebar({
  collections,
  folders,
  requests,
  onCreateCollection,
  onOpenSettings,
  onOpenHistoryEntry,
  onOpenImport,
}: SidebarProps) {
  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader className="flex-row items-center justify-between">
        <span className="font-bold text-sidebar-foreground tracking-tight text-sm group-data-[collapsible=icon]:hidden">
          Hermes
        </span>
        <SidebarTrigger className="ml-auto" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <FolderClosed className="size-3.5 mr-1" />
            Collections
          </SidebarGroupLabel>
          <div className="flex items-center gap-0.5 absolute right-1 top-1/2 -translate-y-1/2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onOpenImport} className="size-5 flex items-center justify-center rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
                  <Import className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Import</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarGroupAction onClick={onCreateCollection} className="static translate-y-0">
                  <Plus className="size-4" />
                </SidebarGroupAction>
              </TooltipTrigger>
              <TooltipContent side="right">New Collection</TooltipContent>
            </Tooltip>
          </div>
          <SidebarGroupContent>
            {collections.length === 0 ? (
              <div className="px-2 py-6 text-center">
                <p className="text-[11px] text-muted-foreground/40">
                  No collections yet
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs h-7"
                  onClick={onCreateCollection}
                >
                  <Plus className="size-3 mr-1" />
                  New Collection
                </Button>
              </div>
            ) : (
              <CollectionTree
                collections={collections}
                folders={folders}
                requests={requests}
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>
            <Clock className="size-3.5 mr-1" />
            History
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <HistorySidebar onOpenEntry={onOpenHistoryEntry} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onOpenSettings}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}
