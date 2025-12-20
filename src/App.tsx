import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { UrlBar } from "@/components/request/UrlBar";
import { ResponsePanel } from "@/components/response/ResponsePanel";
import { useRequestStore } from "@/stores/requestStore";

function App() {
  const { method, url, loading, error, response, setMethod, setUrl, sendRequest } =
    useRequestStore();

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
          {response && (
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap">
              {response.body}
            </pre>
          )}
        </ResponsePanel>
      }
    />
  );
}

export default App;
