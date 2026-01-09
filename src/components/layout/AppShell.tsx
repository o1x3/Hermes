import { useRef } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { PanelImperativeHandle } from "react-resizable-panels";

export function AppShell({
  sidebar,
  urlBar,
  requestConfig,
  responsePanel,
}: {
  sidebar: (onCollapse: () => void) => React.ReactNode;
  urlBar: React.ReactNode;
  requestConfig: React.ReactNode;
  responsePanel: React.ReactNode;
}) {
  const sidebarRef = useRef<PanelImperativeHandle | null>(null);

  const collapseSidebar = () => {
    sidebarRef.current?.collapse();
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" id="hermes-main-layout">
        <ResizablePanel
          panelRef={sidebarRef}
          defaultSize="20%"
          minSize="15%"
          maxSize="35%"
          collapsible
          collapsedSize="0%"
          id="sidebar"
        >
          {sidebar(collapseSidebar)}
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="80%" minSize="50%" id="main">
          <ResizablePanelGroup orientation="vertical" id="hermes-request-response">
            {/* Request panel: URL bar + config tabs */}
            <ResizablePanel defaultSize="45%" minSize="20%" id="request">
              <div className="flex h-full flex-col">
                {/* URL bar area */}
                <div className="shrink-0 bg-card border-b border-border px-5 py-3.5">
                  {urlBar}
                </div>
                {/* Config tabs area */}
                <div className="min-h-0 flex-1 overflow-hidden">
                  {requestConfig}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Response panel */}
            <ResizablePanel defaultSize="55%" minSize="20%" id="response">
              {responsePanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
