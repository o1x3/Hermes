import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { EditorView, keymap } from "@codemirror/view";
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
import {
  variableHighlight,
  variableAutocomplete,
  singleLine,
  type VariableCompletionItem,
} from "@/lib/codemirror/variable-extension";
import { parseCurl, type CurlImport } from "@/lib/import/curl";
import { cn } from "@/lib/utils";

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const urlBarTheme = EditorView.theme({
  "&": {
    fontSize: "14px",
    fontFamily: "var(--font-mono)",
    backgroundColor: "transparent",
    height: "40px",
    color: "var(--foreground)",
  },
  ".cm-content": {
    padding: "8px 0",
    caretColor: "var(--foreground)",
  },
  ".cm-line": {
    padding: "0",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    overflow: "hidden",
    lineHeight: "24px",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--foreground)",
  },
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
    opacity: "0.5",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--ring)",
    opacity: "0.3",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
  },
  ".cm-tooltip-autocomplete ul li": {
    padding: "4px 8px",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
});

function isCompleteCurlCommand(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed.toLowerCase().startsWith("curl")) return false;

  const hasUrl = /https?:\/\/[^\s]+/.test(input) || /--url\s+['"]?[^\s'"]+/.test(input);
  if (!hasUrl) return false;

  let singleQuotes = 0;
  let doubleQuotes = 0;
  let escaped = false;

  for (const ch of input) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === "'") singleQuotes++;
    if (ch === '"') doubleQuotes++;
  }

  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) return false;

  return true;
}

export function UrlBar({
  method,
  url,
  loading,
  disabled,
  onMethodChange,
  onUrlChange,
  onSend,
  variableItems,
  isVariableResolved,
  onCurlDetected,
  onCurlError,
}: {
  method: HttpMethod;
  url: string;
  loading: boolean;
  disabled?: boolean;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  variableItems?: () => VariableCompletionItem[];
  isVariableResolved?: (name: string) => boolean;
  onCurlDetected?: (parsed: CurlImport) => void;
  onCurlError?: (error: string) => void;
}) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [errorState, setErrorState] = useState<"idle" | "error">("idle");

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const handleUrlChange = useCallback(
    (value: string) => {
      setErrorState("idle");
      onUrlChange(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const trimmed = value.trim();

        if (!trimmed.toLowerCase().startsWith("curl")) return;

        if (!isCompleteCurlCommand(trimmed)) return;

        try {
          const parsed = parseCurl(trimmed);
          onCurlDetected?.(parsed);
        } catch (err) {
          setErrorState("error");
          onCurlError?.(err instanceof Error ? err.message : "Invalid cURL command");

          if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = setTimeout(() => setErrorState("idle"), 2000);
        }
      }, 300);
    },
    [onUrlChange, onCurlDetected, onCurlError],
  );

  const extensions = useMemo(() => {
    const exts = [
      singleLine(),
      urlBarTheme,
      EditorView.lineWrapping,
      keymap.of([
        {
          key: "Mod-Enter",
          run: () => {
            onSend();
            return true;
          },
        },
        {
          key: "Mod-l",
          run: (view) => {
            view.dispatch({
              selection: { anchor: 0, head: view.state.doc.length },
            });
            return true;
          },
        },
      ]),
      EditorView.contentAttributes.of({ "aria-label": "Request URL" }),
    ];

    if (isVariableResolved) {
      exts.push(variableHighlight(isVariableResolved));
    }
    if (variableItems) {
      exts.push(variableAutocomplete(variableItems));
    }

    return exts;
  }, [onSend, variableItems, isVariableResolved]);

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button
            variant="ghost"
            className="flex items-center gap-1.5 px-3 h-10 bg-background hover:bg-background/80 border border-border rounded-lg"
            disabled={disabled}
          >
            <MethodBadge method={method} />
            {!disabled && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
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

      <div
        data-testid="url-input"
        className={cn(
          "flex-1 h-10 rounded-lg border border-border bg-background px-4 overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-primary/50 transition-colors",
          errorState === "error" && "url-bar-error",
        )}
      >
        <CodeMirror
          ref={editorRef}
          value={url}
          onChange={handleUrlChange}
          extensions={extensions}
          theme="none"
          readOnly={disabled}
          editable={!disabled}
          placeholder="Enter request URL or paste a cURL command"
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            indentOnInput: false,
            syntaxHighlighting: false,
            bracketMatching: false,
            closeBrackets: false,
            autocompletion: false,
            searchKeymap: false,
            dropCursor: false,
            rectangularSelection: false,
            crosshairCursor: false,
            drawSelection: true,
            defaultKeymap: true,
            history: true,
          }}
          height="40px"
        />
      </div>

      {!disabled && (
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
      )}
    </div>
  );
}
