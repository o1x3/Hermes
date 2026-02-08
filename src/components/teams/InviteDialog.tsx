import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTeamStore } from "@/stores/teamStore";
import { toast } from "sonner";
import { Loader2, X, Mail } from "lucide-react";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export function InviteDialog({ open, onOpenChange, teamId }: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const inviteMember = useTeamStore((s) => s.inviteMember);
  const invitations = useTeamStore((s) => s.invitations);
  const revokeInvitation = useTeamStore((s) => s.revokeInvitation);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await inviteMember(teamId, email.trim());
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvitation(id);
      toast.success("Invitation revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <Button type="submit" disabled={loading || !email.trim()}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
          </Button>
        </form>

        {invitations.length > 0 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs text-muted-foreground font-medium">Pending invitations</p>
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50"
              >
                <span className="truncate text-xs">{inv.email}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRevoke(inv.id)}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
