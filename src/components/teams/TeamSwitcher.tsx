import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTeamStore } from "@/stores/teamStore";
import { ChevronDown, Users, Plus } from "lucide-react";

interface TeamSwitcherProps {
  onCreateTeam: () => void;
}

export function TeamSwitcher({ onCreateTeam }: TeamSwitcherProps) {
  const teams = useTeamStore((s) => s.teams);
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const setActiveTeam = useTeamStore((s) => s.setActiveTeam);

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 w-full px-1 py-0.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:justify-center">
          <Users className="size-3.5 shrink-0" />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            {activeTeam?.name ?? "Personal"}
          </span>
          <ChevronDown className="size-3 ml-auto shrink-0 group-data-[collapsible=icon]:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
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
