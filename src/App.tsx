import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MiniSidebar } from "@/components/layout/MiniSidebar";
import { MainSidebar } from "@/components/layout/MainSidebar";
import { Titlebar } from "@/components/layout/Titlebar";
import { UrlBar } from "@/components/request/UrlBar";
import { RequestConfigTabs } from "@/components/request/RequestConfigTabs";
import { ResponsePanel } from "@/components/response/ResponsePanel";
import { CreateCollectionDialog } from "@/components/collections/CreateCollectionDialog";
import { SaveRequestDialog } from "@/components/collections/SaveRequestDialog";
import { EnvEditor } from "@/components/environments/EnvEditor";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { ImportDialog } from "@/components/import/ImportDialog";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { CreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { InviteDialog } from "@/components/teams/InviteDialog";
import { MembersList } from "@/components/teams/MembersList";
import { ShareCollectionDialog } from "@/components/teams/ShareCollectionDialog";
import { Toaster } from "@/components/ui/sonner";
import { useTabStore } from "@/stores/tabStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { useEnvironmentStore } from "@/stores/environmentStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useAuthStore } from "@/stores/authStore";
import { useTeamStore } from "@/stores/teamStore";
import { useSyncStore } from "@/stores/syncStore";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  buildScopeForRequest,
  buildAttributedScopeForRequest,
  getFolderChain,
} from "@/lib/variables";
import { unshareCollection } from "@/lib/sync-utils";
import { supabase } from "@/lib/supabase";
import type { VariableCompletionItem } from "@/lib/codemirror/variable-extension";
import type { CurlImport } from "@/lib/import/curl";
import { useUndoStore } from "@/stores/undoStore";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HistoryEntry } from "@/types/history";
import { requestToCurl } from "@/lib/export-utils";
import { toast } from "sonner";

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
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const setMethod = useTabStore((s) => s.setMethod);
  const setUrl = useTabStore((s) => s.setUrl);
  const setHeaders = useTabStore((s) => s.setHeaders);
  const setParams = useTabStore((s) => s.setParams);
  const setBodyConfig = useTabStore((s) => s.setBodyConfig);
  const setBodyType = useTabStore((s) => s.setBodyType);
  const setAuth = useTabStore((s) => s.setAuth);
  const sendRequest = useTabStore((s) => s.sendRequest);
  const openHistoryEntry = useTabStore((s) => s.openHistoryEntry);
  const restoreFromHistory = useTabStore((s) => s.restoreFromHistory);
  const updateSavedSnapshot = useTabStore((s) => s.updateSavedSnapshot);
  const tabs = useTabStore((s) => s.tabs);

  const environments = useEnvironmentStore((s) => s.environments);
  const activeEnvironmentId = useEnvironmentStore((s) => s.activeEnvironmentId);

  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadHistory = useHistoryStore((s) => s.loadRecent);

  // Auth state
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  // Team state
  const teams = useTeamStore((s) => s.teams);
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const loadTeams = useTeamStore((s) => s.loadTeams);
  const loadPendingInvitations = useTeamStore((s) => s.loadPendingInvitations);
  const clearTeamData = useTeamStore((s) => s.clearTeamData);

  // Sync state
  const startSync = useSyncStore((s) => s.startSync);
  const stopSync = useSyncStore((s) => s.stopSync);

  // Dialog state
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [showSaveRequest, setShowSaveRequest] = useState(false);
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [shareCollectionId, setShareCollectionId] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Auto-save dirty tabs that are already persisted
  useAutoSave();

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Set up auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          await loadTeams();
          await loadPendingInvitations();
          startSync();
        } else if (event === "SIGNED_OUT") {
          stopSync();
          clearTeamData();
        }
      },
    );
    return () => subscription.unsubscribe();
  }, [loadTeams, loadPendingInvitations, startSync, stopSync, clearTeamData]);

  // Load teams after auth initialization
  useEffect(() => {
    if (initialized && user) {
      loadTeams();
      loadPendingInvitations();
      startSync();
    }
  }, [initialized, user, loadTeams, loadPendingInvitations, startSync]);

  // Load workspace, settings, and history on mount
  useEffect(() => {
    loadWorkspace();
    loadSettings();
    loadHistory();

    // Cleanup old history based on retention setting
    const { historyRetentionDays } = useSettingsStore.getState();
    invoke("cleanup_old_history", { retentionDays: historyRetentionDays }).catch(() => {});
  }, [loadWorkspace, loadSettings, loadHistory]);

  // Open a default tab if none exist on initial load
  useEffect(() => {
    if (tabs.length === 0) {
      openNewTab();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenHistoryEntry = useCallback(
    (entry: HistoryEntry) => openHistoryEntry(entry),
    [openHistoryEntry],
  );

  const focusUrl = useCallback(() => {
    const wrapper = document.querySelector('[data-testid="url-input"]');
    const cmContent = wrapper?.querySelector<HTMLElement>(".cm-content");
    cmContent?.focus();
  }, []);

  // Build variable scope for the active tab
  const variableScopeContext = useMemo(() => {
    const globalEnv = environments.find((e) => e.isGlobal);
    const activeEnv = activeEnvironmentId
      ? environments.find((e) => e.id === activeEnvironmentId)
      : undefined;

    if (!activeTab) return { scope: new Map<string, string>(), globalEnv, activeEnv };

    const savedReq = activeTab.savedRequestId
      ? useCollectionStore.getState().getRequest(activeTab.savedRequestId)
      : undefined;

    const collection = savedReq
      ? useCollectionStore.getState().getCollection(savedReq.collectionId)
      : undefined;

    const folderChain = savedReq?.folderId
      ? getFolderChain(savedReq.folderId, folders)
      : [];

    const requestVariables = savedReq?.variables ?? [];

    const scope = buildScopeForRequest({
      globalEnv,
      activeEnv,
      collection,
      folderChain,
      requestVariables,
    });

    const attributed = buildAttributedScopeForRequest({
      globalEnv,
      activeEnv,
      collection,
      folderChain,
      requestVariables,
    });

    return { scope, attributed, globalEnv, activeEnv };
  }, [activeTab, environments, activeEnvironmentId, folders]);

  const isVariableResolved = useCallback(
    (name: string) => variableScopeContext.scope.has(name),
    [variableScopeContext.scope],
  );

  const getVariableItems = useCallback((): VariableCompletionItem[] => {
    if (!variableScopeContext.attributed) return [];
    const items: VariableCompletionItem[] = [];
    for (const [name, attr] of variableScopeContext.attributed) {
      items.push({
        name,
        value: attr.value,
        source: attr.source,
        secret: attr.secret,
      });
    }
    return items;
  }, [variableScopeContext.attributed]);

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

    sendRequest(resolveAuth, variableScopeContext.scope);
  }, [sendRequest, variableScopeContext.scope]);

  const handleSave = useCallback(async () => {
    const tab = useTabStore.getState().getActiveTab();
    if (!tab) return;

    if (tab.savedRequestId) {
      const updateReq = useCollectionStore.getState().updateSavedRequest;
      await updateReq(tab.savedRequestId, {
        method: tab.state.method,
        url: tab.state.url,
        headers: tab.state.headers,
        params: tab.state.params,
        body: tab.state.bodyConfig,
        auth: tab.state.auth,
      });
      updateSavedSnapshot(tab.id);
    } else {
      setShowSaveRequest(true);
    }
  }, [updateSavedSnapshot]);

  const handleCloseTab = useCallback(() => {
    const tab = useTabStore.getState().getActiveTab();
    if (tab) closeTab(tab.id);
  }, [closeTab]);

  const handlePrevTab = useCallback(() => {
    const state = useTabStore.getState();
    if (!state.activeTabId || state.tabs.length < 2) return;
    const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
    const prev = idx > 0 ? idx - 1 : state.tabs.length - 1;
    setActiveTab(state.tabs[prev].id);
  }, [setActiveTab]);

  const handleNextTab = useCallback(() => {
    const state = useTabStore.getState();
    if (!state.activeTabId || state.tabs.length < 2) return;
    const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
    const next = idx < state.tabs.length - 1 ? idx + 1 : 0;
    setActiveTab(state.tabs[next].id);
  }, [setActiveTab]);

  const inheritedAuth = useMemo(() => {
    if (!activeTab || activeTab.state.auth.type !== "none" || !activeTab.savedRequestId) {
      return null;
    }
    const req = useCollectionStore.getState().getRequest(activeTab.savedRequestId);
    if (!req) return null;

    if (req.folderId) {
      const folder = useCollectionStore.getState().getFolder(req.folderId);
      if (folder && folder.defaultAuth.type !== "none") {
        return { auth: folder.defaultAuth, sourceName: folder.name };
      }
    }
    const col = useCollectionStore.getState().getCollection(req.collectionId);
    if (col && col.defaultAuth.type !== "none") {
      return { auth: col.defaultAuth, sourceName: col.name };
    }
    return null;
  }, [activeTab, collections, folders]);

  const handleUnshareCollection = useCallback(async (collectionId: string) => {
    try {
      await unshareCollection(collectionId);
      toast.success("Collection unshared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unshare");
    }
  }, []);

  const handleUndo = useCallback(() => {
    const snapshot = useUndoStore.getState().pop();
    if (!snapshot) return;

    const activeTabId = useTabStore.getState().activeTabId;
    if (snapshot.tabId !== activeTabId) {
      toast.error("Cannot undo: tab has changed");
      return;
    }

    setMethod(snapshot.state.method);
    setUrl(snapshot.state.url);
    setHeaders(snapshot.state.headers);
    setParams(snapshot.state.params);
    setBodyConfig(snapshot.state.bodyConfig);
    setAuth(snapshot.state.auth);

    toast.success("Undo successful");
  }, [setMethod, setUrl, setHeaders, setParams, setBodyConfig, setAuth]);

  const handleCurlDetected = useCallback(
    (parsed: CurlImport) => {
      const tab = useTabStore.getState().getActiveTab();
      if (!tab) return;

      useUndoStore.getState().push({
        label: "cURL import",
        tabId: tab.id,
        state: {
          method: tab.state.method,
          url: tab.state.url,
          headers: tab.state.headers,
          params: tab.state.params,
          bodyConfig: tab.state.bodyConfig,
          auth: tab.state.auth,
        },
      });

      setMethod(parsed.method);
      setUrl(parsed.url);
      setHeaders(parsed.headers);
      setBodyConfig(parsed.body);
      setAuth(parsed.auth);

      const summary: string[] = [];
      if (parsed.headers.length)
        summary.push(
          `${parsed.headers.length} header${parsed.headers.length > 1 ? "s" : ""}`,
        );
      if (parsed.body.type !== "none") summary.push("body");
      if (parsed.auth.type !== "none") summary.push("auth");

      toast.success(
        `Imported cURL${summary.length ? ` (${summary.join(", ")})` : ""}`,
        {
          action: {
            label: "Undo",
            onClick: handleUndo,
          },
        },
      );
    },
    [setMethod, setUrl, setHeaders, setBodyConfig, setAuth, handleUndo],
  );

  const handleCurlError = useCallback((error: string) => {
    toast.error(`Failed to parse cURL: ${error}`);
  }, []);

  useKeyboard({
    onSend: handleSend,
    onFocusUrl: focusUrl,
    onSave: handleSave,
    onNewTab: openNewTab,
    onCloseTab: handleCloseTab,
    onPrevTab: handlePrevTab,
    onNextTab: handleNextTab,
  });

  const hasActiveTab = !!activeTab;

  return (
    <>
      <AppShell
        miniSidebar={
          <MiniSidebar
            onOpenSettings={() => setShowSettings(true)}
            onCreateTeam={() => setShowCreateTeam(true)}
          />
        }
        mainSidebar={
          <MainSidebar
            collections={collections}
            folders={folders}
            requests={requests}
            onCreateCollection={() => setShowCreateCollection(true)}
            onOpenHistoryEntry={handleOpenHistoryEntry}
            onOpenImport={() => setShowImport(true)}
            isAuthenticated={isAuthenticated}
            activeTeamId={activeTeamId}
            teams={teams}
            onShareCollection={(id: string) => setShareCollectionId(id)}
            onUnshareCollection={handleUnshareCollection}
          />
        }
        titlebar={
          <Titlebar
            onManageEnvironments={() => setShowEnvEditor(true)}
            onOpenSettings={() => setShowSettings(true)}
          />
        }
        urlBar={
          hasActiveTab ? (
            <div>
              {activeTab.readOnly && (
                <div className="bg-muted/50 px-4 py-2 flex items-center justify-between text-xs border-b border-border mb-2 rounded-md">
                  <span className="text-muted-foreground">
                    History entry — read only
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={restoreFromHistory}
                  >
                    Restore as New Request
                  </Button>
                </div>
              )}
              <UrlBar
                method={activeTab.state.method}
                url={activeTab.state.url}
                loading={activeTab.state.loading}
                disabled={activeTab.readOnly}
                onMethodChange={setMethod}
                onUrlChange={setUrl}
                onSend={handleSend}
                variableItems={getVariableItems}
                isVariableResolved={isVariableResolved}
                onCurlDetected={handleCurlDetected}
                onCurlError={handleCurlError}
              />
            </div>
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
              onBodyTypeChange={setBodyType}
              inheritedAuth={inheritedAuth}
              variableItems={getVariableItems}
              isVariableResolved={isVariableResolved}
              disabled={activeTab.readOnly}
            />
          ) : null
        }
        responsePanel={
          hasActiveTab ? (
            <ResponsePanel
              response={activeTab.state.response}
              loading={activeTab.state.loading}
              error={activeTab.state.error}
              onCopyAsCurl={() => {
                const curl = requestToCurl(
                  activeTab.state.method,
                  activeTab.state.url,
                  activeTab.state.headers,
                  activeTab.state.bodyConfig,
                  activeTab.state.auth,
                );
                navigator.clipboard.writeText(curl);
                toast.success("cURL copied to clipboard");
              }}
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

      <SaveRequestDialog
        open={showSaveRequest}
        onOpenChange={setShowSaveRequest}
      />

      <EnvEditor
        open={showEnvEditor}
        onOpenChange={setShowEnvEditor}
      />

      <SettingsSheet
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      <ImportDialog
        open={showImport}
        onOpenChange={setShowImport}
      />

      <AuthDialog
        open={showAuth}
        onOpenChange={setShowAuth}
      />

      <CreateTeamDialog
        open={showCreateTeam}
        onOpenChange={setShowCreateTeam}
      />

      {activeTeamId && (
        <>
          <InviteDialog
            open={showInvite}
            onOpenChange={setShowInvite}
            teamId={activeTeamId}
          />

          <MembersList
            open={showMembers}
            onOpenChange={setShowMembers}
            teamId={activeTeamId}
            onInvite={() => {
              setShowMembers(false);
              setShowInvite(true);
            }}
          />
        </>
      )}

      <ShareCollectionDialog
        open={!!shareCollectionId}
        onOpenChange={(open) => {
          if (!open) setShareCollectionId(null);
        }}
        collectionId={shareCollectionId}
      />

      <Toaster />
    </>
  );
}

export default App;
