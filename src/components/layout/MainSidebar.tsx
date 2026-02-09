import { useEffect, useRef } from "react";
import { FolderClosed, Clock, Plus, Cloud, Import } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebarStore";
import type { Collection, Folder, SavedRequest } from "@/types/collection";
import type { HistoryEntry } from "@/types/history";
import type { Team } from "@/types/team";
import { CollectionTree } from "@/components/collections/CollectionTree";
import { HistorySidebar } from "@/components/history/HistorySidebar";
import { PendingInviteBanner } from "@/components/teams/PendingInviteBanner";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MainSidebarProps {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  onCreateCollection: () => void;
  onOpenHistoryEntry: (entry: HistoryEntry) => void;
  onOpenImport: () => void;
  isAuthenticated: boolean;
  activeTeamId: string | null;
  teams: Team[];
  onShareCollection?: (collectionId: string) => void;
  onUnshareCollection?: (collectionId: string) => void;
}

export function MainSidebar({
  collections,
  folders,
  requests,
  onCreateCollection,
  onOpenHistoryEntry,
  onOpenImport,
  isAuthenticated,
  activeTeamId,
  teams,
  onShareCollection,
  onUnshareCollection,
}: MainSidebarProps) {
  const activeSection = useSidebarStore((s) => s.activeSection);
  const collectionsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const personalCollections = collections.filter((c) => c.teamId === null);
  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const teamCollections = activeTeamId
    ? collections.filter((c) => c.teamId === activeTeamId)
    : [];

  const teamFolders = activeTeamId
    ? folders.filter((f) =>
        teamCollections.some((c) => c.id === f.collectionId),
      )
    : [];
  const teamRequests = activeTeamId
    ? requests.filter((r) =>
        teamCollections.some((c) => c.id === r.collectionId),
      )
    : [];

  const personalFolders = folders.filter((f) =>
    personalCollections.some((c) => c.id === f.collectionId),
  );
  const personalRequests = requests.filter((r) =>
    personalCollections.some((c) => c.id === r.collectionId),
  );

  useEffect(() => {
    if (activeSection === "collections" && collectionsRef.current) {
      collectionsRef.current.scrollIntoView?.({ behavior: "smooth", block: "start" });
    } else if (activeSection === "history" && historyRef.current) {
      historyRef.current.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }, [activeSection]);

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground pt-10">
      {isAuthenticated && <PendingInviteBanner />}

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {/* Personal Collections */}
          <div ref={collectionsRef} data-section="collections" className="mb-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <FolderClosed className="size-3.5" />
                {isAuthenticated ? "Personal" : "Collections"}
              </div>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onOpenImport}
                      className="size-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Import className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Import</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onCreateCollection}
                      className="size-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">New Collection</TooltipContent>
                </Tooltip>
              </div>
            </div>
            {personalCollections.length === 0 ? (
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
                collections={personalCollections}
                folders={personalFolders}
                requests={personalRequests}
                onShareCollection={onShareCollection}
                isAuthenticated={isAuthenticated}
              />
            )}
          </div>

          {/* Team Collections */}
          {isAuthenticated && activeTeam && (
            <div className="mb-2">
              <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <Cloud className="size-3.5" />
                {activeTeam.name}
              </div>
              {teamCollections.length === 0 ? (
                <div className="px-2 py-4 text-center">
                  <p className="text-[11px] text-muted-foreground/40">
                    No team collections
                  </p>
                </div>
              ) : (
                <CollectionTree
                  collections={teamCollections}
                  folders={teamFolders}
                  requests={teamRequests}
                  onUnshareCollection={onUnshareCollection}
                  isAuthenticated={isAuthenticated}
                />
              )}
            </div>
          )}

          {/* History */}
          <div ref={historyRef} data-section="history">
            <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="size-3.5" />
              History
            </div>
            <HistorySidebar onOpenEntry={onOpenHistoryEntry} />
          </div>
        </div>
      </ScrollArea>

      {/* Footer with sync status */}
      {isAuthenticated && (
        <div className="shrink-0 border-t border-sidebar-border px-3 py-2">
          <SyncStatusIndicator />
        </div>
      )}
    </div>
  );
}
