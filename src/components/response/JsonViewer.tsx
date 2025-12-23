import { useState, useCallback, useMemo } from "react";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export function JsonViewer({ data }: { data: string }) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(data) as JsonValue;
    } catch {
      return null;
    }
  }, [data]);

  if (parsed === null && data) {
    // Not valid JSON — render as raw text
    return (
      <pre className="font-mono text-xs text-foreground whitespace-pre-wrap">
        {data}
      </pre>
    );
  }

  if (parsed === null) return null;

  return (
    <div className="font-mono text-xs leading-5">
      <JsonNode value={parsed} indent={0} lineCounter={{ current: 1 }} />
    </div>
  );
}

function JsonNode({
  value,
  indent,
  lineCounter,
  isLast = true,
}: {
  value: JsonValue;
  indent: number;
  lineCounter: { current: number };
  isLast?: boolean;
}) {
  if (value === null) {
    return (
      <Line num={lineCounter.current++} indent={indent}>
        <span className="text-json-null">null</span>
        {!isLast && <Comma />}
      </Line>
    );
  }

  if (typeof value === "string") {
    return (
      <Line num={lineCounter.current++} indent={indent}>
        <span className="text-json-string">"{escapeString(value)}"</span>
        {!isLast && <Comma />}
      </Line>
    );
  }

  if (typeof value === "number") {
    return (
      <Line num={lineCounter.current++} indent={indent}>
        <span className="text-json-number">{String(value)}</span>
        {!isLast && <Comma />}
      </Line>
    );
  }

  if (typeof value === "boolean") {
    return (
      <Line num={lineCounter.current++} indent={indent}>
        <span className="text-json-boolean">{String(value)}</span>
        {!isLast && <Comma />}
      </Line>
    );
  }

  if (Array.isArray(value)) {
    return (
      <CollapsibleNode
        openBracket="["
        closeBracket="]"
        items={value}
        indent={indent}
        lineCounter={lineCounter}
        isLast={isLast}
        collapsedLabel={`${value.length} item${value.length !== 1 ? "s" : ""}`}
        renderItem={(item, i) => (
          <JsonNode
            key={i}
            value={item}
            indent={indent + 1}
            lineCounter={lineCounter}
            isLast={i === value.length - 1}
          />
        )}
      />
    );
  }

  // Object
  const entries = Object.entries(value);
  return (
    <CollapsibleNode
      openBracket="{"
      closeBracket="}"
      items={entries}
      indent={indent}
      lineCounter={lineCounter}
      isLast={isLast}
      collapsedLabel={`${entries.length} key${entries.length !== 1 ? "s" : ""}`}
      renderItem={([key, val], i) => (
        <ObjectEntry
          key={key}
          propKey={key}
          value={val}
          indent={indent + 1}
          lineCounter={lineCounter}
          isLast={i === entries.length - 1}
        />
      )}
    />
  );
}

function ObjectEntry({
  propKey,
  value,
  indent,
  lineCounter,
  isLast,
}: {
  propKey: string;
  value: JsonValue;
  indent: number;
  lineCounter: { current: number };
  isLast: boolean;
}) {
  // For primitive values, render key: value on one line
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return (
      <Line num={lineCounter.current++} indent={indent}>
        <span className="text-json-key">"{propKey}"</span>
        <span className="text-json-bracket">: </span>
        <PrimitiveValue value={value} />
        {!isLast && <Comma />}
      </Line>
    );
  }

  // For objects/arrays, render key: { on one line, then children
  const isArray = Array.isArray(value);
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";
  const items = isArray
    ? value
    : Object.entries(value as Record<string, JsonValue>);
  const count = items.length;
  const label = isArray
    ? `${count} item${count !== 1 ? "s" : ""}`
    : `${count} key${count !== 1 ? "s" : ""}`;

  return (
    <CollapsibleNode
      openBracket={openBracket}
      closeBracket={closeBracket}
      items={items}
      indent={indent}
      lineCounter={lineCounter}
      isLast={isLast}
      collapsedLabel={label}
      prefix={
        <>
          <span className="text-json-key">"{propKey}"</span>
          <span className="text-json-bracket">: </span>
        </>
      }
      renderItem={(item, i) => {
        if (isArray) {
          return (
            <JsonNode
              key={i}
              value={item as JsonValue}
              indent={indent + 1}
              lineCounter={lineCounter}
              isLast={i === items.length - 1}
            />
          );
        }
        const [k, v] = item as [string, JsonValue];
        return (
          <ObjectEntry
            key={k}
            propKey={k}
            value={v}
            indent={indent + 1}
            lineCounter={lineCounter}
            isLast={i === items.length - 1}
          />
        );
      }}
    />
  );
}

function CollapsibleNode<T>({
  openBracket,
  closeBracket,
  items,
  indent,
  lineCounter,
  isLast,
  collapsedLabel,
  prefix,
  renderItem,
}: {
  openBracket: string;
  closeBracket: string;
  items: T[];
  indent: number;
  lineCounter: { current: number };
  isLast: boolean;
  collapsedLabel: string;
  prefix?: React.ReactNode;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  if (items.length === 0) {
    return (
      <Line num={lineCounter.current++} indent={indent}>
        {prefix}
        <span className="text-json-bracket">
          {openBracket}
          {closeBracket}
        </span>
        {!isLast && <Comma />}
      </Line>
    );
  }

  if (collapsed) {
    const openLine = lineCounter.current++;

    return (
      <Line num={openLine} indent={indent}>
        <CollapseToggle collapsed onClick={toggle} />
        {prefix}
        <span className="text-json-bracket">{openBracket} </span>
        <span className="text-muted-foreground italic">
          {collapsedLabel}
        </span>
        <span className="text-json-bracket"> {closeBracket}</span>
        {!isLast && <Comma />}
      </Line>
    );
  }

  const openLine = lineCounter.current++;

  return (
    <>
      <Line num={openLine} indent={indent}>
        <CollapseToggle collapsed={false} onClick={toggle} />
        {prefix}
        <span className="text-json-bracket">{openBracket}</span>
      </Line>
      {items.map((item, i) => renderItem(item, i))}
      <Line num={lineCounter.current++} indent={indent}>
        <span className="text-json-bracket">{closeBracket}</span>
        {!isLast && <Comma />}
      </Line>
    </>
  );
}

function Line({
  num,
  indent,
  children,
}: {
  num: number;
  indent: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex hover:bg-muted/30 transition-colors">
      <span className="inline-block w-10 shrink-0 text-right pr-3 select-none text-muted-foreground/50 tabular-nums">
        {num}
      </span>
      <span style={{ paddingLeft: `${indent * 1.25}rem` }}>{children}</span>
    </div>
  );
}

function CollapseToggle({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-block w-4 text-muted-foreground hover:text-foreground select-none cursor-pointer mr-0.5"
      aria-label={collapsed ? "Expand" : "Collapse"}
    >
      {collapsed ? "▸" : "▾"}
    </button>
  );
}

function PrimitiveValue({ value }: { value: string | number | boolean | null }) {
  if (value === null)
    return <span className="text-json-null">null</span>;
  if (typeof value === "string")
    return <span className="text-json-string">"{escapeString(value)}"</span>;
  if (typeof value === "number")
    return <span className="text-json-number">{String(value)}</span>;
  return <span className="text-json-boolean">{String(value)}</span>;
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
