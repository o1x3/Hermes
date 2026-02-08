import { useTeamStore } from "@/stores/teamStore";
import { Button } from "@/components/ui/button";
import { Check, X, Mail } from "lucide-react";
import { toast } from "sonner";

export function PendingInviteBanner() {
  const pendingInvitations = useTeamStore((s) => s.pendingInvitations);
  const acceptInvitation = useTeamStore((s) => s.acceptInvitation);
  const declineInvitation = useTeamStore((s) => s.declineInvitation);

  if (pendingInvitations.length === 0) return null;

  const handleAccept = async (id: string) => {
    try {
      await acceptInvitation(id);
      toast.success("Invitation accepted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await declineInvitation(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline");
    }
  };

  return (
    <div className="space-y-1 px-2 group-data-[collapsible=icon]:hidden">
      {pendingInvitations.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/10 px-2 py-1.5"
        >
          <Mail className="size-3.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium truncate">
              {inv.teamName ?? "Team"} invite
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-green-600 hover:text-green-700"
            onClick={() => handleAccept(inv.id)}
          >
            <Check className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            onClick={() => handleDecline(inv.id)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
