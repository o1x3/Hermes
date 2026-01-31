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
import { Label } from "@/components/ui/label";
import { useCollectionStore } from "@/stores/collectionStore";
import type { SavedRequest } from "@/types/collection";

interface MoveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: SavedRequest | null;
}

export function MoveRequestDialog({
  open,
  onOpenChange,
  request,
}: MoveRequestDialogProps) {
  const collections = useCollectionStore((s) => s.collections);
  const folders = useCollectionStore((s) => s.folders);
  const moveRequest = useCollectionStore((s) => s.moveRequest);

  const [collectionId, setCollectionId] = useState("");
  const [folderId, setFolderId] = useState("__none__");
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && request) {
      setCollectionId(request.collectionId);
      setFolderId(request.folderId ?? "__none__");
    }
    onOpenChange(nextOpen);
  };

  const availableFolders = folders.filter((f) => f.collectionId === collectionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !collectionId) return;

    setLoading(true);
    try {
      await moveRequest(
        request.id,
        folderId === "__none__" ? null : folderId,
        collectionId,
      );
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to move request:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Move Request</DialogTitle>
            <DialogDescription>
              Move <strong>{request?.name}</strong> to a different location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Collection</Label>
              <Select value={collectionId} onValueChange={(v) => {
                setCollectionId(v);
                setFolderId("__none__");
              }}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableFolders.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Folder</Label>
                <Select value={folderId} onValueChange={setFolderId}>
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Root (no folder)</SelectItem>
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
            <Button type="submit" disabled={!collectionId || loading}>
              {loading ? "Moving..." : "Move"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
