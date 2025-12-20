import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";

function App() {
  return (
    <AppShell
      sidebar={(onCollapse) => <Sidebar onCollapse={onCollapse} />}
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
