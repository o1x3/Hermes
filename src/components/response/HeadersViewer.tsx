import { ScrollArea } from "@/components/ui/scroll-area";

interface HeadersViewerProps {
  headers: Record<string, string>;
}

export function HeadersViewer({ headers }: HeadersViewerProps) {
  const entries = Object.entries(headers);

  if (entries.length === 0) {
    return (
      <p className="p-4 text-xs text-muted-foreground">No response headers.</p>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <table className="w-full text-xs font-mono">
          <tbody>
            {entries.map(([name, value]) => (
              <tr key={name} className="border-b border-border/30 last:border-0">
                <td className="py-1.5 pr-4 font-semibold text-muted-foreground whitespace-nowrap align-top">
                  {name}
                </td>
                <td className="py-1.5 text-foreground break-all">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrollArea>
  );
}
