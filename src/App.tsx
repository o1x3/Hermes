import { AppShell } from "@/components/layout/AppShell";

function App() {
  return (
    <AppShell
      sidebar={
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          Sidebar
        </div>
      }
      urlBar={
        <div className="text-muted-foreground text-sm">URL Bar</div>
      }
      responsePanel={
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          Response Panel
        </div>
      }
    />
  );
}

export default App;
