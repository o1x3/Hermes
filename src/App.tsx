import { useCallback, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { UrlBar } from "@/components/request/UrlBar";
import { RequestConfigTabs } from "@/components/request/RequestConfigTabs";
import { ResponsePanel } from "@/components/response/ResponsePanel";
import { useTabStore } from "@/stores/tabStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { useKeyboard } from "@/hooks/useKeyboard";

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

  // Load workspace on mount
  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Open a default tab if none exist
  useEffect(() => {
    const { tabs } = useTabStore.getState();
    if (tabs.length === 0) {
      openNewTab();
    }
  }, [openNewTab]);

  const focusUrl = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-testid="url-input"]',
    );
    input?.focus();
    input?.select();
  }, []);

  const handleSend = useCallback(() => {
    // Resolve auth inheritance: request → folder → collection
    const tab = useTabStore.getState().getActiveTab();
    if (!tab) return;

    const resolveAuth = () => {
      const { auth } = tab.state;
      if (auth.type !== "none") return auth;

      if (tab.savedRequestId) {
        const req = useCollectionStore.getState().getRequest(tab.savedRequestId);
        if (req) {
          // Check folder default auth
          if (req.folderId) {
            const folder = useCollectionStore.getState().getFolder(req.folderId);
            if (folder && folder.defaultAuth.type !== "none") {
              return folder.defaultAuth;
            }
          }
          // Check collection default auth
          const col = useCollectionStore.getState().getCollection(req.collectionId);
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

  return (
    <AppShell
      sidebar={(onCollapse) => (
        <Sidebar
          onCollapse={onCollapse}
          collections={collections}
          folders={folders}
          requests={requests}
        />
      )}
      urlBar={
        activeTab ? (
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
        activeTab ? (
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
        activeTab ? (
          <ResponsePanel
            response={activeTab.state.response}
            loading={activeTab.state.loading}
            error={activeTab.state.error}
          />
        ) : null
      }
    />
  );
}

export default App;
