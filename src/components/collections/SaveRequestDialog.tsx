import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollectionStore } from "@/stores/collectionStore";
import { useTabStore } from "@/stores/tabStore";

interface SaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveRequestDialog({
  open,
  onOpenChange,
}: SaveRequestDialogProps) {
  const collections = useCollectionStore((s) => s.collections);
  const folders = useCollectionStore((s) => s.folders);
  const saveRequest = useCollectionStore((s) => s.saveRequest);
  const activeTab = useTabStore((s) => s.getActiveTab());
  const linkTabToSaved = useTabStore((s) => s.linkTabToSaved);

  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [folderId, setFolderId] = useState<string>("__none__");
  const [loading, setLoading] = useState(false);

  // Reset form when opened
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setName(activeTab?.title === "New Request" ? "" : (activeTab?.title ?? ""));
      setCollectionId(collections[0]?.id ?? "");
      setFolderId("__none__");
    }
    onOpenChange(nextOpen);
  };

  const availableFolders = folders.filter((f) => f.collectionId === collectionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab || !name.trim() || !collectionId) return;

    setLoading(true);
    try {
      const saved = await saveRequest({
        collectionId,
        folderId: folderId === "__none__" ? null : folderId,
        name: name.trim(),
        method: activeTab.state.method,
        url: activeTab.state.url,
        headers: activeTab.state.headers,
        params: activeTab.state.params,
        body: activeTab.state.bodyConfig,
        auth: activeTab.state.auth,
        variables: [],
      });
      linkTabToSaved(activeTab.id, saved.id, saved.name);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save request:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Save Request</DialogTitle>
            <DialogDescription>
              Save this request to a collection for later use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="request-name" className="text-xs">
                Name
              </Label>
              <Input
                id="request-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Get Users"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Collection</Label>
              {collections.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Create a collection first.
                </p>
              ) : (
                <Select value={collectionId} onValueChange={setCollectionId}>
                  <SelectTrigger size="sm">
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {availableFolders.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Folder (optional)</Label>
                <Select value={folderId} onValueChange={setFolderId}>
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No folder</SelectItem>
                    {availableFolders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !collectionId || loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
