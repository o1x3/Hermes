import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEnvironmentStore } from "@/stores/environmentStore";
import { ChevronDown, Check, Globe, Settings2 } from "lucide-react";

interface EnvSwitcherProps {
  onManageEnvironments: () => void;
}

export function EnvSwitcher({ onManageEnvironments }: EnvSwitcherProps) {
  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnvironmentId = useEnvironmentStore((s) => s.activeEnvironmentId);
  const setActiveEnvironment = useEnvironmentStore((s) => s.setActiveEnvironment);

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const nonGlobalEnvs = environments.filter((e) => !e.isGlobal);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs h-7 px-2"
        >
          <Globe className="size-3" />
          <span className="max-w-[120px] truncate">
            {activeEnv ? activeEnv.name : "No Environment"}
          </span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuItem
          onClick={() => setActiveEnvironment(null)}
          className="gap-2 text-xs"
        >
          <span className="size-3.5 flex items-center justify-center">
            {!activeEnvironmentId && <Check className="size-3" />}
          </span>
          No Environment
        </DropdownMenuItem>

        {nonGlobalEnvs.length > 0 && <DropdownMenuSeparator />}

        {nonGlobalEnvs.map((env) => (
          <DropdownMenuItem
            key={env.id}
            onClick={() => setActiveEnvironment(env.id)}
            className="gap-2 text-xs"
          >
            <span className="size-3.5 flex items-center justify-center">
              {activeEnvironmentId === env.id && <Check className="size-3" />}
            </span>
            {env.name}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onManageEnvironments}
          className="gap-2 text-xs"
        >
          <Settings2 className="size-3.5" />
          Manage Environments
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
