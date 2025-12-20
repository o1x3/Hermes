import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { UrlBar } from "@/components/request/UrlBar";
import type { HttpMethod } from "@/components/request/MethodBadge";

function App() {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");

  return (
    <AppShell
      sidebar={(onCollapse) => <Sidebar onCollapse={onCollapse} />}
      urlBar={
        <UrlBar
          method={method}
          url={url}
          loading={false}
          onMethodChange={setMethod}
          onUrlChange={setUrl}
          onSend={() => {}}
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
