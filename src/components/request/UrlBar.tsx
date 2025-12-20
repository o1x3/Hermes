import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MethodBadge, type HttpMethod } from "./MethodBadge";
import { ChevronDown, Send } from "lucide-react";

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
    <div className="flex items-center gap-2">
      {/* Method dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-1 px-2 h-9 min-w-[100px]"
          >
            <MethodBadge method={method} />
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {METHODS.map((m) => (
            <DropdownMenuItem key={m} onClick={() => onMethodChange(m)}>
              <MethodBadge method={m} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* URL input */}
      <Input
        data-testid="url-input"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="Enter request URL"
        className="flex-1 font-mono h-9"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            onSend();
          }
        }}
      />

      {/* Send button */}
      <Button
        onClick={onSend}
        disabled={loading}
        className="h-9 px-4 gap-1.5"
      >
        <Send className="h-3.5 w-3.5" />
        {loading ? "Sending…" : "Send"}
      </Button>
    </div>
  );
}
