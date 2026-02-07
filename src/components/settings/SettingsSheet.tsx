import { useCallback, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore, type Theme } from "@/stores/settingsStore";
import { Sun, Moon, Monitor } from "lucide-react";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const theme = useSettingsStore((s) => s.theme);
  const historyRetentionDays = useSettingsStore((s) => s.historyRetentionDays);
  const timeoutMs = useSettingsStore((s) => s.timeoutMs);
  const proxyUrl = useSettingsStore((s) => s.proxyUrl);
  const verifySsl = useSettingsStore((s) => s.verifySsl);

  const setTheme = useSettingsStore((s) => s.setTheme);
  const setHistoryRetentionDays = useSettingsStore((s) => s.setHistoryRetentionDays);
  const setTimeoutMs = useSettingsStore((s) => s.setTimeoutMs);
  const setProxyUrl = useSettingsStore((s) => s.setProxyUrl);
  const setVerifySsl = useSettingsStore((s) => s.setVerifySsl);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearHistory = useCallback(async () => {
    try {
      await invoke("clear_history");
    } catch {
      // History commands may not exist yet
    }
    setShowClearConfirm(false);
  }, []);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full max-w-md sm:max-w-md p-0 flex flex-col"
        >
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* ── Appearance ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Appearance
              </h3>
              <div className="space-y-2">
                <Label className="text-xs">Theme</Label>
                <div className="flex gap-1">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={theme === value ? "default" : "outline"}
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => setTheme(value)}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </section>

            <Separator />

            {/* ── History ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                History
              </h3>
              <div className="space-y-2">
                <Label htmlFor="retention" className="text-xs">
                  Retention (days)
                </Label>
                <Input
                  id="retention"
                  type="number"
                  min={1}
                  max={365}
                  value={historyRetentionDays}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (v > 0) setHistoryRetentionDays(v);
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={() => setShowClearConfirm(true)}
              >
                Clear All History
              </Button>
            </section>

            <Separator />

            {/* ── HTTP Client ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                HTTP Client
              </h3>
              <div className="space-y-2">
                <Label htmlFor="timeout" className="text-xs">
                  Timeout (ms)
                </Label>
                <Input
                  id="timeout"
                  type="number"
                  min={1000}
                  max={300000}
                  step={1000}
                  value={timeoutMs}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (v >= 1000) setTimeoutMs(v);
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proxy" className="text-xs">
                  Proxy URL
                </Label>
                <Input
                  id="proxy"
                  type="text"
                  placeholder="http://proxy:8080"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ssl"
                  checked={verifySsl}
                  onCheckedChange={(checked) =>
                    setVerifySsl(checked === true)
                  }
                />
                <Label htmlFor="ssl" className="text-xs cursor-pointer">
                  Verify SSL certificates
                </Label>
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={showClearConfirm}
        onOpenChange={(open) => !open && setShowClearConfirm(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all request history entries. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory}>
              Clear History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
