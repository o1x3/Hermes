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
  titlebar,
  urlBar,
  requestConfig,
  responsePanel,
}: {
  sidebar: React.ReactNode;
  titlebar?: React.ReactNode;
  urlBar: React.ReactNode;
  requestConfig: React.ReactNode;
  responsePanel: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {titlebar}
      <SidebarProvider className="flex-1 min-h-0 overflow-hidden">
        {sidebar}
        <SidebarInset className="min-w-0 flex flex-col overflow-hidden">
          {/* URL bar - fixed height, outside resize */}
          <div className="shrink-0 bg-card border-b border-border px-5 py-3.5">
            {urlBar}
          </div>

          {/* Request / Response horizontal split */}
          <ResizablePanelGroup
            orientation="horizontal"
            id="hermes-request-response"
            className="flex-1 min-h-0"
          >
            {/* Request config panel */}
            <ResizablePanel defaultSize="50%" minSize="25%" id="request">
              <div className="h-full overflow-hidden">
                {requestConfig}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Response panel */}
            <ResizablePanel defaultSize="50%" minSize="25%" id="response">
              {responsePanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
