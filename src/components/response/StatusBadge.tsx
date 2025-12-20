import { cn } from "@/lib/utils";

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "bg-status-2xx";
  if (status >= 300 && status < 400) return "bg-status-3xx";
  if (status >= 400 && status < 500) return "bg-status-4xx";
  return "bg-status-5xx";
}

export function StatusBadge({
  status,
  statusText,
}: {
  status: number;
  statusText: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold text-white",
        getStatusColor(status),
      )}
    >
      {status} {statusText}
    </span>
  );
}
