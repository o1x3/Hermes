import { useCallback, useRef } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";

function SidebarResizeHandle() {
  const setWidth = useSidebarStore((s) => s.setWidth);
  const width = useSidebarStore((s) => s.width);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    const newWidth = startWidth.current + delta;
    setWidth(newWidth);
  }, [setWidth]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleMouseMove]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group z-10"
    >
      <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-border/50 group-hover:bg-primary/50 transition-colors" />
    </div>
  );
}

export function AppShell({
  miniSidebar,
  mainSidebar,
  titlebar,
  urlBar,
  requestConfig,
  responsePanel,
}: {
  miniSidebar: React.ReactNode;
  mainSidebar: React.ReactNode;
  titlebar?: React.ReactNode;
  urlBar: React.ReactNode;
  requestConfig: React.ReactNode;
  responsePanel: React.ReactNode;
}) {
  const expanded = useSidebarStore((s) => s.expanded);
  const width = useSidebarStore((s) => s.width);

  return (
    <SidebarProvider className="h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full">
        {miniSidebar}

        {expanded && (
          <div
            className="relative shrink-0 border-r border-sidebar-border"
            style={{ width }}
          >
            {mainSidebar}
            <SidebarResizeHandle />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {titlebar}

          <div className="shrink-0 bg-muted/10 border-b border-border px-5 py-3.5">
            {urlBar}
          </div>

          <ResizablePanelGroup
            orientation="horizontal"
            id="hermes-request-response"
            className="flex-1 min-h-0"
          >
            <ResizablePanel defaultSize="50%" minSize="25%" id="request">
              <div className="h-full overflow-hidden">
                {requestConfig}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize="50%" minSize="25%" id="response">
              {responsePanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </SidebarProvider>
  );
}
