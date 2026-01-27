import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

export function AppShell({
  sidebar,
  tabBar,
  urlBar,
  requestConfig,
  responsePanel,
}: {
  sidebar: React.ReactNode;
  tabBar?: React.ReactNode;
  urlBar: React.ReactNode;
  requestConfig: React.ReactNode;
  responsePanel: React.ReactNode;
}) {
  return (
    <SidebarProvider className="h-screen w-screen overflow-hidden">
      {sidebar}
      <SidebarInset className="min-w-0 flex flex-col overflow-hidden">
        {/* Tab bar */}
        {tabBar}

        {/* Request / Response split */}
        <ResizablePanelGroup
          orientation="vertical"
          id="hermes-request-response"
          className="flex-1 min-h-0"
        >
          {/* Request panel: URL bar + config tabs */}
          <ResizablePanel defaultSize="45%" minSize="20%" id="request">
            <div className="flex h-full flex-col">
              <div className="shrink-0 bg-card border-b border-border px-5 py-3.5">
                {urlBar}
              </div>
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
      </SidebarInset>
    </SidebarProvider>
  );
}
