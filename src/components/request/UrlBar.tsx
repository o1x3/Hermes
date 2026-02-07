import { useMemo, useRef } from "react";
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

export function UrlBar({
  method,
  url,
  loading,
  onMethodChange,
  onUrlChange,
  onSend,
  variableItems,
  isVariableResolved,
}: {
  method: HttpMethod;
  url: string;
  loading: boolean;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  variableItems?: () => VariableCompletionItem[];
  isVariableResolved?: (name: string) => boolean;
}) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

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
      // placeholder
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

      {/* URL input — CodeMirror single-line editor */}
      <div
        data-testid="url-input"
        className="flex-1 h-10 rounded-lg border border-border bg-background px-4 overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-primary/50 transition-colors"
      >
        <CodeMirror
          ref={editorRef}
          value={url}
          onChange={onUrlChange}
          extensions={extensions}
          theme="none"
          placeholder="Enter request URL"
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            indentOnInput: false,
            syntaxHighlighting: false,
            bracketMatching: false,
            closeBrackets: false,
            autocompletion: false, // we provide our own
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
