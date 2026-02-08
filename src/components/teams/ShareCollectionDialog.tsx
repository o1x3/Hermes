import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTeamStore } from "@/stores/teamStore";
import { shareCollectionToTeam } from "@/lib/sync-utils";
import { toast } from "sonner";
import { Loader2, Users, Cloud } from "lucide-react";

interface ShareCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string | null;
}

export function ShareCollectionDialog({
  open,
  onOpenChange,
  collectionId,
}: ShareCollectionDialogProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const teams = useTeamStore((s) => s.teams);

  const handleShare = async () => {
    if (!collectionId || !selectedTeamId) return;
    setLoading(true);
    try {
      await shareCollectionToTeam(collectionId, selectedTeamId);
      toast.success("Collection shared with team");
      onOpenChange(false);
      setSelectedTeamId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Share with Team</DialogTitle>
          <DialogDescription>
            Choose a team to share this collection with. Team members will be able to view and edit it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No teams yet. Create a team first.
            </p>
          ) : (
            teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  selectedTeamId === team.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <Users className="size-4 shrink-0" />
                {team.name}
              </button>
            ))
          )}
        </div>
        <Button
          className="w-full"
          disabled={loading || !selectedTeamId}
          onClick={handleShare}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <Cloud className="size-4 mr-2" />
          )}
          Share
        </Button>
      </DialogContent>
    </Dialog>
  );
}
