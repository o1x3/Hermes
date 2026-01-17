import { useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { UrlBar } from "@/components/request/UrlBar";
import { RequestConfigTabs } from "@/components/request/RequestConfigTabs";
import { ResponsePanel } from "@/components/response/ResponsePanel";
import { useRequestStore } from "@/stores/requestStore";
import { useKeyboard } from "@/hooks/useKeyboard";

function App() {
  const {
    method,
    url,
    loading,
    error,
    response,
    params,
    headers,
    auth,
    bodyConfig,
    setMethod,
    setUrl,
    setHeaders,
    setParams,
    setBodyConfig,
    setAuth,
    sendRequest,
  } = useRequestStore();

  const focusUrl = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-testid="url-input"]',
    );
    input?.focus();
    input?.select();
  }, []);

  useKeyboard({ onSend: sendRequest, onFocusUrl: focusUrl });

  return (
    <AppShell
      sidebar={(onCollapse) => <Sidebar onCollapse={onCollapse} />}
      urlBar={
        <UrlBar
          method={method}
          url={url}
          loading={loading}
          onMethodChange={setMethod}
          onUrlChange={setUrl}
          onSend={sendRequest}
        />
      }
      requestConfig={
        <RequestConfigTabs
          params={params}
          headers={headers}
          auth={auth}
          bodyConfig={bodyConfig}
          onParamsChange={setParams}
          onHeadersChange={setHeaders}
          onAuthChange={setAuth}
          onBodyConfigChange={setBodyConfig}
        />
      }
      responsePanel={
        <ResponsePanel response={response} loading={loading} error={error} />
      }
    />
  );
}

export default App;
