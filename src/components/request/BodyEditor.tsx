import { useCallback, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { KeyValueEditor } from "./KeyValueEditor";
import { Sparkles } from "lucide-react";
import type { RequestBody, RawFormat } from "@/types/request";
import {
  variableHighlight,
  variableAutocomplete,
  type VariableCompletionItem,
} from "@/lib/codemirror/variable-extension";

interface BodyEditorProps {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
  variableItems?: () => VariableCompletionItem[];
  isVariableResolved?: (name: string) => boolean;
  disabled?: boolean;
}

type BodyType = RequestBody["type"];

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "form-data", label: "Form Data" },
  { value: "x-www-form-urlencoded", label: "URL Encoded" },
  { value: "raw", label: "Raw" },
  { value: "binary", label: "Binary" },
];

function defaultBody(type: BodyType): RequestBody {
  switch (type) {
    case "raw":
      return { type: "raw", format: "json", content: "" };
    case "form-data":
      return { type: "form-data", entries: [] };
    case "x-www-form-urlencoded":
      return { type: "x-www-form-urlencoded", entries: [] };
    case "binary":
      return { type: "binary", filePath: "" };
    default:
      return { type: "none" };
  }
}

export function BodyEditor({ body, onChange, variableItems, isVariableResolved, disabled }: BodyEditorProps) {
  const handleTypeChange = useCallback(
    (type: string) => {
      onChange(defaultBody(type as BodyType));
    },
    [onChange],
  );

  const handleBeautify = useCallback(() => {
    if (body.type !== "raw" || body.format !== "json") return;
    try {
      const formatted = JSON.stringify(JSON.parse(body.content), null, 2);
      onChange({ ...body, content: formatted });
    } catch {
      // Invalid JSON — no-op
    }
  }, [body, onChange]);

  const extensions = useMemo(() => {
    if (body.type !== "raw") return [];
    const exts = [];
    switch (body.format) {
      case "json":
        exts.push(json());
        break;
      case "xml":
        exts.push(xml());
        break;
      case "text":
        exts.push(html());
        break;
    }
    if (isVariableResolved) {
      exts.push(variableHighlight(isVariableResolved));
    }
    if (variableItems) {
      exts.push(variableAutocomplete(variableItems));
    }
    return exts;
  }, [body.type, body.type === "raw" ? body.format : null, variableItems, isVariableResolved]);

  return (
    <div className="space-y-3">
      {/* Type selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {BODY_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => handleTypeChange(t.value)}
            disabled={disabled}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${disabled ? "" : "cursor-pointer"} ${
              body.type === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* None */}
      {body.type === "none" && (
        <p className="text-xs text-muted-foreground">
          This request does not have a body.
        </p>
      )}

      {/* Raw */}
      {body.type === "raw" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Select
              value={body.format}
              onValueChange={(format: string) =>
                onChange({ ...body, format: format as RawFormat })
              }
            >
              <SelectTrigger size="sm" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
            {body.format === "json" && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleBeautify}
                className="gap-1 text-xs text-muted-foreground"
              >
                <Sparkles className="size-3" />
                Beautify
              </Button>
            )}
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            <CodeMirror
              value={body.content}
              onChange={(value) => onChange({ ...body, content: value })}
              extensions={extensions}
              theme={oneDark}
              readOnly={disabled}
              editable={!disabled}
              height="200px"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                bracketMatching: true,
                closeBrackets: true,
              }}
            />
          </div>
        </div>
      )}

      {/* Form data / URL encoded */}
      {(body.type === "form-data" || body.type === "x-www-form-urlencoded") && (
        <KeyValueEditor
          entries={body.entries}
          onChange={(entries) => onChange({ ...body, entries })}
          keyPlaceholder="Key"
          valuePlaceholder="Value"
          disabled={disabled}
        />
      )}

      {/* Binary */}
      {body.type === "binary" && (
        <p className="text-xs text-muted-foreground">
          Binary upload coming in a future update.
        </p>
      )}
    </div>
  );
}
