import { FolderClosed, Clock, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useTeamStore } from "@/stores/teamStore";
import { useAuthStore } from "@/stores/authStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

interface MiniSidebarProps {
  onOpenSettings: () => void;
  onCreateTeam: () => void;
}

function TeamSwitcherMini({ onCreateTeam }: { onCreateTeam: () => void }) {
  const teams = useTeamStore((s) => s.teams);
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const setActiveTeam = useTeamStore((s) => s.setActiveTeam);
  const isAuthenticated = useAuthStore((s) => s.user) !== null;

  if (!isAuthenticated) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Users className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-48">
        <DropdownMenuItem
          onClick={() => setActiveTeam(null)}
          className={!activeTeamId ? "bg-accent" : ""}
        >
          Personal
        </DropdownMenuItem>
        {teams.length > 0 && <DropdownMenuSeparator />}
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => setActiveTeam(team.id)}
            className={team.id === activeTeamId ? "bg-accent" : ""}
          >
            <Users className="size-3.5 mr-2" />
            {team.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateTeam}>
          <Plus className="size-3.5 mr-2" />
          Create Team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenuMini() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const isAuthenticated = user !== null;

  if (!isAuthenticated) return null;

  const displayName = profile?.displayName ?? user?.email?.split("@")[0] ?? "User";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="size-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors">
          <Avatar className="size-6">
            <AvatarImage src={profile?.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MiniSidebar({ onOpenSettings, onCreateTeam }: MiniSidebarProps) {
  const expandToSection = useSidebarStore((s) => s.expandToSection);
  const activeSection = useSidebarStore((s) => s.activeSection);

  return (
    <div className="w-12 shrink-0 flex flex-col items-center pt-10 pb-2 bg-sidebar border-r border-sidebar-border">
      <div className="flex flex-col items-center gap-1 flex-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => expandToSection("collections")}
              className={cn(
                "size-8 flex items-center justify-center rounded-md transition-colors",
                activeSection === "collections"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <FolderClosed className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Collections
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => expandToSection("history")}
              className={cn(
                "size-8 flex items-center justify-center rounded-md transition-colors",
                activeSection === "history"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Clock className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            History
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-col items-center gap-1">
        <TeamSwitcherMini onCreateTeam={onCreateTeam} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenSettings}
              className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Settings className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Settings
          </TooltipContent>
        </Tooltip>
        <UserMenuMini />
      </div>
    </div>
  );
}
