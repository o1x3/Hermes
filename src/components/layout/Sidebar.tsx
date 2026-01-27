import { FolderClosed, Clock, Plus } from "lucide-react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
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
import { CollectionTree } from "@/components/collections/CollectionTree";
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
}

export function Sidebar({
  collections,
  folders,
  requests,
  onCreateCollection,
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
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarGroupAction onClick={onCreateCollection}>
                <Plus className="size-4" />
              </SidebarGroupAction>
            </TooltipTrigger>
            <TooltipContent side="right">New Collection</TooltipContent>
          </Tooltip>
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
            <p className="text-[11px] text-muted-foreground/40 py-6 text-center">
              No history yet
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </ShadcnSidebar>
  );
}
