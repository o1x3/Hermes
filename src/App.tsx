import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RequestTabs } from "@/components/layout/RequestTabs";
import { UrlBar } from "@/components/request/UrlBar";
import { RequestConfigTabs } from "@/components/request/RequestConfigTabs";
import { ResponsePanel } from "@/components/response/ResponsePanel";
import { CreateCollectionDialog } from "@/components/collections/CreateCollectionDialog";
import { useTabStore } from "@/stores/tabStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { useKeyboard } from "@/hooks/useKeyboard";
import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

function EmptyState() {
  const openNewTab = useTabStore((s) => s.openNewTab);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <Zap className="size-10 text-muted-foreground/30" />
      <div className="text-center">
        <p className="text-sm font-medium">No open requests</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Open a request from the sidebar or create a new one
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={openNewTab}>
        <Plus className="size-3.5 mr-1.5" />
        New Request
      </Button>
    </div>
  );
}

function App() {
  const loadWorkspace = useCollectionStore((s) => s.loadWorkspace);
  const collections = useCollectionStore((s) => s.collections);
  const folders = useCollectionStore((s) => s.folders);
  const requests = useCollectionStore((s) => s.requests);

  const activeTab = useTabStore((s) => s.getActiveTab());
  const openNewTab = useTabStore((s) => s.openNewTab);
  const setMethod = useTabStore((s) => s.setMethod);
  const setUrl = useTabStore((s) => s.setUrl);
  const setHeaders = useTabStore((s) => s.setHeaders);
  const setParams = useTabStore((s) => s.setParams);
  const setBodyConfig = useTabStore((s) => s.setBodyConfig);
  const setAuth = useTabStore((s) => s.setAuth);
  const sendRequest = useTabStore((s) => s.sendRequest);
  const tabs = useTabStore((s) => s.tabs);

  const [showCreateCollection, setShowCreateCollection] = useState(false);

  // Load workspace on mount
  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Open a default tab if none exist on initial load
  useEffect(() => {
    if (tabs.length === 0) {
      openNewTab();
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusUrl = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-testid="url-input"]',
    );
    input?.focus();
    input?.select();
  }, []);

  const handleSend = useCallback(() => {
    const tab = useTabStore.getState().getActiveTab();
    if (!tab) return;

    const resolveAuth = () => {
      const { auth } = tab.state;
      if (auth.type !== "none") return auth;

      if (tab.savedRequestId) {
        const req = useCollectionStore
          .getState()
          .getRequest(tab.savedRequestId);
        if (req) {
          if (req.folderId) {
            const folder = useCollectionStore
              .getState()
              .getFolder(req.folderId);
            if (folder && folder.defaultAuth.type !== "none") {
              return folder.defaultAuth;
            }
          }
          const col = useCollectionStore
            .getState()
            .getCollection(req.collectionId);
          if (col && col.defaultAuth.type !== "none") {
            return col.defaultAuth;
          }
        }
      }

      return auth;
    };

    sendRequest(resolveAuth);
  }, [sendRequest]);

  useKeyboard({ onSend: handleSend, onFocusUrl: focusUrl });

  const hasActiveTab = !!activeTab;

  return (
    <>
      <AppShell
        sidebar={
          <Sidebar
            collections={collections}
            folders={folders}
            requests={requests}
            onCreateCollection={() => setShowCreateCollection(true)}
          />
        }
        tabBar={<RequestTabs />}
        urlBar={
          hasActiveTab ? (
            <UrlBar
              method={activeTab.state.method}
              url={activeTab.state.url}
              loading={activeTab.state.loading}
              onMethodChange={setMethod}
              onUrlChange={setUrl}
              onSend={handleSend}
            />
          ) : null
        }
        requestConfig={
          hasActiveTab ? (
            <RequestConfigTabs
              params={activeTab.state.params}
              headers={activeTab.state.headers}
              auth={activeTab.state.auth}
              bodyConfig={activeTab.state.bodyConfig}
              onParamsChange={setParams}
              onHeadersChange={setHeaders}
              onAuthChange={setAuth}
              onBodyConfigChange={setBodyConfig}
            />
          ) : null
        }
        responsePanel={
          hasActiveTab ? (
            <ResponsePanel
              response={activeTab.state.response}
              loading={activeTab.state.loading}
              error={activeTab.state.error}
            />
          ) : (
            <EmptyState />
          )
        }
      />

      <CreateCollectionDialog
        open={showCreateCollection}
        onOpenChange={setShowCreateCollection}
      />
    </>
  );
}

export default App;
