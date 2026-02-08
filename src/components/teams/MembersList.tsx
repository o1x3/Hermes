import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTeamStore } from "@/stores/teamStore";
import { useAuthStore } from "@/stores/authStore";
import { UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface MembersListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  onInvite: () => void;
}

export function MembersList({ open, onOpenChange, teamId, onInvite }: MembersListProps) {
  const members = useTeamStore((s) => s.members);
  const removeMember = useTeamStore((s) => s.removeMember);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const isOwner = members.some(
    (m) => m.userId === currentUserId && m.role === "owner"
  );

  const handleRemove = async (userId: string) => {
    try {
      await removeMember(teamId, userId);
      toast.success("Member removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Members
            {isOwner && (
              <Button size="sm" variant="outline" onClick={onInvite}>
                <UserPlus className="size-3.5 mr-1.5" />
                Invite
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {members.map((member) => {
            const name =
              member.profile?.displayName ??
              member.profile?.username ??
              member.userId.slice(0, 8);
            const initials = name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();

            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50"
              >
                <Avatar className="size-7">
                  <AvatarImage src={member.profile?.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                </div>
                <Badge variant={member.role === "owner" ? "default" : "secondary"} className="text-[10px]">
                  {member.role}
                </Badge>
                {isOwner && member.userId !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemove(member.userId)}
                  >
                    <UserMinus className="size-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
