import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MethodBadge, type HttpMethod } from "./MethodBadge";
import { ChevronDown, Send, Loader2 } from "lucide-react";

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export function UrlBar({
  method,
  url,
  loading,
  onMethodChange,
  onUrlChange,
  onSend,
}: {
  method: HttpMethod;
  url: string;
  loading: boolean;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* Method dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1.5 px-3 h-10 bg-background hover:bg-background/80 border border-border rounded-lg"
          >
            <MethodBadge method={method} />
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          {METHODS.map((m) => (
            <DropdownMenuItem
              key={m}
              onClick={() => onMethodChange(m)}
              className="gap-2"
            >
              <MethodBadge method={m} />
              <span className="text-muted-foreground text-xs">{m}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* URL input */}
      <input
        data-testid="url-input"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="Enter request URL"
        className="flex-1 h-10 rounded-lg border border-border bg-background px-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/50 transition-colors"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            onSend();
          }
        }}
      />

      {/* Send button */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onSend}
              disabled={loading}
              size="lg"
              className="h-10 px-5 rounded-lg gap-2 font-semibold text-sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? "Sending…" : "Send"}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="text-xs">⌘ Enter</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
