import { useState, useMemo, useCallback } from "react";

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

export function JsonViewer({ data }: { data: string }) {
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
        {data}
      </pre>
    );
  }

  return (
    <div className="font-mono text-xs leading-5">
      <JsonTree value={parsed} />
    </div>
  );
}

function JsonTree({ value }: { value: JsonValue }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const lines = useMemo(
    () => buildLines(value, 0, true, "", collapsed),
    [value, collapsed],
  );

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

function buildLines(
  value: JsonValue,
  indent: number,
  isLast: boolean,
  path: string,
  collapsed: Record<string, boolean>,
): LineDescriptor[] {
  const comma = !isLast ? <Comma /> : null;

  if (value === null) {
    return [{ indent, content: <><Null />{comma}</> }];
  }
  if (typeof value === "string") {
    return [{ indent, content: <><Str value={value} />{comma}</> }];
  }
  if (typeof value === "number") {
    return [{ indent, content: <><Num value={value} />{comma}</> }];
  }
  if (typeof value === "boolean") {
    return [{ indent, content: <><Bool value={value} />{comma}</> }];
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
              <Key value={key} />
              <Bracket>: </Bracket>
              <PrimitiveValue value={val} />
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
              <Key value={key} />
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
              <Key value={key} />
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
            <Key value={key} />
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

function PrimitiveValue({ value }: { value: string | number | boolean | null }) {
  if (value === null) return <Null />;
  if (typeof value === "string") return <Str value={value} />;
  if (typeof value === "number") return <Num value={value} />;
  return <Bool value={value} />;
}

function Key({ value }: { value: string }) {
  return <span className="text-json-key">"{value}"</span>;
}

function Str({ value }: { value: string }) {
  return <span className="text-json-string">"{escapeString(value)}"</span>;
}

function Num({ value }: { value: number }) {
  return <span className="text-json-number">{String(value)}</span>;
}

function Bool({ value }: { value: boolean }) {
  return <span className="text-json-boolean">{String(value)}</span>;
}

function Null() {
  return <span className="text-json-null">null</span>;
}

function Bracket({ children }: { children: React.ReactNode }) {
  return <span className="text-json-bracket">{children}</span>;
}

function Comma() {
  return <span className="text-json-bracket">,</span>;
}

function escapeString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
