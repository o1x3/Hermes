import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className:
          "bg-popover text-popover-foreground border-border shadow-lg text-xs",
      }}
    />
  );
}
