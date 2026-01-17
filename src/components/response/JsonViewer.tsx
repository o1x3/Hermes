import { useState, useMemo, useCallback, useEffect } from "react";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface LineDescriptor {
  indent: number;
  content: React.ReactNode;
  collapsible?: {
    id: string;
    label: string;
  };
}

interface JsonViewerProps {
  data: string;
  searchQuery?: string;
  onMatchCount?: (count: number) => void;
}

export function JsonViewer({ data, searchQuery, onMatchCount }: JsonViewerProps) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(data) as JsonValue;
    } catch {
      return undefined;
    }
  }, [data]);

  if (parsed === undefined) {
    return (
      <pre className="font-mono text-xs text-foreground whitespace-pre-wrap">
        {searchQuery ? (
          <HighlightedText text={data} query={searchQuery} />
        ) : (
          data
        )}
      </pre>
    );
  }

  return (
    <div className="font-mono text-xs leading-5">
      <JsonTree
        value={parsed}
        searchQuery={searchQuery}
        onMatchCount={onMatchCount}
      />
    </div>
  );
}

function JsonTree({
  value,
  searchQuery,
  onMatchCount,
}: {
  value: JsonValue;
  searchQuery?: string;
  onMatchCount?: (count: number) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const query = searchQuery?.trim() || "";

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const lines = useMemo(
    () => buildLines(value, 0, true, "", collapsed, query),
    [value, collapsed, query],
  );

  // Count matches when searchQuery changes
  useEffect(() => {
    if (!onMatchCount) return;
    if (!query) {
      onMatchCount(0);
      return;
    }
    const count = countMatches(value, query);
    onMatchCount(count);
  }, [value, query, onMatchCount]);

  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="flex hover:bg-muted/30 transition-colors">
          <span className="inline-block w-10 shrink-0 text-right pr-3 select-none text-muted-foreground/50 tabular-nums">
            {i + 1}
          </span>
          <span style={{ paddingLeft: `${line.indent * 1.25}rem` }}>
            {line.collapsible && (
              <button
                onClick={() => toggle(line.collapsible!.id)}
                className="inline-block w-4 text-muted-foreground hover:text-foreground select-none cursor-pointer mr-0.5"
                aria-label={
                  collapsed[line.collapsible.id] ? "Expand" : "Collapse"
                }
              >
                {collapsed[line.collapsible.id] ? "▸" : "▾"}
              </button>
            )}
            {line.content}
          </span>
        </div>
      ))}
    </>
  );
}

