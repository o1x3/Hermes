import { useSyncStore } from "@/stores/syncStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";

export function SyncStatusIndicator() {
  const status = useSyncStore((s) => s.status);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  const config = {
    offline: {
      icon: CloudOff,
      className: "text-muted-foreground/40",
      label: "Offline",
    },
    syncing: {
      icon: Loader2,
      className: "text-blue-500 animate-spin",
      label: "Syncing...",
    },
    synced: {
      icon: Cloud,
      className: "text-green-500",
      label: "Synced",
    },
    error: {
      icon: AlertCircle,
      className: "text-red-500",
      label: "Sync error",
    },
  }[status];

  const Icon = config.icon;

  const tooltip = lastSyncedAt
    ? `${config.label} — Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
    : config.label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center">
          <Icon className={`size-4 ${config.className}`} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
