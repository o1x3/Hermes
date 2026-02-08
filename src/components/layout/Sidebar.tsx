import { FolderClosed, Clock, Plus, Settings, Import, Cloud, LogIn } from "lucide-react";
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
import type { Team } from "@/types/team";
import { CollectionTree } from "@/components/collections/CollectionTree";
import { HistorySidebar } from "@/components/history/HistorySidebar";
import { UserMenu } from "@/components/auth/UserMenu";
import { TeamSwitcher } from "@/components/teams/TeamSwitcher";
import { PendingInviteBanner } from "@/components/teams/PendingInviteBanner";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";
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
  isAuthenticated: boolean;
  onSignIn: () => void;
  onCreateTeam: () => void;
  activeTeamId: string | null;
  teams: Team[];
  onShareCollection?: (collectionId: string) => void;
  onUnshareCollection?: (collectionId: string) => void;
}

export function Sidebar({
  collections,
  folders,
  requests,
  onCreateCollection,
  onOpenSettings,
  onOpenHistoryEntry,
  onOpenImport,
  isAuthenticated,
  onSignIn,
  onCreateTeam,
  activeTeamId,
  teams,
  onShareCollection,
  onUnshareCollection,
}: SidebarProps) {
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

  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader className="gap-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sidebar-foreground tracking-tight text-sm group-data-[collapsible=icon]:hidden">
            Hermes
          </span>
          <SidebarTrigger className="ml-auto" />
        </div>
        {isAuthenticated ? (
          <>
            <UserMenu />
            <TeamSwitcher onCreateTeam={onCreateTeam} />
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs group-data-[collapsible=icon]:justify-center"
            onClick={onSignIn}
          >
            <LogIn className="size-3.5 mr-1.5 group-data-[collapsible=icon]:mr-0" />
            <span className="group-data-[collapsible=icon]:hidden">Sign In</span>
          </Button>
        )}
      </SidebarHeader>

      {isAuthenticated && <PendingInviteBanner />}

      <SidebarContent>
        {/* Personal Collections */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <FolderClosed className="size-3.5 mr-1" />
            {isAuthenticated ? "Personal" : "Collections"}
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
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Team Collections */}
        {isAuthenticated && activeTeam && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>
                <Cloud className="size-3.5 mr-1" />
                {activeTeam.name}
              </SidebarGroupLabel>
              <SidebarGroupContent>
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
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

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
        <div className="flex items-center justify-between">
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
          {isAuthenticated && <SyncStatusIndicator />}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}
