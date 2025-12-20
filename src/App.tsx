import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { UrlBar } from "@/components/request/UrlBar";
import { useRequestStore } from "@/stores/requestStore";

function App() {
  const { method, url, loading, setMethod, setUrl, sendRequest } =
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
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          Send a request to see the response
        </div>
      }
    />
  );
}

export default App;
