import { useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { UrlBar } from "@/components/request/UrlBar";
import { ResponsePanel } from "@/components/response/ResponsePanel";
import { JsonViewer } from "@/components/response/JsonViewer";
import { useRequestStore } from "@/stores/requestStore";
import { useKeyboard } from "@/hooks/useKeyboard";

function App() {
  const { method, url, loading, error, response, setMethod, setUrl, sendRequest } =
    useRequestStore();

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
      responsePanel={
        <ResponsePanel response={response} loading={loading} error={error}>
          {response && <JsonViewer data={response.body} />}
        </ResponsePanel>
      }
    />
  );
}

export default App;
