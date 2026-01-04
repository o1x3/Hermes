import { cn } from "@/lib/utils";
import type { HttpMethod } from "@/types/request";

export type { HttpMethod };

const methodColorMap: Record<HttpMethod, string> = {
  GET: "bg-method-get",
  POST: "bg-method-post",
  PUT: "bg-method-put",
  PATCH: "bg-method-patch",
  DELETE: "bg-method-delete",
  HEAD: "bg-method-head",
  OPTIONS: "bg-method-options",
};

export function MethodBadge({
  method,
  className,
}: {
  method: HttpMethod;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-bold text-white tracking-wide",
        methodColorMap[method],
        className,
      )}
    >
      {method}
    </span>
  );
}