function countMatches(value: JsonValue, query: string): number {
  const lq = query.toLowerCase();
  let count = 0;

  function walk(v: JsonValue) {
    if (v === null) {
      if ("null".includes(lq)) count++;
    } else if (typeof v === "string") {
      count += countOccurrences(v, lq);
    } else if (typeof v === "number") {
      count += countOccurrences(String(v), lq);
    } else if (typeof v === "boolean") {
      count += countOccurrences(String(v), lq);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else {
      for (const [key, val] of Object.entries(v)) {
        count += countOccurrences(key, lq);
        walk(val);
      }
    }
  }

  walk(value);
  return count;
}

function countOccurrences(text: string, query: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  let idx = 0;
  while ((idx = lower.indexOf(query, idx)) !== -1) {
    count++;
    idx += query.length;
  }
  return count;
}

function buildLines(
  value: JsonValue,
  indent: number,
  isLast: boolean,
  path: string,
  collapsed: Record<string, boolean>,
  query: string,
): LineDescriptor[] {
  const comma = !isLast ? <Comma /> : null;

  if (value === null) {
    return [{ indent, content: <><Null query={query} />{comma}</> }];
  }
  if (typeof value === "string") {
    return [{ indent, content: <><Str value={value} query={query} />{comma}</> }];
  }
  if (typeof value === "number") {
    return [{ indent, content: <><Num value={value} query={query} />{comma}</> }];
  }
  if (typeof value === "boolean") {
    return [{ indent, content: <><Bool value={value} query={query} />{comma}</> }];
  }

  const isArray = Array.isArray(value);
  const open = isArray ? "[" : "{";
  const close = isArray ? "]" : "}";
  const entries = isArray ? value : Object.entries(value);
  const count = entries.length;

  if (count === 0) {
    return [{ indent, content: <><Bracket>{open}{close}</Bracket>{comma}</> }];
  }

  const id = path || "root";
  const isCollapsed = collapsed[id];
  const label = isArray
    ? `${count} item${count !== 1 ? "s" : ""}`
    : `${count} key${count !== 1 ? "s" : ""}`;

  if (isCollapsed) {
    return [
      {
        indent,
        collapsible: { id, label },
        content: (
          <>
            <Bracket>{open} </Bracket>
            <span className="text-muted-foreground italic">{label}</span>
            <Bracket> {close}</Bracket>
            {comma}
          </>
        ),
      },
    ];
  }

  const lines: LineDescriptor[] = [];

  // Opening bracket
  lines.push({
    indent,
    collapsible: { id, label },
    content: <Bracket>{open}</Bracket>,
  });

  // Children
  if (isArray) {
    (value as JsonValue[]).forEach((item, i) => {
      const childPath = `${path}[${i}]`;
      const childLines = buildLines(
        item,
        indent + 1,
        i === count - 1,
        childPath,
        collapsed,
        query,
      );
      lines.push(...childLines);
    });
  } else {
    const objEntries = Object.entries(value as Record<string, JsonValue>);
    objEntries.forEach(([key, val], i) => {
      const childPath = `${path}.${key}`;
      const childIsLast = i === objEntries.length - 1;
      const childComma = !childIsLast ? <Comma /> : null;

      // Primitive values: key: value on one line
      if (
        val === null ||
        typeof val === "string" ||
        typeof val === "number" ||
        typeof val === "boolean"
      ) {
        lines.push({
          indent: indent + 1,
          content: (
            <>
              <Key value={key} query={query} />
              <Bracket>: </Bracket>
              <PrimitiveValue value={val} query={query} />
              {childComma}
            </>
          ),
        });
        return;
      }

      // Nested object/array: key: { ... }
      const nestedIsArray = Array.isArray(val);
      const nestedOpen = nestedIsArray ? "[" : "{";
      const nestedClose = nestedIsArray ? "]" : "}";
      const nestedEntries = nestedIsArray
        ? (val as JsonValue[])
        : Object.entries(val as Record<string, JsonValue>);
      const nestedCount = nestedEntries.length;
      const nestedId = childPath;
      const nestedCollapsed = collapsed[nestedId];
      const nestedLabel = nestedIsArray
        ? `${nestedCount} item${nestedCount !== 1 ? "s" : ""}`
        : `${nestedCount} key${nestedCount !== 1 ? "s" : ""}`;

      if (nestedCount === 0) {
        lines.push({
          indent: indent + 1,
          content: (
            <>
              <Key value={key} query={query} />
              <Bracket>: {nestedOpen}{nestedClose}</Bracket>
              {childComma}
            </>
          ),
        });
        return;
      }

      if (nestedCollapsed) {
        lines.push({
          indent: indent + 1,
          collapsible: { id: nestedId, label: nestedLabel },
          content: (
            <>
              <Key value={key} query={query} />
              <Bracket>: {nestedOpen} </Bracket>
              <span className="text-muted-foreground italic">
                {nestedLabel}
              </span>
              <Bracket> {nestedClose}</Bracket>
              {childComma}
            </>
          ),
        });
        return;
      }

      // Expanded nested
      lines.push({
        indent: indent + 1,
        collapsible: { id: nestedId, label: nestedLabel },
        content: (
          <>
            <Key value={key} query={query} />
            <Bracket>: {nestedOpen}</Bracket>
          </>
        ),
      });

      const innerLines = buildLines(
        val,
        indent + 1,
        childIsLast,
        childPath,
        collapsed,
        query,
      );
      // Skip the first line (opening bracket) and last line (closing bracket)
      // because we already rendered them inline with the key
      const innerChildren = innerLines.slice(1, -1);
      lines.push(...innerChildren);

      lines.push({
        indent: indent + 1,
        content: (
          <>
            <Bracket>{nestedClose}</Bracket>
            {childComma}
          </>
        ),
      });
    });
  }

  // Closing bracket
  lines.push({
    indent,
    content: <><Bracket>{close}</Bracket>{comma}</>,
  });

  return lines;
}

function PrimitiveValue({ value, query }: { value: string | number | boolean | null; query: string }) {
  if (value === null) return <Null query={query} />;
  if (typeof value === "string") return <Str value={value} query={query} />;
  if (typeof value === "number") return <Num value={value} query={query} />;
  return <Bool value={value} query={query} />;
}

function Key({ value, query }: { value: string; query: string }) {
  return (
    <span className="text-json-key">
      "<HighlightedText text={value} query={query} />"
    </span>
  );
}

function Str({ value, query }: { value: string; query: string }) {
  return (
    <span className="text-json-string">
      "<HighlightedText text={escapeString(value)} query={query} />"
    </span>
  );
}

function Num({ value, query }: { value: number; query: string }) {
  return (
    <span className="text-json-number">
      <HighlightedText text={String(value)} query={query} />
    </span>
  );
}

function Bool({ value, query }: { value: boolean; query: string }) {
  return (
    <span className="text-json-boolean">
      <HighlightedText text={String(value)} query={query} />
    </span>
  );
}

function Null({ query }: { query: string }) {
  return (
    <span className="text-json-null">
      <HighlightedText text="null" query={query} />
    </span>
  );
}

function Bracket({ children }: { children: React.ReactNode }) {
  return <span className="text-json-bracket">{children}</span>;
}

function Comma() {
  return <span className="text-json-bracket">,</span>;
}

export function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const lq = query.toLowerCase();
  let lastIndex = 0;

  let idx = lower.indexOf(lq);
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }
    parts.push(
      <mark
        key={idx}
        className="bg-variable-highlight/30 text-inherit rounded-sm"
      >
        {text.slice(idx, idx + query.length)}
      </mark>,
    );
    lastIndex = idx + query.length;
    idx = lower.indexOf(lq, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

function escapeString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
