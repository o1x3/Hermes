import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export function AppShell({
  sidebar,
  urlBar,
  responsePanel,
}: {
  sidebar: React.ReactNode;
  urlBar: React.ReactNode;
  responsePanel: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen bg-background text-foreground overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" id="hermes-main-layout">
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={35}
          collapsible
          collapsedSize={0}
          id="sidebar"
        >
          {sidebar}
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={80} minSize={50} id="main">
          <div className="flex h-full flex-col">
            <div className="shrink-0 border-b border-border p-3">
              {urlBar}
            </div>
            <div className="min-h-0 flex-1">{responsePanel}</div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
