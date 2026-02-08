export interface UserProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
  profile?: UserProfile;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  invitedBy: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  expiresAt: string;
  teamName?: string;
}
