import { useCallback, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
import { useEnvironmentStore } from "@/stores/environmentStore";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import type { Variable, Environment } from "@/types/environment";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EnvEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GridRow {
  key: string;
  secret: boolean;
  values: Map<string, string>; // envId → value
}

function buildGrid(environments: Environment[]): GridRow[] {
  const keySet = new Map<string, GridRow>();

  for (const env of environments) {
    for (const v of env.variables) {
      if (!v.key) continue;
      if (!keySet.has(v.key)) {
        keySet.set(v.key, {
          key: v.key,
          secret: v.secret ?? false,
          values: new Map(),
        });
      }
      const row = keySet.get(v.key)!;
      row.values.set(env.id, v.value);
      if (v.secret) row.secret = true;
    }
  }

  return Array.from(keySet.values());
}

function gridToEnvironments(
  grid: GridRow[],
  environments: Environment[],
): Map<string, Variable[]> {
  const result = new Map<string, Variable[]>();

  for (const env of environments) {
    result.set(env.id, []);
  }

  for (const row of grid) {
    if (!row.key.trim()) continue;
    for (const env of environments) {
      const value = row.values.get(env.id) ?? "";
      // Only include the variable for this env if it has a value or key
      result.get(env.id)!.push({
        key: row.key,
        value,
        secret: row.secret || undefined,
      });
    }
  }

  return result;
}

export function EnvEditor({ open, onOpenChange }: EnvEditorProps) {
  const environments = useEnvironmentStore((s) => s.environments);
  const createEnvironment = useEnvironmentStore((s) => s.createEnvironment);
  const updateEnvironment = useEnvironmentStore((s) => s.updateEnvironment);
  const deleteEnvironment = useEnvironmentStore((s) => s.deleteEnvironment);

  const [grid, setGrid] = useState<GridRow[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Environment | null>(null);
  const [renamingEnvId, setRenamingEnvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showSecrets] = useState<Set<string>>(new Set());

  // Rebuild grid when sheet opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setGrid(buildGrid(environments));
      }
      onOpenChange(isOpen);
    },
    [environments, onOpenChange],
  );

  // Find global env — always first column
  const globalEnv = environments.find((e) => e.isGlobal);
  const userEnvs = environments.filter((e) => !e.isGlobal);
  const orderedEnvs = useMemo(
    () => (globalEnv ? [globalEnv, ...userEnvs] : userEnvs),
    [globalEnv, userEnvs],
  );

  const updateCell = useCallback(
    (rowIdx: number, envId: string, value: string) => {
      setGrid((prev) =>
        prev.map((row, i) => {
          if (i !== rowIdx) return row;
          const newValues = new Map(row.values);
          newValues.set(envId, value);
          return { ...row, values: newValues };
        }),
      );
    },
    [],
  );

  const updateRowKey = useCallback(
    (rowIdx: number, key: string) => {
      setGrid((prev) =>
        prev.map((row, i) => (i === rowIdx ? { ...row, key } : row)),
      );
    },
    [],
  );

  const toggleSecret = useCallback(
    (rowIdx: number) => {
      setGrid((prev) =>
        prev.map((row, i) =>
          i === rowIdx ? { ...row, secret: !row.secret } : row,
        ),
      );
    },
    [],
  );

  const addRow = useCallback(() => {
    setGrid((prev) => [
      ...prev,
      { key: "", secret: false, values: new Map() },
    ]);
  }, []);

  const removeRow = useCallback((rowIdx: number) => {
    setGrid((prev) => prev.filter((_, i) => i !== rowIdx));
  }, []);

  const handleAddEnvironment = useCallback(async () => {
    const env = await createEnvironment("New Environment");
    setRenamingEnvId(env.id);
    setRenameValue(env.name);
  }, [createEnvironment]);

  const handleRenameSubmit = useCallback(
    async (envId: string) => {
      const trimmed = renameValue.trim();
      if (trimmed) {
        await updateEnvironment(envId, { name: trimmed });
      }
      setRenamingEnvId(null);
      setRenameValue("");
    },
    [renameValue, updateEnvironment],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteEnvironment(deleteTarget.id);
    setDeleteTarget(null);
    // Remove any values from this env in the grid
    setGrid((prev) =>
      prev.map((row) => {
        const newValues = new Map(row.values);
        newValues.delete(deleteTarget.id);
        return { ...row, values: newValues };
      }),
    );
  }, [deleteTarget, deleteEnvironment]);

  const handleSave = useCallback(async () => {
    const envVars = gridToEnvironments(grid, environments);
    const promises: Promise<void>[] = [];
    for (const [envId, variables] of envVars) {
      promises.push(updateEnvironment(envId, { variables }));
    }
    await Promise.all(promises);
    onOpenChange(false);
  }, [grid, environments, updateEnvironment, onOpenChange]);

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full max-w-4xl sm:max-w-4xl p-0 flex flex-col"
        >
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>Environments</SheetTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddEnvironment}
                  className="gap-1 text-xs"
                >
                  <Plus className="size-3" />
                  Add Environment
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground px-3 py-2 w-[180px] min-w-[180px] sticky left-0 bg-muted/30 z-10">
                      Variable
                    </th>
                    {orderedEnvs.map((env) => (
                      <th
                        key={env.id}
                        className="text-left font-medium text-muted-foreground px-3 py-2 min-w-[160px]"
                      >
                        <div className="flex items-center gap-1.5">
                          {renamingEnvId === env.id ? (
                            <input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => handleRenameSubmit(env.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameSubmit(env.id);
                                if (e.key === "Escape") {
                                  setRenamingEnvId(null);
                                  setRenameValue("");
                                }
                              }}
                              className="bg-transparent border-b border-primary outline-none text-foreground font-medium text-xs w-full"
                              autoFocus
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:text-foreground"
                              onDoubleClick={() => {
                                if (!env.isGlobal) {
                                  setRenamingEnvId(env.id);
                                  setRenameValue(env.name);
                                }
                              }}
                            >
                              {env.name}
                            </span>
                          )}
                          {!env.isGlobal && renamingEnvId !== env.id && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(env)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="group border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="px-3 py-1 sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-1">
                          <input
                            value={row.key}
                            onChange={(e) => updateRowKey(rowIdx, e.target.value)}
                            placeholder="variable_name"
                            className="bg-transparent border-0 border-b border-transparent focus:border-primary/50 font-mono text-xs text-variable-highlight px-0 py-0.5 outline-none placeholder:text-muted-foreground/40 w-full transition-colors"
                          />
                          <button
                            onClick={() => toggleSecret(rowIdx)}
                            className="shrink-0 text-muted-foreground hover:text-foreground p-0.5"
                            title={row.secret ? "Mark as visible" : "Mark as secret"}
                          >
                            {row.secret ? (
                              <EyeOff className="size-3" />
                            ) : (
                              <Eye className="size-3 opacity-0 group-hover:opacity-50" />
                            )}
                          </button>
                          <button
                            onClick={() => removeRow(rowIdx)}
                            className="shrink-0 text-muted-foreground hover:text-destructive p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </td>
                      {orderedEnvs.map((env) => (
                        <td key={env.id} className="px-3 py-1">
                          <input
                            type={
                              row.secret && !showSecrets.has(row.key)
                                ? "password"
                                : "text"
                            }
                            value={row.values.get(env.id) ?? ""}
                            onChange={(e) =>
                              updateCell(rowIdx, env.id, e.target.value)
                            }
                            placeholder="value"
                            className="bg-transparent border-0 border-b border-transparent focus:border-primary/50 font-mono text-xs px-0 py-0.5 outline-none placeholder:text-muted-foreground/40 w-full transition-colors"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add variable button */}
            <div className="px-3 py-2">
              <button
                onClick={addRow}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="size-3" />
                Add Variable
              </button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete environment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the &quot;{deleteTarget?.name}&quot;
              environment and all its variable values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
